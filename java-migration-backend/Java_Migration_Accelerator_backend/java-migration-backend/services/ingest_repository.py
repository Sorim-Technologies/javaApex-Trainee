import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:  # pragma: no cover - optional dependency
    RecursiveCharacterTextSplitter = None  # type: ignore[assignment]

from services.embedding_service import EmbeddingService
from services.vector_store import VectorDocument, VectorStore


logger = logging.getLogger(__name__)


class RepositoryIngestionService:
    """Builds chunked documents from repository context and optional local repo files."""

    def __init__(self, embedding_service: EmbeddingService, vector_store: VectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.chunk_size = max(300, self._env_int("RAG_CHUNK_SIZE", default=900))
        self.chunk_overlap = max(0, self._env_int("RAG_CHUNK_OVERLAP", default=180))
        self.max_files = max(5, self._env_int("RAG_MAX_FILES", default=60))
        self.max_file_bytes = max(1024, self._env_int("RAG_MAX_FILE_BYTES", default=200000))

    def ensure_index(
        self,
        namespace: str,
        chat_context: Optional[dict[str, Any]] = None,
        repo_path: Optional[str] = None,
    ) -> bool:
        documents, fingerprint = self._build_documents(chat_context or {}, repo_path)
        if not documents:
            return False

        current_fingerprint = self.vector_store.get_fingerprint(namespace)
        if self.vector_store.namespace_exists(namespace) and current_fingerprint == fingerprint:
            return True

        embeddings = self.embedding_service.embed_texts([document.text for document in documents])
        if embeddings is None:
            return False

        return self.vector_store.upsert(namespace, embeddings, documents, fingerprint=fingerprint)

    def _build_documents(
        self,
        chat_context: dict[str, Any],
        repo_path: Optional[str],
    ) -> tuple[list[VectorDocument], str]:
        documents: list[VectorDocument] = []

        summary = self._build_summary_document(chat_context)
        if summary:
            documents.append(summary)

        repo_analysis = chat_context.get("repoAnalysis") or chat_context.get("analysis")
        if isinstance(repo_analysis, dict):
            documents.extend(self._build_analysis_documents(repo_analysis, chat_context))

        documents.extend(self._build_extra_documents(chat_context))
        documents.extend(self._build_repo_file_documents(repo_path or self._extract_repo_path(chat_context)))

        serialized = json.dumps(
            [
                {
                    "text": document.text,
                    "metadata": document.metadata,
                }
                for document in documents
            ],
            sort_keys=True,
        )
        fingerprint = hashlib.sha1(serialized.encode("utf-8")).hexdigest()
        return documents, fingerprint

    def _build_summary_document(self, chat_context: dict[str, Any]) -> Optional[VectorDocument]:
        relevant_keys = [
            "repo",
            "build_tool",
            "java_version",
            "source_java_version",
            "selectedSourceVersion",
            "target_java_version",
            "selectedTargetVersion",
            "risk_level",
            "migration_approach",
            "dependencies_count",
            "has_tests",
            "step",
            "page",
        ]
        values = {
            key: chat_context.get(key)
            for key in relevant_keys
            if chat_context.get(key) not in (None, "", [], {})
        }
        if not values:
            return None

        lines = ["Repository migration summary:"]
        for key, value in values.items():
            pretty_key = key.replace("_", " ")
            lines.append(f"- {pretty_key}: {value}")

        return VectorDocument(
            text="\n".join(lines),
            metadata={"source": "chat_context", "type": "summary"},
        )

    def _build_analysis_documents(
        self,
        repo_analysis: dict[str, Any],
        chat_context: dict[str, Any],
    ) -> list[VectorDocument]:
        documents: list[VectorDocument] = []

        overview_keys = [
            "name",
            "full_name",
            "build_tool",
            "java_version",
            "java_version_from_build",
            "has_tests",
            "structure_warning",
        ]
        overview = {
            key: repo_analysis.get(key)
            for key in overview_keys
            if repo_analysis.get(key) not in (None, "", [], {})
        }
        if overview:
            documents.append(
                VectorDocument(
                    text="Repository analysis overview:\n" + json.dumps(overview, indent=2),
                    metadata={"source": "repo_analysis", "type": "overview"},
                )
            )

        dependency_count = len(dependencies) if isinstance((dependencies := repo_analysis.get("dependencies")), list) else 0
        api_endpoint_count = len(api_endpoints) if isinstance((api_endpoints := repo_analysis.get("api_endpoints")), list) else 0
        structure = repo_analysis.get("structure")
        facts: list[str] = [
            "Repository facts:",
            f"- Build tool: {repo_analysis.get('build_tool') or 'unknown'}",
            f"- Java version: {repo_analysis.get('java_version') or repo_analysis.get('java_version_from_build') or 'unknown'}",
            f"- Tests detected: {repo_analysis.get('has_tests')}",
            f"- Dependency count: {dependency_count}",
            f"- API endpoint count: {api_endpoint_count}",
        ]
        if isinstance(structure, dict) and structure:
            facts.extend(
                [
                    f"- pom.xml present: {bool(structure.get('has_pom_xml'))}",
                    f"- build.gradle present: {bool(structure.get('has_build_gradle'))}",
                    f"- src/main present: {bool(structure.get('has_src_main'))}",
                    f"- src/test present: {bool(structure.get('has_src_test'))}",
                ]
            )
        documents.append(
            VectorDocument(
                text="\n".join(facts),
                metadata={"source": "repo_analysis", "type": "facts"},
            )
        )

        if isinstance(dependencies, list) and dependencies:
            chunk: list[str] = []
            for dep in dependencies:
                if not isinstance(dep, dict):
                    continue
                group_id = dep.get("group_id") or dep.get("groupId") or "unknown-group"
                artifact_id = dep.get("artifact_id") or dep.get("artifactId") or "unknown-artifact"
                current_version = dep.get("current_version") or dep.get("currentVersion") or "unknown"
                new_version = dep.get("new_version") or dep.get("newVersion") or "n/a"
                status = dep.get("status") or "unknown"
                chunk.append(
                    f"- {group_id}:{artifact_id} | current={current_version} | target={new_version} | status={status}"
                )
                if len(chunk) == 25:
                    documents.append(
                        VectorDocument(
                            text="Repository dependencies:\n" + "\n".join(chunk),
                            metadata={"source": "repo_analysis", "type": "dependencies"},
                        )
                    )
                    chunk = []
            if chunk:
                documents.append(
                    VectorDocument(
                        text="Repository dependencies:\n" + "\n".join(chunk),
                        metadata={"source": "repo_analysis", "type": "dependencies"},
                    )
                )

        if isinstance(api_endpoints, list) and api_endpoints:
            documents.append(
                VectorDocument(
                    text="Detected API endpoints:\n" + "\n".join(f"- {endpoint}" for endpoint in api_endpoints[:100]),
                    metadata={"source": "repo_analysis", "type": "api_endpoints"},
                )
            )

        if isinstance(structure, dict) and structure:
            documents.append(
                VectorDocument(
                    text="Repository structure:\n" + json.dumps(structure, indent=2),
                    metadata={"source": "repo_analysis", "type": "structure"},
                )
            )

        java_files = repo_analysis.get("java_files") or repo_analysis.get("all_files")
        if isinstance(java_files, list) and java_files:
            formatted_files = []
            for item in java_files[:150]:
                if isinstance(item, dict):
                    formatted_files.append(str(item.get("path") or item.get("name") or item))
                else:
                    formatted_files.append(str(item))
            documents.append(
                VectorDocument(
                    text="Relevant repository files:\n" + "\n".join(f"- {path}" for path in formatted_files),
                    metadata={"source": "repo_analysis", "type": "files"},
                )
            )

        if chat_context.get("repo") and not any(doc.metadata.get("type") == "summary" for doc in documents):
            documents.append(
                VectorDocument(
                    text=f"Repository identifier: {chat_context['repo']}",
                    metadata={"source": "chat_context", "type": "repo"},
                )
            )

        return documents

    def _build_extra_documents(self, chat_context: dict[str, Any]) -> list[VectorDocument]:
        documents: list[VectorDocument] = []
        raw_documents = chat_context.get("rag_documents")
        if not isinstance(raw_documents, list):
            return documents

        for index, entry in enumerate(raw_documents):
            if isinstance(entry, str) and entry.strip():
                documents.extend(
                    self._chunk_document(
                        entry.strip(),
                        metadata={"source": "rag_documents", "type": "extra", "position": index},
                    )
                )
            elif isinstance(entry, dict):
                text = str(entry.get("text") or "").strip()
                if not text:
                    continue
                metadata = {
                    "source": "rag_documents",
                    "type": entry.get("type") or "extra",
                    "label": entry.get("label"),
                    "position": index,
                }
                documents.extend(self._chunk_document(text, metadata=metadata))

        return documents

    def _build_repo_file_documents(self, repo_path: Optional[str]) -> list[VectorDocument]:
        if not repo_path:
            return []
        root = Path(repo_path)
        if not root.exists() or not root.is_dir():
            return []

        allowed_suffixes = {
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".java",
            ".kt",
            ".groovy",
            ".xml",
            ".gradle",
            ".json",
            ".html",
            ".css",
            ".scss",
            ".md",
            ".txt",
            ".properties",
            ".yml",
            ".yaml",
            ".cmd",
        }
        ignored_dirs = {
            ".git",
            "node_modules",
            "dist",
            "build",
            "target",
            ".rag_store",
            ".idea",
            ".vscode",
            "__pycache__",
        }

        documents: list[VectorDocument] = []
        file_count = 0
        for path in sorted(root.rglob("*")):
            if file_count >= self.max_files:
                break
            if not path.is_file():
                continue
            if any(part in ignored_dirs for part in path.parts):
                continue
            if path.suffix.lower() not in allowed_suffixes:
                continue
            try:
                if path.stat().st_size > self.max_file_bytes:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore").strip()
            except Exception:
                continue
            if not text:
                continue
            relative_path = str(path.relative_to(root))
            documents.extend(
                self._chunk_document(
                    text,
                    metadata={"source": "repo_file", "path": relative_path, "type": "file"},
                )
            )
            file_count += 1
        return documents

    def _chunk_document(self, text: str, metadata: dict[str, Any]) -> list[VectorDocument]:
        text = text.strip()
        if not text:
            return []
        if len(text) <= self.chunk_size:
            return [VectorDocument(text=text, metadata=metadata)]

        if RecursiveCharacterTextSplitter is not None:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                keep_separator=False,
            )
            chunks: list[VectorDocument] = []
            for index, chunk_text in enumerate(splitter.split_text(text)):
                chunk_text = chunk_text.strip()
                if not chunk_text:
                    continue
                chunk_metadata = dict(metadata)
                chunk_metadata["chunk_index"] = index
                chunks.append(VectorDocument(text=chunk_text, metadata=chunk_metadata))
            if chunks:
                return chunks

        chunks: list[VectorDocument] = []
        start = 0
        index = 0
        step = max(1, self.chunk_size - self.chunk_overlap)
        while start < len(text):
            end = min(len(text), start + self.chunk_size)
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunk_metadata = dict(metadata)
                chunk_metadata["chunk_index"] = index
                chunks.append(VectorDocument(text=chunk_text, metadata=chunk_metadata))
                index += 1
            start += step
        return chunks

    def _extract_repo_path(self, chat_context: dict[str, Any]) -> Optional[str]:
        candidate = (
            chat_context.get("repo_path")
            or chat_context.get("local_repo_path")
            or os.getenv("RAG_DEFAULT_REPO_PATH", "")
        )
        candidate = str(candidate or "").strip()
        return candidate or None

    def _env_int(self, name: str, default: int) -> int:
        raw = os.getenv(name)
        if raw is None:
            return default
        try:
            return int(raw.strip())
        except ValueError:
            logger.warning("Invalid integer for %s=%r. Falling back to %s.", name, raw, default)
            return default

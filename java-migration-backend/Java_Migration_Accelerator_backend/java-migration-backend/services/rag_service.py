import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Optional

from services.embedding_service import EmbeddingService
from services.ingest_repository import RepositoryIngestionService
from services.vector_store import VectorSearchResult, VectorStore


logger = logging.getLogger(__name__)


@dataclass
class RAGSource:
    source_file: str
    source_type: str
    chunk_id: str
    score: float
    repo: Optional[str] = None
    page: Optional[str] = None


@dataclass
class RAGRetrievalResult:
    context: Optional[str] = None
    sources: list[RAGSource] = field(default_factory=list)


class RAGService:
    """Retrieves project context from a LangChain-managed local Chroma store before the LLM is called."""

    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStore] = None,
        ingestion_service: Optional[RepositoryIngestionService] = None,
    ):
        self.embedding_service = embedding_service or EmbeddingService()
        self.vector_store = vector_store or VectorStore(self.embedding_service)
        self.vector_store.set_embedding_service(self.embedding_service)
        self.ingestion_service = ingestion_service or RepositoryIngestionService(
            self.embedding_service,
            self.vector_store,
        )
        self.top_k = max(1, self._env_int("RAG_TOP_K", default=5))
        self.min_score = max(-1.0, min(1.0, self._env_float("RAG_MIN_SCORE", default=0.25)))
        self.score_window = max(0.0, self._env_float("RAG_SCORE_WINDOW", default=0.18))

    async def retrieve_context(
        self,
        question: str,
        chat_context: Optional[dict[str, Any]] = None,
    ) -> RAGRetrievalResult:
        if not question or not question.strip():
            return RAGRetrievalResult()
        if not self.embedding_service.is_available() or not self.vector_store.is_available():
            logger.debug("Skipping RAG retrieval because embeddings or vector store are unavailable.")
            return RAGRetrievalResult()
        return await asyncio.to_thread(
            self._retrieve_context_sync,
            question.strip(),
            chat_context or {},
        )

    async def ensure_index(
        self,
        chat_context: Optional[dict[str, Any]] = None,
    ) -> bool:
        if not self.embedding_service.is_available() or not self.vector_store.is_available():
            logger.debug("Skipping proactive RAG indexing because embeddings or vector store are unavailable.")
            return False
        return await asyncio.to_thread(
            self._ensure_index_sync,
            chat_context or {},
        )

    def _ensure_index_sync(self, chat_context: dict[str, Any]) -> bool:
        namespace = self._build_namespace(chat_context)
        repo_path = self._extract_repo_path(chat_context)
        return self.ingestion_service.ensure_index(
            namespace=namespace,
            chat_context=chat_context,
            repo_path=repo_path,
        )

    def _retrieve_context_sync(
        self,
        question: str,
        chat_context: dict[str, Any],
    ) -> RAGRetrievalResult:
        namespace = self._build_namespace(chat_context)
        index_ready = self._ensure_index_sync(chat_context)
        if not index_ready:
            logger.debug("RAG index is not ready for namespace '%s'.", namespace)
            return RAGRetrievalResult()

        results = self.vector_store.search(namespace, question, top_k=self.top_k)
        results = sorted(results, key=lambda result: result.score, reverse=True)
        results = [result for result in results if result.score >= self.min_score]
        if results:
            dynamic_threshold = max(self.min_score, results[0].score - self.score_window)
            results = [result for result in results if result.score >= dynamic_threshold]
        if not results:
            logger.debug("No RAG results matched threshold for namespace '%s'.", namespace)
            return RAGRetrievalResult()

        return RAGRetrievalResult(
            context=self._format_results(results),
            sources=self._build_sources(results, chat_context),
        )

    def _build_namespace(self, chat_context: dict[str, Any]) -> str:
        repo = chat_context.get("repo") or chat_context.get("repository") or "default"
        step = chat_context.get("step") or chat_context.get("page") or "chat"
        return f"{repo}:{step}"

    def _extract_repo_path(self, chat_context: dict[str, Any]) -> Optional[str]:
        candidate = (
            chat_context.get("repo_path")
            or chat_context.get("local_repo_path")
            or os.getenv("RAG_DEFAULT_REPO_PATH", "")
        )
        candidate = str(candidate or "").strip()
        return candidate or None

    def _format_results(self, results: list[VectorSearchResult]) -> str:
        lines = []
        for index, result in enumerate(results, start=1):
            label = (
                result.metadata.get("path")
                or result.metadata.get("label")
                or result.metadata.get("type")
                or result.metadata.get("source")
                or f"chunk-{index}"
            )
            lines.append(f"[Context {index}] {label} (score={result.score:.3f})")
            lines.append(result.text.strip())
            lines.append("")
        return "\n".join(lines).strip()

    def _build_sources(
        self,
        results: list[VectorSearchResult],
        chat_context: dict[str, Any],
    ) -> list[RAGSource]:
        repo = self._clean_optional_string(chat_context.get("repo") or chat_context.get("repository"))
        page = self._clean_optional_string(
            chat_context.get("page")
            or chat_context.get("step")
            or chat_context.get("assistant_mode")
            or chat_context.get("assistantMode")
        )

        sources: list[RAGSource] = []
        for index, result in enumerate(results, start=1):
            metadata = result.metadata or {}
            source_type = self._clean_optional_string(metadata.get("type")) or self._clean_optional_string(metadata.get("source")) or "context"
            source_file = (
                self._clean_optional_string(metadata.get("path"))
                or self._clean_optional_string(metadata.get("source_file"))
                or self._clean_optional_string(metadata.get("file"))
                or self._clean_optional_string(metadata.get("label"))
            )
            if not source_file:
                source_origin = self._clean_optional_string(metadata.get("source")) or "context"
                source_file = f"{source_origin}:{source_type}"

            chunk_id = self._clean_optional_string(metadata.get("chunk_id"))
            if not chunk_id:
                chunk_index = metadata.get("chunk_index")
                if isinstance(chunk_index, int):
                    chunk_id = f"chunk-{chunk_index}"
                else:
                    chunk_id = self._clean_optional_string(result.id) or f"chunk-{index}"

            sources.append(
                RAGSource(
                    source_file=source_file,
                    source_type=source_type,
                    chunk_id=chunk_id,
                    score=round(float(result.score), 4),
                    repo=self._clean_optional_string(metadata.get("repo")) or repo,
                    page=self._clean_optional_string(metadata.get("page")) or page,
                )
            )
        return sources

    def _clean_optional_string(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _env_int(self, name: str, default: int) -> int:
        raw = os.getenv(name)
        if raw is None:
            return default
        try:
            return int(raw.strip())
        except ValueError:
            logger.warning("Invalid integer for %s=%r. Falling back to %s.", name, raw, default)
            return default

    def _env_float(self, name: str, default: float) -> float:
        raw = os.getenv(name)
        if raw is None:
            return default
        try:
            return float(raw.strip())
        except ValueError:
            logger.warning("Invalid float for %s=%r. Falling back to %s.", name, raw, default)
            return default

import json
import logging
import os
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

try:
    import chromadb
except ImportError:  # pragma: no cover - optional dependency
    chromadb = None  # type: ignore[assignment]

try:
    from langchain_chroma import Chroma
except ImportError:  # pragma: no cover - optional dependency
    Chroma = None  # type: ignore[assignment]

try:
    from langchain_core.documents import Document
except ImportError:  # pragma: no cover - optional dependency
    Document = None  # type: ignore[assignment]

try:
    import numpy as np
except ImportError:  # pragma: no cover - optional dependency
    np = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from services.embedding_service import EmbeddingService


logger = logging.getLogger(__name__)


@dataclass
class VectorDocument:
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class VectorSearchResult:
    id: str
    text: str
    metadata: dict[str, Any]
    score: float
    distance: Optional[float] = None


class VectorStore:
    """Persistent LangChain Chroma-backed vector store for local RAG retrieval."""

    def __init__(self, embedding_service: Optional["EmbeddingService"] = None, store_dir: Optional[str] = None):
        default_dir = Path(__file__).resolve().parents[1] / ".rag_store"
        self.store_dir = Path(store_dir or os.getenv("RAG_STORE_DIR", str(default_dir)))
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_dir = self.store_dir / "chroma"
        self.chroma_dir.mkdir(parents=True, exist_ok=True)
        self.embedding_service = embedding_service
        self._client: Any | None = None

    def is_available(self) -> bool:
        return chromadb is not None and Chroma is not None and Document is not None

    def set_embedding_service(self, embedding_service: "EmbeddingService") -> None:
        self.embedding_service = embedding_service

    def namespace_exists(self, namespace: str) -> bool:
        slug = self._slug(namespace)
        if not self._meta_path(slug).exists():
            return False
        return self._collection_exists(slug)

    def get_fingerprint(self, namespace: str) -> Optional[str]:
        payload = self._load_payload(namespace)
        if not payload:
            return None
        return payload.get("fingerprint")

    def upsert(
        self,
        namespace: str,
        embeddings: Any,
        documents: list[VectorDocument],
        fingerprint: Optional[str] = None,
    ) -> bool:
        if not self.is_available() or embeddings is None or not documents or self._langchain_embeddings() is None:
            return False

        slug = self._slug(namespace)
        try:
            embedding_count = self._embedding_count(embeddings)
            if embedding_count != len(documents):
                logger.warning(
                    "Skipping vector upsert for namespace '%s': %s documents but %s embeddings.",
                    namespace,
                    len(documents),
                    embedding_count,
                )
                return False

            embedding_dimension = self._embedding_dimension(embeddings)
            if embedding_dimension is None:
                logger.warning(
                    "Skipping vector upsert for namespace '%s': unable to detect embedding dimension.",
                    namespace,
                )
                return False

            self._delete_collection_if_exists(slug)
            ids = [f"{slug}-{index}" for index in range(len(documents))]
            vector_store = self._langchain_vector_store(
                slug,
                namespace=namespace,
                fingerprint=fingerprint,
            )
            langchain_documents = [
                Document(
                    id=ids[index],
                    page_content=document.text,
                    metadata=self._sanitize_metadata(document.metadata),
                )
                for index, document in enumerate(documents)
            ]
            vector_store.add_documents(documents=langchain_documents, ids=ids)

            payload = {
                "namespace": namespace,
                "fingerprint": fingerprint,
                "documents": [asdict(document) for document in documents],
                "dimension": embedding_dimension,
                "document_count": len(documents),
                "backend": "langchain_chroma",
                "collection": slug,
            }
            self._meta_path(slug).write_text(json.dumps(payload, indent=2), encoding="utf-8")
            return True
        except Exception as exc:  # pragma: no cover - runtime dependency failure
            logger.warning("Failed to write LangChain Chroma vectors for namespace '%s': %s", namespace, exc)
            return False

    def search(self, namespace: str, query: str, top_k: int = 4) -> list[VectorSearchResult]:
        if not self.is_available() or not query or not str(query).strip() or self._langchain_embeddings() is None:
            return []

        payload = self._load_payload(namespace)
        if payload is None:
            return []

        stored_document_count = payload.get("document_count")
        if not isinstance(stored_document_count, int) or stored_document_count < 0:
            stored_document_count = len(payload.get("documents") or [])
        if stored_document_count <= 0:
            return []

        top_k = max(1, min(top_k, stored_document_count))
        try:
            vector_store = self._langchain_vector_store(
                self._slug(namespace),
                namespace=payload.get("namespace") or namespace,
                fingerprint=payload.get("fingerprint"),
            )
            raw_results = vector_store.similarity_search_with_relevance_scores(
                query=str(query).strip(),
                k=top_k,
            )
        except Exception as exc:  # pragma: no cover - runtime dependency failure
            logger.warning("Failed to query LangChain Chroma collection for namespace '%s': %s", namespace, exc)
            return []

        results: list[VectorSearchResult] = []
        for index, (document, score) in enumerate(raw_results):
            metadata = dict(getattr(document, "metadata", {}) or {})
            result_id = getattr(document, "id", None) or metadata.get("chunk_id") or f"{self._slug(namespace)}-{index}"
            results.append(
                VectorSearchResult(
                    id=str(result_id),
                    text=str(getattr(document, "page_content", "") or ""),
                    metadata=metadata,
                    score=max(-1.0, min(1.0, float(score))),
                    distance=None,
                )
            )
        return results

    def _client_instance(self) -> Any:
        if self._client is not None:
            return self._client
        if chromadb is None:
            raise RuntimeError("chromadb is not installed")
        self._client = chromadb.PersistentClient(path=str(self.chroma_dir))
        return self._client

    def _langchain_vector_store(
        self,
        slug: str,
        namespace: Optional[str] = None,
        fingerprint: Optional[str] = None,
    ) -> Any:
        if Chroma is None:
            raise RuntimeError("langchain-chroma is not installed")
        embedding_function = self._langchain_embeddings()
        if embedding_function is None:
            raise RuntimeError("LangChain embeddings are not configured")
        return Chroma(
            collection_name=slug,
            embedding_function=embedding_function,
            persist_directory=str(self.chroma_dir),
            collection_metadata={
                "namespace": namespace or slug,
                "fingerprint": fingerprint or "",
                "backend": "langchain_chroma",
                "hnsw:space": "cosine",
            },
            relevance_score_fn=self._distance_to_score,
        )

    def _langchain_embeddings(self) -> Any | None:
        if self.embedding_service is None:
            return None
        return self.embedding_service.as_langchain_embeddings()

    def _collection_exists(self, slug: str) -> bool:
        try:
            self._client_instance().get_collection(name=slug)
            return True
        except Exception:
            return False

    def _load_collection(self, namespace: str) -> Any:
        slug = self._slug(namespace)
        return self._client_instance().get_collection(name=slug)

    def _delete_collection_if_exists(self, slug: str) -> None:
        try:
            self._client_instance().delete_collection(name=slug)
        except Exception:
            return

    def _load_payload(self, namespace: str) -> Optional[dict[str, Any]]:
        slug = self._slug(namespace)
        meta_path = self._meta_path(slug)
        if not meta_path.exists():
            return None
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - corrupt file
            logger.warning("Failed to load RAG metadata for namespace '%s': %s", namespace, exc)
            return None

    def _meta_path(self, slug: str) -> Path:
        return self.store_dir / f"{slug}.json"

    def _slug(self, namespace: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", (namespace or "default").strip().lower())
        return cleaned[:120] or "default"

    def _distance_to_score(self, distance: Any) -> float:
        numeric_distance = self._coerce_float(distance)
        if numeric_distance is None:
            return 0.0
        score = 1.0 - numeric_distance
        return max(0.0, min(1.0, score))

    def _coerce_float(self, value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _embedding_count(self, embeddings: Any) -> int:
        shape = getattr(embeddings, "shape", None)
        if shape and len(shape) >= 1:
            try:
                return int(shape[0])
            except (TypeError, ValueError):
                return 0
        try:
            return len(embeddings)
        except TypeError:
            return 0

    def _embedding_dimension(self, embeddings: Any) -> Optional[int]:
        shape = getattr(embeddings, "shape", None)
        if shape:
            if len(shape) >= 2:
                try:
                    return int(shape[1])
                except (TypeError, ValueError):
                    return None
            if len(shape) == 1:
                try:
                    return int(shape[0])
                except (TypeError, ValueError):
                    return None

        try:
            first_row = embeddings[0]
        except (IndexError, KeyError, TypeError):
            return None

        try:
            return len(first_row)
        except TypeError:
            return None

    def _sanitize_metadata(self, metadata: dict[str, Any]) -> dict[str, Any]:
        cleaned: dict[str, Any] = {}
        for key, value in (metadata or {}).items():
            if value is None:
                continue
            if isinstance(value, (str, int, float, bool)):
                cleaned[str(key)] = value
            else:
                cleaned[str(key)] = str(value)
        return cleaned

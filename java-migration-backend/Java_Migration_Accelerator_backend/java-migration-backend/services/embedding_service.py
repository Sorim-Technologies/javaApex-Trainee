import logging
import os
from typing import Any, Optional, Sequence

try:
    import chromadb
except ImportError:  # pragma: no cover - optional dependency
    chromadb = None  # type: ignore[assignment]

try:
    import numpy as np
except ImportError:  # pragma: no cover - optional dependency
    np = None  # type: ignore[assignment]

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:  # pragma: no cover - optional dependency
    HuggingFaceEmbeddings = None  # type: ignore[assignment]


logger = logging.getLogger(__name__)


class EmbeddingService:
    """Embeds text for the LangChain + Chroma-backed RAG pipeline."""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = (
            model_name
            or os.getenv("RAG_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        )
        self.local_files_only = self._env_flag(
            "RAG_EMBEDDING_LOCAL_ONLY",
            default=self._env_flag("HF_HUB_OFFLINE") or self._env_flag("TRANSFORMERS_OFFLINE"),
        )
        self.normalize_for_chroma = self._env_flag("RAG_NORMALIZE_EMBEDDINGS", default=True)
        self.cache_folder = (os.getenv("RAG_EMBEDDING_CACHE_DIR") or "").strip() or None
        self._model: Any | None = None
        self._dimension: Optional[int] = None
        self._load_failed = False

    def is_available(self) -> bool:
        return np is not None and HuggingFaceEmbeddings is not None and self._get_model() is not None

    def is_chroma_available(self) -> bool:
        return chromadb is not None and self.is_available()

    def embedding_metadata(self) -> dict[str, Any]:
        dimension = self.embedding_dimension()
        metadata: dict[str, Any] = {
            "embedding_model": self.model_name,
            "provider": "langchain-huggingface",
            "vector_database": "chromadb",
            "normalized": self.normalize_for_chroma,
        }
        if dimension is not None:
            metadata["dimension"] = dimension
        return metadata

    def _get_model(self) -> Any | None:
        if self._load_failed:
            return None
        if self._model is not None:
            return self._model
        if HuggingFaceEmbeddings is None or np is None:
            logger.info(
                "RAG embeddings are disabled because langchain-huggingface or numpy is not installed.",
            )
            self._load_failed = True
            return None
        try:
            self._model = HuggingFaceEmbeddings(
                model_name=self.model_name,
                cache_folder=self.cache_folder,
                model_kwargs={
                    "local_files_only": self.local_files_only,
                },
                encode_kwargs={
                    "normalize_embeddings": self.normalize_for_chroma,
                },
                query_encode_kwargs={
                    "normalize_embeddings": self.normalize_for_chroma,
                },
            )
        except Exception as exc:  # pragma: no cover - model/runtime failure
            logger.warning("Failed to load embedding model '%s': %s", self.model_name, exc)
            self._load_failed = True
            return None
        return self._model

    def embed_texts(self, texts: Sequence[str]) -> Optional[Any]:
        if not texts:
            return None
        model = self._get_model()
        if model is None or np is None:
            return None
        try:
            embeddings = model.embed_documents([str(text) for text in texts])
            embeddings_array = np.asarray(embeddings, dtype="float32")
            if embeddings_array.ndim == 2 and embeddings_array.shape[1] > 0:
                self._dimension = int(embeddings_array.shape[1])
            return embeddings_array
        except Exception as exc:  # pragma: no cover - runtime/model failure
            logger.warning("Failed to embed texts for RAG retrieval: %s", exc)
            return None

    def embed_query(self, text: str) -> Optional[Any]:
        if not text or not text.strip():
            return None
        model = self._get_model()
        if model is None or np is None:
            return None
        try:
            embedding = model.embed_query(text.strip())
            embedding_array = np.asarray([embedding], dtype="float32")
            if embedding_array.ndim == 2 and embedding_array.shape[1] > 0:
                self._dimension = int(embedding_array.shape[1])
            return embedding_array
        except Exception as exc:  # pragma: no cover - runtime/model failure
            logger.warning("Failed to embed query for RAG retrieval: %s", exc)
            return None

    def embed_texts_for_chroma(self, texts: Sequence[str]) -> Optional[list[list[float]]]:
        embeddings = self.embed_texts(texts)
        if embeddings is None:
            return None
        return self._to_chroma_vectors(embeddings)

    def embed_query_for_chroma(self, text: str) -> Optional[list[list[float]]]:
        embedding = self.embed_query(text)
        if embedding is None:
            return None
        return self._to_chroma_vectors(embedding)

    def embedding_dimension(self) -> Optional[int]:
        if self._dimension is not None:
            return self._dimension
        model = self._get_model()
        if model is None:
            return None
        try:
            client = getattr(model, "client", None)
            if client is not None and hasattr(client, "get_sentence_embedding_dimension"):
                dimension = client.get_sentence_embedding_dimension()
                if dimension is not None:
                    self._dimension = int(dimension)
                    return self._dimension
        except Exception:
            pass
        probe = self.embed_query("dimension probe")
        if probe is None:
            return None
        try:
            self._dimension = int(probe.shape[1])
            return self._dimension
        except Exception:
            return None

    def as_langchain_embeddings(self) -> Any | None:
        return self._get_model()

    def _to_chroma_vectors(self, embeddings: Any) -> Optional[list[list[float]]]:
        if embeddings is None:
            return None
        if hasattr(embeddings, "tolist"):
            embeddings = embeddings.tolist()
        try:
            return [[float(value) for value in row] for row in embeddings]
        except Exception as exc:  # pragma: no cover - invalid embedding shape
            logger.warning("Failed to convert embeddings to ChromaDB vectors: %s", exc)
            return None

    def _env_flag(self, name: str, default: bool = False) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return default
        return raw.strip().lower() in {"1", "true", "yes", "on"}

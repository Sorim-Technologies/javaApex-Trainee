import os
import re
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


load_dotenv()

INDEXABLE_EXTENSIONS = {
    ".java",
    ".xml",
    ".gradle",
    ".kts",
    ".properties",
    ".yml",
    ".yaml",
    ".md",
    ".txt",
    ".json",
}

IGNORED_FOLDERS = {
    ".git",
    "target",
    "build",
    "node_modules",
    ".gradle",
    ".idea",
    ".vscode",
    "__pycache__",
    "dist",
    "coverage",
}


def get_vector_db_path() -> str:
    return os.getenv("VECTOR_DB_PATH", "./vector_db/chroma_store")


def get_vector_collection_name() -> str:
    return os.getenv("VECTOR_COLLECTION_NAME", "javaapex_migrated_repos")


def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    )


def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=get_vector_collection_name(),
        embedding_function=get_embeddings(),
        persist_directory=get_vector_db_path(),
    )


def delete_existing_repository_chunks(vectorstore: Chroma, user_id: int, migration_id: int) -> None:
    collection = getattr(vectorstore, "_collection", None)
    if collection is None:
        return
    try:
        collection.delete(
            where={
                "$and": [
                    {"user_id": {"$eq": int(user_id)}},
                    {"migration_id": {"$eq": int(migration_id)}},
                ]
            }
        )
    except Exception:
        collection.delete(where={"migration_id": int(migration_id)})


def should_index_file(path: Path) -> bool:
    if path.name in {"pom.xml", "README.md"}:
        return True
    return path.suffix.lower() in INDEXABLE_EXTENSIONS


def iter_repository_files(repo_root: Path) -> List[Path]:
    files: List[Path] = []
    for root, dirs, filenames in os.walk(repo_root):
        dirs[:] = [directory for directory in dirs if directory not in IGNORED_FOLDERS]
        root_path = Path(root)
        for filename in filenames:
            path = root_path / filename
            if should_index_file(path):
                files.append(path)
    return files


def read_file(path: Path) -> Optional[str]:
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    return content if content.strip() else None


def file_type(path: Path) -> str:
    if path.name == "pom.xml":
        return "xml"
    if path.name == "README.md":
        return "md"
    return path.suffix.lower().lstrip(".") or "text"


def _extract_mapping_path(annotation_args: str) -> str:
    if not annotation_args:
        return ""
    named_match = re.search(r'(?:value|path)\s*=\s*\{?\s*["\']([^"\']*)["\']', annotation_args)
    if named_match:
        return named_match.group(1)
    direct_match = re.search(r'["\']([^"\']*)["\']', annotation_args)
    return direct_match.group(1) if direct_match else ""


def _join_endpoint_paths(base_path: str, sub_path: str) -> str:
    parts = [part.strip("/") for part in [base_path, sub_path] if part and part.strip("/")]
    return "/" + "/".join(parts) if parts else "/"


def _extract_java_method_name_after_annotation(content: str, start_index: int) -> str:
    snippet = content[start_index:start_index + 500]
    match = re.search(
        r'(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\], ?]+\s+(\w+)\s*\(',
        snippet,
    )
    return match.group(1) if match else "unknown"


def extract_api_endpoints_from_java_content(content: str, file_path: str) -> List[Dict[str, str]]:
    endpoints: List[Dict[str, str]] = []
    class_base_path = ""
    class_request_match = re.search(
        r'@RequestMapping\s*\((.*?)\)\s*(?:public\s+)?(?:class|interface|record)\s+\w+',
        content,
        re.DOTALL,
    )
    if class_request_match:
        class_base_path = _extract_mapping_path(class_request_match.group(1))

    if not class_base_path:
        class_path_match = re.search(
            r'@Path\s*\(\s*["\']([^"\']*)["\']\s*\)\s*(?:public\s+)?(?:class|interface|record)\s+\w+',
            content,
            re.DOTALL,
        )
        if class_path_match:
            class_base_path = class_path_match.group(1)

    for method, pattern in [
        ("GET", r'@GetMapping\s*(?:\((.*?)\))?'),
        ("POST", r'@PostMapping\s*(?:\((.*?)\))?'),
        ("PUT", r'@PutMapping\s*(?:\((.*?)\))?'),
        ("DELETE", r'@DeleteMapping\s*(?:\((.*?)\))?'),
        ("PATCH", r'@PatchMapping\s*(?:\((.*?)\))?'),
    ]:
        for match in re.finditer(pattern, content, re.DOTALL):
            endpoints.append(
                {
                    "name": _extract_java_method_name_after_annotation(content, match.end()),
                    "path": _join_endpoint_paths(class_base_path, _extract_mapping_path(match.group(1) or "")),
                    "method": method,
                    "file": file_path,
                }
            )

    for match in re.finditer(r'@RequestMapping\s*\((.*?)\)', content, re.DOTALL):
        annotation_args = match.group(1)
        method_match = re.search(r'RequestMethod\.([A-Z]+)', annotation_args)
        if method_match:
            endpoints.append(
                {
                    "name": _extract_java_method_name_after_annotation(content, match.end()),
                    "path": _join_endpoint_paths(class_base_path, _extract_mapping_path(annotation_args)),
                    "method": method_match.group(1),
                    "file": file_path,
                }
            )

    for match in re.finditer(
        r'@(GET|POST|PUT|DELETE|PATCH)\b(?:(?!@(GET|POST|PUT|DELETE|PATCH)\b).)*?(?:@Path\s*\(\s*["\']([^"\']*)["\']\s*\))?',
        content,
        re.DOTALL,
    ):
        endpoints.append(
            {
                "name": _extract_java_method_name_after_annotation(content, match.end()),
                "path": _join_endpoint_paths(class_base_path, match.group(3) or ""),
                "method": match.group(1),
                "file": file_path,
            }
        )

    servlet_match = re.search(r'@WebServlet\s*\((.*?)\)', content, re.DOTALL)
    if servlet_match:
        servlet_paths = list(dict.fromkeys(re.findall(r'["\'](/[^"\']+)["\']', servlet_match.group(1))))
        servlet_class_match = re.search(r'class\s+(\w+)\s+extends\s+HttpServlet', content)
        servlet_name = servlet_class_match.group(1) if servlet_class_match else Path(file_path).stem
        for servlet_path in servlet_paths:
            for method, java_method in [("GET", "doGet"), ("POST", "doPost"), ("PUT", "doPut"), ("DELETE", "doDelete")]:
                if re.search(rf'\b{java_method}\s*\(', content):
                    endpoints.append(
                        {
                            "name": f"{servlet_name}.{java_method}",
                            "path": servlet_path,
                            "method": method,
                            "file": file_path,
                        }
                    )

    unique: Dict[tuple, Dict[str, str]] = {}
    for endpoint in endpoints:
        unique.setdefault(
            (endpoint.get("method"), endpoint.get("path"), endpoint.get("file"), endpoint.get("name")),
            endpoint,
        )
    return list(unique.values())


def detect_api_endpoints_in_repository(repo_root: Path) -> List[Dict[str, str]]:
    endpoints: List[Dict[str, str]] = []
    for path in iter_repository_files(repo_root):
        if path.suffix.lower() != ".java":
            continue
        content = read_file(path)
        if not content:
            continue
        endpoints.extend(extract_api_endpoints_from_java_content(content, path.relative_to(repo_root).as_posix()))
    return endpoints


def build_api_endpoint_summary_document(
    endpoints: List[Dict[str, str]],
    user_id: int,
    migration_id: int,
    repository_name: str,
    repository_url: str,
    source_java_version: str | None,
    target_java_version: str | None,
) -> Optional[Document]:
    if not endpoints:
        return None

    lines = [
        "Repository API Endpoint Summary",
        "",
        f"Repository: {repository_name}",
        "",
        "Detected API endpoints:",
    ]
    for index, endpoint in enumerate(endpoints, 1):
        lines.extend(
            [
                f"{index}. {endpoint.get('method') or 'UNKNOWN'} {endpoint.get('path') or '/'}",
                f"   Handler: {endpoint.get('name') or 'unknown'}",
                f"   File: {endpoint.get('file') or ''}",
                "",
            ]
        )

    return Document(
        page_content="\n".join(lines).strip(),
        metadata={
            "user_id": int(user_id),
            "migration_id": int(migration_id),
            "repository_name": repository_name,
            "repository_url": repository_url or "",
            "file_path": "__generated__/api_endpoints_summary.txt",
            "file_type": "api-summary",
            "document_type": "api_endpoints_summary",
            "source_java_version": source_java_version or "",
            "target_java_version": target_java_version or "",
        },
    )


def index_migrated_repository(
    user_id: int,
    migration_id: int,
    repository_name: str,
    repository_url: str,
    migrated_repo_path: str,
    source_java_version: str | None = None,
    target_java_version: str | None = None,
) -> dict:
    """
    Read migrated repo files, split into chunks, embed, and store in ChromaDB.
    Return indexing summary.
    """
    repo_root = Path(migrated_repo_path).expanduser().resolve()
    if not repo_root.exists() or not repo_root.is_dir():
        raise ValueError(f"Migrated repository path does not exist: {migrated_repo_path}")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
    documents: List[Document] = []
    indexed_files = 0

    for path in iter_repository_files(repo_root):
        content = read_file(path)
        if not content:
            continue

        relative_path = path.relative_to(repo_root).as_posix()
        metadata: Dict[str, object] = {
            "user_id": int(user_id),
            "migration_id": int(migration_id),
            "repository_name": repository_name,
            "repository_url": repository_url or "",
            "file_path": relative_path,
            "file_type": file_type(path),
            "source_java_version": source_java_version or "",
            "target_java_version": target_java_version or "",
        }
        file_documents = splitter.create_documents([content], metadatas=[metadata])
        documents.extend(file_documents)
        indexed_files += 1

    endpoint_summary_doc = build_api_endpoint_summary_document(
        detect_api_endpoints_in_repository(repo_root),
        user_id,
        migration_id,
        repository_name,
        repository_url,
        source_java_version,
        target_java_version,
    )
    if endpoint_summary_doc:
        documents.append(endpoint_summary_doc)

    if not documents:
        return {
            "indexed": False,
            "repository_name": repository_name,
            "migration_id": migration_id,
            "files_indexed": 0,
            "chunks_indexed": 0,
            "message": "No supported repository files were found for indexing.",
        }

    vectorstore = get_vectorstore()
    delete_existing_repository_chunks(vectorstore, user_id, migration_id)
    ids = [
        f"{user_id}:{migration_id}:{doc.metadata.get('file_path')}:{index}"
        for index, doc in enumerate(documents)
    ]
    vectorstore.add_documents(documents, ids=ids)

    return {
        "indexed": True,
        "repository_name": repository_name,
        "migration_id": migration_id,
        "files_indexed": indexed_files,
        "chunks_indexed": len(documents),
    }

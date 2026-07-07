import os
import re
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.db import app_now, get_db
from database.models import ApiEndpoint, DependencyChange, MigrationHistory, RepositoryAnalysis
from services.social_auth_service import get_current_app_user
from services.vector_index_service import (
    detect_api_endpoints_in_repository,
    get_vectorstore,
    index_migrated_repository,
)


load_dotenv()

router = APIRouter(prefix="/api/chatbot", tags=["Repo Chatbot"])

NO_RELEVANT_CONTEXT_MESSAGE = (
    "I could not find relevant information in the indexed migrated repositories. "
    "Please make sure the repository is indexed."
)

ENDPOINT_KEYWORDS = [
    "api endpoint",
    "api endpoints",
    "endpoint",
    "endpoints",
    "show all api",
    "list api",
    "list all api",
    "show routes",
    "list routes",
    "routes",
    "mappings",
    "request mapping",
    "getmapping",
    "postmapping",
    "putmapping",
    "deletemapping",
    "patchmapping",
    "rest api",
    "controller api",
    "controllers api",
]

EXACT_FILE_KEYWORDS = [
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "application.properties",
    "application.yml",
    "application.yaml",
    "dockerfile",
    "readme",
]


class IndexMigrationRequest(BaseModel):
    migration_id: int


class ChatbotAskRequest(BaseModel):
    migration_id: int
    question: str = Field(min_length=1)
    repository_name: Optional[str] = None


class ChatbotSource(BaseModel):
    repository_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None


class ChatbotAskResponse(BaseModel):
    answer: str
    sources: List[ChatbotSource] = []


def serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def migration_to_chatbot_repo(record: MigrationHistory) -> Dict[str, Any]:
    return {
        "migration_id": record.id,
        "repository_name": record.repository_name,
        "repository_url": record.migrated_repo_url or record.repository_url,
        "source_java_version": record.source_java_version,
        "target_java_version": record.target_java_version,
        "completed_at": serialize_datetime(record.completed_at),
        "vector_indexed": bool(record.vector_indexed),
        "vector_indexed_at": serialize_datetime(record.vector_indexed_at),
        "vector_index_error": record.vector_index_error,
    }


def build_chroma_filter(user_id: int, migration_id: Optional[int], repository_name: Optional[str]) -> Dict[str, Any]:
    filters: List[Dict[str, Any]] = [{"user_id": {"$eq": int(user_id)}}]
    if migration_id is not None:
        filters.append({"migration_id": {"$eq": int(migration_id)}})
    if repository_name:
        filters.append({"repository_name": {"$eq": repository_name}})
    return filters[0] if len(filters) == 1 else {"$and": filters}


def get_llm():
    provider = os.getenv("LLM_PROVIDER", "groq").strip().lower()
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5-coder:7b"),
            temperature=0.2,
        )

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or groq_api_key.strip() in {"your_groq_api_key", "actual_groq_api_key_here"}:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is missing in backend .env",
        )

    from langchain_groq import ChatGroq
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=0.2,
        api_key=groq_api_key,
    )


def source_list_from_docs(docs) -> List[Dict[str, Any]]:
    seen = set()
    sources: List[Dict[str, Any]] = []
    for doc in docs:
        metadata = doc.metadata or {}
        key = (
            metadata.get("repository_name"),
            metadata.get("file_path"),
            metadata.get("file_type"),
        )
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "repository_name": metadata.get("repository_name"),
                "file_path": metadata.get("file_path"),
                "file_type": metadata.get("file_type"),
            }
        )
    return sources


def is_api_endpoint_question(question: str) -> bool:
    if not question:
        return False
    q = normalize_question(question)
    return any(keyword in q for keyword in ENDPOINT_KEYWORDS)


def normalize_question(question: str) -> str:
    return (question or "").lower().strip()


def is_dependency_question(question: str) -> bool:
    q = normalize_question(question)
    keywords = [
        "dependency",
        "dependencies",
        "dependency changes",
        "dependencies changed",
        "how many dependencies",
        "changed dependencies",
        "added dependencies",
        "removed dependencies",
        "updated dependencies",
        "post migration dependencies",
        "post-migration dependencies",
        "pom dependencies",
    ]
    return any(keyword in q for keyword in keywords)


def is_java_version_question(question: str) -> bool:
    q = normalize_question(question)
    keywords = [
        "java version",
        "source java",
        "target java",
        "java updated",
        "migrated from java",
        "java migration version",
    ]
    return any(keyword in q for keyword in keywords)


def is_spring_boot_question(question: str) -> bool:
    q = normalize_question(question)
    keywords = [
        "spring boot",
        "springboot",
        "boot version",
        "spring version",
    ]
    return any(keyword in q for keyword in keywords)


def is_changed_files_question(question: str) -> bool:
    q = normalize_question(question)
    keywords = [
        "changed files",
        "modified files",
        "files changed",
        "which files changed",
        "migration changes",
        "post migration changes",
    ]
    return any(keyword in q for keyword in keywords)


def is_actual_migration_time_question(question: str) -> bool:
    q = normalize_question(question)
    future_keywords = ["estimate", "estimated", "will take", "time required", "want to migrate"]
    past_keywords = ["taken", "took", "completed", "how long did", "did this repo take", "was taken"]
    if any(keyword in q for keyword in future_keywords) and not any(keyword in q for keyword in past_keywords):
        return False

    actual_keywords = [
        "time taken",
        "how much time this repo was taken",
        "how much time did this repo take",
        "how long did this repo",
        "how long did migration",
        "how long did it take",
        "how much time was taken",
        "took",
        "taken",
        "completed time",
        "actual migration time",
        "migration duration",
    ]
    return any(keyword in q for keyword in actual_keywords)


def is_estimated_migration_time_question(question: str) -> bool:
    q = normalize_question(question)
    if is_actual_migration_time_question(question):
        return False

    has_migration_word = any(keyword in q for keyword in ["migrate", "migration"])
    has_time_word = any(
        keyword in q
        for keyword in ["time", "duration", "how long", "will it take", "will take", "estimate", "estimated"]
    )
    if has_migration_word and has_time_word:
        return True

    estimate_keywords = [
        "estimated migration time",
        "estimate migration time",
        "estimated time",
        "estimate time",
        "how much estimated time",
        "how long will it take",
        "how much time will it take",
        "time required",
        "estimated duration",
        "migration estimate",
        "i want to migrate",
        "migrate this repo",
        "migrate the repo",
        "migrate repo",
        "want to migrate",
        "will take",
        "will it take",
        "java 21 to java 25",
        "java 17 to java 21",
        "java 8 to java 17",
    ]
    return any(keyword in q for keyword in estimate_keywords)


def extract_java_versions_from_question(question: str) -> Tuple[Optional[int], Optional[int]]:
    q = normalize_question(question)
    clean_patterns = [
        r"java\s*(\d+)\s*(?:to|->|→)\s*java\s*(\d+)",
        r"java\s*(\d+)\s*(?:to|->|→)\s*(\d+)",
        r"from\s*java\s*(\d+)\s*(?:to|->|→)\s*java\s*(\d+)",
        r"from\s*java\s*(\d+)\s*(?:to|->|→)\s*(\d+)",
    ]
    for pattern in clean_patterns:
        match = re.search(pattern, q)
        if match:
            return int(match.group(1)), int(match.group(2))

    patterns = [
        r"java\s*(\d+)\s*(?:to|->|→|â†’)\s*java\s*(\d+)",
        r"from\s*java\s*(\d+)\s*(?:to|->|→|â†’)\s*(?:java\s*)?(\d+)",
        r"java\s*(\d+)\s*(?:to|->|→|â†’)\s*(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, q)
        if match:
            return int(match.group(1)), int(match.group(2))
    return None, None


def safe_int(value: Any, default: Optional[int] = 0) -> Optional[int]:
    try:
        if value is None or value == "":
            return default
        match = re.search(r"\d+", str(value))
        if not match:
            return default
        return int(match.group(0))
    except Exception:
        return default


def calculate_estimated_migration_minutes(
    total_files: int = 0,
    java_files: int = 0,
    dependency_count: int = 0,
    api_endpoint_count: int = 0,
    source_java_version: Optional[int] = None,
    target_java_version: Optional[int] = None,
    build_tool: Optional[str] = None,
    has_spring_boot: bool = False,
) -> Dict[str, Any]:
    base_seconds = 60
    java_file_seconds = java_files * 5
    dependency_seconds = dependency_count * 10
    endpoint_seconds = api_endpoint_count * 8
    file_scan_seconds = min(total_files * 1, 180)

    java_version_gap = None
    version_jump_seconds = 0
    if source_java_version and target_java_version:
        java_version_gap = abs(target_java_version - source_java_version)
        version_jump_seconds = java_version_gap * 20

    build_tool_seconds = 30 if build_tool else 0
    spring_boot_seconds = 90 if has_spring_boot else 0

    total_seconds = (
        base_seconds
        + java_file_seconds
        + dependency_seconds
        + endpoint_seconds
        + file_scan_seconds
        + version_jump_seconds
        + build_tool_seconds
        + spring_boot_seconds
    )

    min_minutes = max(1, round(total_seconds / 60))
    max_minutes = max(min_minutes + 1, round((total_seconds * 1.3) / 60))

    return {
        "min_minutes": min_minutes,
        "max_minutes": max_minutes,
        "java_version_gap": java_version_gap,
        "factors": {
            "base_seconds": base_seconds,
            "java_file_seconds": java_file_seconds,
            "dependency_seconds": dependency_seconds,
            "endpoint_seconds": endpoint_seconds,
            "file_scan_seconds": file_scan_seconds,
            "version_jump_seconds": version_jump_seconds,
            "build_tool_seconds": build_tool_seconds,
            "spring_boot_seconds": spring_boot_seconds,
        },
    }


def is_readme_question(question: str) -> bool:
    return "readme" in normalize_question(question)


def exact_file_keyword(question: str) -> Optional[str]:
    q = normalize_question(question)
    for keyword in EXACT_FILE_KEYWORDS:
        if keyword in q:
            return keyword
    return None


def wants_table_response(question: str) -> bool:
    q = normalize_question(question)
    table_keywords = [
        "tabular view",
        "table view",
        "table format",
        "show in table",
        "display as table",
        "give me as table",
        "list in table",
        "as a table",
        "in table",
        "table",
    ]
    return any(keyword in q for keyword in table_keywords)


def markdown_table_value(value: Any) -> str:
    text = str(value if value not in (None, "") else "-")
    return text.replace("|", "\\|").replace("\n", " ")


def find_repository_analysis(db: Session, user_id: int, migration: MigrationHistory) -> Optional[RepositoryAnalysis]:
    query = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.user_id == user_id)
    matchers = []
    if migration.repository_url:
        matchers.append(RepositoryAnalysis.repository_url == migration.repository_url)
    if migration.migrated_repo_url:
        matchers.append(RepositoryAnalysis.repository_url == migration.migrated_repo_url)
    if migration.repository_name:
        matchers.append(RepositoryAnalysis.repository_name == migration.repository_name)
    if matchers:
        query = query.filter(or_(*matchers))
    return query.order_by(RepositoryAnalysis.created_at.desc()).first()


def get_latest_repository_analysis_for_migration(
    db: Session,
    user_id: int,
    migration: MigrationHistory,
) -> Optional[RepositoryAnalysis]:
    base_query = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.user_id == user_id)

    for repository_url in [migration.repository_url, migration.migrated_repo_url]:
        if repository_url:
            analysis = (
                base_query.filter(RepositoryAnalysis.repository_url == repository_url)
                .order_by(RepositoryAnalysis.created_at.desc())
                .first()
            )
            if analysis:
                return analysis

    if migration.repository_name:
        analysis = (
            base_query.filter(RepositoryAnalysis.repository_name == migration.repository_name)
            .order_by(RepositoryAnalysis.created_at.desc())
            .first()
        )
        if analysis:
            return analysis

    return base_query.order_by(RepositoryAnalysis.created_at.desc()).first()


def normalize_endpoint(endpoint: ApiEndpoint) -> Dict[str, str]:
    return {
        "method": (endpoint.method or "UNKNOWN").upper(),
        "path": endpoint.path or "/",
        "name": endpoint.name or "",
        "file": endpoint.file_path or "",
    }


def format_endpoint_answer(repository_name: str, endpoints: List[Dict[str, str]], table_requested: bool = False) -> Dict[str, Any]:
    if not endpoints:
        return {
            "answer": (
                f"Repository: {repository_name}\n\n"
                "I could not find any API endpoints for this repository in the stored analysis data."
            ),
            "sources": [],
        }

    unique: Dict[str, Dict[str, str]] = {}
    for endpoint in endpoints:
        method = (endpoint.get("method") or "UNKNOWN").upper()
        path = endpoint.get("path") or "/"
        file_path = endpoint.get("file") or endpoint.get("file_path") or ""
        name = endpoint.get("name") or ""
        key = f"{method} {path} {file_path} {name}"
        unique.setdefault(key, {"method": method, "path": path, "file": file_path, "name": name})

    endpoint_list = list(unique.values())
    sources = []
    seen_files = set()
    for endpoint in endpoint_list:
        file_path = endpoint.get("file")
        if file_path and file_path not in seen_files:
            seen_files.add(file_path)
            sources.append({"repository_name": repository_name, "file_path": file_path, "file_type": "java"})

    if table_requested:
        lines = [
            f"Repository: {repository_name}",
            "",
            f"I found {len(endpoint_list)} API endpoint{'s' if len(endpoint_list) != 1 else ''}:",
            "",
            "| No | Method | Endpoint | File |",
            "|---:|---|---|---|",
        ]
        for index, endpoint in enumerate(endpoint_list, 1):
            lines.append(
                "| "
                f"{index} | "
                f"{markdown_table_value(endpoint.get('method'))} | "
                f"`{markdown_table_value(endpoint.get('path'))}` | "
                f"`{markdown_table_value(endpoint.get('file'))}` |"
            )
        return {"answer": "\n".join(lines), "sources": sources}

    lines = [
        f"Repository: {repository_name}",
        "",
        f"I found {len(endpoint_list)} API endpoint{'s' if len(endpoint_list) != 1 else ''}:",
        "",
    ]
    for index, endpoint in enumerate(endpoint_list, 1):
        method = endpoint["method"]
        path = endpoint["path"]
        file_path = endpoint.get("file")
        name = endpoint.get("name")
        lines.append(f"{index}. {method} {path}" if method != "UNKNOWN" else f"{index}. {path}")
        if name:
            lines.append(f"   Handler: {name}")
        if file_path:
            lines.append(f"   File: {file_path}")
        lines.append("")

    return {"answer": "\n".join(lines).strip(), "sources": sources}


def answer_api_endpoint_question(
    db: Session,
    user_id: int,
    migration_id: int,
    repository_name: str,
    repository_url: Optional[str] = None,
    table_requested: bool = False,
) -> Dict[str, Any]:
    migration = (
        db.query(MigrationHistory)
        .filter(MigrationHistory.id == migration_id, MigrationHistory.user_id == user_id)
        .first()
    )
    if not migration:
        return {"answer": "Migration not found for the current user.", "sources": []}

    analysis = find_repository_analysis(db, user_id, migration)
    endpoints = []
    if analysis:
        endpoints = [normalize_endpoint(endpoint) for endpoint in db.query(ApiEndpoint).filter(ApiEndpoint.analysis_id == analysis.id).all()]

    if not endpoints and migration.local_migrated_repo_path:
        try:
            from pathlib import Path

            endpoints = detect_api_endpoints_in_repository(Path(migration.local_migrated_repo_path).expanduser().resolve())
        except Exception as exc:
            print("Local endpoint scan failed:", str(exc))

    print("Chatbot intent: API_ENDPOINTS")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", migration.repository_name or repository_name)
    print("Analysis ID:", analysis.id if analysis else None)
    print("Endpoint count from MySQL:", len(endpoints))

    return format_endpoint_answer(
        migration.repository_name or repository_name or "Unknown Repository",
        endpoints,
        table_requested=table_requested,
    )


def chroma_docs_for_migration(user_id: int, migration_id: int):
    vectorstore = get_vectorstore()
    collection = getattr(vectorstore, "_collection", None)
    if collection is None:
        return []
    try:
        data = collection.get(where={"migration_id": int(migration_id)}, include=["documents", "metadatas"])
    except Exception:
        data = collection.get(include=["documents", "metadatas"])

    results = []
    for doc, metadata in zip(data.get("documents") or [], data.get("metadatas") or []):
        metadata = metadata or {}
        try:
            if int(metadata.get("user_id", -1)) != int(user_id):
                continue
            if int(metadata.get("migration_id", -1)) != int(migration_id):
                continue
        except (TypeError, ValueError):
            continue
        results.append((doc or "", metadata))
    return results


def find_exact_file_docs(user_id: int, migration_id: int, keyword: str):
    matches = []
    for doc, metadata in chroma_docs_for_migration(user_id, migration_id):
        file_path = str(metadata.get("file_path", "")).lower()
        filename = file_path.rsplit("/", 1)[-1]
        if keyword == "readme":
            found = "readme" in filename
        else:
            found = filename == keyword or file_path.endswith(f"/{keyword}")
        if found:
            matches.append((doc, metadata))
    return matches


def answer_exact_file_question(
    user_id: int,
    migration_id: int,
    repository_name: str,
    question: str,
    table_requested: bool = False,
) -> Dict[str, Any]:
    keyword = exact_file_keyword(question)
    if not keyword:
        return {"answer": NO_RELEVANT_CONTEXT_MESSAGE, "sources": []}

    docs = find_exact_file_docs(user_id, migration_id, keyword)
    if not docs:
        if keyword == "readme":
            return {
                "answer": (
                    "I could not find any README file in the indexed repository.\n\n"
                    "Checked for:\n"
                    "- README.md\n"
                    "- README.txt\n"
                    "- readme.md\n"
                    "- readme.txt\n\n"
                    "Please make sure the README file exists and the repository is indexed."
                ),
                "sources": [],
            }
        return {
            "answer": f"I could not find `{keyword}` in the indexed repository.\n\nPlease make sure the file exists and the repository is indexed.",
            "sources": [],
        }

    content = "\n\n".join(doc for doc, _ in docs).strip()
    if len(content) > 6000:
        content = content[:6000].rstrip() + "\n\n[Content truncated for chat display.]"

    sources = []
    seen = set()
    for _, metadata in docs:
        file_path = metadata.get("file_path")
        if file_path in seen:
            continue
        seen.add(file_path)
        sources.append(
            {
                "repository_name": metadata.get("repository_name") or repository_name,
                "file_path": file_path,
                "file_type": metadata.get("file_type"),
            }
        )

    file_match = sources[0].get("file_path") if sources else keyword
    if table_requested:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "| File | Found | Repository |",
                "|---|---|---|",
                f"| `{markdown_table_value(file_match)}` | Yes | {markdown_table_value(repository_name)} |",
                "",
                content,
            ]
        )
    else:
        answer = f"Repository: {repository_name}\nFile match: {file_match}\n\n{content}"

    return {"answer": answer, "sources": sources}


def source_from_exact_files(user_id: int, migration_id: int, repository_name: str, keywords: List[str]) -> List[Dict[str, Any]]:
    sources = []
    seen = set()
    for keyword in keywords:
        for _, metadata in find_exact_file_docs(user_id, migration_id, keyword):
            file_path = metadata.get("file_path")
            if not file_path or file_path in seen:
                continue
            seen.add(file_path)
            sources.append(
                {
                    "repository_name": metadata.get("repository_name") or repository_name,
                    "file_path": file_path,
                    "file_type": metadata.get("file_type"),
                }
            )
    return sources


def answer_dependency_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Unknown Repository"
    dependency_changes = (
        db.query(DependencyChange)
        .filter(DependencyChange.user_id == user_id, DependencyChange.migration_id == migration_id)
        .all()
    )
    analysis = find_repository_analysis(db, user_id, migration)
    dependency_count = int(analysis.dependency_count or 0) if analysis else 0

    print("Chatbot intent: DEPENDENCIES")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)
    print("Dependency records found:", len(dependency_changes))
    print("Repository analysis dependency count:", dependency_count)

    sources = source_from_exact_files(
        user_id,
        migration_id,
        repository_name,
        ["pom.xml", "build.gradle", "build.gradle.kts"],
    )

    if dependency_changes:
        counts = {"added": 0, "updated": 0, "removed": 0, "unchanged": 0}
        for change in dependency_changes:
            change_type = (change.change_type or "updated").lower()
            counts[change_type] = counts.get(change_type, 0) + 1
            if change.file_path and all(source.get("file_path") != change.file_path for source in sources):
                sources.append({"repository_name": repository_name, "file_path": change.file_path, "file_type": "dependency"})

        changed_total = counts.get("added", 0) + counts.get("updated", 0) + counts.get("removed", 0)
        if table_requested:
            lines = [
                f"Repository: {repository_name}",
                "",
                "Dependency change summary:",
                "",
                "| No | Dependency | Change Type | Old Version | New Version | File |",
                "|---:|---|---|---|---|---|",
            ]
            for index, change in enumerate(dependency_changes, 1):
                lines.append(
                    "| "
                    f"{index} | "
                    f"{markdown_table_value(change.dependency_name)} | "
                    f"{markdown_table_value(change.change_type)} | "
                    f"{markdown_table_value(change.old_version)} | "
                    f"{markdown_table_value(change.new_version)} | "
                    f"`{markdown_table_value(change.file_path)}` |"
                )
            lines.extend(
                [
                    "",
                    f"Total changed dependencies: {changed_total}",
                    f"Added: {counts.get('added', 0)} | Updated: {counts.get('updated', 0)} | Removed: {counts.get('removed', 0)}",
                ]
            )
            return {"answer": "\n".join(lines), "sources": sources}

        lines = [
            f"Repository: {repository_name}",
            "",
            "Dependency change summary:",
            f"- Added dependencies: {counts.get('added', 0)}",
            f"- Updated dependencies: {counts.get('updated', 0)}",
            f"- Removed dependencies: {counts.get('removed', 0)}",
            f"- Total changed dependencies: {changed_total}",
        ]

        details = []
        for change in dependency_changes:
            if (change.change_type or "").lower() == "unchanged":
                continue
            version_text = ""
            if change.old_version or change.new_version:
                version_text = f" ({change.old_version or '-'} -> {change.new_version or '-'})"
            details.append(f"- {change.change_type}: {change.dependency_name or 'unknown'}{version_text}")
        if details:
            lines.extend(["", "Details:", *details[:25]])
        return {"answer": "\n".join(lines), "sources": sources}

    lines = [
        f"Repository: {repository_name}",
        "",
        "Detailed dependency change records are not stored yet.",
        "",
        "Available data:",
        f"- Total dependency count from repository analysis: {dependency_count}",
    ]
    if sources:
        lines.append(f"- Source file: {', '.join(source['file_path'] for source in sources)}")
    else:
        lines.append("- Source file: No pom.xml/build.gradle file was found in the vector index.")
    lines.extend(
        [
            "",
            "To answer the exact post-migration changed dependency count, dependency diff records must be saved during migration in the dependency_changes table.",
        ]
    )
    return {"answer": "\n".join(lines), "sources": sources}


def format_duration_seconds(total_seconds: float) -> str:
    seconds = max(0, int(round(total_seconds)))
    minutes, remaining_seconds = divmod(seconds, 60)
    hours, remaining_minutes = divmod(minutes, 60)
    parts = []
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if remaining_minutes:
        parts.append(f"{remaining_minutes} minute{'s' if remaining_minutes != 1 else ''}")
    if remaining_seconds or not parts:
        parts.append(f"{remaining_seconds} second{'s' if remaining_seconds != 1 else ''}")
    return " ".join(parts)


def answer_migration_time_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Unknown Repository"
    print("Chatbot intent: ACTUAL_MIGRATION_TIME")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)

    started_at = migration.started_at
    completed_at = migration.completed_at
    if not started_at or not completed_at:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "I could not calculate the actual migration time because started_at or completed_at is not stored for this migration.",
            ]
        )
    else:
        duration_text = format_duration_seconds((completed_at - started_at).total_seconds())
        if table_requested:
            answer = "\n".join(
                [
                    "| Repository | Started At | Completed At | Actual Time |",
                    "| --- | --- | --- | --- |",
                    (
                        f"| {markdown_table_value(repository_name)} | "
                        f"{markdown_table_value(serialize_datetime(started_at))} | "
                        f"{markdown_table_value(serialize_datetime(completed_at))} | "
                        f"{markdown_table_value(duration_text)} |"
                    ),
                ]
            )
        else:
            answer = "\n".join(
                [
                    f"Repository: {repository_name}",
                    "",
                    f"Actual migration time: {duration_text}",
                    "",
                    f"- Started at: {serialize_datetime(started_at)}",
                    f"- Completed at: {serialize_datetime(completed_at)}",
                ]
            )

    return {
        "answer": answer,
        "sources": [
            {
                "repository_name": repository_name,
                "file_path": "MySQL: migration_history",
                "file_type": "database",
            }
        ],
    }


def answer_estimated_migration_time_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    question: str,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Selected repository"
    print("Chatbot intent: ESTIMATED_MIGRATION_TIME")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)

    analysis = get_latest_repository_analysis_for_migration(db, user_id, migration)
    if not analysis:
        return {
            "answer": "\n".join(
                [
                    f"Repository: {repository_name}",
                    "",
                    "I could not calculate a reliable estimated migration time because repository analysis data is not available.",
                    "Please run repository analysis first.",
                ]
            ),
            "sources": [],
        }

    source_java_from_question, target_java_from_question = extract_java_versions_from_question(question)
    source_java_version = (
        source_java_from_question
        or safe_int(getattr(migration, "source_java_version", None), None)
        or safe_int(getattr(analysis, "detected_java_version", None), None)
    )
    target_java_version = (
        target_java_from_question
        or safe_int(getattr(migration, "target_java_version", None), None)
    )

    total_files = safe_int(getattr(analysis, "total_files", 0), 0) or 0
    java_files = safe_int(getattr(analysis, "java_files", 0), 0) or 0
    dependency_count = safe_int(getattr(analysis, "dependency_count", 0), 0) or 0
    api_endpoint_count = safe_int(getattr(analysis, "api_endpoint_count", 0), 0) or 0
    build_tool = getattr(analysis, "build_tool", None)
    spring_boot_version = getattr(analysis, "detected_spring_boot_version", None)
    has_spring_boot = bool(spring_boot_version and spring_boot_version != "-")

    estimate = calculate_estimated_migration_minutes(
        total_files=total_files,
        java_files=java_files,
        dependency_count=dependency_count,
        api_endpoint_count=api_endpoint_count,
        source_java_version=source_java_version,
        target_java_version=target_java_version,
        build_tool=build_tool,
        has_spring_boot=has_spring_boot,
    )
    estimated_time = f"{estimate['min_minutes']} to {estimate['max_minutes']} minutes"
    target_note = ""
    if target_java_version is None:
        target_note = "\n\nTarget Java version was not provided, so this estimate uses repository size and complexity without a version-jump cost."

    if table_requested:
        answer = "\n".join(
            [
                "| Repository | Source Java | Target Java | Total Files | Java Files | Dependencies | API Endpoints | Build Tool | Estimated Time |",
                "|---|---:|---:|---:|---:|---:|---:|---|---|",
                (
                    f"| {markdown_table_value(repository_name)} | "
                    f"{markdown_table_value(source_java_version)} | "
                    f"{markdown_table_value(target_java_version)} | "
                    f"{markdown_table_value(total_files)} | "
                    f"{markdown_table_value(java_files)} | "
                    f"{markdown_table_value(dependency_count)} | "
                    f"{markdown_table_value(api_endpoint_count)} | "
                    f"{markdown_table_value(build_tool)} | "
                    f"{markdown_table_value(estimated_time)} |"
                ),
                "",
                "Note: This is an estimated time. Actual time may vary based on repository complexity and network speed.",
            ]
        )
        if target_note:
            answer += target_note
    else:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                (
                    f"Estimated migration time for Java {source_java_version or '-'} -> "
                    f"Java {target_java_version or '-'} is around {estimated_time}."
                ),
                "",
                "Reason:",
                f"- Total files: {total_files}",
                f"- Java files: {java_files}",
                f"- Dependencies: {dependency_count}",
                f"- API endpoints: {api_endpoint_count}",
                f"- Build tool: {build_tool or '-'}",
                f"- Spring Boot detected: {'Yes' if has_spring_boot else 'No'}",
                f"- Java version gap: {estimate['java_version_gap'] if estimate['java_version_gap'] is not None else '-'}",
                "",
                "Note:",
                "This is an estimated time. Actual time may vary based on dependency complexity, code size, migration rules, GitHub push time, and network speed.",
            ]
        )
        if target_note:
            answer += target_note

    return {
        "answer": answer,
        "sources": [
            {
                "repository_name": repository_name,
                "file_path": "MySQL: repository_analysis",
                "file_type": "database",
            }
        ],
    }


def answer_java_version_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Unknown Repository"
    print("Chatbot intent: JAVA_VERSION")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)
    if table_requested:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "| Repository | Source Java | Target Java | Status | Completed At |",
                "|---|---|---|---|---|",
                (
                    f"| {markdown_table_value(repository_name)} | "
                    f"{markdown_table_value(migration.source_java_version)} | "
                    f"{markdown_table_value(migration.target_java_version)} | "
                    f"{markdown_table_value(migration.status)} | "
                    f"{markdown_table_value(serialize_datetime(migration.completed_at))} |"
                ),
            ]
        )
    else:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "Java version migration:",
                f"- Source Java version: {migration.source_java_version or 'Not stored'}",
                f"- Target Java version: {migration.target_java_version or 'Not stored'}",
            ]
        )
    return {
        "answer": answer,
        "sources": source_from_exact_files(user_id, migration_id, repository_name, ["pom.xml", "build.gradle"]),
    }


def answer_spring_boot_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Unknown Repository"
    print("Chatbot intent: SPRING_BOOT")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)

    if table_requested:
        answer = "\n".join(
            [
                "| Repository | Source Spring Boot | Target Spring Boot | Status | Completed At |",
                "| --- | --- | --- | --- | --- |",
                (
                    f"| {markdown_table_value(repository_name)} | "
                    f"{markdown_table_value(migration.source_spring_boot_version)} | "
                    f"{markdown_table_value(migration.target_spring_boot_version)} | "
                    f"{markdown_table_value(migration.status)} | "
                    f"{markdown_table_value(serialize_datetime(migration.completed_at))} |"
                ),
            ]
        )
    else:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "Spring Boot version migration:",
                f"- Source Spring Boot version: {migration.source_spring_boot_version or 'Not stored'}",
                f"- Target Spring Boot version: {migration.target_spring_boot_version or 'Not stored'}",
            ]
        )

    return {
        "answer": answer,
        "sources": source_from_exact_files(user_id, migration_id, repository_name, ["pom.xml", "build.gradle"]),
    }


def answer_changed_files_question(
    db: Session,
    user_id: int,
    migration_id: int,
    migration: MigrationHistory,
    table_requested: bool = False,
) -> Dict[str, Any]:
    repository_name = migration.repository_name or "Unknown Repository"
    print("Chatbot intent: CHANGED_FILES")
    print("User ID:", user_id)
    print("Migration ID:", migration_id)
    print("Repository:", repository_name)

    conversion_types = migration.conversion_types or "Not stored"
    if table_requested:
        answer = "\n".join(
            [
                "| Repository | Conversion Types | Status | Migrated Repository URL |",
                "| --- | --- | --- | --- |",
                (
                    f"| {markdown_table_value(repository_name)} | "
                    f"{markdown_table_value(conversion_types)} | "
                    f"{markdown_table_value(migration.status)} | "
                    f"{markdown_table_value(migration.migrated_repo_url)} |"
                ),
                "",
                "Detailed changed-file records are not stored in MySQL yet.",
            ]
        )
    else:
        answer = "\n".join(
            [
                f"Repository: {repository_name}",
                "",
                "Detailed changed-file records are not stored in MySQL yet.",
                "",
                "Available migration data:",
                f"- Conversion types: {conversion_types}",
                f"- Migration status: {migration.status}",
                f"- Migrated repository URL: {migration.migrated_repo_url or 'Not stored'}",
                "",
                "To answer exact changed-file lists, the migration flow must persist changed file paths during each conversion step.",
            ]
        )

    return {
        "answer": answer,
        "sources": [],
    }


def build_prompt(question: str, docs, table_requested: bool = False) -> str:
    context_blocks = []
    for index, doc in enumerate(docs, 1):
        metadata = doc.metadata or {}
        context_blocks.append(
            "\n".join(
                [
                    f"Source {index}",
                    f"Repository: {metadata.get('repository_name', '')}",
                    f"File: {metadata.get('file_path', '')}",
                    f"Type: {metadata.get('file_type', '')}",
                    f"Source Java: {metadata.get('source_java_version', '')}",
                    f"Target Java: {metadata.get('target_java_version', '')}",
                    "Content:",
                    doc.page_content,
                ]
            )
        )

    context = "\n\n---\n\n".join(context_blocks)
    table_instruction = ""
    if table_requested:
        table_instruction = """
The user requested a tabular view.
Format the answer as a Markdown table whenever possible.
Use proper Markdown table syntax.
Do not invent missing values.
If the available context is not suitable for a table, explain briefly and provide the closest structured answer.
"""
    return f"""You are javaAPEX Repo Assistant.

Answer only using the provided repository context.
If the answer is not available in the context, say:
"I could not find this information in the indexed migrated repository."

Always include:
- direct answer
- repository name
- related file paths
- important code/config references if available

Do not guess.
Do not use external knowledge unless asked generally.

{table_instruction}

Repository context:
{context}

Question:
{question}
"""


@router.get("/health")
def chatbot_health():
    return {
        "status": "ok",
        "service": "javaAPEX Repo Assistant",
    }


def retrieve_docs_with_fallback(user_id: int, migration_id: int, repository_name: Optional[str], question: str):
    vectorstore = get_vectorstore()
    strict_filter = build_chroma_filter(user_id, migration_id, repository_name)
    try:
        retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": 10,
                "fetch_k": 30,
                "filter": strict_filter,
            }
        )
        docs = retriever.invoke(question)
    except Exception as exc:
        print("Strict Chroma filter failed, retrying migration-only filter:", str(exc))
        retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": 10,
                "fetch_k": 30,
                "filter": {"migration_id": int(migration_id)},
            }
        )
        docs = retriever.invoke(question)

    return [
        doc
        for doc in docs
        if int((doc.metadata or {}).get("user_id", -1)) == int(user_id)
        and int((doc.metadata or {}).get("migration_id", -1)) == int(migration_id)
    ][:10]


def ask_repo_question(
    user_id: int,
    migration_id: int,
    repository_name: Optional[str],
    question: str,
    table_requested: bool = False,
) -> dict:
    """
    Search ChromaDB using user_id and migration_id.
    Send context to the configured LLM.
    Return answer and sources.
    """
    print("Chatbot request user_id:", user_id)
    print("Chatbot request migration_id:", migration_id)
    print("Question:", question)
    print("Vector DB path:", os.getenv("VECTOR_DB_PATH"))
    print("Collection:", os.getenv("VECTOR_COLLECTION_NAME"))

    docs = retrieve_docs_with_fallback(user_id, migration_id, repository_name, question)
    print("Retrieved docs count:", len(docs))

    if not docs:
        return {
            "answer": NO_RELEVANT_CONTEXT_MESSAGE,
            "sources": [],
        }

    response = get_llm().invoke(build_prompt(question, docs, table_requested=table_requested))
    answer = getattr(response, "content", str(response))
    return {
        "answer": answer,
        "sources": source_list_from_docs(docs),
    }


@router.get("/repositories")
def get_chatbot_repositories(
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user session")

    records = (
        db.query(MigrationHistory)
        .filter(
            MigrationHistory.user_id == user_id,
            MigrationHistory.status == "completed",
        )
        .order_by(MigrationHistory.completed_at.desc(), MigrationHistory.created_at.desc())
        .all()
    )
    return [migration_to_chatbot_repo(record) for record in records]


@router.post("/index-migration")
def index_migration(
    request: IndexMigrationRequest,
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user session")

    record = (
        db.query(MigrationHistory)
        .filter(
            MigrationHistory.id == request.migration_id,
            MigrationHistory.user_id == user_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration not found")
    if record.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed migrations can be indexed")
    if not record.local_migrated_repo_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local migrated repository path is not available for this migration",
        )

    try:
        summary = index_migrated_repository(
            user_id=user_id,
            migration_id=record.id,
            repository_name=record.repository_name or "Unknown Repository",
            repository_url=record.migrated_repo_url or record.repository_url,
            migrated_repo_path=record.local_migrated_repo_path,
            source_java_version=record.source_java_version,
            target_java_version=record.target_java_version,
        )
        record.vector_indexed = bool(summary.get("indexed"))
        record.vector_indexed_at = app_now() if record.vector_indexed else None
        record.vector_index_error = None if record.vector_indexed else summary.get("message")
        record.updated_at = app_now()
        db.commit()
        return summary
    except Exception as exc:
        record.vector_indexed = False
        record.vector_index_error = str(exc)
        record.updated_at = app_now()
        db.commit()
        print("Chatbot indexing failed:", str(exc))
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Indexing failed: {str(exc)}") from exc


@router.post("/ask")
def ask_chatbot(
    request: ChatbotAskRequest,
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user session")
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question is required")

        migration = (
            db.query(MigrationHistory)
            .filter(
                MigrationHistory.id == request.migration_id,
                MigrationHistory.user_id == user_id,
            )
            .first()
        )
        if not migration:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration not found for current user")
        if migration.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chatbot is available only for completed migrations",
            )

        question = request.question.strip()
        repository_name = migration.repository_name or request.repository_name or "Unknown Repository"
        table_requested = wants_table_response(question)

        if is_actual_migration_time_question(question):
            detected_intent = "ACTUAL_MIGRATION_TIME"
            result = answer_migration_time_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                table_requested=table_requested,
            )
        elif is_estimated_migration_time_question(question):
            detected_intent = "ESTIMATED_MIGRATION_TIME"
            result = answer_estimated_migration_time_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                question=question,
                table_requested=table_requested,
            )
        elif is_api_endpoint_question(question):
            detected_intent = "API_ENDPOINTS"
            result = answer_api_endpoint_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                repository_name=repository_name,
                repository_url=migration.repository_url,
                table_requested=table_requested,
            )
        elif is_dependency_question(question):
            detected_intent = "DEPENDENCIES"
            result = answer_dependency_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                table_requested=table_requested,
            )
        elif is_java_version_question(question):
            detected_intent = "JAVA_VERSION"
            result = answer_java_version_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                table_requested=table_requested,
            )
        elif is_spring_boot_question(question):
            detected_intent = "SPRING_BOOT"
            result = answer_spring_boot_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                table_requested=table_requested,
            )
        elif is_changed_files_question(question):
            detected_intent = "CHANGED_FILES"
            result = answer_changed_files_question(
                db=db,
                user_id=user_id,
                migration_id=request.migration_id,
                migration=migration,
                table_requested=table_requested,
            )
        elif is_readme_question(question) or exact_file_keyword(question):
            detected_intent = "EXACT_FILE"
            result = answer_exact_file_question(
                user_id=user_id,
                migration_id=request.migration_id,
                repository_name=repository_name,
                question=question,
                table_requested=table_requested,
            )
        else:
            detected_intent = "RAG"
            result = ask_repo_question(
                user_id=user_id,
                migration_id=request.migration_id,
                repository_name=repository_name,
                question=question,
                table_requested=table_requested,
            )
        print("Chatbot question:", question)
        print("Detected intent:", detected_intent)
        print("Table requested:", table_requested)
        print("User ID:", user_id)
        print("Migration ID:", request.migration_id)
        print("Repository:", migration.repository_name)
        return {
            "answer": result.get("answer") or NO_RELEVANT_CONTEXT_MESSAGE,
            "sources": result.get("sources", []),
        }
    except HTTPException:
        raise
    except Exception as exc:
        print("Chatbot ask failed:", str(exc))
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chatbot failed: {str(exc)}",
        ) from exc

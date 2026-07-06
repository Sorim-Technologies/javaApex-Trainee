import json
import logging
import re
from pathlib import Path
from typing import Any

from services.chat_service import ChatService

logger = logging.getLogger(__name__)


class TestGenerationService:
    """Use the existing LLM provider chain to generate or improve JUnit tests."""

    def __init__(self) -> None:
        self.chat_service = ChatService()

    async def generate_tests(
        self,
        project_path: str,
        repository_name: str,
        build_info: dict[str, Any],
    ) -> dict[str, Any]:
        source_files = self._collect_source_files(project_path)
        if not source_files:
            return {
                "generated": False,
                "files_written": [],
                "notes": ["No Java source files were found for test generation."],
            }

        prompt = self._build_generation_prompt(repository_name, build_info, source_files)
        response = await self._call_llm(prompt)
        file_specs = self._extract_file_specs(response)
        written_files = self._write_test_files(project_path, file_specs)
        return {
            "generated": bool(written_files),
            "files_written": written_files,
            "notes": ["LLM generated JUnit tests."] if written_files else ["LLM did not return usable test files."],
            "raw_response": response,
        }

    async def analyze_failures(
        self,
        project_path: str,
        repository_name: str,
        junit_result: dict[str, Any],
    ) -> dict[str, Any]:
        failures = junit_result.get("failures") or []
        if not failures:
            return {"decisions": [], "raw_response": ""}

        failure_payload = json.dumps(failures[:10], indent=2)
        related_tests = self._collect_related_test_files(project_path, failures)
        prompt = "\n".join(
            [
                "You are reviewing failing Java JUnit tests in a migration validation pipeline.",
                "Production Java source code must NEVER be modified.",
                "For each failure, classify the cause as one of:",
                "- outdated_test",
                "- incorrect_test",
                "- application_bug",
                "- unknown",
                "Return strict JSON with this shape:",
                '{"decisions":[{"class_name":"","method_name":"","cause":"","reason":"","action":"update_test|report_risk|none"}]}',
                "",
                f"Repository: {repository_name}",
                "Failed tests:",
                failure_payload,
                "",
                "Relevant test files:",
                self._format_file_context(related_tests),
            ]
        )
        response = await self._call_llm(prompt)
        payload = self._extract_json(response) or {}
        decisions = payload.get("decisions") if isinstance(payload, dict) else []
        return {
            "decisions": decisions if isinstance(decisions, list) else [],
            "raw_response": response,
        }

    async def improve_tests_for_failures(
        self,
        project_path: str,
        repository_name: str,
        junit_result: dict[str, Any],
        failure_analysis: dict[str, Any],
    ) -> dict[str, Any]:
        decisions = failure_analysis.get("decisions") or []
        actionable = [item for item in decisions if isinstance(item, dict) and item.get("action") == "update_test"]
        if not actionable:
            return {
                "updated": False,
                "files_written": [],
                "notes": ["No test-only fixes were recommended for the failed JUnit cases."],
            }

        related_tests = self._collect_related_test_files(project_path, actionable)
        related_sources = self._collect_source_files(project_path, limit=4)
        prompt = "\n".join(
            [
                "You are improving failing Java JUnit tests in a migration validation pipeline.",
                "Do not modify production Java source code.",
                "Return strict JSON only:",
                '{"files":[{"path":"src/test/java/...","content":"..."}]}',
                "",
                f"Repository: {repository_name}",
                "Failures to address:",
                json.dumps(actionable, indent=2),
                "",
                "Current test files:",
                self._format_file_context(related_tests),
                "",
                "Relevant production source context:",
                self._format_file_context(related_sources),
                "",
                "Update ONLY test files and keep them under src/test/java.",
            ]
        )
        response = await self._call_llm(prompt)
        file_specs = self._extract_file_specs(response)
        written_files = self._write_test_files(project_path, file_specs)
        return {
            "updated": bool(written_files),
            "files_written": written_files,
            "notes": ["LLM updated outdated or incorrect tests."] if written_files else ["LLM did not return usable test updates."],
            "raw_response": response,
        }

    async def improve_tests_for_coverage(
        self,
        project_path: str,
        repository_name: str,
        coverage_result: dict[str, Any],
    ) -> dict[str, Any]:
        uncovered_methods = coverage_result.get("uncovered_methods") or []
        uncovered_classes = coverage_result.get("uncovered_classes") or []
        if not uncovered_methods and not uncovered_classes:
            return {
                "updated": False,
                "files_written": [],
                "notes": ["No uncovered methods were reported for test improvement."],
            }

        existing_tests = self._collect_existing_test_files(project_path)
        source_files = self._collect_source_files(project_path, limit=6)
        prompt = "\n".join(
            [
                "You are improving Java JUnit tests to increase JaCoCo coverage.",
                "Do not modify production Java source code.",
                "Return strict JSON only:",
                '{"files":[{"path":"src/test/java/...","content":"..."}]}',
                "",
                f"Repository: {repository_name}",
                "Coverage summary:",
                json.dumps(
                    {
                        "line": coverage_result.get("line"),
                        "branch": coverage_result.get("branch"),
                        "method": coverage_result.get("method"),
                        "class": coverage_result.get("class"),
                        "uncovered_methods": uncovered_methods[:12],
                        "uncovered_classes": uncovered_classes[:12],
                    },
                    indent=2,
                ),
                "",
                "Current test files:",
                self._format_file_context(existing_tests[:6]),
                "",
                "Relevant production source context:",
                self._format_file_context(source_files),
                "",
                "Improve ONLY test files and add more scenarios for service, controller, utility, and validation logic where relevant.",
            ]
        )
        response = await self._call_llm(prompt)
        file_specs = self._extract_file_specs(response)
        written_files = self._write_test_files(project_path, file_specs)
        return {
            "updated": bool(written_files),
            "files_written": written_files,
            "notes": ["LLM improved tests for coverage."] if written_files else ["LLM did not return usable coverage improvements."],
            "raw_response": response,
        }

    async def _call_llm(self, prompt: str) -> str:
        try:
            result = await self.chat_service.call_llm(prompt)
            return result.reply
        except Exception as exc:
            logger.exception("LLM test generation call failed")
            return f"LLM_ERROR: {exc}"

    def _collect_source_files(self, project_path: str, limit: int = 6) -> list[dict[str, str]]:
        root = Path(project_path).resolve() / "src" / "main" / "java"
        if not root.exists():
            return []

        priority_tokens = ("controller", "service", "util", "validator")
        prioritized: list[Path] = []
        remaining: list[Path] = []
        for file_path in root.rglob("*.java"):
            normalized = str(file_path).lower()
            if any(token in normalized for token in priority_tokens):
                prioritized.append(file_path)
            else:
                remaining.append(file_path)

        selected = prioritized + remaining
        contexts: list[dict[str, str]] = []
        for file_path in selected[:limit]:
            try:
                contexts.append(
                    {
                        "path": str(file_path.relative_to(Path(project_path).resolve())),
                        "content": file_path.read_text(encoding="utf-8", errors="ignore")[:12000],
                    }
                )
            except OSError:
                continue
        return contexts

    def _collect_existing_test_files(self, project_path: str) -> list[dict[str, str]]:
        root = Path(project_path).resolve() / "src" / "test" / "java"
        if not root.exists():
            return []
        contexts: list[dict[str, str]] = []
        for file_path in root.rglob("*.java"):
            try:
                contexts.append(
                    {
                        "path": str(file_path.relative_to(Path(project_path).resolve())),
                        "content": file_path.read_text(encoding="utf-8", errors="ignore")[:12000],
                    }
                )
            except OSError:
                continue
        return contexts

    def _collect_related_test_files(self, project_path: str, failures: list[Any]) -> list[dict[str, str]]:
        root = Path(project_path).resolve() / "src" / "test" / "java"
        if not root.exists():
            return []

        wanted_names = set()
        for failure in failures:
            if not isinstance(failure, dict):
                continue
            class_name = str(failure.get("class_name") or "").split(".")[-1]
            if class_name:
                wanted_names.add(class_name)
                if not class_name.endswith(".java"):
                    wanted_names.add(f"{class_name}.java")

        contexts: list[dict[str, str]] = []
        for file_path in root.rglob("*.java"):
            if wanted_names and file_path.name not in wanted_names and file_path.stem not in wanted_names:
                continue
            try:
                contexts.append(
                    {
                        "path": str(file_path.relative_to(Path(project_path).resolve())),
                        "content": file_path.read_text(encoding="utf-8", errors="ignore")[:12000],
                    }
                )
            except OSError:
                continue

        return contexts or self._collect_existing_test_files(project_path)[:4]

    def _build_generation_prompt(
        self,
        repository_name: str,
        build_info: dict[str, Any],
        source_files: list[dict[str, str]],
    ) -> str:
        return "\n".join(
            [
                "You are generating JUnit tests for a Java migration validation pipeline.",
                "Do not modify production Java source code.",
                "Generate meaningful JUnit 5 tests, using Mockito or Spring test support when appropriate.",
                "Return strict JSON only with this shape:",
                '{"files":[{"path":"src/test/java/...","content":"..."}]}',
                "",
                f"Repository: {repository_name}",
                f"Build tool: {build_info.get('build_tool')}",
                "",
                "Source files:",
                self._format_file_context(source_files),
                "",
                "Rules:",
                "- Only return files under src/test/java.",
                "- Prefer service, controller, utility, and validation logic.",
                "- Use package declarations that match the source files.",
                "- Keep assertions specific and meaningful.",
            ]
        )

    def _format_file_context(self, files: list[dict[str, str]]) -> str:
        if not files:
            return "No files available."
        blocks: list[str] = []
        for file_info in files:
            path = file_info.get("path") or "unknown"
            content = file_info.get("content") or ""
            blocks.append(f"[FILE] {path}\n{content}")
        return "\n\n".join(blocks)

    def _extract_file_specs(self, raw_response: str) -> list[dict[str, str]]:
        payload = self._extract_json(raw_response)
        if not isinstance(payload, dict):
            return []
        files = payload.get("files")
        if not isinstance(files, list):
            return []
        specs: list[dict[str, str]] = []
        for entry in files:
            if not isinstance(entry, dict):
                continue
            path = str(entry.get("path") or "").strip()
            content = str(entry.get("content") or "")
            if not content.strip():
                continue
            specs.append({"path": path, "content": content})
        return specs

    def _extract_json(self, raw_response: str) -> Any:
        text = (raw_response or "").strip()
        if not text:
            return None
        fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
        candidate = fenced_match.group(1) if fenced_match else text
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            start = candidate.find("{")
            end = candidate.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(candidate[start : end + 1])
                except json.JSONDecodeError:
                    return None
        return None

    def _write_test_files(self, project_path: str, file_specs: list[dict[str, str]]) -> list[str]:
        root = Path(project_path).resolve()
        written_files: list[str] = []

        for spec in file_specs:
            content = spec.get("content") or ""
            normalized_path = self._normalize_test_path(root, spec.get("path") or "", content)
            if normalized_path is None:
                continue
            normalized_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                normalized_path.write_text(content, encoding="utf-8")
                written_files.append(str(normalized_path.relative_to(root)))
            except OSError:
                continue

        return written_files

    def _normalize_test_path(self, root: Path, candidate_path: str, content: str) -> Path | None:
        cleaned = candidate_path.replace("\\", "/").strip()
        if cleaned.startswith("/"):
            cleaned = cleaned.lstrip("/")

        if not cleaned.startswith("src/test/java/") or not cleaned.endswith(".java"):
            package_match = re.search(r"^\s*package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;", content, re.MULTILINE)
            class_match = re.search(r"\bclass\s+([A-Za-z_][A-Za-z0-9_]*)", content)
            package_path = package_match.group(1).replace(".", "/") if package_match else ""
            class_name = class_match.group(1) if class_match else "GeneratedTest"
            cleaned = f"src/test/java/{package_path + '/' if package_path else ''}{class_name}.java"

        destination = (root / cleaned).resolve()
        try:
            destination.relative_to(root)
        except ValueError:
            return None
        return destination

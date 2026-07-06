import asyncio
import os
import re
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


class JUnitService:
    """Detect and execute JUnit tests for Maven and Gradle projects."""

    TEST_NAME_PATTERNS = (
        re.compile(r".*Test\.java$"),
        re.compile(r".*Tests\.java$"),
        re.compile(r".*IT\.java$"),
    )
    TEST_ANNOTATION_PATTERN = re.compile(
        r"@(Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b"
    )
    METHOD_SIGNATURE_PATTERN = re.compile(
        r"(?:public|protected|private)?\s*"
        r"(?:static\s+)?"
        r"(?:final\s+)?"
        r"(?:synchronized\s+)?"
        r"(?:<[^>]+>\s*)?"
        r"(?:void|[A-Za-z_][A-Za-z0-9_<>\[\], ?]*)\s+"
        r"([A-Za-z_][A-Za-z0-9_]*)\s*\(",
    )

    def detect_tests(self, project_path: str) -> dict[str, Any]:
        root = Path(project_path).resolve()
        test_root = root / "src" / "test" / "java"
        result = {
            "tests_found": False,
            "test_root": str(test_root),
            "test_classes": 0,
            "test_methods": 0,
            "test_files": [],
        }

        if not test_root.exists():
            return result

        for file_path in test_root.rglob("*.java"):
            if not file_path.is_file():
                continue
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue

            has_name_match = any(pattern.match(file_path.name) for pattern in self.TEST_NAME_PATTERNS)
            method_names = self._extract_test_method_names(content)
            if not has_name_match and not method_names:
                continue

            result["tests_found"] = True
            result["test_classes"] += 1
            result["test_methods"] += len(method_names)
            result["test_files"].append(str(file_path.relative_to(root)))

        return result

    def describe_test_files(
        self,
        project_path: str,
        test_files: list[str] | None = None,
        *,
        limit: int = 8,
        max_preview_chars: int = 6000,
    ) -> list[dict[str, Any]]:
        root = Path(project_path).resolve()
        candidates: list[Path] = []

        if test_files:
            for relative_path in test_files:
                candidate = (root / str(relative_path)).resolve()
                try:
                    candidate.relative_to(root)
                except ValueError:
                    continue
                candidates.append(candidate)
        else:
            test_root = root / "src" / "test" / "java"
            if test_root.exists():
                candidates.extend(sorted(test_root.rglob("*.java")))

        seen: set[str] = set()
        details: list[dict[str, Any]] = []
        for file_path in candidates:
            normalized_key = str(file_path).lower()
            if normalized_key in seen:
                continue
            seen.add(normalized_key)

            detail = self._build_test_file_detail(root, file_path, max_preview_chars)
            if detail is None:
                continue
            details.append(detail)
            if len(details) >= limit:
                break

        return details

    async def run_tests(self, build_info: dict[str, Any]) -> dict[str, Any]:
        build_tool = str(build_info.get("build_tool") or "unknown").lower()
        project_dir = str(build_info.get("project_dir") or "")
        command = build_info.get("command")

        result = {
            "status": "FAILED",
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "failures": [],
            "test_output": "",
            "return_code": None,
            "command": "",
            "report_files": [],
        }

        if not command or build_tool not in {"maven", "gradle"}:
            result["test_output"] = "Build tool not detected for JUnit execution."
            return result

        args = [command, "test"]
        result["command"] = " ".join(args)

        try:
            process = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_dir or None,
            )
            stdout, stderr = await process.communicate()
        except FileNotFoundError as exc:
            result["test_output"] = f"Test command not available: {exc}"
            return result
        except Exception as exc:
            result["test_output"] = f"Error running tests: {exc}"
            return result

        output = (stdout or b"").decode(errors="ignore") + (stderr or b"").decode(errors="ignore")
        result["test_output"] = output
        result["return_code"] = process.returncode

        parsed = self._parse_junit_reports(build_info)
        if parsed["report_files"]:
            result.update(parsed)
        else:
            self._parse_console_summary(output, result)

        result["status"] = "PASSED" if result["failed"] == 0 and process.returncode == 0 else "FAILED"
        return result

    def _parse_junit_reports(self, build_info: dict[str, Any]) -> dict[str, Any]:
        report_dirs = build_info.get("test_report_dirs") or []
        parsed = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "failures": [],
            "report_files": [],
        }

        for report_dir in report_dirs:
            directory = Path(str(report_dir))
            if not directory.exists():
                continue
            for report_file in directory.glob("TEST-*.xml"):
                parsed["report_files"].append(str(report_file))
                self._parse_single_report(report_file, parsed)

        return parsed

    def _parse_single_report(self, report_file: Path, parsed: dict[str, Any]) -> None:
        try:
            root = ET.parse(report_file).getroot()
        except ET.ParseError:
            return
        except OSError:
            return

        suite_tests = int(root.attrib.get("tests", "0") or 0)
        suite_failures = int(root.attrib.get("failures", "0") or 0)
        suite_errors = int(root.attrib.get("errors", "0") or 0)
        suite_skipped = int(root.attrib.get("skipped", "0") or 0)
        parsed["total"] += suite_tests
        parsed["failed"] += suite_failures + suite_errors
        parsed["skipped"] += suite_skipped

        for testcase in root.findall(".//testcase"):
            failure_node = testcase.find("failure") or testcase.find("error")
            skipped_node = testcase.find("skipped")
            if skipped_node is not None:
                continue
            if failure_node is not None:
                failure_text = (failure_node.text or "").strip()
                parsed["failures"].append(
                    {
                        "class_name": testcase.attrib.get("classname") or root.attrib.get("name") or report_file.stem,
                        "method_name": testcase.attrib.get("name") or "unknown",
                        "reason": (failure_node.attrib.get("message") or failure_text.splitlines()[0] if failure_text else "Test failed"),
                        "stack_trace": failure_text,
                    }
                )

        parsed["passed"] = max(parsed["total"] - parsed["failed"] - parsed["skipped"], 0)

    def _parse_console_summary(self, output: str, result: dict[str, Any]) -> None:
        maven_matches = re.findall(
            r"Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)",
            output,
        )
        if maven_matches:
            tests_run, failures, errors, skipped = map(int, maven_matches[-1])
            result["total"] = tests_run
            result["failed"] = failures + errors
            result["skipped"] = skipped
            result["passed"] = max(tests_run - result["failed"] - skipped, 0)
            return

        gradle_matches = re.findall(
            r"(\d+)\s+tests completed,\s+(\d+)\s+failed(?:,\s+(\d+)\s+skipped)?",
            output,
        )
        if gradle_matches:
            tests_run, failed, skipped = gradle_matches[-1]
            tests_run_i = int(tests_run)
            failed_i = int(failed)
            skipped_i = int(skipped or 0)
            result["total"] = tests_run_i
            result["failed"] = failed_i
            result["skipped"] = skipped_i
            result["passed"] = max(tests_run_i - failed_i - skipped_i, 0)

    def _build_test_file_detail(
        self,
        root: Path,
        file_path: Path,
        max_preview_chars: int,
    ) -> dict[str, Any] | None:
        if not file_path.exists() or not file_path.is_file():
            return None

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return None

        method_names = self._extract_test_method_names(content)
        preview = content[:max_preview_chars]
        return {
            "path": str(file_path.relative_to(root)),
            "file_name": file_path.name,
            "class_name": file_path.stem,
            "test_method_count": len(method_names),
            "test_methods": method_names[:20],
            "line_count": content.count("\n") + (1 if content else 0),
            "code_preview": preview,
            "truncated": len(content) > max_preview_chars,
        }

    def _extract_test_method_names(self, content: str) -> list[str]:
        if not content:
            return []

        lines = content.splitlines()
        method_names: list[str] = []
        annotation_seen = False

        for line in lines:
            stripped = line.strip()
            if self.TEST_ANNOTATION_PATTERN.search(stripped):
                annotation_seen = True
                continue

            if annotation_seen and not stripped:
                continue

            if annotation_seen and stripped.startswith("@"):
                continue

            if annotation_seen and (
                stripped.startswith("//")
                or stripped.startswith("/*")
                or stripped.startswith("*")
            ):
                continue

            if annotation_seen:
                method_match = self.METHOD_SIGNATURE_PATTERN.search(stripped)
                if method_match:
                    method_names.append(method_match.group(1))
                annotation_seen = False

        return method_names

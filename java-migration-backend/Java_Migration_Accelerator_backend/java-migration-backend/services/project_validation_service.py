import inspect
from pathlib import Path
from typing import Any, Callable

from services.build_tool_service import BuildToolService
from services.jacoco_service import JaCoCoService
from services.junit_service import JUnitService
from services.sonarqube_service import SonarQubeService
from services.test_generation_service import TestGenerationService


class ProjectValidationService:
    """Independent project validation pipeline for migrated repositories."""

    LINE_COVERAGE_THRESHOLD = 70.0
    BRANCH_COVERAGE_THRESHOLD = 60.0
    METHOD_COVERAGE_THRESHOLD = 70.0

    def __init__(
        self,
        build_tool_service: BuildToolService | None = None,
        junit_service: JUnitService | None = None,
        jacoco_service: JaCoCoService | None = None,
        test_generation_service: TestGenerationService | None = None,
        sonarqube_service: SonarQubeService | None = None,
    ) -> None:
        self.build_tool_service = build_tool_service or BuildToolService()
        self.junit_service = junit_service or JUnitService()
        self.jacoco_service = jacoco_service or JaCoCoService()
        self.test_generation_service = test_generation_service or TestGenerationService()
        self.sonarqube_service = sonarqube_service or SonarQubeService()

    async def validate_project(
        self,
        project_path: str,
        repository_name: str,
        *,
        run_sonar: bool = False,
        sonar_project_key: str | None = None,
        progress_callback: Callable[[str, int | None], Any] | None = None,
        log_callback: Callable[[str], Any] | None = None,
    ) -> dict[str, Any]:
        report = {
            "repository_name": repository_name,
            "build_tool": "",
            "existing_tests_found": False,
            "llm_generated_tests": False,
            "llm_updated_tests": False,
            "test_detection": {
                "tests_found": False,
                "test_classes": 0,
                "test_methods": 0,
                "test_files": [],
            },
            "junit": {
                "status": "NOT_RUN",
                "total": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "failures": [],
            },
            "coverage": {
                "line": 0.0,
                "branch": 0.0,
                "method": 0.0,
                "class": 0.0,
            },
            "sonar": {
                "configured": False,
                "quality_gate": "NOT_CONFIGURED",
                "bugs": 0,
                "vulnerabilities": 0,
                "code_smells": 0,
                "reliability": None,
                "maintainability": None,
            },
            "migration_risk": "HIGH",
            "recommendation": "",
            "notes": [],
            "generated_test_files": [],
            "updated_test_files": [],
            "existing_test_cases": [],
            "generated_test_cases": [],
            "updated_test_cases": [],
            "failure_analysis": [],
        }

        await self._progress(progress_callback, "Detecting build tool", 61)
        await self._log(log_callback, "Starting project validation pipeline")
        build_info = self.build_tool_service.detect(project_path)
        report["build_tool"] = str(build_info.get("build_tool") or "unknown")

        if report["build_tool"] == "unknown":
            report["notes"].append("Could not detect Maven or Gradle in the cloned repository.")
            report["recommendation"] = "Validation could not run because the build tool was not detected. Review the repository layout before migration."
            return report

        await self._progress(progress_callback, "Detecting tests", 63)
        detection = self.junit_service.detect_tests(str(build_info.get("project_dir") or project_path))
        report["test_detection"] = detection
        report["existing_tests_found"] = bool(detection.get("tests_found"))
        if report["existing_tests_found"]:
            report["existing_test_cases"] = self.junit_service.describe_test_files(
                str(build_info.get("project_dir") or project_path),
                detection.get("test_files") or [],
                limit=6,
            )
        await self._log(
            log_callback,
            f"Detected build tool={report['build_tool']} tests_found={report['existing_tests_found']} test_classes={detection.get('test_classes', 0)}",
        )

        if not report["existing_tests_found"]:
            await self._progress(progress_callback, "Generating tests", 66)
            generation = await self.test_generation_service.generate_tests(
                str(build_info.get("project_dir") or project_path),
                repository_name,
                build_info,
            )
            report["llm_generated_tests"] = bool(generation.get("generated"))
            report["generated_test_files"] = generation.get("files_written") or []
            if report["llm_generated_tests"]:
                report["generated_test_cases"] = self.junit_service.describe_test_files(
                    str(build_info.get("project_dir") or project_path),
                    report["generated_test_files"],
                    limit=6,
                )
            report["notes"].extend(generation.get("notes") or [])
            if report["llm_generated_tests"]:
                await self._log(
                    log_callback,
                    f"Generated {len(report['generated_test_files'])} test files with the LLM",
                )
                detection = self.junit_service.detect_tests(str(build_info.get("project_dir") or project_path))
                report["test_detection"] = detection
            else:
                await self._log(log_callback, "LLM test generation did not produce usable test files")

        if report["test_detection"].get("tests_found"):
            await self._progress(progress_callback, "Running JUnit", 69)
            junit_result = await self.junit_service.run_tests(build_info)
            report["junit"] = {
                "status": junit_result.get("status", "FAILED"),
                "total": junit_result.get("total", 0),
                "passed": junit_result.get("passed", 0),
                "failed": junit_result.get("failed", 0),
                "skipped": junit_result.get("skipped", 0),
                "failures": junit_result.get("failures", []),
            }
            await self._log(
                log_callback,
                f"JUnit finished with status={report['junit']['status']} total={report['junit']['total']} failed={report['junit']['failed']}",
            )

            if report["junit"]["failed"] > 0:
                failure_analysis = await self.test_generation_service.analyze_failures(
                    str(build_info.get("project_dir") or project_path),
                    repository_name,
                    junit_result,
                )
                report["failure_analysis"] = failure_analysis.get("decisions") or []
                if any(
                    isinstance(decision, dict) and decision.get("action") == "update_test"
                    for decision in report["failure_analysis"]
                ):
                    await self._progress(progress_callback, "Updating tests", 71)
                    update_result = await self.test_generation_service.improve_tests_for_failures(
                        str(build_info.get("project_dir") or project_path),
                        repository_name,
                        junit_result,
                        failure_analysis,
                    )
                    if update_result.get("updated"):
                        report["llm_updated_tests"] = True
                        report["updated_test_files"].extend(update_result.get("files_written") or [])
                        updated_cases = self.junit_service.describe_test_files(
                            str(build_info.get("project_dir") or project_path),
                            update_result.get("files_written") or [],
                            limit=6,
                        )
                        report["updated_test_cases"] = self._merge_test_case_details(
                            report["updated_test_cases"],
                            updated_cases,
                        )
                        report["notes"].extend(update_result.get("notes") or [])
                        await self._log(
                            log_callback,
                            f"LLM updated {len(update_result.get('files_written') or [])} test files for failing cases",
                        )
                        await self._progress(progress_callback, "Running JUnit", 73)
                        junit_result = await self.junit_service.run_tests(build_info)
                        report["junit"] = {
                            "status": junit_result.get("status", "FAILED"),
                            "total": junit_result.get("total", 0),
                            "passed": junit_result.get("passed", 0),
                            "failed": junit_result.get("failed", 0),
                            "skipped": junit_result.get("skipped", 0),
                            "failures": junit_result.get("failures", []),
                        }
                    else:
                        report["notes"].extend(update_result.get("notes") or [])

        if report["junit"]["status"] == "PASSED":
            await self._progress(progress_callback, "Running JaCoCo", 76)
            coverage_result = await self.jacoco_service.run_coverage(build_info)
            report["coverage"] = {
                "line": coverage_result.get("line", 0.0),
                "branch": coverage_result.get("branch", 0.0),
                "method": coverage_result.get("method", 0.0),
                "class": coverage_result.get("class", 0.0),
            }
            await self._log(
                log_callback,
                f"JaCoCo coverage line={report['coverage']['line']} branch={report['coverage']['branch']} method={report['coverage']['method']}",
            )

            if self._coverage_is_low(report["coverage"]):
                await self._progress(progress_callback, "Updating tests", 79)
                improve_result = await self.test_generation_service.improve_tests_for_coverage(
                    str(build_info.get("project_dir") or project_path),
                    repository_name,
                    coverage_result,
                )
                if improve_result.get("updated"):
                    report["llm_updated_tests"] = True
                    report["updated_test_files"].extend(improve_result.get("files_written") or [])
                    updated_cases = self.junit_service.describe_test_files(
                        str(build_info.get("project_dir") or project_path),
                        improve_result.get("files_written") or [],
                        limit=6,
                    )
                    report["updated_test_cases"] = self._merge_test_case_details(
                        report["updated_test_cases"],
                        updated_cases,
                    )
                    report["notes"].extend(improve_result.get("notes") or [])
                    await self._log(
                        log_callback,
                        f"LLM updated {len(improve_result.get('files_written') or [])} test files for coverage improvements",
                    )
                    await self._progress(progress_callback, "Running JUnit", 81)
                    junit_result = await self.junit_service.run_tests(build_info)
                    report["junit"] = {
                        "status": junit_result.get("status", "FAILED"),
                        "total": junit_result.get("total", 0),
                        "passed": junit_result.get("passed", 0),
                        "failed": junit_result.get("failed", 0),
                        "skipped": junit_result.get("skipped", 0),
                        "failures": junit_result.get("failures", []),
                    }
                    if report["junit"]["status"] == "PASSED":
                        await self._progress(progress_callback, "Running JaCoCo", 83)
                        coverage_result = await self.jacoco_service.run_coverage(build_info)
                        report["coverage"] = {
                            "line": coverage_result.get("line", 0.0),
                            "branch": coverage_result.get("branch", 0.0),
                            "method": coverage_result.get("method", 0.0),
                            "class": coverage_result.get("class", 0.0),
                        }
                else:
                    report["notes"].extend(improve_result.get("notes") or [])

        sonar_configured = bool(getattr(self.sonarqube_service, "sonar_token", ""))
        report["sonar"]["configured"] = sonar_configured
        if run_sonar and sonar_configured:
            await self._progress(progress_callback, "Running SonarQube", 86)
            sonar_result = await self.sonarqube_service.analyze_project(
                str(build_info.get("project_dir") or project_path),
                sonar_project_key or self._safe_project_key(repository_name),
            )
            report["sonar"] = {
                "configured": True,
                "quality_gate": sonar_result.get("quality_gate", "UNKNOWN"),
                "bugs": sonar_result.get("bugs", 0),
                "vulnerabilities": sonar_result.get("vulnerabilities", 0),
                "code_smells": sonar_result.get("code_smells", 0),
                "reliability": sonar_result.get("reliability"),
                "maintainability": sonar_result.get("maintainability"),
            }
            await self._log(
                log_callback,
                f"SonarQube quality gate={report['sonar']['quality_gate']}",
            )

        report["updated_test_files"] = list(dict.fromkeys(report["updated_test_files"]))
        report["migration_risk"] = self._determine_risk(report)
        report["recommendation"] = self._build_recommendation(report)
        await self._progress(progress_callback, "Building validation report", 89)
        await self._log(log_callback, f"Validation pipeline completed with risk={report['migration_risk']}")
        return report

    def _merge_test_case_details(
        self,
        existing_cases: list[dict[str, Any]],
        new_cases: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        merged_by_path: dict[str, dict[str, Any]] = {}
        for item in existing_cases + new_cases:
            if not isinstance(item, dict):
                continue
            path = str(item.get("path") or "").strip()
            if not path:
                continue
            merged_by_path[path] = item
        return list(merged_by_path.values())

    def _coverage_is_low(self, coverage: dict[str, Any]) -> bool:
        return (
            float(coverage.get("line") or 0.0) < self.LINE_COVERAGE_THRESHOLD
            or float(coverage.get("branch") or 0.0) < self.BRANCH_COVERAGE_THRESHOLD
            or float(coverage.get("method") or 0.0) < self.METHOD_COVERAGE_THRESHOLD
        )

    def _determine_risk(self, report: dict[str, Any]) -> str:
        junit = report.get("junit") or {}
        coverage = report.get("coverage") or {}
        sonar = report.get("sonar") or {}

        if report.get("build_tool") == "unknown":
            return "HIGH"
        if not report.get("test_detection", {}).get("tests_found"):
            return "HIGH"
        if junit.get("status") != "PASSED":
            return "HIGH"
        if sonar.get("configured") and str(sonar.get("quality_gate") or "").upper() not in {"PASSED", "OK"}:
            return "HIGH"
        if (
            float(coverage.get("line") or 0.0) >= 80.0
            and float(coverage.get("branch") or 0.0) >= 70.0
            and float(coverage.get("method") or 0.0) >= 80.0
        ):
            return "LOW"
        return "MEDIUM"

    def _build_recommendation(self, report: dict[str, Any]) -> str:
        risk = report.get("migration_risk")
        junit = report.get("junit") or {}
        coverage = report.get("coverage") or {}
        if risk == "LOW":
            return (
                "The repository passed JUnit validation with healthy coverage and is in a good state for migration."
            )
        if risk == "MEDIUM":
            return (
                "The repository is partially validated. Improve the remaining low-coverage areas before treating the migration as release-ready."
            )
        if junit.get("failed", 0) > 0:
            first_failure = (junit.get("failures") or [{}])[0]
            class_name = first_failure.get("class_name") or "UnknownTest"
            method_name = first_failure.get("method_name") or "unknownMethod"
            return (
                f"JUnit validation is failing in {class_name}.{method_name}. Review the failure reason and resolve test or application issues before migration."
            )
        if not report.get("test_detection", {}).get("tests_found"):
            return "No usable JUnit tests were available after validation. Add or repair tests before relying on the migration outcome."
        if float(coverage.get("line") or 0.0) == 0.0:
            return "Coverage data was not produced. Verify JaCoCo configuration before accepting the migration validation results."
        return "Validation found blocking issues. Review the report before migration."

    def _safe_project_key(self, repository_name: str) -> str:
        cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "-" for ch in repository_name.strip())
        return cleaned or Path(repository_name).name or "migration-validation"

    async def _progress(
        self,
        callback: Callable[[str, int | None], Any] | None,
        step: str,
        progress: int | None,
    ) -> None:
        if callback is None:
            return
        maybe_awaitable = callback(step, progress)
        if inspect.isawaitable(maybe_awaitable):
            await maybe_awaitable

    async def _log(self, callback: Callable[[str], Any] | None, message: str) -> None:
        if callback is None:
            return
        maybe_awaitable = callback(message)
        if inspect.isawaitable(maybe_awaitable):
            await maybe_awaitable

import os
from pathlib import Path
from typing import Any


class BuildToolService:
    """Detect build tooling and report locations for Java repositories."""

    def detect(self, project_path: str) -> dict[str, Any]:
        root = Path(project_path).resolve()
        build_dir = self._find_build_directory(root)
        if build_dir is None:
            return {
                "build_tool": "unknown",
                "project_dir": str(root),
                "build_file": None,
                "command": None,
                "command_kind": None,
                "uses_wrapper": False,
                "test_report_dirs": [],
                "jacoco_xml_path": None,
            }

        pom_path = build_dir / "pom.xml"
        gradle_path = build_dir / "build.gradle"
        gradle_kts_path = build_dir / "build.gradle.kts"

        if pom_path.exists():
            wrapper = self._resolve_wrapper(build_dir, "mvnw")
            return {
                "build_tool": "maven",
                "project_dir": str(build_dir),
                "build_file": str(pom_path),
                "command": wrapper or "mvn",
                "command_kind": "wrapper" if wrapper else "system",
                "uses_wrapper": bool(wrapper),
                "test_report_dirs": [
                    str(build_dir / "target" / "surefire-reports"),
                    str(build_dir / "target" / "failsafe-reports"),
                ],
                "jacoco_xml_path": str(
                    build_dir / "target" / "site" / "jacoco" / "jacoco.xml"
                ),
            }

        if gradle_path.exists() or gradle_kts_path.exists():
            wrapper = self._resolve_wrapper(build_dir, "gradlew")
            build_file = gradle_kts_path if gradle_kts_path.exists() else gradle_path
            return {
                "build_tool": "gradle",
                "project_dir": str(build_dir),
                "build_file": str(build_file),
                "command": wrapper or "gradle",
                "command_kind": "wrapper" if wrapper else "system",
                "uses_wrapper": bool(wrapper),
                "test_report_dirs": [
                    str(build_dir / "build" / "test-results" / "test"),
                ],
                "jacoco_xml_path": str(
                    build_dir
                    / "build"
                    / "reports"
                    / "jacoco"
                    / "test"
                    / "jacocoTestReport.xml"
                ),
            }

        return {
            "build_tool": "unknown",
            "project_dir": str(root),
            "build_file": None,
            "command": None,
            "command_kind": None,
            "uses_wrapper": False,
            "test_report_dirs": [],
            "jacoco_xml_path": None,
        }

    def _resolve_wrapper(self, build_dir: Path, base_name: str) -> str | None:
        candidates = [build_dir / base_name, build_dir / f"{base_name}.cmd", build_dir / f"{base_name}.bat"]
        for candidate in candidates:
            if candidate.exists():
                return str(candidate)
        return None

    def _find_build_directory(self, root: Path) -> Path | None:
        primary_files = ["pom.xml", "build.gradle", "build.gradle.kts"]
        for file_name in primary_files:
            if (root / file_name).exists():
                return root

        ignored_dirs = {".git", ".idea", ".rag_store", "node_modules", "target", "build", "out", "__pycache__"}
        best_candidate: tuple[int, Path] | None = None

        for current_root, dir_names, file_names in os.walk(root):
            current = Path(current_root)
            depth = len(current.relative_to(root).parts)
            if depth > 3:
                dir_names[:] = []
                continue

            dir_names[:] = [name for name in dir_names if name not in ignored_dirs and not name.startswith(".")]

            if any(name in file_names for name in primary_files):
                score = depth
                if best_candidate is None or score < best_candidate[0]:
                    best_candidate = (score, current)

        return best_candidate[1] if best_candidate else None

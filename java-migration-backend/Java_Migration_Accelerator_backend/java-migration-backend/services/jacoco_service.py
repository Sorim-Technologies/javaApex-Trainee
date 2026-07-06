import asyncio
import tempfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


class JaCoCoService:
    """Run JaCoCo coverage and parse the generated XML reports."""

    async def run_coverage(self, build_info: dict[str, Any]) -> dict[str, Any]:
        build_tool = str(build_info.get("build_tool") or "unknown").lower()
        project_dir = str(build_info.get("project_dir") or "")
        command = build_info.get("command")

        result = {
            "status": "NOT_AVAILABLE",
            "line": 0.0,
            "branch": 0.0,
            "method": 0.0,
            "class": 0.0,
            "raw_output": "",
            "return_code": None,
            "jacoco_xml_path": build_info.get("jacoco_xml_path"),
            "uncovered_methods": [],
            "uncovered_classes": [],
        }

        if not command or build_tool not in {"maven", "gradle"}:
            result["raw_output"] = "Build tool not detected for JaCoCo execution."
            return result

        if build_tool == "maven":
            command_variants = [
                [command, "clean", "test", "jacoco:report"],
                [
                    command,
                    "clean",
                    "org.jacoco:jacoco-maven-plugin:prepare-agent",
                    "test",
                    "org.jacoco:jacoco-maven-plugin:report",
                ],
            ]
        else:
            init_script = self._write_gradle_init_script()
            command_variants = [
                [command, "test", "jacocoTestReport", "--init-script", init_script]
            ]

        output_parts: list[str] = []
        last_return_code: int | None = None
        try:
            for args in command_variants:
                try:
                    process = await asyncio.create_subprocess_exec(
                        *args,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=project_dir or None,
                    )
                    stdout, stderr = await process.communicate()
                    output = (stdout or b"").decode(errors="ignore") + (stderr or b"").decode(errors="ignore")
                    output_parts.append(f"$ {' '.join(args)}\n{output}".strip())
                    last_return_code = process.returncode
                    jacoco_xml = Path(str(build_info.get("jacoco_xml_path") or ""))
                    if jacoco_xml.exists():
                        break
                except FileNotFoundError as exc:
                    output_parts.append(f"$ {' '.join(args)}\nCommand not available: {exc}")
                    break
        finally:
            if build_tool == "gradle":
                self._cleanup_gradle_init_script(command_variants[0][-1])

        result["raw_output"] = "\n\n".join(output_parts)
        result["return_code"] = last_return_code

        jacoco_xml_path = Path(str(build_info.get("jacoco_xml_path") or ""))
        if not jacoco_xml_path.exists():
            return result

        parsed = self._parse_jacoco_xml(jacoco_xml_path)
        result.update(parsed)
        result["status"] = "AVAILABLE"
        return result

    def _write_gradle_init_script(self) -> str:
        script_content = """
allprojects {
    afterEvaluate { project ->
        if (project.plugins.hasPlugin('java') || project.plugins.hasPlugin('java-library') || project.plugins.hasPlugin('org.springframework.boot')) {
            project.apply plugin: 'jacoco'
            project.tasks.matching { it.name == 'jacocoTestReport' }.configureEach {
                dependsOn project.tasks.matching { task -> task.name == 'test' }
                reports {
                    xml.required = true
                    html.required = true
                }
            }
        }
    }
}
"""
        handle = tempfile.NamedTemporaryFile("w", suffix=".gradle", delete=False, encoding="utf-8")
        with handle:
            handle.write(script_content.strip())
        return handle.name

    def _cleanup_gradle_init_script(self, script_path: str) -> None:
        try:
            Path(script_path).unlink(missing_ok=True)
        except OSError:
            pass

    def _parse_jacoco_xml(self, jacoco_xml_path: Path) -> dict[str, Any]:
        result = {
            "line": 0.0,
            "branch": 0.0,
            "method": 0.0,
            "class": 0.0,
            "jacoco_xml_path": str(jacoco_xml_path),
            "uncovered_methods": [],
            "uncovered_classes": [],
        }

        try:
            root = ET.parse(jacoco_xml_path).getroot()
        except ET.ParseError:
            return result
        except OSError:
            return result

        counters: dict[str, tuple[int, int]] = {}
        for counter in root.findall("./counter"):
            counter_type = counter.attrib.get("type")
            if not counter_type:
                continue
            missed = int(counter.attrib.get("missed", "0") or 0)
            covered = int(counter.attrib.get("covered", "0") or 0)
            counters[counter_type] = (missed, covered)

        for counter_name, output_name in (
            ("LINE", "line"),
            ("BRANCH", "branch"),
            ("METHOD", "method"),
            ("CLASS", "class"),
        ):
            missed, covered = counters.get(counter_name, (0, 0))
            total = missed + covered
            result[output_name] = round((covered / total * 100.0), 2) if total else 0.0

        for package in root.findall("./package"):
            package_name = package.attrib.get("name", "").replace("/", ".")
            for class_node in package.findall("./class"):
                class_name = class_node.attrib.get("name", "").replace("/", ".")
                class_counters = {
                    counter.attrib.get("type"): (
                        int(counter.attrib.get("missed", "0") or 0),
                        int(counter.attrib.get("covered", "0") or 0),
                    )
                    for counter in class_node.findall("./counter")
                }
                missed_lines, covered_lines = class_counters.get("LINE", (0, 0))
                if missed_lines > 0:
                    result["uncovered_classes"].append(
                        {
                            "class_name": class_name or package_name,
                            "missed_lines": missed_lines,
                            "covered_lines": covered_lines,
                        }
                    )

                for method_node in class_node.findall("./method"):
                    method_name = method_node.attrib.get("name") or "unknown"
                    method_counters = {
                        counter.attrib.get("type"): (
                            int(counter.attrib.get("missed", "0") or 0),
                            int(counter.attrib.get("covered", "0") or 0),
                        )
                        for counter in method_node.findall("./counter")
                    }
                    missed_method_lines, covered_method_lines = method_counters.get("LINE", (0, 0))
                    missed_method_branches, covered_method_branches = method_counters.get("BRANCH", (0, 0))
                    if missed_method_lines > 0 or missed_method_branches > 0:
                        result["uncovered_methods"].append(
                            {
                                "class_name": class_name or package_name,
                                "method_name": method_name,
                                "description": method_node.attrib.get("desc") or "",
                                "missed_lines": missed_method_lines,
                                "covered_lines": covered_method_lines,
                                "missed_branches": missed_method_branches,
                                "covered_branches": covered_method_branches,
                            }
                        )

        result["uncovered_methods"] = result["uncovered_methods"][:25]
        result["uncovered_classes"] = result["uncovered_classes"][:25]
        return result

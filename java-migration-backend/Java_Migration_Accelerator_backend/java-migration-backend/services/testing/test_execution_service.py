import os
import re
import sys
import asyncio
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Callable, List, Tuple

MAX_TEST_REPAIR_RETRIES = 5

class TestExecutionService:
    async def execute_tests(self, project_path: str, build_tool: str, log_cb: Optional[Callable[[str], None]] = None) -> Dict[str, Any]:
        """
        Runs the test suite (mvn clean verify / gradlew test jacocoTestReport) and returns total, passed, 
        failed, skipped, duration, and JaCoCo coverage metrics.
        """
        result = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "duration_seconds": 0.0,
            "success_rate": 0.0,
            "stdout": "",
            "stderr": "",
            "message": "Tests execution completed.",
            "coverage_line": 0.0,
            "coverage_branch": 0.0,
            "coverage_method": 0.0,
            "coverage_class": 0.0,
            "coverage_instruction": 0.0,
            "coverage_complexity": 0.0,
            "exit_code": None,
            "surefire_xml_files": [],
            "jacoco_xml_file": None
        }

        # 1. Ensure JaCoCo plugin is configured in build file before running
        from services.testing.jacoco_service import JacocoService
        jacoco = JacocoService()
        plugin_configured = jacoco._ensure_jacoco_plugin(project_path, build_tool)
        if plugin_configured:
            print("[Testing] JaCoCo plugin is configured in build file.")
        else:
            print("[Testing] Warning: JaCoCo plugin could not be configured.")

        # 2. Verify that the generated test files exist before running Maven/Gradle
        test_files = []
        test_dir = os.path.join(project_path, "src", "test", "java")
        if os.path.exists(test_dir):
            for root_dir, _, files in os.walk(test_dir):
                for file in files:
                    if file.endswith("Test.java") or file.endswith("Tests.java"):
                        full_path = os.path.join(root_dir, file)
                        rel_path = os.path.relpath(full_path, project_path)
                        test_files.append(rel_path)
        print(f"[Testing] Generated test files saved: {test_files}")
        if log_cb:
            log_cb(f"[Testing] Generated test files saved: {test_files}")

        patched_file, original_content = self._patch_java_version_if_needed(project_path)
        try:
            is_windows = sys.platform == "win32"
            cmd = []

            # 3. Determine executable and arguments
            if build_tool == "maven":
                mvnw_cmd_path = os.path.join(project_path, "mvnw.cmd")
                mvnw_sh_path = os.path.join(project_path, "mvnw")
                if is_windows and os.path.exists(mvnw_cmd_path):
                    cmd = [".\\mvnw.cmd", "clean", "test", ]
                elif not is_windows and os.path.exists(mvnw_sh_path):
                    cmd = ["./mvnw", "clean", "test", ]
                else:
                    cmd = ["mvn", "clean", "test", ]
            
            elif build_tool == "gradle":
                gradlew_bat_path = os.path.join(project_path, "gradlew.bat")
                gradlew_sh_path = os.path.join(project_path, "gradlew")
                if is_windows and os.path.exists(gradlew_bat_path):
                    cmd = [".\\gradlew.bat", "clean", "test"]
                elif not is_windows and os.path.exists(gradlew_sh_path):
                    cmd = ["./gradlew", "clean", "test"]
                else:
                    cmd = ["gradle", "clean", "test"]
            
            else:
                result["message"] = "No supported build tool detected. Skipping execution."
                return result

            # Construct command string
            cmd_str = " ".join(cmd)
            print(f"[Testing] Maven/Gradle command executed: {cmd_str} in {project_path}")
            
            # Start timer
            start_time = asyncio.get_event_loop().time()

            # Execute subprocess using shell
            process = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path
            )
            stdout_bytes, stderr_bytes = await process.communicate()
            
            # Stop timer
            end_time = asyncio.get_event_loop().time()
            result["duration_seconds"] = round(end_time - start_time, 2)

            stdout = stdout_bytes.decode('utf-8', errors='ignore')
            stderr = stderr_bytes.decode('utf-8', errors='ignore')
            
            result["stdout"] = stdout
            result["stderr"] = stderr
            result["exit_code"] = process.returncode
            if log_cb:
                log_cb(f"[Testing] Exit Code: {process.returncode}")
                log_cb(f"[Testing] Maven/Gradle stdout:\n{stdout}")
                if stderr.strip():
                    log_cb(f"[Testing] Maven/Gradle stderr:\n{stderr}")

            combined_output_lower = (stdout + stderr).lower()
            shell_failure_markers = [
                "is not recognized as an internal or external command",  # Windows
                "command not found",                                      # Linux/macOS
                "no such file or directory",
                "'mvn' is not recognized",
                "'gradle' is not recognized",
                "'./mvnw' is not recognized",
                "'./gradlew' is not recognized",
            ]
            build_tool_missing = any(marker in combined_output_lower for marker in shell_failure_markers)

            if process.returncode != 0 and build_tool_missing:
                result["message"] = (
                    f"Test execution failed: the build command could not be executed "
                    f"(exit code {process.returncode}). This usually means '{cmd[0]}' "
                    f"is not installed or not on PATH for the backend process. "
                    f"Raw error: {(stderr or stdout).strip()[:500]}"
                )
                print(f"[Testing] CRITICAL: build tool invocation failed. {result['message']}")
                if log_cb:
                    log_cb(f"[Testing] CRITICAL: build tool invocation failed. {result['message']}")
                return result

            initial_reports = self._find_test_report_files(project_path)
            if process.returncode != 0 and not initial_reports:
                log_fn = log_cb if log_cb else print
                log_fn(f"[Testing] Build failed (exit code {process.returncode}). Starting repair loop...")
                log_fn(f"[Testing] Full build stdout:\n{stdout}")
                log_fn(f"[Testing] Full build stderr:\n{stderr}")

                # ---- Repair loop: classify errors, fix, recompile, retry ----
                cmd_str = " ".join(cmd)
                repaired_code, repaired_out, repaired_err = await self._repair_and_retry(
                    project_path, build_tool, cmd_str, stdout, stderr,
                    log_cb=log_cb
                )
                if repaired_code == 0:
                    stdout = repaired_out
                    stderr = repaired_err
                    end_time = asyncio.get_event_loop().time()
                    result["duration_seconds"] = round(end_time - start_time, 2)
                    # Parse reports after successful repair + rerun
                    surefire_files_r = []
                    for root_dir, dirs, files in os.walk(project_path):
                        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "src")]
                        np = root_dir.replace("\\", "/")
                        if "surefire-reports" in np or "failsafe-reports" in np or "test-results/test" in np:
                            for file in files:
                                if file.endswith(".xml"):
                                    surefire_files_r.append(os.path.join(root_dir, file))
                    xml_counts_r = self._parse_xml_test_reports(project_path, build_tool)
                    if xml_counts_r and xml_counts_r["total"] > 0:
                        result["total"] = xml_counts_r["total"]
                        result["passed"] = xml_counts_r["passed"]
                        result["failed"] = xml_counts_r["failed"]
                        result["skipped"] = xml_counts_r["skipped"]
                        if log_cb:
                            log_cb(f"[Testing] Surefire XML: FOUND - Tests Run: {result['total']}")
                    else:
                        self._parse_console_output(stdout + "\n" + stderr, build_tool, result)
                    if result["total"] > 0:
                        result["success_rate"] = round((result["passed"] / result["total"]) * 100, 2)
                    result["message"] = f"Executed {result['total']} tests. Success rate: {result['success_rate']}%"
                    if log_cb:
                        log_cb(f"[Testing] Tests Run: {result['total']}  Passed: {result['passed']}  Failed: {result['failed']}  Coverage Line: pending JaCoCo parse")
                    # Fall through to coverage parsing below
                    jacoco_xml_r = jacoco._find_jacoco_xml(project_path, build_tool)
                    if jacoco_xml_r and os.path.exists(jacoco_xml_r):
                        from services.testing.coverage_parser import CoverageParser
                        cov_r = CoverageParser().parse_jacoco_xml(jacoco_xml_r)
                        result["coverage_line"] = cov_r.get("line", 0.0)
                        result["coverage_branch"] = cov_r.get("branch", 0.0)
                        result["coverage_method"] = cov_r.get("method", 0.0)
                        result["coverage_class"] = cov_r.get("class_", 0.0)
                        result["coverage_instruction"] = cov_r.get("instruction", 0.0)
                        result["coverage_complexity"] = cov_r.get("complexity", 0.0)
                        if log_cb:
                            log_cb(f"[Testing] JaCoCo XML: FOUND - Coverage Line: {result['coverage_line']}%")
                    return result
                else:
                    # All repairs exhausted — log detailed diagnostics, return zero metrics
                    combined_out = repaired_out + "\n" + repaired_err
                    errors_detail = self._parse_compiler_errors(combined_out)
                    detail_lines = [
                        f"  File: {e['file_name']}  Line: {e['line_number']}  Error: {e['message']}"
                        for e in errors_detail[:10]
                    ]
                    detail = "\n".join(detail_lines) if detail_lines else "No specific compiler errors parsed."
                    result["message"] = (
                        f"Tests could not run - Build / Compilation Failed (exit code {repaired_code}).\n"
                        f"Compiler diagnostics:\n{detail}\n"
                        f"Last Maven stdout (tail):\n{repaired_out[-2000:]}\n"
                        f"Last Maven stderr (tail):\n{repaired_err[-2000:]}"
                    )
                    if log_cb:
                        log_cb(f"[Testing] Build still failing after all repair attempts:\n{detail}")
                    return result

            # 4. Locate and parse actual test reports
            surefire_files = []
            for root_dir, dirs, files in os.walk(project_path):
                dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "src")]
                normalized_path = root_dir.replace("\\", "/")
                if "surefire-reports" in normalized_path or "failsafe-reports" in normalized_path or "test-results/test" in normalized_path:
                    for file in files:
                        if file.endswith(".xml"):
                            surefire_files.append(os.path.join(root_dir, file))
            
            print(f"[Testing] Surefire reports found: {surefire_files}")
            result["surefire_xml_files"] = surefire_files
            if log_cb:
                if surefire_files:
                    log_cb(f"[Testing] Surefire XML: FOUND ({len(surefire_files)} file(s))")
                else:
                    cause = "Maven/Gradle build failed before test execution" if process.returncode != 0 else "Surefire/Gradle test task produced no XML reports"
                    log_cb(f"[Testing] Surefire XML: MISSING - {cause}")

            xml_counts = self._parse_xml_test_reports(project_path, build_tool)
            if xml_counts and xml_counts["total"] > 0:
                result["total"] = xml_counts["total"]
                result["passed"] = xml_counts["passed"]
                result["failed"] = xml_counts["failed"]
                result["skipped"] = xml_counts["skipped"]
                if "duration_seconds" in xml_counts:
                    result["duration_seconds"] = xml_counts["duration_seconds"]
                print(f"[Testing] Parsed test counts from XML reports: {xml_counts}")
            else:
                print("[Testing] No XML test reports found/parsed. Falling back to console output regex...")
                self._parse_console_output(stdout + "\n" + stderr, build_tool, result)

            if result["total"] > 0:
                result["success_rate"] = round((result["passed"] / result["total"]) * 100, 2)
            else:
                result["success_rate"] = 0.0

            result["message"] = f"Executed {result['total']} tests. Success rate: {result['success_rate']}%"
            print(f"[Testing] Parsed test metrics: total={result['total']}, passed={result['passed']}, failed={result['failed']}, skipped={result['skipped']}, success_rate={result['success_rate']}%")

            # 5. Locate and parse JaCoCo reports
            jacoco_xml = jacoco._find_jacoco_xml(project_path, build_tool)
            print(f"[Testing] JaCoCo reports found: {jacoco_xml}")
            if jacoco_xml and os.path.exists(jacoco_xml):
                from services.testing.coverage_parser import CoverageParser
                parser = CoverageParser()
                coverage_result = parser.parse_jacoco_xml(jacoco_xml)
                result["coverage_line"] = coverage_result.get("line", 0.0)
                result["coverage_branch"] = coverage_result.get("branch", 0.0)
                result["coverage_method"] = coverage_result.get("method", 0.0)
                result["coverage_class"] = coverage_result.get("class_", 0.0)
                result["coverage_instruction"] = coverage_result.get("instruction", 0.0)
                result["coverage_complexity"] = coverage_result.get("complexity", 0.0)
                result["jacoco_xml_file"] = jacoco_xml
                print(f"[Testing] Parsed coverage metrics: {coverage_result}")
                if log_cb:
                    log_cb(f"[Testing] JaCoCo XML: FOUND - {jacoco_xml}")
            else:
                msg = f"JaCoCo XML report not found at expected paths. Build process returned exit code: {process.returncode}"
                print(f"[Testing] {msg}")
                if log_cb:
                    log_cb(f"[Testing] ERROR: {msg}")
                    log_cb(f"[Testing] Full build stdout:\n{stdout}")
                    log_cb(f"[Testing] Full build stderr:\n{stderr}")
                # Coverage generation is a separate verified phase. Preserve any
                # real Surefire metrics even when JaCoCo is not available yet.

        except Exception as e:
            result["message"] = f"Failed to execute tests: {e}"
            print(f"[Testing] Error in TestExecutionService: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if patched_file and original_content:
                try:
                    print(f"Restoring original content to {patched_file}")
                    with open(patched_file, "w", encoding="utf-8") as f:
                        f.write(original_content)
                except Exception as restore_err:
                    print(f"Error restoring build file: {restore_err}")

        return result

    # ------------------------------------------------------------------
    # Repair loop: classify → fix → recompile → retry
    # ------------------------------------------------------------------

    async def _repair_and_retry(
        self,
        project_path: str,
        build_tool: str,
        full_cmd_str: str,
        stdout: str,
        stderr: str,
        log_cb: Optional[Callable[[str], None]] = None,
    ) -> Tuple[int, str, str]:
        """Classify compiler errors, repair them, recompile, and retry up to MAX_TEST_REPAIR_RETRIES times."""
        from services.testing.gemini_client import GeminiClient
        from services.testing.compilation_repair import CompilationRepairService

        def log(msg: str):
            print(msg)
            if log_cb:
                log_cb(msg)

        gemini = GeminiClient()
        repair_svc = CompilationRepairService()
        java_version = self._detect_java_version()

        for repair_attempt in range(1, MAX_TEST_REPAIR_RETRIES + 1):
            combined_output = stdout + "\n" + stderr
            errors = self._parse_compiler_errors_detail(combined_output)

            if not errors:
                log("[Testing] No compiler errors detected in output; retrying full build...")
                exit_code, stdout, stderr = await self._run_shell_cmd(full_cmd_str, project_path)
                if exit_code == 0:
                    return exit_code, stdout, stderr
                errors = self._parse_compiler_errors_detail(stdout + "\n" + stderr)
                if not errors:
                    break

            # Classify errors: test files vs production files
            test_errors: Dict[str, List] = {}
            prod_errors: Dict[str, List] = {}
            for err in errors:
                resolved = repair_svc._resolve_file_path(project_path, err["file_path"])
                if not resolved:
                    continue
                if self._is_test_file(resolved):
                    test_errors.setdefault(resolved, []).append(err)
                else:
                    prod_errors.setdefault(resolved, []).append(err)

            # Repair test files with Gemini
            for file_path, file_errors in test_errors.items():
                file_name = os.path.basename(file_path)
                errors_text = "\n".join(
                    f"  Line {e['line_number']}: {e['message']}" for e in file_errors
                )
                log(
                    f"[Testing] Repair attempt {repair_attempt}/{MAX_TEST_REPAIR_RETRIES} "
                    f"- Failing file: {file_name}\n{errors_text}"
                )
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
                        test_source = fh.read()
                except Exception as read_err:
                    log(f"[Testing] Could not read {file_name}: {read_err}")
                    continue
                production_source = self._find_production_source(project_path, file_name)
                fixed = await gemini.fix_compilation_errors(
                    generated_test=test_source,
                    compiler_errors=errors_text,
                    production_source=production_source,
                )
                if fixed and "class " in fixed:
                    try:
                        with open(file_path, "w", encoding="utf-8") as fh:
                            fh.write(fixed)
                        log(f"[Testing] Gemini repair applied to {file_name} - SUCCESS")
                    except Exception as write_err:
                        log(f"[Testing] Could not write repaired {file_name}: {write_err}")
                else:
                    log(
                        f"[Testing] Gemini repair attempt {repair_attempt}/{MAX_TEST_REPAIR_RETRIES} "
                        f"for {file_name} returned no usable code."
                    )

            # Repair production files with Gemini
            for file_path, file_errors in prod_errors.items():
                file_name = os.path.basename(file_path)
                errors_str = "\n".join(
                    f"  Line {e['line_number']}: {e['message']}" for e in file_errors
                )
                log(f"[Testing] Production file failing: {file_name}\n{errors_str}")
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
                        src = fh.read()
                    repaired = await GeminiClient().fix_source_compilation_errors(
                        source_code=src, compiler_errors=errors_str, java_version=java_version
                    )
                    if repaired and "class " in repaired:
                        with open(file_path, "w", encoding="utf-8") as fh:
                            fh.write(repaired)
                        log(f"[Testing] Production file {file_name} repaired.")
                except Exception as prod_err:
                    log(f"[Testing] Error repairing production file {file_name}: {prod_err}")

            # Recompile to verify fixes
            log(f"[Testing] Recompiling (attempt {repair_attempt}/{MAX_TEST_REPAIR_RETRIES})...")
            compile_cmd = self._build_test_compile_command(project_path, build_tool)
            if compile_cmd:
                c_code, c_out, c_err = await self._run_shell_cmd(compile_cmd, project_path)
                if c_code == 0:
                    log("[Testing] Recompile - SUCCESS. Running full test suite...")
                    exit_code, stdout, stderr = await self._run_shell_cmd(full_cmd_str, project_path)
                    if exit_code == 0:
                        return exit_code, stdout, stderr
                    log(f"[Testing] Full test run still failed (exit {exit_code}). Continuing repairs...")
                else:
                    log(f"[Testing] Recompile - FAILURE (exit {c_code}). Errors remain.")
                    stdout = c_out
                    stderr = c_err
            else:
                exit_code, stdout, stderr = await self._run_shell_cmd(full_cmd_str, project_path)
                if exit_code == 0:
                    return exit_code, stdout, stderr

        # All repair attempts exhausted - run one final time to get latest output
        exit_code_final, stdout_final, stderr_final = await self._run_shell_cmd(full_cmd_str, project_path)
        return exit_code_final, stdout_final, stderr_final

    def _is_test_file(self, file_path: str) -> bool:
        n = file_path.replace("\\", "/")
        return "src/test" in n or n.endswith("Test.java") or n.endswith("Tests.java")

    def _detect_java_version(self) -> str:
        try:
            import subprocess
            out = subprocess.check_output(
                ["java", "-version"], stderr=subprocess.STDOUT
            ).decode("utf-8", errors="ignore")
            m = re.search(r'version "(\d+)', out) or re.search(r"(?:openjdk|java|version) (\d+)", out)
            if m:
                v = m.group(1)
                return v.split(".")[1] if v.startswith("1.") else v
        except Exception:
            pass
        return "21"

    def _build_test_compile_command(self, project_path: str, build_tool: str) -> str:
        is_w = sys.platform == "win32"
        if build_tool == "maven":
            exe = (
                ".\\mvnw.cmd" if is_w and os.path.exists(os.path.join(project_path, "mvnw.cmd"))
                else "./mvnw" if not is_w and os.path.exists(os.path.join(project_path, "mvnw"))
                else "mvn"
            )
            return f"{exe} clean test-compile"
        elif build_tool == "gradle":
            exe = (
                ".\\gradlew.bat" if is_w and os.path.exists(os.path.join(project_path, "gradlew.bat"))
                else "./gradlew" if not is_w and os.path.exists(os.path.join(project_path, "gradlew"))
                else "gradle"
            )
            return f"{exe} clean testClasses"
        return ""

    async def _run_shell_cmd(self, cmd_str: str, cwd: str) -> Tuple[int, str, str]:
        process = await asyncio.create_subprocess_shell(
            cmd_str, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=cwd
        )
        stdout_b, stderr_b = await process.communicate()
        return (
            process.returncode,
            stdout_b.decode("utf-8", errors="ignore"),
            stderr_b.decode("utf-8", errors="ignore"),
        )

    def _parse_compiler_errors_detail(self, output: str) -> List[Dict[str, Any]]:
        """Parse Maven/Gradle compiler error lines and return structured error list."""
        errors = []
        patterns = [
            re.compile(r"\[ERROR\]\s+(.*?\.java):\[?(\d+)(?:,\d+)?\]?\s+(.*)", re.IGNORECASE),
            re.compile(r"(.*?\.java):(\d+):\s+error:\s+(.*)", re.IGNORECASE),
            re.compile(r"(.*?\.java):(\d+):\s+(.*)", re.IGNORECASE),
        ]
        seen: set = set()
        for line in output.splitlines():
            line = line.strip()
            for pat in patterns:
                m = pat.match(line)
                if m:
                    fp = m.group(1).strip()
                    if fp.startswith("/") and len(fp) > 3 and fp[2] == ":":
                        fp = fp[1:]
                    ln = int(m.group(2))
                    msg = m.group(3).strip()
                    key = (fp, ln, msg)
                    if key not in seen:
                        seen.add(key)
                        errors.append({
                            "file_path": fp,
                            "file_name": os.path.basename(fp),
                            "line_number": ln,
                            "message": msg,
                        })
                    break
        return errors

    def _find_production_source(self, project_path: str, test_file_name: str) -> Optional[str]:
        """Find the matching production source file for a test file."""
        prod_name = test_file_name.replace("Test.java", ".java").replace("Tests.java", ".java")
        for root_dir, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "target", "build")]
            if "src/test" in root_dir.replace("\\", "/"):
                continue
            if prod_name in files:
                try:
                    with open(os.path.join(root_dir, prod_name), "r", encoding="utf-8", errors="ignore") as fh:
                        return fh.read()
                except Exception:
                    return None
        return None

    def _parse_compiler_errors(self, output: str) -> List[Dict[str, Any]]:
        """Alias kept for backward compat — delegates to _parse_compiler_errors_detail."""
        return self._parse_compiler_errors_detail(output)

    def _patch_java_version_if_needed(self, project_path: str) -> tuple:
        """
        Temporarily downgrades the Java version in build files to match the system JDK
        to ensure tests compile and execute on systems with older JDK installations.
        """
        try:
            import subprocess
            import re
            
            # Detect system Java version
            sys_version = 21  # default fallback
            try:
                output = subprocess.check_output(["java", "-version"], stderr=subprocess.STDOUT).decode("utf-8", errors="ignore")
                m = re.search(r'version "(\d+)', output) or re.search(r'(?:openjdk|java|version) (\d+)', output)
                if m:
                    ver = m.group(1)
                    if ver.startswith("1."):
                        sys_version = int(ver.split(".")[1])
                    else:
                        sys_version = int(ver)
            except Exception as e:
                print(f"Failed to detect system Java version: {e}")

            # Check pom.xml
            pom_path = os.path.join(project_path, "pom.xml")
            if os.path.exists(pom_path):
                with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                original_content = content
                modified = False
                
                patterns = [
                    (r"<java\.version>(\d+)</java\.version>", r"<java.version>{sys_ver}</java.version>"),
                    (r"<maven\.compiler\.source>(\d+)</maven\.compiler\.source>", r"<maven.compiler.source>{sys_ver}</maven.compiler.source>"),
                    (r"<maven\.compiler\.target>(\d+)</maven\.compiler\.target>", r"<maven.compiler.target>{sys_ver}</maven.compiler.target>"),
                    (r"<release>(\d+)</release>", r"<release>{sys_ver}</release>"),
                ]
                
                for pat, repl in patterns:
                    m = re.search(pat, content)
                    if m:
                        proj_ver = int(m.group(1))
                        if proj_ver > sys_version:
                            content = re.sub(pat, repl.format(sys_ver=sys_version), content)
                            modified = True
                
                if modified:
                    print(f"Temporarily patching pom.xml Java version to {sys_version} (was configured to higher version)")
                    with open(pom_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    return pom_path, original_content

            # Check build.gradle
            gradle_path = os.path.join(project_path, "build.gradle")
            if os.path.exists(gradle_path):
                with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                original_content = content
                modified = False
                
                patterns = [
                    (r"sourceCompatibility\s*=\s*['\"]?(\d+)['\"]?", "sourceCompatibility = {sys_ver}"),
                    (r"targetCompatibility\s*=\s*['\"]?(\d+)['\"]?", "targetCompatibility = {sys_ver}"),
                    (r"JavaLanguageVersion\.of\((\d+)\)", "JavaLanguageVersion.of({sys_ver})"),
                ]
                
                for pat, repl in patterns:
                    m = re.search(pat, content)
                    if m:
                        proj_ver = int(m.group(1))
                        if proj_ver > sys_version:
                            content = re.sub(pat, repl.format(sys_ver=sys_version), content)
                            modified = True
                            
                if modified:
                    print(f"Temporarily patching build.gradle Java version to {sys_version} (was configured to higher version)")
                    with open(gradle_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    return gradle_path, original_content

        except Exception as e:
            print(f"Error checking/patching Java version: {e}")
            
        return None, None

    def _find_test_report_files(self, project_path: str) -> List[str]:
        """Locate real Surefire/Failsafe/Gradle XML reports."""
        reports = []
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "src")]
            normalized = root.replace("\\", "/")
            if any(part in normalized for part in ("surefire-reports", "failsafe-reports", "test-results/test")):
                reports.extend(os.path.join(root, name) for name in files if name.endswith(".xml"))
        return reports
    def _parse_xml_test_reports(self, project_path: str, build_tool: str) -> Dict[str, Any]:
        """Finds and parses JUnit XML test reports in target or build folders recursively"""
        counts = {"total": 0, "passed": 0, "failed": 0, "skipped": 0, "duration_seconds": 0.0}
        
        found_files = []
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "src")]
            normalized_path = root.replace("\\", "/")
            if "surefire-reports" in normalized_path or "failsafe-reports" in normalized_path or "test-results/test" in normalized_path:
                for file in files:
                    if file.endswith(".xml"):
                        found_files.append(os.path.join(root, file))

        total_tests = 0
        failures = 0
        errors = 0
        skipped = 0
        total_time = 0.0

        def safe_float(val) -> float:
            try:
                return float(val) if val else 0.0
            except (ValueError, TypeError):
                return 0.0

        for file_path in found_files:
            try:
                tree = ET.parse(file_path)
                root = tree.getroot()
                if root.tag == "testsuite":
                    total_tests += int(root.get("tests", 0))
                    failures += int(root.get("failures", 0))
                    errors += int(root.get("errors", 0))
                    skipped += int(root.get("skipped", 0))
                    total_time += safe_float(root.get("time"))
                elif root.tag == "testsuites":
                    suite_time = safe_float(root.get("time"))
                    has_suite_time = suite_time > 0.0
                    sub_time = 0.0
                    for suite in root.findall("testsuite"):
                        total_tests += int(suite.get("tests", 0))
                        failures += int(suite.get("failures", 0))
                        errors += int(suite.get("errors", 0))
                        skipped += int(suite.get("skipped", 0))
                        sub_time += safe_float(suite.get("time"))
                    total_time += suite_time if has_suite_time else sub_time
            except Exception as e:
                print(f"Error parsing XML report {file_path}: {e}")

        counts["total"] = total_tests
        counts["failed"] = failures + errors
        counts["skipped"] = skipped
        counts["passed"] = max(0, total_tests - (failures + errors + skipped))
        counts["duration_seconds"] = round(total_time, 2)

        return counts

    def _parse_console_output(self, output: str, build_tool: str, result: Dict[str, Any]) -> None:
        """Parses console stdout/stderr using regex as a fallback"""
        if build_tool == "maven":
            # Parse Maven test summary: "Tests run: 5, Failures: 0, Errors: 0, Skipped: 0"
            maven_summary = re.findall(r"Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)", output)
            if maven_summary:
                # Sum them up since Maven runs per class
                total_run = 0
                total_failed = 0
                total_skipped = 0
                for item in maven_summary:
                    run, failures, errors, skipped = map(int, item)
                    total_run += run
                    total_failed += (failures + errors)
                    total_skipped += skipped
                
                result["total"] = total_run
                result["failed"] = total_failed
                result["skipped"] = total_skipped
                result["passed"] = max(0, total_run - (total_failed + total_skipped))
            elif "BUILD SUCCESS" in output:
                # Compile was successful but no tests ran
                result["total"] = 0
                result["passed"] = 0
                result["failed"] = 0
                result["skipped"] = 0
        
        elif build_tool == "gradle":
            # Parse Gradle test summary: "\d+ tests completed, \d+ failed"
            gradle_summary = re.findall(r"(\d+) tests completed, (\d+) failed", output)
            if gradle_summary:
                # Get the last completed/failed counts (usually the summary)
                last = gradle_summary[-1]
                tests_run, failed = map(int, last)
                
                # Check for skipped
                skipped_match = re.search(r"(\d+) skipped", output)
                skipped = int(skipped_match.group(1)) if skipped_match else 0
                
                result["total"] = tests_run
                result["failed"] = failed
                result["skipped"] = skipped
                result["passed"] = max(0, tests_run - (failed + skipped))

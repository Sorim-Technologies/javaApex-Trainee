import os
import re
import sys
import glob
import asyncio
import xml.etree.ElementTree as ET
from typing import Dict, Any

class TestExecutionService:
    async def execute_tests(self, project_path: str, build_tool: str) -> Dict[str, Any]:
        """
        Runs the test suite (mvn clean test / gradle test) and returns total, passed, 
        failed, skipped, and duration.
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
            "message": "Tests execution completed."
        }

        patched_file, original_content = self._patch_java_version_if_needed(project_path)
        try:
            is_windows = sys.platform == "win32"
            cmd = []

            # 1. Determine executable and arguments
            if build_tool == "maven":
                mvnw_cmd_path = os.path.join(project_path, "mvnw.cmd")
                mvnw_sh_path = os.path.join(project_path, "mvnw")
                if is_windows and os.path.exists(mvnw_cmd_path):
                    cmd = [".\\mvnw.cmd", "clean", "test", "jacoco:report", "-Dmaven.test.failure.ignore=true"]
                elif not is_windows and os.path.exists(mvnw_sh_path):
                    cmd = ["./mvnw", "clean", "test", "jacoco:report", "-Dmaven.test.failure.ignore=true"]
                else:
                    cmd = ["mvn", "clean", "test", "jacoco:report", "-Dmaven.test.failure.ignore=true"]
            
            elif build_tool == "gradle":
                gradlew_bat_path = os.path.join(project_path, "gradlew.bat")
                gradlew_sh_path = os.path.join(project_path, "gradlew")
                if is_windows and os.path.exists(gradlew_bat_path):
                    cmd = [".\\gradlew.bat", "clean", "test", "jacocoTestReport", "-Dtest.ignoreFailures=true"]
                elif not is_windows and os.path.exists(gradlew_sh_path):
                    cmd = ["./gradlew", "clean", "test", "jacocoTestReport", "-Dtest.ignoreFailures=true"]
                else:
                    cmd = ["gradle", "clean", "test", "jacocoTestReport", "-Dtest.ignoreFailures=true"]
            
            else:
                result["message"] = "No supported build tool detected. Skipping execution."
                return result

            # Construct command string
            cmd_str = " ".join(cmd)
            print(f"Running test command: {cmd_str} in {project_path}")
            
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

            # 2. Parse XML test reports (highly accurate primary method)
            xml_counts = self._parse_xml_test_reports(project_path, build_tool)
            if xml_counts and xml_counts["total"] > 0:
                result["total"] = xml_counts["total"]
                result["passed"] = xml_counts["passed"]
                result["failed"] = xml_counts["failed"]
                result["skipped"] = xml_counts["skipped"]
                print(f"Parsed test counts from XML reports: {xml_counts}")
            
            # 3. Fallback to parsing Console output if XML reports are empty or missing
            else:
                print("No XML test reports found/parsed. Falling back to console output regex...")
                print(f"DEBUG: Test output:\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}")
                self._parse_console_output(stdout + "\n" + stderr, build_tool, result)

            # 4. Calculate success rate
            if result["total"] > 0:
                result["success_rate"] = round((result["passed"] / result["total"]) * 100, 2)
            else:
                result["success_rate"] = 0.0

            result["message"] = f"Executed {result['total']} tests. Success rate: {result['success_rate']}%"

        except Exception as e:
            result["message"] = f"Failed to execute tests: {e}"
            print(f"Error in TestExecutionService: {e}")
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

    def _parse_xml_test_reports(self, project_path: str, build_tool: str) -> Dict[str, int]:
        """Finds and parses JUnit XML test reports in target or build folders recursively"""
        counts = {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
        
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

        for file_path in found_files:
            try:
                tree = ET.parse(file_path)
                root = tree.getroot()
                if root.tag == "testsuite":
                    total_tests += int(root.get("tests", 0))
                    failures += int(root.get("failures", 0))
                    errors += int(root.get("errors", 0))
                    skipped += int(root.get("skipped", 0))
                elif root.tag == "testsuites":
                    for suite in root.findall("testsuite"):
                        total_tests += int(suite.get("tests", 0))
                        failures += int(suite.get("failures", 0))
                        errors += int(suite.get("errors", 0))
                        skipped += int(suite.get("skipped", 0))
            except Exception as e:
                print(f"Error parsing XML report {file_path}: {e}")

        counts["total"] = total_tests
        counts["failed"] = failures + errors
        counts["skipped"] = skipped
        counts["passed"] = max(0, total_tests - (failures + errors + skipped))

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

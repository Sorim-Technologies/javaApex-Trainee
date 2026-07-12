import os
import sys
import glob
import asyncio
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, Tuple, Optional, Callable

class JacocoService:
    async def generate_and_parse_report(self, project_path: str, build_tool: str, log_cb: Optional[Callable[[str], None]] = None) -> Dict[str, float]:
        """
        Runs mvn jacoco:report or gradle jacocoTestReport, locates jacoco.xml, 
        and parses it to return coverage percentages.
        Automatically ensures JaCoCo plugin is configured in build files.
        """
        metrics = {
            "line": 0.0,
            "branch": 0.0,
            "method": 0.0,
            "class_": 0.0,
            "instruction": 0.0,
            "complexity": 0.0
        }

        # 1. If the repository already contains JaCoCo reports, parse those reports instead of generating new ones.
        xml_path = self._find_jacoco_xml(project_path, build_tool)
        if xml_path and os.path.exists(xml_path):
            print(f"Existing JaCoCo XML report found at: {xml_path}. Parsing directly.")
            from services.testing.coverage_parser import CoverageParser
            parser = CoverageParser()
            return parser.parse_jacoco_xml(xml_path)

        # 2. Ensure JaCoCo plugin is present in build file before running
        plugin_configured = self._ensure_jacoco_plugin(project_path, build_tool)
        if not plugin_configured:
            print(f"Warning: JaCoCo plugin could not be configured. Coverage may not be generated.")

        patched_file, original_content = self._patch_java_version_if_needed(project_path)
        try:
            is_windows = sys.platform == "win32"
            cmd = []

            # 3. Determine command - use mvn clean test jacoco:report to ensure tests run first
            if build_tool == "maven":
                mvnw_cmd_path = os.path.join(project_path, "mvnw.cmd")
                mvnw_sh_path = os.path.join(project_path, "mvnw")
                if is_windows and os.path.exists(mvnw_cmd_path):
                    cmd = [".\\mvnw.cmd", "jacoco:report"]
                elif not is_windows and os.path.exists(mvnw_sh_path):
                    cmd = ["./mvnw", "jacoco:report"]
                else:
                    cmd = ["mvn", "jacoco:report"]
            
            elif build_tool == "gradle":
                gradlew_bat_path = os.path.join(project_path, "gradlew.bat")
                gradlew_sh_path = os.path.join(project_path, "gradlew")
                if is_windows and os.path.exists(gradlew_bat_path):
                    cmd = [".\\gradlew.bat", "jacocoTestReport"]
                elif not is_windows and os.path.exists(gradlew_sh_path):
                    cmd = ["./gradlew", "jacocoTestReport"]
                else:
                    cmd = ["gradle", "jacocoTestReport"]
            
            else:
                print("Skipping JaCoCo run - no supported build tool.")
                return metrics

            cmd_str = " ".join(cmd)
            print(f"Running JaCoCo command: {cmd_str} in {project_path}")
            
            # Execute subprocess to generate report
            process = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300.0)
                stdout_str = stdout.decode('utf-8', errors='ignore')
                stderr_str = stderr.decode('utf-8', errors='ignore')
                
                # Log output for debugging
                print(f"JaCoCo stdout (last 500 chars): {stdout_str[-500:]}")
                if stderr_str.strip():
                    print(f"JaCoCo stderr (last 500 chars): {stderr_str[-500:]}")
            except asyncio.TimeoutError:
                process.kill()
                print("JaCoCo report generation timed out after 300 seconds.")

            combined_output_lower = (locals().get('stdout_str', '') + locals().get('stderr_str', '')).lower()
            shell_failure_markers = [
                "is not recognized as an internal or external command",
                "command not found",
                "no such file or directory",
                "'mvn' is not recognized",
                "'gradle' is not recognized",
            ]
            if process.returncode != 0 and any(m in combined_output_lower for m in shell_failure_markers):
                print(f"[JaCoCo] CRITICAL: build tool invocation failed (exit code {process.returncode}). "
                      f"'{cmd[0]}' may not be installed or not on PATH.")
                if log_cb:
                    log_cb(f"[JaCoCo] CRITICAL: build tool invocation failed (exit code {process.returncode}). '{cmd[0]}' may not be installed or not on PATH.")
                return metrics

            # 4. Locate jacoco.xml
            xml_path = self._find_jacoco_xml(project_path, build_tool)

            # 5. Parse jacoco.xml
            if xml_path and os.path.exists(xml_path):
                print(f"Found JaCoCo XML report at: {xml_path}")
                from services.testing.coverage_parser import CoverageParser
                parser = CoverageParser()
                metrics = parser.parse_jacoco_xml(xml_path)
            else:
                msg = f"Could not locate JaCoCo XML report under {project_path}. Build tool exit code: {process.returncode}"
                print(msg)
                if log_cb:
                    log_cb(f"[JaCoCo] ERROR: {msg}")
                    log_cb(f"[JaCoCo] Full build stdout:\n{locals().get('stdout_str', '')}")
                    log_cb(f"[JaCoCo] Full build stderr:\n{locals().get('stderr_str', '')}")
                if process.returncode != 0:
                    raise RuntimeError(f"JaCoCo report generation failed: Build failed with exit code {process.returncode}")

        except Exception as e:
            print(f"Error in JacocoService: {e}")
            if "Build failed with exit code" in str(e):
                raise e
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

        return metrics

    def _ensure_jacoco_plugin(self, project_path: str, build_tool: str) -> bool:
        """
        Verifies that the JaCoCo plugin is configured in the build file.
        If missing, attempts to add it. Returns True if plugin is configured.
        """
        try:
            if build_tool == "maven":
                pom_path = os.path.join(project_path, "pom.xml")
                if os.path.exists(pom_path):
                    with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    if "jacoco-maven-plugin" in content:
                        return True
                    
                    # Add JaCoCo plugin
                    print("JaCoCo plugin not found in pom.xml. Adding it...")
                    jacoco_plugin = """
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.12</version>
                <executions>
                    <execution>
                        <goals>
                            <goal>prepare-agent</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>report</id>
                        <phase>test</phase>
                        <goals>
                            <goal>report</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>"""
                    
                    # Find plugins section or create one
                    build_match = re.search(r"<build>([\s\S]*?)</build>", content)
                    if build_match:
                        inner_build = build_match.group(1)
                        plugins_match = re.search(r"<plugins>([\s\S]*?)</plugins>", inner_build)
                        if plugins_match:
                            inner_plugins = plugins_match.group(1)
                            new_inner_plugins = inner_plugins + jacoco_plugin
                            p_start = build_match.start(1) + plugins_match.start(1)
                            p_end = build_match.start(1) + plugins_match.end(1)
                            content = content[:p_start] + new_inner_plugins + content[p_end:]
                        else:
                            new_inner_build = inner_build + f"\n        <plugins>{jacoco_plugin}\n        </plugins>"
                            b_start = build_match.start(1)
                            b_end = build_match.end(1)
                            content = content[:b_start] + new_inner_build + content[b_end:]
                    else:
                        build_block = f"\n    <build>\n        <plugins>{jacoco_plugin}\n        </plugins>\n    </build>\n"
                        content = re.sub(r'</project>\s*$', f"{build_block}</project>", content)
                    
                    with open(pom_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print("Successfully added JaCoCo Maven plugin to pom.xml")
                    return True
            
            elif build_tool == "gradle":
                gradle_path = os.path.join(project_path, "build.gradle")
                gradle_kts_path = os.path.join(project_path, "build.gradle.kts")
                
                target_path = None
                if os.path.exists(gradle_path):
                    target_path = gradle_path
                elif os.path.exists(gradle_kts_path):
                    target_path = gradle_kts_path
                    
                if target_path:
                    with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    is_kts = target_path.endswith(".kts")
                    
                    if "jacoco" in content and "jacocoTestReport" in content:
                        return True
                    
                    print(f"JaCoCo plugin not found in {os.path.basename(target_path)}. Adding it...")
                    
                    # Add plugins block check
                    if is_kts:
                        if 'id("jacoco")' not in content:
                            if "plugins {" in content:
                                content = content.replace("plugins {", 'plugins {\n    id("jacoco")', 1)
                            else:
                                content = 'apply(plugin = "jacoco")\n' + content
                    else:
                        if "id 'jacoco'" not in content and 'id("jacoco")' not in content:
                            if "plugins {" in content:
                                content = content.replace("plugins {", "plugins {\n    id 'jacoco'", 1)
                            else:
                                content = "apply plugin: 'jacoco'\n" + content
                                
                    # Add jacocoTestReport task configuration
                    if "jacocoTestReport" not in content:
                        if is_kts:
                            content += """
tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        csv.required.set(true)
        html.required.set(true)
    }
}
"""
                        else:
                            content += """
jacocoTestReport {
    dependsOn test
    reports {
        xml.required = true
        csv.required = true
        html.required = true
    }
}
"""
                    # Ensure useJUnitPlatform is present
                    if "useJUnitPlatform" not in content:
                        if is_kts:
                            if "tasks.test {" in content:
                                content = content.replace("tasks.test {", "tasks.test {\n    useJUnitPlatform()")
                            else:
                                content += """
tasks.test {
    useJUnitPlatform()
}
"""
                        else:
                            if "test {" in content:
                                content = content.replace("test {", "test {\n    useJUnitPlatform()")
                            else:
                                content += """
test {
    useJUnitPlatform()
}
"""
                    with open(target_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"Successfully added JaCoCo Gradle configuration to {os.path.basename(target_path)}")
                    return True
                    
        except Exception as e:
            print(f"Error ensuring JaCoCo plugin: {e}")
        
        return False

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

    def _find_jacoco_xml(self, project_path: str, build_tool: str) -> str:
        """Finds the path to the jacoco.xml file"""
        # First check standard locations for quick find
        std_paths = []
        if build_tool == "maven":
            std_paths.append(os.path.join(project_path, "target", "site", "jacoco", "jacoco.xml"))
        elif build_tool == "gradle":
            std_paths.append(os.path.join(project_path, "build", "reports", "jacoco", "test", "jacoco.xml"))
            std_paths.append(os.path.join(project_path, "build", "reports", "jacoco", "jacocoTestReport", "jacocoTestReport.xml"))
            
        for path in std_paths:
            if os.path.exists(path):
                return path
                
        # Walk recursively to find any jacoco.xml or jacocoTestReport.xml
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "src")]
            for file in files:
                if file.lower() in ("jacoco.xml", "jacocotestreport.xml"):
                    return os.path.join(root, file)
                    
        return None

    def _log_build_debug_info(self, project_path: str):
        """Log debug information about the build structure when JaCoCo report is not found."""
        print("DEBUG: Searching for build output files...")
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
            # Check for target directory
            if "target" in root.split(os.sep) or "build" in root.split(os.sep):
                xml_files = [f for f in files if f.endswith(".xml")]
                if xml_files:
                    print(f"  Found XML files in {root}: {xml_files[:5]}")

    def _parse_xml(self, xml_path: str) -> Dict[str, float]:
        """Parses JaCoCo counters from XML"""
        metrics = {
            "line": 0.0,
            "branch": 0.0,
            "method": 0.0,
            "class_": 0.0,
            "instruction": 0.0,
            "complexity": 0.0
        }

        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            for counter in root.findall("counter"):
                c_type = counter.get("type")
                missed = int(counter.get("missed", 0))
                covered = int(counter.get("covered", 0))
                total = missed + covered
                
                pct = round((covered / total * 100), 2) if total > 0 else 100.0

                if c_type == "LINE":
                    metrics["line"] = pct
                elif c_type == "BRANCH":
                    metrics["branch"] = pct
                elif c_type == "METHOD":
                    metrics["method"] = pct
                elif c_type == "CLASS":
                    metrics["class_"] = pct
                elif c_type == "INSTRUCTION":
                    metrics["instruction"] = pct
                elif c_type == "COMPLEXITY":
                    metrics["complexity"] = pct

        except Exception as e:
            print(f"Error parsing JaCoCo XML report: {e}")

        return metrics
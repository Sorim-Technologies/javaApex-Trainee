import os
import re
import sys
import asyncio
import time
from typing import Dict, Any, List, Tuple, Callable, Optional
from services.testing.gemini_client import GeminiClient

class CompilationRepairService:
    def __init__(self, client: Optional[GeminiClient] = None, max_retries: int = 5):
        self.client = client or GeminiClient()
        self.max_retries = max(1, int(os.getenv("COMPILATION_REPAIR_MAX_RETRIES", str(max_retries))))
        self.file_repair_timeout = float(os.getenv("COMPILATION_REPAIR_FILE_TIMEOUT_SECONDS", "120"))

    def fix_misplaced_semicolons(self, project_path: str, log_cb: Callable[[str], None]):
        """Find and fix misplaced semicolons after comments (e.g. printStackTrace() // comment;)"""
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "target", "build")]
            for file in files:
                if file.endswith(".java"):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        
                        pattern = r'^([^\n\r]*?)\s*//\s*(TODO:\s*Consider\s*using\s*proper\s*logging[^\n\r]*?);\s*$'
                        new_content, count = re.subn(pattern, r'\1; // \2', content, flags=re.MULTILINE)
                        if count > 0:
                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(new_content)
                            log_cb(f"Fixed {count} misplaced semicolon(s) in {os.path.basename(file_path)}")
                    except Exception as e:
                        log_cb(f"Error fixing misplaced semicolons in {file}: {e}")

    def fix_factory_new_instance(self, project_path: str, log_cb: Callable[[str], None]):
        """Find and fix incorrect getDeclaredConstructor().newInstance() replacements on static Factory methods"""
        factories = [
            "SOAPConnectionFactory",
            "MessageFactory",
            "DocumentBuilderFactory",
            "DocumentBuilder",
            "SAXParserFactory",
            "XMLInputFactory",
            "XMLOutputFactory",
            "TransformerFactory"
        ]
        factory_pattern = "|".join(factories)
        
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "target", "build")]
            for file in files:
                if file.endswith(".java"):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        
                        pattern = rf"\b({factory_pattern})\.getDeclaredConstructor\(\)\.newInstance\(\)"
                        new_content, count = re.subn(pattern, r"\1.newInstance()", content)
                        if count > 0:
                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(new_content)
                            log_cb(f"Fixed {count} factory newInstance calls in {os.path.basename(file_path)}")
                    except Exception as e:
                        log_cb(f"Error fixing factory newInstance in {file}: {e}")

    async def check_and_repair_compilation(
        self,
        project_path: str,
        build_tool: str,
        java_version: str,
        log_cb: Callable[[str], None]
    ) -> Tuple[bool, List[Dict[str, Any]], List[str]]:
        """
        Executes compilation, parses any errors, and repairs the broken source files.
        """
        # Fix any misplaced semicolons in the source files before compilation checks
        self.fix_misplaced_semicolons(project_path, log_cb)
        
        # Fix incorrect factory newInstance calls
        self.fix_factory_new_instance(project_path, log_cb)

        log_cb(f"Starting compilation validation (Build Tool: {build_tool}, Target Java: {java_version})...")
        
        last_errors = []
        failed_files = []
        for attempt in range(1, self.max_retries + 1):
            log_cb(f"Compilation attempt {attempt}/{self.max_retries}...")
            compiles, compiler_errors = await self._run_compilation(project_path, build_tool, log_cb)
            
            if compiles:
                log_cb("Compilation succeeded!")
                return True, [], []
                
            if not compiler_errors:
                log_cb("No compiler errors detected in source files. Proceeding to testing pipeline.")
                return True, [], []
                
            log_cb(f"Compilation failed with {len(compiler_errors)} unique compiler error(s).")
            last_errors = compiler_errors
            
            # Group errors by target file
            errors_by_file = {}
            for err in compiler_errors:
                file_path = err["file_path"]
                resolved = self._resolve_file_path(project_path, file_path)
                if resolved:
                    errors_by_file.setdefault(resolved, []).append(err)
                else:
                    log_cb(f"Warning: Could not resolve file path: {file_path}")

            if not errors_by_file:
                log_cb("No resolvable source files found with compiler errors. Stopping repair.")
                break
                
            failed_files = list(errors_by_file.keys())
            
            # Perform repairs on each broken file
            for file_path, file_errors in errors_by_file.items():
                file_name = os.path.basename(file_path)
                log_cb(f"Attempting to repair {file_name}...")
                
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        source_code = f.read()
                except Exception as e:
                    log_cb(f"Error reading file {file_name}: {e}")
                    continue
                
                # Format compiler errors for Gemini prompt
                errors_str = "\n".join([
                    f"- Line {err['line_number']}: {err['message']}" 
                    for err in file_errors
                ])
                
                # Request repaired code from Gemini with a hard per-file deadline.
                started = time.monotonic()
                failure_reason = "no usable repair returned"
                try:
                    repaired_code = await asyncio.wait_for(
                        self.client.fix_source_compilation_errors(
                            source_code=source_code,
                            compiler_errors=errors_str,
                            java_version=java_version
                        ),
                        timeout=self.file_repair_timeout,
                    )
                except asyncio.TimeoutError:
                    repaired_code = None
                    failure_reason = f"Gemini timed out after {self.file_repair_timeout:.1f}s"
                except Exception as repair_error:
                    repaired_code = None
                    failure_reason = f"Gemini request failed: {repair_error}"
                elapsed = time.monotonic() - started
                
                if repaired_code:
                    if "class " in repaired_code:
                        try:
                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(repaired_code)
                            log_cb(f"Repair attempt {attempt}/{self.max_retries} for {file_name}: SUCCESS in {elapsed:.2f}s")
                        except Exception as e:
                            log_cb(f"Error writing repaired content to {file_name}: {e}")
                    else:
                        log_cb(f"Repair attempt {attempt}/{self.max_retries} for {file_name}: FAILED in {elapsed:.2f}s - invalid Java returned")
                else:
                    log_cb(f"Repair attempt {attempt}/{self.max_retries} for {file_name}: FAILED in {elapsed:.2f}s - {failure_reason}; marking file unrepaired for this attempt")
            
            # No stage-level sleep: the next bounded attempt starts immediately.`r`n
        return False, last_errors, failed_files

    async def build_compilable_subset(
        self,
        project_path: str,
        build_tool: str,
        failed_files: List[str],
        log_cb: Callable[[str], None],
    ) -> Tuple[bool, List[str]]:
        """Quarantine bounded failing sources and retain the largest buildable subset."""
        pending = [os.path.abspath(path) for path in failed_files if os.path.exists(path)]
        quarantined: List[str] = []
        max_rounds = max(1, sum(1 for root, _, files in os.walk(project_path) for name in files if name.endswith(".java")))

        for round_number in range(1, max_rounds + 1):
            for source_path in pending:
                if source_path in quarantined or not os.path.exists(source_path):
                    continue
                disabled_path = source_path + ".unrepaired"
                try:
                    if os.path.exists(disabled_path):
                        os.remove(disabled_path)
                    os.replace(source_path, disabled_path)
                    quarantined.append(source_path)
                    log_cb(f"[Compilation] Quarantined unrepaired source {os.path.basename(source_path)}; evaluating remaining classes")
                except OSError as error:
                    log_cb(f"[Compilation] Could not quarantine {source_path}: {error}")

            compiles, errors = await self._run_compilation(project_path, build_tool, log_cb)
            if compiles:
                log_cb(f"[Compilation] Compilable subset ready after {round_number} round(s); skipped {len(quarantined)} source file(s)")
                return True, quarantined
            if not errors:
                log_cb("[Compilation] Remaining project failed without source diagnostics; tests cannot run")
                return False, quarantined

            pending = []
            for error in errors:
                resolved = self._resolve_file_path(project_path, error.get("file_path", ""))
                if resolved and "src{}main".format(os.sep) in resolved and resolved not in quarantined:
                    pending.append(os.path.abspath(resolved))
            pending = list(dict.fromkeys(pending))
            if not pending:
                log_cb("[Compilation] No additional failing production source could be isolated")
                return False, quarantined

        log_cb(f"[Compilation] Subset isolation stopped at bounded limit {max_rounds}")
        return False, quarantined
    def _patch_java_version_if_needed(self, project_path: str) -> tuple:
        """
        Temporarily downgrades the Java version in build files to match the system JDK
        to ensure compile check runs on systems with older JDK installations.
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

    async def _run_compilation(
        self,
        project_path: str,
        build_tool: str,
        log_cb: Callable[[str], None]
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """Runs compile command and parses compilation output for errors."""
        is_windows = sys.platform == "win32"
        cmd = []

        if build_tool == "maven":
            mvnw_cmd_path = os.path.join(project_path, "mvnw.cmd")
            mvnw_sh_path = os.path.join(project_path, "mvnw")
            if is_windows and os.path.exists(mvnw_cmd_path):
                cmd = [".\\mvnw.cmd", "clean", "compile"]
            elif not is_windows and os.path.exists(mvnw_sh_path):
                cmd = ["./mvnw", "clean", "compile"]
            else:
                cmd = ["mvn", "clean", "compile"]
        elif build_tool == "gradle":
            gradlew_bat_path = os.path.join(project_path, "gradlew.bat")
            gradlew_sh_path = os.path.join(project_path, "gradlew")
            if is_windows and os.path.exists(gradlew_bat_path):
                cmd = [".\\gradlew.bat", "clean", "compileJava"]
            elif not is_windows and os.path.exists(gradlew_sh_path):
                cmd = ["./gradlew", "clean", "compileJava"]
            else:
                cmd = ["gradle", "clean", "compileJava"]
        else:
            log_cb("No supported build tool detected for compilation check.")
            return True, []

        cmd_str = " ".join(cmd)
        print(f"Running compilation command: {cmd_str}")
        
        patched_file, original_content = self._patch_java_version_if_needed(project_path)
        try:
            process = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path
            )
            stdout_bytes, stderr_bytes = await process.communicate()
            stdout = stdout_bytes.decode("utf-8", errors="ignore")
            stderr = stderr_bytes.decode("utf-8", errors="ignore")
            
            if process.returncode == 0:
                return True, []
                
            full_output = stdout + "\n" + stderr
            errors = self._parse_compiler_errors(full_output)
            return False, errors
            
        except Exception as e:
            log_cb(f"Execution error during compilation check: {e}")
            return False, [{"file_path": "N/A", "file_name": "build-tool", "line_number": 0,
                             "message": f"Build tool could not be executed: {e}"}]
        finally:
            if patched_file and original_content:
                try:
                    with open(patched_file, "w", encoding="utf-8") as f:
                        f.write(original_content)
                except Exception as restore_err:
                    print(f"Error restoring build file during compile check: {restore_err}")

    def _parse_compiler_errors(self, output: str) -> List[Dict[str, Any]]:
        """Parses output string for Java compiler errors."""
        errors = []
        patterns = [
            # Maven error pattern
            re.compile(r"\[ERROR\]\s+(.*?\.java):\[?(\d+)(?:,\d+)?\]?\s+(.*)", re.IGNORECASE),
            # Gradle error pattern
            re.compile(r"(.*?\.java):(\d+):\s+error:\s+(.*)", re.IGNORECASE),
            # Generic error pattern
            re.compile(r"(.*?\.java):(\d+):\s+(.*)", re.IGNORECASE)
        ]
        
        seen = set()
        for line in output.splitlines():
            line = line.strip()
            for pattern in patterns:
                match = pattern.match(line)
                if match:
                    file_path = match.group(1).strip()
                    if file_path.startswith("/") and len(file_path) > 3 and file_path[2] == ":":
                        file_path = file_path[1:]
                        
                    line_no = int(match.group(2))
                    message = match.group(3).strip()
                    
                    key = (file_path, line_no, message)
                    if key not in seen:
                        seen.add(key)
                        errors.append({
                            "file_path": file_path,
                            "file_name": os.path.basename(file_path),
                            "line_number": line_no,
                            "message": message
                        })
                    break
        return errors

    def _resolve_file_path(self, project_path: str, file_path: str) -> Optional[str]:
        """Resolves file path relative to project workspace."""
        if os.path.exists(file_path):
            return file_path
            
        joined = os.path.join(project_path, file_path)
        if os.path.exists(joined):
            return joined
            
        base_name = os.path.basename(file_path)
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "target", "build")]
            if base_name in files:
                return os.path.join(root, base_name)
                
        return None

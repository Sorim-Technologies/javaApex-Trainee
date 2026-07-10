import os
import re
import sys
import asyncio
from typing import Dict, Any, List, Tuple, Callable, Optional
from services.testing.gemini_client import GeminiClient

class CompilationRepairService:
    def __init__(self, client: Optional[GeminiClient] = None, max_retries: int = 3):
        self.client = client or GeminiClient()
        self.max_retries = max_retries

    async def check_and_repair_compilation(
        self,
        project_path: str,
        build_tool: str,
        java_version: str,
        log_cb: Callable[[str], None]
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Executes compilation, parses any errors, and repairs the broken source files.
        """
        log_cb(f"Starting compilation validation (Build Tool: {build_tool}, Target Java: {java_version})...")
        
        last_errors = []
        for attempt in range(1, self.max_retries + 1):
            log_cb(f"Compilation attempt {attempt}/{self.max_retries}...")
            compiles, compiler_errors = await self._run_compilation(project_path, build_tool, log_cb)
            
            if compiles:
                log_cb("Compilation succeeded!")
                return True, []
                
            if not compiler_errors:
                log_cb("No compiler errors detected in source files. Proceeding to testing pipeline.")
                return True, []
                
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
                
                # Request repaired code from Gemini
                repaired_code = await self.client.fix_source_compilation_errors(
                    source_code=source_code,
                    compiler_errors=errors_str,
                    java_version=java_version
                )
                
                if repaired_code:
                    if "class " in repaired_code:
                        try:
                            with open(file_path, "w", encoding="utf-8") as f:
                                f.write(repaired_code)
                            log_cb(f"Successfully applied repairs to {file_name}.")
                        except Exception as e:
                            log_cb(f"Error writing repaired content to {file_name}: {e}")
                    else:
                        log_cb(f"Gemini returned invalid repair suggestions for {file_name}. Skipping write.")
                else:
                    log_cb(f"Gemini was unable to fix compiler errors for {file_name}.")
            
            # Short sleep to let the filesystem flush/stabilize
            await asyncio.sleep(1)

        return False, last_errors

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
            return False, []

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

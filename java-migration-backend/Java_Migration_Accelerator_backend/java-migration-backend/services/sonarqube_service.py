"""
SonarQube Service - Code quality analysis
"""
import asyncio
import os
import re
import shutil
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv


class MavenBuildValidationError(RuntimeError):
    def __init__(self, message: str, report: Dict[str, Any]):
        super().__init__(message)
        self.report = report


class SonarQubeService:
    def __init__(self):
        self.sonar_url = "http://localhost:9000"
        self.sonar_token = ""
        self._refresh_config()

    def _refresh_config(self) -> None:
        """Reload SonarQube settings from .env for each migration scan."""
        load_dotenv(override=True)
        self.sonar_url = (
            os.getenv("SONARQUBE_URL")
            or os.getenv("SONAR_HOST_URL")
            or "http://localhost:9000"
        ).strip().rstrip("/")
        self.sonar_token = (
            os.getenv("SONAR_TOKEN")
            or os.getenv("SONARQUBE_TOKEN")
            or os.getenv("SONAR_AUTH_TOKEN")
            or ""
        ).strip()

    def _redact(self, value: str) -> str:
        """Mask secrets before writing scanner output to application logs."""
        if not value or not self.sonar_token:
            return value
        return value.replace(self.sonar_token, "***SONAR_TOKEN***")

    def _resolve_maven_command(self, project_path: str) -> str:
        """Resolve Maven reliably on Windows and Unix-like systems."""
        wrapper_name = "mvnw.cmd" if os.name == "nt" else "mvnw"
        wrapper_path = os.path.join(project_path, wrapper_name)
        if os.path.exists(wrapper_path):
            return wrapper_path

        configured_maven = os.getenv("MAVEN_CMD") or os.getenv("MAVEN_EXECUTABLE")
        if configured_maven:
            configured_maven = configured_maven.strip().strip('"')
            if os.path.exists(configured_maven):
                return configured_maven

        maven_home = os.getenv("MAVEN_HOME") or os.getenv("M2_HOME")
        if maven_home:
            candidate_name = "mvn.cmd" if os.name == "nt" else "mvn"
            candidate = os.path.join(maven_home, "bin", candidate_name)
            if os.path.exists(candidate):
                return candidate

        candidate_names = ["mvn.cmd", "mvn.bat", "mvn"] if os.name == "nt" else ["mvn"]
        for candidate_name in candidate_names:
            resolved = shutil.which(candidate_name)
            if resolved:
                return resolved

        raise RuntimeError(
            "SonarQube analysis failed: Maven executable was not found. "
            "Install Maven, add Maven bin to PATH, or set MAVEN_CMD in .env to the full path of mvn.cmd."
        )


    def _resolve_sonar_scanner_command(self) -> str:
        configured = os.getenv("SONAR_SCANNER_CMD") or os.getenv("SONAR_SCANNER_EXECUTABLE")
        if configured:
            configured = configured.strip().strip('"')
            if os.path.exists(configured):
                return configured

        candidate_names = ["sonar-scanner.bat", "sonar-scanner.cmd", "sonar-scanner"] if os.name == "nt" else ["sonar-scanner"]
        for candidate_name in candidate_names:
            resolved = shutil.which(candidate_name)
            if resolved:
                return resolved

        raise RuntimeError(
            "SonarQube analysis failed: this migrated project does not contain pom.xml, and sonar-scanner was not found. "
            "Install SonarScanner CLI, add it to PATH, or set SONAR_SCANNER_CMD in .env. Maven projects use MAVEN_CMD automatically."
        )

    async def _run_sonar_scanner(self, args: List[str], project_path: str, label: str) -> Dict[str, Any]:
        safe_args = [self._redact(arg) for arg in args]
        print(f"Running SonarScanner {label} in {project_path}: {' '.join(safe_args)}")
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=project_path,
        )
        stdout, stderr = await process.communicate()
        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        output = self._redact(
            f"===== SonarScanner {label} STDOUT =====\n"
            f"{stdout_text}\n"
            f"===== SonarScanner {label} STDERR =====\n"
            f"{stderr_text}"
        )
        print(output)
        return {
            "label": label,
            "command": safe_args,
            "returncode": process.returncode,
            "output": output,
        }

    async def _run_maven(self, args: List[str], project_path: str, label: str) -> Dict[str, Any]:
        safe_args = [self._redact(arg) for arg in args]
        print(f"Running Maven {label} in {project_path}: {' '.join(safe_args)}")

        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=project_path,
        )
        stdout, stderr = await process.communicate()
        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        output = self._redact(
            f"===== Maven {label} STDOUT =====\n"
            f"{stdout_text}\n"
            f"===== Maven {label} STDERR =====\n"
            f"{stderr_text}"
        )
        print(output)
        return {
            "label": label,
            "command": safe_args,
            "returncode": process.returncode,
            "output": output,
        }

    def _detect_runtime_java_major(self) -> int | None:
        version_text = os.getenv("JAVA_VERSION") or ""
        java_home_release = os.path.join(os.getenv("JAVA_HOME", ""), "release")
        if not version_text and os.path.exists(java_home_release):
            with open(java_home_release, "r", encoding="utf-8", errors="ignore") as release_file:
                version_text = release_file.read()

        if not version_text:
            version_text = os.popen("java -version 2>&1").read()

        match = re.search(r"(?:JAVA_VERSION=)?[\"']?(?:1\.)?(\d+)", version_text)
        if not match:
            return None
        return int(match.group(1))

    def _read_pom(self, project_path: str) -> tuple[str, str]:
        pom_path = os.path.join(project_path, "pom.xml")
        with open(pom_path, "r", encoding="utf-8", errors="ignore") as pom_file:
            return pom_path, pom_file.read()

    def _write_pom(self, pom_path: str, content: str) -> None:
        with open(pom_path, "w", encoding="utf-8") as pom_file:
            pom_file.write(content)

    def _detect_declared_java_major(self, content: str) -> int | None:
        patterns = [
            r"<maven\.compiler\.release>\s*([^<]+)\s*</maven\.compiler\.release>",
            r"<release>\s*([^<]+)\s*</release>",
            r"<java\.version>\s*([^<]+)\s*</java\.version>",
            r"<maven\.compiler\.source>\s*([^<]+)\s*</maven\.compiler\.source>",
            r"<source>\s*([^<]+)\s*</source>",
        ]
        for pattern in patterns:
            match = re.search(pattern, content)
            if not match:
                continue
            value = match.group(1).strip()
            if value.startswith("1."):
                value = value.split(".", 1)[1]
            if value.isdigit():
                return int(value)
        return None

    def _detect_framework(self, content: str) -> Dict[str, Any]:
        spring_boot_match = re.search(r"spring-boot(?:-starter|-dependencies|\.version).*?(\d+)\.", content, re.IGNORECASE | re.DOTALL)
        spring_boot_major = int(spring_boot_match.group(1)) if spring_boot_match else None
        return {
            "spring_boot_major": spring_boot_major,
            "uses_spring_boot": "spring-boot" in content.lower(),
            "uses_jakarta": "jakarta." in content or "jakarta-" in content,
            "uses_javax": "javax." in content or "javax-" in content,
        }

    def _replace_or_add_property(self, content: str, name: str, value: str) -> tuple[str, bool]:
        pattern = rf"<{re.escape(name)}>[^<]+</{re.escape(name)}>"
        replacement = f"<{name}>{value}</{name}>"
        updated = re.sub(pattern, replacement, content)
        if updated != content:
            return updated, True

        if "<properties>" in content:
            updated = content.replace("<properties>", f"<properties>\n        {replacement}", 1)
            return updated, True

        properties = f"""    <properties>
        {replacement}
    </properties>
"""
        updated = re.sub(r"(</modelVersion>)", rf"\1\n{properties}", content, count=1)
        if updated != content:
            return updated, True
        return content, False


    def _pin_known_dependency_versions(self, content: str, report: Dict[str, Any]) -> tuple[str, bool]:
        """Correct migrated dependency coordinates that commonly keep obsolete versions."""
        known_versions = {
            ("jakarta.servlet", "jakarta.servlet-api"): "6.0.0",
            ("jakarta.persistence", "jakarta.persistence-api"): "3.1.0",
            ("jakarta.validation", "jakarta.validation-api"): "3.0.2",
            ("jakarta.annotation", "jakarta.annotation-api"): "2.1.1",
            ("jakarta.inject", "jakarta.inject-api"): "2.0.1",
            ("com.mysql", "mysql-connector-j"): "8.0.33",
        }
        updated = content
        changed_any = False
        for (group_id, artifact_id), version in known_versions.items():
            dep_pattern = re.compile(
                rf"(<dependency>\s*<groupId>{re.escape(group_id)}</groupId>\s*<artifactId>{re.escape(artifact_id)}</artifactId>)(.*?)(</dependency>)",
                re.DOTALL,
            )

            def replace_dependency(match: re.Match) -> str:
                nonlocal changed_any
                body = match.group(2)
                old_body = body
                if "<version>" in body:
                    body = re.sub(r"<version>[^<]+</version>", f"<version>{version}</version>", body)
                else:
                    body = f"\n            <version>{version}</version>" + body
                if body != old_body:
                    changed_any = True
                    report["repairs"].append({
                        "type": "dependency_version_pin",
                        "target": f"{group_id}:{artifact_id}",
                        "action": f"Pinned version to {version}",
                    })
                return match.group(1) + body + match.group(3)

            updated = dep_pattern.sub(replace_dependency, updated)
        return updated, changed_any

    def _repair_pom_for_migration(self, project_path: str, report: Dict[str, Any]) -> None:
        pom_path, content = self._read_pom(project_path)
        original = content
        runtime_java_major = self._detect_runtime_java_major()
        declared_java_major = self._detect_declared_java_major(content)
        framework = self._detect_framework(content)

        report["pom_inspection"] = {
            "runtime_java_major": runtime_java_major,
            "declared_java_major": declared_java_major,
            "framework": framework,
        }

        if runtime_java_major and declared_java_major and declared_java_major > runtime_java_major:
            for property_name in ["maven.compiler.release", "maven.compiler.source", "maven.compiler.target", "java.version"]:
                content, changed = self._replace_or_add_property(content, property_name, str(runtime_java_major))
                if changed:
                    report["repairs"].append({
                        "type": "java_compatibility",
                        "target": property_name,
                        "action": f"Capped Java compiler setting from {declared_java_major} to local JDK {runtime_java_major}",
                    })
            replacements = [
                (r"<release>\d+</release>", f"<release>{runtime_java_major}</release>", "maven-compiler-plugin release"),
                (r"<source>\d+</source>", f"<source>{runtime_java_major}</source>", "maven-compiler-plugin source"),
                (r"<target>\d+</target>", f"<target>{runtime_java_major}</target>", "maven-compiler-plugin target"),
            ]
            for pattern, replacement, target in replacements:
                updated = re.sub(pattern, replacement, content)
                if updated != content:
                    content = updated
                    report["repairs"].append({"type": "java_compatibility", "target": target, "action": replacement})

        should_use_jakarta = (declared_java_major or runtime_java_major or 8) >= 17 or framework.get("spring_boot_major") == 3
        if should_use_jakarta:
            dependency_replacements = [
                ("javax.servlet", "javax.servlet-api", "jakarta.servlet", "jakarta.servlet-api", "6.0.0"),
                ("javax.persistence", "javax.persistence-api", "jakarta.persistence", "jakarta.persistence-api", "3.1.0"),
                ("javax.validation", "validation-api", "jakarta.validation", "jakarta.validation-api", "3.0.2"),
                ("javax.annotation", "javax.annotation-api", "jakarta.annotation", "jakarta.annotation-api", "2.1.1"),
                ("javax.inject", "javax.inject", "jakarta.inject", "jakarta.inject-api", "2.0.1"),
            ]
            for old_group, old_artifact, new_group, new_artifact, new_version in dependency_replacements:
                block_pattern = re.compile(
                    rf"<dependency>\s*<groupId>{re.escape(old_group)}</groupId>\s*<artifactId>{re.escape(old_artifact)}</artifactId>(.*?)</dependency>",
                    re.DOTALL,
                )

                def replace_dependency(match: re.Match) -> str:
                    body = match.group(1)
                    body = re.sub(r"<version>[^<]+</version>", f"<version>{new_version}</version>", body)
                    if "<version>" not in body:
                        body = f"\n            <version>{new_version}</version>" + body
                    report["repairs"].append({
                        "type": "dependency_migration",
                        "target": f"{old_group}:{old_artifact}",
                        "action": f"Migrated to {new_group}:{new_artifact}:{new_version}",
                    })
                    return (
                        "<dependency>\n"
                        f"            <groupId>{new_group}</groupId>\n"
                        f"            <artifactId>{new_artifact}</artifactId>"
                        f"{body}</dependency>"
                    )

                content = block_pattern.sub(replace_dependency, content)

        if framework.get("spring_boot_major") == 2 and (declared_java_major or runtime_java_major or 8) >= 17:
            updated = re.sub(r"<spring-boot\.version>2\.[^<]+</spring-boot\.version>", "<spring-boot.version>3.2.5</spring-boot.version>", content)
            if updated != content:
                content = updated
                report["repairs"].append({
                    "type": "framework_migration",
                    "target": "spring-boot.version",
                    "action": "Updated Spring Boot 2.x property to 3.2.5 for Java 17+ compatibility",
                })

        if "sonar-maven-plugin" in content and "org.codehaus.mojo" in content:
            content = content.replace("<groupId>org.codehaus.mojo</groupId>", "<groupId>org.sonarsource.scanner.maven</groupId>")
            report["repairs"].append({
                "type": "plugin_migration",
                "target": "sonar-maven-plugin",
                "action": "Updated relocated Sonar Maven plugin groupId to org.sonarsource.scanner.maven",
            })

        content, _ = self._pin_known_dependency_versions(content, report)

        if content != original:
            self._write_pom(pom_path, content)
            report["pom_updated"] = True

    def _parse_maven_issues(self, output: str) -> List[Dict[str, Any]]:
        issues: List[Dict[str, Any]] = []
        for package_name in sorted(set(re.findall(r"package ([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+) does not exist", output))):
            issues.append({
                "type": "missing_package",
                "package": package_name,
                "message": f"Package {package_name} does not exist during compilation",
            })

        if "cannot find symbol" in output:
            symbol_match = re.search(r"cannot find symbol\s+(?:symbol:\s+)?([^\n]+)", output, re.IGNORECASE)
            issues.append({
                "type": "compile",
                "message": (symbol_match.group(0) if symbol_match else "Compilation failed: cannot find symbol")[:500],
            })

        if "There are test failures" in output or "Please refer to" in output and "surefire-reports" in output:
            issues.append({
                "type": "test_failure",
                "message": "Maven tests failed during clean verify. See surefire-reports in Maven output.",
            })
        missing_artifact_patterns = [
            r"Could not find artifact\s+([^\s:]+):([^\s:]+):([^\s:]+):([^\s]+)",
            r"Could not resolve dependencies.*?([^\s:]+):([^\s:]+):(?:jar|pom):([^\s,]+)",
            r"dependency:\s+([^\s:]+):([^\s:]+):(?:jar|pom):([^\s]+)",
            r"([^\s:]+):([^\s:]+):(?:jar|pom):([^\s]+)\s+was not found",
        ]
        seen_dependencies = set()
        for pattern in missing_artifact_patterns:
            for match in re.finditer(pattern, output, re.IGNORECASE | re.DOTALL):
                groups = match.groups()
                key = (groups[0], groups[1], groups[-1].strip(".,;()"))
                if key in seen_dependencies:
                    continue
                seen_dependencies.add(key)
                issues.append({
                    "type": "dependency",
                    "group_id": key[0],
                    "artifact_id": key[1],
                    "version": key[2],
                    "message": match.group(0)[:500],
                })

        release_match = re.search(r"release version (\d+) not supported", output, re.IGNORECASE)
        if release_match:
            issues.append({
                "type": "java_compatibility",
                "requested_release": release_match.group(1),
                "message": release_match.group(0),
            })

        plugin_match = re.search(r"Plugin ([^\s:]+):([^\s:]+):([^\s]+).*?could not be resolved", output, re.IGNORECASE | re.DOTALL)
        if plugin_match:
            issues.append({
                "type": "plugin",
                "group_id": plugin_match.group(1),
                "artifact_id": plugin_match.group(2),
                "version": plugin_match.group(3).strip(".,;"),
                "message": plugin_match.group(0)[:500],
            })

        return issues

    def _dependency_exists(self, content: str, group_id: str, artifact_id: str) -> bool:
        return f"<groupId>{group_id}</groupId>" in content and f"<artifactId>{artifact_id}</artifactId>" in content

    def _insert_dependency(self, content: str, group_id: str, artifact_id: str, version: str, scope: str | None = None) -> tuple[str, bool]:
        if self._dependency_exists(content, group_id, artifact_id):
            return content, False

        scope_line = f"\n            <scope>{scope}</scope>" if scope else ""
        dependency = f"""        <dependency>
            <groupId>{group_id}</groupId>
            <artifactId>{artifact_id}</artifactId>
            <version>{version}</version>{scope_line}
        </dependency>
"""
        if "</dependencies>" in content:
            return content.replace("</dependencies>", dependency + "    </dependencies>", 1), True

        dependencies = f"""    <dependencies>
{dependency}    </dependencies>
"""
        if "</project>" in content:
            return content.replace("</project>", dependencies + "</project>", 1), True
        return content, False

    def _dependency_for_missing_package(self, package_name: str) -> tuple[str, str, str, str | None] | None:
        package_map = [
            ("jakarta.servlet", ("jakarta.servlet", "jakarta.servlet-api", "6.0.0", "provided")),
            ("jakarta.persistence", ("jakarta.persistence", "jakarta.persistence-api", "3.1.0", None)),
            ("jakarta.validation", ("jakarta.validation", "jakarta.validation-api", "3.0.2", None)),
            ("jakarta.annotation", ("jakarta.annotation", "jakarta.annotation-api", "2.1.1", None)),
            ("jakarta.inject", ("jakarta.inject", "jakarta.inject-api", "2.0.1", None)),
            ("javax.servlet", ("javax.servlet", "javax.servlet-api", "4.0.1", "provided")),
            ("javax.persistence", ("javax.persistence", "javax.persistence-api", "2.2", None)),
            ("javax.validation", ("javax.validation", "validation-api", "2.0.1.Final", None)),
            ("javax.annotation", ("javax.annotation", "javax.annotation-api", "1.3.2", None)),
            ("javax.inject", ("javax.inject", "javax.inject", "1", None)),
        ]
        for prefix, dependency in package_map:
            if package_name == prefix or package_name.startswith(prefix + "."):
                return dependency
        return None

    def _summarize_report(self, report: Dict[str, Any]) -> str:
        issue_parts = []
        for issue in report.get("issues", [])[:5]:
            if issue.get("type") == "dependency":
                issue_parts.append(f"dependency {issue.get('group_id')}:{issue.get('artifact_id')}:{issue.get('version')}")
            elif issue.get("type") == "missing_package":
                issue_parts.append(f"missing package {issue.get('package')}")
            elif issue.get("type") == "java_compatibility":
                issue_parts.append(f"unsupported Java release {issue.get('requested_release')}")
            elif issue.get("type") == "compile_error":
                issue_parts.append(
                    f"{issue.get('file')}:{issue.get('line')} {issue.get('error')}"
                    + (f"; suggested fix: {issue.get('suggested_fix')}" if issue.get('suggested_fix') else "")
                )
            else:
                issue_parts.append(issue.get("message", issue.get("type", "unknown issue")))
        if issue_parts:
            return "; ".join(issue_parts)

        failed_commands = [cmd for cmd in report.get("commands", []) if cmd.get("returncode")]
        if failed_commands:
            last = failed_commands[-1]
            return f"{last.get('label')} exited with {last.get('returncode')}"
        return "No detailed Maven issue was parsed; inspect sonar_build_report.commands output."

    def _repair_from_maven_output(self, project_path: str, output: str, report: Dict[str, Any]) -> bool:
        issues = self._parse_maven_issues(output)
        report["issues"].extend(issues)
        repaired = False

        if any(issue.get("type") == "java_compatibility" for issue in issues):
            runtime_java_major = self._detect_runtime_java_major()
            if runtime_java_major:
                repaired = self._cap_maven_compiler_release_for_local_jdk(project_path, runtime_java_major) or repaired

        pom_path, content = self._read_pom(project_path)
        original = content
        content, pinned = self._pin_known_dependency_versions(content, report)
        repaired = pinned or repaired
        known_versions = {
            ("jakarta.servlet", "jakarta.servlet-api"): "6.0.0",
            ("jakarta.persistence", "jakarta.persistence-api"): "3.1.0",
            ("jakarta.validation", "jakarta.validation-api"): "3.0.2",
            ("jakarta.annotation", "jakarta.annotation-api"): "2.1.1",
            ("jakarta.inject", "jakarta.inject-api"): "2.0.1",
            ("org.sonarsource.scanner.maven", "sonar-maven-plugin"): "4.0.0.4121",
        }
        for issue in issues:
            key = (issue.get("group_id"), issue.get("artifact_id"))
            if key not in known_versions:
                continue
            version = known_versions[key]
            dep_pattern = re.compile(
                rf"(<groupId>{re.escape(key[0])}</groupId>\s*<artifactId>{re.escape(key[1])}</artifactId>)(.*?)(</dependency>)",
                re.DOTALL,
            )

            def ensure_version(match: re.Match) -> str:
                body = match.group(2)
                if "<version>" in body:
                    body = re.sub(r"<version>[^<]+</version>", f"<version>{version}</version>", body)
                else:
                    body = f"\n            <version>{version}</version>" + body
                return match.group(1) + body + match.group(3)

            content = dep_pattern.sub(ensure_version, content)
            report["repairs"].append({
                "type": issue["type"],
                "target": f"{key[0]}:{key[1]}",
                "action": f"Pinned version to {version}",
            })

        for issue in issues:
            if issue.get("type") != "missing_package":
                continue
            dependency = self._dependency_for_missing_package(issue.get("package", ""))
            if not dependency:
                continue
            group_id, artifact_id, version, scope = dependency
            content, inserted = self._insert_dependency(content, group_id, artifact_id, version, scope)
            if inserted:
                repaired = True
                report["repairs"].append({
                    "type": "missing_package_dependency",
                    "target": issue.get("package"),
                    "action": f"Added {group_id}:{artifact_id}:{version}",
                })

        if content != original:
            self._write_pom(pom_path, content)
            repaired = True
        return repaired

    def _cap_maven_compiler_release_for_local_jdk(self, project_path: str, java_major: int) -> bool:
        pom_path = os.path.join(project_path, "pom.xml")
        if not os.path.exists(pom_path):
            return False

        with open(pom_path, "r", encoding="utf-8", errors="ignore") as pom_file:
            content = pom_file.read()

        updated = content
        replacements = [
            (r"<maven\.compiler\.release>[^<]+</maven\.compiler\.release>", f"<maven.compiler.release>{java_major}</maven.compiler.release>"),
            (r"<maven\.compiler\.source>[^<]+</maven\.compiler\.source>", f"<maven.compiler.source>{java_major}</maven.compiler.source>"),
            (r"<maven\.compiler\.target>[^<]+</maven\.compiler\.target>", f"<maven.compiler.target>{java_major}</maven.compiler.target>"),
            (r"<java\.version>[^<]+</java\.version>", f"<java.version>{java_major}</java.version>"),
            (r"<release>\d+</release>", f"<release>{java_major}</release>"),
            (r"<source>\d+</source>", f"<source>{java_major}</source>"),
            (r"<target>\d+</target>", f"<target>{java_major}</target>"),
        ]
        for pattern, replacement in replacements:
            updated = re.sub(pattern, replacement, updated)

        if updated == content:
            return False

        with open(pom_path, "w", encoding="utf-8") as pom_file:
            pom_file.write(updated)
        return True

    def _java_files(self, project_path: str) -> List[str]:
        java_files: List[str] = []
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in {".git", "target", "build", "out", "node_modules"} and not d.startswith(".")]
            for filename in files:
                if filename.endswith(".java"):
                    java_files.append(os.path.join(root, filename))
        return java_files

    def _add_import_to_java_source(self, content: str, import_line: str) -> tuple[str, bool]:
        if import_line in content:
            return content, False

        lines = content.splitlines(keepends=True)
        insert_at = 0
        package_seen = False
        last_import = -1
        for index, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("package "):
                insert_at = index + 1
                package_seen = True
            elif stripped.startswith("import "):
                last_import = index

        if last_import >= 0:
            insert_at = last_import + 1
            lines.insert(insert_at, import_line + "\n")
        elif package_seen:
            lines.insert(insert_at, "\n" + import_line + "\n")
        else:
            lines.insert(0, import_line + "\n")
        return "".join(lines), True

    def _repair_missing_java_imports(self, project_path: str, report: Dict[str, Any]) -> bool:
        repaired = False
        symbol_imports = {
            "Objects": "import java.util.Objects;",
            "Optional": "import java.util.Optional;",
            "List": "import java.util.List;",
            "Map": "import java.util.Map;",
            "Set": "import java.util.Set;",
            "ArrayList": "import java.util.ArrayList;",
            "HashMap": "import java.util.HashMap;",
            "HashSet": "import java.util.HashSet;",
        }

        for java_file in self._java_files(project_path):
            with open(java_file, "r", encoding="utf-8", errors="ignore") as source_file:
                content = source_file.read()
            updated = content
            for symbol, import_line in symbol_imports.items():
                symbol_used = re.search(rf"\b{re.escape(symbol)}\s*[.<(]", updated)
                if not symbol_used:
                    continue
                if re.search(rf"\b(class|interface|enum|record)\s+{re.escape(symbol)}\b", updated):
                    continue
                updated, changed = self._add_import_to_java_source(updated, import_line)
                if changed:
                    repaired = True
                    report["repairs"].append({
                        "type": "missing_import",
                        "file": os.path.relpath(java_file, project_path),
                        "target": symbol,
                        "action": f"Added {import_line}",
                    })
            if updated != content:
                with open(java_file, "w", encoding="utf-8") as source_file:
                    source_file.write(updated)
        return repaired

    def _parse_maven_compile_errors(self, output: str, project_path: str) -> List[Dict[str, Any]]:
        errors: List[Dict[str, Any]] = []
        lines = output.splitlines()
        path_pattern = re.compile(r"(?:\[ERROR\]\s*)?(.+?\.java):\[(\d+),(\d+)\]\s*(.*)")
        for index, line in enumerate(lines):
            match = path_pattern.search(line)
            if not match:
                continue
            raw_file, line_number, column_number, message = match.groups()
            raw_file = raw_file.strip()
            try:
                file_path = os.path.relpath(raw_file, project_path) if os.path.isabs(raw_file) else raw_file
            except ValueError:
                file_path = raw_file

            lookahead = "\n".join(lines[index:index + 6])
            symbol_match = re.search(r"symbol:\s+(?:class|variable|method)\s+([A-Za-z_$][\w$]*)", lookahead)
            symbol = symbol_match.group(1) if symbol_match else None
            suggestion = "Review the compiler error and migrated source code."
            if symbol == "Objects":
                suggestion = "Add import java.util.Objects; or fully qualify java.util.Objects."
            elif symbol:
                suggestion = f"Add the missing import/dependency for symbol '{symbol}' or repair the refactoring that introduced it."

            errors.append({
                "type": "compile_error",
                "file": file_path,
                "line": int(line_number),
                "column": int(column_number),
                "error": (message.strip() or "Compilation failed"),
                "symbol": symbol,
                "suggested_fix": suggestion,
            })
        return errors

    def _repair_from_compile_errors(self, project_path: str, errors: List[Dict[str, Any]], report: Dict[str, Any]) -> bool:
        repaired = False
        import_by_symbol = {
            "Objects": "import java.util.Objects;",
            "Optional": "import java.util.Optional;",
            "List": "import java.util.List;",
            "Map": "import java.util.Map;",
            "Set": "import java.util.Set;",
            "ArrayList": "import java.util.ArrayList;",
            "HashMap": "import java.util.HashMap;",
            "HashSet": "import java.util.HashSet;",
        }
        for error in errors:
            symbol = error.get("symbol")
            import_line = import_by_symbol.get(symbol)
            if not import_line:
                continue
            source_path = os.path.join(project_path, error.get("file", ""))
            if not os.path.exists(source_path):
                continue
            with open(source_path, "r", encoding="utf-8", errors="ignore") as source_file:
                content = source_file.read()
            updated, changed = self._add_import_to_java_source(content, import_line)
            if changed:
                with open(source_path, "w", encoding="utf-8") as source_file:
                    source_file.write(updated)
                repaired = True
                report["repairs"].append({
                    "type": "compile_error_import",
                    "file": error.get("file"),
                    "line": error.get("line"),
                    "target": symbol,
                    "action": f"Added {import_line}",
                })
        return repaired

    async def _validate_and_repair_maven_project(self, project_path: str, maven_command: str) -> Dict[str, Any]:
        report: Dict[str, Any] = {
            "status": "pending",
            "pom_updated": False,
            "repairs": [],
            "issues": [],
            "commands": [],
        }
        self._repair_pom_for_migration(project_path, report)
        self._repair_missing_java_imports(project_path, report)

        compile_args = [maven_command, "-U", "compile", "-DskipTests"]
        compile_result = await self._run_maven(compile_args, project_path, "compile")
        report["commands"].append(compile_result)
        if compile_result["returncode"] != 0:
            compile_errors = self._parse_maven_compile_errors(compile_result["output"], project_path)
            report["compile_errors"] = compile_errors
            report["issues"].extend(compile_errors)
            repaired = self._repair_from_compile_errors(project_path, compile_errors, report)
            repaired = self._repair_from_maven_output(project_path, compile_result["output"], report) or repaired
            if repaired:
                compile_result = await self._run_maven(compile_args, project_path, "compile-retry")
                report["commands"].append(compile_result)
                if compile_result["returncode"] != 0:
                    compile_errors = self._parse_maven_compile_errors(compile_result["output"], project_path)
                    report["compile_errors"] = compile_errors
                    report["issues"].extend(compile_errors)
                    repaired = self._repair_from_compile_errors(project_path, compile_errors, report)
                    repaired = self._repair_from_maven_output(project_path, compile_result["output"], report) or repaired
                    if repaired:
                        compile_result = await self._run_maven(compile_args, project_path, "compile-retry-2")
                        report["commands"].append(compile_result)
                        if compile_result["returncode"] != 0:
                            compile_errors = self._parse_maven_compile_errors(compile_result["output"], project_path)
                            report["compile_errors"] = compile_errors
                            report["issues"].extend(compile_errors)
            if compile_result["returncode"] != 0:
                report["status"] = "failed"
                report["summary"] = self._summarize_report(report)
                raise MavenBuildValidationError(f"Maven compile failed before SonarQube analysis: {report['summary']}", report)

        dependency_args = [maven_command, "-U", "dependency:resolve", "-DskipTests"]
        dependency_result = await self._run_maven(dependency_args, project_path, "dependency:resolve")
        report["commands"].append(dependency_result)
        if dependency_result["returncode"] != 0:
            repaired = self._repair_from_maven_output(project_path, dependency_result["output"], report)
            if repaired:
                dependency_result = await self._run_maven(dependency_args, project_path, "dependency:resolve-retry")
                report["commands"].append(dependency_result)
            if dependency_result["returncode"] != 0:
                report["status"] = "failed"
                report["summary"] = self._summarize_report(report)
                raise MavenBuildValidationError(f"Maven dependency resolution failed before SonarQube analysis: {report['summary']}", report)

        verify_args = [maven_command, "-U", "clean", "verify"]
        verify_result = await self._run_maven(verify_args, project_path, "clean verify")
        report["commands"].append(verify_result)
        if verify_result["returncode"] != 0:
            compile_errors = self._parse_maven_compile_errors(verify_result["output"], project_path)
            if compile_errors:
                report["compile_errors"] = compile_errors
                report["issues"].extend(compile_errors)
            repaired = self._repair_from_compile_errors(project_path, compile_errors, report) if compile_errors else False
            repaired = self._repair_from_maven_output(project_path, verify_result["output"], report) or repaired
            if repaired:
                verify_result = await self._run_maven(verify_args, project_path, "clean verify-retry")
                report["commands"].append(verify_result)
                if verify_result["returncode"] != 0:
                    compile_errors = self._parse_maven_compile_errors(verify_result["output"], project_path)
                    if compile_errors:
                        report["compile_errors"] = compile_errors
                        report["issues"].extend(compile_errors)
            if verify_result["returncode"] != 0:
                report["status"] = "failed"
                report["summary"] = self._summarize_report(report)
                raise MavenBuildValidationError(f"Maven build validation failed before SonarQube analysis: {report['summary']}", report)

        report["status"] = "passed"
        report["summary"] = "Maven dependency resolution and clean verify passed."
        return report


    def _detect_java_source_roots(self, project_path: str) -> List[str]:
        roots = []
        for root, _, files in os.walk(project_path):
            if any(file.endswith(".java") for file in files):
                rel = os.path.relpath(root, project_path).replace("\\", "/")
                if rel == ".":
                    rel = "."
                roots.append(rel)
        preferred = [root for root in roots if root.endswith("src/main/java")]
        return preferred or roots[:20] or ["."]

    async def _analyze_non_maven_project(self, project_path: str, project_key: str) -> Dict[str, Any]:
        scanner_command = self._resolve_sonar_scanner_command()
        source_roots = self._detect_java_source_roots(project_path)
        dashboard_url = f"{self.sonar_url}/dashboard?id={project_key}"
        build_report: Dict[str, Any] = {
            "status": "pending",
            "build_tool": "sonar-scanner-cli",
            "summary": "Project has no pom.xml; running real SonarScanner CLI without Maven validation.",
            "issues": [],
            "repairs": [],
            "commands": [],
            "source_roots": source_roots,
        }
        scanner_args = [
            scanner_command,
            f"-Dsonar.host.url={self.sonar_url}",
            f"-Dsonar.token={self.sonar_token}",
            f"-Dsonar.projectKey={project_key}",
            f"-Dsonar.projectName={project_key}",
            f"-Dsonar.sources={','.join(source_roots)}",
        ]
        scanner_result = await self._run_sonar_scanner(scanner_args, project_path, "sonar-scanner")
        build_report["commands"].append(scanner_result)
        scanner_output = scanner_result["output"]
        if scanner_result["returncode"] != 0:
            build_report["status"] = "failed"
            build_report["summary"] = "SonarScanner CLI failed; inspect build_report.commands output."
            raise MavenBuildValidationError(f"SonarQube scanner execution failed: {build_report['summary']}", build_report)

        report_info = self._read_report_task(project_path)
        if report_info.get("dashboardUrl"):
            dashboard_url = report_info["dashboardUrl"]
        await self._wait_for_background_task(report_info.get("ceTaskId"))
        result = await self._fetch_analysis_results(project_key)
        build_report["status"] = "passed"
        build_report["summary"] = "Real SonarScanner CLI analysis completed and project is visible in SonarQube."
        result["analysis_url"] = dashboard_url
        result["scanner_output"] = scanner_output
        result["project_key"] = project_key
        result["build_report"] = build_report
        return result

    async def analyze_project(self, project_path: str, project_key: str) -> Dict[str, Any]:
        """Validate Maven when available, run real SonarQube analysis, and return metrics from SonarQube."""
        self._refresh_config()
        if not os.path.isdir(project_path):
            raise RuntimeError(f"SonarQube analysis failed: migrated project path does not exist: {project_path}")

        if not self.sonar_token:
            raise RuntimeError("SonarQube analysis failed: SONAR_TOKEN or SONARQUBE_TOKEN is not configured in .env")

        await self._check_sonarqube_connection()

        pom_path = os.path.join(project_path, "pom.xml")
        if not os.path.exists(pom_path):
            return await self._analyze_non_maven_project(project_path, project_key)

        dashboard_url = f"{self.sonar_url}/dashboard?id={project_key}"
        maven_command = self._resolve_maven_command(project_path)
        print(f"Resolved Maven command: {maven_command}")
        build_report = await self._validate_and_repair_maven_project(project_path, maven_command)

        sonar_args = [
            maven_command,
            "sonar:sonar",
            f"-Dsonar.host.url={self.sonar_url}",
            f"-Dsonar.token={self.sonar_token}",
            f"-Dsonar.projectKey={project_key}",
            f"-Dsonar.projectName={project_key}",
        ]
        sonar_result = await self._run_maven(sonar_args, project_path, "sonar:sonar")
        scanner_output = sonar_result["output"]
        build_report["commands"].append(sonar_result)

        if sonar_result["returncode"] != 0:
            build_report["status"] = "failed"
            build_report["issues"].extend(self._parse_maven_issues(scanner_output))
            build_report["summary"] = self._summarize_report(build_report)
            raise MavenBuildValidationError(f"SonarQube scanner execution failed after Maven validation: {build_report['summary']}", build_report)

        report_info = self._read_report_task(project_path)
        if report_info.get("dashboardUrl"):
            dashboard_url = report_info["dashboardUrl"]

        await self._wait_for_background_task(report_info.get("ceTaskId"))
        result = await self._fetch_analysis_results(project_key)
        result["analysis_url"] = dashboard_url
        result["scanner_output"] = scanner_output
        result["project_key"] = project_key
        result["build_report"] = build_report
        return result

    def _read_report_task(self, project_path: str) -> Dict[str, str]:
        report_path = os.path.join(project_path, "target", "sonar", "report-task.txt")
        report_info: Dict[str, str] = {}
        if not os.path.exists(report_path):
            return report_info

        with open(report_path, "r", encoding="utf-8", errors="ignore") as report_file:
            for line in report_file:
                if "=" not in line:
                    continue
                key, value = line.strip().split("=", 1)
                report_info[key] = value
        return report_info


    async def _check_sonarqube_connection(self) -> None:
        """Fail early when local SonarQube or the configured token is not usable."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{self.sonar_url}/api/server/version")
            except httpx.RequestError as exc:
                raise RuntimeError(
                    f"SonarQube analysis failed: unable to reach SonarQube at {self.sonar_url}. "
                    "Start the local SonarQube server on http://localhost:9000 and retry. "
                    f"Details: {exc}"
                ) from exc

            if response.status_code != 200:
                raise RuntimeError(
                    f"SonarQube analysis failed: unable to reach SonarQube at {self.sonar_url}. "
                    f"HTTP {response.status_code}: {response.text}"
                )

            try:
                auth_response = await client.get(
                    f"{self.sonar_url}/api/authentication/validate",
                    auth=(self.sonar_token, ""),
                )
            except httpx.RequestError as exc:
                raise RuntimeError(
                    "SonarQube analysis failed: unable to validate SONAR_TOKEN against local SonarQube. "
                    f"Details: {exc}"
                ) from exc

            if auth_response.status_code != 200:
                raise RuntimeError(
                    "SonarQube analysis failed: configured SONAR_TOKEN could not be validated. "
                    f"HTTP {auth_response.status_code}: {auth_response.text}"
                )

            try:
                is_valid = bool(auth_response.json().get("valid"))
            except ValueError:
                is_valid = False

            if not is_valid:
                raise RuntimeError(
                    "SonarQube analysis failed: configured SONAR_TOKEN is invalid or expired for http://localhost:9000."
                )

    async def _wait_for_background_task(self, ce_task_id: str = None) -> None:
        if not ce_task_id:
            await asyncio.sleep(5)
            return

        async with httpx.AsyncClient(timeout=30.0) as client:
            for _ in range(30):
                response = await client.get(
                    f"{self.sonar_url}/api/ce/task",
                    params={"id": ce_task_id},
                    auth=(self.sonar_token, ""),
                )
                if response.status_code != 200:
                    raise RuntimeError(
                        f"SonarQube analysis failed: unable to check background task {ce_task_id}. "
                        f"HTTP {response.status_code}: {response.text}"
                    )

                task = response.json().get("task", {})
                status = task.get("status")
                if status == "SUCCESS":
                    return
                if status in {"FAILED", "CANCELED"}:
                    raise RuntimeError(
                        f"SonarQube analysis failed: background task {ce_task_id} ended with status {status}."
                    )
                await asyncio.sleep(2)

        raise RuntimeError(f"SonarQube analysis failed: background task {ce_task_id} did not finish in time.")

    async def _fetch_analysis_results(self, project_key: str) -> Dict[str, Any]:
        """Fetch analysis results from SonarQube API. Raises if the project is not visible."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.sonar_url}/api/measures/component",
                params={
                    "component": project_key,
                    "metricKeys": "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density",
                },
                auth=(self.sonar_token, ""),
            )

            if response.status_code != 200:
                raise RuntimeError(
                    f"SonarQube analysis failed: project '{project_key}' is not visible in SonarQube. "
                    f"HTTP {response.status_code}: {response.text}"
                )

            data = response.json()
            component = data.get("component") or {}
            measures = {m["metric"]: m.get("value", "0") for m in component.get("measures", [])}
            quality_gate = await self.get_quality_gate_status(project_key)

            return {
                "quality_gate": quality_gate,
                "bugs": int(float(measures.get("bugs", 0))),
                "vulnerabilities": int(float(measures.get("vulnerabilities", 0))),
                "code_smells": int(float(measures.get("code_smells", 0))),
                "coverage": float(measures.get("coverage", 0) or 0),
                "duplications": float(measures.get("duplicated_lines_density", 0) or 0),
                "analysis_url": f"{self.sonar_url}/dashboard?id={project_key}",
            }

    async def get_quality_gate_status(self, project_key: str) -> str:
        """Get quality gate status for a project."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.sonar_url}/api/qualitygates/project_status",
                params={"projectKey": project_key},
                auth=(self.sonar_token, ""),
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("projectStatus", {}).get("status", "NONE")

            raise RuntimeError(
                f"SonarQube analysis failed: unable to read quality gate for '{project_key}'. "
                f"HTTP {response.status_code}: {response.text}"
            )

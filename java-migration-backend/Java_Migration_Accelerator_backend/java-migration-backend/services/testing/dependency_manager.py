import os
import re
from typing import Dict, Any


class DependencyManager:
    async def add_dependencies_if_absent(self, project_path: str, target_java_version: str = "17") -> Dict[str, Any]:
        """
        Detects build tool and adds JUnit 5, Mockito, Spring Boot Starter Test,
        maven-surefire-plugin 3.x (required for JUnit 5 Platform), and JaCoCo
        plugin dependencies/configurations to the build files if missing.

        Also ensures compiler source/target are set so that `mvn clean test`
        works in any environment without manual changes.
        """
        result = {
            "success": True,
            "modified_files": [],
            "message": "Dependencies are up to date."
        }

        try:
            # Detect POM and Gradle files
            pom_path = None
            gradle_path = None
            gradle_kts_path = None

            for root, dirs, files in os.walk(project_path):
                dirs[:] = [d for d in dirs if d not in ("target", "build", ".git", "node_modules", "venv", ".venv")]
                if "pom.xml" in files:
                    pom_path = os.path.join(root, "pom.xml")
                    break
                elif "build.gradle" in files:
                    gradle_path = os.path.join(root, "build.gradle")
                    break
                elif "build.gradle.kts" in files:
                    gradle_kts_path = os.path.join(root, "build.gradle.kts")
                    break

            is_spring = self._detect_spring_project(project_path)
            java_version = str(target_java_version).strip() or "17"

            if pom_path and os.path.exists(pom_path):
                modified = self._update_pom(pom_path, is_spring, java_version)
                if modified:
                    result["modified_files"].append("pom.xml")
                    result["message"] = "Injected missing test and coverage dependencies into pom.xml."

            elif gradle_path and os.path.exists(gradle_path):
                modified = self._update_gradle(gradle_path, is_spring)
                if modified:
                    result["modified_files"].append("build.gradle")
                    result["message"] = "Injected missing test and coverage configurations into build.gradle."

            elif gradle_kts_path and os.path.exists(gradle_kts_path):
                modified = self._update_gradle_kts(gradle_kts_path, is_spring)
                if modified:
                    result["modified_files"].append("build.gradle.kts")
                    result["message"] = "Injected missing test and coverage configurations into build.gradle.kts."

        except Exception as e:
            result["success"] = False
            result["message"] = f"Error managing dependencies: {e}"
            print(f"Error in DependencyManager: {e}")
            import traceback
            traceback.print_exc()

        return result

    def _detect_spring_project(self, project_path: str) -> bool:
        """Helper to scan if the project is Spring Boot based"""
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in ("target", "build", ".git", "node_modules", "venv", ".venv")]
            for file in files:
                if file.endswith(".java"):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        if "org.springframework.boot" in content or "org.springframework" in content:
                            return True
                    except:
                        pass
        return False

    def _update_pom(self, pom_path: str, is_spring: bool, java_version: str = "17") -> bool:
        """
        Inject test dependencies, maven-surefire-plugin 3.x, and jacoco-maven-plugin
        into pom.xml if missing.  Also ensures compiler source/target are set so that
        `mvn clean test` works without manual changes.
        """
        with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        modified = False

        # ── 0. Upgrade Lombok if present ────────────────────────────────────────
        lombok_ver_match = re.search(r"<lombok\.version>(.*?)</lombok\.version>", content)
        if lombok_ver_match:
            current_lombok_ver = lombok_ver_match.group(1).strip()
            if current_lombok_ver < "1.18.30":
                content = re.sub(r"<lombok\.version>.*?</lombok\.version>",
                                 "<lombok.version>1.18.30</lombok.version>", content)
                modified = True

        # ── 1. Ensure compiler source/target are set ─────────────────────────────
        # If neither property exists, add them inside <properties> (or create the block).
        has_compiler_source = bool(re.search(r"<maven\.compiler\.source>", content))
        has_compiler_target = bool(re.search(r"<maven\.compiler\.target>", content))
        has_compiler_release = bool(re.search(r"<maven\.compiler\.release>", content))
        has_java_version_prop = bool(re.search(r"<java\.version>", content))

        if not (has_compiler_source or has_compiler_target or has_compiler_release or has_java_version_prop):
            compiler_props = (
                f"\n        <maven.compiler.source>{java_version}</maven.compiler.source>"
                f"\n        <maven.compiler.target>{java_version}</maven.compiler.target>"
                f"\n        <maven.compiler.release>{java_version}</maven.compiler.release>"
            )
            props_match = re.search(r"<properties>([\s\S]*?)</properties>", content)
            if props_match:
                inner = props_match.group(1)
                content = content.replace(
                    f"<properties>{inner}</properties>",
                    f"<properties>{inner}{compiler_props}\n    </properties>"
                )
                modified = True
            else:
                # Insert <properties> block before </project>
                content = content.replace(
                    "</project>",
                    f"\n    <properties>{compiler_props}\n    </properties>\n</project>"
                )
                modified = True

        # ── 2. Add surefire.failIfNoSpecifiedTests=false ─────────────────────────
        if "surefire.failIfNoSpecifiedTests" not in content:
            fail_prop = "\n        <surefire.failIfNoSpecifiedTests>false</surefire.failIfNoSpecifiedTests>"
            props_match = re.search(r"<properties>([\s\S]*?)</properties>", content)
            if props_match:
                inner = props_match.group(1)
                content = content.replace(
                    f"<properties>{inner}</properties>",
                    f"<properties>{inner}{fail_prop}\n    </properties>"
                )
                modified = True

        # ── 3. Inject JUnit 5, Mockito, Spring deps ──────────────────────────────
        deps_to_add = []
        if "junit-jupiter" not in content and "org.junit.jupiter" not in content:
            deps_to_add.append("""
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.2</version>
            <scope>test</scope>
        </dependency>""")

        if "mockito-junit-jupiter" not in content and "mockito-core" not in content:
            deps_to_add.append("""
        <dependency>
            <groupId>org.mockito</groupId>
            <artifactId>mockito-junit-jupiter</artifactId>
            <version>5.11.0</version>
            <scope>test</scope>
        </dependency>""")

        if is_spring and "spring-boot-starter-test" not in content:
            deps_to_add.append("""
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <version>3.2.4</version>
            <scope>test</scope>
        </dependency>""")

        if "jakarta.annotation-api" not in content:
            deps_to_add.append("""
        <dependency>
            <groupId>jakarta.annotation</groupId>
            <artifactId>jakarta.annotation-api</artifactId>
            <version>2.1.1</version>
            <scope>compile</scope>
        </dependency>""")

        if deps_to_add:
            deps_match = re.search(r"<dependencies>([\s\S]*?)</dependencies>", content)
            if deps_match:
                inner_deps = deps_match.group(1)
                new_inner_deps = inner_deps + "".join(deps_to_add)
                content = content.replace(
                    f"<dependencies>{inner_deps}</dependencies>",
                    f"<dependencies>{new_inner_deps}</dependencies>"
                )
                modified = True
            else:
                project_end_match = re.search(r"</project>", content)
                if project_end_match:
                    deps_block = "\n    <dependencies>" + "".join(deps_to_add) + "\n    </dependencies>\n"
                    content = content.replace("</project>", f"{deps_block}</project>")
                    modified = True

        # ── 4. Inject maven-surefire-plugin 3.x (REQUIRED for JUnit 5 Platform) ─
        #       Maven's default Surefire 2.x does NOT run JUnit Jupiter tests.
        if "maven-surefire-plugin" not in content:
            surefire_plugin = """
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.3.1</version>
                <configuration>
                    <failIfNoTests>false</failIfNoTests>
                    <includes>
                        <include>**/*Test.java</include>
                        <include>**/*Tests.java</include>
                        <include>**/*TestCase.java</include>
                    </includes>
                </configuration>
            </plugin>"""
            modified = self._inject_into_plugins(content, surefire_plugin)
            if modified:
                content = self._inject_into_plugins_content(content, surefire_plugin)
        else:
            # If surefire plugin exists but is version 2.x, upgrade it
            surefire_ver_match = re.search(
                r"(<artifactId>maven-surefire-plugin</artifactId>\s*<version>)(2\.\d+[\.\d]*)(</version>)", content)
            if surefire_ver_match:
                content = content.replace(
                    surefire_ver_match.group(0),
                    f"{surefire_ver_match.group(1)}3.3.1{surefire_ver_match.group(3)}"
                )
                # Ensure useJUnitPlatform is not explicitly disabled
                modified = True

        # ── 5. Inject jacoco-maven-plugin ────────────────────────────────────────
        if "jacoco-maven-plugin" not in content:
            jacoco_plugin = """
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.12</version>
                <executions>
                    <execution>
                        <id>prepare-agent</id>
                        <phase>initialize</phase>
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
            content = self._inject_into_plugins_content(content, jacoco_plugin)
            modified = True

        if modified:
            with open(pom_path, "w", encoding="utf-8") as f:
                f.write(content)

        return modified

    def _inject_into_plugins(self, content: str, plugin_xml: str) -> bool:
        """Returns True if the plugin can be injected (for pre-check)."""
        return bool(re.search(r"<plugins>", content)) or bool(re.search(r"<build>", content)) or bool(re.search(r"</project>", content))

    def _inject_into_plugins_content(self, content: str, plugin_xml: str) -> str:
        """Injects plugin_xml into the <plugins> block inside <build>, creating as needed."""
        build_match = re.search(r"<build>([\s\S]*?)</build>", content)
        if build_match:
            inner_build = build_match.group(1)
            plugins_match = re.search(r"<plugins>([\s\S]*?)</plugins>", inner_build)
            if plugins_match:
                inner_plugins = plugins_match.group(1)
                new_inner_plugins = inner_plugins + plugin_xml
                new_inner_build = inner_build.replace(
                    f"<plugins>{inner_plugins}</plugins>",
                    f"<plugins>{new_inner_plugins}</plugins>"
                )
                content = content.replace(f"<build>{inner_build}</build>", f"<build>{new_inner_build}</build>")
            else:
                new_inner_build = inner_build + f"\n        <plugins>{plugin_xml}\n        </plugins>"
                content = content.replace(f"<build>{inner_build}</build>", f"<build>{new_inner_build}</build>")
        else:
            build_block = f"""
    <build>
        <plugins>{plugin_xml}
        </plugins>
    </build>
"""
            content = content.replace("</project>", f"{build_block}</project>")
        return content

    def _update_gradle(self, gradle_path: str, is_spring: bool) -> bool:
        """Inject test dependencies, jacoco plugin, and jacocoTestReport task into build.gradle if missing."""
        with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        modified = False

        # 1. Apply JaCoCo plugin
        if "jacoco" not in content:
            if "plugins {" in content:
                content = content.replace("plugins {", "plugins {\n    id 'jacoco'", 1)
                modified = True
            else:
                content = "apply plugin: 'jacoco'\n" + content
                modified = True

        # 2. Add dependencies
        deps_to_add = []
        if "junit-jupiter" not in content:
            deps_to_add.append("\n    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'")
        if "mockito-junit-jupiter" not in content and "mockito-core" not in content:
            deps_to_add.append("\n    testImplementation 'org.mockito:mockito-junit-jupiter:5.11.0'")
        if is_spring and "spring-boot-starter-test" not in content:
            deps_to_add.append("\n    testImplementation 'org.springframework.boot:spring-boot-starter-test'")
        if "jakarta.annotation-api" not in content:
            deps_to_add.append("\n    implementation 'jakarta.annotation:jakarta.annotation-api:2.1.1'")

        if deps_to_add:
            deps_match = re.search(r"dependencies\s*\{([\s\S]*?)\}", content)
            if deps_match:
                inner_deps = deps_match.group(1)
                new_inner_deps = inner_deps + "".join(deps_to_add)
                content = content.replace(f"dependencies {{{inner_deps}}}", f"dependencies {{{new_inner_deps}}}")
                modified = True
            else:
                content += f"\ndependencies {{" + "".join(deps_to_add) + "\n}"
                modified = True

        # 3. Add useJUnitPlatform & ignoreFailures
        test_match = re.search(r"test\s*\{([\s\S]*?)\}", content)
        if test_match:
            inner_test = test_match.group(1)
            new_inner_test = inner_test
            if "useJUnitPlatform" not in inner_test:
                new_inner_test += "\n    useJUnitPlatform()"
            if "ignoreFailures" not in inner_test:
                new_inner_test += "\n    ignoreFailures = true"
            if new_inner_test != inner_test:
                content = content.replace(f"test {{{inner_test}}}", f"test {{{new_inner_test}}}")
                modified = True
        else:
            content += """
test {
    useJUnitPlatform()
    ignoreFailures = true
}
"""
            modified = True

        # 4. Ensure jacocoTestReport depends on test task (so coverage is generated after tests run)
        if "jacocoTestReport" not in content:
            content += """
jacocoTestReport {
    dependsOn test
    reports {
        xml.required = true
        html.required = true
        csv.required = false
    }
}
"""
            modified = True

        if modified:
            with open(gradle_path, "w", encoding="utf-8") as f:
                f.write(content)

        return modified

    def _update_gradle_kts(self, gradle_kts_path: str, is_spring: bool) -> bool:
        """Inject test dependencies, jacoco plugin, and jacocoTestReport task into build.gradle.kts if missing."""
        with open(gradle_kts_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        modified = False

        # 1. Apply JaCoCo plugin
        if "jacoco" not in content:
            if "plugins {" in content:
                content = content.replace("plugins {", "plugins {\n    id(\"jacoco\")", 1)
                modified = True
            else:
                content = "apply(plugin = \"jacoco\")\n" + content
                modified = True

        # 2. Add dependencies
        deps_to_add = []
        if "junit-jupiter" not in content:
            deps_to_add.append("\n    testImplementation(\"org.junit.jupiter:junit-jupiter:5.10.2\")")
        if "mockito-junit-jupiter" not in content and "mockito-core" not in content:
            deps_to_add.append("\n    testImplementation(\"org.mockito:mockito-junit-jupiter:5.11.0\")")
        if is_spring and "spring-boot-starter-test" not in content:
            deps_to_add.append("\n    testImplementation(\"org.springframework.boot:spring-boot-starter-test\")")
        if "jakarta.annotation-api" not in content:
            deps_to_add.append("\n    implementation(\"jakarta.annotation:jakarta.annotation-api:2.1.1\")")

        if deps_to_add:
            deps_match = re.search(r"dependencies\s*\{([\s\S]*?)\}", content)
            if deps_match:
                inner_deps = deps_match.group(1)
                new_inner_deps = inner_deps + "".join(deps_to_add)
                content = content.replace(f"dependencies {{{inner_deps}}}", f"dependencies {{{new_inner_deps}}}")
                modified = True
            else:
                content += f"\ndependencies {{" + "".join(deps_to_add) + "\n}"
                modified = True

        # 3. Add useJUnitPlatform & ignoreFailures
        test_match = re.search(r"tasks\.test\s*\{([\s\S]*?)\}", content) or re.search(r"test\s*\{([\s\S]*?)\}", content)
        if test_match:
            inner_test = test_match.group(1)
            new_inner_test = inner_test
            if "useJUnitPlatform" not in inner_test:
                new_inner_test += "\n    useJUnitPlatform()"
            if "ignoreFailures" not in inner_test:
                new_inner_test += "\n    ignoreFailures = true"
            if new_inner_test != inner_test:
                full_match = test_match.group(0)
                new_full = full_match.replace(inner_test, new_inner_test)
                content = content.replace(full_match, new_full)
                modified = True
        else:
            content += """
tasks.test {
    useJUnitPlatform()
    ignoreFailures = true
}
"""
            modified = True

        # 4. Ensure jacocoTestReport depends on test task
        if "jacocoTestReport" not in content:
            content += """
tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }
}
"""
            modified = True

        if modified:
            with open(gradle_kts_path, "w", encoding="utf-8") as f:
                f.write(content)

        return modified

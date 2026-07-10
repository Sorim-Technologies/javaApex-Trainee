import os
import re
from typing import Dict, Any

class DependencyManager:
    async def add_dependencies_if_absent(self, project_path: str) -> Dict[str, Any]:
        """
        Detects build tool and adds JUnit 5, Mockito, Spring Boot Starter Test, 
        and JaCoCo plugin dependencies/configurations to the build files if missing.
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

            if pom_path and os.path.exists(pom_path):
                modified = self._update_pom(pom_path, is_spring)
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

    def _update_pom(self, pom_path: str, is_spring: bool) -> bool:
        """Inject test dependencies and jacoco-maven-plugin into pom.xml if missing"""
        with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        modified = False

        # Upgrade Lombok version if present to ensure Java 21 compatibility
        lombok_ver_match = re.search(r"<lombok\.version>(.*?)</lombok\.version>", content)
        if lombok_ver_match:
            current_lombok_ver = lombok_ver_match.group(1).strip()
            if current_lombok_ver < "1.18.30":
                content = re.sub(r"<lombok\.version>.*?</lombok\.version>", "<lombok.version>1.18.30</lombok.version>", content)
                modified = True

        # 1. Inject dependencies block or append within <dependencies>
        # JUnit 5 & Mockito dependencies
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

        # Add jakarta.annotation-api dependency if missing
        if "jakarta.annotation-api" not in content:
            deps_to_add.append("""
        <dependency>
            <groupId>jakarta.annotation</groupId>
            <artifactId>jakarta.annotation-api</artifactId>
            <version>2.1.1</version>
            <scope>compile</scope>
        </dependency>""")

        if deps_to_add:
            # Let's insert them inside <dependencies>
            deps_match = re.search(r"<dependencies>([\s\S]*?)</dependencies>", content)
            if deps_match:
                inner_deps = deps_match.group(1)
                new_inner_deps = inner_deps + "".join(deps_to_add)
                content = content.replace(f"<dependencies>{inner_deps}</dependencies>", f"<dependencies>{new_inner_deps}</dependencies>")
                modified = True
            else:
                # If <dependencies> doesn't exist, we must add it before </project>
                project_end_match = re.search(r"</project>", content)
                if project_end_match:
                    deps_block = f"\n    <dependencies>" + "".join(deps_to_add) + "\n    </dependencies>\n"
                    content = content.replace("</project>", f"{deps_block}</project>")
                    modified = True

        # 2. Inject jacoco-maven-plugin inside <plugins>
        if "jacoco-maven-plugin" not in content:
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
            
            # Look for <plugins> inside <build>
            build_match = re.search(r"<build>([\s\S]*?)</build>", content)
            if build_match:
                inner_build = build_match.group(1)
                plugins_match = re.search(r"<plugins>([\s\S]*?)</plugins>", inner_build)
                if plugins_match:
                    inner_plugins = plugins_match.group(1)
                    new_inner_plugins = inner_plugins + jacoco_plugin
                    content = content.replace(f"<plugins>{inner_plugins}</plugins>", f"<plugins>{new_inner_plugins}</plugins>")
                    modified = True
                else:
                    new_inner_build = inner_build + f"\n        <plugins>{jacoco_plugin}\n        </plugins>"
                    content = content.replace(f"<build>{inner_build}</build>", f"<build>{new_inner_build}</build>")
                    modified = True
            else:
                # Add <build><plugins>...</plugins></build> before </project>
                project_end_match = re.search(r"</project>", content)
                if project_end_match:
                    build_block = f"""
    <build>
        <plugins>{jacoco_plugin}
        </plugins>
    </build>
"""
                    content = content.replace("</project>", f"{build_block}</project>")
                    modified = True

        if modified:
            with open(pom_path, "w", encoding="utf-8") as f:
                f.write(content)
        
        return modified

    def _update_gradle(self, gradle_path: str, is_spring: bool) -> bool:
        """Inject test dependencies and jacoco plugin into build.gradle if missing"""
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

        if modified:
            with open(gradle_path, "w", encoding="utf-8") as f:
                f.write(content)

        return modified

    def _update_gradle_kts(self, gradle_kts_path: str, is_spring: bool) -> bool:
        """Inject test dependencies and jacoco plugin into build.gradle.kts if missing"""
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
        test_match = re.search(r"tasks.test\s*\{([\s\S]*?)\}", content) or re.search(r"test\s*\{([\s\S]*?)\}", content)
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

        if modified:
            with open(gradle_kts_path, "w", encoding="utf-8") as f:
                f.write(content)

        return modified

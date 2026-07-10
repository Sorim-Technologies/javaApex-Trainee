import os
import re
from typing import Dict, Any

class TestAnalyzer:
    async def analyze_project(self, project_path: str) -> Dict[str, Any]:
        """
        Analyzes the project structure, detects build tool, test framework,
        whether test source directory exists, and counts existing test classes and methods.
        """
        result = {
            "build_tool": "none",
            "test_framework": "none",
            "src_test_exists": False,
            "test_classes_count": 0,
            "test_methods_count": 0
        }

        try:
            # 1. Detect build tool
            build_tool = "none"
            pom_path = None
            gradle_path = None
            
            for root, dirs, files in os.walk(project_path):
                dirs[:] = [d for d in dirs if d not in ("target", "build", ".git", "node_modules", "venv", ".venv")]
                if "pom.xml" in files:
                    build_tool = "maven"
                    pom_path = os.path.join(root, "pom.xml")
                    break
                elif "build.gradle" in files or "build.gradle.kts" in files:
                    build_tool = "gradle"
                    for f in files:
                        if f in ["build.gradle", "build.gradle.kts"]:
                            gradle_path = os.path.join(root, f)
                            break
                    break
            
            result["build_tool"] = build_tool

            # 2. Check if src/test/java exists
            src_test_java = None
            for root, dirs, _ in os.walk(project_path):
                dirs[:] = [d for d in dirs if d not in ("target", "build", ".git", "node_modules", "venv", ".venv")]
                # Check for standard src/test/java or nested variations
                if root.replace("\\", "/").endswith("src/test/java"):
                    src_test_java = root
                    result["src_test_exists"] = True
                    break
            
            if not src_test_java:
                # Direct check
                direct_path = os.path.join(project_path, "src", "test", "java")
                if os.path.exists(direct_path):
                    src_test_java = direct_path
                    result["src_test_exists"] = True

            # 3. Analyze test files and framework
            test_classes_count = 0
            test_methods_count = 0
            detected_frameworks = set()

            if src_test_java and os.path.exists(src_test_java):
                for root, dirs, files in os.walk(src_test_java):
                    dirs[:] = [d for d in dirs if d not in ("target", "build", ".git", "node_modules", "venv", ".venv")]
                    for file in files:
                        if file.endswith(".java"):
                            test_classes_count += 1
                            file_path = os.path.join(root, file)
                            try:
                                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                    content = f.read()
                                
                                # Strip comments
                                clean_content = re.sub(r'//.*', '', content)
                                clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)

                                # Framework detection via imports/annotations
                                if "org.junit.jupiter" in clean_content or "org.junit.platform" in clean_content:
                                    detected_frameworks.add("junit5")
                                elif "org.junit.Test" in clean_content or "org.junit.Assert" in clean_content:
                                    detected_frameworks.add("junit4")
                                elif "org.testng" in clean_content:
                                    detected_frameworks.add("testng")

                                # Count test methods
                                # Look for @Test annotations
                                test_annotations = re.findall(r'@(Test|ParameterizedTest|RepeatedTest)\b', clean_content)
                                test_methods_count += len(test_annotations)

                            except Exception as file_err:
                                print(f"Error reading test file {file_path}: {file_err}")

            result["test_classes_count"] = test_classes_count
            result["test_methods_count"] = test_methods_count

            # 4. Fallback framework detection from build files if no test files found
            if not detected_frameworks:
                if build_tool == "maven" and pom_path and os.path.exists(pom_path):
                    try:
                        with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                            pom_content = f.read()
                        if "junit-jupiter" in pom_content or "junit-platform" in pom_content:
                            detected_frameworks.add("junit5")
                        elif "junit" in pom_content and "org.junit.jupiter" not in pom_content:
                            detected_frameworks.add("junit4")
                        elif "testng" in pom_content:
                            detected_frameworks.add("testng")
                    except Exception as e:
                        print(f"Error reading pom.xml for framework detection: {e}")
                elif build_tool == "gradle" and gradle_path and os.path.exists(gradle_path):
                    try:
                        with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
                            gradle_content = f.read()
                        if "junit-jupiter" in gradle_content or "useJUnitPlatform" in gradle_content:
                            detected_frameworks.add("junit5")
                        elif "junit" in gradle_content:
                            detected_frameworks.add("junit4")
                        elif "testng" in gradle_content:
                            detected_frameworks.add("testng")
                    except Exception as e:
                        print(f"Error reading gradle build file for framework detection: {e}")

            # Assign framework
            if "junit5" in detected_frameworks:
                result["test_framework"] = "junit5"
            elif "junit4" in detected_frameworks:
                result["test_framework"] = "junit4"
            elif "testng" in detected_frameworks:
                result["test_framework"] = "testng"
            elif test_classes_count > 0:
                result["test_framework"] = "junit5"  # default if tests exist but not explicitly matches
            else:
                result["test_framework"] = "none"

        except Exception as e:
            print(f"Error in TestAnalyzer: {e}")
            import traceback
            traceback.print_exc()

        return result

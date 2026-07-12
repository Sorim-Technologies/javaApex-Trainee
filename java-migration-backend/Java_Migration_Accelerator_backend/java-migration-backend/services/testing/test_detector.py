"""
Test Detector - Scans Java test directories to detect test frameworks, classes, and methods.

Detects:
  - JUnit 4 (org.junit.Test, org.junit.Assert, @RunWith, etc.)
  - JUnit Jupiter / JUnit 5 (org.junit.jupiter.api, org.junit.platform)
  - TestNG (org.testng)
  - Existing Test Classes and Methods
  - Classes without Tests (by comparing source classes to test classes)

Returns a structured TestModel.
Never modifies any repository files. Only analyzes the project.
"""
import os
import re
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Set


@dataclass
class TestMethodInfo:
    """Information about a single test method"""
    name: str
    annotations: List[str] = field(default_factory=list)
    file_path: str = ""
    line_number: int = 0


@dataclass
class TestClassInfo:
    """Information about a single test class"""
    file_path: str
    class_name: str
    package_name: str = ""
    framework: str = ""  # "junit4", "junit5", "testng", "unknown"
    test_methods: List[TestMethodInfo] = field(default_factory=list)
    test_method_count: int = 0
    annotations: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)


@dataclass
class TestModel:
    """
    Structured model representing the full test analysis of a Java project.
    This is the canonical output of the Test Detection module.
    """
    # Test framework detection
    test_framework: str = "none"  # "junit4", "junit5", "testng", "none"
    test_framework_confidence: str = "low"  # "high", "medium", "low"
    detected_frameworks: List[str] = field(default_factory=list)

    # Test source directory
    src_test_java: Optional[str] = None
    src_test_exists: bool = False

    # Test classes
    test_classes: List[TestClassInfo] = field(default_factory=list)
    test_class_count: int = 0
    test_class_names: List[str] = field(default_factory=list)

    # Test methods
    test_method_count: int = 0

    # Classes without tests (requires project analysis to be passed in)
    classes_without_tests: List[str] = field(default_factory=list)
    classes_without_tests_count: int = 0

    # Build file framework hints
    build_file_framework: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to a JSON-serializable dictionary"""
        return {
            "test_framework": self.test_framework,
            "test_framework_confidence": self.test_framework_confidence,
            "detected_frameworks": self.detected_frameworks,
            "src_test_java": self.src_test_java,
            "src_test_exists": self.src_test_exists,
            "test_classes": [asdict(tc) for tc in self.test_classes],
            "test_class_count": self.test_class_count,
            "test_class_names": self.test_class_names,
            "test_method_count": self.test_method_count,
            "classes_without_tests": self.classes_without_tests,
            "classes_without_tests_count": self.classes_without_tests_count,
            "build_file_framework": self.build_file_framework,
        }


class TestDetector:
    """
    Scans src/test/java to identify existing test classes and methods,
    determines the JUnit / TestNG version, and lists classes that do NOT have tests.
    This is a read-only analysis — no files are ever modified.
    """

    # Directories to skip during traversal
    SKIP_DIRS = {"target", "build", ".git", "node_modules", "venv", ".venv", "__pycache__", ".mvn", ".gradle", "out"}

    # JUnit 4 annotations
    JUNIT4_ANNOTATIONS = {"Test", "Before", "After", "BeforeClass", "AfterClass", "Ignore", "RunWith", "SuiteClasses"}
    JUNIT4_IMPORTS = {"org.junit.Test", "org.junit.Assert", "org.junit.Before", "org.junit.After",
                      "org.junit.BeforeClass", "org.junit.AfterClass", "org.junit.Ignore",
                      "org.junit.runner.RunWith", "org.junit.runners"}

    # JUnit 5 (Jupiter) annotations
    JUNIT5_ANNOTATIONS = {"Test", "ParameterizedTest", "RepeatedTest", "TestFactory", "TestTemplate",
                          "BeforeEach", "AfterEach", "BeforeAll", "AfterAll", "Disabled",
                          "DisplayName", "Nested", "Tag", "ExtendWith", "RegisterExtension",
                          "Timeout", "MethodSource", "ValueSource", "CsvSource", "CsvFileSource",
                          "EnumSource", "ArgumentsSource"}
    JUNIT5_IMPORTS = {"org.junit.jupiter.api", "org.junit.jupiter.params", "org.junit.platform"}

    # TestNG annotations
    TESTNG_ANNOTATIONS = {"Test", "BeforeMethod", "AfterMethod", "BeforeClass", "AfterClass",
                          "BeforeSuite", "AfterSuite", "BeforeTest", "AfterTest",
                          "DataProvider", "Parameters", "Factory", "Listeners"}
    TESTNG_IMPORTS = {"org.testng"}

    async def detect_tests(self, project_path: str) -> TestModel:
        """
        Scan the project for test files and detect test frameworks.
        Returns a TestModel with all detected information.
        """
        model = TestModel()

        if not os.path.isdir(project_path):
            return model

        # 1. Find src/test/java
        model.src_test_java = self._find_test_dir(project_path)
        model.src_test_exists = model.src_test_java is not None and os.path.isdir(model.src_test_java)

        # 2. Analyze test files
        if model.src_test_exists:
            self._analyze_test_files(model)

        # 3. Detect framework from build files (fallback if no test files found)
        if not model.detected_frameworks:
            self._detect_framework_from_build(project_path, model)

        # 4. Determine final framework
        self._resolve_framework(model)

        return model

    def get_classes_without_tests(self, project_model: Any, test_model: TestModel) -> List[str]:
        """
        Compare analyzed source classes with existing test classes to find
        classes that lack test coverage.

        Args:
            project_model: A ProjectModel instance (from project_analyzer)
            test_model: A TestModel instance (from detect_tests)

        Returns:
            List of file paths for source classes without corresponding tests.
        """
        existing_test_names = set(test_model.test_class_names)
        classes_without_tests = []

        # Get all source classes from the project model
        all_classes = getattr(project_model, "all_classes", {})
        if not all_classes and hasattr(project_model, "to_dict"):
            # Fallback: try dict access
            all_classes_dict = project_model.to_dict().get("all_classes", {})
            all_classes = all_classes_dict

        for file_path, class_meta in all_classes.items():
            class_name = ""
            if hasattr(class_meta, "class_name"):
                class_name = class_meta.class_name
            elif isinstance(class_meta, dict):
                class_name = class_meta.get("class_name", "")

            if not class_name:
                continue

            # Skip interfaces that are not repositories
            is_interface = False
            is_repository = False
            if hasattr(class_meta, "is_interface"):
                is_interface = class_meta.is_interface
                is_repository = class_meta.is_repository
            elif isinstance(class_meta, dict):
                is_interface = class_meta.get("is_interface", False)
                is_repository = class_meta.get("is_repository", False)

            if is_interface and not is_repository:
                continue

            # Check multiple standard test naming patterns
            candidates = [
                f"{class_name}Test",
                f"{class_name}Tests",
                f"Test{class_name}",
                f"{class_name}TestCase",
                f"{class_name}IT",  # Integration Test
                f"{class_name}IntegrationTest",
            ]
            if not any(candidate in existing_test_names for candidate in candidates):
                classes_without_tests.append(file_path)

        return classes_without_tests

    def get_test_generation_targets(self, project_model: Any, test_model: TestModel) -> List[Dict[str, Any]]:
        """Return targets for classes with no test or unreferenced public methods.

        User test files are read-only. Incomplete tests receive a GeneratedTest companion.
        """
        test_by_name = {item.class_name: item for item in test_model.test_classes}
        targets: List[Dict[str, Any]] = []
        for file_path, meta in getattr(project_model, "all_classes", {}).items():
            if meta.is_interface and not meta.is_repository:
                continue
            public_methods = [m.get("name", "") for m in meta.methods if m.get("name")]
            if not public_methods:
                continue
            candidates = [f"{meta.class_name}Test", f"{meta.class_name}Tests", f"Test{meta.class_name}", f"{meta.class_name}TestCase", f"{meta.class_name}IT", f"{meta.class_name}IntegrationTest"]
            matched = [test_by_name[name] for name in candidates if name in test_by_name]
            if not matched:
                targets.append({"file_path": file_path, "test_class_name": f"{meta.class_name}Test", "uncovered_methods": public_methods, "additional": False})
                continue
            existing_content = ""
            for test in matched:
                try:
                    with open(test.file_path, "r", encoding="utf-8", errors="ignore") as source:
                        existing_content += source.read().lower()
                except OSError:
                    pass
            uncovered = [name for name in public_methods if name.lower() not in existing_content]
            if uncovered:
                targets.append({"file_path": file_path, "test_class_name": f"{meta.class_name}GeneratedTest", "uncovered_methods": uncovered, "additional": True})
        return targets

    def _find_test_dir(self, project_path: str) -> Optional[str]:
        """Find the src/test/java directory"""
        for root, dirs, _ in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            if root.replace("\\", "/").endswith("src/test/java"):
                return root
        # Direct check
        direct = os.path.join(project_path, "src", "test", "java")
        if os.path.isdir(direct):
            return direct
        return None

    def _analyze_test_files(self, model: TestModel) -> None:
        """Walk src/test/java and analyze all test files"""
        for root, dirs, files in os.walk(model.src_test_java):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            for file in files:
                if not file.endswith(".java"):
                    continue

                file_path = os.path.join(root, file)
                class_name = os.path.splitext(file)[0]

                test_class = self._parse_test_file(file_path, class_name)
                if test_class is None:
                    continue

                model.test_classes.append(test_class)
                model.test_class_names.append(class_name)
                model.test_class_count += 1
                model.test_method_count += test_class.test_method_count

                # Track detected frameworks
                if test_class.framework and test_class.framework not in model.detected_frameworks:
                    model.detected_frameworks.append(test_class.framework)

    def _parse_test_file(self, file_path: str, class_name: str) -> Optional[TestClassInfo]:
        """
        Parse a single test file to extract framework, methods, and metadata.
        Returns None if the file cannot be parsed.
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Strip comments for analysis
            clean_content = re.sub(r"//.*", "", content)
            clean_content = re.sub(r"/\*.*?\*/", "", clean_content, flags=re.DOTALL)

            # Package
            package_match = re.search(r"package\s+([\w\.]+);", clean_content)
            package_name = package_match.group(1) if package_match else ""

            # Imports
            imports = re.findall(r"import\s+([\w\.\*]+);", clean_content)

            # Detect framework based on imports
            framework = self._detect_framework_from_imports(imports, clean_content)

            # Extract class-level annotations
            class_decl_pos = re.search(
                r"(?:public|private|protected)?\s*(?:final|abstract|static)?\s*(?:class|interface|enum|record)\s+\w+",
                clean_content,
            )
            class_annotations = []
            if class_decl_pos:
                before_class = clean_content[: class_decl_pos.start()]
                class_annotations = re.findall(r"@(\w+)(?:\([^)]*\))?", before_class)

            # Extract test methods
            test_methods = []
            test_annotation_pattern = r"@(Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b"
            test_annotation_positions = [(m.start(), m.group(1)) for m in re.finditer(test_annotation_pattern, clean_content)]

            for pos, annotation in test_annotation_positions:
                # Find the method after this annotation
                after_annotation = clean_content[pos:]
                method_match = re.search(
                    r"(?:public|private|protected)?\s*(?:\w+\s+)*(\w+)\s*\((.*?)\)\s*(?:throws\s+[\w\.\s,]+)?\s*(?:\{|;)",
                    after_annotation,
                )
                if method_match:
                    method_name = method_match.group(1)
                    # Skip if it's a constructor or setup method
                    if method_name not in (class_name, "before", "after", "setUp", "tearDown"):
                        # Find line number
                        line_number = content[:pos].count("\n") + 1
                        test_methods.append(TestMethodInfo(
                            name=method_name,
                            annotations=[annotation],
                            file_path=file_path,
                            line_number=line_number,
                        ))

            # Also detect @Test from TestNG (org.testng.annotations.Test)
            if framework == "testng":
                for match in re.finditer(r"@Test\b", clean_content):
                    pos = match.start()
                    after_annotation = clean_content[pos:]
                    method_match = re.search(
                        r"(?:public|private|protected)?\s*(?:\w+\s+)*(\w+)\s*\((.*?)\)\s*(?:throws\s+[\w\.\s,]+)?\s*(?:\{|;)",
                        after_annotation,
                    )
                    if method_match:
                        method_name = method_match.group(1)
                        if method_name not in (class_name, "before", "after", "setUp", "tearDown"):
                            # Check if we already have this method from the annotation scan
                            if not any(tm.name == method_name for tm in test_methods):
                                line_number = content[:pos].count("\n") + 1
                                test_methods.append(TestMethodInfo(
                                    name=method_name,
                                    annotations=["Test"],
                                    file_path=file_path,
                                    line_number=line_number,
                                ))

            return TestClassInfo(
                file_path=file_path,
                class_name=class_name,
                package_name=package_name,
                framework=framework,
                test_methods=test_methods,
                test_method_count=len(test_methods),
                annotations=class_annotations,
                imports=imports,
            )

        except Exception as e:
            print(f"Error parsing test file {file_path}: {e}")
            return None

    def _detect_framework_from_imports(self, imports: List[str], content: str) -> str:
        """
        Detect the test framework based on imports and content analysis.
        Returns: "junit5", "junit4", "testng", or "unknown"
        """
        # Check for JUnit Jupiter (JUnit 5)
        for imp in imports:
            if any(imp.startswith(j5_import) for j5_import in self.JUNIT5_IMPORTS):
                return "junit5"

        # Check for JUnit 4 (but NOT JUnit 5)
        for imp in imports:
            if any(imp.startswith(j4_import) for j4_import in self.JUNIT4_IMPORTS):
                # Make sure it's not JUnit 5
                if not any(imp.startswith(j5_import) for j5_import in self.JUNIT5_IMPORTS):
                    return "junit4"

        # Check for TestNG
        for imp in imports:
            if any(imp.startswith(tng_import) for tng_import in self.TESTNG_IMPORTS):
                return "testng"

        # Fallback: check content for framework-specific patterns
        if "org.junit.jupiter" in content or "org.junit.platform" in content:
            return "junit5"
        if "org.junit.Test" in content or "org.junit.Assert" in content:
            return "junit4"
        if "org.testng" in content:
            return "testng"

        # Check for @Test annotation without explicit import (could be either)
        if "@Test" in content:
            # Look for JUnit 5 specific annotations
            if "@ParameterizedTest" in content or "@RepeatedTest" in content or "@ExtendWith" in content:
                return "junit5"
            # Look for JUnit 4 specific annotations
            if "@RunWith" in content or "@Before" in content or "@After" in content:
                return "junit4"
            # Look for TestNG specific annotations
            if "@DataProvider" in content or "@BeforeMethod" in content or "@AfterMethod" in content:
                return "testng"
            # Default: assume JUnit 5 (modern)
            return "junit5"

        return "unknown"

    def _detect_framework_from_build(self, project_path: str, model: TestModel) -> None:
        """Detect test framework from build files (pom.xml or build.gradle)"""
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]

            if "pom.xml" in files:
                pom_path = os.path.join(root, "pom.xml")
                try:
                    with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    if "junit-jupiter" in content or "junit-platform" in content or "junit5" in content:
                        model.build_file_framework = "junit5"
                        model.detected_frameworks.append("junit5")
                    elif "junit" in content.lower() and "junit-jupiter" not in content:
                        model.build_file_framework = "junit4"
                        model.detected_frameworks.append("junit4")
                    elif "testng" in content.lower():
                        model.build_file_framework = "testng"
                        model.detected_frameworks.append("testng")
                except Exception as e:
                    print(f"Error reading pom.xml for framework detection: {e}")
                break

            if "build.gradle" in files or "build.gradle.kts" in files:
                gradle_file = "build.gradle" if "build.gradle" in files else "build.gradle.kts"
                gradle_path = os.path.join(root, gradle_file)
                try:
                    with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    if "junit-jupiter" in content or "useJUnitPlatform" in content or "junit5" in content:
                        model.build_file_framework = "junit5"
                        model.detected_frameworks.append("junit5")
                    elif "junit" in content.lower() and "junit-jupiter" not in content:
                        model.build_file_framework = "junit4"
                        model.detected_frameworks.append("junit4")
                    elif "testng" in content.lower():
                        model.build_file_framework = "testng"
                        model.detected_frameworks.append("testng")
                except Exception as e:
                    print(f"Error reading gradle file for framework detection: {e}")
                break

    def _resolve_framework(self, model: TestModel) -> None:
        """Resolve the final test framework from detected frameworks"""
        if "junit5" in model.detected_frameworks:
            model.test_framework = "junit5"
            model.test_framework_confidence = "high"
        elif "junit4" in model.detected_frameworks:
            model.test_framework = "junit4"
            model.test_framework_confidence = "high"
        elif "testng" in model.detected_frameworks:
            model.test_framework = "testng"
            model.test_framework_confidence = "high"
        elif model.build_file_framework:
            model.test_framework = model.build_file_framework
            model.test_framework_confidence = "medium"
        elif model.test_class_count > 0:
            # Default to JUnit 5 if tests exist but framework couldn't be determined
            model.test_framework = "junit5"
            model.test_framework_confidence = "low"
        else:
            model.test_framework = "none"
            model.test_framework_confidence = "high"

    def map_production_to_tests(self, project_model: Any, test_model: TestModel) -> Dict[str, List[str]]:
        """
        Maps every production class to its existing test class names.
        """
        mapping = {}
        test_by_name = {item.class_name: item for item in test_model.test_classes}
        
        all_classes = getattr(project_model, "all_classes", {})
        if not all_classes and hasattr(project_model, "to_dict"):
            all_classes = project_model.to_dict().get("all_classes", {})

        for file_path, meta in all_classes.items():
            class_name = ""
            if hasattr(meta, "class_name"):
                class_name = meta.class_name
            elif isinstance(meta, dict):
                class_name = meta.get("class_name", "")
                
            if not class_name:
                continue
                
            candidates = [
                f"{class_name}Test",
                f"{class_name}Tests",
                f"Test{class_name}",
                f"{class_name}TestCase",
                f"{class_name}IT",
                f"{class_name}IntegrationTest",
            ]
            matched_tests = [name for name in candidates if name in test_by_name]
            mapping[class_name] = matched_tests
            
        return mapping

    async def detect_and_analyze_tests(self, project_path: str, project_model: Any) -> Dict[str, Any]:
        """
        Runs test detection and returns the structured results matching the user requirements.
        """
        # 1. Run detection
        test_model = await self.detect_tests(project_path)
        
        # 2. Get classes without tests
        uncovered_classes = self.get_classes_without_tests(project_model, test_model)
        
        # 3. Get test generation targets (which contain uncovered methods & candidates)
        candidates = self.get_test_generation_targets(project_model, test_model)
        
        # 4. Extract uncovered methods from candidates
        uncovered_methods = []
        for cand in candidates:
            uncovered_methods.append({
                "class_name": os.path.basename(cand["file_path"]).replace(".java", ""),
                "file_path": cand["file_path"],
                "uncovered_methods": cand["uncovered_methods"]
            })
            
        # 5. Map production to tests
        prod_to_test_map = self.map_production_to_tests(project_model, test_model)
        
        # 6. Detailed Logging
        print(f"=== Test Detection Engine ===")
        print(f"[Test Detection Log] Existing tests found: {bool(test_model.test_classes)}")
        print(f"[Test Detection Log] Detected test framework: {test_model.test_framework}")
        print(f"[Test Detection Log] Uncovered production classes: {len(uncovered_classes)}")
        print(f"[Test Detection Log] Total test candidates: {len(candidates)}")
        for class_name, test_names in prod_to_test_map.items():
            if test_names:
                print(f"[Test Detection Log] Production class {class_name} maps to: {test_names}")
                
        return {
            "existing_tests_found": bool(test_model.test_classes),
            "uncovered_classes": uncovered_classes,
            "uncovered_methods": uncovered_methods,
            "generated_test_candidates": candidates,
            "test_framework": test_model.test_framework,
            "production_to_test_mapping": prod_to_test_map
        }
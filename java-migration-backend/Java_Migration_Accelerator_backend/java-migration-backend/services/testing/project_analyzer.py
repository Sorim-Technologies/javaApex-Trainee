"""
Project Analyzer - Analyzes Java project structure, build tools, frameworks, and class stereotypes.

Detects:
  - Maven or Gradle
  - Java Version
  - Spring Boot Version
  - Package Structure
  - Controllers, Services, Repositories, Components, DTOs, Entities, Utility Classes, Configuration Classes

Returns a structured ProjectModel.
Never modifies any repository files. Only analyzes the project.
"""
import os
import re
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Set


@dataclass
class ClassMeta:
    """Metadata for a single Java class/interface"""
    file_path: str
    package_name: str
    class_name: str
    is_interface: bool = False
    is_enum: bool = False
    is_controller: bool = False
    is_service: bool = False
    is_repository: bool = False
    is_entity: bool = False
    is_configuration: bool = False
    is_utility: bool = False
    is_dto: bool = False
    is_component: bool = False
    annotations: List[str] = field(default_factory=list)
    fields: List[tuple] = field(default_factory=list)
    methods: List[Dict[str, Any]] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    superclass: Optional[str] = None
    interfaces: List[str] = field(default_factory=list)


@dataclass
class PackageInfo:
    """Information about a package in the project"""
    name: str
    path: str
    class_count: int = 0
    stereotypes: List[str] = field(default_factory=list)


@dataclass
class ProjectModel:
    """
    Structured model representing the full analysis of a Java project.
    This is the canonical output of the Repository Analysis module.
    """
    # Build system
    build_tool: str = "none"  # "maven", "gradle", "standalone", "none"
    build_file_path: Optional[str] = None

    # Java version
    java_version: int = 8
    java_version_source: str = "default"  # "pom.xml", "build.gradle", "source_analysis", "default"

    # Spring Boot
    spring_boot_version: Optional[str] = None
    spring_boot_version_source: Optional[str] = None

    # Package structure
    packages: List[PackageInfo] = field(default_factory=list)
    package_count: int = 0

    # Classified source files
    controllers: List[ClassMeta] = field(default_factory=list)
    services: List[ClassMeta] = field(default_factory=list)
    repositories: List[ClassMeta] = field(default_factory=list)
    entities: List[ClassMeta] = field(default_factory=list)
    dtos: List[ClassMeta] = field(default_factory=list)
    utilities: List[ClassMeta] = field(default_factory=list)
    configurations: List[ClassMeta] = field(default_factory=list)
    components: List[ClassMeta] = field(default_factory=list)
    other_classes: List[ClassMeta] = field(default_factory=list)

    # All classes mapped by file path
    all_classes: Dict[str, ClassMeta] = field(default_factory=dict)

    # Counts
    total_source_files: int = 0
    total_test_files: int = 0

    # Source paths
    src_main_java: Optional[str] = None
    src_test_java: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to a JSON-serializable dictionary"""
        return {
            "build_tool": self.build_tool,
            "build_file_path": self.build_file_path,
            "java_version": self.java_version,
            "java_version_source": self.java_version_source,
            "spring_boot_version": self.spring_boot_version,
            "spring_boot_version_source": self.spring_boot_version_source,
            "packages": [asdict(p) for p in self.packages],
            "package_count": self.package_count,
            "controllers": [asdict(c) for c in self.controllers],
            "services": [asdict(s) for s in self.services],
            "repositories": [asdict(r) for r in self.repositories],
            "entities": [asdict(e) for e in self.entities],
            "dtos": [asdict(d) for d in self.dtos],
            "utilities": [asdict(u) for u in self.utilities],
            "configurations": [asdict(c) for c in self.configurations],
            "components": [asdict(c) for c in self.components],
            "other_classes": [asdict(o) for o in self.other_classes],
            "all_classes": {k: asdict(v) for k, v in self.all_classes.items()},
            "total_source_files": self.total_source_files,
            "total_test_files": self.total_test_files,
            "src_main_java": self.src_main_java,
            "src_test_java": self.src_test_java,
        }


class ProjectAnalyzer:
    """
    Analyzes a Java project directory and returns a structured ProjectModel.
    This is a read-only analysis — no files are ever modified.
    """

    # Directories to skip during traversal
    SKIP_DIRS = {"target", "build", ".git", "node_modules", "venv", ".venv", "__pycache__", ".mvn", ".gradle", "out", "dist"}

    # Spring stereotype annotations
    CONTROLLER_ANNOTATIONS = {"Controller", "RestController"}
    SERVICE_ANNOTATIONS = {"Service"}
    REPOSITORY_ANNOTATIONS = {"Repository"}
    ENTITY_ANNOTATIONS = {"Entity", "MappedSuperclass", "Embeddable", "Document"}
    CONFIGURATION_ANNOTATIONS = {"Configuration", "SpringBootConfiguration"}
    COMPONENT_ANNOTATIONS = {"Component"}

    async def analyze_project(self, project_path: str) -> ProjectModel:
        """
        Analyze a Java project at the given path.
        Returns a ProjectModel with all detected information.
        """
        model = ProjectModel()

        if not os.path.isdir(project_path):
            return model

        # 1. Detect build tool and extract versions
        self._detect_build_tool(project_path, model)

        # 2. Find src/main/java and src/test/java
        model.src_main_java = self._find_source_dir(project_path, "src/main/java")
        model.src_test_java = self._find_source_dir(project_path, "src/test/java")

        # 3. Analyze source classes
        if model.src_main_java and os.path.isdir(model.src_main_java):
            self._analyze_source_classes(model)

        # 4. Count test files
        if model.src_test_java and os.path.isdir(model.src_test_java):
            model.total_test_files = self._count_java_files(model.src_test_java)

        # 5. Build package structure
        self._build_package_structure(model)

        return model

    def _find_source_dir(self, project_path: str, relative_path: str) -> Optional[str]:
        """Find a source directory by walking the project tree"""
        for root, dirs, _ in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            if root.replace("\\", "/").endswith(relative_path):
                return root
        # Direct check
        direct = os.path.join(project_path, *relative_path.split("/"))
        if os.path.isdir(direct):
            return direct
        return None

    def _count_java_files(self, directory: str) -> int:
        """Count .java files in a directory recursively"""
        count = 0
        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            count += sum(1 for f in files if f.endswith(".java"))
        return count

    def _detect_build_tool(self, project_path: str, model: ProjectModel) -> None:
        """Detect Maven or Gradle, and extract Java version and Spring Boot version"""
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]

            if "pom.xml" in files:
                model.build_tool = "maven"
                model.build_file_path = os.path.join(root, "pom.xml")
                self._parse_pom(model.build_file_path, model)
                break

            if "build.gradle" in files or "build.gradle.kts" in files:
                model.build_tool = "gradle"
                gradle_file = "build.gradle" if "build.gradle" in files else "build.gradle.kts"
                model.build_file_path = os.path.join(root, gradle_file)
                self._parse_gradle(model.build_file_path, model)
                break

    def _parse_pom(self, pom_path: str, model: ProjectModel) -> None:
        """Parse pom.xml for Java version and Spring Boot version"""
        try:
            with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Spring Boot version
            sb_match = (
                re.search(r"<spring-boot\.version>(.*?)</spring-boot\.version>", content)
                or re.search(
                    r"<artifactId>spring-boot-starter-parent</artifactId>\s*<version>(.*?)</version>",
                    content,
                )
                or re.search(
                    r"<artifactId>spring-boot-dependencies</artifactId>\s*<version>(.*?)</version>",
                    content,
                )
            )
            if sb_match:
                model.spring_boot_version = sb_match.group(1).strip()
                model.spring_boot_version_source = "pom.xml"

            # Java version - check multiple patterns
            java_version = None
            patterns = [
                r"<java\.version>(.*?)</java\.version>",
                r"<maven\.compiler\.source>(.*?)</maven\.compiler\.source>",
                r"<maven\.compiler\.release>(.*?)</maven\.compiler\.release>",
                r"<maven\.compiler\.target>(.*?)</maven\.compiler\.target>",
                r"<javaVersion>(.*?)</javaVersion>",
            ]
            for pattern in patterns:
                match = re.search(pattern, content)
                if match:
                    java_version = match.group(1).strip()
                    break

            if java_version:
                # Handle versions like "1.8" -> 8
                java_version = java_version.replace("1.", "")
                try:
                    model.java_version = int(float(java_version))
                    model.java_version_source = "pom.xml"
                except ValueError:
                    pass

        except Exception as e:
            print(f"Error parsing pom.xml: {e}")

    def _parse_gradle(self, gradle_path: str, model: ProjectModel) -> None:
        """Parse build.gradle or build.gradle.kts for Java version and Spring Boot version"""
        try:
            with open(gradle_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Spring Boot version
            sb_match = (
                re.search(r"id\s+['\"]org\.springframework\.boot['\"]\s+version\s+['\"](.*?)['\"]", content)
                or re.search(r"springBootVersion\s*=\s*['\"](.*?)['\"]", content)
                or re.search(r"springBoot\s*\{\s*version\s*=\s*['\"](.*?)['\"]", content)
            )
            if sb_match:
                model.spring_boot_version = sb_match.group(1).strip()
                model.spring_boot_version_source = gradle_path

            # Java version
            jv_match = (
                re.search(r"sourceCompatibility\s*=\s*['\"]?(?:1\.)?(\d+)['\"]?", content)
                or re.search(r"JavaLanguageVersion\.of\((\d+)\)", content)
                or re.search(r"jvmTarget\s*=\s*['\"](\d+)['\"]", content)
                or re.search(r"targetCompatibility\s*=\s*['\"]?(?:1\.)?(\d+)['\"]?", content)
            )
            if jv_match:
                try:
                    model.java_version = int(jv_match.group(1).strip())
                    model.java_version_source = "build.gradle"
                except ValueError:
                    pass

        except Exception as e:
            print(f"Error parsing gradle file: {e}")

    def _analyze_source_classes(self, model: ProjectModel) -> None:
        """Walk src/main/java and classify all Java classes"""
        for root, dirs, files in os.walk(model.src_main_java):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]
            for file in files:
                if not file.endswith(".java"):
                    continue
                file_path = os.path.join(root, file)
                class_meta = self._parse_java_class(file_path, model.src_main_java)
                if class_meta is None:
                    continue

                model.all_classes[file_path] = class_meta
                model.total_source_files += 1

                # Classify by stereotype
                if class_meta.is_controller:
                    model.controllers.append(class_meta)
                elif class_meta.is_service:
                    model.services.append(class_meta)
                elif class_meta.is_repository:
                    model.repositories.append(class_meta)
                elif class_meta.is_entity:
                    model.entities.append(class_meta)
                elif class_meta.is_configuration:
                    model.configurations.append(class_meta)
                elif class_meta.is_component:
                    model.components.append(class_meta)
                elif class_meta.is_dto:
                    model.dtos.append(class_meta)
                elif class_meta.is_utility:
                    model.utilities.append(class_meta)
                else:
                    # Fallback: classify by directory/package naming conventions
                    rel_path = os.path.relpath(file_path, model.src_main_java).replace("\\", "/")
                    lower_rel = rel_path.lower()
                    if "controller" in lower_rel:
                        class_meta.is_controller = True
                        model.controllers.append(class_meta)
                    elif "service" in lower_rel:
                        class_meta.is_service = True
                        model.services.append(class_meta)
                    elif "repository" in lower_rel or "dao" in lower_rel:
                        class_meta.is_repository = True
                        model.repositories.append(class_meta)
                    elif "entity" in lower_rel or "model" in lower_rel or "domain" in lower_rel:
                        class_meta.is_entity = True
                        model.entities.append(class_meta)
                    elif "config" in lower_rel:
                        class_meta.is_configuration = True
                        model.configurations.append(class_meta)
                    elif "component" in lower_rel:
                        class_meta.is_component = True
                        model.components.append(class_meta)
                    elif "dto" in lower_rel or "request" in lower_rel or "response" in lower_rel or "vo" in lower_rel:
                        class_meta.is_dto = True
                        model.dtos.append(class_meta)
                    elif "util" in lower_rel or "helper" in lower_rel or "support" in lower_rel:
                        class_meta.is_utility = True
                        model.utilities.append(class_meta)
                    else:
                        model.other_classes.append(class_meta)

    def _parse_java_class(self, file_path: str, src_main_java: str) -> Optional[ClassMeta]:
        """
        Parse a single Java file and extract its metadata.
        Returns None if the file is not a valid Java class/interface.
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Strip single-line and block comments for analysis
            clean_content = re.sub(r"//.*", "", content)
            clean_content = re.sub(r"/\*.*?\*/", "", clean_content, flags=re.DOTALL)

            # Package
            package_match = re.search(r"package\s+([\w\.]+);", clean_content)
            package_name = package_match.group(1) if package_match else ""

            # Imports
            imports = re.findall(r"import\s+([\w\.\*]+);", clean_content)

            # Class/interface/enum declaration
            class_match = re.search(
                r"(?:public|private|protected)?\s*(?:final|abstract|static)?\s*(class|interface|enum|record)\s+(\w+)",
                clean_content,
            )
            if not class_match:
                return None

            type_keyword = class_match.group(1)
            class_name = class_match.group(2)

            # Skip enums and records (records are DTOs)
            if type_keyword == "enum":
                return None

            is_interface = type_keyword == "interface"
            is_enum = type_keyword == "enum"
            is_record = type_keyword == "record"

            # Extract all annotations on the class
            # Find the annotation block before the class declaration
            annotation_pattern = r"@(\w+)(?:\([^)]*\))?"
            all_annotations = re.findall(annotation_pattern, clean_content)

            # Extract class-level annotations (those before the class keyword)
            class_decl_pos = re.search(
                r"(?:public|private|protected)?\s*(?:final|abstract|static)?\s*(?:class|interface|enum|record)\s+\w+",
                clean_content,
            )
            class_level_annotations = []
            if class_decl_pos:
                before_class = clean_content[: class_decl_pos.start()]
                class_level_annotations = re.findall(annotation_pattern, before_class)

            # Superclass
            superclass = None
            extends_match = re.search(r"extends\s+(\w+)", clean_content)
            if extends_match:
                superclass = extends_match.group(1)

            # Interfaces
            interfaces = []
            implements_match = re.search(r"implements\s+([\w\s,]+)\s*\{", clean_content)
            if implements_match:
                iface_str = implements_match.group(1)
                interfaces = [i.strip() for i in iface_str.split(",") if i.strip()]

            # --- Stereotype detection ---

            # Check annotations first (most reliable)
            is_controller = bool(
                set(class_level_annotations) & self.CONTROLLER_ANNOTATIONS
                or "@RestController" in clean_content
                or "@Controller" in clean_content
            )
            is_service = bool(
                "Service" in class_level_annotations
                or "@Service" in clean_content
            )
            is_repository = bool(
                "Repository" in class_level_annotations
                or "@Repository" in clean_content
                or "JpaRepository" in clean_content
                or "CrudRepository" in clean_content
                or "MongoRepository" in clean_content
                or "PagingAndSortingRepository" in clean_content
                or "ReactiveCrudRepository" in clean_content
            )
            is_entity = bool(
                set(class_level_annotations) & self.ENTITY_ANNOTATIONS
                or "@Entity" in clean_content
                or "@Table" in clean_content
                or "@MappedSuperclass" in clean_content
                or "@Embeddable" in clean_content
                or "@Document" in clean_content
            )
            is_configuration = bool(
                "Configuration" in class_level_annotations
                or "SpringBootConfiguration" in class_level_annotations
                or "@Configuration" in clean_content
                or "@SpringBootConfiguration" in clean_content
            )
            is_component = bool(
                "Component" in class_level_annotations
                or "@Component" in clean_content
            )

            # Utility: class name contains Util/Helper, or all methods are static
            is_utility = bool(
                "Util" in class_name
                or "Helper" in class_name
                or "Utils" in class_name
                or "Helpers" in class_name
            )

            # DTO: record type, or class name ends with Dto/Request/Response/VO
            is_dto = bool(
                is_record
                or class_name.endswith("Dto")
                or class_name.endswith("DTO")
                or class_name.endswith("Request")
                or class_name.endswith("Response")
                or class_name.endswith("VO")
                or class_name.endswith("Model")
            )

            # Extract fields (non-primitive, non-core type fields)
            fields = []
            field_pattern = r"(?:@Autowired\s+)?(?:private|protected|public)\s+([A-Z]\w+(?:<[^>]+>)?)\s+(\w+)\s*;"
            core_types = {
                "String", "Integer", "Long", "Double", "Boolean", "Float",
                "int", "long", "double", "boolean", "float", "char", "byte",
                "short", "void", "List", "Map", "Set", "Optional",
                "ArrayList", "HashMap", "HashSet", "LinkedList",
                "Collection", "Iterator", "Stream",
            }
            for field_match in re.finditer(field_pattern, clean_content):
                field_type = field_match.group(1)
                field_name = field_match.group(2)
                # Only include non-core type fields (i.e., custom classes)
                base_type = field_type.split("<")[0].strip()
                if base_type not in core_types:
                    fields.append((field_type, field_name))

            # Extract public methods
            methods = []
            method_pattern = r"public\s+([\w\.<>\[\],\s]+)\s+(\w+)\s*\((.*?)\)\s*(?:throws\s+[\w\.\s,]+)?\s*(?:\{|;)"
            for m_match in re.finditer(method_pattern, clean_content, re.DOTALL):
                ret_type = m_match.group(1).strip()
                method_name = m_match.group(2).strip()

                # Skip constructors
                if method_name == class_name:
                    continue

                params_str = m_match.group(3).strip()
                params = []
                if params_str:
                    # Clean up newlines
                    params_str_clean = params_str.replace("\n", " ").replace("\r", " ")
                    # Remove annotations from params
                    params_str_clean = re.sub(r"@\w+(?:\([^)]*\))?", "", params_str_clean).strip()
                    for param in params_str_clean.split(","):
                        param = param.strip()
                        parts = param.split()
                        if len(parts) >= 2:
                            p_type = " ".join(parts[:-1])
                            p_name = parts[-1]
                            params.append({"type": p_type, "name": p_name})

                methods.append({
                    "name": method_name,
                    "return_type": ret_type,
                    "params": params,
                })

            return ClassMeta(
                file_path=file_path,
                package_name=package_name,
                class_name=class_name,
                is_interface=is_interface,
                is_enum=is_enum,
                is_controller=is_controller,
                is_service=is_service,
                is_repository=is_repository,
                is_entity=is_entity,
                is_configuration=is_configuration,
                is_utility=is_utility,
                is_dto=is_dto,
                is_component=is_component,
                annotations=class_level_annotations,
                fields=fields,
                methods=methods,
                imports=imports,
                superclass=superclass,
                interfaces=interfaces,
            )

        except Exception as e:
            print(f"Error parsing Java class {file_path}: {e}")
            return None

    def _build_package_structure(self, model: ProjectModel) -> None:
        """Build the package structure from analyzed classes"""
        package_map: Dict[str, PackageInfo] = {}

        for class_meta in model.all_classes.values():
            pkg_name = class_meta.package_name
            if not pkg_name:
                continue

            if pkg_name not in package_map:
                # Determine the path from the package name
                pkg_path = pkg_name.replace(".", "/")
                package_map[pkg_name] = PackageInfo(
                    name=pkg_name,
                    path=pkg_path,
                )

            pkg_info = package_map[pkg_name]
            pkg_info.class_count += 1

            # Collect stereotypes in this package
            stereotypes = []
            if class_meta.is_controller:
                stereotypes.append("controller")
            if class_meta.is_service:
                stereotypes.append("service")
            if class_meta.is_repository:
                stereotypes.append("repository")
            if class_meta.is_entity:
                stereotypes.append("entity")
            if class_meta.is_configuration:
                stereotypes.append("configuration")
            if class_meta.is_component:
                stereotypes.append("component")
            if class_meta.is_dto:
                stereotypes.append("dto")
            if class_meta.is_utility:
                stereotypes.append("utility")

            for s in stereotypes:
                if s not in pkg_info.stereotypes:
                    pkg_info.stereotypes.append(s)

        model.packages = list(package_map.values())
        model.package_count = len(model.packages)
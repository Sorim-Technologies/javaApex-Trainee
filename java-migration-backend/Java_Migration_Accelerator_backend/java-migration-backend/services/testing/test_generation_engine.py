import os
import re
from typing import Dict, Any, List, Tuple

class TestGenerationEngine:
    async def generate_tests(self, project_path: str) -> Dict[str, Any]:
        """
        Scans src/main/java, detects classes needing tests, and generates JUnit 5 + Mockito 
        test classes for controllers, services, repositories, and utilities.
        """
        result = {
            "success": True,
            "tests_generated": 0,
            "generated_files": [],
            "message": "No tests needed or generated."
        }

        try:
            src_main_java = None
            for root, dirs, _ in os.walk(project_path):
                if root.replace("\\", "/").endswith("src/main/java"):
                    src_main_java = root
                    break
            
            if not src_main_java:
                # Direct check
                direct_path = os.path.join(project_path, "src", "main", "java")
                if os.path.exists(direct_path):
                    src_main_java = direct_path
                else:
                    result["success"] = False
                    result["message"] = "Could not find src/main/java directory."
                    return result

            # Find all java files in src/main/java
            java_files = []
            for root, _, files in os.walk(src_main_java):
                for file in files:
                    if file.endswith(".java") and not file.endswith("Application.java"):
                        java_files.append(os.path.join(root, file))

            if not java_files:
                result["message"] = "No source Java classes found to test."
                return result

            src_test_java = os.path.join(project_path, "src", "test", "java")
            os.makedirs(src_test_java, exist_ok=True)

            generated_count = 0
            for file_path in java_files[:15]:  # Limit to 15 files to keep build fast
                class_meta = self._parse_java_class(file_path)
                if not class_meta or class_meta.get("is_interface") and not class_meta.get("is_repository"):
                    continue

                # Prepare test path
                rel_path = os.path.relpath(file_path, src_main_java)
                test_file_name = class_meta["class_name"] + "Test.java"
                test_file_rel_path = os.path.join(os.path.dirname(rel_path), test_file_name)
                test_file_path = os.path.join(src_test_java, test_file_rel_path)

                # Skip if test already exists
                if os.path.exists(test_file_path):
                    continue

                os.makedirs(os.path.dirname(test_file_path), exist_ok=True)

                # Generate test code
                test_code = self._generate_test_code(class_meta)
                with open(test_file_path, "w", encoding="utf-8") as f:
                    f.write(test_code)

                generated_count += 1
                result["generated_files"].append(test_file_rel_path)

            result["tests_generated"] = generated_count
            result["message"] = f"Generated {generated_count} JUnit 5 test classes."

        except Exception as e:
            result["success"] = False
            result["message"] = f"Error generating tests: {e}"
            print(f"Error in TestGenerationEngine: {e}")
            import traceback
            traceback.print_exc()

        return result

    def _parse_java_class(self, file_path: str) -> Dict[str, Any]:
        """Parses package, imports, class name, fields, and public methods of a Java file"""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Strip comments
            clean_content = re.sub(r'//.*', '', content)
            clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)

            # Package
            package_match = re.search(r'package\s+([\w\.]+);', clean_content)
            package_name = package_match.group(1) if package_match else ""

            # Imports
            imports = re.findall(r'import\s+([\w\.\*]+);', clean_content)

            # Class annotations (RestController, Service, Repository, etc.)
            class_annotations = re.findall(r'@(\w+)(?:\([^)]*\))?\s*(?:public|private|protected)?\s*(?:final|abstract)?\s*(?:class|interface|enum)\b', clean_content)
            
            # Check for interface/class name
            class_match = re.search(r'(?:public|private|protected)?\s*(?:final|abstract)?\s*(class|interface|enum)\s+(\w+)', clean_content)
            if not class_match:
                return None

            type_keyword = class_match.group(1)
            class_name = class_match.group(2)
            is_interface = type_keyword == "interface"
            is_enum = type_keyword == "enum"

            if is_enum:
                return None

            is_repository = "Repository" in class_name or "Repository" in class_annotations or "JpaRepository" in clean_content or "CrudRepository" in clean_content
            is_controller = "RestController" in class_annotations or "Controller" in class_annotations or "Controller" in class_name
            is_service = "Service" in class_annotations or "Service" in class_name
            is_entity = "Entity" in class_annotations or "Entity" in class_name or "@Entity" in clean_content or "@Table" in clean_content
            is_configuration = "Configuration" in class_annotations or "Configuration" in class_name or "@Configuration" in clean_content
            is_utility = "Util" in class_name or "Helper" in class_name
            is_dto = "Dto" in class_name or "Request" in class_name or "Response" in class_name or "Record" in type_keyword

            # Extract fields (dependencies to mock)
            fields = []
            # Matches declarations like "private UserService userService;" or "@Autowired private UserRepository repo;"
            field_pattern = r'(?:@Autowired\s+)?(?:private|protected|public)\s+([A-Z]\w+(?:<[^>]+>)?)\s+(\w+)\s*;'
            for field_match in re.finditer(field_pattern, clean_content):
                field_type = field_match.group(1)
                field_name = field_match.group(2)
                
                # Filter out primitives and standard wrappers / collections
                core_types = ["String", "Integer", "Long", "Double", "Boolean", "Float", "List", "Map", "Set", "Optional", "int", "long", "double", "boolean"]
                if not any(core_type in field_type for core_type in core_types):
                    fields.append((field_type, field_name))

            # Extract public methods
            methods = []
            method_pattern = r'public\s+([\w\.<>\[\]]+)\s+(\w+)\s*\((.*?)\)\s*(?:throws\s+[\w\.\s,]+)?\s*(?:\{|;)'
            for m_match in re.finditer(method_pattern, clean_content, flags=re.DOTALL):
                ret_type = m_match.group(1)
                method_name = m_match.group(2)
                params_str = m_match.group(3)
                
                # Skip constructor
                if method_name == class_name:
                    continue

                # Parse parameters
                params = []
                if params_str.strip():
                    params_str_clean = params_str.replace('\n', ' ').replace('\r', ' ')
                    for param in params_str_clean.split(","):
                        param = param.strip()
                        param_no_anno = re.sub(r'@\w+(?:\([^)]*\))?', '', param).strip()
                        parts = param_no_anno.split()
                        if len(parts) >= 2:
                            p_type = parts[-2]
                            p_name = parts[-1]
                            params.append((p_type, p_name))

                methods.append({
                    "name": method_name,
                    "return_type": ret_type,
                    "params": params
                })

            return {
                "package_name": package_name,
                "imports": imports,
                "class_name": class_name,
                "is_interface": is_interface,
                "is_repository": is_repository,
                "is_controller": is_controller,
                "is_service": is_service,
                "is_entity": is_entity,
                "is_configuration": is_configuration,
                "is_utility": is_utility,
                "is_dto": is_dto,
                "fields": fields,
                "methods": methods
            }

        except Exception as e:
            print(f"Error parsing Java class {file_path}: {e}")
            return None

    def _generate_test_code(self, class_meta: Dict[str, Any]) -> str:
        """Generates JUnit 5 and Mockito test source code for a class"""
        from services.testing.test_code_generator import TestCodeGenerator
        return TestCodeGenerator.generate_test_code(class_meta)

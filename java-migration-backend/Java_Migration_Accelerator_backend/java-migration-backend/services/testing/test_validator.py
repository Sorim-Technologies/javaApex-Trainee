import re
from typing import Dict, Any

class TestValidator:
    def clean_and_validate(self, generated_code: str, class_name: str, class_meta: Dict[str, Any] = None) -> str:
        """
        Cleans the generated text of markdown wrappers and verifies basic Java class structure.
        Rejects code containing placeholder assertions like assertTrue(true).
        """
        if not generated_code:
            return ""

        code = generated_code.strip()
        
        # 1. Strip markdown fences if present
        markdown_match = re.search(r"```(?:java)?\s*([\s\S]*?)```", code)
        if markdown_match:
            code = markdown_match.group(1).strip()
        elif code.startswith("```"):
            code = re.sub(r"^```[a-zA-Z]*\n", "", code)
            code = re.sub(r"\n```$", "", code)
            code = code.strip()

        # 2. Extract code block if it is still embedded in explanations
        if "package " not in code and "import " not in code and "class " not in code:
            java_block_match = re.search(r"class\s+\w+Test\s*\{[\s\S]*\}", code)
            if java_block_match:
                code = java_block_match.group(0)

        # Pre-check if class name exists before doing other things
        if "class " not in code:
            class_match = re.search(r"(?:public\s+)?class\s+\w+Test\b[\s\S]*", code)
            if class_match:
                code = class_match.group(0).strip()

        # 3. Check basic compilation readiness constraints
        has_class = "class " in code
        has_test = "@Test" in code or "test" in code.lower()

        if not has_class or not has_test:
            print(f"Validation failed for generated test class {class_name}Test: missing class or test methods.")
            return ""

        expected_class = rf"(?:public\s+)?class\s+{re.escape(class_name)}Test\b"
        if not re.search(expected_class, code):
            print(f"Validation failed for generated test class {class_name}Test: wrong class name.")
            return ""

        required_markers = ("@BeforeEach", "@ExtendWith(MockitoExtension.class)", "@Mock", "@InjectMocks")
        if any(marker not in code for marker in required_markers):
            print(f"Validation failed for {class_name}Test: missing required JUnit/Mockito setup.")
            return ""

        # 4. REJECT placeholder assertions - this is critical for quality
        placeholder_patterns = [
            r'assertTrue\s*\(\s*true\s*\)',
            r'assertTrue\s*\(\s*Boolean\.TRUE\s*\)',
            r'assertEquals\s*\(\s*true\s*,\s*true\s*\)',
            r'assertEquals\s*\(\s*Boolean\.TRUE\s*,\s*Boolean\.TRUE\s*\)',
            r'assertFalse\s*\(\s*false\s*\)',
            r'assertFalse\s*\(\s*Boolean\.FALSE\s*\)',
        ]
        for pattern in placeholder_patterns:
            if re.search(pattern, code):
                print(f"Validation failed for {class_name}Test: contains placeholder assertion '{pattern}'")
                return ""

        if re.search(r'\bTODO\b', code, flags=re.IGNORECASE):
            print(f"Validation failed for {class_name}Test: contains TODO placeholder.")
            return ""

        # 5. Check for TODO or empty method bodies
        if re.search(r'@Test\s*\n\s*(public\s+)?void\s+\w+\s*\(\s*\)\s*\{\s*\}', code):
            print(f"Validation failed for {class_name}Test: contains empty test method")
            return ""

        # Prepend package declaration if absent but meta provides it
        if class_meta:
            package_name = getattr(class_meta, "package_name", None)
            if package_name and "package " not in code:
                code = f"package {package_name};\n\n" + code

        # Basic brace fixing if trailing is missing
        open_braces = code.count("{")
        close_braces = code.count("}")
        if open_braces > close_braces:
            code += "\n" + "}" * (open_braces - close_braces)

        return code
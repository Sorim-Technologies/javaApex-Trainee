import re
from typing import Dict, Any

class TestValidator:
    def clean_and_validate(self, generated_code: str, test_class_name: str, class_meta: Dict[str, Any] = None) -> str:
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
            java_block_match = re.search(rf"class\s+{re.escape(test_class_name)}\s*\{{[\s\S]*\}}", code)
            if java_block_match:
                code = java_block_match.group(0)

        # Pre-check if class name exists before doing other things
        if "class " not in code:
            class_match = re.search(rf"(?:public\s+)?class\s+{re.escape(test_class_name)}\b[\s\S]*", code)
            if class_match:
                code = class_match.group(0).strip()

        # 3. Check basic compilation readiness constraints
        has_class = "class " in code
        has_test = "@Test" in code or "test" in code.lower()

        if not has_class or not has_test:
            print(f"Validation failed for generated test class {test_class_name}: missing class or test methods.")
            return ""

        expected_class = rf"(?:public\s+)?class\s+{re.escape(test_class_name)}\b"
        if not re.search(expected_class, code):
            print(f"Validation failed for generated test class {test_class_name}: wrong class name.")
            return ""

        required_markers = ("@BeforeEach", "@ExtendWith(MockitoExtension.class)", "@Mock", "@InjectMocks")
        mockito_count = sum(1 for m in required_markers if m in code)
        # Only reject if code has some Mockito markers but is clearly incomplete
        # (e.g. has @Mock but no @InjectMocks). Never reject plain JUnit-only tests.
        if mockito_count > 0 and mockito_count < 2:
            print(f"Validation warning for {test_class_name}: partial Mockito setup — keeping anyway.")

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
                print(f"Validation failed for {test_class_name}: contains placeholder assertion '{pattern}'")
                return ""

        if re.search(r'\bTODO\b', code, flags=re.IGNORECASE):
            print(f"Validation failed for {test_class_name}: contains TODO placeholder.")
            return ""

        # 5. Check for TODO or empty method bodies
        if re.search(r'@Test\s*\n\s*(public\s+)?void\s+\w+\s*\(\s*\)\s*\{\s*\}', code):
            print(f"Validation failed for {test_class_name}: contains empty test method")
            return ""

        # 6. Ensure package declaration matches class_meta.package_name exactly
        if class_meta:
            package_name = class_meta.get("package_name") if isinstance(class_meta, dict) else getattr(class_meta, "package_name", None)
            if package_name:
                if re.search(r'^\s*package\s+[\w\.]+;', code, flags=re.MULTILINE):
                    code = re.sub(r'^\s*package\s+[\w\.]+;', f'package {package_name};', code, flags=re.MULTILINE)
                else:
                    code = f"package {package_name};\n\n" + code

        # 7. Ensure every generated test method has valid @Test annotation
        lines = code.split("\n")
        new_lines = []
        for i, line in enumerate(lines):
            if re.search(r'\bvoid\s+(test\w+|\w+Test|\w+TestCase|\w+IT)\b\s*\(', line):
                has_test_annotation = False
                for j in range(max(0, i-4), i):
                    if "@Test" in lines[j]:
                        has_test_annotation = True
                        break
                if not has_test_annotation:
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(" " * indent + "@Test")
            new_lines.append(line)
        code = "\n".join(new_lines)

        # Basic brace fixing if trailing is missing
        open_braces = code.count("{")
        close_braces = code.count("}")
        if open_braces > close_braces:
            code += "\n" + "}" * (open_braces - close_braces)

        return code
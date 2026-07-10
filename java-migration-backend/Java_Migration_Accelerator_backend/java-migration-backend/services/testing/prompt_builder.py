import re
from typing import Dict, Any

class PromptBuilder:
    def build_prompt(self, java_source: str, class_name: str, class_meta: Any = None,
                     test_class_name: str = "", uncovered_methods: Any = None) -> str:
        """
        Builds an advanced prompt to send to Gemini to generate a production-grade JUnit 5 + Mockito test class.
        The prompt explicitly forbids placeholder assertions and requires complete implementations.
        """
        package_name = ""
        imports_list = []
        annotations_list = []
        fields_list = []
        methods_list = []
        constructors_list = []

        if class_meta:
            package_name = getattr(class_meta, "package_name", "") or ""
            imports_list = getattr(class_meta, "imports", []) or []
            annotations_list = getattr(class_meta, "annotations", []) or []
            fields_list = getattr(class_meta, "fields", []) or []
            methods_meta = getattr(class_meta, "methods", []) or []

            # 4. Extract Constructors
            constructor_pattern = r'public\s+' + re.escape(class_name) + r'\s*\((.*?)\)\s*(?:throws\s+[\w\.\s,]+)?\s*\{'
            for match in re.finditer(constructor_pattern, java_source):
                params = match.group(1).strip()
                constructors_list.append(f"public {class_name}({params})")
            
            # Default fallback if no explicit constructor is found in code (implicit default constructor)
            if not constructors_list:
                constructors_list.append(f"public {class_name}() [default no-arg constructor]")

            # 6-9. Extract Method Details (signatures, return types, exceptions)
            for m in methods_meta:
                m_name = m.get("name", "")
                m_ret = m.get("return_type", "void")
                m_params = m.get("params", [])
                
                # Format parameters for signature
                params_formatted = []
                for p in m_params:
                    if isinstance(p, dict):
                        params_formatted.append(f"{p.get('type')} {p.get('name')}")
                    elif isinstance(p, tuple) and len(p) == 2:
                        params_formatted.append(f"{p[0]} {p[1]}")
                params_str = ", ".join(params_formatted)
                
                # Search source to find throws clause and method annotations
                method_regex = r'(?:(@\w+(?:\([^)]*\))?)\s*)*(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?' + re.escape(m_ret) + r'\s+' + re.escape(m_name) + r'\s*\((.*?)\)\s*(?:throws\s+([\w\.\s,]+))?\s*(?:\{|;)'
                m_match = re.search(method_regex, java_source, re.DOTALL)
                
                exceptions = []
                method_annotations = []
                if m_match:
                    if m_match.group(1):
                        method_annotations.append(m_match.group(1).strip())
                    if m_match.group(3):
                        exceptions = [e.strip() for e in m_match.group(3).split(",") if e.strip()]
                
                methods_list.append({
                    "name": m_name,
                    "return_type": m_ret,
                    "signature": f"public {m_ret} {m_name}({params_str})",
                    "exceptions": exceptions,
                    "annotations": method_annotations
                })

        # Format metadata for Gemini Input
        meta_section = f"""
=== METADATA INPUT FOR TEST GENERATION ===
1. Package Name: {package_name if package_name else "default (none)"}

2. Imports:
{chr(10).join(['   - ' + imp for imp in imports_list]) if imports_list else '   - None detected'}

4. Constructors:
{chr(10).join(['   - ' + c for c in constructors_list]) if constructors_list else '   - Default No-Arg Constructor'}

5. Dependencies to Mock:
{chr(10).join([f'   - {t} {n}' for t, n in fields_list]) if fields_list else '   - None detected'}

6. Public Methods:
{chr(10).join(['   - ' + m['name'] for m in methods_list]) if methods_list else '   - None detected'}

7. Method Signatures:
{chr(10).join(['   - ' + m['signature'] for m in methods_list]) if methods_list else '   - None detected'}

8. Return Types:
{chr(10).join([f"   - {m['name']}: {m['return_type']}" for m in methods_list]) if methods_list else '   - None/Void'}

9. Exceptions:
{chr(10).join([f"   - {m['name']}: throws {', '.join(m['exceptions'])}" if m['exceptions'] else f"   - {m['name']}: throws none" for m in methods_list]) if methods_list else '   - None/No exceptions thrown'}

10. Annotations:
{chr(10).join(['   - ' + a for a in annotations_list]) if annotations_list else '   - None detected'}
"""

        requested_test_class = test_class_name or f"{class_name}Test"
        uncovered_section = ", ".join(uncovered_methods or []) or "all public methods"
        return f"""You are a Senior Java Test Automation Engineer. Your task is to generate a COMPLETE, COMPILABLE JUnit 5 + Mockito test class with MAXIMUM code coverage.

=== CRITICAL RULES - YOU MUST FOLLOW THESE ===
1. NEVER generate placeholder assertions such as `assertTrue(true);`, `assertFalse(false);`, or any trivial comparisons.
2. NEVER generate `TODO` comments, empty test methods, or commented-out method calls.
3. Every test method MUST invoke the actual production method under test on the target instance.
4. Mock every dependency and REST client automatically using Mockito.
5. Every generated test must verify behavior using assertions like `assertEquals`, `assertThrows`, `assertNotNull`, and Mockito verifications like `verify()` and `verifyNoInteractions()`.
6. Generate unit tests covering: positive scenarios, negative scenarios, exception/error paths, null validation/safety checks, boundary values, and edge cases.
7. Return ONLY the compilable Java source code. No explanations. No markdown. No introductory text. Start directly with the package declaration.
8. The test must include @BeforeEach, @ExtendWith(MockitoExtension.class), at least one @Mock, and @InjectMocks.
9. Use assertEquals, assertTrue, assertFalse, assertThrows, assertNotNull, and verify() where meaningful for production behavior.

{meta_section}

3. Complete Java Source:
```java
{java_source}
```

=== TEST REQUIREMENTS ===
- Test class name: {requested_test_class}
- Frameworks: JUnit Jupiter (JUnit 5) and Mockito
- Use `@ExtendWith(MockitoExtension.class)` on the test class
- Use `@Mock` for all dependency fields
- Use `@InjectMocks` for the class under test
- Use `@BeforeEach` for setup and data initialization
- Include proper package declaration and imports for all referenced types
- Prioritize these uncovered public methods: {uncovered_section}
"""
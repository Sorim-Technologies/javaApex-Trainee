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
            
            # Constructors
            raw_constructors = getattr(class_meta, "constructors", []) or []
            for constr in raw_constructors:
                c_name = constr.get("name", "")
                c_params = constr.get("params", [])
                c_exceptions = constr.get("exceptions", [])
                c_annotations = constr.get("annotations", [])
                
                params_str = ", ".join(f"{p.get('type')} {p.get('name')}" for p in c_params)
                annotations_str = " ".join(f"@{a}" for a in c_annotations)
                exceptions_str = f" throws {', '.join(c_exceptions)}" if c_exceptions else ""
                
                constructors_list.append(f"{annotations_str} public {c_name}({params_str}){exceptions_str}".strip())
                
            if not constructors_list:
                constructors_list.append(f"public {class_name}() [default no-arg constructor]")
                
            # Dependencies to Mock
            autowired_deps = getattr(class_meta, "autowired_dependencies", []) or []
            for dep in autowired_deps:
                fields_list.append((dep.get("type", ""), dep.get("name", "")))
                
            # Fallback to fields if autowired_dependencies is empty
            if not fields_list:
                raw_fields = getattr(class_meta, "fields", []) or []
                for field_item in raw_fields:
                    if isinstance(field_item, tuple) and len(field_item) == 2:
                        fields_list.append(field_item)

            # Methods
            raw_methods = getattr(class_meta, "methods", []) or []
            for m in raw_methods:
                m_name = m.get("name", "")
                m_ret = m.get("return_type", "void")
                m_params = m.get("params", [])
                m_exceptions = m.get("exceptions", [])
                m_annotations = m.get("annotations", [])
                
                params_str = ", ".join(f"{p.get('type')} {p.get('name')}" for p in m_params)
                annotations_str = " ".join(f"@{a}" for a in m_annotations)
                exceptions_str = f" throws {', '.join(m_exceptions)}" if m_exceptions else ""
                
                methods_list.append({
                    "name": m_name,
                    "return_type": m_ret,
                    "signature": f"{annotations_str} public {m_ret} {m_name}({params_str}){exceptions_str}".strip(),
                    "exceptions": m_exceptions,
                    "annotations": m_annotations
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
5. Every generated test must verify behavior using assertions like `assertEquals`, `assertThrows`, `assertNotNull`, and Mockito verifications like `verify()` and `verifyNoMoreInteractions()`.
6. Generate unit tests covering: positive scenarios, negative scenarios, exception/error paths, null validation/safety checks, boundary values, and edge cases.
7. Return ONLY the compilable Java source code. No explanations. No markdown. No introductory text. Start directly with the package declaration.
8. The test must include `@ExtendWith(MockitoExtension.class)` on the test class, `@Mock` for all dependency fields, `@InjectMocks` for the class under test, and `@BeforeEach` for setup and data initialization.
9. Structure every test method following the Arrange-Act-Assert pattern.
10. Ensure every test method contains a complete implementation.

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
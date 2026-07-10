import os
import re
import asyncio
from typing import Dict, Any, Optional, List

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

import httpx


# Valid Gemini model names (ordered by preference)
GEMINI_MODELS: List[str] = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]


class GeminiClient:
    """
    Secure Gemini-only test generation client.
    Read API key strictly from GEMINI_API_KEY.
    Send one class at a time, never send entire repository.
    """
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.max_retries = max(1, int(os.getenv('GEMINI_MAX_RETRIES', '3')))
        self.request_timeout_seconds = float(os.getenv('GEMINI_REQUEST_TIMEOUT_SECONDS', '90'))
        self.base_retry_delay_seconds = float(os.getenv('GEMINI_RETRY_DELAY_SECONDS', '5'))

    def _is_retryable_error(self, err_str: str) -> bool:
        return any(token in err_str for token in ["429", "quota", "rate limit", "resource", "temporarily", "timeout", "timed out", "connection", "503", "500", "retry"])

    async def _sleep_with_backoff(self, attempt_idx: int, caller_label: str, model_name: str) -> None:
        wait = self.base_retry_delay_seconds * (2 ** attempt_idx)
        print(f"[{caller_label}] Retryable error for {model_name}. Waiting {wait}s before retry...")
        await asyncio.sleep(wait)

    async def _call_gemini(self, prompt: str, caller_label: str = "gemini") -> Optional[str]:
        """
        Tries every model in GEMINI_MODELS via the SDK first, then falls
        back to the REST API.  On a 429 / 503 it waits with exponential
        back-off before trying the next model.
        Returns the raw text content or None.
        """
        if not self.api_key:
            return None

        # ---------- 1. Official SDK path ----------
        if HAS_GENAI:
            for model_name in GEMINI_MODELS:
                for attempt_idx in range(self.max_retries):
                    try:
                        print(f"[{caller_label}] SDK -> {model_name} (attempt {attempt_idx + 1}/{self.max_retries})")
                        genai.configure(api_key=self.api_key)
                        model = genai.GenerativeModel(model_name)
                        loop = asyncio.get_event_loop()
                        response = await asyncio.wait_for(
                            loop.run_in_executor(None, lambda m=model: m.generate_content(prompt)),
                            timeout=self.request_timeout_seconds,
                        )
                        if response and response.text:
                            print(f"[{caller_label}] Gemini response received from {model_name}")
                            return response.text
                        break
                    except asyncio.TimeoutError:
                        print(f"[{caller_label}] SDK request timed out for {model_name} after {self.request_timeout_seconds}s")
                    except Exception as e:
                        err_str = str(e).lower()
                        print(f"[{caller_label}] SDK error with {model_name}: {e}")
                        if self._is_retryable_error(err_str) and attempt_idx < self.max_retries - 1:
                            await self._sleep_with_backoff(attempt_idx, caller_label, model_name)
                            continue
                        break

        # ---------- 2. HTTP REST fallback ----------
        for model_name in GEMINI_MODELS:
            for attempt_idx in range(self.max_retries):
                try:
                    print(f"[{caller_label}] HTTP -> {model_name} (attempt {attempt_idx + 1}/{self.max_retries})")
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{model_name}:generateContent?key={self.api_key}"
                    )
                    headers = {"content-type": "application/json"}
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}

                    async with httpx.AsyncClient(timeout=self.request_timeout_seconds) as client:
                        resp = await asyncio.wait_for(
                            client.post(url, headers=headers, json=payload),
                            timeout=self.request_timeout_seconds,
                        )

                        if resp.status_code in {429, 500, 502, 503, 504}:
                            if attempt_idx < self.max_retries - 1:
                                await self._sleep_with_backoff(attempt_idx, caller_label, model_name)
                                continue
                            print(f"[{caller_label}] Exhausted retries for {model_name} after HTTP {resp.status_code}")
                            break

                        resp.raise_for_status()
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        if text:
                            print(f"[{caller_label}] Gemini response received from {model_name}")
                            return text
                        break

                except asyncio.TimeoutError:
                    print(f"[{caller_label}] HTTP request timed out for {model_name} after {self.request_timeout_seconds}s")
                    if attempt_idx < self.max_retries - 1:
                        await self._sleep_with_backoff(attempt_idx, caller_label, model_name)
                        continue
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    print(f"[{caller_label}] HTTP error with {model_name}: {e}")
                    if self._is_retryable_error(err_str) and attempt_idx < self.max_retries - 1:
                        await self._sleep_with_backoff(attempt_idx, caller_label, model_name)
                        continue
                    break

        return None

    # ------------------------------------------------------------------ #
    #  Public API: generate_test                                          #
    # ------------------------------------------------------------------ #
    async def generate_test(self, prompt: str, class_meta: Dict[str, Any]) -> str:
        """
        Sends the prompt to the configured Google Gemini API to generate a JUnit test.
        Tests are never synthesized locally: generated repository code must use Gemini.
        """
        raw = await self._call_gemini(prompt, caller_label="generate_test")
        if raw:
            cleaned_code = self._clean_generated_code(raw)
            cleaned = self._clean_and_strict_validate(cleaned_code, class_meta)
            if cleaned:
                return cleaned

        return ""

    # ------------------------------------------------------------------ #
    #  Public API: fix_compilation_errors (for generated tests)           #
    # ------------------------------------------------------------------ #
    async def fix_compilation_errors(
        self,
        generated_test: str,
        compiler_errors: str,
        production_source: Optional[str] = None,
        class_meta: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Send only the failing generated test and compiler diagnostics to Gemini."""
        if not self.api_key:
            return None

        prod_section = ""
        if production_source:
            prod_section = f"\n=== PRODUCTION SOURCE CLASS ===\n```java\n{production_source}\n```\n"

        fix_prompt = f"""You are a Java compilation error correction tool. Fix ONLY the compilation errors. Do NOT change the test logic or assertions.
Return the COMPLETE fixed test class.
{prod_section}
=== GENERATED TEST CLASS (HAS ERRORS) ===
```java
{generated_test}
```

=== COMPILER ERRORS ===
{compiler_errors}

=== INSTRUCTIONS ===
1. Fix ONLY the compilation errors listed above
2. Do NOT change test logic, assertions, or add new tests
3. Ensure all imports are correct
4. Fix any type mismatches, missing imports, or syntax errors
5. Return ONLY the fixed Java source code. No markdown. No explanations.
"""

        raw = await self._call_gemini(fix_prompt, caller_label="fix_compilation_errors")
        if raw:
            cleaned = self._clean_generated_code(raw)
            if cleaned:
                return cleaned
        return None

    # ------------------------------------------------------------------ #
    #  Public API: fix_source_compilation_errors (for production sources) #
    # ------------------------------------------------------------------ #
    async def fix_source_compilation_errors(
        self,
        source_code: str,
        compiler_errors: str,
        java_version: str
    ) -> Optional[str]:
        """
        Sends the Java source file with its compilation errors and target Java version back to Gemini for fixing.
        """
        if not self.api_key:
            return None

        fix_prompt = f"""You are an expert Java compiler error repair assistant.
Your task is to fix the compilation errors in the following Java source file.
Ensure the repaired code compiles successfully using Java version {java_version}.

=== BROKEN JAVA SOURCE FILE ===
```java
{source_code}
```

=== COMPILER ERRORS ===
{compiler_errors}

=== INSTRUCTIONS ===
1. Repair ONLY the issues causing the compilation errors.
2. Maintain all business logic, variable names, classes, methods, and logic intact.
3. Ensure all imports are correct and present.
4. Do NOT write explanations, markdown syntax, or extra characters.
5. Return ONLY the complete, corrected Java source code starting directly with the package declaration or imports.
"""

        raw = await self._call_gemini(fix_prompt, caller_label="fix_source_compilation_errors")
        if raw:
            cleaned = self._clean_generated_code(raw)
            if cleaned:
                return cleaned
        return None

    # ------------------------------------------------------------------ #
    #  Validation helpers                                                 #
    # ------------------------------------------------------------------ #
    def _clean_and_strict_validate(self, code: str, class_meta: Dict[str, Any]) -> str:
        """Strict validation against placeholder junk and non-Java content."""
        if not code:
            return ""

        # Reject markdown / prose leakage
        lowered = code.strip().lower()
        if lowered.startswith("here is") or lowered.startswith("sure") or "```" in lowered or "```" in code:
            return ""

        # Must be Java-like enough to proceed
        if "class " not in code or ("package " not in code and "import " not in code):
            return ""

        return code

    def _clean_generated_code(self, code: str) -> str:
        """Cleans code of markdown formatting and extra prose."""
        if not code:
            return ""
        code = code.strip()
        markdown_match = re.search(r"```(?:java)?\s*([\s\S]*?)```", code)
        if markdown_match:
            code = markdown_match.group(1).strip()
        else:
            code = re.sub(r"^```[a-zA-Z]*\n", "", code)
            code = re.sub(r"\n```$", "", code)
            code = code.strip()
        return code

    def _generate_fallback_test(self, class_meta: Dict[str, Any]) -> str:
        """
        Generates a perfect, fully-compilable JUnit 5 + Mockito Java class 
        programmatically based on the class metadata.
        """
        from services.testing.test_code_generator import TestCodeGenerator
        return TestCodeGenerator.generate_test_code(class_meta)

    async def generate_additional_test_methods(
        self,
        production_source: str,
        existing_test_source: str,
        uncovered_methods: List[str],
        class_meta: Dict[str, Any]
    ) -> str:
        """
        Sends a prompt to Gemini requesting JUnit 5 test methods ONLY for the uncovered methods
        of a class, while referencing the existing test class code.
        """
        if not self.api_key:
            return ""

        prompt = f"""You are a Senior Java Test Automation Architect.
We have an existing test class and we need to add unit test methods ONLY for the uncovered public methods in the production class.

=== PRODUCTION CLASS SOURCE ===
```java
{production_source}
```

=== EXISTING TEST CLASS SOURCE ===
```java
{existing_test_source}
```

=== UNCOVERED PUBLIC METHODS TO TEST ===
{", ".join(uncovered_methods)}

=== CRITICAL RULES ===
1. Generate test methods ONLY for the uncovered public methods listed above.
2. Do NOT duplicate any existing test methods from the existing test class.
3. Use JUnit 5 annotations (`@Test`, etc.).
4. Use Mockito where required. Inject/reuse any existing mocks defined in the test class.
5. Return the new test methods and any additional imports needed.
6. Format your output strictly using two sections as shown below:
// IMPORTS
<any additional import statements needed, or leave blank if none>
// TEST METHODS
<the new test methods code>

Do NOT wrap the entire output in a class definition. Do NOT write explanations, introductory text, or markdown blocks (like ```java ... ```). Start directly with // IMPORTS.
"""
        raw = await self._call_gemini(prompt, caller_label="generate_additional_tests")
        return raw or ""
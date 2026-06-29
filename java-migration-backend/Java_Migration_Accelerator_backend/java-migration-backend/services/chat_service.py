import asyncio
import os
import json
import logging
import re
import ast
import operator
from dataclasses import dataclass, field
from time import perf_counter
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


@dataclass
class ProviderAttempt:
    provider: str
    model: str
    success: bool
    latency_ms: int
    detail: str


@dataclass
class LLMCallResult:
    reply: str
    provider: str
    model: str
    total_latency_ms: int
    attempts: list[ProviderAttempt] = field(default_factory=list)


@dataclass
class ChatTraceResult:
    reply: str
    intent: str
    provider: str
    model: str
    total_latency_ms: int
    failed: bool = False
    attempts: list[ProviderAttempt] = field(default_factory=list)

    @property
    def used_fallback(self) -> bool:
        return len(self.attempts) > 1


class LLMProviderChainError(RuntimeError):
    def __init__(self, attempts: list[ProviderAttempt]):
        self.attempts = attempts
        parts = [
            f"{attempt.provider}:{attempt.detail}"
            for attempt in attempts
        ] or ["No providers were attempted."]
        super().__init__("All configured LLM providers failed. " + " | ".join(parts))


class ChatService:
    """Chat service that sends normal chat questions through the configured LLM."""

    def __init__(self):
        self.groq_token = os.getenv("GROQ_API_KEY", "").strip()
        if not self.groq_token:
            self.groq_token = os.getenv("GROK_TOKEN", "").strip()
        # Keep OpenAI-style env aliases as a convenience for OpenAI-compatible providers.
        if not self.groq_token:
            self.groq_token = os.getenv("OPENAI_API_KEY", "") or os.getenv("OPENAI_KEY", "")
        self.groq_token = (self.groq_token or "").strip()
        self.hf_token = os.getenv("HF_TOKEN", "").strip()
        self.provider = self._normalize_provider_name(os.getenv("CHAT_PROVIDER", "chain")) or "chain"
        self.provider_order = self._parse_provider_order(
            os.getenv("LLM_PROVIDER_ORDER", "ollama,hf,groq"),
        )
        self.groq_model = (
            os.getenv("GROQ_MODEL", os.getenv("GROK_MODEL", "openai/gpt-oss-20b")).strip()
            or "openai/gpt-oss-20b"
        )
        self.hf_model = (
            os.getenv("HF_CHAT_MODEL", "openai/gpt-oss-120b:cerebras").strip()
            or "openai/gpt-oss-120b:cerebras"
        )
        self.ollama_model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        self.groq_api_base = (
            os.getenv("GROQ_API_BASE", os.getenv("GROK_API_BASE", "https://api.groq.com/openai/v1")).strip()
            or "https://api.groq.com/openai/v1"
        )
        self.hf_api_base = os.getenv("HF_API_BASE", "https://router.huggingface.co/v1").strip() or "https://router.huggingface.co/v1"
        self.ollama_api_base = os.getenv("OLLAMA_API_BASE", "http://127.0.0.1:11434/v1")
        self.ollama_keep_alive = os.getenv("OLLAMA_KEEP_ALIVE", "30m").strip() or "30m"
        timeout_raw = (os.getenv("OLLAMA_TIMEOUT_SECONDS", "120") or "120").strip()
        try:
            self.ollama_timeout_seconds = max(30.0, float(timeout_raw))
        except ValueError:
            self.ollama_timeout_seconds = 120.0

    def _normalize_provider_name(self, provider: Optional[str]) -> Optional[str]:
        normalized = (provider or "").strip().lower()
        aliases = {
            "auto": "chain",
            "chain": "chain",
            "default": "chain",
            "multi": "chain",
            "ollama": "ollama",
            "hf": "hf",
            "huggingface": "hf",
            "hugging_face": "hf",
            "groq": "groq",
            "grok": "groq",
            "openai": "groq",
            "openai_compat": "groq",
        }
        return aliases.get(normalized)

    def _parse_provider_order(self, provider_order: Optional[str]) -> list[str]:
        selected: list[str] = []
        for raw_name in (provider_order or "").split(","):
            normalized = self._normalize_provider_name(raw_name)
            if normalized in {"ollama", "hf", "groq"} and normalized not in selected:
                selected.append(normalized)
        return selected or ["ollama", "hf", "groq"]

    def _selected_providers(self) -> list[str]:
        if self.provider in {"ollama", "hf", "groq"}:
            return [self.provider]
        return self.provider_order

    def _provider_label(self, provider: str) -> str:
        return {
            "ollama": "Ollama",
            "hf": "Hugging Face",
            "groq": "Groq",
        }.get(provider, provider)

    def _configured_model_for(self, provider: str) -> str:
        return {
            "ollama": self.ollama_model,
            "hf": self.hf_model,
            "groq": self.groq_model,
        }.get(provider, "unknown")

    def _build_chat_messages(self, message: str) -> list[dict]:
        return [
            {
                "role": "system",
                "content": (
                    "You are a senior Java migration assistant. "
                    "Answer directly, naturally, and with practical migration guidance."
                ),
            },
            {"role": "user", "content": message},
        ]

    def _build_chat_completions_endpoint(self, api_base: str) -> str:
        base = (api_base or "").rstrip("/")
        if not base:
            raise RuntimeError("The provider API base URL is not configured.")
        if base.endswith("/chat/completions"):
            return base
        if base.endswith("/v1"):
            return f"{base}/chat/completions"
        return f"{base}/v1/chat/completions"

    async def _get_provider_status(self, provider: str) -> dict:
        if provider == "ollama":
            try:
                available_models = await self._fetch_ollama_models()
                installed = [
                    item.get("id") or item.get("name") or item.get("model")
                    for item in available_models
                    if isinstance(item, dict)
                ]
                installed = [model for model in installed if model]
                active_model = self.ollama_model if self.ollama_model in installed else None
                return {
                    "provider": "ollama",
                    "label": self._provider_label("ollama"),
                    "ready": active_model is not None,
                    "configured_model": self.ollama_model,
                    "active_model": active_model,
                    "installed_models": installed,
                    "detail": (
                        f"Ollama ready with model '{active_model}'."
                        if active_model
                        else f"Ollama is reachable, but model '{self.ollama_model}' is not installed."
                    ),
                }
            except Exception as exc:
                return {
                    "provider": "ollama",
                    "label": self._provider_label("ollama"),
                    "ready": False,
                    "configured_model": self.ollama_model,
                    "active_model": None,
                    "installed_models": [],
                    "detail": f"Ollama is not reachable: {exc}",
                }

        if provider == "hf":
            return {
                "provider": "hf",
                "label": self._provider_label("hf"),
                "ready": bool(self.hf_token),
                "configured_model": self.hf_model,
                "detail": (
                    "Hugging Face token is configured."
                    if self.hf_token
                    else "HF_TOKEN is not configured."
                ),
            }

        if provider == "groq":
            return {
                "provider": "groq",
                "label": self._provider_label("groq"),
                "ready": bool(self.groq_token),
                "configured_model": self.groq_model,
                "detail": (
                    "Groq API key is configured."
                    if self.groq_token
                    else "GROQ_API_KEY or GROK_TOKEN is not configured."
                ),
            }

        return {
            "provider": provider,
            "label": provider,
            "ready": False,
            "configured_model": None,
            "detail": f"Unknown provider '{provider}'.",
        }

    async def get_llm_status(self) -> dict:
        selected = self._selected_providers()
        provider_statuses = [await self._get_provider_status(provider) for provider in selected]

        if len(provider_statuses) == 1:
            return provider_statuses[0]

        active_provider = next((item for item in provider_statuses if item.get("ready")), None)
        provider_labels = " -> ".join(self._provider_label(provider) for provider in selected)

        return {
            "provider": "chain",
            "ready": active_provider is not None,
            "configured_model": active_provider.get("configured_model") if active_provider else None,
            "active_provider": active_provider.get("provider") if active_provider else None,
            "provider_order": selected,
            "providers": provider_statuses,
            "detail": (
                f"Provider chain enabled: {provider_labels}. "
                f"First ready provider: {active_provider.get('label')}."
                if active_provider
                else f"Provider chain enabled: {provider_labels}. No provider is ready yet."
            ),
        }

    async def _fetch_ollama_models(self) -> list[dict]:
        endpoint = f"{self.ollama_api_base.rstrip('/')}/models"
        async with httpx.AsyncClient(
            timeout=20.0,
            trust_env=True,
            http2=False,
        ) as client:
            response = await client.get(endpoint)

        response.raise_for_status()
        payload = response.json()
        models = payload.get("data")
        if isinstance(models, list):
            return models
        return []

    def detect_intent(self, text: str) -> str:
        t = (text or "").lower()
        # Prioritize migration-specific intents so they are detected even when
        # the message contains greetings or extra context.
        if re.search(r"\b(checklist|check list|todo|to-?do|tasks|show checklist|migration checklist|task list)\b", t):
            return "CHECKLIST"
        # Detect explicit POM/maven file questions first (return a focused POM handler)
        if re.search(r"\b(pom\.xml|pom\b|maven-compiler-plugin|maven-surefire-plugin|maven-enforcer-plugin)\b", t):
            return "POM"

        # Detect repository analysis / dependency queries before strategy to avoid misclassification
        if re.search(r"\b(analyz(e|ed|ing)|scan|detect|list (dependencies|deps)|top \d+ dependencies|what (are )?the dependencies)\b", t):
            return "ANALYZE"

        # Detect build/tool related questions (maven/gradle/pom.xml/build plugins)
        if re.search(r"\b(build tool|maven|gradle|pom\.xml|build plugins|maven-compiler-plugin|build\.gradle)\b", t):
            return "STRATEGY"
        if re.search(r"\b(strategy|approach|migration strategy|what strategy|plan|recommend|suggest)\b", t):
            return "STRATEGY"
        if re.search(r"\b(next steps|next step|what next|what are the next steps|how to proceed|what to do next|what should i do next|what do i do next|should i do next|how should i start|how do i start|what now)\b", t):
            return "NEXT_STEPS"
        if re.search(r"\b(risk|risks|risk level|risk analysis|top risks|mitigat|mitigation|mitigations)\b", t):
            return "RISK"
        if re.search(r"\b(dependenc(y|ies)|deps|libraries|modules|incompatib|compatib)\b", t):
            return "DEPENDENCY"
        # CI / pipeline
        if re.search(r"\b(ci|pipeline|github actions|gitlab ci|circleci|jenkins|azure pipelines)\b", t):
            return "CI"
        # Tests
        if re.search(r"\b(test|tests|unit test|integration test|fuzz|fuzzing)\b", t):
            return "TESTS"
        # Performance / benchmarking
        if re.search(r"\b(performance|benchmark|latency|throughput|benchmarking)\b", t):
            return "PERFORMANCE"
        # JVM / GC options
        if re.search(r"\b(jvm options|gc|g1|zgc|jvm flags|jvm args|gc settings)\b", t):
            return "JVM_OPTIONS"
        # Deprecated / removed APIs
        if re.search(r"\b(deprecat|removed api|removed method|deprecated api|deprecated methods)\b", t):
            return "DEPRECATED_APIS"
        # Automated tools
        if re.search(r"\b(jdeps|revapi|errorprone|snyk|owasp|sca|static analysis|spotbugs|spotless)\b", t):
            return "AUTOMATED_TOOLS"
        # Module system (JPMS)
        if re.search(r"\b(module system|jpms|module\b|modules)\b", t):
            return "MODULE_SYSTEM"
        # Rollback and staged rollout
        if re.search(r"\b(rollback|canary|staged rollout|staging|canary deploy|rollback plan)\b", t):
            return "ROLLBACK"
        # Monitoring and alerts
        if re.search(r"\b(monitor|monitoring|alert|siem|audit log|audit logs)\b", t):
            return "MONITORING"
        # Security / vulnerabilities
        if re.search(r"\b(vulnerab|cve|security|sast|dast|snyk|dependency-check|owasp)\b", t):
            return "VULNERABILITIES"
        # Debugging / triage
        if re.search(r"\b(debug|triage|stack trace|log redaction|logs|correlation id)\b", t):
            return "DEBUGGING"
        # PR / templates
        if re.search(r"\b(pr description|pull request|pr template|pull-request)\b", t):
            return "PR"
        # Keep simple greetings as the last intent match.
        if re.search(r"\b(hi|hello|hey)\b", t):
            return "GREETING"
        return "GENERAL"

    async def ask(self, message: str, context: Optional[dict] = None) -> str:
        trace = await self.ask_with_trace(message, context)
        return trace.reply

    async def ask_with_trace(self, message: str, context: Optional[dict] = None) -> ChatTraceResult:
        text = (message or "").strip()
        if not text:
            return ChatTraceResult(
                reply=self.greeting_response(),
                intent="GREETING",
                provider="builtin",
                model="builtin",
                total_latency_ms=0,
            )

        intent = self.detect_intent(text)
        logger.info("Intent=%s", intent)

        # Route normal questions through the LLM chain so the chatbot can answer
        # more naturally than the old selected-question rules.
        prompt = self.build_llm_prompt(text, context, simplified=intent == "GREETING")
        try:
            logger.info("Calling configured LLM for message")
            llm_result = await self.call_llm(prompt)
            return ChatTraceResult(
                reply=llm_result.reply,
                intent=intent,
                provider=llm_result.provider,
                model=llm_result.model,
                total_latency_ms=llm_result.total_latency_ms,
                attempts=llm_result.attempts,
            )
        except LLMProviderChainError as exc:
            logger.exception("LLM call failed")
            return ChatTraceResult(
                reply="Sorry, I could not reach the LLM right now. Please try again in a moment.",
                intent=intent,
                provider="unavailable",
                model="unavailable",
                total_latency_ms=sum(attempt.latency_ms for attempt in exc.attempts),
                failed=True,
                attempts=exc.attempts,
            )
        except Exception:
            logger.exception("LLM call failed")
            return ChatTraceResult(
                reply="Sorry, I could not reach the LLM right now. Please try again in a moment.",
                intent=intent,
                provider="unavailable",
                model="unavailable",
                total_latency_ms=0,
                failed=True,
            )

    def greeting_response(self) -> str:
        return (
            "## Hello\n"
            "Hi! How can I help with the migration? Ask about migration strategy, versions, next steps, or a checklist."
        )

    def build_llm_prompt(self, message: Optional[str], context: Optional[dict], simplified: bool = False) -> str:
        """Build a prompt that keeps the LLM direct, practical, and migration-focused."""
        question = (message or "").strip()
        context = context or {}

        def first_value(*keys: str, default: str = "unknown"):
            for key in keys:
                value = context.get(key)
                if value is not None and str(value).strip() != "":
                    return value
            return default

        repo_analysis = context.get("repoAnalysis") or context.get("analysis") or {}
        build_tool = None
        source_version = None
        if isinstance(repo_analysis, dict):
            build_tool = repo_analysis.get("build_tool") or repo_analysis.get("buildTool") or repo_analysis.get("tool")
            source_version = repo_analysis.get("java_version") or repo_analysis.get("detected_java_version")

        build_tool = build_tool or context.get("buildTool") or context.get("build_tool") or "unknown"
        source_version = source_version or first_value(
            "selectedSourceVersion",
            "source_java_version",
            "sourceVersion",
            "java_version",
            default="unknown",
        )
        target_version = first_value(
            "selectedTargetVersion",
            "target_java_version",
            "targetVersion",
            "target_version",
            default="unknown",
        )
        risk_level = first_value("riskLevel", "risk_level", "risk", default="unknown")
        migration_approach = first_value(
            "migrationApproach",
            "migration_approach",
            "approach",
            default="unknown",
        )
        repo_name = first_value("repo", "repository", "repo_name", default="unknown")
        page = first_value("page", "step", "assistantMode", "assistant_mode", default="unknown")
        dependencies_count = first_value("dependencies_count", "dependenciesCount", default="unknown")
        has_tests = first_value("has_tests", "hasTests", default="unknown")

        if simplified:
            instruction = (
                "Answer the user's question directly and conversationally. "
                "Use short markdown sections or bullets only if they add clarity. "
                "If the question is ambiguous, infer the most likely intent from the repository context and answer that. "
                "For migration questions, stay focused on Java versions, build changes, risks, dependencies, tests, CI, and next steps."
            )
        else:
            instruction = (
                "You are a senior Java migration assistant inside a Java migration portal. "
                "Answer the user's exact question directly, clearly, and smoothly. "
                "Use a friendly, conversational tone and keep the language natural. "
                "Use the LLM answer path for strategy, risks, Java version choices, Maven or Gradle changes, dependency questions, testing, CI, rollout, rollback, and next-step questions. "
                "You may also answer normal conversational or general technical questions naturally. "
                "Do not mention system limits, internal implementation details, unavailable modes, or the prompt. "
                "Do not use emojis. "
                "Prefer concise, practical guidance. Use markdown headings and bullets only when they add clarity. "
                "If the question is ambiguous, infer the most likely intent from the repository context and answer that. "
                "If the answer depends on the repository context, tie it back to the detected build tool, versions, risk level, and migration approach. "
                "If there is not enough information, ask one focused clarifying question."
            )

        return "\n".join([
            instruction,
            "",
            "Repository context:",
            f"- Current page/step: {page}",
            f"- Repository: {repo_name}",
            f"- Build tool: {build_tool}",
            f"- Source Java version: {source_version}",
            f"- Target Java version: {target_version}",
            f"- Risk level: {risk_level}",
            f"- Migration approach: {migration_approach}",
            f"- Dependencies detected: {dependencies_count}",
            f"- Tests detected: {has_tests}",
            "",
            "User question:",
            question,
        ])

    def _is_strategy_page_context(self, context: Optional[dict]) -> bool:
        if not isinstance(context, dict):
            return False
        mode = str(context.get("assistantMode") or context.get("assistant_mode") or "").lower()
        page = str(context.get("page") or "").lower()
        return mode == "strategy" or page == "strategy"

    def build_conversational_response(self, message: Optional[str], context: Optional[dict]) -> Optional[str]:
        """Answer small conversational questions without needing an LLM."""
        text = (message or "").strip()
        if not text:
            return None

        lowered = text.lower()
        greeting = bool(re.search(r"\b(hi|hello|hey)\b", lowered))

        if greeting and len(text.split()) <= 3:
            return self.greeting_response()

        math_result = self._evaluate_math_expression(text)
        if math_result is not None:
            prefix = "Hi - " if greeting else ""
            return f"## Answer\n\n{prefix}{math_result}"

        if re.search(r"\b(build tool|migration changes|which dependencies|manual review|vulnerable dependencies|tests detected|frameworks?|apis?|ci pipeline|ci changes|license risks?|unusual licenses?|size|complexity|multi-module|module)\b", lowered):
            return self.build_repo_faq_response(context, lowered)

        if re.search(r"\b(java 17|java 21|should this repo move|why is java 17 recommended|tradeoffs?|difference(s)? between 17 and 21|javax|jakarta|maven configuration|compatibility risks?|what should be tested|migration risks?|step-by-step migration plan)\b", lowered):
            return self.build_java_upgrade_response(context, lowered)

        if re.search(r"\b(how (do i|to) migrate java|how java migrate|java migration process|how to migrate a java project|how to migrate this java project|how can i migrate java|how can i migrate this java project|how do i migrate this java project)\b", lowered):
            src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
            tgt = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"
            build_tool = (context or {}).get("repoAnalysis", {}).get("build_tool") if isinstance((context or {}).get("repoAnalysis"), dict) else None
            build_tool = build_tool or (context or {}).get("buildTool") or (context or {}).get("build_tool") or "unknown"

            return "\n".join([
                "## How to Migrate Java",
                "",
                f"- Current source version: Java {src}",
                f"- Current target version: Java {tgt}",
                f"- Build tool: {build_tool}",
                "",
                "1. Confirm the source and target Java versions.",
                "2. Update the build configuration for the target version.",
                "3. Run the test suite and fix compilation issues.",
                "4. Validate the app in staging before release.",
            ])

        if re.search(r"\b(what (java )?versions? can we migrate to|which java versions? can we migrate to|java versions? we can migrate to|supported java versions?|migrate to java 17|migrate to java 21)\b", lowered):
            src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
            tgt = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"
            return "\n".join([
                "## Java Versions",
                "",
                f"- Current source version: Java {src}",
                f"- Current target version: Java {tgt}",
                "",
                "You can usually migrate to a newer LTS version such as Java 17 or Java 21, depending on your current source version, dependencies, and plugin support.",
                "If your project already runs on Java 21, keep it unchanged unless you explicitly want to migrate again.",
            ])

        if re.search(r"\b(should this repo move to java 17 or java 21|java 17 or java 21|17 or 21)\b", lowered):
            src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
            build_tool = (context or {}).get("repoAnalysis", {}).get("build_tool") if isinstance((context or {}).get("repoAnalysis"), dict) else None
            build_tool = build_tool or (context or {}).get("buildTool") or (context or {}).get("build_tool") or "unknown"

            recommendation = "Keep the existing project and Java version unchanged"
            rationale = [
                "I would not change the existing project version unless you explicitly want a migration.",
                "Keep the current codebase as-is and review dependencies before making any version change.",
            ]

            if str(build_tool).lower() == "maven":
                rationale.append("For Maven projects, avoid changing the pom until you are ready to migrate the version.")
            elif str(build_tool).lower() == "gradle":
                rationale.append("For Gradle projects, avoid changing build settings until you decide to migrate.")

            lines = [
                "## Recommendation",
                "",
                f"Hi - I'd recommend **{recommendation}** for this repo.",
                "",
                f"- Current source version: Java {src}",
                f"- Build tool: {build_tool}",
                "",
                "Why:",
            ]
            lines.extend([f"- {item}" for item in rationale])
            lines.append("")
            lines.append("If you want, I can review the repo without changing the existing project or version.")
            return "\n".join(lines)

        if re.search(r"\b(version|versions|migration version|target version|source version)\b", lowered):
            src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
            tgt = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"
            approach = (context or {}).get("migrationApproach") or (context or {}).get("migration_approach") or "fork"
            lines = ["## Migration Versions", ""]
            if greeting:
                lines.extend(["Hi -", ""])
            lines.extend([
                f"- Current source version: Java {src}",
                f"- Current target version: Java {tgt}",
                f"- Existing project: unchanged",
                f"- Approach: {approach}",
                "",
                "I can explain the options, but I will not change the version or the existing project unless you ask me to.",
            ])
            return "\n".join(lines)

        if re.search(r"\b(what can you do|help me|how do you work|what do you do)\b", lowered):
            return (
                "## How I Can Help\n\n"
                "- I can explain your migration strategy\n"
                "- I can summarize source and target Java versions\n"
                "- I can answer simple questions like `1+2`\n"
                "- I can explain how to migrate a Java project and which versions are viable\n"
                "- I can suggest next steps, risks, and build tool changes\n"
            )

        return None

    def _extract_repo_snapshot(self, context: Optional[dict]) -> dict:
        ra = (context or {}).get("repoAnalysis") or (context or {}).get("analysis") or {}
        dependencies = ra.get("dependencies") if isinstance(ra, dict) and isinstance(ra.get("dependencies"), list) else []
        java_files = ra.get("java_files") if isinstance(ra, dict) and isinstance(ra.get("java_files"), list) else []
        structure = ra.get("structure") if isinstance(ra, dict) and isinstance(ra.get("structure"), dict) else {}

        build_tool = ra.get("build_tool") if isinstance(ra, dict) else None
        build_tool = build_tool or (context or {}).get("buildTool") or (context or {}).get("build_tool") or "unknown"
        source_version = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or ra.get("java_version") or ra.get("detected_java_version") or "unknown"
        target_version = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"

        source_files = ra.get("source_files") if isinstance(ra, dict) else 0
        test_files = ra.get("test_files") if isinstance(ra, dict) else 0
        api_endpoints = ra.get("api_endpoints") if isinstance(ra, dict) and isinstance(ra.get("api_endpoints"), list) else []
        has_tests = bool((ra.get("has_tests") if isinstance(ra, dict) else False) or (structure.get("has_src_test") if isinstance(structure, dict) else False) or test_files)

        frameworks = []
        framework_rules = [
            ("Spring / Spring Boot", ("spring-boot", "org.springframework", "spring-framework")),
            ("JUnit", ("junit", "jupiter")),
            ("Mockito", ("mockito",)),
            ("Servlet API", ("servlet",)),
            ("Jakarta EE", ("jakarta",)),
            ("Javax EE", ("javax",)),
            ("Persistence / JPA", ("persistence", "jpa")),
            ("Validation", ("validation",)),
            ("Jackson", ("jackson",)),
            ("Gson / JSON", ("gson", "org.json", " json")),
            ("Logging", ("slf4j", "log4j", "logback")),
            ("Lombok", ("lombok",)),
            ("REST / Web APIs", ("jax-rs", "jersey", "resteasy")),
        ]
        for label, needles in framework_rules:
            for dep in dependencies:
                if not isinstance(dep, dict):
                    continue
                group_id = str(dep.get("group_id") or dep.get("groupId") or "").lower()
                artifact_id = str(dep.get("artifact_id") or dep.get("artifactId") or dep.get("artifact") or "").lower()
                coord = f"{group_id}:{artifact_id}"
                if any(needle in coord for needle in needles):
                    frameworks.append(label)
                    break

        manual_review = [dep for dep in dependencies if isinstance(dep, dict) and str(dep.get("status") or "").lower() in {"needs_manual_review", "manual_review"}]
        upgraded = [dep for dep in dependencies if isinstance(dep, dict) and str(dep.get("status") or "").lower() == "upgraded"]
        compatible = [dep for dep in dependencies if isinstance(dep, dict) and str(dep.get("status") or "").lower() == "compatible"]

        module_detected = any(str(path).endswith("module-info.java") for path in java_files if isinstance(path, str))

        return {
            "ra": ra,
            "dependencies": dependencies,
            "build_tool": build_tool,
            "source_version": source_version,
            "target_version": target_version,
            "source_files": int(source_files or len(java_files) or 0),
            "test_files": int(test_files or 0),
            "api_count": len(api_endpoints),
            "has_tests": has_tests,
            "frameworks": frameworks,
            "manual_review": manual_review,
            "upgraded": upgraded,
            "compatible": compatible,
            "module_detected": module_detected,
            "structure_warning": ra.get("structure_warning") if isinstance(ra, dict) else None,
            "fossa_license_issues": int((context or {}).get("fossa_license_issues") or ra.get("fossa_license_issues") or 0),
            "fossa_vulnerabilities": int((context or {}).get("fossa_vulnerabilities") or ra.get("fossa_vulnerabilities") or 0),
            "fossa_outdated_dependencies": int((context or {}).get("fossa_outdated_dependencies") or ra.get("fossa_outdated_dependencies") or 0),
        }

    def build_repo_faq_response(self, context: Optional[dict], lowered_message: str) -> str:
        snap = self._extract_repo_snapshot(context)
        deps = snap["dependencies"]
        build_tool = snap["build_tool"]
        source_version = snap["source_version"]
        target_version = snap["target_version"]
        source_files = snap["source_files"]
        test_files = snap["test_files"]
        api_count = snap["api_count"]
        has_tests = snap["has_tests"]
        frameworks = snap["frameworks"]
        manual_review = snap["manual_review"]
        upgraded = snap["upgraded"]
        module_detected = snap["module_detected"]

        def dep_name(dep: dict) -> str:
            group = dep.get("group_id") or dep.get("groupId") or ""
            art = dep.get("artifact_id") or dep.get("artifactId") or dep.get("artifact") or ""
            return f"{group}:{art}".strip(":")

        if re.search(r"\b(build tool|migration changes)\b", lowered_message):
            lines = [
                "## Build Tool & Migration Changes",
                "",
                f"- Build tool: {build_tool}",
                f"- Source version: Java {source_version}",
                f"- Target version: Java {target_version}",
            ]
            if str(build_tool).lower() == "maven":
                lines.extend([
                    "- Update `maven-compiler-plugin` and set `maven.compiler.release`.",
                    "- Upgrade Surefire/Failsafe and re-run the test suite.",
                ])
            elif str(build_tool).lower() == "gradle":
                lines.extend([
                    "- Set the Java toolchain and verify `sourceCompatibility` / `targetCompatibility`.",
                    "- Run `gradle build` and fix compile or test failures.",
                ])
            else:
                lines.append("- Align compiler flags and test configuration with the target JDK.")
            return "\n".join(lines)

        if re.search(r"\b(which dependencies|manual review|critical|high risk|medium risk)\b", lowered_message):
            lines = [
                "## Dependency Risk",
                "",
                f"- Total dependencies: {len(deps)}",
                f"- Manual review items: {len(manual_review)}",
                f"- Upgraded items: {len(upgraded)}",
            ]
            if manual_review:
                lines.append("")
                lines.append("Manual review before migration:")
                for dep in manual_review[:10]:
                    lines.append(f"- {dep_name(dep)} -> {dep.get('new_version') or dep.get('newVersion') or 'review required'}")
            elif upgraded:
                lines.append("")
                lines.append("Medium-risk upgrades:")
                for dep in upgraded[:10]:
                    lines.append(f"- {dep_name(dep)} -> {dep.get('new_version') or dep.get('newVersion') or 'upgrade recommended'}")
            else:
                lines.append("")
                lines.append("No explicit dependency risk flags were detected in the current analysis.")
            return "\n".join(lines)

        if re.search(r"\b(vulnerable|cve|security|top vulnerable|remediat)\b", lowered_message):
            risky = [dep for dep in deps if isinstance(dep, dict) and str(dep.get("status") or "").lower() in {"needs_manual_review", "upgraded"}]
            lines = [
                "## Vulnerability & Remediation",
                "",
                f"- FOSSA vulnerabilities: {snap['fossa_vulnerabilities']}",
                f"- Outdated dependencies: {snap['fossa_outdated_dependencies']}",
            ]
            if risky:
                lines.append("")
                lines.append("Most important dependency remediation steps:")
                for dep in risky[:8]:
                    lines.append(f"- {dep_name(dep)} -> {dep.get('new_version') or dep.get('newVersion') or 'upgrade'}")
            else:
                lines.append("")
                lines.append("No specific vulnerable dependency list is exposed in the current analysis, so run SCA/FOSSA to confirm CVEs and fix flagged packages first.")
            return "\n".join(lines)

        if re.search(r"\b(tests? detected|are tests|what should be tested|test immediately|testing)\b", lowered_message):
            return "\n".join([
                "## Tests",
                "",
                f"- Tests detected: {'yes' if has_tests else 'no'}",
                f"- Test files: {test_files}",
                "",
                "Test immediately after upgrade:",
                "- Unit tests",
                "- Integration/API smoke tests",
                "- Build verification (`mvn test` or `gradle test`)",
                "- Any security or regression checks relevant to the app",
            ])

        if re.search(r"\b(frameworks?|apis?)\b", lowered_message):
            lines = [
                "## Frameworks & APIs",
                "",
                f"- Build tool: {build_tool}",
                f"- API endpoints detected: {api_count}",
                "",
            ]
            if frameworks:
                lines.append("Detected frameworks / APIs:")
                for item in frameworks:
                    lines.append(f"- {item}")
            else:
                lines.append("No clear framework signals were exposed in the current analysis.")
            return "\n".join(lines)

        if re.search(r"\b(ci pipeline|ci changes|pipeline)\b", lowered_message):
            return "\n".join([
                "## CI Pipeline Changes",
                "",
                f"- Enforce the target Java version in CI for {build_tool}.",
                "- Run the full test suite on the new JDK.",
                "- Add dependency/security scanning and fail the build on high-risk findings.",
                "- Keep a staging validation step before release.",
            ])

        if re.search(r"\b(license|licenses|unusual licenses?)\b", lowered_message):
            return "\n".join([
                "## License Risks",
                "",
                f"- FOSSA license issues: {snap['fossa_license_issues']}",
                "",
                "Watch for copyleft or unknown licenses, and verify any transitive dependencies before migration.",
                "If license data is missing, run the repository license scan before release.",
            ])

        if re.search(r"\b(size|complexity|effort)\b", lowered_message):
            complexity = "low"
            if source_files >= 150 or len(deps) >= 25 or api_count >= 15:
                complexity = "high"
            elif source_files >= 40 or len(deps) >= 10 or api_count >= 5:
                complexity = "medium"
            return "\n".join([
                "## Repository Size & Complexity",
                "",
                f"- Source files: {source_files}",
                f"- Dependencies: {len(deps)}",
                f"- API endpoints: {api_count}",
                f"- Complexity: {complexity}",
                "",
                "Higher complexity means more regression testing, more dependency review, and a slower migration cadence.",
            ])

        if re.search(r"\b(multi-module|module|modules)\b", lowered_message):
            return "\n".join([
                "## Module Structure",
                "",
                f"- Multi-module detected: {'yes' if module_detected else 'not clearly detected'}",
                "",
                "If this is multi-module, migrate the shared/core module first, then leaf modules, and finally integration modules.",
            ])

        return self.build_analysis_response(context)

    def build_java_upgrade_response(self, context: Optional[dict], lowered_message: str) -> str:
        snap = self._extract_repo_snapshot(context)
        build_tool = snap["build_tool"]
        source_version = snap["source_version"]
        target_version = snap["target_version"]
        frameworks = snap["frameworks"]
        manual_review = snap["manual_review"]
        has_tests = snap["has_tests"]
        deps = snap["dependencies"]

        javax_packages = []
        jakarta_packages = []
        for dep in deps:
            if not isinstance(dep, dict):
                continue
            group_id = str(dep.get("group_id") or dep.get("groupId") or "").lower()
            artifact_id = str(dep.get("artifact_id") or dep.get("artifactId") or dep.get("artifact") or "").lower()
            coord = f"{group_id}:{artifact_id}".strip(":")
            if "javax" in coord:
                javax_packages.append(coord)
            if "jakarta" in coord:
                jakarta_packages.append(coord)

        if re.search(r"\b(should this repo move to java 17 or java 21|java 17 or java 21|17 or 21)\b", lowered_message):
            preferred = "Java 17"
            if str(source_version) in {"17", "21"}:
                preferred = f"Java {target_version if target_version != 'unknown' else source_version}"
            return "\n".join([
                "## Recommendation",
                "",
                f"- Current source version: Java {source_version}",
                f"- Current target version: Java {target_version}",
                f"- Build tool: {build_tool}",
                "",
                "Java 17 is usually the safer stepping stone when you want fewer compatibility jumps.",
                "Java 21 is a better end-state when your dependencies, plugins, and runtime are already compatible.",
                f"For this repository, start with {preferred} only if the ecosystem is ready; otherwise use Java 17 as the safer migration target.",
            ])

        if re.search(r"\b(why is java 17 recommended)\b", lowered_message):
            return "\n".join([
                "## Why Java 17",
                "",
                "- Java 17 is an LTS release and reduces the jump from older versions.",
                "- It is usually easier to validate with older dependencies and plugins than Java 21.",
                "- It gives a safer intermediate milestone before a later move to Java 21.",
            ])

        if re.search(r"\b(tradeoffs?|difference(s)? between 17 and 21)\b", lowered_message):
            return "\n".join([
                "## Java 17 vs Java 21",
                "",
                "- Java 17: safer compatibility step, usually fewer ecosystem surprises.",
                "- Java 21: newer LTS, more modern features, but it can require more dependency and plugin upgrades.",
                "- Choose 17 if risk reduction matters most; choose 21 if your libraries already support it and you want the latest LTS baseline.",
            ])

        if re.search(r"\b(javax|jakarta)\b", lowered_message):
            return "\n".join([
                "## javax to Jakarta",
                "",
                "Common package changes for Java 17+ / Spring Boot 3 migrations:",
                "- `javax.servlet` -> `jakarta.servlet`",
                "- `javax.persistence` -> `jakarta.persistence`",
                "- `javax.validation` -> `jakarta.validation`",
                "- `javax.annotation` -> `jakarta.annotation`",
                "- `javax.inject` -> `jakarta.inject`",
                "- `javax.ws.rs` -> `jakarta.ws.rs`",
                "- `javax.json` -> `jakarta.json`",
                "- `javax.mail` -> `jakarta.mail`",
                "- `javax.transaction` -> `jakarta.transaction`",
            ])

        if re.search(r"\b(maven configuration|pom|maven config|maven changes)\b", lowered_message):
            return self.build_pom_response(context, lowered_message)

        if re.search(r"\b(compatibility risks?|migration risks?|block|blocked|step-by-step migration plan)\b", lowered_message):
            parts = [
                "## Migration Risks & Plan",
                "",
                f"- Source version: Java {source_version}",
                f"- Target version: Java {target_version}",
                f"- Build tool: {build_tool}",
                "",
                "Main blockers to watch:",
                "- Deprecated JDK APIs",
                "- javax to Jakarta namespace changes",
                "- Spring Boot / framework compatibility",
                "- Test failures and CI mismatches",
            ]
            if manual_review:
                parts.append("- Dependencies flagged for manual review")
            if not has_tests:
                parts.append("- No tests detected, so regression risk is higher")
            parts.extend([
                "",
                "Suggested order:",
                "1. Update build configuration",
                "2. Fix dependency and framework blockers",
                "3. Run tests and resolve failures",
                "4. Validate in staging",
            ])
            return "\n".join(parts)

        if re.search(r"\b(what should be tested|test immediately|tests? after the upgrade)\b", lowered_message):
            return "\n".join([
                "## What to Test After the Upgrade",
                "",
                "- Compile and package the application.",
                "- Run unit and integration tests.",
                "- Verify framework startup, dependency injection, and configuration loading.",
                "- Exercise critical APIs, database access, and authentication flows.",
            ])

        if re.search(r"\b(java migrate|migrate java|java migration|how can i migrate|how do i migrate|migration approach|strategy)\b", lowered_message):
            return "\n".join([
                "## Migration Plan",
                "",
                f"- Source version: Java {source_version}",
                f"- Target version: Java {target_version}",
                f"- Build tool: {build_tool}",
                "",
                "1. Update the build tool and compiler settings.",
                "2. Review dependencies and framework compatibility.",
                "3. Migrate javax packages to Jakarta where required.",
                "4. Run tests and fix regressions.",
                "5. Validate in staging before release.",
            ])

        return "\n".join([
            "## Java Upgrade Summary",
            "",
            f"- Source version: Java {source_version}",
            f"- Target version: Java {target_version}",
            f"- Build tool: {build_tool}",
            f"- Frameworks: {', '.join(frameworks) if frameworks else 'not clearly detected'}",
            "",
            "Use Java 17 as the safer intermediate step, or Java 21 as the end-state if dependencies and plugins already support it.",
        ])

    def _evaluate_math_expression(self, text: str) -> Optional[str]:
        """Safely evaluate a very small arithmetic expression like `1+2`."""
        candidate = re.sub(r"[?!.]+$", "", text.strip())
        if "=" in candidate:
            left, right = candidate.split("=", 1)
            left = left.strip()
            right = right.strip()
            if left and re.search(r"[+\-*/]", left):
                candidate = left
            elif right and re.search(r"[+\-*/]", right):
                candidate = right
            else:
                candidate = left or right

        candidate = re.sub(r"\s+", "", candidate)
        if not re.fullmatch(r"[0-9\.\+\-\*\/\(\)]+", candidate):
            return None

        if not re.search(r"[+\-*/]", candidate):
            return None

        try:
            tree = ast.parse(candidate, mode="eval")
        except SyntaxError:
            return None

        operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.FloorDiv: operator.floordiv,
            ast.Mod: operator.mod,
            ast.Pow: operator.pow,
            ast.UAdd: operator.pos,
            ast.USub: operator.neg,
        }

        def _eval(node):
            if isinstance(node, ast.Expression):
                return _eval(node.body)
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return node.value
            if isinstance(node, ast.BinOp) and type(node.op) in operators:
                return operators[type(node.op)](_eval(node.left), _eval(node.right))
            if isinstance(node, ast.UnaryOp) and type(node.op) in operators:
                return operators[type(node.op)](_eval(node.operand))
            raise ValueError("unsupported expression")

        try:
            result = _eval(tree)
        except Exception:
            return None

        if isinstance(result, float) and result.is_integer():
            result = int(result)

        return f"`{candidate}` = **{result}**"

    def build_strategy_response(self, context: Optional[dict]) -> str:
        # Extract inferred fields from context when available
        ma = (context or {}).get("migrationApproach") or (context or {}).get("migration_approach") or "fork"
        src = (context or {}).get("selectedSourceVersion") or "unknown"
        tgt = (context or {}).get("selectedTargetVersion") or src
        risk = (context or {}).get("riskLevel") or (context or {}).get("risk") or "unknown"

        # Always return the Strategy Page in the exact required format
        md = [
            "## Migration Strategy",
            "",
            f"- Approach: {ma}",
            f"- Java Source: {src}",
            f"- Java Target: {tgt}",
            f"- Risk: {risk}",
            "",
            "### Recommendations",
            "- Create migration branch",
            "- Upgrade build tools (Maven/Gradle)",
            "- Fix deprecated APIs",
            "- Run full test suite",
            "- Deploy to staging",
            "- Validate integrations",
            "",
            "### Build-specific changes (if applicable)",
            "If Maven:",
            "- Upgrade maven-compiler-plugin to Java 21",
            "- Set maven.compiler.release=21",
            "- Upgrade surefire/failsafe plugins",
            "- Run mvn clean verify",
            "",
            "If Gradle:",
            "- Set toolchain to Java 21",
            "- Update sourceCompatibility/targetCompatibility",
            "- Run gradle build and fix errors",
        ]

        return "\n".join(md)

    def build_strategy_response_v2(self, message: Optional[str], context: Optional[dict]) -> str:
        """Question-aware strategy response for the Strategy page."""
        message_text = (message or "").lower()
        base = self.build_strategy_response(context)

        ma = (context or {}).get("migrationApproach") or (context or {}).get("migration_approach") or "fork"
        src = (context or {}).get("selectedSourceVersion") or "unknown"
        tgt = (context or {}).get("selectedTargetVersion") or src
        risk = (context or {}).get("riskLevel") or (context or {}).get("risk") or "unknown"

        repo_analysis = (context or {}).get("repoAnalysis")
        build_tool = None
        if isinstance(repo_analysis, dict):
            build_tool = repo_analysis.get("build_tool") or repo_analysis.get("buildTool")
        build_tool = build_tool or (context or {}).get("buildTool") or (context or {}).get("build_tool") or "unknown"

        if re.search(r"\b(next steps|next step|what next|what are the next steps|how to proceed|what to do next|what should i do next|what do i do next|should i do next|how should i start|how do i start|what now)\b", message_text):
            return self.build_next_steps(context)

        if re.search(r"\b(risk|risks|risk analysis|top risks|risk level|what are the top risks)\b", message_text):
            return self.build_risk_analysis(context)

        if re.search(r"\b(checklist|check list|todo|to-do|task list)\b", message_text):
            return self.build_checklist(context)

        if re.search(r"\b(maven|gradle|build tool|pom\.xml|build changes|compiler plugin|sourcecompatibility|targetcompatibility|toolchain)\b", message_text):
            if str(build_tool).lower() == "maven":
                return "\n".join([
                    "## Build Changes",
                    "",
                    "- Build tool: Maven",
                    "- Update `maven-compiler-plugin` to the target Java version.",
                    "- Set `maven.compiler.release` to the target version.",
                    "- Upgrade surefire/failsafe if needed.",
                    "- Run `mvn clean verify` and fix test failures.",
                ])
            if str(build_tool).lower() == "gradle":
                return "\n".join([
                    "## Build Changes",
                    "",
                    "- Build tool: Gradle",
                    "- Set the Java toolchain to the target version.",
                    "- Verify `sourceCompatibility` and `targetCompatibility`.",
                    "- Run `gradle build` and fix compilation or test failures.",
                ])
            return "\n".join([
                "## Build Changes",
                "",
                "- Check `pom.xml` or `build.gradle` first.",
                "- Align compiler and test plugin settings with the target Java version.",
            ])

        if re.search(r"\b(what strategy|which strategy|migration approach|should i choose|recommend|recommendation)\b", message_text):
            recommendation_lines = [
                "## Recommendation",
                "",
                f"- Recommended approach: **{ma}**",
                f"- Java source: {src}",
                f"- Java target: {tgt}",
                f"- Risk: {risk}",
            ]
            if str(risk).lower() == "high":
                recommendation_lines.append("- High risk usually means a branch-based rollout is the safest choice.")
            elif str(risk).lower() == "medium":
                recommendation_lines.append("- Medium risk means branch or fork can work, but staging validation is important.")
            else:
                recommendation_lines.append("- Low risk means you can move faster, but keep tests and rollback plans in place.")
            return "\n".join(recommendation_lines)

        if re.search(r"\b(version|versions|migration version|target version|source version)\b", message_text):
            return self.build_conversational_response(message, context) or base

        return base

    def build_checklist_response(self, context: Optional[dict]) -> str:
        return self.build_checklist(context)

    def build_checklist(self, context: Optional[dict]) -> str:
        items = [
            "Create branch",
            "Backup repository",
            "Upgrade Maven plugins",
            "Upgrade Java version settings",
            "Run `mvn clean install`",
            "Execute unit and integration tests",
            "Fix deprecated APIs",
            "Deploy to staging",
        ]
        md = ["## Migration Checklist", ""] + [f"- ✅ {it}" for it in items]
        return "\n".join(md)

    def build_analysis_response(self, context: Optional[dict]) -> str:
        """Summarize repository analysis passed in `context` for ANALYZE intent."""
        ra = (context or {}).get("repoAnalysis") or (context or {}).get("analysis") or {}

        build_tool = ra.get("build_tool") or ra.get("buildTool") or ra.get("tool") or "unknown"
        java_version = ra.get("java_version") or ra.get("detected_java_version") or "unknown"
        has_tests = ra.get("structure", {}).get("has_src_test") if isinstance(ra.get("structure"), dict) else ra.get("has_tests")
        deps = ra.get("dependencies") if isinstance(ra.get("dependencies"), list) else []

        lines = [
            "## Repository Analysis",
            "",
            f"- Build tool: {build_tool}",
            f"- Detected Java version: {java_version}",
            f"- Tests detected: { 'yes' if has_tests else 'no' }",
            f"- Dependencies detected: {len(deps)}",
            "",
        ]

        if deps:
            lines.append("Top dependencies:")
            for d in deps[:10]:
                name = d.get("artifact_id") or d.get("artifact") or d.get("group_id") or str(d)
                ver = d.get("current_version") or d.get("version") or "unknown"
                lines.append(f"- {name}: {ver}")

        return "\n".join(lines)

    def build_next_steps(self, context: Optional[dict]) -> str:
        src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
        tgt = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"
        build_tool = (context or {}).get("repoAnalysis", {}).get("build_tool") if isinstance((context or {}).get("repoAnalysis"), dict) else None
        build_tool = build_tool or (context or {}).get("buildTool") or (context or {}).get("build_tool") or "unknown"
        steps = [
            "Create a migration branch from the default branch",
            "Update project `pom.xml` to target the new Java version",
            "Upgrade plugins and re-run the build",
            "Run and fix failing tests",
            "Verify API endpoints and compatibility",
            "Deploy to a staging environment for verification",
        ]
        md = [
            "## Next Steps",
            "",
            f"- Current source version: Java {src}",
            f"- Current target version: Java {tgt}",
            f"- Build tool: {build_tool}",
            "",
        ] + [f"1. {s}" for s in steps]
        return "\n".join(md)

    def build_risk_analysis(self, context: Optional[dict]) -> str:
        risk = (context or {}).get("riskLevel") or (context or {}).get("risk") or "unknown"
        src = (context or {}).get("selectedSourceVersion") or (context or {}).get("source_java_version") or (context or {}).get("sourceVersion") or "unknown"
        tgt = (context or {}).get("selectedTargetVersion") or (context or {}).get("target_java_version") or (context or {}).get("targetVersion") or "unknown"
        md = ["## Risk Analysis", "", f"- Risk level: **{risk}**", f"- Current source version: Java {src}", f"- Current target version: Java {tgt}", ""]
        if risk and str(risk).lower() in {"low", "medium", "high"}:
            if str(risk).lower() == "low":
                md.append("Recommendations: minimal manual review; focus on dependency updates and tests.")
            elif str(risk).lower() == "medium":
                md.append("Recommendations: run CI, manual API contract review, and staged rollout.")
            else:
                md.append("Recommendations: allocate engineering time for API changes, heavy testing, and gradual rollout.")
        else:
            md.append("Recommendations: perform full analysis of dependencies and test coverage to determine risks.")
        return "\n".join(md)

    def build_dependency_report(self, context: Optional[dict]) -> str:
        ra = (context or {}).get("repoAnalysis") or (context or {}).get("analysis") or {}
        deps = ra.get("dependencies") if isinstance(ra, dict) else None
        if not deps:
            return "## Dependency Report\n\nNo dependency information found in context."

        lines = ["## Dependency Report", ""]
        for d in deps[:20]:
            name = d.get("artifact_id") or d.get("artifact") or d.get("group_id") or str(d)
            cur = d.get("current_version") or d.get("version") or "unknown"
            lines.append(f"- {name}: {cur}")
        if len(deps) > 20:
            lines.append(f"- ... and {len(deps)-20} more dependencies")
        return "\n".join(lines)

    def build_ci_response(self, context: Optional[dict]) -> str:
        md = [
            "## CI Pipeline Changes",
            "",
            "- Pin base images and use minimal build images (avoid `latest`).",
            "- Secure secrets with a vault or encrypted secrets; never print secrets in CI logs.",
            "- Add SCA (OWASP Dependency-Check or Snyk), SAST (SpotBugs/FindSecBugs, ErrorProne), and SBOM generation.",
            "- Require security and test gates before merge; sign artifacts if possible.",
            "",
            "Example CI steps:",
            "```yaml",
            "- name: Build\n  run: mvn -B -U -DskipTests=false clean verify",
            "- name: SCA\n  run: mvn org.owasp:dependency-check-maven:check",
            "- name: SBOM\n  run: mvn org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom",
            "```",
        ]
        return "\n".join(md)

    def build_tests_response(self, context: Optional[dict]) -> str:
        md = [
            "## Tests to Add",
            "",
            "- Unit tests covering new Java 21 behavior and API changes.",
            "- Integration tests for authentication, permissions, and external integrations.",
            "- Regression/security tests (SAST/DAST smoke), and fuzz tests for critical inputs.",
            "- Add end-to-end tests in CI and require them for migration PRs.",
        ]
        return "\n".join(md)

    def build_performance_response(self, context: Optional[dict]) -> str:
        md = [
            "## Performance & Benchmarking",
            "",
            "- Run microbenchmarks with JMH for CPU-sensitive code.",
            "- Run load tests (Gatling/JMeter/Locust) on staging to compare latency and throughput.",
            "- Capture GC and allocation profiles before/after migration.",
        ]
        return "\n".join(md)

    def build_jvm_options_response(self, context: Optional[dict]) -> str:
        md = [
            "## JVM Options Recommendations",
            "",
            "- Start with Java 21 defaults; test with ZGC or G1 depending on workload.",
            "- Example flags: `-Xms`, `-Xmx`, `-XX:+UseZGC` (if low-pauses desired), enable `-XX:+FlightRecorder` for profiling.",
            "- Tune GC and heap sizing in staging under realistic load.",
        ]
        return "\n".join(md)

    def build_deprecated_apis_response(self, context: Optional[dict]) -> str:
        md = [
            "## Deprecated / Removed APIs",
            "",
            "- Run static analysis and search for uses of deprecated JDK APIs; replace with supported alternatives.",
            "- Use `jdeps` and IDE inspections to find calls to removed APIs.",
        ]
        return "\n".join(md)

    def build_automated_tools_response(self, context: Optional[dict]) -> str:
        md = [
            "## Automated Tools to Use",
            "",
            "- `jdeps` for API dependency analysis.",
            "- Revapi for binary/API compatibility checks.",
            "- ErrorProne / SpotBugs (+ FindSecBugs) for static analysis.",
            "- OWASP Dependency-Check or Snyk for SCA.",
        ]
        return "\n".join(md)

    def build_module_system_response(self, context: Optional[dict]) -> str:
        md = [
            "## Module System (JPMS) Guidance",
            "",
            "- Consider JPMS only if you need strong encapsulation; otherwise postpone to avoid migration overhead.",
            "- If adopting JPMS, minimize exported packages and validate reflective access.",
        ]
        return "\n".join(md)

    def build_rollback_response(self, context: Optional[dict]) -> str:
        md = [
            "## Rollback & Staged Rollout",
            "",
            "- Use backward-compatible DB migrations (online migrations) and feature flags.",
            "- Deploy with canary/staged rollout and health checks to enable fast rollback.",
        ]
        return "\n".join(md)

    def build_monitoring_response(self, context: Optional[dict]) -> str:
        md = [
            "## Monitoring & Alerts",
            "",
            "- Add metrics for latency, error rates, GC pauses, and throughput.",
            "- Add alerts for auth failures, high error rates, and regression in key SLAs.",
            "- Collect audit logs and correlate with traces for incident triage.",
        ]
        return "\n".join(md)

    def build_vulnerabilities_response(self, context: Optional[dict]) -> str:
        md = [
            "## Vulnerabilities Needing Attention",
            "",
            "- Outdated libraries with known CVEs (run SCA and patch/upgrade).",
            "- Secrets in code or config (run secret-scanning and rotate exposed keys).",
            "- Insecure CI practices (unpinned images, leaked logs).",
            "- Missing security tests and insufficient test coverage for auth/inputs.",
            "- Unsigned or unverifiable artifacts in the supply chain.",
            "",
            "Recommended actions:",
            "- Run OWASP Dependency-Check or Snyk; address high/critical results.",
            "- Add secret scanning and rotate any exposed credentials.",
            "- Enforce CI gates (SCA/SAST) and pin base images.",
        ]
        return "\n".join(md)

    def build_debugging_response(self, context: Optional[dict]) -> str:
        md = [
            "## Debugging & Triage",
            "",
            "- Redact sensitive fields in logs and centralize logs with correlation IDs.",
            "- Use structured logging and ensure stack traces are not exposed to users.",
            "- Add health and readiness probes to detect regressions quickly.",
        ]
        return "\n".join(md)

    def build_pr_response(self, context: Optional[dict]) -> str:
        md = [
            "## PR Description Template",
            "",
            "**Summary:** Short summary of migration changes.",
            "",
            "**Changes:**\n- List of files/areas changed\n",
            "**Verification:**\n- Tests run, CI status, staging verification steps\n",
            "**Security checklist:**\n- SCA results attached, secret scan, SBOM included",
        ]
        return "\n".join(md)

    def build_pom_response(self, context: Optional[dict], message: Optional[str] = None) -> str:
        """Return a focused example and guidance for updating `pom.xml` when migrating Java.

        The response is deterministic and avoids calling external LLMs.
        """
        md = [
            "## pom.xml Migration Example",
            "",
            "Update your `pom.xml` with these minimal changes to target Java 21:",
            "",
            "```xml",
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"",
            "         xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"",
            "         xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd\">",
            "  <modelVersion>4.0.0</modelVersion>",
            "  <groupId>com.example</groupId>",
            "  <artifactId>my-app</artifactId>",
            "  <version>1.0.0</version>",
            "",
            "  <properties>",
            "    <!-- Prefer 'release' when using modern maven-compiler-plugin -->",
            "    <maven.compiler.release>21</maven.compiler.release>",
            "    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>",
            "  </properties>",
            "",
            "  <build>",
            "    <plugins>",
            "      <plugin>",
            "        <groupId>org.apache.maven.plugins</groupId>",
            "        <artifactId>maven-compiler-plugin</artifactId>",
            "        <version>3.11.0</version>",
            "        <configuration>",
            "          <release>21</release>",
            "        </configuration>",
            "      </plugin>",
            "",
            "      <plugin>",
            "        <groupId>org.apache.maven.plugins</groupId>",
            "        <artifactId>maven-surefire-plugin</artifactId>",
            "        <version>3.1.2</version>",
            "      </plugin>",
            "",
            "      <plugin>",
            "        <groupId>org.apache.maven.plugins</groupId>",
            "        <artifactId>maven-failsafe-plugin</artifactId>",
            "        <version>3.1.2</version>",
            "      </plugin>",
            "",
            "      <plugin>",
            "        <groupId>org.apache.maven.plugins</groupId>",
            "        <artifactId>maven-enforcer-plugin</artifactId>",
            "        <version>3.0.0</version>",
            "        <executions>",
            "          <execution>",
            "            <id>enforce-java</id>",
            "            <goals><goal>enforce</goal></goals>",
            "            <configuration>",
            "              <rules>",
            "                <requireJavaVersion>",
            "                  <version>[21,)</version>",
            "                </requireJavaVersion>",
            "              </rules>",
            "            </configuration>",
            "          </execution>",
            "        </executions>",
            "      </plugin>",
            "    </plugins>",
            "  </build>",
            "</project>",
            "```",
            "",
            "Notes:",
            "- Use `<maven.compiler.release>` or the compiler plugin `release` config to avoid needing separate `source`/`target` values.",
            "- Upgrade plugins (compiler/surefire/failsafe/enforcer) to recent compatible versions before switching the JDK.",
            "- Run `mvn -U clean verify` and fix compilation/test issues; add SCA and static analysis in CI.",
        ]

        return "\n".join(md)

    async def call_llm(self, prompt: str) -> LLMCallResult:
        """Call the configured LLM provider or provider chain."""
        attempts: list[ProviderAttempt] = []
        chain_started = perf_counter()

        for provider in self._selected_providers():
            provider_started = perf_counter()
            model = self._configured_model_for(provider)
            try:
                logger.info("Trying provider: %s", self._provider_label(provider))
                if provider == "ollama":
                    reply = await self._call_ollama(prompt)
                elif provider == "hf":
                    reply = await self._call_hugging_face(prompt)
                elif provider == "groq":
                    reply = await self._call_groq(prompt)
                else:
                    raise RuntimeError(f"Unknown provider '{provider}'.")

                attempt_latency_ms = int((perf_counter() - provider_started) * 1000)
                total_latency_ms = int((perf_counter() - chain_started) * 1000)
                attempts.append(
                    ProviderAttempt(
                        provider=provider,
                        model=model,
                        success=True,
                        latency_ms=attempt_latency_ms,
                        detail="Answered successfully.",
                    )
                )
                logger.info(
                    "Provider %s answered successfully in %sms using model %s",
                    self._provider_label(provider),
                    attempt_latency_ms,
                    model,
                )
                return LLMCallResult(
                    reply=reply,
                    provider=provider,
                    model=model,
                    total_latency_ms=total_latency_ms,
                    attempts=attempts,
                )
            except Exception as exc:
                attempt_latency_ms = int((perf_counter() - provider_started) * 1000)
                logger.warning(
                    "Provider %s failed, trying next provider if available: %s",
                    self._provider_label(provider),
                    exc,
                )
                attempts.append(
                    ProviderAttempt(
                        provider=provider,
                        model=model,
                        success=False,
                        latency_ms=attempt_latency_ms,
                        detail=str(exc),
                    )
                )

        raise LLMProviderChainError(attempts)

    async def _call_hugging_face(self, message: str) -> str:
        if not self.hf_token:
            raise RuntimeError("HF_TOKEN is not configured for Hugging Face calls.")

        endpoint = self._build_chat_completions_endpoint(self.hf_api_base)
        payload = {
            "model": self.hf_model,
            "messages": self._build_chat_messages(message),
            "temperature": 0.3,
            "top_p": 0.9,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {self.hf_token}", "Content-Type": "application/json"},
                json=payload,
            )

            if resp.status_code >= 400:
                text = resp.text
                try:
                    parsed = resp.json()
                except Exception:
                    parsed = None

                provider_msg = None
                hint = ""
                if parsed:
                    err = parsed.get("error") or parsed.get("message") or parsed
                    if isinstance(err, dict):
                        provider_msg = err.get("message") or err.get("code") or json.dumps(err)
                        # If the error indicates the model is missing, provide actionable hint
                        if err.get("code") == "model_not_found" or err.get("param") == "model":
                            hint = f" Model '{self.hf_model}' not found. Set HF_CHAT_MODEL to a valid router model for your account."
                    else:
                        provider_msg = str(err)
                else:
                    provider_msg = text

                logger.error("Hugging Face router error: %s", provider_msg)
                raise RuntimeError(f"Hugging Face router error: {provider_msg}.{hint}")

            data = resp.json()

        # Try to extract text
        try:
            choices = data.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                content = msg.get("content")
                if isinstance(content, str):
                    return content
                if isinstance(content, list):
                    # HF sometimes returns structured content
                    parts = [c.get("text", "") for c in content if isinstance(c, dict)]
                    return "".join(parts)
        except Exception:
            logger.exception("Failed to parse HF response")

        # Return raw JSON if the provider response does not match the expected shape.
        return json.dumps(data)

    async def _call_ollama(self, message: str) -> str:
        endpoint = f"{self.ollama_api_base.rstrip('/')}/chat/completions"
        payload = {
            "model": self.ollama_model,
            "messages": self._build_chat_messages(message),
            "temperature": 0.3,
            "top_p": 0.9,
            "max_tokens": 768,
            "keep_alive": self.ollama_keep_alive,
        }

        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(
                    timeout=self.ollama_timeout_seconds,
                    trust_env=True,
                    http2=False,
                ) as client:
                    resp = await client.post(
                        endpoint,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                break
            except (
                httpx.ConnectError,
                httpx.ConnectTimeout,
                httpx.ReadTimeout,
                httpx.RemoteProtocolError,
            ) as exc:
                last_error = exc
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(
                    f"Ollama connection error for model '{self.ollama_model}': {exc}",
                ) from exc
        else:
            raise RuntimeError(
                f"Ollama connection error for model '{self.ollama_model}': {last_error or 'unknown error'}",
            )

        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as he:
            text = resp.text
            lowered = text.lower()
            if "model" in lowered and "not found" in lowered:
                raise RuntimeError(
                    f"Ollama model '{self.ollama_model}' is not installed.",
                ) from he
            raise RuntimeError(f"Ollama error for model '{self.ollama_model}': {text}") from he

        try:
            data = resp.json()
        except Exception:
            return resp.text

        try:
            choices = data.get("choices") or []
            if choices:
                message_obj = choices[0].get("message") or {}
                content = message_obj.get("content")
                if isinstance(content, str):
                    return content
                if choices[0].get("text"):
                    return choices[0]["text"]
        except Exception:
            logger.exception("Failed to parse Ollama response for model %s", self.ollama_model)

        return json.dumps(data)

    async def _call_groq(self, message: str) -> str:
        if not self.groq_token:
            raise RuntimeError("GROQ_API_KEY or GROK_TOKEN is not configured for Groq calls.")

        endpoint = self._build_chat_completions_endpoint(self.groq_api_base)
        payload = {
            "model": self.groq_model,
            "messages": self._build_chat_messages(message),
            "temperature": 0.3,
            "max_tokens": 512,
            "top_p": 0.9,
        }

        # Use trust_env=True so client honors proxy / system TLS settings when present
        async with httpx.AsyncClient(timeout=30.0, trust_env=True, http2=False) as client:
            try:
                resp = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.groq_token}", "Content-Type": "application/json"},
                    json=payload,
                )
            except httpx.RequestError as re:
                # Network/SSL/connection errors — try a single retry with a relaxed SSL/host workaround
                err_msg = str(re)
                logger.warning("Initial provider request failed: %s", err_msg)
                # Parse host from endpoint for possible Host header
                try:
                    from urllib.parse import urlparse

                    parsed = urlparse(endpoint)
                    host_header = parsed.hostname
                except Exception:
                    host_header = None

                # Attempt a retry with verification disabled and explicit Host header (workaround for SNI/unrecognized_name)
                retry_headers = {"Authorization": f"Bearer {self.groq_token}", "Content-Type": "application/json"}
                if host_header:
                    retry_headers["Host"] = host_header

                try:
                    logger.warning("Retrying provider request with verify=False and Host header=%s", host_header)
                    async with httpx.AsyncClient(timeout=30.0, trust_env=True, http2=False, verify=False) as retry_client:
                        resp = await retry_client.post(endpoint, headers=retry_headers, json=payload)
                except httpx.RequestError as re2:
                    hint = (
                        "Network/SSL error when contacting the LLM provider. Check GROK_API_BASE, network/proxy, and ensure the host is reachable. "
                        "If you are behind a corporate proxy or using a private CA, set HTTP(S)_PROXY or SSL_CERT_FILE accordingly."
                    )
                    raise RuntimeError(f"Provider connection error (retry failed): {re2}. {hint}") from re2

            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as he:
                # Attempt to surface provider error message
                text = resp.text
                try:
                    parsed = json.loads(text)
                    provider_msg = parsed.get("error") or parsed.get("detail") or parsed
                except Exception:
                    provider_msg = text

                raise RuntimeError(f"Upstream provider error: {provider_msg}") from he

            # Parse JSON response
            try:
                data = resp.json()
            except Exception:
                # Return raw text if JSON parsing fails.
                text = resp.text
                return text

        try:
            choices = data.get("choices") or []
            if choices:
                message_obj = choices[0].get("message") or {}
                content = message_obj.get("content")
                if isinstance(content, str):
                    return content
                # Some providers return 'text'
                if choices[0].get("text"):
                    return choices[0]["text"]
        except Exception:
            logger.exception("Failed to parse Groq response")

        return json.dumps(data)

    async def _call_openai_compat(self, message: str) -> str:
        return await self._call_groq(message)

    async def call_openai_with_token(self, token: str, message: str, model: Optional[str] = None, api_base: Optional[str] = None) -> str:
        """Call an OpenAI-compatible / Grok endpoint using the provided token.

        This is useful for one-off tests when you want to validate a token
        without setting global environment variables.
        """
        if not token:
            raise RuntimeError("token is required for provider call")

        endpoint = self._build_chat_completions_endpoint(api_base or self.groq_api_base)
        payload = {
            "model": model or self.groq_model,
            "messages": self._build_chat_messages(message),
            "temperature": 0.3,
            "max_tokens": 512,
            "top_p": 0.9,
        }

        async with httpx.AsyncClient(timeout=30.0, trust_env=True, http2=False) as client:
            resp = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )

        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as he:
            text = resp.text
            try:
                parsed = resp.json()
                provider_msg = parsed.get("error") or parsed.get("detail") or parsed
            except Exception:
                provider_msg = text

            raise RuntimeError(f"Upstream provider error: {provider_msg}") from he

        try:
            data = resp.json()
        except Exception:
            return resp.text

        try:
            choices = data.get("choices") or []
            if choices:
                message_obj = choices[0].get("message") or {}
                content = message_obj.get("content")
                if isinstance(content, str):
                    return content
                if choices[0].get("text"):
                    return choices[0]["text"]
        except Exception:
            logger.exception("Failed to parse provider response (with token)")

        return json.dumps(data)






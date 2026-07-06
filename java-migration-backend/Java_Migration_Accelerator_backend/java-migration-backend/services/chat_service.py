import asyncio
import os
import json
import logging
import re
import ast
import operator
from dataclasses import asdict, dataclass, field
from pathlib import Path
from time import perf_counter
from typing import Any, Optional
import httpx

from services.rag_service import RAGService

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
    mode: str = "GENERAL_LLM"
    failed: bool = False
    sources: list[dict[str, Any]] = field(default_factory=list)
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
        self.rag_service = RAGService()

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
                    "You are a helpful engineering assistant inside a Java migration platform. "
                    "Answer the user's exact question directly, naturally, and accurately. "
                    "For migration questions, give practical migration guidance. "
                    "For AI or Python questions, explain the actual AI or Python concept directly. "
                    "Do not force every question into migration advice. "
                    "Do not invent alternate acronym expansions when the prompt already defines the term. "
                    "When RAG is discussed in an AI context, interpret it as Retrieval-Augmented Generation."
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
        if re.search(r"\b[a-z0-9._-]+\.json\b", t) and re.search(r"\b(field|fields|stored|contains|content|contents|metadata|json)\b", t):
            return "RAG_STORE_FILE"
        if re.search(r"\b(rag|retrieval augmented generation|vector db|vector database|vector store|embedding|embeddings|chroma|chromadb|sentence[- ]transformers?|semantic search)\b", t):
            return "RAG_VECTOR"
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

    def _classify_query_mode(self, text: str, context: Optional[dict] = None) -> str:
        lowered = (text or "").strip().lower()
        if not lowered:
            return "GENERAL_LLM"

        intent = self.detect_intent(lowered)
        has_repo_context = self._has_repository_context(context)
        repository_intents = {
            "POM",
            "ANALYZE",
            "STRATEGY",
            "NEXT_STEPS",
            "RISK",
            "DEPENDENCY",
            "CI",
            "TESTS",
            "PERFORMANCE",
            "JVM_OPTIONS",
            "DEPRECATED_APIS",
            "AUTOMATED_TOOLS",
            "MODULE_SYSTEM",
            "ROLLBACK",
            "MONITORING",
            "VULNERABILITIES",
            "DEBUGGING",
            "PR",
        }
        if intent == "RAG_STORE_FILE":
            return "REPOSITORY_RAG"

        explicit_repo_anchors = [
            r"\b(this|current|our)\s+(project|repository|repo|codebase|backend|frontend|chatbot)\b",
            r"\b(in this|in the current|in our)\s+(project|repository|repo|codebase|backend|frontend)\b",
            r"\b(this repo|this repository|our repo|our repository|current repo|current repository|github repo)\b",
            r"\b(used here|implemented here|configured here|in this backend|in this project)\b",
        ]
        repository_subjects = [
            r"\b(connect|connection|discovery|assessment|result|results|report|progress)\b",
            r"\b(migration|migrate|migration plan|migration strategy|migration blocker|migration blockers)\b",
            r"\b(pom\.xml|build\.gradle|gradle|maven|spring boot)\b",
            r"\b(dependenc(?:y|ies)|java version|source java version|target java version|deprecated api|deprecated apis)\b",
            r"\b(ci/cd|github actions|gitlab ci|jenkins|circleci|azure pipelines)\b",
            r"\b(test coverage|api endpoints|project architecture|repository structure|project structure)\b",
            r"\b(files?|classes?|methods?|packages?|modules?)\b",
        ]
        implementation_cues = [
            r"\b(which|what|where|how)\s+(files?|classes?|methods?|packages?|modules?)\b",
            r"\b(files?|classes?|methods?|packages?|modules?)\b.*\b(used|present|inside|implemented|pipeline|flow|project)\b",
            r"\b(flow|pipeline|process|implementation|implemented|wired|routing|retrieval)\b",
            r"\b(vector_store\.py|rag_service\.py|embedding_service\.py|ingest_repository\.py|chat_service\.py)\b",
            r"\b(retrieve_context|ask_with_trace|upsert|search|ensure_index|embed_texts|embed_query)\b",
        ]
        general_definition = [
            r"\b(what is|what are|define|definition of|meaning of|difference between|advantages of|benefits of|example of)\b",
        ]
        general_knowledge = [
            r"\b(java concepts?|python concepts?|programming syntax|coding questions?|algorithm(?:s)?|machine learning)\b",
            r"\b(loops?|arrays?|docker|kubernetes|fastapi|llm)\b",
            r"\b(what is rag|what is retrieval augmented generation|what is vector database|what is vector db|what is vector store)\b",
            r"\b(what are embeddings|what is chromadb|what is an api|what is api)\b",
        ]

        if self._looks_like_general_concept_question(lowered):
            return "GENERAL_LLM"

        repo_score = 0
        general_score = 0

        has_explicit_repo_anchor = any(re.search(pattern, lowered) for pattern in explicit_repo_anchors)
        has_repository_subject = any(re.search(pattern, lowered) for pattern in repository_subjects)
        has_implementation_cue = any(re.search(pattern, lowered) for pattern in implementation_cues)
        looks_like_definition = any(re.search(pattern, lowered) for pattern in general_definition)

        if has_explicit_repo_anchor:
            repo_score += 3
        if has_repository_subject and has_explicit_repo_anchor:
            repo_score += 2
        elif has_repository_subject and has_repo_context and not looks_like_definition:
            repo_score += 2
        elif has_repository_subject and has_repo_context and intent in repository_intents:
            repo_score += 1
        if has_implementation_cue and (has_explicit_repo_anchor or has_repo_context):
            repo_score += 2

        for pattern in general_knowledge:
            if re.search(pattern, lowered):
                general_score += 2

        if intent == "RAG_VECTOR":
            if has_explicit_repo_anchor or has_implementation_cue:
                repo_score += 3
            elif looks_like_definition and not has_repo_context:
                general_score += 3
            elif looks_like_definition and not has_implementation_cue and not has_explicit_repo_anchor:
                general_score += 2
            elif has_repo_context:
                repo_score += 1
            else:
                general_score += 3

        if intent in repository_intents and (has_explicit_repo_anchor or has_repo_context):
            repo_score += 2

        if looks_like_definition and not has_explicit_repo_anchor and not has_implementation_cue:
            general_score += 2

        if (
            has_repo_context
            and self._is_strategy_page_context(context)
            and re.search(r"\b(connection|discovery|assessment|migration|strategy|result|report|progress|version|dependency|pom\.xml|build\.gradle|test|repo|repository|project|sonar|fossa)\b", lowered)
        ):
            repo_score += 1

        if repo_score > 0 and repo_score > general_score:
            return "REPOSITORY_RAG"
        return "GENERAL_LLM"

    def _has_repository_context(self, context: Optional[dict]) -> bool:
        if not isinstance(context, dict):
            return False

        for key in ("repo", "repository", "repo_path", "local_repo_path", "page", "step"):
            value = context.get(key)
            if isinstance(value, str) and value.strip():
                return True

        repo_analysis = context.get("repoAnalysis") or context.get("analysis")
        if isinstance(repo_analysis, dict) and bool(repo_analysis):
            return True

        rag_documents = context.get("rag_documents")
        if isinstance(rag_documents, list) and bool(rag_documents):
            return True

        return False

    def _has_repository_analysis_context(self, context: Optional[dict]) -> bool:
        if not isinstance(context, dict):
            return False
        repo_analysis = context.get("repoAnalysis") or context.get("analysis")
        return isinstance(repo_analysis, dict) and bool(repo_analysis)

    def _looks_like_general_concept_question(self, text: Optional[str]) -> bool:
        lowered = (text or "").strip().lower()
        if not lowered:
            return False

        match = re.match(
            r"^(?:what is|what are|define|definition of|meaning of)\s+(.+?)(?:\?+)?$",
            lowered,
        )
        if not match:
            return False

        subject = match.group(1).strip().rstrip("?.! ")
        if not subject or subject.startswith("the "):
            return False

        project_specific_cues = [
            r"\b(this|current|our)\b",
            r"\b(project|repository|repo|codebase|backend|frontend|chatbot)\b",
            r"\b(used here|implemented here|configured here|inside this|in this|for this)\b",
            r"\b(present|available|configured|used|implemented|inside)\b",
        ]
        if any(re.search(pattern, subject) for pattern in project_specific_cues):
            return False

        return True

    async def ask(self, message: str, context: Optional[dict] = None) -> str:
        trace = await self.ask_with_trace(message, context)
        return trace.reply

    async def ask_with_trace(self, message: str, context: Optional[dict] = None) -> ChatTraceResult:
        text = (message or "").strip()
        context = context or {}
        if not text:
            return ChatTraceResult(
                reply=self.greeting_response(),
                intent="GREETING",
                provider="builtin",
                model="builtin",
                total_latency_ms=0,
                mode="GENERAL_LLM",
            )

        intent = self.detect_intent(text)
        query_mode = self._classify_query_mode(text, context)
        logger.info("Intent=%s QueryMode=%s", intent, query_mode)

        if intent == "RAG_STORE_FILE":
            return ChatTraceResult(
                reply=self.build_rag_store_file_response(text),
                intent=intent,
                provider="grounded",
                model="grounded",
                total_latency_ms=0,
                mode="REPOSITORY_RAG",
            )

        retrieval_context = context
        rag_context: Optional[str] = None
        rag_sources: list[dict[str, Any]] = []
        response_mode = query_mode
        if query_mode == "REPOSITORY_RAG":
            if intent == "RAG_VECTOR":
                retrieval_context = self._build_rag_vector_retrieval_context(context)
                prompt = self.build_rag_vector_focused_prompt(text, retrieval_context)
                rag_result = await self.rag_service.retrieve_context(text, retrieval_context)
                rag_context = rag_result.context
                rag_sources = [asdict(source) for source in rag_result.sources]
                rag_context = self._augment_rag_vector_context(rag_context, text, retrieval_context)
            elif intent == "STRATEGY":
                prompt = self.build_strategy_focused_prompt(text, context)
                rag_result = await self.rag_service.retrieve_context(text, retrieval_context)
                rag_context = rag_result.context
                rag_sources = [asdict(source) for source in rag_result.sources]
            else:
                prompt = self.build_llm_prompt(text, context, simplified=intent == "GREETING")
                prompt = self._apply_intent_specific_prompt_rules(prompt, intent, context)
                prompt = self._append_repository_grounding_notes(prompt, intent, context)
                rag_result = await self.rag_service.retrieve_context(text, retrieval_context)
                rag_context = rag_result.context
                rag_sources = [asdict(source) for source in rag_result.sources]

            if not rag_context or not rag_context.strip():
                if self._looks_like_general_concept_question(text):
                    logger.info("Falling back to general LLM path for concept question without repository context.")
                    final_prompt = self.build_general_knowledge_prompt(text)
                    response_mode = "GENERAL_LLM"
                    rag_sources = []
                else:
                    grounded_reply = self._build_repository_analysis_fallback(text, context, intent)
                    if grounded_reply:
                        logger.info(
                            "Using grounded repository-analysis fallback for intent=%s without vector context.",
                            intent,
                        )
                        return ChatTraceResult(
                            reply=grounded_reply,
                            intent=intent,
                            provider="grounded",
                            model="repo-analysis",
                            total_latency_ms=0,
                            mode="REPOSITORY_RAG",
                            sources=[],
                        )
                    if self._has_repository_analysis_context(context):
                        logger.info(
                            "Using repository-analysis prompt fallback for intent=%s without vector context.",
                            intent,
                        )
                        final_prompt = self._build_repository_analysis_prompt(prompt, text, context)
                        response_mode = "REPOSITORY_RAG"
                        rag_sources = []
                    else:
                        return ChatTraceResult(
                            reply=self.build_repository_context_not_found_response(text),
                            intent=intent,
                            provider="rag",
                            model="no-context",
                            total_latency_ms=0,
                            mode="REPOSITORY_RAG",
                            failed=True,
                            sources=[],
                        )
            else:
                final_prompt = self._build_repository_rag_prompt(prompt, text, rag_context)
        else:
            final_prompt = self.build_general_knowledge_prompt(text)
            response_mode = "GENERAL_LLM"
            rag_sources = []

        try:
            logger.info("Calling configured LLM for message")
            llm_result = await self.call_llm(
                final_prompt,
                providers=self._provider_sequence_for_intent(intent),
            )
            reply_text = llm_result.reply
            if query_mode == "REPOSITORY_RAG" and intent == "RAG_VECTOR" and (
                self._is_rag_vector_reply_off_topic(reply_text)
                or self._is_rag_vector_reply_inexact(reply_text)
            ):
                logger.info("Replacing off-topic or inexact RAG/vector reply with grounded project explanation")
                reply_text = self.build_rag_vector_response(text, retrieval_context)
            return ChatTraceResult(
                reply=reply_text,
                intent=intent,
                provider=llm_result.provider,
                model=llm_result.model,
                total_latency_ms=llm_result.total_latency_ms,
                mode=response_mode,
                sources=rag_sources if response_mode == "REPOSITORY_RAG" else [],
                attempts=llm_result.attempts,
            )
        except LLMProviderChainError as exc:
            logger.exception("LLM call failed")
            if query_mode == "REPOSITORY_RAG" and intent == "RAG_VECTOR":
                return ChatTraceResult(
                    reply=self.build_rag_vector_response(text, retrieval_context),
                    intent=intent,
                    provider="grounded",
                    model="grounded",
                    total_latency_ms=sum(attempt.latency_ms for attempt in exc.attempts),
                    mode=response_mode,
                    sources=rag_sources if response_mode == "REPOSITORY_RAG" else [],
                    attempts=exc.attempts,
                )
            if query_mode == "REPOSITORY_RAG" and self._has_repository_analysis_context(context):
                grounded_reply = self._build_repository_analysis_fallback(text, context, intent) or self.build_analysis_response(context)
                return ChatTraceResult(
                    reply=grounded_reply,
                    intent=intent,
                    provider="grounded",
                    model="repo-analysis",
                    total_latency_ms=sum(attempt.latency_ms for attempt in exc.attempts),
                    mode="REPOSITORY_RAG",
                    sources=[],
                    attempts=exc.attempts,
                )
            return ChatTraceResult(
                reply="Sorry, I could not reach the LLM right now. Please try again in a moment.",
                intent=intent,
                provider="unavailable",
                model="unavailable",
                total_latency_ms=sum(attempt.latency_ms for attempt in exc.attempts),
                mode=response_mode,
                failed=True,
                sources=rag_sources if response_mode == "REPOSITORY_RAG" else [],
                attempts=exc.attempts,
            )
        except Exception:
            logger.exception("LLM call failed")
            if query_mode == "REPOSITORY_RAG" and intent == "RAG_VECTOR":
                return ChatTraceResult(
                    reply=self.build_rag_vector_response(text, retrieval_context),
                    intent=intent,
                    provider="grounded",
                    model="grounded",
                    total_latency_ms=0,
                    mode=response_mode,
                    sources=rag_sources if response_mode == "REPOSITORY_RAG" else [],
                )
            if query_mode == "REPOSITORY_RAG" and self._has_repository_analysis_context(context):
                grounded_reply = self._build_repository_analysis_fallback(text, context, intent) or self.build_analysis_response(context)
                return ChatTraceResult(
                    reply=grounded_reply,
                    intent=intent,
                    provider="grounded",
                    model="repo-analysis",
                    total_latency_ms=0,
                    mode="REPOSITORY_RAG",
                    sources=[],
                )
            return ChatTraceResult(
                reply="Sorry, I could not reach the LLM right now. Please try again in a moment.",
                intent=intent,
                provider="unavailable",
                model="unavailable",
                total_latency_ms=0,
                mode=response_mode,
                failed=True,
                sources=rag_sources if response_mode == "REPOSITORY_RAG" else [],
            )

    def greeting_response(self) -> str:
        return (
            "## Hello\n"
            "Hi! How can I help with the migration? Ask about migration strategy, versions, next steps, or a checklist."
        )

    def _backend_root(self) -> Path:
        return Path(__file__).resolve().parents[1]

    def _project_root(self) -> Path:
        return Path(__file__).resolve().parents[4]

    def _rag_store_dir(self) -> Path:
        return self._backend_root() / ".rag_store"

    def _rag_reference_documents(self) -> list[dict[str, str]]:
        provider_order = " -> ".join(self._provider_label(provider) for provider in self._selected_providers())
        return [
            {
                "label": "rag-overview",
                "type": "architecture",
                "text": (
                    "In this project, RAG means Retrieval-Augmented Generation. "
                    "The chatbot first retrieves relevant project context from a local vector store, "
                    "then appends that context to the prompt before calling the existing LLM provider chain."
                ),
            },
            {
                "label": "embedding-service",
                "type": "embedding_service",
                "text": (
                    "services/embedding_service.py defines the EmbeddingService class. "
                    "Its main methods include is_available, is_chroma_available, embedding_metadata, "
                    "embed_texts, embed_query, embed_texts_for_chroma, embed_query_for_chroma, "
                    "embedding_dimension, and as_langchain_embeddings. "
                    "It uses LangChain HuggingFaceEmbeddings with the "
                    "'sentence-transformers/all-MiniLM-L6-v2' model by default, "
                    "creates float32 embeddings, and normalizes them for similarity search."
                ),
            },
            {
                "label": "vector-store",
                "type": "vector_store",
                "text": (
                    "services/vector_store.py defines the VectorStore class and uses LangChain Chroma "
                    "with persistent storage in the .rag_store/chroma directory. "
                    "Its main methods include namespace_exists, get_fingerprint, upsert, and search. "
                    "It stores repository chunks in persistent Chroma collections, persists metadata as JSON sidecar files, "
                    "and performs top-k similarity search over stored documents."
                ),
            },
            {
                "label": "rag-service",
                "type": "rag_service",
                "text": (
                    "services/rag_service.py defines the RAGService class. "
                    "Its main methods include retrieve_context and _retrieve_context_sync. "
                    "It builds a namespace from repo and page, ensures the index exists, "
                    "passes the user question into the vector search layer, filters by similarity score, "
                    "and returns the best matching context chunks."
                ),
            },
            {
                "label": "chat-flow",
                "type": "chat_flow",
                "text": (
                    "services/chat_service.py handles the assistant flow. "
                    "It detects the intent, calls RAG before the LLM providers when needed, "
                    "and inserts retrieved context into the final prompt. "
                    f"Then the provider chain {provider_order} answers the question."
                ),
            },
            {
                "label": "ingestion-service",
                "type": "ingestion_service",
                "text": (
                    "services/ingest_repository.py defines the RepositoryIngestionService class. "
                    "Its ensure_index method creates documents from repository analysis, extra RAG notes, "
                    "and selected project files. Those documents are chunked and prepared for LangChain Chroma indexing."
                ),
            },
        ]

    def _build_rag_vector_retrieval_context(self, context: Optional[dict]) -> dict:
        retrieval_context = dict(context or {})
        existing_docs = retrieval_context.get("rag_documents")
        docs: list[dict[str, str]] = []
        if isinstance(existing_docs, list):
            docs.extend(existing_docs)
        docs.extend(self._rag_reference_documents())

        retrieval_context.update(
            {
                "repo": "java-migration-assistant-rag",
                "page": "assistant-architecture",
                "repo_path": str(self._project_root()),
                "local_repo_path": str(self._project_root()),
                "rag_documents": docs,
            }
        )
        return retrieval_context

    def _build_inline_rag_reference_context(self) -> str:
        lines: list[str] = []
        for index, document in enumerate(self._rag_reference_documents(), start=1):
            label = document.get("label") or f"context-{index}"
            lines.append(f"[Context {index}] {label}")
            lines.append(document.get("text", "").strip())
            lines.append("")
        return "\n".join(lines).strip()

    def _build_rag_enhanced_prompt(
        self,
        base_prompt: str,
        user_message: str,
        rag_context: Optional[str],
    ) -> str:
        if not rag_context:
            return base_prompt
        return "\n".join(
            [
                "You are answering inside a Java migration assistant with project-aware RAG enabled.",
                "Treat the retrieved project context as the primary source of truth for project-specific questions.",
                "For recommendation questions, explain the answer using concrete project facts instead of only repeating the currently selected portal values.",
                "Mention specific project facts when available, such as build tool, detected Java version, test presence, dependency count, API endpoints, repository structure, embeddings, ChromaDB, or retrieval flow.",
                "If the user asks about RAG, vector stores, embeddings, or Python implementation details, use the retrieved architecture context first.",
                "If the retrieved context is still incomplete, say what is missing and then give a careful general answer.",
                "",
                "Relevant project context:",
                rag_context,
                "",
                "Base assistant instructions and page context:",
                base_prompt,
                "",
                f"Original user question: {user_message.strip()}",
            ]
        )

    def _build_repository_rag_prompt(
        self,
        base_prompt: str,
        user_message: str,
        rag_context: str,
    ) -> str:
        return "\n".join(
            [
                "You are answering a repository-specific question inside a Java migration assistant.",
                "Use only the retrieved repository context below as evidence for project facts.",
                "Do not invent files, classes, methods, versions, dependencies, modules, or migration facts.",
                "If the retrieved repository context does not contain the answer, say clearly that it was not found in the repository context.",
                "Keep the answer accurate, natural, and focused on the user's exact question.",
                "",
                "Retrieved repository context:",
                rag_context.strip(),
                "",
                "Base assistant instructions:",
                base_prompt.strip(),
                "",
                f"Original user question: {user_message.strip()}",
            ]
        )

    def _build_repository_analysis_prompt(
        self,
        base_prompt: str,
        user_message: str,
        context: Optional[dict],
    ) -> str:
        repo_analysis = (context or {}).get("repoAnalysis") or (context or {}).get("analysis") or {}
        analysis_summary = self.build_analysis_response(context)
        return "\n".join(
            [
                "You are answering a repository-specific question using the currently available repository analysis.",
                "Use the repository analysis facts below as the primary source of truth.",
                "If the exact file-level or method-level detail is not available, say so clearly and answer from the available project facts instead.",
                "Do not invent files, methods, versions, drivers, or migration blockers that are not supported by the analysis.",
                "",
                "Repository analysis summary:",
                analysis_summary.strip(),
                "",
                "Portal workflow context:",
                *self._build_portal_context_lines(context),
                "",
                f"Raw repository analysis available: {bool(repo_analysis)}",
                "",
                "Base assistant instructions:",
                base_prompt.strip(),
                "",
                f"Original user question: {user_message.strip()}",
            ]
        )

    def _augment_rag_vector_context(
        self,
        rag_context: Optional[str],
        user_message: str,
        context: Optional[dict],
    ) -> str:
        exact_facts = self.build_rag_vector_response(user_message, context)
        if rag_context and rag_context.strip():
            return "\n\n".join(
                [
                    rag_context.strip(),
                    "[Exact implementation facts]",
                    exact_facts.strip(),
                ]
            )
        return "\n".join(
            [
                "[Exact implementation facts]",
                exact_facts.strip(),
            ]
        ).strip()

    def build_general_knowledge_prompt(self, message: Optional[str]) -> str:
        question = (message or "").strip()
        return "\n".join(
            [
                "You are a helpful technical assistant.",
                "Answer the user's question directly using general technical knowledge.",
                "Do not use repository context, migration context, or project-specific assumptions unless the user explicitly asks about this repository.",
                "If the user asks about RAG, interpret it as Retrieval-Augmented Generation.",
                "Keep the answer natural, accurate, and concise.",
                "",
                "User question:",
                question,
            ]
        )

    def build_repository_context_not_found_response(self, message: Optional[str]) -> str:
        question = (message or "").strip()
        return "\n".join(
            [
                "## Repository Context Not Found",
                "",
                "I could not find enough matching information in the indexed repository context to answer that safely.",
                "Please ask about a more specific repository detail such as a file, class, method, dependency, Java version, build file, or migration step.",
                "",
                f"Original question: `{question}`",
            ]
        )

    def _build_repository_analysis_fallback(
        self,
        message: Optional[str],
        context: Optional[dict],
        intent: str,
    ) -> Optional[str]:
        if not self._has_repository_context(context):
            return None

        repo_analysis = (context or {}).get("repoAnalysis") or (context or {}).get("analysis")
        if not isinstance(repo_analysis, dict) or not repo_analysis:
            return None

        lowered = (message or "").strip().lower()
        conversational = self.build_conversational_response(message, context)
        if conversational:
            return conversational

        if intent == "ANALYZE":
            return self.build_analysis_response(context)
        if intent == "DEPENDENCY":
            return self.build_dependency_report(context)
        if intent == "RISK":
            return self.build_risk_analysis(context)
        if intent == "NEXT_STEPS":
            return self.build_next_steps(context)
        if intent == "POM":
            return self.build_pom_response(context, message)
        if intent == "CI":
            return self.build_ci_response(context)
        if intent == "STRATEGY":
            return self.build_strategy_response_v2(message, context)
        if re.search(r"\b(mysql|postgres|postgresql|database driver|jdbc driver|driver compatibility)\b", lowered):
            return self.build_java_upgrade_response(context, lowered)

        return None

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
        dependency_examples = "unknown"
        api_endpoint_count = "unknown"
        pom_present = "unknown"
        gradle_present = "unknown"
        src_main_present = "unknown"
        src_test_present = "unknown"
        if isinstance(repo_analysis, dict):
            build_tool = repo_analysis.get("build_tool") or repo_analysis.get("buildTool") or repo_analysis.get("tool")
            source_version = repo_analysis.get("java_version") or repo_analysis.get("detected_java_version")
            dependencies = repo_analysis.get("dependencies")
            if isinstance(dependencies, list) and dependencies:
                names: list[str] = []
                for dep in dependencies[:3]:
                    if not isinstance(dep, dict):
                        continue
                    artifact = dep.get("artifact_id") or dep.get("artifactId")
                    group = dep.get("group_id") or dep.get("groupId")
                    names.append(str(artifact or group or dep))
                if names:
                    dependency_examples = ", ".join(names)
            api_endpoints = repo_analysis.get("api_endpoints")
            if isinstance(api_endpoints, list):
                api_endpoint_count = str(len(api_endpoints))
            structure = repo_analysis.get("structure")
            if isinstance(structure, dict):
                pom_present = str(bool(structure.get("has_pom_xml"))).lower()
                gradle_present = str(bool(structure.get("has_build_gradle"))).lower()
                src_main_present = str(bool(structure.get("has_src_main"))).lower()
                src_test_present = str(bool(structure.get("has_src_test"))).lower()

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
                "Use the LLM answer path for connection, discovery findings, strategy, risks, Java version choices, migration progress, result summaries, Maven or Gradle changes, dependency questions, testing, CI, rollout, rollback, and next-step questions. "
                "You may also answer normal conversational or general technical questions naturally. "
                "Do not mention system limits, internal implementation details, unavailable modes, or the prompt. "
                "Do not use emojis. "
                "Prefer concise, practical guidance. Use markdown headings and bullets only when they add clarity. "
                "If the question is ambiguous, infer the most likely intent from the repository context and answer that. "
                "If the answer depends on the repository context, tie it back to detected build tool, versions, tests, dependencies, APIs, and structure. "
                "When answering a repository-specific question, mention at least two concrete project facts from the provided context. "
                "Do not automatically treat the current portal migration approach as the recommended answer; evaluate the recommendation from repository facts first, then mention whether it matches the current selection. "
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
            f"- Java upgrade required: {self._describe_java_upgrade_need(source_version, target_version)}",
            f"- Current portal risk assessment: {risk_level}",
            f"- Current portal migration approach selection: {migration_approach}",
            f"- Dependencies detected: {dependencies_count}",
            f"- Sample dependencies: {dependency_examples}",
            f"- Tests detected: {has_tests}",
            f"- API endpoints detected: {api_endpoint_count}",
            f"- pom.xml present: {pom_present}",
            f"- build.gradle present: {gradle_present}",
            f"- src/main present: {src_main_present}",
            f"- src/test present: {src_test_present}",
            "",
            *self._build_portal_context_lines(context),
            "",
            "User question:",
            question,
        ])

    def build_rag_vector_focused_prompt(self, message: Optional[str], context: Optional[dict]) -> str:
        question = (message or "").strip()
        context = context or {}

        return "\n".join(
            [
                "Answer the user's exact question about RAG, vectors, embeddings, or the Python implementation used in this project.",
                "In this context, RAG means Retrieval-Augmented Generation.",
                "In this context, vector means the embedding vector and vector store used for similarity search.",
                "Explain the concept first, then connect it to this project's Python implementation.",
                "Use clear Python/backend language, not migration-strategy language.",
                "Mention the implementation flow when relevant: embedding_service.py -> vector_store.py -> ingest_repository.py -> rag_service.py -> chat_service.py -> LLM providers.",
                "If the question mentions Python, explicitly mention LangChain, HuggingFace embeddings, ChromaDB, embeddings, chunking, retrieval, and prompt enhancement when relevant.",
                "Use exact file names, class names, and method names from the retrieved context when you mention implementation details.",
                "Do not invent classes, methods, directories, or code snippets that are not supported by the retrieved context.",
                "If the question asks for files, list the exact files and give one short role for each.",
                "If the question asks how ChromaDB works here, describe the actual VectorStore, the .rag_store/chroma location, upsert, search, and prompt enhancement flow.",
                "Prefer these exact implementation names when relevant: EmbeddingService, VectorStore, RepositoryIngestionService, RAGService, ChatService, HuggingFaceEmbeddings, Chroma, RecursiveCharacterTextSplitter, embed_texts, embed_query, embed_texts_for_chroma, embed_query_for_chroma, as_langchain_embeddings, ensure_index, retrieve_context, ask_with_trace, upsert, search.",
                "Only mention service files that actually exist in this project unless the retrieved context explicitly names another file.",
                "Keep the answer natural, direct, and technically correct.",
                "",
                "Project context:",
                f"- Assistant page/context: {context.get('page') or 'unknown'}",
                f"- Project root indexed for retrieval: {context.get('repo_path') or 'unknown'}",
                f"- Active provider chain: {' -> '.join(self._provider_label(provider) for provider in self._selected_providers())}",
                "",
                "User question:",
                question,
            ]
        )

    def build_rag_vector_response(self, message: Optional[str], context: Optional[dict]) -> str:
        question = (message or "").strip().lower()
        context = context or {}
        providers = " -> ".join(self._provider_label(provider) for provider in self._provider_sequence_for_intent("RAG_VECTOR"))
        indexed_root = str(context.get("repo_path") or self._project_root())
        wants_python = "python" in question
        asks_files = bool(re.search(r"\b(file|files|which files?|what files?|pipeline files?)\b", question))
        asks_chroma = "chroma" in question or "chromadb" in question
        asks_embedding = "embedding" in question or "embeddings" in question
        asks_flow = bool(re.search(r"\b(how (does|do|is)|flow|pipeline|process|work|works|working)\b", question))

        if asks_files:
            return "\n".join(
                [
                    "## RAG Pipeline Files",
                    "",
                    "The main files used in the RAG pipeline are:",
                    "- `services/embedding_service.py`: defines `EmbeddingService` and provides LangChain `HuggingFaceEmbeddings` plus helper methods like `embed_texts`, `embed_query`, and `as_langchain_embeddings`.",
                    "- `services/vector_store.py`: defines `VectorStore` with methods like `namespace_exists`, `get_fingerprint`, `upsert`, and `search`.",
                    "- `services/ingest_repository.py`: defines `RepositoryIngestionService` and uses `RecursiveCharacterTextSplitter` plus `ensure_index` to build or refresh the document index.",
                    "- `services/rag_service.py`: defines `RAGService` and uses `retrieve_context` plus `_retrieve_context_sync` to retrieve the best matching chunks.",
                    "- `services/chat_service.py`: defines `ChatService` and uses `ask_with_trace` plus `_build_rag_vector_retrieval_context` for RAG/vector questions.",
                    "",
                    "The local vector data is stored under:",
                    f"- `{self._rag_store_dir() / 'chroma'}`",
                    "",
                    f"The indexed project root for this flow is `{indexed_root}`.",
                ]
            )

        if asks_chroma:
            return "\n".join(
                [
                    "## ChromaDB in This Backend",
                    "",
                    "ChromaDB is the local vector database used by the RAG pipeline, and LangChain is the adapter layer used to read and write it.",
                    "",
                    "How it works here:",
                    "- `services/vector_store.py` creates a LangChain `Chroma` store that persists under `.rag_store/chroma`.",
                    "- `VectorStore.upsert` converts repository chunks into LangChain `Document` objects and adds them to a named Chroma collection.",
                    "- `VectorStore.search` uses `similarity_search_with_relevance_scores(...)` to retrieve the best matching chunks and scores.",
                    "- `services/embedding_service.py` provides normalized float32 embeddings through LangChain `HuggingFaceEmbeddings`.",
                    "- `services/rag_service.py` passes the user question into `VectorStore.search`, filters by score, and formats the retrieved chunks.",
                    f"- `services/chat_service.py` uses that retrieved context before the provider chain `{providers}` answers.",
                    "",
                    "Storage details:",
                    f"- Chroma data directory: `{self._rag_store_dir() / 'chroma'}`",
                    "- Collections are namespaced from repository and page/step values.",
                    "- JSON sidecar files in `.rag_store` keep metadata like `namespace`, `fingerprint`, `dimension`, `backend`, and `collection`.",
                    "- Low-level `chromadb.PersistentClient` access is still used for collection existence checks and cleanup.",
                ]
            )

        lines = [
            "## RAG and Vector",
            "",
            "RAG means **Retrieval-Augmented Generation**.",
            "It is a pattern where the system first retrieves relevant context, then sends that context along with the question to the LLM so the answer is grounded in project data.",
            "",
            "A **vector** is a numeric embedding of text.",
            "Texts with similar meaning end up with similar vectors, which lets a vector store perform similarity search.",
            "",
        ]

        if wants_python or asks_embedding or asks_flow:
            lines.extend(
                [
                    "In this Python backend:",
                    "- `EmbeddingService.embed_texts` and `EmbeddingService.embed_query` create normalized embeddings through LangChain `HuggingFaceEmbeddings`.",
                    "- `RepositoryIngestionService.ensure_index` builds documents, chunks them with `RecursiveCharacterTextSplitter`, and sends them to `VectorStore.upsert`.",
                    "- `VectorStore.upsert` writes LangChain `Document` objects into a persistent Chroma collection.",
                    "- `RAGService.retrieve_context` and `RAGService._retrieve_context_sync` pass the user question into `VectorStore.search`.",
                    f"- `ChatService.ask_with_trace` uses `_build_rag_vector_retrieval_context` for RAG/vector questions.",
                    f"- For normal project questions, `ChatService` adds retrieved context to the prompt before the LLM chain `{providers}` is called.",
                    "",
                    f"The project files for this flow are indexed from `{indexed_root}`.",
                ]
            )
        else:
            lines.extend(
                [
                    "In this project, the vector store is the memory layer that helps RAG find the most relevant project chunks before the LLM answers.",
                    f"The retrieved context is then passed into the provider chain `{providers}`.",
                ]
            )

        lines.extend(
            [
                "",
                "So in short: **RAG** is the retrieval-plus-generation workflow, and the **vector store** is the similarity-search layer that makes the retrieval part work.",
            ]
        )
        return "\n".join(lines)

    def _extract_json_filename(self, message: str) -> Optional[str]:
        match = re.search(r"\b([a-z0-9._-]+\.json)\b", (message or "").lower())
        if not match:
            return None
        return match.group(1)

    def _load_rag_store_payload(self, filename: str) -> Optional[dict]:
        if not filename:
            return None
        path = self._rag_store_dir() / filename
        if not path.exists() or not path.is_file():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            logger.exception("Failed to read RAG store file: %s", path)
            return None

    def build_rag_store_file_response(self, message: Optional[str]) -> str:
        filename = self._extract_json_filename((message or "").strip())
        if not filename:
            return (
                "## RAG Store File\n\n"
                "I could not detect a `.json` filename in the question. "
                "Ask with the exact file name, for example `rathinam288-essl-strategy.json`."
            )

        payload = self._load_rag_store_payload(filename)
        if not isinstance(payload, dict):
            return (
                "## RAG Store File\n\n"
                f"I could not read `{filename}` from the local `.rag_store` directory."
            )

        documents = payload.get("documents")
        document_count = len(documents) if isinstance(documents, list) else 0
        root_fields = list(payload.keys())

        metadata_keys: list[str] = []
        document_types: list[str] = []
        if isinstance(documents, list):
            for document in documents:
                if not isinstance(document, dict):
                    continue
                metadata = document.get("metadata")
                if isinstance(metadata, dict):
                    for key in metadata.keys():
                        if key not in metadata_keys:
                            metadata_keys.append(str(key))
                    doc_type = metadata.get("type")
                    if doc_type is not None and str(doc_type) not in document_types:
                        document_types.append(str(doc_type))

        lines = [
            f"## Fields In `{filename}`",
            "",
            "Top-level fields stored in this file:",
            *(f"- `{field}`" for field in root_fields),
            "",
            f"Document count: **{document_count}**",
        ]

        if metadata_keys:
            lines.extend(
                [
                    "",
                    "Fields stored inside each document's `metadata`:",
                    *(f"- `{field}`" for field in metadata_keys),
                ]
            )

        if document_types:
            lines.extend(
                [
                    "",
                    "Document `metadata.type` values currently present:",
                    *(f"- `{doc_type}`" for doc_type in document_types),
                ]
            )

        namespace = payload.get("namespace")
        fingerprint = payload.get("fingerprint")
        dimension = payload.get("dimension")
        lines.extend(
            [
                "",
                "Current values from this file:",
                f"- `namespace`: `{namespace}`",
                f"- `fingerprint`: `{fingerprint}`",
                f"- `dimension`: `{dimension}`",
            ]
        )

        return "\n".join(lines)

    def _provider_sequence_for_intent(self, intent: str) -> list[str]:
        selected = self._selected_providers()
        if intent != "RAG_VECTOR":
            return selected
        preferred = [provider for provider in ("hf", "groq", "ollama") if provider in selected]
        return preferred or selected

    def _is_rag_vector_reply_off_topic(self, reply: Optional[str]) -> bool:
        text = (reply or "").strip().lower()
        if not text:
            return True
        if any(phrase in text for phrase in [
            "readability, action, grouping",
            "risk, assessment, governance",
            "focused on java migration",
            "let me know if you have any questions about migrating your java code",
        ]):
            return True
        if "retrieval-augmented generation" in text or "retrieval augmented generation" in text:
            return False
        if all(token not in text for token in ["embedding", "vector store", "chroma", "chromadb", "similarity search", "retriev"]):
            return True
        return False

    def _is_rag_vector_reply_inexact(self, reply: Optional[str]) -> bool:
        text = (reply or "").strip().lower()
        if not text:
            return True
        hallucinated_markers = [
            "chromavectorstore",
            "create_namespace",
            "answer_query",
            "services/llm_provider.py",
            "ollamaprovider",
            "huggingfaceprovider",
            "groqprovider",
            "repo_embeddings",
        ]
        if any(marker in text for marker in hallucinated_markers):
            return True
        return False

    def build_strategy_focused_prompt(self, message: Optional[str], context: Optional[dict]) -> str:
        question = (message or "").strip()
        context = context or {}
        repo_analysis = context.get("repoAnalysis") or context.get("analysis") or {}

        def pick(*keys: str, default: str = "unknown") -> str:
            for key in keys:
                value = context.get(key)
                if value not in (None, "", [], {}):
                    return str(value)
            return default

        repo = pick("repo", "repository", "repo_name")
        build_tool = pick("build_tool", "buildTool")
        if build_tool == "unknown" and isinstance(repo_analysis, dict):
            build_tool = str(repo_analysis.get("build_tool") or repo_analysis.get("buildTool") or "unknown")

        source_version = pick("selectedSourceVersion", "source_java_version", "sourceVersion", "java_version")
        if source_version == "unknown" and isinstance(repo_analysis, dict):
            source_version = str(repo_analysis.get("java_version") or repo_analysis.get("java_version_from_build") or "unknown")

        target_version = pick("selectedTargetVersion", "target_java_version", "targetVersion", "target_version")
        risk_level = pick("riskLevel", "risk_level", "risk")
        migration_approach = pick("migrationApproach", "migration_approach", "approach")
        dependencies_count = pick("dependencies_count", "dependenciesCount")
        has_tests = pick("has_tests", "hasTests")

        api_endpoint_count = "unknown"
        pom_present = "unknown"
        sample_dependencies = "unknown"
        if isinstance(repo_analysis, dict):
            api_endpoints = repo_analysis.get("api_endpoints")
            if isinstance(api_endpoints, list):
                api_endpoint_count = str(len(api_endpoints))
            structure = repo_analysis.get("structure")
            if isinstance(structure, dict):
                pom_present = "yes" if structure.get("has_pom_xml") else "no"
            dependencies = repo_analysis.get("dependencies")
            if isinstance(dependencies, list) and dependencies:
                names: list[str] = []
                for dep in dependencies[:3]:
                    if isinstance(dep, dict):
                        names.append(str(dep.get("artifact_id") or dep.get("artifactId") or dep.get("group_id") or dep.get("groupId") or dep))
                if names:
                    sample_dependencies = ", ".join(names)

        same_version = (
            source_version.lower() != "unknown"
            and target_version.lower() != "unknown"
            and source_version == target_version
        )

        return "\n".join(
            [
                "Answer this one repository-specific migration strategy question.",
                "Use the facts below and keep the answer short and direct.",
                "",
                "Repository facts:",
                f"- Repository: {repo}",
                f"- Build tool: {build_tool}",
                f"- Source Java version: {source_version}",
                f"- Target Java version: {target_version}",
                f"- Same source/target version: {'yes' if same_version else 'no'}",
                f"- Tests detected: {has_tests}",
                f"- Risk level: {risk_level}",
                f"- Dependencies detected: {dependencies_count}",
                f"- API endpoints detected: {api_endpoint_count}",
                f"- pom.xml present: {pom_present}",
                f"- Sample dependencies: {sample_dependencies}",
                f"- Current portal approach selection: {migration_approach}",
                "",
                "Portal workflow context:",
                *self._build_portal_context_lines(context),
                "",
                "Answer rules:",
                "- First state whether there is an actual Java version upgrade selected.",
                "- If source and target are the same, say this is mainly a repository workflow decision, not a Java-version upgrade.",
                "- If the team needs isolation or a separate migrated copy, say a fork is appropriate.",
                "- If the team only wants to validate or apply changes in the same repository, say a branch is simpler.",
                "- Mention at least two concrete repository facts from the list above.",
                "- Do not invent labels like phased migration, big bang, or strangler.",
                "- Keep the answer to 4 to 6 sentences.",
                "",
                "User question:",
                question,
            ]
        )

    def _describe_java_upgrade_need(self, source_version: object, target_version: object) -> str:
        source_text = str(source_version or "").strip()
        target_text = str(target_version or "").strip()
        if not source_text or not target_text or "unknown" in {source_text.lower(), target_text.lower()}:
            return "unknown"
        if source_text == target_text:
            return f"no (source and target are both Java {source_text})"
        return f"yes (Java {source_text} -> Java {target_text})"

    def _apply_intent_specific_prompt_rules(
        self,
        base_prompt: str,
        intent: str,
        context: Optional[dict],
    ) -> str:
        if intent != "STRATEGY":
            return base_prompt

        context = context or {}
        source_version = (
            context.get("selectedSourceVersion")
            or context.get("source_java_version")
            or context.get("sourceVersion")
            or context.get("java_version")
            or "unknown"
        )
        target_version = (
            context.get("selectedTargetVersion")
            or context.get("target_java_version")
            or context.get("targetVersion")
            or context.get("target_version")
            or "unknown"
        )
        build_tool = (
            context.get("build_tool")
            or context.get("buildTool")
            or ((context.get("repoAnalysis") or {}).get("build_tool") if isinstance(context.get("repoAnalysis"), dict) else None)
            or "unknown"
        )
        has_tests = context.get("has_tests")
        if has_tests in (None, "") and isinstance(context.get("repoAnalysis"), dict):
            has_tests = context["repoAnalysis"].get("has_tests")
        dependencies_count = (
            context.get("dependencies_count")
            or context.get("dependenciesCount")
            or (
                len((context.get("repoAnalysis") or {}).get("dependencies", []))
                if isinstance((context.get("repoAnalysis") or {}).get("dependencies"), list)
                else "unknown"
            )
        )
        migration_approach = (
            context.get("migrationApproach")
            or context.get("migration_approach")
            or context.get("approach")
            or "unknown"
        )
        same_version = (
            str(source_version).strip().lower() != "unknown"
            and str(target_version).strip().lower() != "unknown"
            and str(source_version).strip() == str(target_version).strip()
        )

        return "\n".join(
            [
                base_prompt,
                "",
                "Strategy-specific answer rules:",
                "- Start with one direct sentence about whether an actual Java version upgrade is currently selected.",
                "- Treat 'migration strategy' as the best recommendation for this repository context first.",
                "- First check whether there is an actual Java version upgrade selected.",
                f"- Source Java version to evaluate: {source_version}",
                f"- Target Java version to evaluate: {target_version}",
                "- If source and target versions are the same, say clearly that no Java version upgrade is currently selected.",
                "- In that case, answer in terms of repository workflow or next practical step, not as a Java-upgrade migration plan.",
                "- Use concrete repository facts such as Maven or Gradle, tests, dependency count, API endpoints, and structure.",
                "- Do not invent rollout labels such as phased migration, big bang, or strangler unless the user explicitly asks about rollout style.",
                "- If you recommend fork or branch, explain why that fits this repository specifically.",
                f"- Repository facts to cite if relevant: build tool={build_tool}, tests detected={has_tests}, dependencies detected={dependencies_count}, current portal approach={migration_approach}.",
                (
                    f"- Important: source and target are both Java {source_version}, so this is not currently a Java-version upgrade."
                    if same_version
                    else "- Important: treat this as a real Java upgrade question only if the source and target versions are different."
                ),
            ]
        )

    def _append_repository_grounding_notes(
        self,
        base_prompt: str,
        intent: str,
        context: Optional[dict],
    ) -> str:
        context = context or {}
        if intent != "STRATEGY":
            return base_prompt

        source_version = str(
            context.get("selectedSourceVersion")
            or context.get("source_java_version")
            or context.get("sourceVersion")
            or context.get("java_version")
            or "unknown"
        ).strip()
        target_version = str(
            context.get("selectedTargetVersion")
            or context.get("target_java_version")
            or context.get("targetVersion")
            or context.get("target_version")
            or "unknown"
        ).strip()
        build_tool = str(
            context.get("build_tool")
            or context.get("buildTool")
            or ((context.get("repoAnalysis") or {}).get("build_tool") if isinstance(context.get("repoAnalysis"), dict) else None)
            or "unknown"
        ).strip()
        risk_level = str(
            context.get("riskLevel")
            or context.get("risk_level")
            or context.get("risk")
            or "unknown"
        ).strip()
        has_tests = context.get("has_tests")
        if has_tests in (None, "") and isinstance(context.get("repoAnalysis"), dict):
            has_tests = context["repoAnalysis"].get("has_tests")
        dependencies = (
            context.get("dependencies_count")
            or context.get("dependenciesCount")
            or (
                len((context.get("repoAnalysis") or {}).get("dependencies", []))
                if isinstance((context.get("repoAnalysis") or {}).get("dependencies"), list)
                else "unknown"
            )
        )
        migration_approach = str(
            context.get("migrationApproach")
            or context.get("migration_approach")
            or context.get("approach")
            or "unknown"
        ).strip()

        notes = [
            "Repository-grounded guidance to preserve in the final answer:",
            f"- The repository uses {build_tool}.",
            f"- Tests detected: {has_tests}.",
            f"- Current portal risk assessment: {risk_level}.",
            f"- Dependencies detected: {dependencies}.",
            f"- Current portal approach selection: {migration_approach}.",
        ]

        if (
            source_version
            and target_version
            and source_version.lower() != "unknown"
            and target_version.lower() != "unknown"
            and source_version == target_version
        ):
            notes.extend(
                [
                    f"- Source and target are both Java {source_version}, so there is no actual Java-version upgrade selected right now.",
                    "- Because there is no Java-version upgrade selected, the answer should focus on repository workflow and the next practical step.",
                    "- If the team only wants to validate or apply changes in the same codebase, say a branch is usually simpler.",
                    "- If the team needs isolation, experimentation, or a separate migrated copy, say a fork is appropriate.",
                    "- Do not present this as a phased migration plan.",
                ]
            )
            notes.extend(
                [
                    "Repository-grounded draft to preserve in meaning:",
                    f"- There is no actual Java-version upgrade selected because the source and target are both Java {source_version}.",
                    f"- The repository uses {build_tool}, has tests={has_tests}, and the portal currently marks risk as {risk_level}.",
                    "- Because this is not a Java-version jump, the strategy discussion is mainly about repository workflow.",
                    "- A branch is usually the simpler option if the team only wants to validate or apply changes in the same repository.",
                    "- A fork is still appropriate if the team needs isolation, experimentation, or a separate migrated copy.",
                    "- Explain whether the current portal selection matches that reasoning instead of just repeating it.",
                ]
            )
        else:
            notes.extend(
                [
                    f"- Treat this as a real Java upgrade only if source={source_version} and target={target_version} are different.",
                    "- Explain the strategy recommendation using repository facts, not only the current portal selection.",
                ]
            )

        notes.append("- Keep the answer natural, but do not change these facts.")
        return "\n".join([base_prompt, "", *notes])

    def _is_strategy_page_context(self, context: Optional[dict]) -> bool:
        if not isinstance(context, dict):
            return False
        mode = str(context.get("assistantMode") or context.get("assistant_mode") or "").lower()
        page = str(context.get("page") or "").lower()
        return mode == "strategy" or page == "strategy"

    def _as_text(self, value: Any, default: str = "unknown") -> str:
        if value is None:
            return default
        if isinstance(value, bool):
            return "yes" if value else "no"
        if isinstance(value, (list, dict)) and not value:
            return default
        text = str(value).strip()
        return text if text else default

    def _format_preview_list(
        self,
        values: Any,
        *,
        limit: int = 5,
        empty: str = "none",
    ) -> str:
        if not isinstance(values, list):
            return empty
        items: list[str] = []
        for value in values:
            if value is None:
                continue
            text = str(value).strip()
            if not text:
                continue
            items.append(text)
            if len(items) >= limit:
                break
        return ", ".join(items) if items else empty

    def _extract_portal_snapshot(self, context: Optional[dict]) -> dict[str, Any]:
        ctx = context or {}
        repo_analysis = ctx.get("repoAnalysis") or ctx.get("analysis")
        repo_analysis = repo_analysis if isinstance(repo_analysis, dict) else {}
        connection = ctx.get("connection_summary")
        connection = connection if isinstance(connection, dict) else {}
        discovery = ctx.get("discovery_summary")
        discovery = discovery if isinstance(discovery, dict) else {}
        strategy = ctx.get("strategy_summary")
        strategy = strategy if isinstance(strategy, dict) else {}
        migration = ctx.get("migration_summary")
        migration = migration if isinstance(migration, dict) else {}
        result = ctx.get("result_summary")
        result = result if isinstance(result, dict) else {}
        repo_snapshot = self._extract_repo_snapshot(context)

        repo_name = (
            ctx.get("repo")
            or ctx.get("repository")
            or connection.get("repository_name")
            or repo_analysis.get("full_name")
            or repo_analysis.get("name")
        )
        repo_url = (
            ctx.get("repo_url")
            or ctx.get("repository_url")
            or connection.get("repository_url")
        )
        dependency_sample = discovery.get("dependency_sample")
        if not isinstance(dependency_sample, list):
            dependency_sample = []
            for dep in repo_snapshot.get("dependencies", [])[:6]:
                if not isinstance(dep, dict):
                    continue
                group_id = dep.get("group_id") or dep.get("groupId") or ""
                artifact_id = dep.get("artifact_id") or dep.get("artifactId") or dep.get("artifact") or ""
                coord = f"{group_id}:{artifact_id}".strip(":")
                if coord:
                    dependency_sample.append(coord)

        api_endpoint_sample = discovery.get("api_endpoint_sample")
        if not isinstance(api_endpoint_sample, list):
            api_endpoint_sample = []
            api_endpoints = repo_analysis.get("api_endpoints")
            if isinstance(api_endpoints, list):
                for endpoint in api_endpoints[:5]:
                    if not isinstance(endpoint, dict):
                        continue
                    method = str(endpoint.get("method") or "ANY").strip()
                    path = str(endpoint.get("path") or endpoint.get("file") or "").strip()
                    if path:
                        api_endpoint_sample.append(f"{method} {path}")

        detected_frameworks = discovery.get("detected_frameworks")
        if not isinstance(detected_frameworks, list) or not detected_frameworks:
            detected_frameworks = repo_snapshot.get("frameworks") or []

        return {
            "wizard_page": self._as_text(
                ctx.get("page") or ctx.get("assistantMode") or "strategy",
                default="strategy",
            ),
            "wizard_step_number": ctx.get("wizard_step_number") or ctx.get("wizard_indicator_step") or 3,
            "wizard_step_route": self._as_text(
                ctx.get("wizard_step_route") or ctx.get("step") or "strategy",
                default="strategy",
            ),
            "wizard_pages_available": (
                ctx.get("wizard_pages_available")
                if isinstance(ctx.get("wizard_pages_available"), list)
                else []
            ),
            "repo_name": self._as_text(repo_name),
            "repo_url": self._as_text(repo_url),
            "platform": self._as_text(
                ctx.get("platform") or connection.get("platform"),
                default="unknown",
            ),
            "default_branch": self._as_text(
                ctx.get("default_branch")
                or connection.get("default_branch")
                or repo_analysis.get("default_branch"),
            ),
            "connection_selected": bool(connection.get("repository_selected") or repo_name or repo_url),
            "connection_visibility": self._as_text(
                connection.get("visibility"),
                default="unknown",
            ),
            "connection_access_mode": self._as_text(
                connection.get("access_mode"),
                default="unknown",
            ),
            "connection_current_path": self._as_text(
                connection.get("current_path"),
                default="root",
            ),
            "connection_files_listed": connection.get("files_listed") or 0,
            "connection_file_sample": connection.get("file_sample")
            if isinstance(connection.get("file_sample"), list)
            else [],
            "analysis_ready": bool(discovery.get("analysis_ready") or repo_analysis),
            "analysis_loading": bool(discovery.get("analysis_loading")),
            "build_tool": self._as_text(
                discovery.get("build_tool") or ctx.get("build_tool") or repo_snapshot.get("build_tool")
            ),
            "detected_java_version": self._as_text(
                discovery.get("detected_java_version")
                or ctx.get("java_version")
                or repo_analysis.get("java_version")
                or repo_analysis.get("java_version_from_build")
            ),
            "source_version_status": self._as_text(
                discovery.get("source_version_status"),
                default="unknown",
            ),
            "suggested_java_version": self._as_text(
                discovery.get("suggested_java_version"),
                default="unknown",
            ),
            "dependencies_count": discovery.get("dependencies_count")
            or ctx.get("dependencies_count")
            or len(repo_snapshot.get("dependencies", [])),
            "dependency_sample": dependency_sample,
            "api_endpoints_count": discovery.get("api_endpoints_count")
            or repo_snapshot.get("api_count")
            or 0,
            "api_endpoint_sample": api_endpoint_sample,
            "has_tests": discovery.get("has_tests")
            if discovery.get("has_tests") is not None
            else repo_snapshot.get("has_tests"),
            "detected_frameworks": detected_frameworks,
            "version_recommendation": discovery.get("version_recommendation")
            if isinstance(discovery.get("version_recommendation"), dict)
            else {},
            "source_version": self._as_text(
                strategy.get("source_java_version")
                or ctx.get("selectedSourceVersion")
                or ctx.get("source_java_version")
                or repo_snapshot.get("source_version")
            ),
            "target_version": self._as_text(
                strategy.get("target_java_version")
                or ctx.get("selectedTargetVersion")
                or ctx.get("target_java_version")
                or repo_snapshot.get("target_version")
            ),
            "risk_level": self._as_text(
                strategy.get("risk_level")
                or ctx.get("riskLevel")
                or ctx.get("risk_level"),
                default="unknown",
            ),
            "migration_approach": self._as_text(
                strategy.get("migration_approach")
                or ctx.get("migrationApproach")
                or ctx.get("migration_approach"),
                default="unknown",
            ),
            "selected_conversions": strategy.get("selected_conversions")
            if isinstance(strategy.get("selected_conversions"), list)
            else (
                ctx.get("selected_conversions")
                if isinstance(ctx.get("selected_conversions"), list)
                else []
            ),
            "run_tests": strategy.get("run_tests"),
            "run_sonar": strategy.get("run_sonar"),
            "run_fossa": strategy.get("run_fossa"),
            "fix_business_logic": strategy.get("fix_business_logic"),
            "migration_started": bool(migration.get("migration_started")),
            "migration_status": self._as_text(
                migration.get("status"),
                default="not_started",
            ),
            "migration_current_step": self._as_text(
                migration.get("current_step"),
                default="not_started",
            ),
            "migration_progress": migration.get("progress_percent"),
            "target_repo_name": self._as_text(
                migration.get("target_repo_name"),
                default="unknown",
            ),
            "target_repo": self._as_text(
                migration.get("target_repo"),
                default="unknown",
            ),
            "migration_files_modified": migration.get("files_modified"),
            "migration_issues_fixed": migration.get("issues_fixed"),
            "migration_total_errors": migration.get("total_errors"),
            "migration_total_warnings": migration.get("total_warnings"),
            "migration_recent_logs": migration.get("recent_logs")
            if isinstance(migration.get("recent_logs"), list)
            else [],
            "migration_current_error": self._as_text(
                migration.get("current_error"),
                default="none",
            ),
            "report_ready": bool(result.get("report_ready")),
            "result_status": self._as_text(
                result.get("status"),
                default="not_started",
            ),
            "completed_at": self._as_text(
                result.get("completed_at"),
                default="not_available",
            ),
            "result_files_modified": result.get("files_modified"),
            "result_issues_fixed": result.get("issues_fixed"),
            "result_errors_fixed": result.get("errors_fixed"),
            "result_total_errors": result.get("total_errors"),
            "result_total_warnings": result.get("total_warnings"),
            "api_endpoints_validated": result.get("api_endpoints_validated"),
            "api_endpoints_working": result.get("api_endpoints_working"),
            "sonar_quality_gate": self._as_text(
                result.get("sonar_quality_gate"),
                default="not_available",
            ),
            "sonar_coverage": result.get("sonar_coverage"),
            "sonar_bugs": result.get("sonar_bugs"),
            "sonar_vulnerabilities": result.get("sonar_vulnerabilities"),
            "sonar_code_smells": result.get("sonar_code_smells"),
            "fossa_policy_status": self._as_text(
                result.get("fossa_policy_status"),
                default="not_available",
            ),
            "fossa_total_dependencies": result.get("fossa_total_dependencies"),
            "fossa_license_issues": result.get("fossa_license_issues"),
            "fossa_vulnerabilities": result.get("fossa_vulnerabilities"),
            "fossa_outdated_dependencies": result.get("fossa_outdated_dependencies"),
        }

    def _build_portal_context_lines(self, context: Optional[dict]) -> list[str]:
        snap = self._extract_portal_snapshot(context)
        lines = [
            "Portal workflow snapshot:",
            f"- Active assistant page: {snap['wizard_page']}",
            f"- Wizard step: {snap['wizard_step_number']} ({snap['wizard_step_route']})",
            f"- Available pages: {self._format_preview_list(snap['wizard_pages_available'], limit=8, empty='connect, discovery, strategy, migration, result')}",
            f"- Connection: repo={snap['repo_name']}, platform={snap['platform']}, branch={snap['default_branch']}, visibility={snap['connection_visibility']}, access={snap['connection_access_mode']}",
            f"- Discovery: ready={'yes' if snap['analysis_ready'] else 'no'}, build tool={snap['build_tool']}, Java={snap['detected_java_version']}, dependencies={snap['dependencies_count']}, tests={self._as_text(snap['has_tests'])}, endpoints={snap['api_endpoints_count']}",
            f"- Strategy: source={snap['source_version']}, target={snap['target_version']}, risk={snap['risk_level']}, approach={snap['migration_approach']}, conversions={self._format_preview_list(snap['selected_conversions'], limit=6, empty='none selected')}",
            f"- Migration execution: started={'yes' if snap['migration_started'] else 'no'}, status={snap['migration_status']}, current step={snap['migration_current_step']}, progress={snap['migration_progress'] if snap['migration_progress'] is not None else 'n/a'}",
            f"- Result/report: ready={'yes' if snap['report_ready'] else 'no'}, files modified={snap['result_files_modified'] if snap['result_files_modified'] is not None else 'n/a'}, issues fixed={snap['result_issues_fixed'] if snap['result_issues_fixed'] is not None else 'n/a'}, Sonar={snap['sonar_quality_gate']}, FOSSA={snap['fossa_policy_status']}",
        ]
        dependency_preview = self._format_preview_list(
            snap["dependency_sample"],
            limit=5,
            empty="",
        )
        if dependency_preview:
            lines.append(f"- Dependency sample: {dependency_preview}")
        endpoint_preview = self._format_preview_list(
            snap["api_endpoint_sample"],
            limit=4,
            empty="",
        )
        if endpoint_preview:
            lines.append(f"- Endpoint sample: {endpoint_preview}")
        framework_preview = self._format_preview_list(
            snap["detected_frameworks"],
            limit=5,
            empty="",
        )
        if framework_preview:
            lines.append(f"- Framework hints: {framework_preview}")
        return lines

    def build_connection_response(self, context: Optional[dict]) -> str:
        snap = self._extract_portal_snapshot(context)
        lines = [
            "## Connection",
            "",
            f"- Repository: {snap['repo_name']}",
            f"- Repository URL: {snap['repo_url']}",
            f"- Platform: {snap['platform']}",
            f"- Default branch: {snap['default_branch']}",
            f"- Access mode: {snap['connection_access_mode']}",
            f"- Visibility: {snap['connection_visibility']}",
            f"- Current repository explorer path: {snap['connection_current_path']}",
            f"- Files currently listed in the explorer: {snap['connection_files_listed']}",
        ]
        file_preview = self._format_preview_list(
            snap["connection_file_sample"],
            limit=6,
            empty="",
        )
        if file_preview:
            lines.extend(["", f"- File sample: {file_preview}"])
        return "\n".join(lines)

    def build_discovery_response(self, context: Optional[dict]) -> str:
        snap = self._extract_portal_snapshot(context)
        lines = [
            "## Discovery",
            "",
            f"- Analysis ready: {'yes' if snap['analysis_ready'] else 'no'}",
            f"- Build tool: {snap['build_tool']}",
            f"- Detected Java version: {snap['detected_java_version']}",
            f"- Dependencies detected: {snap['dependencies_count']}",
            f"- Tests detected: {self._as_text(snap['has_tests'])}",
            f"- API endpoints detected: {snap['api_endpoints_count']}",
            f"- Source version status: {snap['source_version_status']}",
            f"- Suggested Java version: {snap['suggested_java_version']}",
        ]
        dependency_preview = self._format_preview_list(
            snap["dependency_sample"],
            limit=6,
            empty="",
        )
        if dependency_preview:
            lines.append(f"- Dependency sample: {dependency_preview}")
        framework_preview = self._format_preview_list(
            snap["detected_frameworks"],
            limit=6,
            empty="",
        )
        if framework_preview:
            lines.append(f"- Framework hints: {framework_preview}")
        endpoint_preview = self._format_preview_list(
            snap["api_endpoint_sample"],
            limit=5,
            empty="",
        )
        if endpoint_preview:
            lines.append(f"- Endpoint sample: {endpoint_preview}")
        version_recommendation = snap["version_recommendation"]
        if isinstance(version_recommendation, dict) and version_recommendation.get("recommended_target_version"):
            lines.append(
                f"- Recommended target from discovery: {version_recommendation.get('recommended_target_version')} ({version_recommendation.get('confidence') or 'confidence not provided'})"
            )
        return "\n".join(lines)

    def build_migration_execution_response(self, context: Optional[dict]) -> str:
        snap = self._extract_portal_snapshot(context)
        lines = [
            "## Migration Execution",
            "",
            f"- Selected source version: {snap['source_version']}",
            f"- Selected target version: {snap['target_version']}",
            f"- Migration approach: {snap['migration_approach']}",
            f"- Selected conversions: {self._format_preview_list(snap['selected_conversions'], limit=6, empty='none selected')}",
            f"- Run tests: {self._as_text(snap['run_tests'])}",
            f"- Run SonarQube: {self._as_text(snap['run_sonar'])}",
            f"- Run FOSSA: {self._as_text(snap['run_fossa'])}",
            f"- Fix business logic: {self._as_text(snap['fix_business_logic'])}",
        ]
        if snap["migration_started"]:
            lines.extend(
                [
                    f"- Migration status: {snap['migration_status']}",
                    f"- Current migration step: {snap['migration_current_step']}",
                    f"- Progress: {snap['migration_progress'] if snap['migration_progress'] is not None else 'n/a'}",
                    f"- Target repository name: {snap['target_repo_name']}",
                    f"- Target repository URL: {snap['target_repo']}",
                    f"- Files modified so far: {snap['migration_files_modified'] if snap['migration_files_modified'] is not None else 'n/a'}",
                    f"- Issues fixed so far: {snap['migration_issues_fixed'] if snap['migration_issues_fixed'] is not None else 'n/a'}",
                ]
            )
            if snap["migration_current_error"] != "none":
                lines.append(f"- Current migration error: {snap['migration_current_error']}")
        else:
            lines.extend(
                [
                    "- Migration has not started yet from this workflow.",
                    "- The current strategy selections above are what will drive the migration run.",
                ]
            )
        return "\n".join(lines)

    def build_result_summary_response(self, context: Optional[dict]) -> str:
        snap = self._extract_portal_snapshot(context)
        lines = [
            "## Result & Report",
            "",
            f"- Report ready: {'yes' if snap['report_ready'] else 'no'}",
            f"- Status: {snap['result_status']}",
            f"- Completed at: {snap['completed_at']}",
            f"- Files modified: {snap['result_files_modified'] if snap['result_files_modified'] is not None else 'n/a'}",
            f"- Issues fixed: {snap['result_issues_fixed'] if snap['result_issues_fixed'] is not None else 'n/a'}",
            f"- Remaining errors: {snap['result_total_errors'] if snap['result_total_errors'] is not None else 'n/a'}",
            f"- Remaining warnings: {snap['result_total_warnings'] if snap['result_total_warnings'] is not None else 'n/a'}",
            f"- API endpoints working: {snap['api_endpoints_working'] if snap['api_endpoints_working'] is not None else 'n/a'} / {snap['api_endpoints_validated'] if snap['api_endpoints_validated'] is not None else 'n/a'}",
            f"- Sonar quality gate: {snap['sonar_quality_gate']}",
            f"- FOSSA policy status: {snap['fossa_policy_status']}",
        ]
        if not snap["report_ready"]:
            lines.extend(
                [
                    "",
                    "The final report is not ready yet, so the result page can only show the current in-flight or pre-run values.",
                ]
            )
        return "\n".join(lines)

    def build_portal_overview_response(self, context: Optional[dict]) -> str:
        snap = self._extract_portal_snapshot(context)
        return "\n".join(
            [
                "## Workflow Snapshot",
                "",
                f"1. Connection: repo={snap['repo_name']}, platform={snap['platform']}, branch={snap['default_branch']}, access={snap['connection_access_mode']}.",
                f"2. Discovery: build tool={snap['build_tool']}, Java={snap['detected_java_version']}, dependencies={snap['dependencies_count']}, tests={self._as_text(snap['has_tests'])}, endpoints={snap['api_endpoints_count']}.",
                f"3. Strategy: source={snap['source_version']}, target={snap['target_version']}, risk={snap['risk_level']}, approach={snap['migration_approach']}.",
                f"4. Migration: started={'yes' if snap['migration_started'] else 'no'}, status={snap['migration_status']}, current step={snap['migration_current_step']}, progress={snap['migration_progress'] if snap['migration_progress'] is not None else 'n/a'}.",
                f"5. Result: report ready={'yes' if snap['report_ready'] else 'no'}, files modified={snap['result_files_modified'] if snap['result_files_modified'] is not None else 'n/a'}, issues fixed={snap['result_issues_fixed'] if snap['result_issues_fixed'] is not None else 'n/a'}, Sonar={snap['sonar_quality_gate']}, FOSSA={snap['fossa_policy_status']}.",
            ]
        )

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

        if re.search(r"\b(result page|report page|migration result|migration results|report summary|files modified|issues fixed|quality gate|sonar|fossa|download report)\b", lowered):
            return self.build_result_summary_response(context)

        if re.search(r"\b(workflow|full flow|whole flow|across pages|all pages|all stages)\b|\b(connection|discovery|strategy|migration|result|report)\b.*\b(pages|stages)\b", lowered):
            return self.build_portal_overview_response(context)

        if re.search(r"\b(connect|connected|connection|selected repo|selected repository|which repo|which repository|repository url|repo url|default branch|private repo|pat token|access mode)\b", lowered):
            return self.build_connection_response(context)

        if re.search(r"\b(discovery|assessment|analysis summary|what did discovery find|what did the scan find|what was detected)\b", lowered):
            return self.build_discovery_response(context)

        if re.search(r"\b(migration status|migration progress|current migration step|current step|progress page|progress percent|job status|target repository)\b", lowered):
            return self.build_migration_execution_response(context)

        if re.search(r"\b(build tool|migration changes|which dependencies|manual review|vulnerable dependencies|tests detected|frameworks?|apis?|ci pipeline|ci changes|license risks?|unusual licenses?|size|complexity|multi-module|module)\b", lowered):
            return self.build_repo_faq_response(context, lowered)

        if re.search(r"\b(java 17|java 21|should this repo move|why is java 17 recommended|tradeoffs?|difference(s)? between 17 and 21|javax|jakarta|maven configuration|compatibility risks?|compatibility concerns?|what should be tested|migration risks?|step-by-step migration plan)\b", lowered):
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
        database_drivers = []
        database_driver_rules = [
            ("MySQL", ("mysql", "mariadb")),
            ("PostgreSQL", ("postgres", "postgresql")),
        ]
        for label, needles in database_driver_rules:
            for dep in dependencies:
                if not isinstance(dep, dict):
                    continue
                group_id = str(dep.get("group_id") or dep.get("groupId") or "").lower()
                artifact_id = str(dep.get("artifact_id") or dep.get("artifactId") or dep.get("artifact") or "").lower()
                coord = f"{group_id}:{artifact_id}"
                if any(needle in coord for needle in needles):
                    database_drivers.append(label)
                    break

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
            "database_drivers": database_drivers,
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
        database_drivers = snap["database_drivers"]
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
            if database_drivers:
                lines.append("")
                lines.append("Detected database drivers:")
                for item in database_drivers:
                    lines.append(f"- {item}")
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
        database_drivers = snap["database_drivers"]

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

        if re.search(r"\b(mysql|postgres|postgresql|database driver|jdbc driver|driver compatibility|compatibility risks?|compatibility concerns?|migration risks?|block|blocked|step-by-step migration plan)\b", lowered_message):
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
            if database_drivers:
                parts.append(
                    f"- Database driver review: {', '.join(database_drivers)} driver compatibility with the target JDK and framework stack"
                )
                parts.append("- Verify JDBC driver versions, dialect settings, and connection pool behavior after upgrade")
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

    async def call_llm(self, prompt: str, providers: Optional[list[str]] = None) -> LLMCallResult:
        """Call the configured LLM provider or provider chain."""
        attempts: list[ProviderAttempt] = []
        chain_started = perf_counter()

        provider_sequence = providers or self._selected_providers()
        for provider in provider_sequence:
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






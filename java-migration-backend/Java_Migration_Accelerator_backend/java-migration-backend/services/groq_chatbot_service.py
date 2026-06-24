import json
import os
from typing import Any, Dict, Optional

import httpx


MAX_CONTEXT_CHARS = 12000

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are the assistant for the Java Migration Accelerator project displayed in the application. "
    "Your job is to answer user questions about this project and the repository analysis or migration results currently displayed in the app. "
    "You must not perform a new repository analysis, fetch repository files, call external tools, or invent repository details. "
    "Only explain, summarize, compare, or reason from the information already shown to the user in the app or provided in the chat context. "
    "You can answer questions about the connected repository details shown in the app, detected Java version, selected source and target Java versions, "
    "detected build tool, dependency list and dependency statuses, migration issues shown in the results, errors, warnings, suggested fixes, "
    "selected conversion types, migration progress and job status, files modified count, tests, SonarQube and FOSSA-style results, "
    "migration logs displayed in the UI, and what the user should do next based on the displayed result. "
    "When the user asks about the repository, base your answer only on the displayed analysis or migration result. "
    "If the required detail is not present in the provided context, say that the app does not currently show that information and suggest where the user can check. "
    "Do not claim that you scanned, analyzed, cloned, or inspected the repository yourself. Instead say things like: "
    "Based on the result shown in the migrator, From the displayed analysis, or The current migration result indicates. "
    "Answer clearly and helpfully based on the visible project features, screens, workflows, and backend behavior. "
    "Keep answers concise, friendly, and practical. Explain technical migration details in simple terms when possible. "
    "Do not invent exact backend data, repository results, tokens, private credentials, or migration output that you cannot see. "
    "If the user asks anything unrelated, reply exactly: \"I can only answer questions related to this Java Migration application.\""
)


class GroqChatbotService:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

    async def generate_reply(self, message: str, api_key: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> str:
        effective_api_key = (api_key or self.api_key or "").strip()
        if not effective_api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        if not message or not message.strip():
            return "I can only answer questions related to this Java Migration application."

        user_content = self._build_user_content(message, context)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {effective_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"].strip()

    def _build_user_content(self, message: str, context: Optional[Dict[str, Any]]) -> str:
        user_content = message.strip()
        if not context:
            return user_content

        context_json = json.dumps(context, ensure_ascii=False, separators=(",", ":"))
        if len(context_json) > MAX_CONTEXT_CHARS:
            context_json = (
                context_json[:MAX_CONTEXT_CHARS]
                + "... [context truncated to keep the chatbot request small]"
            )

        return (
            f"{user_content}\n\n"
            "Displayed migrator context. Use only this context for repository-specific answers; "
            "do not perform or claim a new repository analysis:\n"
            f"{context_json}"
        )

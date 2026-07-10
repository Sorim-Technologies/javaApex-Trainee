import asyncio
import time
from types import SimpleNamespace

from services.testing.gemini_client import GeminiClient


def test_call_gemini_respects_timeout(monkeypatch):
    client = GeminiClient()
    client.api_key = "fake-key"
    client.request_timeout_seconds = 0.01
    client.max_retries = 1
    monkeypatch.setattr("services.testing.gemini_client.HAS_GENAI", True)

    class SlowModel:
        def generate_content(self, prompt):
            time.sleep(0.2)
            return SimpleNamespace(text="slow")

    fake_genai = SimpleNamespace(
        configure=lambda api_key=None: None,
        GenerativeModel=lambda name: SlowModel(),
    )
    monkeypatch.setattr("services.testing.gemini_client.genai", fake_genai, raising=False)

    async def run_test():
        return await client._call_gemini("prompt", caller_label="unit-test")

    result = asyncio.run(run_test())
    assert result is None

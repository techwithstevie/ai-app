# server/app/ollama_client.py
import httpx
from .config import settings


async def chat_with_ollama(messages: list[dict]) -> str:
    """
    Call Ollama's /api/chat endpoint with a full messages array.
    messages: list of {"role": "system" | "user" | "assistant", "content": str}
    """
    payload: dict = {
        "model": settings.default_model,
        "messages": messages,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        # Adjust based on actual Ollama response shape.
        # Typically: data["message"]["content"]
        message = data.get("message", {})
        return message.get("content", "")
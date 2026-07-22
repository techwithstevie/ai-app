# server/app/ollama_client.py
import httpx
from .config import settings


async def generate_reply(prompt: str, system: str | None = None) -> str:
    """
    Call Ollama's /api/generate using the default model from settings.
    """
    payload: dict = {
        "model": settings.default_model,
        "prompt": prompt,
        "stream": False,
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")
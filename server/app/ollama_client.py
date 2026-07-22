import httpx

OLLAMA_URL = "http://localhost:11434"

async def generate_reply(model: str, prompt: str, system: str | None = None) -> str:
    payload: dict = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }

    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=60) as client:
        # non-streaming: Ollama returns one JSON object
        resp = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "")
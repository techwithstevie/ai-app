# server/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ChatRequest, ChatResponse
from .ollama_client import chat_with_ollama

app = FastAPI(
    title="AI Chat Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation store: session_id -> list[dict]
conversations: dict[str, list[dict]] = {}


@app.get("/")
async def root():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    session_id = req.session_id

    # Initialize conversation if needed
    if session_id not in conversations:
        conversations[session_id] = []
        # Optional system persona at start
        if req.system:
            conversations[session_id].append(
                {"role": "system", "content": req.system}
            )

    # Append user message
    conversations[session_id].append(
        {"role": "user", "content": req.message}
    )

    # Call Ollama with full history
    assistant_reply = await chat_with_ollama(conversations[session_id])

    # Append assistant reply
    conversations[session_id].append(
        {"role": "assistant", "content": assistant_reply}
    )

    return ChatResponse(reply=assistant_reply)
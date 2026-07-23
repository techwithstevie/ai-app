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

PERSONAS = {
    "default": "You are a helpful AI assistant.",
    "senior_dev": (
        "You are a senior full-stack engineer specializing in React Native, "
        "FastAPI, and local LLMs via Ollama. Give concise, practical, "
        "production-minded answers."
    ),
    "career_strategist": (
        "You are an experienced tech recruiter and career strategist for software "
        "and AI engineers. Help tailor resumes, refine cover letters, and draft "
        "outreach messages. Focus on quantifiable achievements, production impact, "
        "ATS optimization, and crisp, engaging phrasing."
    ),
    "interview_coach": (
        "You are a principal engineer and hiring manager. Help the user prep for "
        "technical and behavioral interviews. Enforce the STAR method (Situation, "
        "Task, Action, Result) for behavioral questions, probe for trade-offs in "
        "system design, and provide sharp, constructive feedback."
    ),
}

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
        persona_key = req.persona or "default"
        system_prompt = PERSONAS.get(persona_key, PERSONAS["default"])
        conversations[session_id].append(
            {"role": "system", "content": system_prompt}
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

@app.get("/personas")
async def list_personas():
    return {"personas": list(PERSONAS.keys())}
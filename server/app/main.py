# server/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ChatRequest, ChatResponse
from .ollama_client import chat_with_ollama
from . import db

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

CHAT_RESPONSE_STYLE = """
You are replying inside a mobile chat app.

Write responses that look good in chat bubbles.
Use plain text only.
Do not use markdown.
Do not use headings.
Do not use bold or italic markers.
Do not use tables.
Do not use code fences unless the user explicitly asks for code.
Do not use long bullet lists unless the user explicitly asks for a list.

Keep replies concise, clear, and conversational.
Default to 2 to 5 short paragraphs.
Use short sentences.
If the answer could be long, give the short version first.
Only expand when the user asks for more detail.

There is no markdown renderer in the UI, so raw markdown will look broken.
""".strip()


def build_system_prompt(persona_key: str) -> str:
    persona_prompt = PERSONAS.get(persona_key, PERSONAS["default"])
    return f"{persona_prompt}\n\n{CHAT_RESPONSE_STYLE}"


@app.on_event("startup")
async def on_startup():
    db.init_db()


@app.get("/")
async def root():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    session_id = req.session_id
    persona_key = req.persona or "default"

    if not db.session_exists(session_id):
        db.create_session(session_id, persona_key)
        system_prompt = build_system_prompt(persona_key)
        db.save_message(session_id, "system", system_prompt)

    db.save_message(session_id, "user", req.message)

    history = db.load_messages(session_id)

    try:
        assistant_reply = await chat_with_ollama(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    db.save_message(session_id, "assistant", assistant_reply)

    return ChatResponse(reply=assistant_reply)


@app.get("/personas")
async def list_personas():
    return {"personas": list(PERSONAS.keys())}


@app.get("/sessions")
async def get_sessions():
    return {"sessions": db.list_sessions()}


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    messages = db.load_messages(session_id)
    visible = [m for m in messages if m["role"] != "system"]
    return {"messages": visible}


@app.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    db.delete_session(session_id)
    return {"status": "deleted"}
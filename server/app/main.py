from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ChatRequest, ChatResponse
from .ollama_client import generate_reply
import os

app = FastAPI(
    title="AI Chat Backend",
    version="0.1.0",
)

# CORS so Expo app can talk to this during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # tighter later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """ Simple AI chat endpoint """
    reply = await generate_reply(
        system=req.system, 
        prompt=req.message
        )
    return ChatResponse(reply=reply)
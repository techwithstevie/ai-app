from pydantic import BaseModel

class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str 
    persona: str | None = None
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str
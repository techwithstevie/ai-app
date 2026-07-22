from pydantic import BaseModel

class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str 
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str
from pydantic import BaseModel

class ChatRequest(BaseModel):
    model: str = "gpt-oss:120b-cloud"
    message: str
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str
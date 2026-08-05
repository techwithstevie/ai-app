from pydantic import BaseModel, EmailStr

class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str
    persona: str | None = None
    system: str | None = None

class ChatResponse(BaseModel):
    reply: str

class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str

class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthTokenResponse(BaseModel):
    token: str

class UserResponse(BaseModel):
    email: EmailStr

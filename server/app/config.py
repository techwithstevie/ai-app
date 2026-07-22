from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    default_model: str = "gpt-oss:120b-cloud"
    ollama_url: str = "http://localhost:11434"

    class Config:
        env_file = ".env"

settings = Settings()
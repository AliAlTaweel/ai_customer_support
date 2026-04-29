import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Luxe AI Support Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Server Settings
    PORT: int = 3001
    HOST: str = "127.0.0.1"          # safe default; set 0.0.0.0 in .env only when needed
    ALLOWED_ORIGINS: list[str] = []   # must be set in .env — empty = no CORS allowed

    # LLM Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    MANAGER_MODEL: str = "ollama/llama3.1:8b"
    WORKER_MODEL: str = "ollama/gemma4:e4b"
    EMBEDDING_MODEL: str = "ollama/nomic-embed-text:latest"

    # Clerk Auth Settings — MUST be set in .env, no hardcoded values
    CLERK_JWKS_URL: Optional[str] = None
    CLERK_ISSUER: Optional[str] = None

    # Rate Limiting (per authenticated user / per IP for guests)
    RATE_LIMIT_REQUESTS: int = 15   # max requests per window
    RATE_LIMIT_WINDOW_SECONDS: int = 60  # window size in seconds

    # Database Settings
    DATABASE_URL: Optional[str] = None
    DB_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/prisma/dev.db"))

    # FAQ Settings
    FAQ_DATA_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../FAQ/faq.json"))
    INDEX_SAVE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../faq_index"))

    # AWS S3 Settings (for FAISS index persistence)
    AWS_REGION: str = "eu-north-1"
    FAISS_S3_BUCKET: Optional[str] = None
    FAISS_S3_KEY: str = "faq_index/"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

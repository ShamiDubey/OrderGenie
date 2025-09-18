import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # DeepFace settings
    MODEL_NAME: str = os.getenv("MODEL_NAME", "Facenet512")
    DETECTOR_BACKEND: str = os.getenv("DETECTOR_BACKEND", "retinaface")

    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080", "*"]


settings = Settings()

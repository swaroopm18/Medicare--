from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):

    # ---------------------------------------------------------
    # Database
    # ---------------------------------------------------------

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "medicare"

    # ---------------------------------------------------------
    # Authentication
    # ---------------------------------------------------------

    jwt_secret: str = "insecure_dev_secret_change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # ---------------------------------------------------------
    # Frontend / CORS
    # ---------------------------------------------------------

    frontend_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:3000"
    )

    # ---------------------------------------------------------
    # OCR
    # ---------------------------------------------------------

    tesseract_cmd: str = ""

    # ---------------------------------------------------------
    # AI Assistant
    # ---------------------------------------------------------

    llm_provider: str = "ollama"

    llm_api_key: str = ""

    llm_model: str = "llama3.1:8b"

    llm_base_url: str = "http://127.0.0.1:11434"

    # ---------------------------------------------------------
    # Environment file
    # ---------------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------------------------------------------------------
    # CORS helper
    # ---------------------------------------------------------

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
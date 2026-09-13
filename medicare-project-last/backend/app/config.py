from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "medicare"

    jwt_secret: str = "insecure_dev_secret_change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    tesseract_cmd: str = ""

    llm_provider: str = ""
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


settings = Settings()

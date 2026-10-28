from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "RepoMedic AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # GitHub
    GITHUB_TOKEN: str = Field(default="", description="Optional GitHub personal access token")
    GITHUB_API_BASE: str = "https://api.github.com"

    # Ollama AI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:1.5b"
    EMBEDDING_MODEL: str = "all-minilm"

    # Repository Analysis Limits
    MAX_REPOSITORY_FILES: int = 500
    MAX_FILE_SIZE_KB: int = 500
    MAX_TOTAL_CONTENT_MB: int = 20
    REQUEST_TIMEOUT_SECONDS: int = 30

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./repomedic.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_KB * 1024

    @property
    def max_total_content_bytes(self) -> int:
        return self.MAX_TOTAL_CONTENT_MB * 1024 * 1024

    @property
    def parsed_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()

from typing import List, Optional
from pydantic import BaseModel


class HistoryItem(BaseModel):
    id: str
    repository_id: str
    owner: str
    name: str
    url: str
    analyzed_at: str
    status: str
    files_count: int = 0
    primary_languages: List[str] = []
    description: Optional[str] = None


class SettingsResponse(BaseModel):
    backend_status: str = "healthy"
    version: str = "1.0.0"
    ollama_connected: bool = False
    ollama_base_url: str
    configured_model: str
    model_available: bool = False
    available_models: List[str] = []
    embedding_model: str
    max_repository_files: int
    max_file_size_kb: int
    max_total_content_mb: int
    github_token_configured: bool = False

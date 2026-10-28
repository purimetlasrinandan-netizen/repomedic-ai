from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class AnalyzeRepositoryRequest(BaseModel):
    url: str = Field(..., description="Public GitHub repository URL, e.g. https://github.com/owner/repo")
    force_reindex: bool = Field(default=False, description="Whether to re-fetch and re-index if already analyzed")


class AnalysisProgressStatus(BaseModel):
    repository_id: str
    step: str
    percentage: int
    message: str
    is_complete: bool = False
    is_error: bool = False
    error_message: Optional[str] = None


class FileMetadata(BaseModel):
    path: str
    size: int
    language: str
    lines_count: int
    is_indexed: bool = True


class RepositoryMetadata(BaseModel):
    id: str
    owner: str
    name: str
    url: str
    description: Optional[str] = None
    default_branch: str = "main"
    stars: int = 0
    forks: int = 0
    license: Optional[str] = None
    primary_languages: List[str] = []
    frameworks: List[str] = []
    total_files_discovered: int = 0
    files_indexed_count: int = 0
    total_size_bytes: int = 0
    readme_summary: Optional[str] = None
    important_files: List[str] = []
    risk_areas: List[str] = []
    analyzed_at: str
    status: str = "ready"


class FileContentResponse(BaseModel):
    path: str
    content: str
    language: str
    size: int
    lines_count: int
    is_truncated: bool = False
    total_lines: int


class RepositoryFileListResponse(BaseModel):
    repository_id: str
    total_files: int
    files: List[FileMetadata]

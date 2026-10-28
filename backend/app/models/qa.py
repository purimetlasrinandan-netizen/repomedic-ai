from typing import List, Optional
from pydantic import BaseModel, Field


class CodeSnippet(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    code: str
    language: str = "text"
    relevance_score: float = 0.0


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000, description="Natural language question about the codebase")
    include_snippets: bool = True
    max_snippets: int = Field(default=5, ge=1, le=10)


class AskQuestionResponse(BaseModel):
    question: str
    answer: str
    explanation: str
    technical_details: List[str] = []
    referenced_files: List[str] = []
    code_snippets: List[CodeSnippet] = []
    suggested_next_steps: List[str] = []
    confidence: str = "high"
    grounded_in_code: bool = True
    model_used: str = ""
    is_fallback: bool = False

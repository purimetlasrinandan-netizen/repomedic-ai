from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.models.qa import CodeSnippet


class AnalyzeBugRequest(BaseModel):
    error_message: str = Field(..., min_length=3, max_length=5000, description="Error message or exception description")
    stack_trace: Optional[str] = Field(default=None, max_length=15000, description="Optional stack trace")
    reproduction_steps: Optional[str] = Field(default=None, max_length=5000, description="Optional reproduction steps")
    suspected_file: Optional[str] = Field(default=None, max_length=500, description="Optional specific file suspected")


class SuggestedFix(BaseModel):
    original_code: str = ""
    proposed_code: str = ""
    explanation: str = ""
    files_affected: List[str] = []
    potential_side_effects: List[str] = []
    testing_recommendations: List[str] = []
    diff: str = ""


class BugAnalysisResponse(BaseModel):
    bug_summary: str
    potential_root_cause: str
    evidence: str
    relevant_files: List[str] = []
    relevant_snippets: List[CodeSnippet] = []
    suggested_fix: SuggestedFix
    why_fix_works: str
    how_to_verify: List[str] = []
    confidence_and_limitations: str
    is_ai_generated: bool = True
    model_used: str = ""
    is_fallback: bool = False

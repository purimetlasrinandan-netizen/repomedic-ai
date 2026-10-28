from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DirectoryInfo(BaseModel):
    path: str
    purpose: str
    key_files: List[str] = []


class ComponentInfo(BaseModel):
    name: str
    file_path: str
    description: str


class CommonContributionQuestion(BaseModel):
    question: str
    answer: str
    relevant_files: List[str] = []


class ContributorGuideResponse(BaseModel):
    repository_id: str
    project_purpose: str
    high_level_architecture: str
    important_directories: List[DirectoryInfo] = []
    entry_points: List[str] = []
    main_components: List[ComponentInfo] = []
    api_routes: List[str] = []
    test_directories: List[str] = []
    configuration_files: List[str] = []
    build_and_run_instructions: List[str] = []
    beginner_start_files: List[str] = []
    common_contributions: List[CommonContributionQuestion] = []

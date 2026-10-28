from backend.app.services.indexing_service import IndexingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.fixtures.sample_repo import SAMPLE_FILES


def test_python_ast_parsing():
    code = """
import os
from datetime import datetime

class TokenManager:
    \"\"\"Manages tokens securely.\"\"\"
    def generate(self, user_id: int):
        return f"token_{user_id}"

def verify(token: str) -> bool:
    return len(token) > 0
"""
    service = IndexingService()
    symbols = service.parse_python_ast(code)

    names = [s["name"] for s in symbols]
    assert "TokenManager" in names
    assert "TokenManager.generate" in names
    assert "verify" in names
    assert "os" in names
    assert "datetime.datetime" in names


def test_framework_detection():
    service = IndexingService()
    frameworks = service.detect_frameworks(SAMPLE_FILES)
    assert "FastAPI" in frameworks


def test_language_detection():
    assert IndexingService.detect_language("main.py") == "Python"
    assert IndexingService.detect_language("App.tsx") == "TypeScript (React)"
    assert IndexingService.detect_language("main.go") == "Go"
    assert IndexingService.detect_language("Cargo.toml") == "TOML"
    assert IndexingService.detect_language("Dockerfile") == "Dockerfile"


def test_retrieval_ranking():
    service = IndexingService()
    retrieval = RetrievalService()

    files_data = []
    for path, content in SAMPLE_FILES.items():
        analysis = service.analyze_file(path, content)
        analysis["content"] = content
        files_data.append(analysis)

    # Search for login/auth
    snippets = retrieval.retrieve_relevant_snippets(
        query="Where is authenticate_user defined?",
        files_data=files_data,
        max_snippets=3,
    )
    assert len(snippets) > 0
    # Top snippet should be from src/auth.py
    assert snippets[0].file_path == "src/auth.py"
    assert "authenticate_user" in snippets[0].code

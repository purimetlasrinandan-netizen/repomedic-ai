import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import validate_github_url, is_safe_relative_path
from app.core.errors import (
    RepoMedicException,
    InvalidRepositoryUrlError,
    RepositoryNotFoundError,
    FileAccessDeniedError,
)
from app.database.session import get_db, AsyncSessionLocal
from app.database.db_models import RepositoryRecord, IndexedFileRecord, QuestionRecord
from app.models.repository import (
    AnalyzeRepositoryRequest,
    AnalysisProgressStatus,
    RepositoryMetadata,
    RepositoryFileListResponse,
    FileContentResponse,
)
from backend.app.models.qa import AskQuestionRequest, AskQuestionResponse
from backend.app.models.bug import AnalyzeBugRequest, BugAnalysisResponse
from backend.app.models.contributor import ContributorGuideResponse
from backend.app.models.history import HistoryItem, SettingsResponse
from backend.app.services.github_service import GitHubService
from backend.app.services.indexing_service import IndexingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.llm_service import LLMService
from backend.app.services.bug_analysis_service import BugAnalysisService
from backend.app.services.contributor_service import ContributorService
from backend.app.services.repository_service import RepositoryService
from backend.app.fixtures.sample_repo import (
    SAMPLE_REPO_ID,
    SAMPLE_REPO_OWNER,
    SAMPLE_REPO_NAME,
    SAMPLE_REPO_URL,
    SAMPLE_FILES,
    DELIBERATE_BUG_EXAMPLE,
)

router = APIRouter(prefix="/api")

# Singletons for services
_github_service = GitHubService()
_indexing_service = IndexingService()
_retrieval_service = RetrievalService()
_llm_service = LLMService()
_bug_service = BugAnalysisService(_retrieval_service, _llm_service)
_contributor_service = ContributorService()
_repository_service = RepositoryService(_github_service, _indexing_service)


@router.get("/health", tags=["Health"])
async def health_check():
    """
    Returns backend health status and safe configuration diagnostics.
    """
    settings = get_settings()
    ollama_info = await _llm_service.check_ollama_status()

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "diagnostics": {
            "github_token_configured": bool(settings.GITHUB_TOKEN),
            "ollama_connected": ollama_info["connected"],
            "configured_model": settings.OLLAMA_MODEL,
            "model_available": ollama_info["model_available"],
            "max_repository_files": settings.MAX_REPOSITORY_FILES,
            "max_file_size_kb": settings.MAX_FILE_SIZE_KB,
            "max_total_content_mb": settings.MAX_TOTAL_CONTENT_MB,
        },
    }


@router.post("/repositories/analyze", response_model=Dict[str, Any], tags=["Repository"])
async def analyze_repository(
    req: AnalyzeRepositoryRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts a public GitHub repository URL, validates it, and starts asynchronous analysis.
    """
    try:
        owner, repo = validate_github_url(req.url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    repo_id = f"{owner}__{repo}".lower()

    # If already indexed and not force_reindex, return immediately
    existing = await _repository_service.get_repository_by_id(db, repo_id)
    if existing and not req.force_reindex:
        return {
            "repository_id": repo_id,
            "owner": owner,
            "name": repo,
            "status": "already_indexed",
            "message": "Repository is already indexed and ready.",
        }

    # Initialize progress status
    _repository_service.set_progress(
        repo_id=repo_id,
        step="Validating repository",
        percentage=10,
        message=f"Initiating analysis for {owner}/{repo}...",
    )

    # Launch background job
    background_tasks.add_task(_repository_service.analyze_repository_task, req.url, req.force_reindex)

    return {
        "repository_id": repo_id,
        "owner": owner,
        "name": repo,
        "status": "analyzing",
        "message": "Analysis started in background.",
    }


@router.get("/repositories/{repository_id}/status", response_model=AnalysisProgressStatus, tags=["Repository"])
async def get_repository_analysis_status(repository_id: str):
    """
    Returns the real-time progress status of an ongoing or completed repository analysis.
    """
    progress = _repository_service.get_progress(repository_id)
    if not progress:
        # Check if already present in database
        async with AsyncSessionLocal() as session:
            repo = await _repository_service.get_repository_by_id(session, repository_id)
            if repo:
                return AnalysisProgressStatus(
                    repository_id=repository_id,
                    step="Analysis complete",
                    percentage=100,
                    message="Repository is ready for queries.",
                    is_complete=True,
                )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active analysis or record found for repository ID '{repository_id}'.",
        )

    return progress


@router.get("/repositories/{repository_id}", response_model=RepositoryMetadata, tags=["Repository"])
async def get_repository(repository_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns repository metadata and high-level structural overview.
    """
    repo = await _repository_service.get_repository_by_id(db, repository_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository '{repository_id}' has not been analyzed yet.",
        )
    return repo


@router.get("/repositories/{repository_id}/files", response_model=RepositoryFileListResponse, tags=["Repository"])
async def get_repository_files(repository_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the searchable list of indexed files for a repository.
    """
    repo = await _repository_service.get_repository_by_id(db, repository_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    files = await _repository_service.get_repository_files_list(db, repository_id)
    return RepositoryFileListResponse(
        repository_id=repository_id,
        total_files=len(files),
        files=files,
    )


@router.get("/repositories/{repository_id}/files/content", response_model=FileContentResponse, tags=["Repository"])
async def get_file_content(
    repository_id: str,
    path: str = Query(..., description="Relative path of file in repository"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the syntax-highlightable content of an indexed file with directory traversal defense.
    """
    try:
        content_resp = await _repository_service.get_file_content(db, repository_id, path)
        return content_resp
    except FileAccessDeniedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except RepositoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/repositories/{repository_id}/ask", response_model=AskQuestionResponse, tags=["Ask Codebase"])
async def ask_question(
    repository_id: str,
    req: AskQuestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieval-Augmented Question Answering grounded in repository code.
    """
    repo = await _repository_service.get_repository_by_id(db, repository_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    files_data = await _repository_service.get_all_indexed_files(db, repository_id)
    if not files_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Repository has no indexed files.")

    # Retrieve relevant snippets
    snippets = _retrieval_service.retrieve_relevant_snippets(
        query=req.question,
        files_data=files_data,
        max_snippets=req.max_snippets,
    )

    ollama_status = await _llm_service.check_ollama_status()

    # If Ollama is available and model is pulled, query model
    if ollama_status["connected"] and ollama_status["model_available"]:
        sys_prompt, user_prompt = _llm_service.build_qa_prompt(req.question, snippets)
        llm_response = await _llm_service.generate_completion(sys_prompt, user_prompt)
        if llm_response:
            referenced_files = list(dict.fromkeys(s.file_path for s in snippets))
            return AskQuestionResponse(
                question=req.question,
                answer=llm_response,
                explanation="Generated by local AI model strictly grounded in retrieved repository code.",
                technical_details=[f"Retrieved {len(snippets)} relevant snippets from {len(referenced_files)} files."],
                referenced_files=referenced_files,
                code_snippets=snippets if req.include_snippets else [],
                suggested_next_steps=[f"View '{referenced_files[0]}' in File Explorer."] if referenced_files else [],
                confidence="high",
                grounded_in_code=True,
                model_used=get_settings().OLLAMA_MODEL,
                is_fallback=False,
            )

    # Deterministic fallback response
    fallback_data = _llm_service.synthesize_fallback_qa(req.question, snippets, ollama_status)
    return AskQuestionResponse(
        question=req.question,
        answer=fallback_data["answer"],
        explanation=fallback_data["explanation"],
        technical_details=fallback_data["technical_details"],
        referenced_files=fallback_data["referenced_files"],
        code_snippets=snippets if req.include_snippets else [],
        suggested_next_steps=fallback_data["suggested_next_steps"],
        confidence="medium" if snippets else "low",
        grounded_in_code=fallback_data["grounded_in_code"],
        model_used=fallback_data["model_used"],
        is_fallback=fallback_data["is_fallback"],
    )


@router.post("/repositories/{repository_id}/debug", response_model=BugAnalysisResponse, tags=["Bug Detective"])
async def debug_repository(
    repository_id: str,
    req: AnalyzeBugRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Parses error message & stack trace, retrieves code, and returns structured diagnosis and proposed patch.
    """
    repo = await _repository_service.get_repository_by_id(db, repository_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    files_data = await _repository_service.get_all_indexed_files(db, repository_id)

    diagnosis = await _bug_service.analyze_bug(
        error_message=req.error_message,
        stack_trace=req.stack_trace,
        reproduction_steps=req.reproduction_steps,
        suspected_file=req.suspected_file,
        files_data=files_data,
    )
    return diagnosis


@router.get("/repositories/{repository_id}/contributor-guide", response_model=ContributorGuideResponse, tags=["Contributor Guide"])
async def get_contributor_guide(
    repository_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Generates contributor onboarding guide based on repository structure, README, and routes.
    """
    repo = await _repository_service.get_repository_by_id(db, repository_id)
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    files_data = await _repository_service.get_all_indexed_files(db, repository_id)

    readme_content = ""
    for f in files_data:
        if f["path"].lower() in ("readme.md", "readme"):
            readme_content = f["content"]
            break

    guide = _contributor_service.generate_guide(
        repository_id=repository_id,
        repo_metadata=repo.model_dump(),
        files_data=files_data,
        readme_content=readme_content,
    )
    return guide


@router.get("/history", response_model=List[HistoryItem], tags=["History"])
async def get_history(db: AsyncSession = Depends(get_db)):
    """
    Returns list of previously analyzed repositories saved in SQLite.
    """
    return await _repository_service.get_history(db)


@router.delete("/history/{history_id}", tags=["History"])
async def delete_history_item(history_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes a repository analysis from history and database.
    """
    success = await _repository_service.delete_history_item(db, history_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in history.")
    return {"status": "success", "deleted_id": history_id}


@router.delete("/history", tags=["History"])
async def clear_all_history(db: AsyncSession = Depends(get_db)):
    """
    Clears all saved repository analysis history.
    """
    count = await _repository_service.clear_all_history(db)
    return {"status": "success", "cleared_count": count}


@router.get("/settings", response_model=SettingsResponse, tags=["Settings"])
async def get_settings_view():
    """
    Returns backend connectivity, Ollama status, limits, and configuration info.
    """
    settings = get_settings()
    ollama_info = await _llm_service.check_ollama_status()

    return SettingsResponse(
        backend_status="healthy",
        version=settings.VERSION,
        ollama_connected=ollama_info["connected"],
        ollama_base_url=settings.OLLAMA_BASE_URL,
        configured_model=settings.OLLAMA_MODEL,
        model_available=ollama_info["model_available"],
        available_models=ollama_info["available_models"],
        embedding_model=settings.EMBEDDING_MODEL,
        max_repository_files=settings.MAX_REPOSITORY_FILES,
        max_file_size_kb=settings.MAX_FILE_SIZE_KB,
        max_total_content_mb=settings.MAX_TOTAL_CONTENT_MB,
        github_token_configured=bool(settings.GITHUB_TOKEN),
    )


@router.post("/settings/test-ollama", tags=["Settings"])
async def test_ollama():
    """
    Forces an immediate connectivity test to the Ollama server.
    """
    return await _llm_service.check_ollama_status()


@router.get("/demo-repositories", tags=["Demo"])
def get_demo_repositories():
    """
    Returns curated demo repositories and test cases.
    """
    return {
        "built_in_fixture": {
            "id": SAMPLE_REPO_ID,
            "owner": SAMPLE_REPO_OWNER,
            "name": SAMPLE_REPO_NAME,
            "url": SAMPLE_REPO_URL,
            "description": "Built-in microservice with JWT auth, pytest tests, and deliberate KeyError bug.",
            "example_bug": DELIBERATE_BUG_EXAMPLE,
        },
        "curated_github_repos": [
            {
                "name": "fastapi/fastapi",
                "url": "https://github.com/fastapi/fastapi",
                "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
                "language": "Python",
            },
            {
                "name": "pallets/flask",
                "url": "https://github.com/pallets/flask",
                "description": "The Python micro framework for building web applications.",
                "language": "Python",
            },
            {
                "name": "expressjs/express",
                "url": "https://github.com/expressjs/express",
                "description": "Fast, unopinionated, minimalist web framework for Node.js",
                "language": "JavaScript",
            },
        ],
    }


@router.post("/demo-repositories/load-sample", tags=["Demo"])
async def load_sample_fixture(db: AsyncSession = Depends(get_db)):
    """
    Loads the built-in sample repository fixture into the SQLite database for instant offline testing.
    """
    # Delete old fixture record if exists
    await _repository_service.delete_history_item(db, SAMPLE_REPO_ID)

    files_to_index = []
    total_size = 0
    for path, content in SAMPLE_FILES.items():
        analysis = _indexing_service.analyze_file(path, content)
        analysis["content"] = content
        files_to_index.append(analysis)
        total_size += len(content.encode("utf-8"))

    detected_frameworks = _indexing_service.detect_frameworks(SAMPLE_FILES)
    important_files = _indexing_service.identify_important_files(list(SAMPLE_FILES.keys()))

    rec = RepositoryRecord(
        id=SAMPLE_REPO_ID,
        owner=SAMPLE_REPO_OWNER,
        name=SAMPLE_REPO_NAME,
        url=SAMPLE_REPO_URL,
        description="Built-in lightweight auth service fixture with unit tests and deliberate KeyError.",
        default_branch="main",
        stars=42,
        forks=5,
        license="MIT",
        primary_languages=json.dumps(["Python"]),
        frameworks=json.dumps(detected_frameworks),
        total_files_discovered=len(SAMPLE_FILES),
        files_indexed_count=len(SAMPLE_FILES),
        total_size_bytes=total_size,
        readme_summary="A lightweight, secure authentication and JWT session token management microservice.",
        important_files=json.dumps(important_files),
        risk_areas=json.dumps(["Deliberate KeyError in verify_token for test purposes."]),
        status="ready",
        analyzed_at=datetime.now(timezone.utc),
    )
    db.add(rec)

    for f in files_to_index:
        f_rec = IndexedFileRecord(
            id=f"{SAMPLE_REPO_ID}__{f['path']}",
            repository_id=SAMPLE_REPO_ID,
            path=f["path"],
            size=f["size"],
            language=f["language"],
            lines_count=f["lines_count"],
            content=f["content"],
            symbols=json.dumps(f["symbols"]),
        )
        db.add(f_rec)

    await db.commit()

    return {
        "status": "success",
        "repository_id": SAMPLE_REPO_ID,
        "message": "Sample fixture repository loaded successfully. Ready to explore and debug!",
    }

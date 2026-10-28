import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from collections import Counter
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.security import (
    validate_github_url,
    is_safe_relative_path,
    is_allowed_source_file,
    is_secret_file,
)
from backend.app.core.errors import (
    RepositoryNotFoundError,
    FileAccessDeniedError,
    RepoMedicException,
)
from backend.app.database.session import AsyncSessionLocal
from backend.app.database.db_models import RepositoryRecord, IndexedFileRecord, QuestionRecord
from backend.app.models.repository import (
    RepositoryMetadata,
    AnalysisProgressStatus,
    FileMetadata,
    FileContentResponse,
)
from backend.app.models.history import HistoryItem
from backend.app.services.github_service import GitHubService
from backend.app.services.indexing_service import IndexingService

logger = logging.getLogger(__name__)


class RepositoryService:
    def __init__(
        self,
        github_service: GitHubService,
        indexing_service: IndexingService,
    ):
        self.github_service = github_service
        self.indexing_service = indexing_service
        self.settings = get_settings()
        # In-memory progress tracking for background jobs: repo_id -> AnalysisProgressStatus
        self._progress: Dict[str, AnalysisProgressStatus] = {}

    def get_progress(self, repo_id: str) -> Optional[AnalysisProgressStatus]:
        return self._progress.get(repo_id)

    def set_progress(
        self,
        repo_id: str,
        step: str,
        percentage: int,
        message: str,
        is_complete: bool = False,
        is_error: bool = False,
        error_message: Optional[str] = None,
    ):
        self._progress[repo_id] = AnalysisProgressStatus(
            repository_id=repo_id,
            step=step,
            percentage=percentage,
            message=message,
            is_complete=is_complete,
            is_error=is_error,
            error_message=error_message,
        )

    async def get_repository_by_id(self, db: AsyncSession, repo_id: str) -> Optional[RepositoryMetadata]:
        result = await db.execute(select(RepositoryRecord).where(RepositoryRecord.id == repo_id))
        rec = result.scalar_one_or_none()
        if not rec:
            return None

        return RepositoryMetadata(
            id=rec.id,
            owner=rec.owner,
            name=rec.name,
            url=rec.url,
            description=rec.description,
            default_branch=rec.default_branch,
            stars=rec.stars,
            forks=rec.forks,
            license=rec.license,
            primary_languages=json.loads(rec.primary_languages or "[]"),
            frameworks=json.loads(rec.frameworks or "[]"),
            total_files_discovered=rec.total_files_discovered,
            files_indexed_count=rec.files_indexed_count,
            total_size_bytes=rec.total_size_bytes,
            readme_summary=rec.readme_summary,
            important_files=json.loads(rec.important_files or "[]"),
            risk_areas=json.loads(rec.risk_areas or "[]"),
            analyzed_at=rec.analyzed_at.isoformat() if rec.analyzed_at else "",
            status=rec.status,
        )

    async def get_repository_files_list(self, db: AsyncSession, repo_id: str) -> List[FileMetadata]:
        result = await db.execute(
            select(IndexedFileRecord.path, IndexedFileRecord.size, IndexedFileRecord.language, IndexedFileRecord.lines_count)
            .where(IndexedFileRecord.repository_id == repo_id)
            .order_by(IndexedFileRecord.path)
        )
        rows = result.all()
        return [
            FileMetadata(
                path=r[0],
                size=r[1],
                language=r[2],
                lines_count=r[3],
                is_indexed=True,
            )
            for r in rows
        ]

    async def get_all_indexed_files(self, db: AsyncSession, repo_id: str) -> List[Dict[str, Any]]:
        result = await db.execute(
            select(IndexedFileRecord)
            .where(IndexedFileRecord.repository_id == repo_id)
        )
        records = result.scalars().all()
        return [
            {
                "path": r.path,
                "content": r.content,
                "language": r.language,
                "size": r.size,
                "lines_count": r.lines_count,
                "symbols": json.loads(r.symbols or "[]"),
            }
            for r in records
        ]

    async def get_file_content(self, db: AsyncSession, repo_id: str, file_path: str) -> FileContentResponse:
        if not is_safe_relative_path(file_path):
            raise FileAccessDeniedError(f"File path '{file_path}' violates security traversal boundaries.")

        if is_secret_file(file_path):
            raise FileAccessDeniedError(f"Access to secret/credential file '{file_path}' is denied.")

        result = await db.execute(
            select(IndexedFileRecord)
            .where(IndexedFileRecord.repository_id == repo_id, IndexedFileRecord.path == file_path)
        )
        rec = result.scalar_one_or_none()
        if not rec:
            raise RepositoryNotFoundError(f"File '{file_path}' not found in indexed repository.")

        lines = rec.content.splitlines()
        total_lines = len(lines)
        max_preview_lines = 1500
        is_truncated = total_lines > max_preview_lines

        content_to_show = "\n".join(lines[:max_preview_lines]) if is_truncated else rec.content

        return FileContentResponse(
            path=rec.path,
            content=content_to_show,
            language=rec.language,
            size=rec.size,
            lines_count=min(total_lines, max_preview_lines),
            is_truncated=is_truncated,
            total_lines=total_lines,
        )

    async def analyze_repository_task(self, url: str, force_reindex: bool = False):
        """
        Background task to retrieve, index, and analyze a GitHub repository.
        """
        owner, repo = validate_github_url(url)
        repo_id = f"{owner}__{repo}".lower()

        # Check existing if not force_reindex
        async with AsyncSessionLocal() as session:
            existing = await self.get_repository_by_id(session, repo_id)
            if existing and not force_reindex:
                self.set_progress(
                    repo_id=repo_id,
                    step="Analysis complete",
                    percentage=100,
                    message="Repository already indexed. Ready to explore.",
                    is_complete=True,
                )
                return

        try:
            # Step 1: Validating repository
            self.set_progress(
                repo_id=repo_id,
                step="Validating repository",
                percentage=15,
                message=f"Connecting to GitHub for {owner}/{repo}...",
            )
            repo_meta = await self.github_service.get_repository_details(owner, repo)

            # Step 2: Fetching repository structure
            default_branch = repo_meta.get("default_branch", "main")
            self.set_progress(
                repo_id=repo_id,
                step="Fetching repository structure",
                percentage=30,
                message=f"Fetching tree for branch '{default_branch}'...",
            )
            tree_entries = await self.github_service.get_repository_tree(owner, repo, default_branch)

            # Step 3: Reading source files
            filtered_entries, total_discovered = self.github_service.filter_tree_entries(tree_entries)
            self.set_progress(
                repo_id=repo_id,
                step="Reading source files",
                percentage=50,
                message=f"Discovered {total_discovered} files. Reading {len(filtered_entries)} eligible code files...",
            )

            # Fetch file contents concurrently in chunks to be respectful of rate limits
            files_to_index: List[Dict[str, Any]] = []
            files_content_map: Dict[str, str] = {}
            total_size_bytes = 0
            readme_content = ""

            sem = asyncio.Semaphore(5)

            async def fetch_item(item):
                nonlocal total_size_bytes, readme_content
                path = item.get("path", "")
                async with sem:
                    content = await self.github_service.fetch_file_content(owner, repo, path, default_branch)
                    if content is not None:
                        files_content_map[path] = content
                        total_size_bytes += len(content.encode("utf-8"))
                        if path.lower() in ("readme.md", "readme"):
                            readme_content = content

            tasks = [fetch_item(item) for item in filtered_entries]
            await asyncio.gather(*tasks, return_exceptions=True)

            # Step 4: Indexing code
            self.set_progress(
                repo_id=repo_id,
                step="Indexing code",
                percentage=75,
                message="Running AST analysis, symbol extraction, and framework detection...",
            )

            lang_counter = Counter()
            for path, content in files_content_map.items():
                file_analysis = self.indexing_service.analyze_file(path, content)
                file_analysis["content"] = content
                files_to_index.append(file_analysis)
                lang_counter[file_analysis["language"]] += 1

            detected_frameworks = self.indexing_service.detect_frameworks(files_content_map)
            important_files = self.indexing_service.identify_important_files(list(files_content_map.keys()))

            # Primary languages sorted by file count
            primary_languages = [lang for lang, _ in lang_counter.most_common(5) if lang != "Plain Text"]
            if not primary_languages and lang_counter:
                primary_languages = [lang for lang, _ in lang_counter.most_common(3)]

            # Step 5: Preparing AI analysis
            self.set_progress(
                repo_id=repo_id,
                step="Preparing AI analysis",
                percentage=90,
                message="Summarizing project architecture and persisting index...",
            )

            readme_summary = None
            if readme_content:
                lines = [l.strip() for l in readme_content.splitlines() if l.strip() and not l.strip().startswith("#")]
                readme_summary = " ".join(lines[:4])[:500] if lines else None

            # Detect risk areas
            risk_areas = []
            if total_discovered > self.settings.MAX_REPOSITORY_FILES:
                risk_areas.append(f"Large repository ({total_discovered} files). Only primary {len(files_to_index)} files indexed.")
            if not any(f.lower().startswith("test") for f in files_content_map.keys()):
                risk_areas.append("No obvious automated test files detected in root directory.")
            if not readme_content:
                risk_areas.append("Missing README.md documentation.")

            # Persist to database
            async with AsyncSessionLocal() as session:
                # Delete old records if any
                await session.execute(delete(IndexedFileRecord).where(IndexedFileRecord.repository_id == repo_id))
                await session.execute(delete(RepositoryRecord).where(RepositoryRecord.id == repo_id))

                record = RepositoryRecord(
                    id=repo_id,
                    owner=owner,
                    name=repo,
                    url=repo_meta.get("url", url),
                    description=repo_meta.get("description"),
                    default_branch=default_branch,
                    stars=repo_meta.get("stars", 0),
                    forks=repo_meta.get("forks", 0),
                    license=repo_meta.get("license"),
                    primary_languages=json.dumps(primary_languages),
                    frameworks=json.dumps(detected_frameworks),
                    total_files_discovered=total_discovered,
                    files_indexed_count=len(files_to_index),
                    total_size_bytes=total_size_bytes,
                    readme_summary=readme_summary,
                    important_files=json.dumps(important_files),
                    risk_areas=json.dumps(risk_areas),
                    status="ready",
                    analyzed_at=datetime.now(timezone.utc),
                )
                session.add(record)

                for f in files_to_index:
                    f_rec = IndexedFileRecord(
                        id=f"{repo_id}__{f['path']}",
                        repository_id=repo_id,
                        path=f["path"],
                        size=f["size"],
                        language=f["language"],
                        lines_count=f["lines_count"],
                        content=f["content"],
                        symbols=json.dumps(f["symbols"]),
                    )
                    session.add(f_rec)

                await session.commit()

            # Step 6: Analysis complete
            self.set_progress(
                repo_id=repo_id,
                step="Analysis complete",
                percentage=100,
                message=f"Successfully indexed {len(files_to_index)} files. Ready for exploration and QA.",
                is_complete=True,
            )

        except Exception as e:
            logger.error(f"Analysis failed for {url}: {e}", exc_info=True)
            self.set_progress(
                repo_id=repo_id,
                step="Analysis failed",
                percentage=100,
                message=f"Analysis failed: {str(e)}",
                is_complete=False,
                is_error=True,
                error_message=str(e),
            )

    async def get_history(self, db: AsyncSession) -> List[HistoryItem]:
        result = await db.execute(select(RepositoryRecord).order_by(RepositoryRecord.analyzed_at.desc()))
        recs = result.scalars().all()
        return [
            HistoryItem(
                id=r.id,
                repository_id=r.id,
                owner=r.owner,
                name=r.name,
                url=r.url,
                analyzed_at=r.analyzed_at.isoformat() if r.analyzed_at else "",
                status=r.status,
                files_count=r.files_indexed_count,
                primary_languages=json.loads(r.primary_languages or "[]"),
                description=r.description,
            )
            for r in recs
        ]

    async def delete_history_item(self, db: AsyncSession, repo_id: str) -> bool:
        await db.execute(delete(QuestionRecord).where(QuestionRecord.repository_id == repo_id))
        await db.execute(delete(IndexedFileRecord).where(IndexedFileRecord.repository_id == repo_id))
        result = await db.execute(delete(RepositoryRecord).where(RepositoryRecord.id == repo_id))
        await db.commit()
        return result.rowcount > 0

    async def clear_all_history(self, db: AsyncSession) -> int:
        await db.execute(delete(QuestionRecord))
        await db.execute(delete(IndexedFileRecord))
        result = await db.execute(delete(RepositoryRecord))
        await db.commit()
        return result.rowcount

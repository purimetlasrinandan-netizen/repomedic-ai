import base64
import logging
from typing import Dict, Any, List, Optional, Tuple
import httpx

from backend.app.core.config import get_settings
from backend.app.core.security import (
    validate_github_url,
    is_allowed_source_file,
    is_secret_file,
    contains_likely_secret,
)
from backend.app.core.errors import (
    RepositoryNotFoundError,
    RateLimitExceededError,
    RepoMedicException,
)

logger = logging.getLogger(__name__)


class GitHubService:
    def __init__(self):
        self.settings = get_settings()

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RepoMedic-AI/1.0",
        }
        if self.settings.GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {self.settings.GITHUB_TOKEN}"
        return headers

    async def get_repository_details(self, owner: str, repo: str) -> Dict[str, Any]:
        """
        Fetches repository metadata from GitHub REST API.
        """
        url = f"{self.settings.GITHUB_API_BASE}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=self.settings.REQUEST_TIMEOUT_SECONDS) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
            except httpx.RequestError as e:
                logger.error(f"Network error connecting to GitHub: {e}")
                raise RepoMedicException(f"Failed to connect to GitHub API: {str(e)}")

            if resp.status_code == 404:
                raise RepositoryNotFoundError(f"Repository '{owner}/{repo}' not found on GitHub or is private.")
            elif resp.status_code == 403 and "rate limit" in resp.text.lower():
                raise RateLimitExceededError()
            elif resp.status_code != 200:
                raise RepoMedicException(f"GitHub API error ({resp.status_code}): {resp.text}")

            data = resp.json()
            return {
                "owner": data.get("owner", {}).get("login", owner),
                "name": data.get("name", repo),
                "url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
                "description": data.get("description"),
                "default_branch": data.get("default_branch", "main"),
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "license": data.get("license", {}).get("spdx_id") if data.get("license") else None,
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
            }

    async def get_repository_tree(self, owner: str, repo: str, branch: str) -> List[Dict[str, Any]]:
        """
        Fetches the complete recursive tree of files for the repository branch.
        """
        url = f"{self.settings.GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        async with httpx.AsyncClient(timeout=self.settings.REQUEST_TIMEOUT_SECONDS) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
            except httpx.RequestError as e:
                raise RepoMedicException(f"Network error fetching file tree: {str(e)}")

            if resp.status_code == 404:
                raise RepositoryNotFoundError(f"Branch '{branch}' or tree not found for repository '{owner}/{repo}'.")
            elif resp.status_code == 403 and "rate limit" in resp.text.lower():
                raise RateLimitExceededError()
            elif resp.status_code != 200:
                raise RepoMedicException(f"Failed to fetch tree from GitHub ({resp.status_code})")

            data = resp.json()
            tree = data.get("tree", [])
            return tree

    async def fetch_file_content(self, owner: str, repo: str, path: str, ref: str = "main") -> Optional[str]:
        """
        Fetches single file content via raw GitHub URL or Contents API.
        """
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"
        headers = {}
        if self.settings.GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {self.settings.GITHUB_TOKEN}"

        async with httpx.AsyncClient(timeout=self.settings.REQUEST_TIMEOUT_SECONDS) as client:
            try:
                resp = await client.get(raw_url, headers=headers)
                if resp.status_code == 200:
                    text = resp.text
                    if contains_likely_secret(text):
                        logger.warning(f"File {path} contained potential secrets, sanitizing content.")
                        return "# [REDACTED: Potential credential or API secret detected]"
                    return text
            except Exception as e:
                logger.warning(f"Error fetching raw file {path}: {e}")

            # Fallback to GitHub REST contents API
            api_url = f"{self.settings.GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
            try:
                resp = await client.get(api_url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("encoding") == "base64" and data.get("content"):
                        decoded = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                        if contains_likely_secret(decoded):
                            return "# [REDACTED: Potential credential or API secret detected]"
                        return decoded
            except Exception as e:
                logger.warning(f"Error fetching contents API for {path}: {e}")

        return None

    def filter_tree_entries(
        self,
        tree_entries: List[Dict[str, Any]],
        max_files: Optional[int] = None,
        max_file_size_kb: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Filters tree entries: removes non-blobs, unsafe paths, secrets, and oversized files.
        Returns (filtered_files, total_discovered_count).
        """
        if max_files is None:
            max_files = self.settings.MAX_REPOSITORY_FILES
        if max_file_size_kb is None:
            max_file_size_bytes = self.settings.max_file_size_bytes
        else:
            max_file_size_bytes = max_file_size_kb * 1024

        total_discovered = 0
        filtered = []

        for item in tree_entries:
            if item.get("type") != "blob":
                continue

            total_discovered += 1
            path = item.get("path", "")
            size = item.get("size", 0)

            if is_allowed_source_file(path, size_bytes=size, max_size_bytes=max_file_size_bytes):
                filtered.append(item)

            if len(filtered) >= max_files:
                logger.info(f"Reached max allowed repository files limit ({max_files})")
                break

        return filtered, total_discovered

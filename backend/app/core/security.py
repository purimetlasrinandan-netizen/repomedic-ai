import re
from pathlib import PurePosixPath
from urllib.parse import urlparse
from typing import Tuple, Set

# Compiled regex for safe GitHub repository URLs
# Valid format: https://github.com/{owner}/{repo} (allowing optional .git suffix or trailing slash)
GITHUB_REPO_REGEX = re.compile(
    r"^https://github\.com/(?P<owner>[a-zA-Z0-9_\-\.]+)/(?P<repo>[a-zA-Z0-9_\-\.]+?)(?:\.git)?/?$"
)

# Common secret filenames and extensions that should never be read or indexed
BLOCKED_FILENAME_PATTERNS = [
    re.compile(r"^\.env(\..+)?$", re.IGNORECASE),
    re.compile(r".*\.pem$", re.IGNORECASE),
    re.compile(r".*\.key$", re.IGNORECASE),
    re.compile(r".*\.pkcs12$", re.IGNORECASE),
    re.compile(r".*\.pfx$", re.IGNORECASE),
    re.compile(r"^id_rsa.*$", re.IGNORECASE),
    re.compile(r"^id_ed25519.*$", re.IGNORECASE),
    re.compile(r".*credentials(\.json|\.yaml|\.yml)?$", re.IGNORECASE),
    re.compile(r".*secret.*(\.json|\.yaml|\.yml)?$", re.IGNORECASE),
    re.compile(r".*token.*(\.json|\.txt)?$", re.IGNORECASE),
    re.compile(r"^\.htpasswd$", re.IGNORECASE),
    re.compile(r"^\.netrc$", re.IGNORECASE),
]

# Paths to ignore entirely
BLOCKED_PATH_SEGMENTS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "target",
    "bin",
    "obj",
    ".next",
    ".nuget",
    "vendor",
}

# Supported source and documentation file extensions
ALLOWED_EXTENSIONS: Set[str] = {
    # Programming Languages
    ".py", ".pyw",
    ".js", ".jsx", ".mjs", ".cjs",
    ".ts", ".tsx", ".mts", ".cts",
    ".go",
    ".rs",
    ".java", ".kt", ".kts", ".scala",
    ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx",
    ".cs",
    ".rb",
    ".php",
    ".swift",
    ".sh", ".bash", ".zsh",
    ".sql",
    ".r",
    ".lua",
    ".dart",
    # Markup and Docs
    ".md", ".markdown", ".rst", ".txt",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    # Data and Config
    ".json",
    ".yaml", ".yml",
    ".toml",
    ".xml",
    ".ini", ".cfg", ".conf",
    # Docker and Build
    ".dockerignore",
    ".gitignore",
}

ALLOWED_FILENAMES: Set[str] = {
    "dockerfile",
    "makefile",
    "cmakelists.txt",
    "gemfile",
    "rakefile",
    "procfile",
    "package.json",
    "tsconfig.json",
    "requirements.txt",
    "pyproject.toml",
    "cargo.toml",
    "go.mod",
    "go.sum",
    "pom.xml",
    "build.gradle",
    "license",
    "readme",
    "contributing",
}

# Regex for common high-confidence API keys / secrets
SECRET_CONTENT_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|access[_-]?token|secret[_-]?key|auth[_-]?token)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]"),
    re.compile(r"-----BEGIN (?:[A-Z0-9_ ]+)?KEY-----"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"gho_[a-zA-Z0-9]{36}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
]


def validate_github_url(url: str) -> Tuple[str, str]:
    """
    Validates that a URL is a public GitHub repository URL.
    Returns (owner, repo) if valid.
    Raises ValueError with descriptive message if invalid.
    """
    if not url or not isinstance(url, str):
        raise ValueError("Repository URL must be a non-empty string.")

    url = url.strip()

    # Reject non-https or non-standard schemes
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only 'https://github.com/owner/repo' is supported.")

    if parsed.netloc.lower() not in ("github.com", "www.github.com"):
        raise ValueError(
            f"Unsupported repository host '{parsed.netloc}'. Only public GitHub repositories (github.com) are currently supported."
        )

    match = GITHUB_REPO_REGEX.match(url)
    if not match:
        raise ValueError(
            "Invalid GitHub repository URL format. Expected: 'https://github.com/owner/repository'."
        )

    owner = match.group("owner")
    repo = match.group("repo")

    # Disallow invalid owner or repo names
    if owner in (".", "..") or repo in (".", ".."):
        raise ValueError("Invalid owner or repository name.")

    if len(owner) > 100 or len(repo) > 100:
        raise ValueError("Owner or repository name exceeds acceptable length limits.")

    return owner, repo


def is_safe_relative_path(path: str) -> bool:
    """
    Checks if a relative file path is safe against directory traversal and suspicious characters.
    """
    if not path or not isinstance(path, str):
        return False

    # Disallow null bytes or backslashes used for evasion
    if "\0" in path or "\\" in path:
        return False

    # Disallow absolute paths
    if path.startswith("/") or path.startswith("~"):
        return False

    # Disallow directory traversal segments
    parts = PurePosixPath(path).parts
    if any(part in ("..", ".", "") for part in parts):
        return False

    # Disallow traversal into blocked segments
    if any(part.lower() in BLOCKED_PATH_SEGMENTS for part in parts):
        return False

    return True


def is_secret_file(filename: str) -> bool:
    """
    Checks if a filename or path matches known secret patterns.
    """
    base_name = PurePosixPath(filename).name
    for pattern in BLOCKED_FILENAME_PATTERNS:
        if pattern.match(base_name):
            return True
    return False


def is_allowed_source_file(filename: str, size_bytes: int = 0, max_size_bytes: int = 512_000) -> bool:
    """
    Checks if a file should be indexed and analyzed based on extension, size, and security rules.
    """
    if not is_safe_relative_path(filename):
        return False

    if is_secret_file(filename):
        return False

    if size_bytes > max_size_bytes:
        return False

    path_obj = PurePosixPath(filename)
    base_name_lower = path_obj.name.lower()
    suffix_lower = path_obj.suffix.lower()

    if base_name_lower in ALLOWED_FILENAMES:
        return True

    if suffix_lower in ALLOWED_EXTENSIONS:
        return True

    return False


def contains_likely_secret(content: str) -> bool:
    """
    Scans content for typical high-confidence API keys or private keys.
    """
    if not content:
        return False
    # Check first 50KB to avoid excessive regex overhead on large files
    sample = content[:50_000]
    for pattern in SECRET_CONTENT_PATTERNS:
        if pattern.search(sample):
            return True
    return False


def sanitize_for_prompt(content: str, max_chars: int = 4000) -> str:
    """
    Sanitizes untrusted repository content before inserting into AI prompts.
    Defends against prompt injection by tagging untrusted boundaries and truncating safely.
    """
    if not content:
        return ""
    truncated = content[:max_chars]
    # Neutralize prompt injection boundary attempts
    clean = truncated.replace("<untrusted_repository_content>", "[untrusted_tag_removed]")
    clean = clean.replace("</untrusted_repository_content>", "[untrusted_tag_removed]")
    return clean

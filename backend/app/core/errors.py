from fastapi import HTTPException, status


class RepoMedicException(Exception):
    """Base exception for RepoMedic AI"""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InvalidRepositoryUrlError(RepoMedicException):
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class RepositoryNotFoundError(RepoMedicException):
    def __init__(self, message: str = "Repository not found or is private/inaccessible."):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class RateLimitExceededError(RepoMedicException):
    def __init__(self, message: str = "GitHub API rate limit exceeded. Please configure a GITHUB_TOKEN in settings."):
        super().__init__(message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


class RepositoryTooLargeError(RepoMedicException):
    def __init__(self, message: str = "Repository exceeds configured size or file count limits."):
        super().__init__(message, status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)


class FileAccessDeniedError(RepoMedicException):
    def __init__(self, message: str = "Access to the requested file was denied for security reasons."):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class OllamaUnavailableError(RepoMedicException):
    def __init__(self, message: str = "Ollama inference service is currently unreachable."):
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

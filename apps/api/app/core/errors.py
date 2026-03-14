"""CloudBlocks API - Application error definitions."""

from __future__ import annotations


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("VALIDATION_ERROR", message, 400, details)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("UNAUTHORIZED", message, 401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__("FORBIDDEN", message, 403)


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str):
        super().__init__("NOT_FOUND", f"{resource} with id '{resource_id}' not found", 404)


class ConflictError(AppError):
    def __init__(self, message: str):
        super().__init__("CONFLICT", message, 409)


class GitHubError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("GITHUB_ERROR", message, 502, details)


class GenerationError(AppError):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("GENERATION_FAILED", message, 500, details)

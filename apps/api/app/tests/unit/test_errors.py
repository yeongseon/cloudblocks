from __future__ import annotations

from typing import cast

from app.core.errors import (
    AppError,
    ConflictError,
    ForbiddenError,
    GenerationError,
    GitHubError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)


def test_app_error_base_attributes_and_exception_behavior() -> None:
    err = AppError(
        code="BASE_ERROR",
        message="Something failed",
        status_code=418,
        details={"debug": True},
    )

    assert isinstance(err, Exception)
    assert err.code == "BASE_ERROR"
    assert err.message == "Something failed"
    assert err.status_code == 418
    assert cast(dict[str, object], err.details) == {"debug": True}
    assert str(err) == "Something failed"


def test_app_error_defaults_details_to_empty_dict() -> None:
    err = AppError(code="NO_DETAILS", message="No details provided")

    assert err.status_code == 500
    assert cast(dict[str, object], err.details) == {}


def test_validation_error_fields() -> None:
    details = {"field": "name", "reason": "required"}
    err = ValidationError("Invalid payload", details)

    assert err.code == "VALIDATION_ERROR"
    assert err.status_code == 400
    assert err.message == "Invalid payload"
    assert cast(dict[str, object], err.details) == details


def test_unauthorized_error_with_custom_message() -> None:
    err = UnauthorizedError("Bad token")

    assert err.code == "UNAUTHORIZED"
    assert err.status_code == 401
    assert err.message == "Bad token"
    assert cast(dict[str, object], err.details) == {}


def test_unauthorized_error_with_default_message() -> None:
    err = UnauthorizedError()

    assert err.code == "UNAUTHORIZED"
    assert err.status_code == 401
    assert err.message == "Authentication required"
    assert cast(dict[str, object], err.details) == {}


def test_forbidden_error_with_custom_message() -> None:
    err = ForbiddenError("No access")

    assert err.code == "FORBIDDEN"
    assert err.status_code == 403
    assert err.message == "No access"
    assert cast(dict[str, object], err.details) == {}


def test_forbidden_error_with_default_message() -> None:
    err = ForbiddenError()

    assert err.code == "FORBIDDEN"
    assert err.status_code == 403
    assert err.message == "Insufficient permissions"
    assert cast(dict[str, object], err.details) == {}


def test_not_found_error_message_and_fields() -> None:
    err = NotFoundError("Workspace", "ws-1")

    assert err.code == "NOT_FOUND"
    assert err.status_code == 404
    assert err.message == "Workspace with id 'ws-1' not found"
    assert cast(dict[str, object], err.details) == {}


def test_conflict_error_fields() -> None:
    err = ConflictError("Resource already exists")

    assert err.code == "CONFLICT"
    assert err.status_code == 409
    assert err.message == "Resource already exists"
    assert cast(dict[str, object], err.details) == {}


def test_github_error_fields() -> None:
    details = {"status": 502, "service": "github"}
    err = GitHubError("GitHub API failure", details)

    assert err.code == "GITHUB_ERROR"
    assert err.status_code == 502
    assert err.message == "GitHub API failure"
    assert cast(dict[str, object], err.details) == details


def test_generation_error_fields() -> None:
    details = {"run_id": "run-1", "phase": "plan"}
    err = GenerationError("Failed to generate Terraform", details)

    assert err.code == "GENERATION_FAILED"
    assert err.status_code == 500
    assert err.message == "Failed to generate Terraform"
    assert cast(dict[str, object], err.details) == details

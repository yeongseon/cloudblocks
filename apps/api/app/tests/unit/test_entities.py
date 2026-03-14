from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import cast

from app.domain.models import entities


def test_utcnow_returns_utc_datetime() -> None:
    utcnow = cast(Callable[[], datetime], entities._utcnow)
    value = utcnow()

    assert isinstance(value, datetime)
    assert value.tzinfo is timezone.utc


def test_generation_status_enum_values() -> None:
    assert entities.GenerationStatus.PENDING.value == "pending"
    assert entities.GenerationStatus.RUNNING.value == "running"
    assert entities.GenerationStatus.COMPLETED.value == "completed"
    assert entities.GenerationStatus.FAILED.value == "failed"


def test_user_creation_defaults_and_optional_fields_none() -> None:
    user = entities.User(id="user-1")

    assert user.id == "user-1"
    assert user.github_id is None
    assert user.github_username is None
    assert user.email is None
    assert user.display_name is None
    assert user.avatar_url is None
    assert isinstance(user.created_at, datetime)
    assert isinstance(user.updated_at, datetime)
    assert user.created_at.tzinfo is timezone.utc
    assert user.updated_at.tzinfo is timezone.utc


def test_user_creation_with_all_fields() -> None:
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    updated_at = datetime(2025, 1, 2, tzinfo=timezone.utc)

    user = entities.User(
        id="user-2",
        github_id="gh-123",
        github_username="octocat",
        email="octo@example.com",
        display_name="Octo Cat",
        avatar_url="https://example.com/avatar.png",
        created_at=created_at,
        updated_at=updated_at,
    )

    assert user.github_id == "gh-123"
    assert user.github_username == "octocat"
    assert user.email == "octo@example.com"
    assert user.display_name == "Octo Cat"
    assert user.avatar_url == "https://example.com/avatar.png"
    assert user.created_at == created_at
    assert user.updated_at == updated_at


def test_identity_creation_required_and_optional_fields() -> None:
    identity_default = entities.Identity(
        id="ident-1",
        user_id="user-1",
        provider="github",
        provider_id="12345",
    )

    assert identity_default.id == "ident-1"
    assert identity_default.user_id == "user-1"
    assert identity_default.provider == "github"
    assert identity_default.provider_id == "12345"
    assert identity_default.access_token_hash is None
    assert identity_default.refresh_token_hash is None
    assert isinstance(identity_default.created_at, datetime)
    assert identity_default.created_at.tzinfo is timezone.utc

    identity_full = entities.Identity(
        id="ident-2",
        user_id="user-2",
        provider="google",
        provider_id="abcde",
        access_token_hash="a-hash",
        refresh_token_hash="r-hash",
    )
    assert identity_full.access_token_hash == "a-hash"
    assert identity_full.refresh_token_hash == "r-hash"


def test_workspace_creation_with_defaults() -> None:
    workspace = entities.Workspace(id="ws-1", owner_id="owner-1", name="Demo")

    assert workspace.id == "ws-1"
    assert workspace.owner_id == "owner-1"
    assert workspace.name == "Demo"
    assert workspace.github_repo is None
    assert workspace.github_branch == "main"
    assert workspace.generator == "terraform"
    assert workspace.provider == "azure"
    assert workspace.last_synced_at is None
    assert isinstance(workspace.created_at, datetime)
    assert isinstance(workspace.updated_at, datetime)
    assert workspace.created_at.tzinfo is timezone.utc
    assert workspace.updated_at.tzinfo is timezone.utc


def test_workspace_creation_with_all_fields() -> None:
    synced_at = datetime(2025, 1, 3, tzinfo=timezone.utc)
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    updated_at = datetime(2025, 1, 2, tzinfo=timezone.utc)

    workspace = entities.Workspace(
        id="ws-2",
        owner_id="owner-2",
        name="Prod",
        github_repo="org/repo",
        github_branch="release",
        generator="bicep",
        provider="aws",
        last_synced_at=synced_at,
        created_at=created_at,
        updated_at=updated_at,
    )

    assert workspace.github_repo == "org/repo"
    assert workspace.github_branch == "release"
    assert workspace.generator == "bicep"
    assert workspace.provider == "aws"
    assert workspace.last_synced_at == synced_at
    assert workspace.created_at == created_at
    assert workspace.updated_at == updated_at


def test_generation_run_creation_defaults_and_status_assignment() -> None:
    run_default = entities.GenerationRun(id="run-1", workspace_id="ws-1", generator="terraform")

    assert run_default.id == "run-1"
    assert run_default.workspace_id == "ws-1"
    assert run_default.status == entities.GenerationStatus.PENDING
    assert run_default.generator == "terraform"
    assert run_default.commit_sha is None
    assert run_default.pull_request_url is None
    assert run_default.error_message is None
    assert run_default.started_at is None
    assert run_default.completed_at is None
    assert isinstance(run_default.created_at, datetime)
    assert run_default.created_at.tzinfo is timezone.utc

    run_custom_status = entities.GenerationRun(
        id="run-2",
        workspace_id="ws-2",
        generator="pulumi",
        status=entities.GenerationStatus.COMPLETED,
        commit_sha="abc123",
        pull_request_url="https://example.com/pr/1",
        error_message="none",
        started_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        completed_at=datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=5),
    )

    assert run_custom_status.status == entities.GenerationStatus.COMPLETED
    assert run_custom_status.commit_sha == "abc123"
    assert run_custom_status.pull_request_url == "https://example.com/pr/1"


def test_created_and_updated_fields_are_auto_populated_from_default_factory() -> None:
    user = entities.User(id="u-auto")
    workspace = entities.Workspace(id="w-auto", owner_id="owner", name="Auto")

    assert user.created_at is not None
    assert user.updated_at is not None
    assert workspace.created_at is not None
    assert workspace.updated_at is not None
    assert user.created_at.tzinfo is timezone.utc
    assert user.updated_at.tzinfo is timezone.utc
    assert workspace.created_at.tzinfo is timezone.utc
    assert workspace.updated_at.tzinfo is timezone.utc

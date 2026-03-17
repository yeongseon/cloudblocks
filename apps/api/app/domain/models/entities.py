"""CloudBlocks API - Domain entities matching STORAGE_ARCHITECTURE.md schema.

Four entities: User, Identity, Workspace, GenerationRun.
Architecture data is NOT stored here — it lives in GitHub repos.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GenerationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class User(BaseModel):
    """User domain entity — linked to GitHub OAuth."""

    id: str
    github_id: str | None = None
    github_username: str | None = None
    email: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class Identity(BaseModel):
    """OAuth identity provider record (GitHub, Google, etc.)."""

    id: str
    user_id: str
    provider: str  # 'github', 'google'
    provider_id: str
    access_token_hash: str | None = None
    encrypted_access_token: str | None = None
    refresh_token_hash: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)


class Workspace(BaseModel):
    """Workspace index — pointer to a GitHub repo, not the architecture itself."""

    id: str
    owner_id: str
    name: str
    github_repo: str | None = None  # e.g. 'yeongseon/my-infra'
    github_branch: str = "main"
    generator: str = "terraform"
    provider: str = "azure"
    last_synced_at: datetime | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class GenerationRun(BaseModel):
    """Code generation job tracking record."""

    id: str
    workspace_id: str
    status: GenerationStatus = GenerationStatus.PENDING
    generator: str  # 'terraform', 'bicep', 'pulumi'
    commit_sha: str | None = None
    pull_request_url: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime = Field(default_factory=_utcnow)

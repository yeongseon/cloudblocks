"""CloudBlocks API - Domain entities."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    """User domain entity."""

    id: str
    email: str
    display_name: str
    password_hash: str
    role: str = "learner"
    avatar_url: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Workspace:
    """Workspace domain entity."""

    id: str
    owner_id: str
    name: str
    architecture: str  # JSON serialized ArchitectureModel
    description: str | None = None
    is_public: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Scenario:
    """Learning scenario domain entity."""

    id: str
    title: str
    difficulty: str
    category: str
    template: str  # JSON serialized template
    description: str | None = None
    solution: str | None = None
    order_index: int = 0
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class LearningProgress:
    """Learning progress domain entity."""

    id: str
    user_id: str
    scenario_id: str
    status: str = "not_started"
    score: int | None = None
    attempts: int = 0
    last_state: str | None = None  # JSON serialized workspace state
    completed_at: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Deployment:
    """Deployment record domain entity."""

    id: str
    workspace_id: str
    user_id: str
    provider: str  # azure, aws, gcp
    status: str = "pending"
    terraform_plan: str | None = None
    terraform_state: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

# CloudBlocks - Database Architecture

## Overview

CloudBlocks uses a **hybrid storage strategy** with CUBRID as the primary relational database, complemented by Redis for caching/sessions and S3-compatible object storage for assets.

This document serves as a **CUBRID ecosystem reference implementation**, demonstrating production-grade database patterns with CUBRID.

## Storage Layer Architecture

```
┌─────────────────────────────────────────────────┐
│                  Application Layer               │
├──────────┬──────────────┬───────────────────────┤
│  CUBRID  │    Redis     │   Object Storage      │
│ (Primary)│ (Cache/Queue)│   (S3-compatible)     │
├──────────┼──────────────┼───────────────────────┤
│ Users    │ Sessions     │ Terraform artifacts   │
│ Workspaces│ Rate limits │ Architecture exports  │
│ Scenarios│ Cache        │ User uploads          │
│ Progress │ Job queue    │ Deployment logs       │
│ Deploy   │              │ Scenario thumbnails   │
└──────────┴──────────────┴───────────────────────┘
```

## CUBRID Schema

### Core Tables

```sql
-- ─── Users ──────────────────────────────────────
CREATE TABLE users (
    id            VARCHAR(36)   PRIMARY KEY,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    display_name  VARCHAR(100)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    avatar_url    VARCHAR(500),
    role          VARCHAR(20)   DEFAULT 'learner',
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─── Workspaces ─────────────────────────────────
CREATE TABLE workspaces (
    id            VARCHAR(36)   PRIMARY KEY,
    owner_id      VARCHAR(36)   NOT NULL,
    name          VARCHAR(200)  NOT NULL,
    description   CLOB,
    architecture  CLOB          NOT NULL,  -- JSON serialized ArchitectureModel
    is_public     SMALLINT      DEFAULT 0,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- ─── Scenarios ──────────────────────────────────
CREATE TABLE scenarios (
    id            VARCHAR(36)   PRIMARY KEY,
    title         VARCHAR(200)  NOT NULL,
    description   CLOB,
    difficulty    VARCHAR(20)   NOT NULL,  -- beginner, intermediate, advanced
    category      VARCHAR(50)   NOT NULL,
    template      CLOB          NOT NULL,  -- JSON serialized template
    solution      CLOB,                    -- JSON serialized solution
    order_index   INT           DEFAULT 0,
    is_active     SMALLINT      DEFAULT 1,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX idx_scenarios_category ON scenarios(category);

-- ─── Learning Progress ──────────────────────────
CREATE TABLE learning_progress (
    id            VARCHAR(36)   PRIMARY KEY,
    user_id       VARCHAR(36)   NOT NULL,
    scenario_id   VARCHAR(36)   NOT NULL,
    status        VARCHAR(20)   DEFAULT 'not_started',  -- not_started, in_progress, completed
    score         INT,
    attempts      INT           DEFAULT 0,
    last_state    CLOB,         -- JSON serialized last workspace state
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
    UNIQUE (user_id, scenario_id)
);

CREATE INDEX idx_progress_user ON learning_progress(user_id);

-- ─── Deployments ────────────────────────────────
CREATE TABLE deployments (
    id              VARCHAR(36)   PRIMARY KEY,
    workspace_id    VARCHAR(36)   NOT NULL,
    user_id         VARCHAR(36)   NOT NULL,
    provider        VARCHAR(20)   NOT NULL,  -- azure, aws, gcp
    status          VARCHAR(20)   DEFAULT 'pending',  -- pending, deploying, success, failed, destroyed
    terraform_plan  CLOB,
    terraform_state CLOB,
    error_message   CLOB,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_deployments_workspace ON deployments(workspace_id);
CREATE INDEX idx_deployments_user ON deployments(user_id);
```

### CUBRID-Specific Considerations

| Feature | CUBRID Approach | PostgreSQL Equivalent |
|---------|----------------|----------------------|
| UUID storage | `VARCHAR(36)` | `UUID` native type |
| JSON fields | `CLOB` + app-level parsing | `JSONB` with operators |
| Boolean | `SMALLINT` (0/1) | `BOOLEAN` |
| Auto-increment | `AUTO_INCREMENT` | `SERIAL` / `GENERATED` |
| Full-text search | Built-in FTS | `tsvector` / `tsquery` |

### Custom ORM Layer

Since no existing ORM (TypeORM, Prisma, Sequelize, SQLAlchemy) supports CUBRID natively, CloudBlocks implements a **custom ORM layer**:

```python
# Repository pattern with CUBRID driver
class CubridRepository(Generic[T]):
    def __init__(self, connection_pool: CubridPool, table: str):
        self.pool = connection_pool
        self.table = table

    async def find_by_id(self, id: str) -> T | None: ...
    async def find_all(self, filters: dict) -> list[T]: ...
    async def create(self, entity: T) -> T: ...
    async def update(self, id: str, data: dict) -> T: ...
    async def delete(self, id: str) -> bool: ...
```

## Redis Schema

```
# Session management
session:{session_id}           → JSON user session data (TTL: 24h)

# Cache
cache:workspace:{workspace_id} → JSON workspace data (TTL: 1h)
cache:scenarios:list            → JSON scenario list (TTL: 5m)

# Rate limiting
ratelimit:{user_id}:{endpoint} → counter (TTL: 60s)

# Job queue (deployment)
queue:deployments               → list of deployment job IDs
job:{job_id}                    → JSON job details
```

## Object Storage Structure

```
cloudblocks-bucket/
├── exports/
│   └── {workspace_id}/
│       ├── architecture.json
│       └── terraform/
│           ├── main.tf
│           ├── variables.tf
│           └── outputs.tf
├── thumbnails/
│   └── {scenario_id}.png
├── avatars/
│   └── {user_id}.png
└── logs/
    └── deployments/
        └── {deployment_id}.log
```

## Migration Strategy

### v0.1 → v0.5 (localStorage → CUBRID)

1. Export localStorage data as JSON
2. Run migration script to insert into CUBRID
3. Dual-read period: check CUBRID first, fallback to localStorage
4. Remove localStorage dependency

### Schema Versioning

Migrations are managed via numbered SQL files:

```
apps/api/app/infrastructure/db/migrations/
├── 001_create_users.sql
├── 002_create_workspaces.sql
├── 003_create_scenarios.sql
├── 004_create_learning_progress.sql
└── 005_create_deployments.sql
```

# CloudBlocks Platform — System Architecture

This document defines the system architecture for the CloudBlocks Platform.

CloudBlocks enables users to visually construct cloud architecture using a 3D block-style interface and generates deployable infrastructure code (Terraform, Bicep, Pulumi). The platform follows a **Git-native architecture** where GitHub repos serve as the primary data store.

---

# 1. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + React Three Fiber + Zustand     │
│   ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│   │ 3D Scene │ │ Rule     │ │ Local-First Store   │    │
│   │ Builder  │ │ Engine   │ │ (IndexedDB/localStorage) │
│   └──────────┘ └──────────┘ └────────────────────┘    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│           Backend API (Thin Orchestration Layer)        │
│                  Python FastAPI                         │
│   ┌──────┐ ┌───────────┐ ┌────────┐ ┌──────────┐     │
│   │ Auth │ │ Generator │ │ GitHub │ │ Job      │     │
│   │      │ │ Orchestr. │ │ Integ. │ │ Runner   │     │
│   └──────┘ └───────────┘ └────────┘ └──────────┘     │
│                     │                                   │
│            ┌────────┴────────┐                         │
│            │ Metadata DB     │                         │
│            │ (Supabase/PG)   │                         │
│            └─────────────────┘                         │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│              External Services                          │
│   ┌────────────┐  ┌──────────────┐  ┌──────────┐     │
│   │ GitHub     │  │ GitHub       │  │ Redis /  │     │
│   │ Repos      │  │ Actions      │  │ Upstash  │     │
│   │ (Data)     │  │ (CI/CD)      │  │ (Cache)  │     │
│   └────────────┘  └──────────────┘  └──────────┘     │
└────────────────────────────────────────────────────────┘
```

---

# 2. System Layers

## 2.1 Frontend Layer

The frontend is a **local-first SPA** that works offline and syncs to GitHub when connected.

### Responsibilities
- 3D block builder interface (React Three Fiber)
- Drag and drop interaction
- Architecture validation (in-browser Rule Engine)
- Local persistence (IndexedDB / localStorage)
- Code generation preview (client-side for simple cases)
- GitHub sync UI (commit, branch, PR)

### Technologies
- React + TypeScript
- React Three Fiber + Three.js
- Zustand (state management)
- Vite (build tool)

### Frontend Architecture (Feature-Sliced Design)

```
apps/web/src/
├── main.tsx
├── app/                 # App shell
├── shared/              # Types, utils, storage
│   ├── types/           # Domain types (Plate, Block, Connection)
│   └── utils/           # ID generation, storage operations
├── entities/            # Domain entities
│   ├── store/           # Zustand architecture store
│   ├── block/           # Block components
│   ├── plate/           # Plate components
│   └── connection/      # Connection components
├── features/            # Feature modules
│   ├── validate/        # Validation engine
│   └── generate/        # Code generation (v0.3)
└── widgets/             # Composite UI widgets
    ├── toolbar/
    ├── block-palette/
    ├── properties-panel/
    ├── validation-panel/
    └── scene-canvas/
```

## 2.2 MVP Architecture (v0.1)

v0.1은 **프론트엔드 전용 SPA**로 구현한다. 백엔드 불필요.

```
Browser (React + R3F)
├── 3D Scene (Three.js)
├── Domain Model (Zustand Store)
├── Rule Engine (in-browser)
└── Local Storage (workspace persistence)
```

## 2.3 Backend Layer (v0.5+) — Thin Orchestration Layer

The backend is **NOT a heavy CRUD service**. It is a **workflow orchestrator** that mediates between the UI, GitHub, and the generation engine.

### What the Backend Does

| Responsibility | Description |
|---------------|-------------|
| Auth / Identity | GitHub App OAuth, Google login, account linking |
| Generator Orchestration | Validate → transform → generate IaC code |
| GitHub Integration | Repo selection, branch creation, commit, PR |
| Job Runner | Async generation, validation, deployment triggers |
| Metadata DB | User, workspace index, run status, audit summary |

### What the Backend Does NOT Store

| Data | Where It Lives |
|------|---------------|
| Architecture specs (JSON) | GitHub repo |
| Generated Terraform/Bicep/Pulumi | GitHub repo |
| Templates | GitHub repo |
| Full prompt/log history | GitHub / Blob Storage |
| Deployment artifacts | GitHub / Blob Storage |

### Backend Architecture

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── core/
│   │   ├── config.py              # Environment config
│   │   └── security.py            # Auth utilities
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py            # OAuth flow
│   │   │   ├── projects.py        # Project CRUD (metadata only)
│   │   │   ├── generate.py        # Code generation orchestration
│   │   │   └── github.py          # GitHub integration
│   │   └── middleware/
│   │       ├── auth.py            # JWT verification
│   │       └── rate_limit.py      # Rate limiting
│   ├── domain/
│   │   ├── models.py              # Domain entities
│   │   └── generators/            # Generator plugins
│   │       ├── base.py            # Generator interface
│   │       ├── terraform.py       # Terraform generator
│   │       ├── bicep.py           # Bicep generator
│   │       └── pulumi.py          # Pulumi generator
│   ├── infrastructure/
│   │   ├── github/                # GitHub API client
│   │   │   ├── client.py
│   │   │   └── app.py             # GitHub App management
│   │   ├── db/                    # Metadata DB
│   │   │   ├── connection.py      # DB connection pool
│   │   │   └── migrations/        # Schema migrations
│   │   └── queue/                 # Job queue (Redis/Upstash)
│   └── services/
│       ├── generation.py          # Generation orchestration
│       ├── github_sync.py         # GitHub sync logic
│       └── project.py             # Project management
```

---

# 3. Core Modeling Engine

The Core Modeling Engine manages the **CloudBlocks Domain Model**.

Responsibilities:
- Constructing the architecture model
- Managing block placement on plates
- Maintaining containment hierarchy (Network → Subnet → Block)

Example structure:

```
NetworkPlate
└ SubnetPlate (Public)
  └ GatewayBlock
└ SubnetPlate (Private)
  └ ComputeBlock
  └ DatabaseBlock
```

Key responsibilities:
- Maintain architecture graph
- Enforce containment relationships
- Serialize model state to JSON

---

# 4. Rule Engine

The Rule Engine validates architecture constraints.

### Rule Categories

Placement Rules:

```
ComputeBlock must be placed on SubnetPlate
DatabaseBlock must be placed on private SubnetPlate
GatewayBlock must be placed on public SubnetPlate
StorageBlock must be placed on SubnetPlate
```

Connection Rules:

```
Internet → Gateway    ✔
Gateway  → Compute    ✔
Compute  → Database   ✔
Database → Gateway    ❌
Database → Internet   ❌
```

### Validation Response

```json
{
  "valid": false,
  "errors": [
    {
      "ruleId": "rule-db-private",
      "severity": "error",
      "message": "Database cannot be placed in public subnet",
      "suggestion": "Move Database to a private subnet",
      "targetId": "block-db01"
    }
  ],
  "warnings": []
}
```

### Connection Type Handling

- **DataFlow**: Request/response communication (solid arrow) — MVP
- **EventFlow**: Event-driven trigger (dotted arrow) — v1.0
- **Dependency**: Resource dependency (dashed line) — v1.0

MVP (v0.1)에서는 DataFlow만 지원한다.

---

# 5. Code Generation Pipeline

The core value delivery — transforming visual architecture into deployable IaC code.

### Pipeline

```
Architecture Model (JSON)
↓
Schema Validation
↓
Provider Adapter (Azure / AWS / GCP mapping)
↓
Generator Plugin (Terraform / Bicep / Pulumi)
↓
Generated Code Output
↓
GitHub Commit / PR (via Backend)
```

### Generator Plugin Architecture

Generators are modular plugins implementing a standard interface:

```typescript
interface Generator {
  name: string;
  version: string;
  supportedProviders: string[];
  generate(architecture: ArchitectureModel, options: GeneratorOptions): GeneratedOutput;
}
```

| Generator | Format | Priority |
|-----------|--------|----------|
| Terraform | HCL | Primary (v0.3) |
| Bicep | Azure ARM DSL | v0.5 |
| Pulumi | TypeScript/Python | v1.0 |

### CI/CD Integration

Generated code triggers CI pipelines:

```yaml
# .github/workflows/plan.yml
on:
  pull_request:
    paths: ['infra/**']
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform plan
```

---

# 6. Provider Adapter Layer

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources.

> 교육 단순화 기준: MVP에서 Compute는 Subnet 내에 배치되는 리소스(VM, Container App)로 간주한다.

| Generic Resource | Azure | AWS | GCP |
|------------------|------|-----|-----|
| Network (Plate) | VNet | VPC | VPC |
| Subnet (Plate) | Subnet | Subnet | Subnet |
| Compute | VM / Container App | EC2 | Compute Engine |
| Database | Azure SQL | RDS | Cloud SQL |
| Storage | Blob Storage | S3 | Cloud Storage |
| Gateway | Application Gateway | ALB | Load Balancer |
| Function (v1.0) | Azure Function | Lambda | Cloud Functions |

---

# 7. GitHub Integration Architecture

## Auth: GitHub App Model

CloudBlocks uses a **GitHub App** (not raw OAuth) for:
- Repo-scoped permissions
- Short-lived installation tokens (no long-lived user tokens in browser)
- Easy revocation
- Webhook support

```
User → CloudBlocks UI → Backend API → GitHub App → User's Repos
```

## Data Flow

```
1. User designs architecture in 3D builder
2. User clicks "Save to GitHub"
3. Frontend sends architecture JSON to backend
4. Backend validates and runs generator
5. Backend commits architecture.json + generated code to GitHub
6. GitHub Actions runs terraform plan on PR
7. User reviews and merges
```

## Conflict Resolution

- PRs as the collaboration primitive
- Optimistic concurrency using file SHA (fail fast on mismatch)
- Direct-to-default-branch for solo users (optional)

## Rate Limit Management

- GitHub API: 5000 req/hr (authenticated)
- Debounce writes, batch into snapshots
- Use ETags / `If-None-Match` for reads
- Avoid commit-per-UI-gesture

---

# 8. Storage Architecture

### Data Placement Strategy

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Architecture spec | GitHub repo | Version history, diff, collaboration |
| Generated IaC code | GitHub repo | PR-based review, CI/CD |
| Templates | GitHub repo | Community contribution |
| User / Identity | Metadata DB | Auth, OAuth tokens |
| Workspace index | Metadata DB | Fast lookup |
| Run status | Metadata DB | Job state tracking |
| Audit summary | Metadata DB | Lightweight trail |
| Large artifacts | Blob Storage | Binary assets |
| Session / Cache | Redis / Upstash | Rate limiting, locks |

### Metadata DB Schema (Minimal)

```sql
-- User identity (linked to GitHub / Google)
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    github_id   VARCHAR(100),
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Project = workspace + GitHub repo mapping
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(200) NOT NULL,
    github_repo     VARCHAR(500),        -- e.g., "user/my-infra"
    github_branch   VARCHAR(100) DEFAULT 'main',
    generator       VARCHAR(50) DEFAULT 'terraform',
    provider        VARCHAR(50) DEFAULT 'azure',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- Generation run log
CREATE TABLE generation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    status          VARCHAR(20) DEFAULT 'queued',
    generator       VARCHAR(50) NOT NULL,
    commit_sha      VARCHAR(40),
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_project ON generation_runs(project_id);
```

---

# 9. State Management

### v0.1 Storage (Local)

v0.1에서는 브라우저 localStorage를 사용한다.

Key: `cloudblocks:workspaces`

```json
{
  "schemaVersion": "0.1.0",
  "workspaces": [
    {
      "id": "ws-abc123",
      "name": "My First Architecture",
      "architecture": {
        "id": "arch-001",
        "name": "3-Tier Web App",
        "version": "1",
        "plates": [],
        "blocks": [],
        "connections": [],
        "externalActors": []
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### v0.3+ Storage (Local-First + GitHub Sync)

IndexedDB for local state + optional GitHub sync:

```
Local (IndexedDB)     ←→    GitHub (via Backend API)
  architecture.json          cloudblocks/architecture.json
  draft changes              committed versions
  offline edits              synced on connect
```

- Anonymous/offline editing always works
- "Connect to GitHub" to sync and collaborate
- GitHub is "publish/collaborate", not "required to use"

---

# 10. Security Considerations

- GitHub App tokens: short-lived, repo-scoped, stored server-side only
- No long-lived user tokens in the browser
- OAuth tokens encrypted at rest in metadata DB
- Workspace isolation: users can only access their own projects
- Rate limiting: per-user, per-endpoint
- Content validation: sanitize architecture JSON before processing

---

# 11. Scalability

The architecture supports horizontal scalability:

| Component | Strategy |
|-----------|----------|
| Frontend | Static hosting / CDN |
| Backend API | Stateless containers (scale horizontally) |
| Metadata DB | Managed Postgres (Supabase / RDS) |
| Job Queue | Redis / Upstash |
| Storage | GitHub (unlimited repos) + Blob storage |

---

# 12. Summary

```
Frontend (v0.1: SPA with R3F, local-first)
Core Model (Zustand store)
Rule Engine (in-browser validation)
Code Generation (Terraform / Bicep / Pulumi plugins)
Backend (v0.5+: Thin orchestration layer — FastAPI)
GitHub Integration (v0.5+: repos as data store)
```

This architecture enables:
- Visual architecture design with 3D blocks
- Automated infrastructure code generation
- Git-native collaboration and version control
- Lightweight deployment with minimal infrastructure cost

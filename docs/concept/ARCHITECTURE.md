# CloudBlocks Platform — System Architecture

This document defines the system architecture for the CloudBlocks Platform.

CloudBlocks is an **Architecture Compiler** — it models cloud infrastructure using a **Lego-style composition system**, validates designs against architectural rules, and generates deployable infrastructure code (Terraform, Bicep, Pulumi). The long-term architecture follows a **Git-native** model where GitHub repos serve as the primary data store.

> **Technical approach**: CloudBlocks is a **2D-first editor with 2.5D rendering**, rather than a full 3D engine. The internal model is a 2D coordinate system with containment hierarchy. The rendering layer projects this into an isometric view using React Three Fiber.

---

## Architecture Compiler — Core Concept

### Lego-Style Composition Model

CloudBlocks models infrastructure using a Lego-style architecture system. Users assemble infrastructure by placing visual building blocks — not by drawing diagrams or writing code:

| Concept | Role | Example |
|---------|------|---------|
| **Plate** | Infrastructure boundary (container) | Network plate, Subnet plate |
| **Block** | Infrastructure resource (service) | Compute, Database, Storage, Gateway |
| **Connection** | Communication flow (dataflow) | Gateway → Compute → Database |

```
Internet → [Public Subnet: Gateway] → [Private Subnet: Compute → Database]
                                                             → Storage
```

This distinguishes CloudBlocks from diagram tools (draw.io) and direct IaC authoring (Terraform). CloudBlocks introduces an intermediate **architecture model layer** between the visual editor and infrastructure code:

```
UI Builder
    ↓
Architecture Model (CloudBlocks DSL)
    ↓
Rule Engine
    ↓
Generator
    ↓
Infrastructure Code (Terraform / Bicep / Pulumi)
```

The system consists of several subsystems:

| Subsystem | Responsibility | Details |
|-----------|---------------|---------|
| **Web Builder** | Visual diagram editing, architecture visualization, rule feedback | This document |
| **Architecture Model** | Provider-agnostic architecture representation, versioning, serialization | [model.md](../model/model.md) |
| **Rule Engine** | Architecture validation, security checks, topology validation | [rules.md](../engine/rules.md) |
| **Generator** | Infrastructure code generation, provider abstraction | [generator.md](../engine/generator.md) |
| **Provider Adapters** | Cloud-specific resource mapping | [provider.md](../engine/provider.md) |
| **Templates** | Reusable architecture starting points | [templates.md](../engine/templates.md) |

### Repository Structure (Actual)

```
cloudblocks/
  apps/
    web/              # Frontend SPA (React + R3F)
    api/              # Backend API (Python FastAPI)
  packages/
    cloudblocks-domain/    # Domain model (placeholder)
    cloudblocks-ui/        # UI components (placeholder)
    schema/                # Schema definitions (placeholder)
    scenario-library/      # Tutorial scenarios (placeholder)
    terraform-templates/   # Terraform templates (placeholder)
  docs/              # Documentation
  examples/          # Example architecture READMEs
  infra/             # Deployment scaffolds (Docker, Terraform, k8s)
```

> **Note**: The `packages/` directory currently contains placeholder packages. The aspirational modular structure (model, rule-engine, generator, providers) will be extracted from `apps/web/` as the codebase matures.

---

# 1. Architecture Overview

## Current (v0.1) — Frontend-Only SPA

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + React Three Fiber + Zustand     │
│   ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│   │ Isometric│ │ Rule     │ │ localStorage        │    │
│   │ Builder  │ │ Engine   │ │ (workspace persist.) │    │
│   └──────────┘ └──────────┘ └────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

No backend required. All state lives in the browser.

## Planned (v0.5+) — Full Stack with Git-Native Storage

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + React Three Fiber + Zustand     │
│   ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│   │ Isometric│ │ Rule     │ │ Local-First Store   │    │
│   │ Builder  │ │ Engine   │ │ (IndexedDB/lS)      │    │
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

The frontend is a SPA built with React and React Three Fiber. In v0.1, it works entirely standalone with localStorage. In future versions, it will adopt a local-first architecture with optional GitHub sync.

### Responsibilities (v0.1 — current)
- 2.5D isometric builder interface (React Three Fiber)
- Click-to-add block placement via palette
- Architecture validation (in-browser Rule Engine)
- Local persistence (localStorage)

### Responsibilities (v0.5+ — planned)
- Drag and drop interaction
- Code generation preview (client-side for simple cases)
- GitHub sync UI (commit, branch, PR)
- Local-first store (IndexedDB + localStorage)

### Technologies
- React + TypeScript
- React Three Fiber + Three.js (rendering layer only — editing model is 2D)
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
│   └── validate/        # Validation engine
├── widgets/             # Composite UI widgets
│   ├── toolbar/
│   ├── block-palette/
│   ├── properties-panel/
│   ├── validation-panel/
│   └── scene-canvas/
└── assets/
```

> **Note**: `features/generate/` (code generation) is planned for v0.3 and does not exist yet.

## 2.2 MVP Architecture (v0.1)

v0.1 is implemented as a **frontend-only SPA**. No backend required.

```
Browser (React + R3F)
├── Isometric Scene (Three.js — rendering layer)
├── Domain Model (Zustand Store — 2D coordinates + hierarchy)
├── Rule Engine (in-browser)
└── localStorage (workspace persistence)
```

## 2.3 Backend Layer (v0.5+) — Thin Orchestration Layer

The backend is **NOT a heavy CRUD service**. It is a **workflow orchestrator** that mediates between the UI, GitHub, and the generation engine.

> **Current status**: The backend is scaffolded with a basic FastAPI app exposing only `/health` and `/health/ready` endpoints. All modules below are planned.

### What the Backend Will Do

| Responsibility | Description |
|---------------|-------------|
| Auth / Identity | GitHub App OAuth, Google login, account linking |
| Generator Orchestration | Validate → transform → generate IaC code |
| GitHub Integration | Repo selection, branch creation, commit, PR |
| Job Runner | Async generation, validation, deployment triggers |
| Metadata DB | User, workspace index, run status, audit summary |

### What the Backend Will NOT Store

| Data | Where It Lives |
|------|---------------|
| Architecture specs (JSON) | GitHub repo |
| Generated Terraform/Bicep/Pulumi | GitHub repo |
| Templates | GitHub repo |
| Full prompt/log history | GitHub / Blob Storage |
| Deployment artifacts | GitHub / Blob Storage |

### Backend Architecture (Planned — v0.5+)

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI app (currently: health endpoints only)
│   ├── core/
│   │   └── config.py              # Environment config
│   ├── api/
│   │   └── routes/
│   │       ├── workspaces.py      # Workspace stubs (placeholder)
│   │       └── scenarios.py       # Template stubs (placeholder)
│   └── infrastructure/
│       └── db/
│           ├── connection.py      # MetadataDB class (not yet implemented)
│           └── migrations/
│               ├── 001_create_users.sql
│               └── 002_create_workspaces.sql
```

The following modules are **planned but not yet created**:

```
# Planned (v0.5+)
│   ├── core/
│   │   └── security.py            # Auth utilities
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py            # OAuth flow
│   │       ├── projects.py        # Project CRUD (metadata only)
│   │       ├── generate.py        # Code generation orchestration
│   │       └── github.py          # GitHub integration
│   ├── domain/
│   │   ├── models.py              # Domain entities
│   │   └── generators/            # Generator plugins
│   │       ├── base.py            # Generator interface
│   │       ├── terraform.py       # Terraform generator
│   │       ├── bicep.py           # Bicep generator
│   │       └── pulumi.py          # Pulumi generator
│   └── services/
│       ├── generation.py          # Generation orchestration
│       ├── github_sync.py         # GitHub sync logic
│       └── project.py             # Project management
```

---

# 3. Core Modeling Engine

> See also: PRD §8 (Core Concepts), PRD §10 (Layout Model)

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

## 3.5 Architecture Model Schema (v0.1 — current)

The canonical model types are defined in `apps/web/src/shared/types/index.ts`.

```typescript
export type PlateType = 'network' | 'subnet';
export type SubnetAccess = 'public' | 'private';
export type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway';
export type ConnectionType = 'dataflow';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Size {
  width: number;
  height: number;
  depth: number;
}

export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  subnetAccess?: SubnetAccess;
  parentId: string | null;
  children: string[];
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

export interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string;
  position: Position;
  metadata: Record<string, unknown>;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  metadata: Record<string, unknown>;
}

export interface ExternalActor {
  id: string;
  name: string;
  type: 'internet';
}

export interface ArchitectureModel {
  id: string;
  name: string;
  version: string;
  plates: Plate[];
  blocks: Block[];
  connections: Connection[];
  externalActors: ExternalActor[];
  createdAt: string;
  updatedAt: string;
}
```

### Example ArchitectureModel JSON

```json
{
  "id": "arch-001",
  "name": "3-Tier Web App",
  "version": "1",
  "plates": [
    {
      "id": "plate-network-1",
      "name": "Main Network",
      "type": "network",
      "parentId": null,
      "children": ["plate-subnet-public-1"],
      "position": { "x": 0, "y": 0, "z": 0 },
      "size": { "width": 12, "height": 0.3, "depth": 10 },
      "metadata": {}
    },
    {
      "id": "plate-subnet-public-1",
      "name": "Public Subnet",
      "type": "subnet",
      "subnetAccess": "public",
      "parentId": "plate-network-1",
      "children": ["block-gateway-1", "block-compute-1"],
      "position": { "x": 0, "y": 0.2, "z": 0 },
      "size": { "width": 5, "height": 0.2, "depth": 8 },
      "metadata": {}
    }
  ],
  "blocks": [
    {
      "id": "block-gateway-1",
      "name": "App Gateway",
      "category": "gateway",
      "placementId": "plate-subnet-public-1",
      "position": { "x": -1, "y": 0, "z": 0 },
      "metadata": {}
    },
    {
      "id": "block-compute-1",
      "name": "Web API",
      "category": "compute",
      "placementId": "plate-subnet-public-1",
      "position": { "x": 1.5, "y": 0, "z": 0 },
      "metadata": { "runtime": "container" }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "sourceId": "ext-internet",
      "targetId": "block-gateway-1",
      "type": "dataflow",
      "metadata": {}
    },
    {
      "id": "conn-2",
      "sourceId": "block-gateway-1",
      "targetId": "block-compute-1",
      "type": "dataflow",
      "metadata": {}
    }
  ],
  "externalActors": [
    {
      "id": "ext-internet",
      "name": "Internet",
      "type": "internet"
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Serialization Format

- Serialization is versioned through `schemaVersion` and currently uses `"0.1.0"` (see `apps/web/src/shared/types/schema.ts`).
- The persisted root payload shape is `{ schemaVersion, workspaces[] }`, where each workspace contains one `architecture: ArchitectureModel`.
- For broader domain semantics and lifecycle rules, see `docs/model/DOMAIN_MODEL.md`.

---

# 4. Rule Engine

> See also: PRD §11 (Architecture Rules)

The Rule Engine validates architecture constraints.

### Module Architecture

The validation engine is split into focused modules:

```
apps/web/src/features/validate/
├── engine.ts       # validateArchitecture(model): orchestration entrypoint
├── placement.ts    # validatePlacement(block, plate): placement rule checks
└── connection.ts   # validateConnection(connection, blocks, externalActors): flow rule checks
```

Validation flow in `engine.ts`:
- Iterate all blocks and run placement rules from `placement.ts`
- Iterate all connections and run connection rules from `connection.ts`
- Aggregate errors/warnings into one `ValidationResult`

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
Compute  → Storage    ✔
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

MVP (v0.1) supports DataFlow only.

---

# 5. Code Generation Pipeline (v0.3+)

> See also: PRD §12 (MVP Feature Set — Architecture Model Export), PRD §16 (Future Roadmap)

> **Status**: Not yet implemented. Planned for v0.3.

The core value delivery — transforming visual architecture into deployable IaC code.

### Pipeline

```
Architecture Model (JSON)
↓
Schema Validation
↓
Normalization Layer (canonical model normalization)
↓
Provider Adapter (Azure / AWS / GCP mapping)
↓
Generator Plugin (Terraform / Bicep / Pulumi)
↓
Formatter (output shaping, file layout)
↓
Generated Code Output
↓
GitHub Commit / PR (via Backend, v0.5+)
```

### Planned Module Structure (v0.3+)

```text
generators/
  adapters/
    azure_adapter.ts
    aws_adapter.ts
  terraform/
    network.tf.ts
    compute.tf.ts
    database.tf.ts
  normalization/
    model_normalizer.ts
  formatter/
    output_formatter.ts
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| Normalization | Convert raw architecture JSON into a canonical, generation-safe model (stable IDs, resolved references, defaults). |
| Provider Adapter | Map CloudBlocks generic entities to provider-specific resource semantics. |
| Generator | Produce IaC artifacts from normalized, provider-mapped input. |
| Formatter | Assemble final output files and directory structure for commit/export. |

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

### CI/CD Integration (v0.5+)

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

# 6. Rendering Layer Architecture (v0.1 — current)

> See also: PRD §13 (User Interface), PRD §14 (Technical Constraints)

The scene layer is implemented in `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` and composes entity renderers.

```text
SceneCanvas (root 3D scene)
  ├ OrbitControls (zoom/pan only, rotation disabled)
  ├ Grid
  ├ PlateModel (network/subnet rendering)
  ├ BlockModel (infrastructure block rendering)
  ├ ConnectionLine (data flow arrows)
  └ Html labels (plate/block names via @react-three/drei)
```

| Component | Responsibility |
|-----------|----------------|
| SceneCanvas | Hosts `Canvas`, camera/lights, controls, and orchestrates rendering of all model entities from Zustand state. |
| PlateModel | Renders plate geometry (network/subnet), visual state (hover/selection), and plate labels. |
| BlockModel | Renders block geometry by category, interaction states, and block labels; anchors block position to parent plate. |
| ConnectionLine | Resolves endpoints and renders curved directional dataflow lines with arrowheads. |

> Rendering is projection only: the authoritative editing model remains 2D coordinates with containment hierarchy, then projected into the 2.5D scene.

---

# 7. Provider Adapter Layer

> See also: PRD §9 (Architecture Elements — Blocks and Plates)

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources.

> Simplification for MVP: In the MVP, Compute refers to resources deployed within a Subnet (VM, Container App).

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

# 8. GitHub Integration Architecture (v0.5+)

> See also: PRD §16 (Future Roadmap — v0.5 GitHub Integration)
> **Status**: Not yet implemented. Planned for v0.5.

## Auth: GitHub App Model

CloudBlocks will use a **GitHub App** (not raw OAuth) for:
- Repo-scoped permissions
- Short-lived installation tokens (no long-lived user tokens in browser)
- Easy revocation
- Webhook support

```
User → CloudBlocks UI → Backend API → GitHub App → User's Repos
```

## Data Flow

```
1. User designs architecture in isometric builder
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

# 9. Storage Architecture

### Data Placement Strategy

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Architecture spec | GitHub repo (v0.5+) | Version history, diff, collaboration |
| Generated IaC code | GitHub repo (v0.5+) | PR-based review, CI/CD |
| Templates | GitHub repo | Community contribution |
| User / Identity | Metadata DB | Auth, OAuth tokens |
| Workspace index | Metadata DB | Fast lookup |
| Run status | Metadata DB | Job state tracking |
| Audit summary | Metadata DB | Lightweight trail |
| Large artifacts | Blob Storage | Binary assets |
| Session / Cache | Redis / Upstash | Rate limiting, locks |

### Metadata DB Schema (Minimal)

> **Note**: The schema below matches the actual migration files. See `apps/api/app/infrastructure/db/migrations/` for the source of truth.

```sql
-- Users and identity (001_create_users.sql)
CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    github_id   TEXT UNIQUE,
    github_username TEXT,
    email       TEXT,
    display_name TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identities (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    provider    TEXT NOT NULL,  -- 'github', 'google'
    provider_id TEXT NOT NULL,
    access_token_hash TEXT,
    refresh_token_hash TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Workspaces and generation runs (002_create_workspaces.sql)
CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    github_repo TEXT,
    github_branch TEXT DEFAULT 'main',
    last_synced_at TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generation_runs (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id),
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    generator     TEXT NOT NULL,
    commit_sha    TEXT,
    started_at    TIMESTAMP,
    completed_at  TIMESTAMP,
    error_message TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 10. State Management

### v0.1 Storage (Local)

v0.1 uses browser localStorage for persistence.

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

> **Note**: Each workspace contains a single `architecture` object (not an array). This matches the code implementation in `apps/web/src/shared/types/index.ts`.

### v0.3+ Storage (Local-First + GitHub Sync — Planned)

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

Planned sync behavior (v0.3+):
- Conflict detection via GitHub file SHA comparison before write operations
- Offline edits are persisted locally and queued for sync on reconnect
- Optimistic concurrency model: fast local commits, fail-fast when remote SHA diverges

Future workspace evolution (post-v0.3):
- Multiple architectures per workspace may be supported
- Environment variants (dev/staging/prod) may be added
- Architecture version history may be tracked per workspace

---

# 11. Security Considerations (v0.5+)

- GitHub App tokens: short-lived, repo-scoped, stored server-side only
- No long-lived user tokens in the browser
- OAuth tokens encrypted at rest in metadata DB
- Workspace isolation: users can only access their own projects
- Rate limiting: per-user, per-endpoint
- Content validation: sanitize architecture JSON before processing

---

# 12. Scalability

The architecture supports horizontal scalability:

| Component | Strategy |
|-----------|----------|
| Frontend | Static hosting / CDN |
| Backend API | Stateless containers (scale horizontally) |
| Metadata DB | Managed Postgres (Supabase / RDS) |
| Job Queue | Redis / Upstash |
| Storage | GitHub (unlimited repos) + Blob storage |

---

# 13. Summary

```
Frontend (v0.1: SPA with R3F, 2.5D isometric view, localStorage persistence)
Core Model (Zustand store — 2D coordinates + hierarchy)
Rule Engine (in-browser validation)
Code Generation (v0.3+: Terraform / Bicep / Pulumi plugins — planned)
Backend (v0.5+: Thin orchestration layer — FastAPI — scaffolded)
GitHub Integration (v0.5+: repos as data store — planned)
```

This architecture enables:
- Visual architecture design with 2.5D isometric blocks
- Rule-based validation of cloud infrastructure
- Automated infrastructure code generation (planned)
- Git-native collaboration and version control (planned)
- Lightweight deployment with minimal infrastructure cost

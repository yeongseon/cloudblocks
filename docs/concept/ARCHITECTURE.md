# CloudBlocks Platform — System Architecture

This document defines the system architecture for the CloudBlocks Platform.

CloudBlocks is an **Architecture Compiler** — it models cloud infrastructure using a **block-based composition system**, validates designs against architectural rules, and generates deployable infrastructure code (Terraform, Bicep, Pulumi). The current architecture is **Git-native**: GitHub repos are the source of truth for architecture payloads and generated artifacts.

> **Technical approach**: CloudBlocks is a **2D-first editor with 2.5D rendering**, rather than a full 3D engine. The internal model is a 2D coordinate system with containment hierarchy. The rendering layer projects this into an isometric view using SVG + CSS transforms.
> See [ADR-0010](../adr/0010-svg-only-rendering-model.md) for the definitive rendering technology decision.

---

## Architecture Compiler — Core Concept

### Block-Based Composition Model

CloudBlocks models infrastructure using a block-based architecture system. Users assemble infrastructure by placing visual building blocks — not by drawing diagrams or writing code:

| Concept             | Role                                | Example                                         |
| ------------------- | ----------------------------------- | ----------------------------------------------- |
| **Container Block** | Infrastructure boundary (container) | Network container block, Subnet container block |
| **Block**           | Infrastructure resource (service)   | Compute, Database, Storage, Gateway             |
| **Connection**      | Communication flow (dataflow)       | Gateway → Compute → Database                    |

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

| Subsystem              | Responsibility                                                           | Details                                                                   |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Web Builder**        | Visual diagram editing, architecture visualization, rule feedback        | This document                                                             |
| **Architecture Model** | Provider-agnostic architecture representation, versioning, serialization | [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)                               |
| **Architecture Graph** | Graph-based execution model for validation and generation                | [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md) |
| **DSL Specification**  | Language definition for infrastructure modeling                          | [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md) |
| **Rule Engine**        | Architecture validation, security checks, topology validation            | [rules.md](../engine/rules.md)                                            |
| **Generator**          | Infrastructure code generation pipeline                                  | [generator.md](../engine/generator.md)                                    |
| **Provider Adapters**  | Cloud-specific resource mapping                                          | [provider.md](../engine/provider.md)                                      |
| **Templates**          | Reusable architecture starting points                                    | [templates.md](../engine/templates.md)                                    |

### Repository Structure (Actual)

```
cloudblocks/
  apps/
    web/              # Frontend SPA (React + SVG/CSS)
    api/              # Backend API (Python FastAPI)
  packages/
    schema/                # @cloudblocks/schema (canonical model types + enums + JSON Schema)
    cloudblocks-domain/    # @cloudblocks/domain (hierarchy rules, labels, validation types)
  docs/              # Documentation
  examples/          # Example architecture READMEs
  infra/             # Deployment scaffolds (Docker, Terraform, k8s)
```

---

# 1. Architecture Overview

> For the original Milestone 1 frontend-only architecture, see [ARCHITECTURE_0X_HISTORY.md](./ARCHITECTURE_0X_HISTORY.md).

## Current Full-Stack Architecture — Git-Native Storage


```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + SVG + CSS transforms + Zustand  │
│   ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│   │ Isometric│ │ Rule     │ │ Local-First Store   │    │
│   │ Builder  │ │ Engine   │ │ (localStorage)      │    │
│   └──────────┘ └──────────┘ └────────────────────┘    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│      Backend API (Integration + Session Layer)          │
│                  Python FastAPI                         │
│   ┌──────┐ ┌───────────┐ ┌────────┐ ┌──────────┐     │
│   │ Auth │ │ Workspace │ │ GitHub │ │ AI       │     │
│   │      │ │ Metadata  │ │ Integ. │ │ Proxy    │     │
│   └──────┘ └───────────┘ └────────┘ └──────────┘     │
│                     │                                   │
│            ┌────────┴────────┐                         │
│            │ Metadata DB     │                         │
│            │ (SQLite)        │                         │
│            └─────────────────┘                         │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│              External Services                          │
│   ┌────────────┐  ┌──────────────┐  ┌──────────┐     │
│   │ GitHub     │  │ GitHub       │                    │
│   │ Repos      │  │ Actions      │                    │
│   │ (Data)     │  │ (CI/CD)      │                    │
│   └────────────┘  └──────────────┘                    │
└────────────────────────────────────────────────────────┘
```

---

# 2. System Layers

## 2.1 Frontend Layer

The frontend is a SPA built with React and SVG + CSS transforms. It uses a local-first model with optional GitHub sync.


### Responsibilities (Current)

- Drag and drop interaction
- Validation engine execution (placement, aggregation, role, connection, provider warnings)
- Code generation pipeline and preview (Terraform, Bicep, Pulumi)
- Template registry and template application flow
- GitHub sync UI (commit, branch, PR)
- Local-first store (localStorage)

### Technologies

- React + TypeScript
- SVG + CSS transforms + DOM layering (rendering layer only — editing model is 2D)
- Zustand (state management)
- Vite (build tool)

### Frontend Architecture (Feature-Sliced Design)

```
apps/web/src/
├── main.tsx
├── app/                 # App shell
├── shared/              # Type re-exports, utils, storage
│   ├── types/           # Re-exports from @cloudblocks/schema and @cloudblocks/domain
│   └── utils/           # ID generation, storage operations
├── entities/            # Domain entities
│   ├── store/           # Zustand architecture store
│   ├── validation/      # Validation engine (placement, connection rules)
│   ├── block/           # Block components
│   ├── container-block/ # Container block components
│   └── connection/      # Connection components
├── features/            # Feature modules
│   ├── ai/              # AI architecture generation
│   ├── diff/            # Architecture diff engine
│   ├── generate/        # Code generation pipeline (Terraform, Bicep, Pulumi)
│   ├── learning/        # Learning Mode engine
│   └── templates/       # Architecture templates
├── widgets/             # Composite UI widgets
│   ├── toolbar/
│   ├── menu-bar/
│   ├── resource-bar/         # Resource palette (drag-to-create)
│   ├── bottom-panel/         # StarCraft-style context panel
│   ├── validation-panel/
│   ├── code-preview/         # Code generation preview
│   ├── template-gallery/     # Template selection gallery
│   ├── workspace-manager/    # Multi-workspace management
│   ├── scene-canvas/
│   ├── diff-panel/           # Architecture diff panel
│   ├── flow-diagram/         # Architecture flow diagram
│   ├── github-login/         # GitHub OAuth login
│   ├── github-pr/            # PR creation from UI
│   ├── github-repos/         # GitHub repo management
│   ├── github-sync/          # Architecture sync to GitHub
│   ├── learning-panel/       # Learning Mode step panel
│   └── scenario-gallery/     # Learning scenario gallery
└── assets/
```

> **Package boundary**: `apps/web` imports canonical model/domain definitions from `@cloudblocks/schema` and `@cloudblocks/domain`; it does not maintain an independent local schema package.
> `features/generate/` and `features/templates/` are frontend-owned runtime modules.

## 2.2 Backend Layer — Integration and Session Layer

The backend is **NOT a heavy CRUD service**. It provides authenticated integration endpoints for GitHub and AI services, plus workspace/session metadata.

> **Current status**: Backend auth/session modules are implemented with cookie-based session auth (`cb_oauth`, `cb_session`) and SQLite-backed session persistence.

### What the Backend Does

| Responsibility       | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Auth / Identity      | GitHub OAuth + cookie-based server sessions                                 |
| GitHub Integration   | Repo listing/creation, architecture sync/pull, commit history, PR creation  |
| AI Integration Proxy | AI generation/suggestions/cost endpoints backed by stored provider API keys |
| Workspace Metadata   | Workspace index and settings (linked to GitHub repos)                       |
| Metadata DB          | User/session/workspace/run/key metadata                                     |

### What the Backend Will NOT Store

| Data                                     | Where It Lives        |
| ---------------------------------------- | --------------------- |
| Architecture specs (`architecture.json`) | GitHub repo           |
| Generated Terraform/Bicep/Pulumi         | GitHub repo           |
| Templates                                | GitHub repo           |
| Full prompt/log history                  | GitHub / Blob Storage |
| Deployment artifacts                     | GitHub / Blob Storage |

### Backend Architecture

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI app + middleware
│   ├── core/
│   │   ├── config.py              # Environment config
│   │   ├── dependencies.py        # Dependency injection
│   │   ├── errors.py              # Error types (AppError hierarchy)
│   │   └── security.py            # Fernet encryption, token hashing
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py            # GitHub OAuth + session routes
│   │       ├── session.py         # Session workspace binding
│   │       ├── workspaces.py      # Workspace CRUD
│   │       ├── github.py          # GitHub repo + sync + PR routes
│   │       ├── generation.py      # Code generation (placeholder)
│   │       ├── ai.py              # AI generation + suggestions
│   │       └── ai_keys.py         # AI API key management
│   ├── domain/
│   │   └── models/                # Entities and repository interfaces
│   ├── application/
│   │   └── use_cases/             # Business logic
│   ├── engines/                   # AI prompt templates and generation logic
│   └── infrastructure/
│       ├── db/
│       │   ├── connection.py      # Database and PostgresDatabase classes
│       │   └── migrations/
│       │       ├── 001_create_users.sql
│       │       ├── 002_create_workspaces.sql
│       │       └── 003_create_ai_api_keys.sql
│       ├── cache/                 # Redis client
│       ├── llm/                   # OpenAI client + key manager
│       ├── github_service.py      # GitHub API wrapper
│       ├── queue/                 # Job queue (scaffolded)
│       ├── storage/               # Object storage (scaffolded)
│       └── providers/             # Cloud provider integrations (scaffolded)
```

Implemented routes (mounted in main.py):

Auth:
POST /api/v1/auth/github → returns { authorize_url }, sets cb_oauth cookie
GET /api/v1/auth/github/callback?code&state → redirects, sets cb_session cookie
GET /api/v1/auth/session → returns current user; clears stale cookie on 401
GET /api/v1/auth/me → returns current authenticated user
POST /api/v1/auth/logout → always 200; clears server session + cookie

Session:
POST /api/v1/session/workspace → binds active workspace to session

Workspaces:
GET /api/v1/workspaces/ → list user's workspaces
POST /api/v1/workspaces/ → create workspace
GET /api/v1/workspaces/{id} → get workspace
PUT /api/v1/workspaces/{id} → update workspace
DELETE /api/v1/workspaces/{id} → delete workspace

GitHub Integration:
GET /api/v1/github/repos → list user's GitHub repos
POST /api/v1/github/repos → create new GitHub repo
POST /api/v1/workspaces/{id}/sync → sync architecture.json to GitHub
POST /api/v1/workspaces/{id}/pull → pull architecture.json from GitHub
POST /api/v1/workspaces/{id}/pr → create PR with architecture changes
GET /api/v1/workspaces/{id}/commits → list recent commits

Generation (placeholder):
POST /api/v1/workspaces/{id}/generate → creates run record (pending), no actual generation
GET /api/v1/workspaces/{id}/generate/{runId}→ get generation run status
GET /api/v1/workspaces/{id}/preview → placeholder, returns empty files

AI (see #320 for detailed guide):
POST /api/v1/ai/generate → AI architecture generation (OpenAI)
POST /api/v1/ai/suggest → AI architecture suggestion engine
POST /api/v1/ai/cost → Infrastructure cost estimation
POST /api/v1/ai/keys → store AI API key (encrypted)
GET /api/v1/ai/keys → list stored key providers
DELETE /api/v1/ai/keys/{provider} → delete stored key

```

---

# 3. Core Modeling Engine

> See also: PRD §8 (Core Concepts), PRD §10 (Layout Model)

The Core Modeling Engine manages the **CloudBlocks Domain Model**.

Responsibilities:
- Constructing the architecture model
- Managing block placement on container blocks
- Maintaining containment hierarchy (Network → Subnet → Block)

Example structure:

```

ContainerBlock (virtual_network)
└ ContainerBlock (subnet, public)
  └ ResourceBlock (delivery: application_gateway)
└ ContainerBlock (subnet, private)
  └ ResourceBlock (compute: virtual_machine)
  └ ResourceBlock (data: relational_database)

```

Key responsibilities:
- Maintain architecture graph
- Enforce containment relationships (via `parentId` hierarchy)
- Serialize model state to JSON

## 3.5 Architecture Model Schema

The canonical model types are defined in `packages/schema` (`@cloudblocks/schema`) and re-exported for frontend usage from `apps/web/src/shared/types/index.ts`. The domain model consists of the following core entities:

- **ContainerBlock** — Infrastructure boundary (network / subnet), with containment hierarchy via `parentId` and `frame` for visual rendering
- **ResourceBlock** — Infrastructure resource (8 categories: network, delivery, compute, data, messaging, security, identity, operations), placed on a container block via `parentId`
- **Endpoint** — Typed connection point on a block (input/output × http/event/data), with deterministic IDs
- **Connection** — Endpoint-to-endpoint dataflow (`from` → `to` as endpoint ID strings), initiator model
- ~~**ExternalActor**~~ — _Removed in Epic #1533_. Internet and browser are now standard `ResourceBlock` nodes with `roles: ['external']`. See [ADR-0015](../adr/0015-external-actor-to-block-migration.md).
- **ArchitectureModel** — Root container for all entities (blocks, endpoints, connections)

> For full TypeScript interfaces, field specifications, and endpoint model, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md).

### Serialization Format

- Serialization is versioned through `schemaVersion` and currently uses `"4.1.0"` (source constant: `packages/schema/src/index.ts` → `SCHEMA_VERSION`).
- The persisted root payload shape is `{ schemaVersion, workspaces[] }`, where each workspace contains one `architecture: ArchitectureModel`.
- For broader domain semantics and lifecycle rules, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md).

---

# 4. Rule Engine

> See also: PRD §11 (Architecture Rules)

The Rule Engine validates architecture constraints.

### Module Architecture

The validation engine is split into focused modules:

```

apps/web/src/entities/validation/
├── engine.ts # validateArchitecture(model): orchestration entrypoint
├── placement.ts # validatePlacement(block, containerBlock): placement rule checks
├── connection.ts # validateConnection(connection, endpoints, nodes): flow rule checks
├── providerValidation.ts # validateProviderRules(block, containerBlock): provider warnings
├── aggregation.ts # validateAggregation(model, block): aggregation constraints
└── role.ts # validateBlockRoles(block): role constraints

````

Validation flow in `engine.ts`:
- Placement validation (per block) via `placement.ts`
- Aggregation validation (per block, v2.0 section 8) via `aggregation.ts`
- Role validation (per block, v2.0 section 9) via `role.ts`
- Connection validation (per connection) via `connection.ts`
- Provider-specific validation (warnings) via `providerValidation.ts`

> For the complete rule set (placement rules, connection rules, and connection semantics), see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) §7 (Rule Engine).

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
      "blockId": "block-db01"
    }
  ],
  "warnings": []
}
````

---

# 5. Code Generation Pipeline

> **Status**: Implemented in the frontend (`apps/web/src/features/generate`). Terraform is the primary generator; Bicep and Pulumi are available as experimental exports.

The core value delivery — transforming visual architecture into deployable IaC code. The pipeline follows a multi-stage process: Normalize → Validate → Provider Map → Generate → Format → Output.

> For the full pipeline specification (stage details, Generator interface, determinism guarantees, error handling), see [generator.md](../engine/generator.md).
>
> For provider-specific resource mapping, see [provider.md](../engine/provider.md).

### Current Module Structure

```text
apps/web/src/features/generate/
  pipeline.ts
  terraform.ts
  bicep.ts
  pulumi.ts
  provider.ts
  providers/
    aws/
    azure/
    gcp/
```

### Layer Responsibilities

| Layer            | Responsibility                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Normalization    | Convert raw architecture JSON into a canonical, generation-safe model (stable IDs, resolved references, defaults). |
| Provider Adapter | Map CloudBlocks generic entities to provider-specific resource semantics.                                          |
| Generator        | Produce IaC artifacts from normalized, provider-mapped input.                                                      |
| Formatter        | Assemble final output files and directory structure for commit/export.                                             |

---

# 6. Rendering Layer Architecture

> See also: PRD §13 (User Interface), PRD §14 (Technical Constraints)

The scene layer is implemented in `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` and composes entity renderers.

```text
SceneCanvas (root SVG scene)
  ├ Pan/Zoom controls (CSS transform3d)
  ├ Grid (SVG pattern)
  ├ ContainerBlockSprite (network/subnet SVG rendering)
  ├ BlockSprite (infrastructure block SVG rendering)
  ├ ConnectionRenderer (data flow SVG connections with surface routing)
└ Labels (container-block/block names via HTML overlay)
```

| Component            | Responsibility                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| SceneCanvas          | Root SVG container with CSS transform3d pan/zoom; orchestrates rendering of all model entities from Zustand state.              |
| ContainerBlockSprite | Renders container block SVG geometry (network/subnet), visual state (hover/selection), ports, and container block labels.       |
| BlockSprite          | Renders block SVG geometry by category, interaction states, and block labels; anchors block position to parent container block. |
| ConnectionRenderer   | Resolves endpoints via surface routing, renders 3D footprint connections using unified block geometry for all node types. |

> Rendering is projection only: the authoritative editing model remains 2D coordinates with containment hierarchy, then projected into the 2.5D scene.
> See [ADR-0010](../adr/0010-svg-only-rendering-model.md) for the full rendering technology rationale.

---

# 7. Provider Adapter Layer

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources. Azure is the primary target (Azure-first strategy).

> For the full provider mapping tables (block mapping, container block mapping, connection interpretation) and adapter interface, see [provider.md](../engine/provider.md).

---

# 8. GitHub Integration Architecture

> See also: PRD §16 (Future Roadmap — GitHub Integration)
> **Status**: Implemented, with session auth migration completed.

## Auth: GitHub OAuth + Session Cookie Model

CloudBlocks uses GitHub OAuth for identity and server-side sessions for authenticated API access:

- OAuth state is stored in encrypted httpOnly `cb_oauth` cookie
- Session is stored server-side in SQLite (`sessions` table)
- Browser receives only httpOnly `cb_session` cookie (no JWT/localStorage token)
- Frontend calls API with `credentials: 'include'`

```
User → CloudBlocks UI → Backend API → GitHub OAuth/API → User's Repos
```

## Data Flow

```
1. User designs architecture in isometric builder
2. User clicks "Save to GitHub"
3. Frontend sends architecture JSON to backend
4. Frontend validates architecture and generates code client-side
5. Backend syncs architecture.json to GitHub and supports PR workflows
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

> For the full storage architecture (data placement strategy, metadata DB schema, Redis schema, GitHub repo structure, migration strategy), see [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md).

The storage follows a **Git-native** design: GitHub repos serve as the primary data store for architecture assets and generated code. A minimal metadata database (6 tables: `users`, `identities`, `workspaces`, `generation_runs`, `sessions`, `ai_api_keys`) handles auth, workspace indexing, run status, and server-side sessions.

**Design principle**: DB = index and status only, real data = Git / Blob Storage.

---

# 10. State Management

> For the original Milestone 1 localStorage-only storage model, see [ARCHITECTURE_0X_HISTORY.md](./ARCHITECTURE_0X_HISTORY.md).


### Storage Model (Local-First + GitHub Sync)
The persisted format uses `schemaVersion: "4.1.0"` with a `workspaces[]` array, each containing a single `architecture: ArchitectureModel` object.
localStorage for local state + optional GitHub sync:

```
Local (localStorage)  ←→    GitHub (via Backend API)
  architecture.json          cloudblocks/architecture.json
  draft changes              committed versions
  offline edits              synced on connect
```

- Anonymous/offline editing always works
- "Connect to GitHub" to sync and collaborate
- GitHub is "publish/collaborate", not "required to use"

---

# 11. Security Considerations

- Session auth uses httpOnly cookies (`cb_oauth`, `cb_session`) to prevent token access from JS
- No JWT tokens and no localStorage auth tokens in browser
- Session rows are validated server-side and revoked on logout
- OAuth/GitHub tokens are encrypted at rest in metadata DB
- Workspace isolation: users can only access their own projects
- Rate limiting: per-user, per-endpoint
- Content validation: sanitize architecture JSON before processing

---

# 12. Scalability

The architecture supports horizontal scalability:

| Component   | Strategy                                                              |
| ----------- | --------------------------------------------------------------------- |
| Frontend    | Static hosting / CDN                                                  |
| Backend API | Stateless containers (scale horizontally)                             |
| Metadata DB | SQLite (dev), PostgreSQL (production — Milestone 8 ✅)                |
| Job Queue   | In-process/background (dev), Redis (production — Milestone 8 planned) |
| Storage     | GitHub (unlimited repos) + Blob storage                               |

---

# 13. Summary

```
Frontend (SPA with SVG + CSS transforms + DOM layering, 2.5D isometric view, localStorage persistence)
Core Model (Zustand store — 2D coordinates + hierarchy)
Rule Engine (in-browser validation)
Code Generation (frontend-owned pipeline in apps/web/features/generate)
Backend (FastAPI integration/session API — auth/session + GitHub + AI proxying)
GitHub Integration (repo list/create, sync, pull, PR, commits — implemented)
```

This architecture enables:

- Visual architecture design with 2.5D isometric blocks
- Rule-based validation of cloud infrastructure
- Automated infrastructure code generation in the frontend pipeline
- Git-native collaboration and version control (implemented)
- Lightweight deployment with minimal infrastructure cost

---

> **Cross-references:**
>
> - Domain model (canonical): [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Architecture model overview: [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md)
> - DSL & pipeline overview: [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md)
> - Generator pipeline: [generator.md](../engine/generator.md)
> - Provider adapters: [provider.md](../engine/provider.md)
> - Storage architecture: [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md)
> - Rule engine: [rules.md](../engine/rules.md)
> - Templates: [templates.md](../engine/templates.md)
> - Roadmap: [ROADMAP.md](./ROADMAP.md)
> - PRD: [PRD.md](./PRD.md)

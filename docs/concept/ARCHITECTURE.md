# CloudBlocks Platform — System Architecture

This document defines the system architecture for the CloudBlocks Platform.

CloudBlocks is an **Architecture Compiler** — it models cloud infrastructure using a **Lego-style composition system**, validates designs against architectural rules, and generates deployable infrastructure code (Terraform, Bicep, Pulumi). The long-term architecture follows a **Git-native** model where GitHub repos serve as the primary data store.

> **Technical approach**: CloudBlocks is a **2D-first editor with 2.5D rendering**, rather than a full 3D engine. The internal model is a 2D coordinate system with containment hierarchy. The rendering layer projects this into an isometric view using SVG + CSS transforms.

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
| **Architecture Model** | Provider-agnostic architecture representation, versioning, serialization | [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) |
| **Architecture Graph** | Graph-based execution model for validation and generation | [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md) |
| **DSL Specification** | Language definition for infrastructure modeling | [ARCHITECTURE_MODEL_OVERVIEW.md](../model/ARCHITECTURE_MODEL_OVERVIEW.md) |
| **Rule Engine** | Architecture validation, security checks, topology validation | [rules.md](../engine/rules.md) |
| **Generator** | Infrastructure code generation pipeline | [generator.md](../engine/generator.md) |
| **Provider Adapters** | Cloud-specific resource mapping | [provider.md](../engine/provider.md) |
| **Templates** | Reusable architecture starting points | [templates.md](../engine/templates.md) |

### Repository Structure (Actual)

```
cloudblocks/
  apps/
    web/              # Frontend SPA (React + SVG/CSS)
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

## Frontend-Only SPA (Milestone 1)

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + SVG + CSS transforms + Zustand  │
│   ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│   │ Isometric│ │ Rule     │ │ localStorage        │    │
│   │ Builder  │ │ Engine   │ │ (workspace persist.) │    │
│   └──────────┘ └──────────┘ └────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

No backend required. All state lives in the browser.

## Implemented (Milestone 5-7) — Full Stack with Git-Native Storage

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                       │
│   React + TypeScript + SVG + CSS transforms + Zustand  │
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

The frontend is a SPA built with React and SVG + CSS transforms. In Milestone 1, it worked entirely standalone with localStorage. As of Milestone 5-7, it uses a local-first model with optional GitHub sync.

### Responsibilities (Milestone 1)
- 2.5D isometric builder interface (SVG + CSS transforms)
- Click-to-add block placement via palette
- Architecture validation (in-browser Rule Engine)
- Local persistence (localStorage)

### Responsibilities (Milestone 5+ — implemented)
- Drag and drop interaction
- Code generation preview (client-side for simple cases)
- GitHub sync UI (commit, branch, PR)
- Local-first store (IndexedDB + localStorage)

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
├── shared/              # Types, utils, storage
│   ├── types/           # Domain types (Plate, Block, Connection, Template)
│   └── utils/           # ID generation, storage operations
├── entities/            # Domain entities
│   ├── store/           # Zustand architecture store
│   ├── validation/      # Validation engine (placement, connection rules)
│   ├── block/           # Block components
│   ├── plate/           # Plate components
│   └── connection/      # Connection components
├── features/            # Feature modules
│   ├── generate/        # Code generation pipeline (Terraform)
│   └── templates/       # Architecture templates
├── widgets/             # Composite UI widgets
│   ├── toolbar/
│   ├── block-palette/
│   ├── properties-panel/
│   ├── validation-panel/
│   ├── code-preview/    # Code generation preview
│   ├── template-gallery/ # Template selection gallery
│   ├── workspace-manager/ # Multi-workspace management
│   └── scene-canvas/
└── assets/
```

> **Note**: `features/generate/` implements the Terraform code generation pipeline (Milestone 3). `features/templates/` implements architecture templates with a gallery UI (Milestone 4).

## 2.2 MVP Architecture (Milestone 1)

Milestone 1 is implemented as a **frontend-only SPA**. No backend required.

```
Browser (React + SVG/CSS)
├── Isometric Scene (SVG + CSS transforms + DOM layering — rendering layer)
├── Domain Model (Zustand Store — 2D coordinates + hierarchy)
├── Rule Engine (in-browser)
└── localStorage (workspace persistence)
```

## 2.3 Backend Layer (Milestone 5+) — Thin Orchestration Layer

The backend is **NOT a heavy CRUD service**. It is a **workflow orchestrator** that mediates between the UI, GitHub, and the generation engine.

> **Current status**: Backend auth/session modules are implemented with cookie-based session auth (`cb_oauth`, `cb_session`) and SQLite-backed session persistence.

### What the Backend Will Do

| Responsibility | Description |
|---------------|-------------|
| Auth / Identity | GitHub OAuth + cookie-based server sessions |
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

### Backend Architecture (Current — Milestone 7)

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI app + middleware
│   ├── core/
│   │   └── config.py              # Environment config
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py            # GitHub OAuth + session routes
│   │       ├── session.py         # Session workspace binding
│   │       ├── workspaces.py      # Workspace APIs
│   │       └── scenarios.py       # Template/scenario APIs
│   └── infrastructure/
│       └── db/
│           ├── connection.py      # MetadataDB class
│           └── migrations/
│               ├── 001_create_users.sql
│               └── 002_create_workspaces.sql
```

Implemented auth/session routes:

```
POST /api/v1/auth/github                     -> returns { authorize_url }, sets cb_oauth cookie
GET  /api/v1/auth/github/callback?code&state -> redirects, sets cb_session cookie
GET  /api/v1/auth/session                    -> returns current user; clears stale cookie on 401
POST /api/v1/auth/logout                     -> always 200; clears server session + cookie
POST /api/v1/session/workspace               -> binds active workspace to session
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

## 3.5 Architecture Model Schema

The canonical model types are defined in `apps/web/src/shared/types/index.ts`. The domain model consists of the following core entities:

- **Plate** — Infrastructure boundary (network / subnet), with containment hierarchy (`parentId`, `children`)
- **Block** — Infrastructure resource (`category`: compute / database / storage / gateway), placed on a plate via `placementId`
- **Connection** — Dataflow between blocks (`sourceId` → `targetId`), initiator model
- **ExternalActor** — External endpoint (e.g., Internet)
- **ArchitectureModel** — Root container for all entities

> For full TypeScript interfaces, field specifications, and JSON examples, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) §14 (Implementation Schema).

### Serialization Format

- Serialization is versioned through `schemaVersion` and currently uses `"0.1.0"` (see `apps/web/src/shared/types/schema.ts`).
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
├── engine.ts       # validateArchitecture(model): orchestration entrypoint
├── placement.ts    # validatePlacement(block, plate): placement rule checks
└── connection.ts   # validateConnection(connection, blocks, externalActors): flow rule checks
```

Validation flow in `engine.ts`:
- Iterate all blocks and run placement rules from `placement.ts`
- Iterate all connections and run connection rules from `connection.ts`
- Aggregate errors/warnings into one `ValidationResult`

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
      "targetId": "block-db01"
    }
  ],
  "warnings": []
}
```

---

# 5. Code Generation Pipeline (Milestone 3+)

> **Status**: Implemented in Milestone 3. The Terraform generator is functional.

The core value delivery — transforming visual architecture into deployable IaC code. The pipeline follows a multi-stage process: Normalize → Validate → Provider Map → Generate → Format → Output.

> For the full pipeline specification (stage details, Generator interface, determinism guarantees, error handling), see [generator.md](../engine/generator.md).
>
> For provider-specific resource mapping, see [provider.md](../engine/provider.md).

### Planned Module Structure (Milestone 3+)

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

---

# 6. Rendering Layer Architecture

> See also: PRD §13 (User Interface), PRD §14 (Technical Constraints)

The scene layer is implemented in `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` and composes entity renderers.

```text
SceneCanvas (root SVG scene)
  ├ Pan/Zoom controls (CSS transform3d)
  ├ Grid (SVG pattern)
  ├ PlateSprite (network/subnet SVG rendering)
  ├ BlockSprite (infrastructure block SVG rendering)
  ├ ConnectionPath (data flow SVG arrows)
  └ Labels (plate/block names via HTML overlay)
```

| Component | Responsibility |
|-----------|----------------|
| SceneCanvas | Root SVG container with CSS transform3d pan/zoom; orchestrates rendering of all model entities from Zustand state. |
| PlateSprite | Renders plate SVG geometry (network/subnet), visual state (hover/selection), studs, and plate labels. |
| BlockSprite | Renders block SVG geometry by category, interaction states, and block labels; anchors block position to parent plate. |
| ConnectionPath | Resolves endpoints and renders SVG path directional dataflow lines with arrowheads. |

> Rendering is projection only: the authoritative editing model remains 2D coordinates with containment hierarchy, then projected into the 2.5D scene.

---

# 7. Provider Adapter Layer

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources. Azure is the primary target (Azure-first strategy).

> For the full provider mapping tables (block mapping, plate mapping, connection interpretation) and adapter interface, see [provider.md](../engine/provider.md).

---

# 8. GitHub Integration Architecture (Milestone 5+)

> See also: PRD §16 (Future Roadmap — Milestone 5 GitHub Integration)
> **Status**: Implemented for Milestone 5-7 with session auth migration completed in Phase 7.

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

The storage follows a **Git-native** design: GitHub repos serve as the primary data store for architecture assets and generated code. A minimal metadata database (5 tables: `users`, `identities`, `workspaces`, `generation_runs`, `sessions`) handles auth, workspace indexing, run status, and server-side sessions.

**Design principle**: DB = index and status only, real data = Git / Blob Storage.

---

# 10. State Management

### Milestone 1 Storage (Local)

Milestone 1 uses browser localStorage for persistence. Storage key: `cloudblocks:workspaces`.

The persisted format uses `schemaVersion: "0.1.0"` with a `workspaces[]` array, each containing a single `architecture: ArchitectureModel` object.

> For the full workspace model and serialization format, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) §13 (Workspace Model) and §14 (Implementation Schema).

### Milestone 3+ Storage (Local-First + GitHub Sync — Planned)

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

# 11. Security Considerations (Milestone 5+)

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

| Component | Strategy |
|-----------|----------|
| Frontend | Static hosting / CDN |
| Backend API | Stateless containers (scale horizontally) |
| Metadata DB | SQLite (current), PostgreSQL (Phase 8 planned) |
| Job Queue | In-process/background (current), Redis (Phase 8 planned) |
| Storage | GitHub (unlimited repos) + Blob storage |

---

# 13. Summary

```
Frontend (Milestone 1: SPA with SVG + CSS transforms + DOM layering, 2.5D isometric view, localStorage persistence)
Core Model (Zustand store — 2D coordinates + hierarchy)
Rule Engine (in-browser validation)
Code Generation (Milestone 3: Terraform generator — ✅ implemented)
Backend (Milestone 5+: Thin orchestration layer — FastAPI — implemented for auth/session + GitHub integration)
GitHub Integration (Milestone 5+: repo list/create, sync, pull, PR, commits — implemented)
```

This architecture enables:
- Visual architecture design with 2.5D isometric blocks
- Rule-based validation of cloud infrastructure
- Automated infrastructure code generation (implemented client-side; server-side orchestration planned)
- Git-native collaboration and version control (implemented)
- Lightweight deployment with minimal infrastructure cost

---

> **Cross-references:**
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

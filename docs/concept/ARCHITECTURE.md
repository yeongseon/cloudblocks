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
| **Architecture Model** | Provider-agnostic architecture representation, versioning, serialization | [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) |
| **Architecture Graph** | Graph-based execution model for validation and generation | [ARCHITECTURE_GRAPH.md](../ARCHITECTURE_GRAPH.md) |
| **DSL Specification** | Language definition for infrastructure modeling | [DSL_SPEC.md](../DSL_SPEC.md) |
| **Rule Engine** | Architecture validation, security checks, topology validation | [rules.md](../engine/rules.md) |
| **Generator** | Infrastructure code generation pipeline | [generator.md](../engine/generator.md) |
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

## Current (Phase 1) — Frontend-Only SPA

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

## Planned (Phase 5+) — Full Stack with Git-Native Storage

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

The frontend is a SPA built with React and React Three Fiber. In Phase 1, it works entirely standalone with localStorage. In future versions, it will adopt a local-first architecture with optional GitHub sync.

### Responsibilities (Phase 1 — current)
- 2.5D isometric builder interface (React Three Fiber)
- Click-to-add block placement via palette
- Architecture validation (in-browser Rule Engine)
- Local persistence (localStorage)

### Responsibilities (Phase 5+ — planned)
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

> **Note**: `features/generate/` implements the Terraform code generation pipeline (Phase 3). `features/templates/` implements architecture templates with a gallery UI (Phase 4).

## 2.2 MVP Architecture (Phase 1)

Phase 1 is implemented as a **frontend-only SPA**. No backend required.

```
Browser (React + R3F)
├── Isometric Scene (Three.js — rendering layer)
├── Domain Model (Zustand Store — 2D coordinates + hierarchy)
├── Rule Engine (in-browser)
└── localStorage (workspace persistence)
```

## 2.3 Backend Layer (Phase 5+) — Thin Orchestration Layer

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

### Backend Architecture (Planned — Phase 5+)

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
# Planned (Phase 5+)
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

## 3.5 Architecture Model Schema (Phase 1 — current)

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

# 5. Code Generation Pipeline (Phase 3+)

> **Status**: Implemented in Phase 3. The Terraform generator is functional.

The core value delivery — transforming visual architecture into deployable IaC code. The pipeline follows a multi-stage process: Normalize → Validate → Provider Map → Generate → Format → Output.

> For the full pipeline specification (stage details, Generator interface, determinism guarantees, error handling), see [generator.md](../engine/generator.md).
>
> For provider-specific resource mapping, see [provider.md](../engine/provider.md).

### Planned Module Structure (Phase 3+)

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

# 6. Rendering Layer Architecture (Phase 1 — current)

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

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources. Azure is the primary target (Azure-first strategy).

> For the full provider mapping tables (block mapping, plate mapping, connection interpretation) and adapter interface, see [provider.md](../engine/provider.md).

---

# 8. GitHub Integration Architecture (Phase 5+)

> See also: PRD §16 (Future Roadmap — Phase 5 GitHub Integration)
> **Status**: Not yet implemented. Planned for Phase 5.

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

> For the full storage architecture (data placement strategy, metadata DB schema, Redis schema, GitHub repo structure, migration strategy), see [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md).

The storage follows a **Git-native** design: GitHub repos serve as the primary data store for architecture assets and generated code. A minimal metadata database (4 tables: `users`, `identities`, `workspaces`, `generation_runs`) handles auth, workspace indexing, and run status only.

**Design principle**: DB = index and status only, real data = Git / Blob Storage.

---

# 10. State Management

### Phase 1 Storage (Local)

Phase 1 uses browser localStorage for persistence. Storage key: `cloudblocks:workspaces`.

The persisted format uses `schemaVersion: "0.1.0"` with a `workspaces[]` array, each containing a single `architecture: ArchitectureModel` object.

> For the full workspace model and serialization format, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) §13 (Workspace Model) and §14 (Implementation Schema).

### Phase 3+ Storage (Local-First + GitHub Sync — Planned)

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

# 11. Security Considerations (Phase 5+)

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
Frontend (Phase 1: SPA with R3F, 2.5D isometric view, localStorage persistence)
Core Model (Zustand store — 2D coordinates + hierarchy)
Rule Engine (in-browser validation)
Code Generation (Phase 3: Terraform generator — ✅ implemented)
Backend (Phase 5+: Thin orchestration layer — FastAPI — scaffolded)
GitHub Integration (Phase 5+: repos as data store — planned)
```

This architecture enables:
- Visual architecture design with 2.5D isometric blocks
- Rule-based validation of cloud infrastructure
- Automated infrastructure code generation (planned)
- Git-native collaboration and version control (planned)
- Lightweight deployment with minimal infrastructure cost

---

> **Cross-references:**
> - Domain model (canonical): [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Architecture graph: [ARCHITECTURE_GRAPH.md](../ARCHITECTURE_GRAPH.md)
> - DSL specification: [DSL_SPEC.md](../DSL_SPEC.md)
> - Generator pipeline: [generator.md](../engine/generator.md)
> - Provider adapters: [provider.md](../engine/provider.md)
> - Storage architecture: [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md)
> - Rule engine: [rules.md](../engine/rules.md)
> - Templates: [templates.md](../engine/templates.md)
> - Roadmap: [ROADMAP.md](./ROADMAP.md)
> - PRD: [PRD.md](./PRD.md)

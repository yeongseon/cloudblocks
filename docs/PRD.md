# CloudBlocks Platform

Build cloud architecture visually, generate production-ready infrastructure code.

---

# 1. Product Overview

CloudBlocks is an **open-source 2.5D isometric cloud architecture builder and code generation platform**. Users design cloud architectures by placing blocks on plates in a 2.5D isometric environment, and the platform generates Terraform, Bicep, or Pulumi code from the visual design.

This is not a diagram tool. It is an **architecture-to-code generator** — the visual builder is the input surface, and the output is production-ready infrastructure-as-code.

### Core Loop

```
Design (2.5D Isometric Builder) → Validate (Rule Engine) → Generate (Terraform / Bicep / Pulumi) → Deliver (GitHub Commit / PR)
```

### Value Proposition

- **Visual-first**: Design cloud architecture by assembling isometric blocks — no YAML/HCL from scratch
- **Code-native output**: Every design produces real, deployable infrastructure code
- **Git-native workflow**: Architectures stored in GitHub repos, changes tracked via commits and PRs
- **Open-source core**: Free to use, extend, and self-host

---

# 2. Vision

**"Architecture → Code"** — the fastest path from cloud design to deployable infrastructure.

Long-term goals:

- 2.5D Isometric Cloud Architecture Builder → Code Generation Platform
- Multi-provider IaC generation (Terraform, Bicep, Pulumi)
- Template marketplace for common architectures
- GitHub-integrated DevOps workflow
- Plugin-based generator ecosystem

---

# 3. Design Principles

1. **2.5D visual clarity over full 3D realism** — The isometric view provides spatial understanding without the complexity of a full 3D engine. Readability and predictability are more important than visual fidelity.

2. **Fixed camera, predictable interaction** — Users work with a fixed isometric viewing angle. No free-orbit camera in MVP. Zoom and pan are supported. This keeps the editing experience stable and learnable.

3. **2D editing model with hierarchical layers** — The internal editing model is 2D with hierarchy (plates contain plates contain blocks). Depth is expressed through the isometric rendering, not through a physical z-axis that users manipulate.

4. **Architecture-first, not diagram-first** — CloudBlocks is not a drawing tool. The visual builder enforces architecture rules. Every visual element maps to a real cloud resource and generates real IaC code.

5. **Code generation compatibility > visual complexity** — Visual features are justified only when they serve the architecture model and code generation pipeline. If a visual feature doesn't map to a generatable construct, it doesn't belong in MVP.

---

# 4. Visual Model vs Internal Architecture Model

This distinction is central to CloudBlocks' design.

### Visual Layer (What the User Sees)

- 2.5D isometric presentation using React Three Fiber
- Fixed viewing angle (isometric projection)
- Depth simulated through rendering (layered shadows, plate elevation, block stacking)
- Consistent block sizing and visual hierarchy

### Internal Model (What the System Operates On)

- 2D coordinate system (x, y) with hierarchy-based containment
- Architecture graph for validation and code generation
- Serialized as `architecture.json`

### Key Principles

> **The visual layer is a projection. The internal architecture model is the source of truth.**

> **Depth is semantic, not physically simulated.**

The visual layer renders the architecture attractively. The internal model defines what is valid, what connects to what, and what code gets generated. When these conflict, the internal model wins.

---

# 5. Target Users

## Primary Users

### Developers & DevOps Engineers
- Infrastructure engineers designing cloud architectures
- DevOps engineers setting up CI/CD pipelines
- Full-stack developers provisioning cloud resources
- Platform engineers standardizing infrastructure patterns

### Secondary Users

- Tech leads reviewing architecture decisions
- Solution architects prototyping designs
- Teams adopting Infrastructure-as-Code for the first time

---

# 6. Core Concept

## Block Cloud Model

Cloud Architecture is represented as a layered containment model:

```
Global Entry (Internet / External Actor)
└ Network Plate (VNet / VPC)
  └ Subnet Plate (Public / Private)
    └ Resource Block (Compute / Database / Storage / Gateway)
      └ Connection Layer (DataFlow between blocks)
```

### Plate

Spatial containers representing infrastructure regions.

- Network Plate — Cloud network (Azure VNet / AWS VPC)
- Subnet Plate — Network subdivision (Public / Private)

### Block

Blocks represent **architecture roles**, not just raw cloud vendor resources.

| Block | Architecture Role | Azure Example | AWS Example |
|-------|------------------|---------------|-------------|
| Web App | Public-facing application | Container App | ECS / Fargate |
| API Service | Backend service | Container App | ECS / Lambda |
| Worker | Background processor | Container Instance | ECS / Lambda |
| Database | Persistent data store | Azure SQL | RDS |
| Storage | Object/file storage | Blob Storage | S3 |
| Gateway | Traffic entry point | Application Gateway | ALB |

> **MVP simplification**: In v0.1, blocks use generic categories (Compute, Database, Storage, Gateway). Role-based blocks (Web App, API Service, Worker) are planned for v0.3+.

### Connection

Data flow between blocks. Connections represent the **request initiator direction** — who initiates the request. Responses flow implicitly in the reverse direction.

```
Internet → Gateway → App → Database
```

### External Actor

Endpoints outside the system boundary.

- Internet (external user traffic entry point)

External Actors are not Plates or Blocks — they are used only as Connection sources or targets.

---

# 7. Layout Model

CloudBlocks uses a **layered containment model** for spatial organization:

```
┌─────────────────────────────────────────────────────┐
│  Global Entry (Internet)                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Network Plate (Azure VNet)                    │  │
│  │  ┌─────────────────┐  ┌─────────────────────┐│  │
│  │  │ Public Subnet   │  │ Private Subnet       ││  │
│  │  │  ┌───────────┐  │  │  ┌───────┐ ┌──────┐ ││  │
│  │  │  │ Gateway   │  │  │  │ App   │ │ DB   │ ││  │
│  │  │  └───────────┘  │  │  └───────┘ └──────┘ ││  │
│  │  └─────────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Rules:
- Plates contain other plates or blocks (hierarchical nesting)
- Blocks must be placed on a Subnet Plate (not directly on Network Plate)
- Connections can cross plate boundaries
- Snap-to-grid enforces clean alignment
- No freeform placement — blocks snap to grid positions within their parent plate

---

# 8. Camera & Interaction Model

### MVP (v0.1)

- **Fixed isometric camera** — no free orbit
- **Zoom and pan** supported
- **Snap-to-grid** placement
- **Click-to-add** block placement via palette
- **No depth-axis dragging** — users don't manipulate a z-axis
- **No freeform 3D placement** — all placement follows grid and containment rules

### Planned (v0.2+)

- Drag-and-drop block repositioning
- Keyboard shortcuts (delete, undo, redo)
- Block resize
- Improved visual polish (shadows, materials)

---

# 9. MVP Scope (v0.1)

The initial MVP is a **frontend-only SPA** with local persistence.

### What's Included

- Fixed isometric 2.5D view
- Click-to-add block placement via palette
- Hierarchical containment (Network → Subnet → Block)
- Snap-to-grid positioning
- Selection, move, delete
- Rule Engine validation (placement + connection)
- DataFlow connection visualization
- Local save/export (localStorage)
- `architecture.json` generation (internal model)

### Supported Plates

- Network Plate
- Subnet Plate (Public / Private)

### Supported Blocks

- Compute (App)
- Database
- Storage
- Gateway

### Example Architecture (Azure)

3-tier Web Application on Azure:

```
Internet
↓
Application Gateway (Public Subnet)
↓
Container App (Private Subnet)
↓
Azure SQL Database (Private Subnet)
```

### MVP Acceptance Criteria

#### Scenario 1: 3-Tier Architecture Construction
- Network Plate can be placed on canvas
- Public/Private Subnet Plates can be placed inside Network Plate
- Gateway on Public Subnet, Compute(App) and Database on Private Subnet
- Architecture validation passes without errors

#### Scenario 2: Architecture Validation
- Database on Public Subnet → validation error
- Compute outside Subnet → validation error
- Database → Gateway connection → validation error

#### Scenario 3: Workspace Persistence
- Save architecture to localStorage
- Load saved architecture
- Loaded architecture matches saved state

### Out of Scope (v0.1)

- Code generation (v0.3)
- GitHub integration (v0.5)
- Backend API (v0.5)
- Multi-cloud support (v2.0)
- User authentication
- Collaboration features

---

# 10. MVP Exclusions (Non-Goals)

CloudBlocks MVP is **NOT**:

| Not This | Why |
|----------|-----|
| Full 3D modeling tool | We use 2.5D isometric for spatial clarity, not immersive 3D |
| Game-like world editor | No physics, no collision, no free camera |
| Photorealistic cloud simulator | Architecture readability > visual realism |
| Generic diagramming tool (like draw.io) | Every element maps to real IaC — not freeform shapes |
| Freeform CAD builder | Constrained placement via grid + hierarchy + rules |

### Explicitly Excluded from MVP

- Full 3D navigation / free camera orbit
- Arbitrary rotation of the scene
- Physics-based collision detection
- Advanced animation (block transitions, particle effects)
- Real-time multi-user collaboration
- Depth-axis (z) user manipulation

---

# 11. Rendering Strategy

CloudBlocks uses a **2D-first editor with 2.5D rendering**, rather than a full 3D engine.

### Isometric Projection

- Fixed isometric camera angle
- Consistent viewing direction across all sessions
- No perspective distortion — parallel projection

### Visual Hierarchy

- **Layered shadows** — plates cast shadows to indicate elevation
- **Plate elevation** — network plates sit at base level, subnet plates slightly elevated
- **Consistent block sizing** — all blocks within a category share the same dimensions
- **Simple visual hierarchy** — color and shape encode architecture role, not arbitrary styling

### Priorities

1. **Readability** — users understand the architecture at a glance
2. **Stable interaction** — click targets don't shift unexpectedly
3. **Predictable placement** — blocks go where users expect them to go

---

# 12. Core Features

## Visual Architecture Builder

- 2.5D isometric block placement with React Three Fiber
- Plate-based hierarchical containment
- Click-to-add interaction (v0.1), drag-and-drop (v0.2+)

## Architecture Validation

Rule-based validation of block placement and connections:

- Database cannot be placed on Public Subnet
- Gateway must be placed on Public Subnet
- Compute must be placed on Subnet

## Architecture Flow Visualization

Data flow visualization:

```
Internet → Gateway → App → Database
```

## Code Generation (v0.3+)

Generate infrastructure code from visual architecture:

- Terraform (HCL) — Azure provider first
- Bicep (Azure-native)
- Pulumi (TypeScript/Python)

## GitHub Integration (v0.5+)

Git-native workflow:

- Commit architecture + generated code to GitHub repo
- Create branches and PRs for architecture changes
- Version history via Git commits

---

# 13. Architecture Philosophy

## Git-Native SaaS

CloudBlocks follows a **Git-native architecture** — GitHub repos serve as the primary data store for all architecture assets.

```
Frontend
  ↓
Backend API (Thin Orchestration Layer)
  ├── Auth / Identity
  ├── Generator Orchestrator
  ├── GitHub Integration
  ├── Job Runner
  └── Minimal Metadata DB
         ↓
     GitHub / Blob Storage
```

### Why Git-Native?

GitHub provides for free what traditional databases charge for:

- **Version history** — every architecture change tracked
- **Diff** — see what changed between versions
- **Collaboration** — PRs, issues, code review
- **Backup** — distributed by nature
- **Audit log** — who changed what, when
- **CI/CD hooks** — trigger pipelines on architecture changes

### Backend = Thin Orchestration Layer

The backend is **not** a heavy CRUD SaaS. It is a **workflow backend** that mediates between the UI, GitHub, and the generation engine.

**What the backend does:**
- Auth / Identity (GitHub App, OAuth)
- Generator orchestration (validate → transform → generate)
- GitHub integration (commit, branch, PR)
- Job running (async generation, validation)
- Minimal metadata storage (user, workspace index, run status)

**What the backend does NOT store:**
- Architecture specs (→ GitHub)
- Generated Terraform/Bicep/Pulumi (→ GitHub)
- Templates (→ GitHub)
- Deployment artifacts (→ GitHub / Blob Storage)
- Logs (→ GitHub Actions / Blob Storage)

### Storage Strategy

| Data | Store | Reason |
|------|-------|--------|
| Architecture spec (JSON) | GitHub repo | Version history, diff, collaboration |
| Generated IaC code | GitHub repo | PR-based review, CI/CD integration |
| Templates | GitHub repo (monorepo initially) | Community contribution via PRs |
| User / Identity | Metadata DB (Supabase/Postgres) | Auth, OAuth tokens |
| Workspace index | Metadata DB | Fast lookup, mapping user → repos |
| Run status | Metadata DB | Job state, timestamps |
| Audit summary | Metadata DB | Lightweight audit trail |
| Deployment artifacts | GitHub / Blob Storage | Large files, binary assets |
| Cache | Redis / Upstash (optional) | Rate limiting, session cache |

### GitHub Repo Structure (per project)

```
my-cloud-project/
├── cloudblocks/
│   ├── architecture.json       # Visual architecture model
│   ├── schemaVersion           # Schema version marker
│   └── generator.lock          # Pinned generator versions
├── infra/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── bicep/                  # (if selected)
│   └── pulumi/                 # (if selected)
└── .github/
    └── workflows/
        └── plan.yml            # Auto-run terraform plan on PR
```

---

# 14. Code Generation Pipeline

## Pipeline Architecture

```
Architecture Model (JSON)
↓
Schema Validation
↓
Provider Adapter (Azure / AWS / GCP mapping)
↓
Generator Plugin (Terraform / Bicep / Pulumi)
↓
Code Output
↓
GitHub Commit / PR
```

## Generator Plugin System

Generators are modular and pluggable:

| Generator | Format | Status |
|-----------|--------|--------|
| Terraform | HCL | Primary (v0.3) |
| Bicep | Azure ARM DSL | v0.5 |
| Pulumi | TypeScript/Python | v1.0 |

Each generator implements a standard interface:

```typescript
interface Generator {
  name: string;
  version: string;
  generate(architecture: ArchitectureModel, options: GeneratorOptions): GeneratedOutput;
}
```

---

# 15. Provider Abstraction

CloudBlocks uses a **provider abstraction layer** for multi-cloud support. Azure is the primary target.

> Simplification for MVP: In the MVP, Compute refers to resources deployed within a Subnet (VM, Container App).

| Generic | Azure | AWS | GCP |
|---------|-------|-----|-----|
| Network (Plate) | VNet | VPC | VPC |
| Subnet (Plate) | Subnet | Subnet | Subnet |
| Compute | VM / Container App | EC2 | Compute Engine |
| Database | Azure SQL | RDS | Cloud SQL |
| Storage | Blob Storage | S3 | Cloud Storage |
| Gateway | Application Gateway | ALB | Load Balancer |
| Function (v1.0) | Azure Function | Lambda | Cloud Functions |

---

# 16. Technical Architecture Note

CloudBlocks is a **2D-first editor with 2.5D rendering**, rather than a full 3D engine.

- The internal coordinate system is 2D (x, y) with containment hierarchy
- The rendering layer projects this into an isometric 2.5D view using React Three Fiber
- Three.js is used for rendering only — the editing model does not depend on 3D math
- This keeps the codebase simpler, the interaction model predictable, and the code generation pipeline clean

---

# 17. Risk & Tradeoffs

### Core Tension

CloudBlocks must balance four competing concerns:

1. **Visual uniqueness** — the isometric view is the product's identity
2. **Interaction simplicity** — users must feel productive immediately
3. **Architecture correctness** — the model must be valid and generatable
4. **Generator compatibility** — visual elements must map cleanly to IaC constructs

### Key Risk

> If the builder behaves too much like a 3D editor, usability drops.
> If it behaves too much like a flat diagram tool, the product loses its visual identity.

### Mitigations

- Fixed camera eliminates 3D navigation complexity
- Snap-to-grid eliminates freeform placement confusion
- Hierarchy-based containment keeps the model simple and generatable
- Rule engine catches invalid architectures before code generation
- Architecture roles (not raw resources) keep the block count manageable

---

# 18. Post-MVP Features

## v0.3 — Code Generation
- Terraform generation from architecture model (Azure provider first)
- Export to file / clipboard

## v0.5 — GitHub Integration + Backend
- GitHub App OAuth
- Commit architecture + generated code to user repos
- Thin orchestration backend (FastAPI)
- PR-based architecture change workflow

## v1.0 — Multi-Generator + Templates
- Bicep and Pulumi generators
- Template library (3-tier, serverless, AI stack)
- Serverless blocks (Function, Queue, Event, Timer)

## v1.5 — Collaboration + CI/CD
- Real-time collaboration via PRs
- GitHub Actions integration (auto-plan on PR)
- Architecture diff visualization

---

# 19. Success Metrics

### MVP (v0.1)
- Users can build a valid architecture in **< 5 minutes**
- Users understand the hierarchy at a glance (no training needed)
- Export `architecture.json` without confusion
- Builder is understandable without documentation or training

### Post-MVP
- Generated IaC code passes `terraform validate` / `bicep build`
- Architecture → code generation success rate > 95%
- GitHub stars and contributor growth
- Active users (self-hosted + hosted)

---

# 20. Monetization

Open-source core with commercial offerings:

| Tier | Model | Description |
|------|-------|-------------|
| Free | Open-source | Core builder + Terraform generator + self-host |
| Pro | Hosted SaaS | Multi-generator, GitHub integration, team features |
| Enterprise | Consulting | Custom templates, training, architecture review |
| Marketplace | Revenue share | Community-contributed templates and generators |

---

# 21. Long Term Expansion

### Multi-Cloud Support (v2.0)
- Azure, AWS, GCP provider adapters
- Same architecture → deploy to any cloud

### Architecture Simulation (v2.5)
- Request flow simulation
- Latency and failure modeling

### Cloud Digital Twin (v3.0)
- Live infrastructure status reflected in visual builder

### Template Marketplace (v3.5)
- Community-contributed architecture templates
- Generator plugins from third parties

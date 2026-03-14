# CloudBlocks Platform

Build cloud architecture visually, generate production-ready infrastructure code.

---

# 1. Product Overview

CloudBlocks is an **open-source 3D visual cloud architecture builder** that generates deployable infrastructure code. Users design cloud architectures by placing blocks on plates in a 3D environment, and the platform generates Terraform, Bicep, or Pulumi code from the visual design.

This is not a diagram tool. It is a **code generation platform** — the visual builder is the input surface, and the output is production-ready infrastructure-as-code.

### Core Loop

```
Design (3D Builder) → Validate (Rule Engine) → Generate (Terraform / Bicep / Pulumi) → Deliver (GitHub Commit / PR)
```

### Value Proposition

- **Visual-first**: Design cloud architecture by assembling 3D blocks — no YAML/HCL from scratch
- **Code-native output**: Every design produces real, deployable infrastructure code
- **Git-native workflow**: Architectures stored in GitHub repos, changes tracked via commits and PRs
- **Open-source core**: Free to use, extend, and self-host

---

# 2. Vision

**"Architecture → Code"** — the fastest path from cloud design to deployable infrastructure.

Long-term goals:

- Visual Cloud Architecture Builder → Code Generation Platform
- Multi-provider IaC generation (Terraform, Bicep, Pulumi)
- Template marketplace for common architectures
- GitHub-integrated DevOps workflow
- Plugin-based generator ecosystem

---

# 3. Target Users

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

# 4. Core Concept

## Block Cloud Model

Cloud Architecture is represented as a spatial block model:

```
Network Plate
└ Subnet Plate (Public / Private)
  └ Resource Block
```

### Plate

Spatial containers representing infrastructure regions.

- Network Plate — Cloud network (VNet / VPC)
- Subnet Plate — Network subdivision (Public / Private)

### Block

Cloud resources placed on Plates.

- Compute Block — VMs, Containers
- Database Block — Relational or NoSQL databases
- Storage Block — Object or file storage
- Gateway Block — Load balancers, API gateways

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

# 5. MVP Scope (v0.1)

The initial MVP is a **frontend-only SPA** with local persistence.

## Supported Plates

- Network Plate
- Subnet Plate (Public / Private)

## Supported Blocks

- Compute (App)
- Database
- Storage
- Gateway

## Example Architecture

3-tier Web Application:

```
Internet
↓
Gateway (Public Subnet)
↓
App (Private Subnet)
↓
Database (Private Subnet)
```

## MVP Acceptance Criteria

### Scenario 1: 3-Tier Architecture Construction
- Network Plate can be placed on canvas
- Public/Private Subnet Plates can be placed inside Network Plate
- Gateway on Public Subnet, Compute(App) and Database on Private Subnet
- Architecture validation passes without errors

### Scenario 2: Architecture Validation
- Database on Public Subnet → validation error
- Compute outside Subnet → validation error
- Database → Gateway connection → validation error

### Scenario 3: Workspace Persistence
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

# 6. Core Features

## Visual Architecture Builder

- 3D block-style placement with React Three Fiber
- Plate-based spatial hierarchy
- Drag and drop interaction

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

- Terraform (HCL)
- Bicep (Azure-native)
- Pulumi (TypeScript/Python)

## GitHub Integration (v0.5+)

Git-native workflow:

- Commit architecture + generated code to GitHub repo
- Create branches and PRs for architecture changes
- Version history via Git commits

---

# 7. Architecture Philosophy

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

# 8. Code Generation Pipeline

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

# 9. Post-MVP Features

## v0.3 — Code Generation
- Terraform generation from architecture model
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

# 10. Provider Abstraction

CloudBlocks uses a **provider abstraction layer** for multi-cloud support.

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

# 11. Monetization

Open-source core with commercial offerings:

| Tier | Model | Description |
|------|-------|-------------|
| Free | Open-source | Core builder + Terraform generator + self-host |
| Pro | Hosted SaaS | Multi-generator, GitHub integration, team features |
| Enterprise | Consulting | Custom templates, training, architecture review |
| Marketplace | Revenue share | Community-contributed templates and generators |

---

# 12. Long Term Expansion

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

---

# 13. Success Metrics

- GitHub stars and contributor count
- Architecture → code generation success rate
- Template usage and community contributions
- Active users (self-hosted + hosted)
- Code generation accuracy vs hand-written IaC

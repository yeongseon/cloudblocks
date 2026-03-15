# CloudBlocks Platform — Development Roadmap

This document defines the staged development roadmap for the CloudBlocks Platform. Each milestone is a **Phase** (development stage), independent of software release versions.

CloudBlocks evolves from a **2.5D isometric cloud architecture builder** into a **full architecture-to-code platform** — generating Terraform, Bicep, and Pulumi from visual designs, with Git-native workflow integration.

---

# Phase 0 — Concept Validation

Goal:
Validate the CloudBlocks block-based abstraction model.

Key Objectives:

- Plate-based architecture modeling
- Block-based resource representation
- Rule-based architecture validation

Deliverables:

- Core Domain Model (TypeScript types)
- Basic Block/Plate System
- Architecture validation engine

Outcome:

Proof that the **block abstraction maps cleanly to cloud architecture and IaC constructs**.

### Exit Criteria
- [x] Domain model types implemented in TypeScript
- [x] Basic block/plate system compiles without errors
- [x] Architecture validation engine returns correct results for 5+ test cases

---

# Phase 1 — CloudBlocks Builder (MVP) ✅

Goal:
Create a working **2.5D isometric cloud architecture builder**.

Features:

- Network Plate, Subnet Plate (Public / Private)
- Compute, Database, Storage, Gateway blocks
- Click-to-add block placement via palette
- Rule Engine (placement + connection validation)
- DataFlow connection visualization
- Workspace persistence (localStorage)

Deliverables:

- 2.5D Isometric Block Builder (React + React Three Fiber)
- In-browser Rule Engine
- Workspace save/load (localStorage)

### Exit Criteria
- [x] 3-tier architecture (Gateway → App → Database) can be constructed visually
- [x] Placement validation catches 100% of rule violations
- [x] Connection validation catches invalid connections
- [x] Workspace save/load roundtrip preserves all state
- [x] Build passes with zero errors (`tsc -b && vite build`)

### Dependencies
- Phase 0 complete

---

# Phase 2 — Visual Polish + UX ✅

Goal:
Improve the builder experience for daily use.

Features:

- Drag and drop block repositioning
- Block resize and snap-to-grid
- Keyboard shortcuts (delete, undo, redo)
- Improved isometric rendering (shadows, materials)
- Zoom/pan camera controls
- Responsive layout

### Exit Criteria
- [x] All blocks can be repositioned via drag
- [x] Undo/redo works for all state changes
- [x] Builder usable on screens ≥ 1280px width

### Dependencies
- Phase 1 complete

---

# Phase 3 — Code Generation (Terraform) ✅

Goal:
Generate **Terraform code** from visual architecture — the core value proposition.

Features:

- Terraform HCL generator (Azure provider first)
- Provider adapter layer (generic → Azure resource mapping)
- Export to file / clipboard
- Code preview panel in UI
- Architecture → `main.tf` + `variables.tf` + `outputs.tf`

Example Output:

```hcl
resource "azurerm_virtual_network" "main" {
  name                = "vnet-cloudblocks"
  address_space       = ["10.0.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_subnet" "public" {
  name                 = "subnet-public"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

### Exit Criteria
- [x] 3-tier architecture generates valid Terraform
- [x] Generated code passes `terraform validate`
- [x] Code preview panel shows generated HCL in real-time
- [x] Export to file works

### Dependencies
- Phase 1 complete

---

# Phase 4 — Workspace Management + Import/Export ✅

Goal:
Multiple workspaces, architecture import/export, and template system.

Features:

- Multiple workspace management
- Import/export architecture as JSON
- Built-in templates (3-tier, serverless, data pipeline)
- Template gallery UI
- Architecture cloning

### Exit Criteria
- [x] Users can create, switch, and delete multiple workspaces
- [x] Architecture JSON import/export roundtrip preserves all state
- [x] 3+ built-in templates available

### Dependencies
- Phase 3 complete

---

# Phase 5 — GitHub Integration + Backend API ✅

Goal:
Connect CloudBlocks to GitHub — architecture and generated code stored in user repos via a **thin orchestration backend**.

## Backend API (Thin Orchestration Layer)

- FastAPI backend for auth, generation orchestration, and GitHub integration
- GitHub App OAuth (not raw OAuth tokens)
- Minimal metadata DB (Supabase/Postgres): user, project index, run status
- **NOT** a heavy CRUD SaaS — backend mediates, does not store architecture data

## GitHub Integration

- Connect GitHub account via GitHub App
- Select or create target repository
- Commit `architecture.json` + generated Terraform to repo
- Create branches and PRs for architecture changes
- PR-based workflow: architecture change → code generation → review → merge

## GitHub Repo Structure (per project)

> See [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md) for the complete GitHub repo structure per workspace.

### Exit Criteria
- [x] GitHub App OAuth login works
- [x] Architecture + generated code commits to user's GitHub repo
- [x] PR creation from UI works
- [x] Backend metadata DB operational (user, project, run status)
- [x] No architecture data stored in backend DB (all in GitHub)

### Dependencies
- Phase 3 complete (Terraform generator)
- GitHub App registered and configured

---

# Phase 6 — Multi-Generator + Template Marketplace ✅

Goal:
Support multiple IaC generators and a community template ecosystem.

## Multi-Generator Support

- Bicep generator (Azure-native)
- Pulumi generator (TypeScript/Python)
- Generator plugin interface for third-party generators
- Generator version pinning (`generator.lock`)

## Serverless Blocks

New block types:

- FunctionBlock (Serverless compute)
- QueueBlock (Messaging services)
- EventBlock (Event triggers)
- TimerBlock (Scheduled triggers)

Example:

```
HTTP → Function → Storage
```

## Template Marketplace

- Community-contributed architecture templates
- Template versioning and categorization
- Template preview and one-click use

### Exit Criteria
- [x] Terraform, Bicep, and Pulumi generators all produce valid output
- [x] Serverless architecture (HTTP → Function → Storage) constructable
- [x] Template marketplace with 5+ community templates
- [x] Generator plugin interface documented and usable by third parties

### Dependencies
- Phase 5 complete

---

# Phase 7 — Collaboration + CI/CD Integration

Goal:
Team collaboration via Git and automated CI/CD pipelines.

Features:

- Real-time collaboration via PRs (not WebSocket — Git-based)
- Architecture diff visualization (side-by-side comparison)
- GitHub Actions integration (auto `terraform plan` on PR)
- Deployment status tracking
- Team workspace sharing

### Exit Criteria
- [ ] Architecture diff visualization works
- [ ] GitHub Actions auto-plan runs on architecture PRs
- [ ] Team members can collaborate on the same project via GitHub

### Dependencies
- Phase 6 complete

---

# Phase 8 — Multi-Cloud Platform

Goal:
Support multiple cloud providers from the same architecture.

Providers:

- Azure (existing)
- AWS
- GCP

Architecture remains the same — provider adapters handle the mapping.

> See [provider.md](../engine/provider.md) for the complete provider mapping table (block and plate mappings per cloud provider).
### Exit Criteria
- [ ] AWS and GCP provider adapters functional
- [ ] Same architecture deployable to any supported provider
- [ ] Provider comparison view available

### Dependencies
- Phase 6 complete (can run parallel with Phase 7)

---

# Phase 9 — Architecture Simulation

Goal:
Simulate architecture behavior before deployment.

Features:

- Request flow simulation
- Latency modeling
- Failure simulation
- Scaling simulation

---

# Phase 10 — Cloud Digital Twin

Goal:
Synchronize visual architecture with real infrastructure state.

Features:

- Live infrastructure status
- Real-time cloud health visualization
- Deployment monitoring

Example:
- Green block → running
- Red block → error
- Yellow block → deploying

---

# Phase 11 — Template Marketplace + Plugin Ecosystem

Goal:
Full ecosystem for community contributions.

Features:

- Generator plugins from third parties
- Premium template marketplace
- Architecture review tools
- Custom rule engine extensions

---

# Long Term Vision

CloudBlocks evolves into:

- 2.5D Isometric Cloud Architecture Builder
- Architecture → Code Generation Platform
- Git-native DevOps workflow tool
- Multi-cloud infrastructure designer
- Cloud operations dashboard
- Community-driven template and plugin ecosystem

---

# Development Strategy

Key principles:

1. Start with **2.5D isometric builder core** (Phase 1)
2. Add **code generation** early (Phase 3) — the core value
3. Integrate **GitHub** as data store (Phase 5) — not a traditional DB
4. Keep backend **thin** — orchestration, not CRUD
5. **Open-source first** — community drives templates and generators
6. **Local-first UX** — works offline, syncs when connected

---

# Success Metrics

Phase 1 (Complete)
- Architecture built successfully
- Validation engine working
- Workspace persistence functional

Phase 3
- Terraform generation produces valid HCL
- Code preview panel functional

Phase 5
- GitHub integration operational
- Backend API deployed
- Zero architecture data in backend DB

Phase 6
- Multi-generator support (Terraform + Bicep + Pulumi)
- Template marketplace launched

Phase 8+
- Multi-cloud architecture support
- Community contributors > 10
- GitHub stars growth trajectory

---

# Summary

The roadmap evolves CloudBlocks from:

2.5D Isometric Cloud Builder (Phase 1)

→ Code Generation Platform (Phase 3)

→ GitHub-Integrated DevOps Tool (Phase 5)

→ Multi-Generator Ecosystem (Phase 6)

→ Collaboration Platform (Phase 7)

→ Multi-Cloud Architecture Tool (Phase 8)

→ Architecture Simulator (Phase 9)

→ Cloud Digital Twin (Phase 10)

→ Full Plugin Ecosystem (Phase 11)

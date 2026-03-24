# CloudBlocks — 0.x Development History (Archive)

> **Status**: Historical archive. This document preserves the complete milestone-by-milestone development history from v0.0 through v0.24.
>
> **For the current product roadmap, see [ROADMAP.md](ROADMAP.md).**

---

# Original 0.x Roadmap

This document defines the staged development roadmap for the CloudBlocks Platform. Official planning is tracked with GitHub milestones.

> **Release versioning**: Each milestone maps to a minor version — **Milestone N = v0.N.0**. Patch versions (v0.N.1, v0.N.2) are reserved for hotfixes. See `AGENTS.md § Release Workflow` and `docs/design/RELEASE_GATES.md` for the full release process.

> **Terminology**
>
> - **Milestone** = official planning container (GitHub milestone) used for all new planning work.
> - **Phase** = legacy label from early development, retained only in completed historical sections for traceability.

CloudBlocks evolves from a **2.5D isometric cloud architecture builder** into a **full architecture-to-code platform** — generating Terraform, Bicep, and Pulumi from visual designs, with Git-native workflow integration.

---

## Milestone 0 — Concept Validation

Goal:
Validate the CloudBlocks block-based abstraction model.

Key Objectives:

- Container-block-based architecture modeling
- Block-based resource representation
- Rule-based architecture validation

Deliverables:

- Core Domain Model (TypeScript types)
- Basic Block/Container Block System
- Architecture validation engine

Outcome:

Proof that the **block abstraction maps cleanly to cloud architecture and IaC constructs**.

### Exit Criteria

- [x] Domain model types implemented in TypeScript
- [x] Basic block/container block system compiles without errors
- [x] Architecture validation engine returns correct results for 5+ test cases

---

## Milestone 1 — CloudBlocks Builder (MVP) ✅

Goal:
Create a working **2.5D isometric cloud architecture builder**.

Features:

- Network container block, Subnet container block (Public / Private)
- Compute, Database, Storage, Gateway blocks
- Click-to-add block placement via palette
- Rule Engine (placement + connection validation)
- DataFlow connection visualization
- Workspace persistence (localStorage)

Deliverables:

- 2.5D Isometric Block Builder (React + SVG/CSS)
- In-browser Rule Engine
- Workspace save/load (localStorage)

### Exit Criteria

- [x] 3-tier architecture (Gateway → App → Database) can be constructed visually
- [x] Placement validation catches 100% of rule violations
- [x] Connection validation catches invalid connections
- [x] Workspace save/load roundtrip preserves all state
- [x] Build passes with zero errors (`tsc -b && vite build`)

### Dependencies

- Milestone 0 complete

---

## Milestone 2 — Visual Polish + UX ✅

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

- Milestone 1 complete

---

## Milestone 3 — Code Generation (Terraform) ✅

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

- Milestone 1 complete

---

## Milestone 4 — Workspace Management + Import/Export ✅

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

- Milestone 3 complete

---

## Milestone 5 — GitHub Integration + Backend API ✅

Goal:
Connect CloudBlocks to GitHub — architecture and generated code stored in user repos via a **thin orchestration backend**.

## Backend API (Thin Orchestration Layer)

- FastAPI backend for auth, generation orchestration, and GitHub integration
- GitHub App OAuth (not raw OAuth tokens)
- Minimal metadata DB (SQLite): user, project index, run status, sessions
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

- Milestone 3 complete (Terraform generator)
- GitHub App registered and configured

---

## Milestone 6 — Multi-Generator + Template Marketplace ✅

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

- Milestone 5 complete

---

## Milestone 6B — Builder UX Completion

Goal:
Close remaining UX gaps in the single-user builder experience before adding collaboration features.

Features:

- Drag-to-create: Drag resources from CommandCard palette onto canvas container blocks (using interactjs)
- First-screen onboarding: Empty canvas CTA, guided first-click flow
- Selection visual states: Valid/invalid target highlighting, connected state, warning state

### Deliverables

| #   | Deliverable             | Priority | Effort |
| --- | ----------------------- | -------- | ------ |
| 1   | Drag-to-Create MVP      | P1       | Medium |
| 2   | First-Screen Onboarding | P2       | Low    |
| 3   | Selection Visual States | P3       | Low    |

### Exit Criteria

- [x] Resources can be dragged from CommandCard and dropped onto valid subnet container blocks
- [x] Invalid drops are rejected cleanly (no orphaned blocks, no broken state)
- [x] Click-to-create continues to work unchanged
- [x] Empty canvas shows a "Get Started" message with link to TemplateGallery
- [x] Connect mode highlights valid/invalid targets on blocks
- [x] All existing tests continue to pass
- [x] Build passes (`pnpm build`)

> **Note**: Block Normalization (9 commits) was completed alongside Milestone 6B — parameterized BlockSvg, shared IsometricPort, blockFaceColors utility, and removal of static SVG sprites.

### Dependencies

- Milestone 6 complete

---

## Milestone 6C — Learning Mode (Duolingo for Cloud Architecture)

Goal:
Transform CloudBlocks from a pure editor into a **learning platform** with guided, scenario-based missions.

> **Reference**: [LEARNING_MODE_SPEC.md](../design/LEARNING_MODE_SPEC.md)

Features:

- Build/Learn mode switch (editorMode in uiStore)
- Guided step-by-step scenario system with typed validation rules
- Scenario engine with state-based step validation
- Hint engine with idle-timer progressive reveal
- Learning Panel UI (step progress, hints, completion screen)
- Scenario Gallery for browsing/starting scenarios
- 3 built-in scenarios (beginner/intermediate/advanced)
- Progress tracking per scenario

### Deliverables

| #   | Deliverable                          | Priority | Effort |
| --- | ------------------------------------ | -------- | ------ |
| 1   | Learning types + stores              | P1       | Low    |
| 2   | Step validator + scenario engine     | P1       | Medium |
| 3   | Hint engine                          | P2       | Low    |
| 4   | Learning Panel + Scenario Gallery UI | P1       | Medium |
| 5   | 3 built-in scenarios                 | P1       | Medium |
| 6   | App integration + visual feedback    | P1       | Low    |

### Exit Criteria

- [x] Build/Learn mode switch works from toolbar
- [x] 3 scenarios completable end-to-end (beginner → advanced)
- [x] Step validation correctly evaluates all 7 rule types
- [x] Hints display progressively on idle
- [x] Scenario reset-to-checkpoint works
- [x] All tests pass, build clean
- [x] 90%+ test coverage on learning module

> **Note**: Azure Infrastructure Foundation (Phase 1, 6 commits) and Sound Effects (Phase 2, 12 commits) were completed alongside Milestone 6C — including audioService, CC0 sound assets, Terraform Azure modules, and Docker/CI configuration.

---

## Historical Phase References (Completed)

The sections below retain original Phase labels because they map to completed historical work in git history.

## Phase 3 — Mascot Character SVG ✅

Goal:
Create a DevOps Engineer mascot character as an inline SVG component with cloud provider branding.

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md)

Features:

- Minifigure SVG component (head, torso, arms, legs) in isometric style
- Azure logo on torso (first provider variant)
- AWS and GCP logo variants planned for Milestone 8 (multi-cloud)
- Universal Port Standard compliant (head port)
- DevOps Engineer persona as default character

### Deliverables

| #   | Deliverable                             | Priority | Effort                        |
| --- | --------------------------------------- | -------- | ----------------------------- |
| 1   | MinifigureSvg component (Azure variant) | P1       | Medium                        |
| 2   | Cloud provider logo SVG paths (Azure)   | P1       | Low                           |
| 3   | Isometric face shading + depth ordering | P1       | Low                           |
| 4   | AWS/GCP logo variants                   | P2       | Low (deferred to Milestone 8) |

### Exit Criteria

- [x] MinifigureSvg renders correctly at 48-64px scale
- [x] Azure logo legible on torso front face
- [x] Head port follows Universal Port Standard (rx=12, ry=6, height=5px)
- [x] Isometric projection matches existing block/container-block angles
- [x] All existing tests pass, build clean

### Dependencies

- Milestone 6C complete

---

## Milestone 7 — Collaboration + CI/CD Integration ✅

Goal:
Team collaboration via Git and automated CI/CD pipelines.

Features (Shipped):

- Architecture diff visualization — DiffPanel with structural change summary
- Visual canvas diff overlays on BlockSprite, ContainerBlockSprite, ConnectionPath (CSS-based)
- "Compare with GitHub" flow via MenuBar (uses existing `POST /pull` endpoint)
- GitHub Actions Terraform plan example template (`examples/github-actions/`)
- Escape key to exit diff mode

Deferred:

- Deployment status tracking (deferred to future milestone)
- Team workspace sharing / CollaborationPanel (deferred — existing GitHub widgets suffice)
- Backend collaboration endpoints (deferred)

### Exit Criteria

- [x] Architecture diff visualization works (DiffPanel + canvas overlays)
- [x] GitHub Actions Terraform plan template provided (`examples/github-actions/`)
- [x] Compare with GitHub flow functional from MenuBar
- [ ] Team workspace sharing (deferred)
- [ ] Deployment status tracking (deferred)

### Dependencies

- Milestone 6B complete

---

## Phase 2 UX — Magnetic Snap, Dynamic Shadows, Bounce Transitions ✅

Goal:
Add tactile, physical-feeling UX polish to block and container block drag interactions.

Features:

- **Magnetic snapping** — Blocks and container blocks snap to isometric grid on drag-end using `snapToGrid()` from isometric.ts, with audio feedback (`block-snap` sound)
- **Dynamic shadows** — Elevated shadow + scale effect during drag (CSS classList toggle), milder for container blocks than resource blocks
- **Bouncing transition** — CSS keyframe bounce animation on drop (`@keyframes bounce-drop`), milder variant for container blocks (`bounce-drop-container-block`)

### Deliverables

| #   | Deliverable                                        | Priority | Effort |
| --- | -------------------------------------------------- | -------- | ------ |
| 1   | Magnetic snap (BlockSprite + ContainerBlockSprite) | P1       | Low    |
| 2   | Dynamic drag shadows (CSS + classList)             | P1       | Low    |
| 3   | Bounce-drop animation (CSS keyframes)              | P1       | Low    |

### Exit Criteria

- [x] Blocks snap to grid on drag-end with audio feedback
- [x] Container blocks snap to grid on drag-end (world coordinates)
- [x] Dragged blocks show elevated shadow + scale effect
- [x] Dragged container blocks show milder shadow + scale effect
- [x] Drop triggers bounce animation (block: scale 1.05, container block: scale 1.02)
- [x] All existing tests pass, build clean

### Dependencies

- Milestone 7 complete

---

## Phase 7 — Session Auth Migration ✅

Goal:
Replace JWT-style token auth with secure cookie-based server sessions.

Features:

- GitHub OAuth state via encrypted httpOnly `cb_oauth` cookie
- Server-side SQLite sessions (`sessions` table, Migration 004)
- Session cookie auth via httpOnly `cb_session` cookie
- Frontend API calls standardized on `credentials: 'include'`
- Logout flow deletes server session and clears cookies

### Exit Criteria

- [x] JWT and refresh-token auth flow removed
- [x] `GET /api/v1/auth/session` is the canonical session-check endpoint
- [x] `POST /api/v1/auth/logout` always returns 200 and clears session state
- [x] Stale sessions are cleared server-side and cookies invalidated

### Dependencies

- Milestone 5 complete

---

## UX Core Improvements

Goal:
Establish a robust UX state machine and command-based interaction model.

Status: ✅ Delivered as part of Phase 9 — Visual Builder Evolution

Features:

- **BottomPanel + CommandCard** — StarCraft-style command interaction model for resource placement and actions
- **DragGhost** — Ghost preview of the resource during the drag-to-create interaction
- **Connection Preview** — Real-time connection line preview during connect mode
- **Formal Zustand State Machine** — Explicit states: `idle` | `selecting` | `dragging` | `placing` | `connecting`

### Deliverables

| #   | Deliverable                                 | Priority | Effort |
| --- | ------------------------------------------- | -------- | ------ |
| 1   | BottomPanel + CommandCard interaction model | P1       | Medium |
| 2   | DragGhost visualization                     | P1       | Low    |
| 3   | Connection preview line                     | P1       | Low    |
| 4   | Zustand UX state machine                    | P1       | Medium |

### Exit Criteria

- [x] BottomPanel is active with CommandCard categorical tabs and action modes
- [x] Drag-to-create shows accurate ghost preview at snap position
- [x] Connect mode shows line from source to cursor/target
- [x] All UI interactions are driven by explicit `InteractionState` transitions in `uiStore.ts` (`'idle' | 'selecting' | 'dragging' | 'placing' | 'connecting'`)

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md)

---

## Phase 4 — Block Design System

Goal:
Expand the visual vocabulary and formalize the block design tokens.

Status: ✅ Delivered as part of Phase 9 — Visual Builder Evolution

Features:

- **Category Taxonomy Expansion** — Future expansion beyond current 10 categories to include Network, Compute, Data, Messaging, Security, and Edge
- **Shape System** — Unique geometries: Tower (compute), Heavy Block (database/storage), Shield (gateway), Module (function/queue/event)
- **Height System** — Tiered side wall heights (low/mid/high) to indicate resource scale or tier
- **Visual Tokens** — Formal extraction of radius, shadow, border, and surface design tokens

### Deliverables

| #   | Deliverable                       | Priority | Effort |
| --- | --------------------------------- | -------- | ------ |
| 1   | Shape System implementation (SVG) | P1       | High   |
| 2   | Height System CSS/SVG logic       | P2       | Medium |
| 3   | Design token extraction           | P2       | Low    |
| 4   | Expanded taxonomy mapping         | P3       | Low    |

### Exit Criteria

- [x] Different resource types use distinct silhouettes (Tower, Heavy Block, Shield, Module)
- [x] Wall heights vary based on tier using `TIER_HEIGHTS`
- [x] Visual profiles are implemented and mapped by silhouette and height tiers
- [x] Universal Port Standard maintained across all new shapes

Follow-up (outside delivered exit criteria): full design token extraction and expanded taxonomy mapping.

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md)

---

## Phase 5 — Core Model & Multi-Cloud Bridge

Goal:
Update the core domain model to support multi-provider architectures.

Status: ✅ Delivered as part of Phase 9 — Visual Builder Evolution

Features:

- **Provider Field** — `provider?: ProviderType` (optional) is implemented on the Block model
- **Connection Expansion** — Connection model supports `dataflow` | `http` | `internal` | `data` | `async`
- **ProviderAdapter Interface** — Formal interface for mapping generic resources to provider-specific IaC
- **Provider Directory Structure** — Organize adapters in `apps/web/src/features/generate/providers/{azure,aws,gcp}/`

### Deliverables

| #   | Deliverable                          | Priority | Effort |
| --- | ------------------------------------ | -------- | ------ |
| 1   | Domain model update (provider field) | P1       | Low    |
| 2   | Connection type expansion            | P1       | Medium |
| 3   | ProviderAdapter interface            | P2       | Medium |
| 4   | Provider directory reorganization    | P2       | Low    |

### Exit Criteria

- [x] Domain model supports explicit provider tags through `ProviderType`
- [x] Connection engine handles all five protocol types (`dataflow`, `http`, `internal`, `data`, `async`)
- [x] Provider logic is isolated behind provider-oriented typing and model boundaries
- [x] Existing Azure-first workflows remain backward compatible

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md)

---

## Phase 6 — Provider Integration

Goal:
Implement visual and functional provider-specific UI elements.

Status: ✅ Partially delivered as part of Phase 9 — Visual Builder Evolution

Features:

- **Provider Color System** — Distinct 3-layer palettes for Azure, AWS, and GCP block themes
- **Provider Mode Toggle** — UI switch to filter or focus the builder on specific providers
- **Provider Extension Mechanism** — Plugin-style system for adding provider-specific properties

### Deliverables

| #   | Deliverable                        | Priority | Effort |
| --- | ---------------------------------- | -------- | ------ |
| 1   | Multi-provider color palettes      | P1       | Medium |
| 2   | Provider Mode UI toggle            | P2       | Medium |
| 3   | Provider property extension system | P2       | High   |

### Exit Criteria

- [x] Provider visual foundations are implemented (Azure provider color system + AWS/GCP minifigure variants)
- [ ] Builder UI allows switching between cloud provider contexts (provider mode toggle)
- [ ] Full multi-provider block palettes are implemented across all provider/resource combinations
- [ ] Provider-specific metadata is fully handled end-to-end in IaC generation

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md)

---

## Phase 9 — Visual Builder Evolution ✅

Goal:
Comprehensive visual builder upgrade implementing UX state machine, block design system, domain model expansion, and provider integration foundations.

Status: ✅ Complete

Deliverables:

- 4 Epics delivered (#65-#68)
- 17 PRs merged
- 1082 tests passing across 70 files

Key Features:

- InteractionState machine in `uiStore.ts` (`idle` | `selecting` | `dragging` | `placing` | `connecting`)
- 4 `BlockSilhouette` types (`tower`, `heavy`, `shield`, `module`)
- 5-level tier height system via `TIER_HEIGHTS`
- 5 `ConnectionType` values (`dataflow`, `http`, `internal`, `data`, `async`)
- `ProviderType` support on Block domain model
- Full test coverage expansion for visual/model/provider evolution changes

### Exit Criteria

- [x] UX state machine is formalized and used in builder interactions
- [x] Block silhouette and tier-height systems are implemented and in active use
- [x] Domain model supports multi-provider metadata and expanded connection semantics
- [x] Provider integration foundations are implemented for visual identity and typing
- [x] Validation, test, and build gates pass for all merged Phase 9 work

### Dependencies

- Phase 2 UX complete

---

## Phase 10 — Documentation Accuracy

Goal:
Bring all documentation into alignment with the Phase 9 codebase and current architecture behavior.

Status: ✅ Complete

Scope:

- 4 Epics (#112-#115)
- 19 sub-issues

### Dependencies

- Phase 9 complete

---

## Phase 11 — UX/UI Improvements ✅

Goal:
Address validated UX/UI research findings — fix interaction gaps, replace browser-native dialogs, improve performance, and harden connection logic.

Status: ✅ Complete

Scope:

- 8 implementation issues (#141-#148)
- 8 PRs merged (#149, #151-#156, #163-#164)
- 1124 tests passing across 72 files

Key Features:

- **API base URL contract** — centralized `API_BASE` constant replacing hardcoded URLs
- **ExternalActor interactivity** — selectable, connectable external actors with properties panel support
- **Toast notifications** — `react-hot-toast` replacing all `alert()`/`confirm()` dialogs with ConfirmDialog for destructive actions
- **CommandCard action implementation** — functional edit/delete/connect actions with proper UX state integration
- **Multi-select cleanup** — removed phantom `isMultiSelected` flags from domain types
- **Pointermove throttling** — `requestAnimationFrame`-based throttling via `useRafCallback` hook for 60fps canvas performance
- **Connection selection/deletion** — clickable connections with invisible 14px hit-area, selection state, keyboard delete support
- **Connection guard** — `addConnection()` validates against duplicates and self-connections, returns boolean for UI feedback

### Exit Criteria

- [x] API base URL centralized and all fetch calls use it
- [x] ExternalActor elements are selectable and connectable in the builder
- [x] All `alert()`/`confirm()` replaced with toast notifications and ConfirmDialog
- [x] CommandCard edit/delete/connect actions are functional
- [x] `isMultiSelected` phantom flags removed from Block and ContainerBlock types
- [x] Pointermove events throttled with rAF (60fps target)
- [x] Connections are selectable and deletable via click + keyboard
- [x] `addConnection()` rejects duplicates and self-connections with user feedback
- [x] All tests pass (1124 tests, 72 files), build clean
- [x] Coverage: 97%+ statements, 90%+ branches

### Dependencies

- Phase 10 complete

---

## Milestone 8 — Multi-Cloud Platform ✅

Goal:
Support multiple cloud providers from the same architecture.

Prerequisite/Overlap: Phase 5 (Core Model & Multi-Cloud Bridge)

Providers:

- Azure (existing)
- AWS
- GCP

Architecture remains the same — provider adapters handle the mapping.

> See [provider.md](../engine/provider.md) for the complete provider mapping table (block and container block mappings per cloud provider).

### Exit Criteria

- [x] AWS and GCP provider adapters functional
- [x] Same architecture deployable to any supported provider
- [x] Provider comparison view available

### Dependencies

- Milestone 6 complete (can run parallel with Milestone 7)

---

## Milestone 9 — UX Core Hardening ✅

Goal:
Harden the existing UX to production quality — surface features that already exist but lack discoverability.

Key Objectives:

- Expose ProviderToggle in MenuBar (currently dead code in Toolbar)
- EmptyCanvasOverlay CTA improvements (subnet creation, guided tour)
- Invalid-drop feedback for drag operations
- Connection valid-target highlighting
- Experience story: README hero image, UI_FLOW.md rewrite, docs IA improvement

### Exit Criteria

- [x] Provider toggle accessible from main UI (not buried in dead Toolbar)
- [x] Empty canvas overlay provides contextual next-step guidance
- [x] Invalid drop targets show visual rejection feedback
- [x] README includes hero image and product screenshots
- [x] UI_FLOW.md rewritten as product journey (not concept doc)

### Dependencies

- Milestone 8 complete

---

## Milestone 10 — External Actors & DevOps UX ✅

Goal:
Transform the DevOps minifigure from decoration into an interactive RTS-style worker unit.

Key Objectives:

- Minifigure becomes selectable (remove `aria-hidden`, add click handler)
- Minifigure selection activates CommandCard (RTS worker pattern)
- Build animation: minifigure moves to resource placement location
- Multiple worker support (multi-select, parallel build)
- Build progress indicator on resources under construction
- External actor (Internet, User) repositioning and interaction

### Exit Criteria

- [x] Clicking minifigure selects it and shows build commands in CommandCard
- [x] Resource placement triggers minifigure movement animation
- [x] Build progress is visually indicated on resources
- [x] External actors are user-movable on canvas

### Dependencies

- Milestone 9 complete (requires ProviderToggle exposure and CommandCard improvements)

---

## Milestone 11 — Block Design System ✅

Goal:
Consolidate the block visual system — align block categories with design tokens.

Key Objectives:

- Reconcile BlockCategory enum with block visual profiles
- Unified port standard enforcement (rx=12, ry=6, height=5)
- Provider-themed color palettes (Azure blue, AWS orange, GCP multi)
- Consistent sizing across all block types

### Exit Criteria

- [x] BlockCategory and block visual profiles fully aligned
- [x] All ports pass uniform dimension validation
- [x] Provider themes applied consistently across all block types

### Dependencies

- Milestone 8 complete (parallel with Milestone 9; no UX dependency)

---

## Milestone 12 — Core Model & Provider System ✅

Goal:
Extend the domain model to support true multi-cloud semantics.

Key Objectives:

- Add `subtype` and `config` fields to Block type
- Provider adapter refinement (AWS, GCP resource mappings)
- Schema migration strategy for existing workspaces
- Provider-aware validation rules

### Exit Criteria

- [x] Block type includes `subtype` and `config` fields
- [x] AWS and GCP adapters produce valid IaC output
- [x] Existing workspaces migrate cleanly to new schema
- [x] Provider-specific validation rules functional

### Dependencies

- Milestone 9 complete (ProviderToggle must be surfaced for testing)
- Milestone 11 complete (BlockCategory alignment required before schema changes)

---

## Milestone 13 — Terraform Pipeline ✅

Goal:
Productionize the code generation pipeline with real-world deployment support.

Key Objectives:

- Terraform plan/apply integration
- Generated code quality validation (terraform validate, tflint)
- Private-link template support
- CI/CD pipeline templates (GitHub Actions, GitLab CI)

### Exit Criteria

- [x] Generated Terraform passes `terraform validate` and `tflint`
- [x] CI/CD pipeline templates available for major platforms
- [x] Private-link architecture template functional

### Dependencies

- Milestone 12 complete (requires stable multi-cloud model)

---

## Milestone 14 — AI Roadmap ✅

Goal:
Introduce AI-assisted architecture design and optimization.

Key Objectives:

- Natural language to architecture (describe → generate blocks)
- Architecture optimization suggestions
- Cost estimation and comparison
- Security posture analysis

Scope:

- 1 Epic (#293), 15 sub-issues (all closed)
- Backend: LLM client abstraction, BYOK key management, architecture generation, post-generation validation, suggestion engine, cost estimation via Infracost
- Frontend: AI prompt bar, API client, Zustand store, suggestions panel, cost panel
- Documentation: ADR-0009, AI engine guide

### Exit Criteria

- [x] Natural language input produces valid architecture
- [x] AI suggestions improve architecture quality metrics
- [x] Cost estimation within 20% of actual cloud pricing

### Dependencies

- Milestone 12 complete (requires stable domain model)
- Milestone 13 recommended (AI-generated architectures benefit from validated pipeline)

> **Reference**: [ADR-0009](../adr/0009-ai-assisted-architecture.md), [AI Engine Guide](../engine/ai.md)

---

## Milestone 15 — v2.0 Specification Implementation ✅

Goal:
Implement the CloudBlocks v2.0 Universal Architecture Specification across all layers — foundation, visual system, model & rules, and integration.

> **Reference**: [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md), [ADR-0008](../adr/0008-v2-universal-architecture-specification.md)

Key Objectives:

- CU-based deterministic grid system with mandatory snap
- Pixel precision rendering (no sub-pixel, integer coordinates only)
- Universal Port Standard enforcement across all elements
- 2:1 dimetric isometric projection with depth sorting
- v2.0 visual token system (geometry, colors, materials)
- Updated validation contracts for v2.0 rules
- Integration layer updates (generator pipeline, storage schema)

Scope:

- 4 Epics: Foundation, Visual System, Model & Rules, Integration
- 22 issues total (all closed)

### Exit Criteria

- [x] CU grid system implemented with mandatory snap
- [x] Pixel precision rules enforced (integer coordinates, +0.5 stroke alignment)
- [x] Universal Port Standard validated across all elements (rx=12, ry=6, height=5)
- [x] 2:1 dimetric projection with depth sorting implemented
- [x] v2.0 visual tokens extracted and applied
- [x] Validation contracts updated for v2.0 rules
- [x] Generator pipeline and storage schema aligned with v2.0
- [x] All 22 issues closed, build and tests pass

### Dependencies

- Milestone 13 complete

---

## Milestone 16 — Documentation Architecture & Canonical Cleanup ✅

Goal:
Restore documentation coherence across the project. Establish clear canonical ownership, resolve runtime-vs-target architecture confusion, and verify code/document consistency after M15.

> **Reference**: [M16_DOCUMENTATION_ARCHITECTURE.md](M16_DOCUMENTATION_ARCHITECTURE.md)

Key Objectives:

- Resolve canonical vs superseded document ownership conflicts
- Standardize Milestone vs Phase terminology across all active docs
- Define and apply document lifecycle policy (update/demote/archive)
- Reconcile all major canonical documents with post-M15 codebase
- Archive superseded v1.x specs with clear historical labels
- Verify code-document consistency across types, validation, API, and design tokens

Scope:

- 3 Epics: Documentation Architecture Cleanup (Epic #356, #370), Block-Themed Documentation Site (Epic #398)
- 30 issues total (all closed)
- 10 PRs merged (#376, #377, #387, #402, #406, #409, #410, #412, #413, #415)
- 3 Waves: Foundation (conventions) → Reconciliation (content) → Alignment & Archive
- Block-Themed Docs: custom CSS theme, user-centric nav, dark mode block-based theme, homepage rewrite

### Exit Criteria

- [x] All 12 Epic #356 sub-issues closed
- [x] All open documentation PRs resolved
- [x] Zero documents with incorrect canonical/superseded status
- [x] docs/README.md accurately reflects current project state with valid links
- [x] Code-document consistency audit passes with no critical gaps
- [x] Milestone vs Phase terminology standardized across all active docs
- [x] Document lifecycle policy documented and applied

### Dependencies

- Milestone 15 complete

---

## Milestone 17 — Product Structure ✅

Goal:
Restructure the monorepo from a scaffolded prototype into a modular, separation-ready architecture. Resolve rendering model ambiguity, extract shared packages, redefine backend responsibilities, and establish version policy.

> **Reference**: [M17_PRODUCT_STRUCTURE.md](M17_PRODUCT_STRUCTURE.md)

Key Objectives:

- Rendering model decision (SVG-only vs hybrid) documented in ADR; unused Three.js dependencies resolved
- Package extraction: `@cloudblocks/schema` and `@cloudblocks/domain` with actual consumers
- Backend role redefinition: accurate documentation of actual responsibilities beyond "thin orchestration"
- Monorepo infrastructure cleanup: workspace config, root-level build/test/lint, CI alignment
- Version alignment policy: all packages track root version

Scope:

- 4 Epics: Rendering Model Resolution, Package Extraction & Boundaries, Backend Role & API Contract, Monorepo Infrastructure
- 5 Areas (A-E) covering rendering, packages, backend, monorepo, and versioning

### Exit Criteria

- [x] Rendering model documented in ADR; unused dependencies removed or justified
- [x] `packages/` contains real extracted code with actual consumers
- [x] `@cloudblocks/schema` is the single source of truth for the ArchitectureModel contract
- [x] Backend role accurately documented; API surface defined as explicit contract
- [x] All package versions aligned with documented versioning policy
- [x] `pnpm build`, `pnpm lint`, and tests pass from root for all apps and packages
- [x] No placeholder/empty packages remain in `packages/`

### Dependencies

- Milestone 16 complete

---

## Milestone 18 — DevOps UX ✅

Goal:
Add operational control capabilities to CloudBlocks. Introduce an Ops Control Center, standardize deployment terminology, build environment promotion/rollback UX, add a notification system, and replace SVG connection lines with connection-renderer-style connector pieces.

> **Reference**: [M18_DEVOPS_UX.md](M18_DEVOPS_UX.md)

Key Objectives:

- Ops Control Center dashboard: deployment status, pipeline integration, environment health, cost estimation
- Deploy terminology standardization: canonical definitions for deploy/promote/rollback/release
- Promote/rollback UX: visual flows with pre-checks, version selection, diff preview
- Notification system: in-app notification center, toast alerts, deployment event history
- Connection renderer style: replace thin SVG bezier lines with Technic connector pieces matching the block-based visual language

Scope:

- 5 Epics: Ops Control Center (Area A), Deploy Terminology (Area B), Promote/Rollback UX (Area C), Notification System (Area D), Connection Renderer Style (Area E)
- Estimated effort: 8–10 weeks

### Exit Criteria

- [ ] Ops Control Center shows real-time deployment status for `local`, `staging`, and `production` — **deferred to M20+**
- [ ] Deploy/promote/rollback terminology consistent across all docs, workflows, and UI — **partially done (docs only)**
- [ ] Promote flow works end-to-end: staging to production with pre-promotion checklist — **deferred to M20+**
- [ ] Rollback to a previous version works from Ops Control Center — **deferred to M20+**
- [ ] Cost estimation displayed before deployment confirmation — **deferred to M20+**
- [ ] Notification system shows deployment lifecycle events in-app — **deferred to M20+ (infinite loop bug)**
- [ ] Deployment history log records all deploys, promotions, and rollbacks — **deferred to M20+**
- [x] Connections render as connection-renderer-style connector pieces matching the block-based visual language

### Delivered (not in original exit criteria)

- [x] Screen-space orthogonal connector routing with height normalization
- [x] Connection renderer specification §12 with full geometry and algorithm documentation
- [x] Provider-specific block palette, icon mappings, and learning mode content
- [x] Container block overlap prevention
- [x] 24+ GitHub integration bug fixes
- [x] UI simplification: OpsCenter, AI, NotificationCenter hidden; Portrait panel removed
- [x] Minifigure worker concept evaluated and removed (paradigm mismatch)
- [x] CI cost optimization

### Retrospective

Scope inflation with agentic coding led to most exit criteria being deferred. The milestone's primary value was the connection-renderer-style connector system and clarifying product direction (design tool, not RTS). See CHANGELOG v0.18.0 for details.

### Dependencies

- Milestone 17 complete

---

## Milestone 19 — MVP Polish & Launch ✅

Goal:
Unify the resource model, clean up legacy subsystems, and harden CI for release readiness. Deliver a stable, well-tested codebase ready for community launch preparation.

> **Note**: Scope was reduced from the original 8-Epic plan to focus on model unification, cleanup, and hardening. Deferred items moved to M20+.

Key Objectives:

- Unify ContainerBlock/ResourceBlock → single Block union with `kind: "container" | "resource"`
- Realign 10 resource categories → 7 (Network, Security, Edge, Compute, Data, Messaging, Operations)
- Remove minifigure worker system entirely
- Fix provider label bugs and workspace state leaks
- Add demo resilience mode for backend-unavailable state
- Harden CI with build-output secret scanning

### Exit Criteria

- [x] Block union unification complete — single type replaces ContainerBlock + ResourceBlock (#1099)
- [x] 7-category resource model implemented and validated (#1102)
- [x] Minifigure worker system fully removed (#1088)
- [x] Provider-neutral labels in CreationGrid (#1096)
- [x] Demo resilience mode operational (#478)
- [x] CI secret scanning integrated into all deployment pipelines (#479)
- [x] `v0.19.0` release published with CHANGELOG and version alignment
- [x] 1811 tests passing, 90.27% branch coverage

### Dependencies

- Milestone 18 complete

---

## Milestone 20 — UX Polish & GitHub Hardening ✅

Goal:
Redesign panel roles, fix all GitHub integration bugs, introduce multi-persona UX, and build launch infrastructure. Deliver a polished, hardened product ready for community launch.

> **Scope note**: Deferred items from M19 (panel redesign, multi-persona, GitHub bugs, infrastructure epics) are consolidated here with corrected dependencies and phase ordering.

Key Objectives:

- Fix CodePreview render-time state update root cause (#886) as prerequisite for GitHub hardening
- Redesign panel roles: Inspector → Resource Guide (read-only encyclopedia), Command Panel → unified property editor
- Fix 17 GitHub integration bugs across GitHubLogin, GitHubRepos, GitHubPR, GitHubSync, and CodePreview
- Introduce multi-persona UX with complexity levels (beginner/standard/advanced)
- Build deployment pipeline, runtime configuration, observability, performance gates, and release ops
- Add integration test coverage for GitHub panel flows and document panel role rules

Scope:

- 8 Epics: Panel Redesign (#1112), Multi-Persona (#1076), Launch UX Polish (#456), Deployment Pipeline (#457), Runtime Configuration (#458), Observability (#459), Performance & Stability Gate (#460), Release Ops (#461)
- 77 issues total across 9 phases (0–8), including Demo Hardening, Content Modernization, Test Coverage, and Network Resource Gaps

### Execution Phases

#### Phase 0 — Prerequisite (1 issue)

| #    | Title                                                                    | Size | Rationale                                                          |
| ---- | ------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------ |
| #886 | Move CodePreview provider-change resets out of render-time state updates | M    | Root cause for #872, #873, #876 — must fix before GitHub hardening |

#### Phase 1 — Panel Redesign (Epic #1112, 7 issues)

Redefine panel responsibilities: Resource Guide = "what IS this?", Command Panel = "what can I DO with this?"

| Step | Issues (parallel within step)                                                                                                       | Dependencies                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1a   | #1118 (Command Panel: read-only properties), #1115 (Command Panel: connection editing), #1113 (Resource Guide: workspace dashboard) | None — parallel             |
| 1b   | #1114 (Resource Guide: enriched view), #1117 (Rename Inspector → Resource Guide)                                                    | #1118 must complete first   |
| 1c   | #1116 (Onboarding tour update)                                                                                                      | All Phase 1 issues complete |

#### Phase 2 — GitHub Hardening (17 issues + 1 test issue)

Fix all GitHub integration bugs. Subgroups can run in parallel but maintain order within each group.

| Subgroup | Issues                                 | Focus                                                            |
| -------- | -------------------------------------- | ---------------------------------------------------------------- |
| Auth     | #836 (M), #838 (S), #867 (M)           | OAuth redirect, sign-out, auth failure routing                   |
| Repos    | #840 (S), #841 (M), #883 (S)           | Create/link flow, default visibility                             |
| PR       | #842 (S), #843 (M), #857 (S), #876 (M) | Submission guards, branch collision, unsaved edits, body prefill |
| Sync     | #854 (M), #858 (M), #864 (M)           | Dirty indicator, safe panel closure, post-pull diff              |
| Compare  | #846 (M), #847 (M), #872 (M), #873 (M) | Read-only mode, lifecycle warnings, region/compare preservation  |
| Test     | #1131 (M)                              | Integration test coverage — after all bug fixes                  |

**Note**: #843 has a `backend` label but should be implemented as frontend-only preflight via GitHub API. Self-hosted backend support (if needed) is a separate follow-up.

**Compare subgroup ordering**: #886 (Phase 0) → #872/#873 (state preservation) → #846/#847 (mode isolation) → #876 (PR prefill from compare).

#### Phase 3 — Multi-Persona (Epic #1076, 9 issues + 1 doc issue)

| Step                 | Issues                                                                                         | Dependencies                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 3a — IaC Abstraction | #1077, #1078, #1079, #1080                                                                     | Can start parallel with Phase 2                                          |
| 3b — Persona System  | #1082 (onboarding), #1083 (complexity levels), #1084 (panel visibility), #1085 (student entry) | #1112 complete (Phase 1) — persona visibility depends on new panel roles |
| 3c — Documentation   | #1132 (panel role doc)                                                                         | #1083 and #1084 complete                                                 |

**Cross-phase dependency**: #1083 and #1084 must wait for Phase 1 (#1112) to complete because persona-based panel visibility depends on the redesigned panel structure.

**Onboarding ownership**: #1082 (persona selection in first-run) owns the combined onboarding flow. #1116 (Phase 1c) updates tour copy only — no flow logic changes.

#### Phase 4 — Infrastructure & Launch Prep (6 Epics, 22 issues)

| Epic                       | Issues                                                                         | Focus                   |
| -------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| #456 Launch UX Polish      | #462 (onboarding overlay), #463 (demo loader), #464 (landing copy)             | First-time UX           |
| #457 Deployment Pipeline   | #465 (preview deploy), #466 (tag-gated prod deploy), #467 (rollback runbook)   | CI/CD hardening         |
| #458 Runtime Configuration | #468 (.env schema), #469 (OAuth callback validation)                           | Environment consistency |
| #459 Observability         | #470 (error tracking), #471 (launch metrics)                                   | Production visibility   |
| #460 Performance Gate      | #472 (bundle-size budget), #473 (Lighthouse/Web Vitals), #474 (browser compat) | Quality gates           |
| #461 Release Ops           | #475 (changelog template), #476 (release runbook), #477 (launch assets)        | Release process         |

**Note**: These epics were originally scoped for M19 launch. Titles have been updated to be version-agnostic. Acceptance criteria should be reviewed against current v0.19.2 state — some may be partially satisfied.

#### Phase 5 — Demo Hardening (4 issues)

| #     | Title                                                            | Size |
| ----- | ---------------------------------------------------------------- | ---- |
| #1137 | Consolidate block selection controls into unified property panel | M    |
| #1138 | AI features: graceful fallback when backend unavailable          | S    |
| #1139 | Ops features: disable or mock when backend unavailable           | S    |
| #411  | Fix remaining demo blockers (if any)                             | S    |

#### Phase 6 — Content Modernization (5 issues)

| #     | Title                                                | Size |
| ----- | ---------------------------------------------------- | ---- |
| #1140 | Migrate templates to canonical 7-category vocabulary | M    |
| #1141 | Migrate learning scenarios to canonical vocabulary   | M    |
| #1142 | Remove LEGACY_CATEGORY_MAP runtime conversion        | S    |
| #1143 | Codegen: honest Azure-only output                    | M    |
| #1144 | Update example architectures to canonical model      | S    |

**Sequencing**: #1140 and #1141 before #1142 (legacy map removal depends on migration). #1143 and #1144 can run in parallel.

#### Phase 7 — Validation & Test Coverage (7 issues)

| #     | Title                                                   | Size |
| ----- | ------------------------------------------------------- | ---- |
| #1145 | Fix placement multi-parent bug (allowedParents[0] only) | M    |
| #1146 | Add domainSlice.ts unit tests                           | L    |
| #1147 | Add workspaceSlice.ts unit tests                        | M    |
| #1148 | Add provider adapter tests (Azure/AWS/GCP)              | M    |
| #1149 | Add AI API client tests                                 | M    |
| #1150 | Review vitest coverage exclusions post-M19              | S    |
| #1151 | Audit eslint-disable comments                           | S    |

#### Phase 8 — Network Resource Gaps (3 issues)

| #     | Title                                                 | Size |
| ----- | ----------------------------------------------------- | ---- |
| #1152 | Separate NSG from Firewall in RESOURCE_RULES          | M    |
| #1153 | Wire NAT Gateway UI to existing outbound_access entry | M    |
| #1154 | Implicit PIP/NIC generation in codegen                | M    |

### Exit Criteria

- [x] CodePreview render-time state update fix verified (#886)
- [x] Panel roles redesigned — Resource Guide (read-only), Command Panel (action + properties) (#1112)
- [x] Inspector renamed to Resource Guide across all UI, code, and tests (#1117)
- [x] All 17 GitHub integration bugs fixed and verified (#836–#883)
- [x] GitHub panel integration tests passing (#1131)
- [x] Multi-persona UX functional with beginner/standard/advanced levels (#1076)
- [x] Panel role and visibility rules documented (#1132)
- [x] Block selection UI consolidated into unified property panel (#1137)
- [x] First-run onboarding overlay functional (#462)
- [x] Deployment pipeline hardened with preview/production separation (#457)
- [x] Runtime configuration standardized with .env.example (#458)
- [x] Frontend error tracking integrated (#470)
- [x] Bundle-size budget gate in CI (#472)
- [x] Release runbook and changelog template standardized (#461)
- [x] AI/Ops features gracefully degraded without backend (#1138, #1139)
- [x] Templates and scenarios migrated to canonical 7-category vocabulary (#1140, #1141)
- [x] LEGACY_CATEGORY_MAP removed (#1142)
- [x] Codegen outputs honest Azure-only code (#1143)
- [x] Placement multi-parent bug fixed (#1145)
- [x] domainSlice.ts and workspaceSlice.ts tests added (#1146, #1147)
- [x] NSG separated from Firewall, NAT Gateway wired (#1152, #1153)
- [x] `v0.20.0` release published with demo verification gate
- [x] All tests passing, ≥ 90% branch coverage
- [x] Azure resource catalog parity — 19 new resource types (#1195)
- [x] Block union unification — ContainerBlock/ResourceBlock separation eliminated (#1194)

### Dependencies

- Milestone 19 complete

---

## Milestone 21 — UI/UX Overhaul & Port Connections ✅

Goal:
Realign CloudBlocks with the Product Direction Spec — complete UI redesign with Professional theme (default), port-addressable connection model, CSS Grid builder layout, and new panel system. Port rendering and port-to-port routing deferred to M22.

> **Reference**: [PRODUCT_DIRECTION_SPEC.md](PRODUCT_DIRECTION_SPEC.md)

Key Objectives:

- Replace 4 silhouettes (tower/heavy/shield/module) with 6 semantic shapes (rect/cylinder/gateway/circle/hex/shield)
- Add port metadata to Connection model (`from`/`to` endpoint IDs with `blockId` + `portIndex`) with category-based port policy
- Filter resource palette to MVP core set
- Implement dark-themed first screen with 3 primary actions (Create / Explore Templates / Import)
- Port rendering on blocks (visual port points)
- Port-to-port connection routing (replace center-based connections)

### Implementation Phases

#### Phase 1 — Port Definition (Schema)

Add port metadata to the connection model and define port policy per resource category.

| #     | Issue                                                             | Status  |
| ----- | ----------------------------------------------------------------- | ------- |
| #1200 | Add endpoint-based `from`/`to` connection model with port indices | ✅ Done |
| #1201 | Add port policy per resource category (`CATEGORY_PORTS`)          | ✅ Done |
| #1202 | Update `addConnection` to allocate port indices                   | ✅ Done |

#### Phase 2 — Semantic Block Shapes

Replace legacy silhouettes with category-based semantic shapes.

| #     | Issue                                                     | Status  |
| ----- | --------------------------------------------------------- | ------- |
| #1204 | Replace silhouettes with semantic block shapes (6 shapes) | ✅ Done |

#### Phase 3 — MVP Resource Filtering

Filter creation palette to core resources only.

| #     | Issue                              | Status  |
| ----- | ---------------------------------- | ------- |
| #1205 | Filter resource palette to MVP set | ✅ Done |

#### Phase 4 — First Screen

Dark-themed landing page with 3 primary actions.

| #     | Issue                            | Status  |
| ----- | -------------------------------- | ------- |
| #1206 | Dark-themed first screen overlay | ✅ Done |

#### Phase 5 — Port Rendering

Render port points visually on block SVG.

| #     | Issue                               | Status            |
| ----- | ----------------------------------- | ----------------- |
| #1223 | Render port anchor points on blocks | → Deferred to M22 |

#### Phase 6 — Connection Preview & Routing

Port-to-port connection UX: preview line, routing, valid target highlighting.

| #     | Issue                           | Status            |
| ----- | ------------------------------- | ----------------- |
| #1225 | Connection preview from port    | → Deferred to M22 |
| #1227 | Port-to-port orthogonal routing | → Deferred to M22 |

#### Phase 7 — Legacy Removal & Color

Remove center-based connections, apply vendor color system to connections.

| #     | Issue                                     | Status            |
| ----- | ----------------------------------------- | ----------------- |
| #1228 | Remove center-to-center connection system | → Deferred to M22 |
| #1229 | Vendor-based connection color system      | → Deferred to M22 |

### Exit Criteria

- [x] Connection model uses endpoint-based `from`/`to` with port indices (#1200)
- [x] `CATEGORY_PORTS` policy exported from schema (#1201)
- [x] `addConnection()` auto-allocates port indices (#1202)
- [x] 6 semantic block shapes replace 4 legacy silhouettes (#1203)
- [x] Resource palette filtered to MVP core set (#1204)
- [x] Dark-themed first screen with Create/Templates/Import (#1205)
- [x] Professional theme system with CSS custom properties
- [x] Landing page and CSS Grid builder layout
- [x] Sidebar palette with drag-and-drop resource creation
- [x] Inspector panel with Properties/Code/Connections tabs
- [x] Tabbed bottom dock (Output/Validation/Logs/Diff)
- [x] View menu restructuring with keyboard shortcuts
- [x] Animation system (panel transitions + connector draw-in)
- [x] Azure subnet unification (flat model)
- [x] All tests passing (1992 tests), build clean

### Dependencies

- Milestone 20 complete

---

## Milestone 22 — Port Connections & Visual Theme

Goal:
Complete the port-based connection system, apply vendor-specific visual identity, clean up legacy resource model duplication, and introduce a token-based visual theme system. Deliver a verified Azure end-to-end demo.

> **Reference**: [PRODUCT_DIRECTION_SPEC.md](PRODUCT_DIRECTION_SPEC.md)

Key Objectives:

- Render port anchor points visually on block SVG faces (inbound=left, outbound=right)
- Implement connection preview from ports with valid/invalid target highlighting
- Complete port-to-port routing and remove center-to-center fallback
- Apply vendor-based color system to blocks and connections (Azure=#0078D4, AWS=#FF9900, GCP=#4285F4)
- Remove `MVP_RESOURCE_ALLOWLIST` duplication — consolidate into `RESOURCE_DEFINITIONS`
- Extend token-based theme system: Professional (default) + Blueprint (alt) via CSS custom properties
- Verify Azure end-to-end demo scenario

### Existing Infrastructure (from M21)

The following port infrastructure already exists and will be built upon:

- `blockGeometry.ts` — `getBlockSvgPortPoints()` computes SVG-local port positions
- `endpointAnchors.ts` — `getConnectionEndpointWorldAnchors()` resolves port-aware world-space endpoints
- `ConnectionRenderer.tsx` — already consumes port anchors via `getConnectionEndpointWorldAnchors()`
- `themeTokens.ts` — `ThemeVariant` type with `blueprint` (dark) and `workshop` (light) token sets
- `CATEGORY_PORTS` — port policy per resource category (from `@cloudblocks/schema`)

### Implementation Phases

#### Phase 1 — Port Rendering + Resource Cleanup (parallel)

| Area                      | Description                                                                                                      | Dependencies |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| A. Port Visual Rendering  | Render port dots on block SVG faces using `getBlockSvgPortPoints()`. Hover indicator, connection-occupied state. | None         |
| D. Resource Model Cleanup | Remove `MVP_RESOURCE_ALLOWLIST` duplication (#1208). `RESOURCE_DEFINITIONS` as single source of truth.           | None         |

#### Phase 2 — Connection UX from Ports

| Area                    | Description                                                                                                                           | Dependencies |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| B. Connection Preview   | Live preview line from port to cursor. Valid targets highlight (green glow), invalid targets dim. Click a port to start connect mode. | Phase 1A     |
| B. Port-to-Port Routing | Orthogonal routing from source port to target port. Remove center fallback in `endpointAnchors.ts`.                                   | Phase 1A     |

#### Phase 3 — Legacy Removal + Vendor Colors

| Area                         | Description                                                                                                                          | Dependencies |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| C. Center Connection Removal | Remove `getEndpointWorldPosition()` center-based fallback. Clean up `position.ts` legacy endpoint code.                              | Phase 2      |
| C. Vendor Color System       | Block face colors and connection line colors derived from vendor (`ProviderType`). Extend `connectorTheme.ts` with vendor dimension. | Phase 2      |

#### Phase 4 — Visual Theme + Demo Verification

| Area                       | Description                                                                                                                                                                                    | Dependencies                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| E. Visual Theme System     | Extend `ThemeVariant` with `professional` (rename from `blueprint`) and `block-based` themes. Token-level differences: border-radius, shadow depth, surface materials. Theme switcher in menu. | Independent (can parallel with Phase 2-3) |
| F. Azure Demo Verification | End-to-end: create workspace → VNet → subnets → blocks (VM, DB, Storage, Gateway) → port connections → generate Terraform/Bicep/Pulumi → validate output.                                      | All phases complete                       |

### Exit Criteria

- [ ] Port points rendered visually on block faces with hover indicators
- [ ] Connection preview line from port to cursor during connect mode
- [ ] Valid/invalid target highlighting during connection
- [ ] Port-to-port orthogonal routing fully replaces center-based routing
- [ ] Center-to-center connection fallback removed
- [ ] Vendor-based colors applied to blocks and connections
- [ ] `MVP_RESOURCE_ALLOWLIST` eliminated — `RESOURCE_DEFINITIONS` is single source (#1208)
- [ ] Token-based theme system with Professional (default) + Blueprint (alt) themes
- [ ] Theme switch accessible from settings/menu
- [ ] Azure end-to-end demo verified (create → connect via ports → generate → validate)
- [ ] All tests passing, ≥ 90% branch coverage
- [ ] `v0.22.0` release published

### Dependencies

- Milestone 21 complete

---

## Milestone 24 — Block Unification

Goal:
Remove all legacy toy-branded and pre-unification terminology from product documentation and user-facing language, and standardize on Block/Connection/Port vocabulary.

Key Objectives:

- Replace legacy pre-unification terms with unified terminology (`block`, `connection`, `port`, `CloudBlocks`) in active documentation.
- Align model terminology to current domain types: `ContainerBlock`, `ResourceBlock`, and `Block = ContainerBlock | ResourceBlock`.
- Align connection terminology to endpoint model: `from` / `to` endpoint IDs and `blockId` endpoint references.
- Ensure container sizing vocabulary uses `frame` (not `size`) where container block geometry is described.

### Exit Criteria

- [ ] No banned legacy terms remain in active documentation sets targeted by M24.
- [ ] Root and concept documentation use unified Block terminology consistently.
- [ ] Endpoint and connection field references are updated to current model names.
- [ ] Documentation remains coherent and link-safe after terminology updates.

### Dependencies

- Milestone 22 complete

---

## i18n — Internationalization

Goal:
Add multi-language support to CloudBlocks using react-i18next, enabling localization of all user-facing strings.

Key Objectives:

- Install and configure react-i18next with namespace-based translation organization
- Extract all hardcoded English UI strings to translation JSON files
- Create English (en) base translation as the default locale
- Add Korean (ko) translation as the first additional locale
- Implement language switcher UI component

Scope:

- 1 Epic (#392) with 5 sub-issues (#393-#397)
- Covers: setup, string extraction, base locale, Korean locale, language switcher

### Exit Criteria

- [ ] react-i18next configured with namespace-based organization
- [ ] All user-facing strings extracted to translation files
- [ ] English (en) base translation complete and functional
- [ ] Korean (ko) translation complete for all namespaces
- [ ] Language switcher accessible from UI settings
- [ ] Build passes with i18n integration

### Dependencies

- No hard dependency on other milestones (can run in parallel with M17 or M18)

---

## Long Term Vision

CloudBlocks evolves into:

- 2.5D Isometric Cloud Architecture Builder
- Architecture → Code Generation Platform
- Git-native DevOps workflow tool
- Multi-cloud infrastructure designer
- Architecture simulation and failure modeling
- Cloud Digital Twin (live infrastructure state sync)
- Community-driven template and plugin ecosystem
- Cloud operations dashboard

---

## Development Strategy

Key principles:

1. Start with **2.5D isometric builder core** (Milestone 1)
2. Add **code generation** early (Milestone 3) — the core value
3. Integrate **GitHub** as data store (Milestone 5) — not a traditional DB
4. Keep backend **thin** — orchestration, not CRUD
5. **Open-source first** — community drives templates and generators
6. **Local-first UX** — works offline, syncs when connected
7. **Milestone-aligned UI/Engine Evolution** — systematic transition from Azure-first to multi-provider visual logic
8. **Milestone-aligned Documentation Updates** — keep canonical docs synchronized with delivered milestone work while preserving historical phase references

---

## Success Metrics

Milestone 1 (Complete)

- Architecture built successfully
- Validation engine working
- Workspace persistence functional

Milestone 3 (Complete)

- Terraform generation produces valid HCL
- Code preview panel functional

Milestone 5 (Complete)

- GitHub integration operational
- Backend API deployed
- Zero architecture data in backend DB

Milestone 6 (Complete)

- Multi-generator support (Terraform + Bicep + Pulumi)
- Template marketplace launched

Milestone 8-13 (Complete)

- Multi-cloud architecture support (AWS, GCP, Azure)
- UX hardened to production quality
- External actors interactive with RTS-style worker pattern
- Block design system consolidated with port validation
- Core domain model extended with subtypes and provider semantics
- Terraform pipeline productionized with CI/CD templates

Milestone 15-16 (Complete)

- v2.0 specification fully implemented
- Documentation architecture restored to coherence

Milestone 14 (Complete)

- AI-assisted architecture design
- Natural language → architecture generation
- Architecture suggestions and cost estimation
- BYOK API key management with Fernet encryption

Milestone 20 (Complete)

- UX polish with block selection UI consolidation and multi-persona support
- GitHub integration hardening (17 bug fixes)
- Launch infrastructure: deployment pipeline, observability, performance gates
- Demo hardening with graceful AI/Ops fallback
- Content modernization: canonical 7-category vocabulary across templates, scenarios, examples
- Test coverage expansion: domainSlice, workspaceSlice, provider adapters
- Network resource gaps: NSG/Firewall split, NAT Gateway, implicit PIP/NIC codegen
- Azure resource catalog parity: 19 new resource types added
- Block union unification: eliminated ContainerBlock/ResourceBlock type separation
- Community-ready launch with demo verification gate
  Milestone 17 (Complete)
- Modular monorepo structure with extracted packages
- SVG-only rendering model confirmed (ADR-0010)
- @cloudblocks/schema and @cloudblocks/domain extracted with real consumers
- 30 bug fixes across domain model, workspace persistence, dialogs, and code generation
- Version alignment policy enforced

Milestone 18 (Complete)

- Connection-renderer-style Technic Beam connectors with screen-space orthogonal routing
- Provider-specific block palette and learning mode fixes
- Product direction clarified: design tool identity (minifigure worker removed)
- UI simplified: OpsCenter, AI, NotificationCenter deferred to M20+
- 47 commits, 23 PRs, 1854 tests passing

Milestone 19 (Complete)

- Unified ContainerBlock/ResourceBlock → Block with 7 categories (121+ files migrated)
- Minifigure worker system fully removed
- Demo resilience mode for backend-unavailable state
- CI secret scanning in all deployment pipelines
- v0.19.2 hotfix: React #185 app load crash fix in ExternalActorSprite
- 30 issues closed, 1814 tests passing, 90%+ branch coverage

---

## Summary

The roadmap evolves CloudBlocks from:

2.5D Isometric Cloud Builder (Milestone 1)

→ Code Generation Platform (Milestone 3)

→ GitHub-Integrated DevOps Tool (Milestone 5)

→ Multi-Generator Ecosystem (Milestone 6)

→ Builder UX Completion (Milestone 6B)

→ Learning Platform (Milestone 6C)

→ Collaboration Platform (Milestone 7)

→ Multi-Cloud Architecture Tool (Milestone 8) ✅

→ UX Core Hardening (Milestone 9) ✅ ‖ Block Design System (Milestone 11) ✅

→ DevOps Worker UX (Milestone 10) ✅

→ Core Model & Provider System (Milestone 12) ✅

→ Terraform Pipeline (Milestone 13) ✅

→ v2.0 Specification Implementation (Milestone 15) ✅

→ Documentation Architecture (Milestone 16) ✅

→ AI-Assisted Architecture (Milestone 14) ✅

→ Product Structure (Milestone 17) ✅

→ DevOps UX (Milestone 18) ✅

→ MVP Polish & Launch (Milestone 19) ✅

→ UX Polish & GitHub Hardening (Milestone 20) ✅

→ UI/UX Overhaul & Port Connections (Milestone 21) ✅

→ Port Connections & Visual Theme (Milestone 22) — planned

→ Block Unification (Milestone 24) — current

→ Internationalization (i18n)

### Dependency Graph

```
Milestone 8 (Complete) ✅
    ├── Milestone 9 (UX Core Hardening) ✅
    │       └── Milestone 10 (DevOps Worker UX) ✅
    │       └── Milestone 12 (Core Model) ✅ ←── also requires Milestone 11 ✅
    │               └── Milestone 13 (Terraform Pipeline) ✅
    │                       └── Milestone 15 (v2.0 Spec) ✅
    │                               └── Milestone 16 (Doc Architecture) ✅
    │                                       └── Milestone 17 (Product Structure) ✅
    │                                               └── Milestone 18 (DevOps UX) ✅
    │                                                       └── Milestone 19 (MVP Polish & Launch) ✅
    │                                                               └── Milestone 20 (UX Polish & GitHub Hardening) ✅
    │                                                                       └── Milestone 21 (UI/UX Overhaul & Port Connections) ✅
    │                                                                               └── Milestone 22 (Port Connections & Visual Theme)
    │                                                                                       └── Milestone 24 (Block Unification) ← current
    │               └── Milestone 14 (AI Roadmap) ✅ ←── also benefits from Milestone 13
    └── Milestone 11 (Block Design) ✅ ──── parallel with Milestone 9

i18n (Internationalization) ──── independent, can run in parallel
```

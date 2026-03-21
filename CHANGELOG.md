# Changelog

All notable changes to CloudBlocks are documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Version numbers follow the convention `v0.{milestone}.{patch}` — each milestone maps directly to a minor version.

---


## [v0.19.0] — 2026-03-22

**Milestone 19 — Resource Category Realignment + Cleanup**

Unified Plate/Block into a single ResourceNode model with 7 categories, removed the minifigure worker system, fixed provider label bugs, added demo resilience mode, and hardened CI with build-output secret scanning.

### Resource Model Unification (Epic #1099)
- Unified `Plate` + `Block` into single `ResourceNode` type with `kind: "container" | "resource"` (#1100)
- Realigned 10 resource categories → 7: Network, Security, Edge, Compute, Data, Messaging, Operations (#1102)
- Migrated architectureStore from `plates[] + blocks[]` to unified `nodes[]` array (#1101)
- Updated all UI components, templates, scenarios, generators, and validation engine (#1103–#1105)
- Updated 121+ source/test files across `apps/web`, `packages/schema`, `packages/cloudblocks-domain`
- Regenerated Python Pydantic models from TypeScript schema (#1108)
- Updated DOMAIN_MODEL.md and RESOURCE_CATEGORY_STRATEGY.md (#1109)

### Minifigure Removal (Epic #1088)
- Deleted minifigure character module and workerStore (#1090)
- Stripped all worker references from source files (#1091)
- Added CreationGrid as default CommandCard mode (#1092)
- Hidden connection rendering from canvas and CommandCard (#1093)
- Updated tests and documentation (#1094, #1095)

### Bug Fixes
- Fixed provider-prefixed resource names in CreationGrid ("Azure SQL" → "SQL Database") (#1096)
- Fixed diff mode state not clearing on workspace switch (#706)
- Unified panel naming conventions and expanded onboarding tour to 7 steps (#1110)

### Demo Resilience Mode (#478)
- Frontend gracefully handles backend-unavailable state without error storms
- `isApiConfigured()` check + network error normalization in API client
- "Demo Mode" indicator in menu bar when backend is unreachable
- Backend status tracking in uiStore (`unknown → not_configured | available | unavailable`)

### Security & CI (#479)
- Added `scripts/check-build-secrets.sh` — scans build output for leaked credentials
- Integrated secret scanning into `ci.yml`, `pages.yml`, and `deploy.yml`
- VITE_* env var audit ensures only `VITE_API_URL` reaches the frontend bundle

### Retrospective
M19 was scoped as a 1-day milestone — resource model unification, minifigure removal, provider label fixes, demo resilience, and CI hardening. All 28 issues closed. The ResourceNode unification touched 121+ files but preserved all existing test coverage (1811 tests passing, 90.27% branch coverage).

## [v0.18.0] — 2026-03-22

**Milestone 18 — DevOps UX**

Introduced Lego Technic Beam connectors, fixed provider-specific UX issues, and clarified product direction by removing features that didn't fit the "architecture compiler" identity. Several originally planned features (OpsCenter, Notification System, AI panel) were deferred after evaluation showed they added complexity without immediate user value.

### Brick-Style Connectors (Area E)
- Redesigned connection lines as Lego Technic liftarm beams with pin holes, side faces, and typed color differentiation
- Screen-space orthogonal routing: all beams are strictly horizontal or vertical on screen with clean right-angle elbows
- Height normalization: L-routes connect at the topmost endpoint height
- BRICK_CONNECTOR_SPEC.md §12 written with full geometry, routing algorithm, and design token documentation
- 5 connection types differentiated by beam color (dataflow, http, internal, data, async)

### Provider & Block Fixes
- Provider-specific resource names in block palette when switching Azure/AWS/GCP (#1023)
- Correct icon mappings with subtype-aware resolution (#1025)
- Hide provider badge on blocks in single-provider mode (#1026)
- Learning mode adapts scenario content to active cloud provider (#1067)
- Plate overlap prevention on add and move (#1057)

### UI Cleanup & Simplification
- Unified overlay panels to Lego brick design system (#1021)
- EmptyCanvasOverlay CTA buttons consolidated into 2×2 grid (#989)
- Portrait panel removed; canvas viewport adjusts for right-side panels (#1033)
- OpsCenter and AI features hidden from UI — deferred to M20+ (#1066)
- NotificationCenter hidden to fix infinite re-render loop — deferred to M20+ (#1071)
- Overlay z-index fix above BottomPanel (#987)

### GitHub Integration Fixes
- 24 bug fixes across diff engine, GitHub widgets, and store helpers (#816, #866, #890, #891, #892)
- Contextual info added to GitHub widgets (repo status, sync state, PR context)
- PR result persistence per workspace

### Worker Role (Implemented then Removed)
- Minifigure worker role designed, documented (SCV_ROLE_BOUNDARIES.md), and partially implemented
- CommandCard modes, store actions, and plate creation animation built
- **Decision: minifigure concept removed entirely** — CloudBlocks is a design tool (SimCity/ArchiCAD paradigm), not an RTS (StarCraft paradigm). Workers add complexity without value. 7 related issues closed, full removal tracked in #1088 (M19)

### Infrastructure
- GitHub Actions CI optimized to reduce storage and cost (#1059)
- 24 code quality findings addressed from M18 review (#991)

### Deferred to Future Milestones
- Ops Control Center dashboard (M20+)
- Deploy promote/rollback UX (M20+)
- Notification system (M20+)
- AI features UI (M20+)
- Minifigure code removal (#1088, M19)

### Retrospective
This milestone revealed the cost of scope inflation in agentic coding: 324 issues closed but most exit criteria unmet. Connectors were rewritten 3 times before arriving at the correct screen-space approach. The minifigure concept was built before validating product fit. Key lesson: validate direction before executing at scale.

### Stats
- 47 commits, 23 merged PRs, 1854 tests passing, branch coverage ~90%

---

## [v0.17.0] — 2026-03-21

**Milestone 17 — Product Structure**

Restructured the monorepo from a scaffolded prototype into a modular, separation-ready architecture. Resolved rendering model ambiguity, extracted shared packages with real consumers, redefined backend responsibilities, and established version alignment policy.

### Architecture & Packages
- SVG-only rendering model confirmed and documented (ADR-0010); unused Three.js dependencies removed
- `@cloudblocks/schema` extracted as single source of truth for ArchitectureModel contract
- `@cloudblocks/domain` extracted with shared domain helpers (hierarchy rules, labels, validation types)
- Empty placeholder packages removed from `packages/`
- All package versions aligned with root version under documented versioning policy

### Domain Model Fixes
- Deep-copy nested block fields when duplicating blocks (#644)
- Move all descendant plates when a parent plate moves, not just direct children (#643)
- Decouple workspace renaming from architecture name mutation (#645)

### Code Generation & Providers
- Provider-aware region input in CodePreview — each provider gets its own region in compare mode (#564)
- Clear stale single-provider output when the selected generator changes (#642)
- Do not preserve stale generated code after changing the active provider (#639)
- Derive CodePreview generator options from the generator registry instead of a hardcoded list (#657)
- Use actual generated metadata version consistently across generator plugins and UI (#654)
- Preserve file tab selection semantics across provider comparison mode (#653)

### Workspace & Persistence
- Persist and restore the active workspace id using existing storage helpers (#648)
- Persist the new active workspace id after switchWorkspace (#666)
- Make switchWorkspace self-contained instead of relying on callers to save first (#667)
- Persist backendWorkspaceId updates instead of keeping them in memory only (#672)
- Upsert the current workspace before persisting non-current workspace deletion (#671)
- Avoid updating the active workspace id key when workspace persistence fails (#650)
- Do not ignore saveWorkspaces failures in workspace lifecycle actions (#651)
- Persist workspace renames or make renameWorkspace explicitly in-memory only (#670)
- Remove or wire dead repoOwner/repoName/branch/lastSyncAt workspace fields (#673)
- Do not keep dead active-workspace storage helpers if the runtime will not use them (#647)

### UI & UX
- Redesign Internet external actor as globe brick (#451)
- Provider-aware SVG icons for blocks and plates (#526, #495)
- Give Ctrl+S/Cmd+S save the same success/failure feedback as the menu save action (#675)
- Use explicit ScenarioGallery open/close semantics instead of blind toggle (#676)
- Route 'Show Learning Panel' to a real entry flow when no scenario is active (#640)
- Expose or remove dead generator registry listing APIs from the runtime surface (#656)
- Align importArchitecture return type with its string-or-null implementation (#655)

### Dialog & Accessibility
- Support Escape-key dismissal in ConfirmDialog (#660)
- Focus an action button when ConfirmDialog opens (#659)
- Close or unmount the previous ConfirmDialog before resolving a new one (#661)
- Add Escape-key dismissal parity to PromptDialog overlay interactions (#664)
- Use the same cleanup path in PromptDialog when replacing an in-flight dialog (#665)
- Give PromptDialog input an explicit accessible label (#668)
- Avoid global document.querySelector coupling in PromptDialog value lookup (#669)

### Stats
- 4 Epics, 30 issues closed, 1697 tests passing, branch coverage 90.12%

---

## [v0.16.0] — 2026-03-20

**Milestone 16 — Documentation Architecture & Canonical Cleanup**

- Restore documentation coherence across the project after v2.0 spec implementation
- Establish canonical vs superseded document lifecycle policy
- Standardize Milestone vs Phase terminology across all active docs
- Archive superseded v1.x specs with clear historical labels
- Lego-themed MkDocs documentation site with custom CSS
- User-centric navigation restructure (6-tab layout)
- Dark mode Lego baseplate theme and light mode default
- Homepage rewrite with card grids and 5-step onboarding
- Dead code removal (unreachable `except LLMError`)
- Live demo link added to README
- 3 Epics, 30 issues closed, 10 PRs merged

## [v0.15.0] — 2026-03-20

**Milestone 15 — v2.0 Specification Implementation**

- Universal Architecture Specification v2.0 (ADR-0008)
- Foundation layer: geometry constants, provider registry, visual token system
- Model layer: v2 Block/Plate/Connection types with migration support
- Rules layer: v2 validation engine with provider-aware constraints
- Integration layer: generators, UI components, and persistence updated for v2 types
- 4-wave implementation (Foundation → Model & Rules → Integration → Integration)

## [v0.14.0] — 2026-03-20

**Milestone 14 — AI-Assisted Architecture**

- Natural language → architecture generation via LLM
- Architecture suggestion engine with context-aware analysis
- Cost estimation endpoint with Infracost integration
- Encrypted API key management (BYOK with Fernet encryption)
- AI prompt bar component for natural language input
- Architecture validation post-processor for LLM output
- Frontend AI integration (API client, store, suggestion panel, cost display)
- E2E integration tests for AI workflow
- ADR-0009 documenting AI architecture decisions

## [v0.13.0] — 2026-03-19

**Milestone 13 — Terraform Pipeline**

- Shared Terraform module extracted with staging and production wrappers
- Multi-environment deployment strategy documented
- Staging auto-deploy and production promotion CI/CD workflows
- GitHub Pages deployment workflow for frontend demo
- GitHub Actions Terraform plan/apply integration

## [v0.12.0] — 2026-03-19

**Milestone 12 — Core Model & Provider System**

- `subtype` and `config` fields added to Block domain type
- SubtypeResourceMap and resolveBlockMapping for provider-specific resource resolution
- Subtype registries for AWS, GCP, and Azure
- Schema bump to 0.2.0 with subtype/config migration support
- Provider-specific validation rules with warning-only diagnostics
- Generators updated to use subtype-aware resource mapping
- Brick design guidebook for non-developers

## [v0.11.0] — 2026-03-19

**Milestone 11 — Brick Design System**

- BlockCategory and brick visual profiles fully aligned
- Universal stud standard enforcement (rx=12, ry=6, height=5)
- Full provider×category stud color test matrix
- PlateSvg constants extracted to designTokens
- STUD_LAYOUTS consolidated into BLOCK_VISUAL_PROFILES
- BRICK_DESIGN_SPEC status markers updated

## [v0.10.0] — 2026-03-19

**Milestone 10 — External Actors & DevOps UX**

- Minifigure becomes interactive (selectable, activates CommandCard)
- Worker store for build queue state machine
- ExternalActor position field in domain model
- External actor dragging with zoom compensation
- CommandCard worker mode for build commands
- Build progress indicator on resources
- Worker movement and building animations
- Milestone 10 exit criteria integration tests

## [v0.9.0] — 2026-03-19

**Milestone 9 — UX Core Hardening**

- Provider toggle exposed in MenuBar
- Experience story: hero image, user journey, UI flow rewrite
- Empty canvas overlay with contextual guidance
- Invalid drop target visual feedback
- Milestone rename and superseded document cleanup
- Bump to 0.11.0 and project metadata update

## [v0.8.0] — 2026-03-18

**Milestone 8 — Multi-Cloud Platform**

- AWS and GCP provider adapters functional
- Provider integration tests
- Same architecture deployable to any supported provider
- Provider comparison view
- Documentation audit and overhaul
- Planning workflow and label tagging rules

## [v0.7.0] — 2026-03-19

**Milestone 7 — Collaboration + Phases 2 UX, 7, 9, 10, 11**

This release consolidates Milestone 7 and all historical Phase work (Phase 2 UX, Phase 3, Phase 7, Phase 9, Phase 10, Phase 11) into a single version.

Milestone 7:
- Architecture diff visualization (DiffPanel + canvas overlays)
- GitHub Actions Terraform plan template
- Compare with GitHub flow from MenuBar

Phase 2 UX:
- Magnetic snapping with audio feedback
- Dynamic drag shadows (CSS classList toggle)
- Bounce-drop animation on block/plate placement

Phase 3:
- Lego minifigure character SVG component (Azure variant)
- Cloud provider logo on torso
- Universal Stud Standard compliant head stud

Phase 7:
- Cookie-based session auth migration (JWT removed)
- Server-side SQLite sessions
- httpOnly `cb_session` and `cb_oauth` cookies

Phase 9 (Visual Builder Evolution):
- InteractionState machine (idle/selecting/dragging/placing/connecting)
- 4 BrickSilhouette types (tower/heavy/shield/module)
- 5-level tier height system
- 5 ConnectionType values
- ProviderType support on Block model

Phase 10 (Documentation Accuracy):
- 4 Epics, 19 sub-issues for doc alignment

Phase 11 (UX/UI Improvements):
- API base URL contract centralized
- ExternalActor interactivity
- Toast notifications replacing alert/confirm
- CommandCard action implementation
- Pointermove throttling (60fps via rAF)
- Connection selection/deletion with hit-area
- Connection guard (duplicate/self-connection rejection)

## [v0.6.0] — 2026-03-15

**Milestone 6 — Multi-Generator + Template Marketplace**

This release includes Milestones 6, 6B, and 6C.

Milestone 6:
- Terraform, Bicep, and Pulumi generators
- Serverless blocks (FunctionBlock, QueueBlock, EventBlock)
- Template marketplace with 5+ templates
- Generator plugin interface

Milestone 6B (Builder UX Completion):
- Drag-to-create from CommandCard palette
- Drop target validation and rejection
- Connect-mode visual highlighting
- Empty canvas overlay with Get Started CTA
- Warning visual state for blocks

Milestone 6C (Learning Mode):
- Build/Learn mode switch
- Guided step-by-step scenario system
- Scenario engine with state-based validation
- Hint engine with idle-timer progressive reveal
- 3 built-in scenarios (beginner/intermediate/advanced)
- Progress tracking per scenario

## [v0.5.0] — 2026-03-15

**Milestone 5 — GitHub Integration + Backend API**

- FastAPI backend for auth, generation orchestration, GitHub integration
- GitHub App OAuth login
- Connect GitHub account, select/create target repository
- Commit architecture.json + generated Terraform to user repo
- PR creation from UI
- Backend metadata DB (SQLite): user, project index, run status

## [v0.4.0] — 2026-03-15

**Milestones 1–4 — Builder MVP through Workspace Management**

This release consolidates the first four milestones into a single version, as they were implemented together.

Milestone 1 (Builder MVP):
- 2.5D isometric block builder (React + SVG/CSS)
- Network Plate, Subnet Plate (Public/Private)
- Compute, Database, Storage, Gateway blocks
- Rule Engine for placement and connection validation
- DataFlow connection visualization
- Workspace persistence (localStorage)

Milestone 2 (Visual Polish + UX):
- Drag and drop block repositioning
- Block resize and snap-to-grid
- Keyboard shortcuts (delete, undo, redo)
- Zoom/pan camera controls

Milestone 3 (Code Generation):
- Terraform HCL generator (Azure provider)
- Provider adapter layer
- Code preview panel with real-time HCL
- Export to file/clipboard

Milestone 4 (Workspace Management):
- Multiple workspace management
- Import/export architecture as JSON
- 3+ built-in templates (3-tier, serverless, data pipeline)
- Template gallery UI

## [v0.0.0] — 2026-03-15

**Milestone 0 — Concept Validation**

- Foundation documents (PRD, domain model, architecture, roadmap)
- Vite React TypeScript project scaffold
- Domain model types and schema serialization
- Rule engine for placement and connection validation
- Zustand state management with localStorage persistence
- UI panels, toolbar, and canvas scene components
- Monorepo restructure (FSD frontend, FastAPI backend)
- 2.5D isometric builder pivot
- CONTRIBUTING.md, ADRs (0001–0005)
- Documentation structure (docs/ subdirectories)

---

[v0.16.0]: https://github.com/yeongseon/cloudblocks/compare/v0.15.0...v0.16.0
[v0.15.0]: https://github.com/yeongseon/cloudblocks/compare/v0.14.0...v0.15.0
[v0.14.0]: https://github.com/yeongseon/cloudblocks/compare/v0.13.0...v0.14.0
[v0.13.0]: https://github.com/yeongseon/cloudblocks/compare/v0.12.0...v0.13.0
[v0.12.0]: https://github.com/yeongseon/cloudblocks/compare/v0.11.0...v0.12.0
[v0.11.0]: https://github.com/yeongseon/cloudblocks/compare/v0.10.0...v0.11.0
[v0.10.0]: https://github.com/yeongseon/cloudblocks/compare/v0.9.0...v0.10.0
[v0.9.0]: https://github.com/yeongseon/cloudblocks/compare/v0.8.0...v0.9.0
[v0.8.0]: https://github.com/yeongseon/cloudblocks/compare/v0.7.0...v0.8.0
[v0.7.0]: https://github.com/yeongseon/cloudblocks/compare/v0.6.0...v0.7.0
[v0.6.0]: https://github.com/yeongseon/cloudblocks/compare/v0.5.0...v0.6.0
[v0.5.0]: https://github.com/yeongseon/cloudblocks/compare/v0.4.0...v0.5.0
[v0.4.0]: https://github.com/yeongseon/cloudblocks/compare/v0.0.0...v0.4.0
[v0.0.0]: https://github.com/yeongseon/cloudblocks/releases/tag/v0.0.0

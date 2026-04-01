# Changelog

All notable changes to CloudBlocks are documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Version numbers follow the convention `v0.{milestone}.{patch}` — each milestone maps directly to a minor version.

---

---

## [v0.35.0] — 2026-04-01

**Milestone 35 — Visual Hierarchy and Presentation Consistency**

Established canonical block presentation metadata, applied typed connection visuals, softened container block palette, standardized label tokens, and unified resource palette layout.

### Features

- Defined canonical block presentation resolver module with visual metadata (#1555, PR #1560)
- Applied typed connection visuals in renderer — color-coded by connection type (#1556, PR #1561)
- Unified resource palette layout and iconography (#1559)

### Visual Polish

- Softened container block palette with HSL desaturation for layer contrast (#1557, PR #1562)
- Standardized block and container label tokens (#1558, PR #1563)

### Statistics

- 9 issues closed

## [v0.27.0] — 2026-03-28

**Milestone 27 — Positioning Documentation Completion**

Aligned all user-facing text and documentation with the "visual cloud learning tool" positioning, and fixed documentation–code discrepancies against the v4 schema.

### Positioning Alignment (Epic #1492, PR #1487)

- Updated `index.html` title, meta tags, and OG tags to learning-tool positioning (#1468)
- Updated `pyproject.toml` descriptions to learning-tool positioning (#1469)
- Updated `LandingPage.tsx` stale positioning strings (#1470)
- Updated stale concept docs to learning-tool positioning (#1471)
- Enriched user-guide files with learning-first context (#1472)
- Updated `DOMAIN_MODEL.md` framing for learning-tool positioning (#1473)

### Documentation-Code Alignment (Epic #1503, PR #1506)

- Fixed `DOMAIN_MODEL.md`: 16 v4 schema discrepancies corrected (#1504)
- Fixed `ARCHITECTURE.md`: 11 v4 terminology and structure discrepancies corrected (#1505)

### Statistics

- 12 issues closed, 2 PRs merged
- Documentation-only milestone — no runtime code changes

## [v0.28.0] — 2026-03-29

**Milestone 28 — UX Polish & Accessibility**

Added keyboard shortcut cheat sheet, skip-to-content accessibility link, landing page footer polish, and cleaned up external actor surface routing fallback. Standardized backend-dependent TODO markers with ADR-0014.

### Features

- Keyboard shortcut cheat sheet overlay (#1430)
- Skip-to-content link and ARIA hardening for screen readers (#1429)
- Landing page footer polish — links, copyright, social icons (#1431)

### Refactoring

- Extended surface routing to external actors and removed legacy connection fallback (#1432, #1438)
- Standardized `TODO(backend)` markers and added ADR-0014 for backend-dependent code (#1433, #1437)

### Statistics

- 8 issues closed (Epic #1428)

## [v0.29.0] — 2026-03-29

**Milestone 29 — Mobile Responsive Layout**

Made the visual builder usable on mobile viewports with auto-collapsing sidebar, bottom-sheet palette, compact toolbar, and mobile-friendly canvas.

### Features

- Auto-collapse sidebar on mobile with full-width canvas grid (#1440)
- Bottom-sheet palette overlay with mobile trigger button (#1441)
- Fixed canvas padding and toolbar horizontal scroll on mobile (#1442)
- Disabled drag-to-create on mobile with creation messaging fallback (#1443)
- Combined mobile responsive layout implementation (PR #1444)

### Statistics

- 6 issues closed (Epic #1439)

## [v0.30.0] — 2026-03-30

**Milestone 30 — Isometric Scene Visual Redesign**

Overhauled the visual language of the isometric canvas: replaced 3D beam connections with 2-layer SVG paths, added container hierarchy contrast system, quieted resource block materials, moved labels to screen-aligned chips, and compacted validation toasts.

### Visual Changes

- Connection trace redesign — replaced 3D beam with clean 2-layer SVG path (#1446)
- Container hierarchy visual system — structural navy ramp with inset effect (#1447)
- Resource block material quieting — reduced grid and stroke opacity (#1448)
- Screen-aligned label chips — moved labels out of isometric transform (#1449)
- Validation toast downshift — compact bottom-right positioning (#1450)
- Test updates for scene visual redesign (#1451)
- Combined scene visual redesign implementation (PR #1452)

### Statistics

- 8 issues closed (Epic #1445)

## [v0.31.0] — 2026-03-30

**Milestone 31 — Palette Tier Audit & External Actor Restoration**

Reclassified resource tier assignments, added missing resource types to the palette, restored Browser external actor, added External Actors section to sidebar palette with mobile support, and synchronized documentation.

### Palette Tier Classification (Epic #1453)

- Defined tier classification criteria in `RESOURCE_CATEGORY_STRATEGY.md` (#1455)
- Reclassified resource tier assignments in `RESOURCE_DEFINITIONS` (#1456)
- Added missing resource types to palette definitions (#1457)
- Set explicit `blockCategory` for VNet and Subnet (#1458)
- Updated `PROVIDER_RESOURCES.md` and `DOMAIN_MODEL.md` for 8-category system (#1459)

### External Actor Restoration (Epic #1454)

- Restored missing `browser.svg` external actor asset (#1460)
- Added `addExternalActor` and `removeExternalActor` store actions (#1461)
- Added External Actors section to sidebar palette (#1462)
- Added external actor support in mobile palette sheet (#1463)
- External actor store actions and palette integration tests (#1464)
- Combined palette and external actor implementation (PR #1465)

### Statistics

- 13 issues closed (Epics #1453, #1454)

## [v0.32.0] — 2026-03-30

**Milestone 32 — UX–Documentation Alignment**

Aligned the frontend UX with learning-tool positioning: updated landing page, enhanced empty canvas CTA for beginners, removed Experimental badge from Terraform export, updated onboarding tour, and added learning mode entry point.

### Features

- Enhanced `EmptyCanvasCTA` for beginner-first onboarding (#1479)
- Added learning mode entry point to MenuBar (#1482)
- Reviewed and updated onboarding tour for learning-first flow (#1481)

### Bug Fixes

- Updated `LandingPage` content and layout for learning-tool positioning (#1480)
- Removed Experimental badge from Terraform export in Generate Code (#1478)

### Related Epics

- Epic #1493 (UX–Documentation Alignment)
- Epic #1508 (Visual & UX Consistency Redesign)
- Combined implementation (PR #1488)

### Statistics

- 8 issues closed

## [v0.33.0] — 2026-03-31

**Milestone 33 — Learning Content Validation**

Validated all learning content end-to-end: tested guided scenarios, verified template→edit→export flows, reviewed scenario content for beginner-appropriate language, and created Gate 6 analytics instrumentation plan.

### Testing

- End-to-end validation of all 6 guided scenarios (#1483)
- Verified template → edit → export flow for all templates (#1484)
- Added template→edit→export flow integration tests (PR #1567)

### Documentation

- Reviewed scenario content for beginner-appropriate language (#1486)
- Created Gate 6 analytics instrumentation plan (#1485)
- Combined learning content validation implementation (PR #1489)

### Statistics

- 7 issues closed (Epic #1494)

## [v0.34.0] — 2026-03-31

**Milestone 34 — ExternalActor-to-Block Unification**

**Converted Internet and Browser from deprecated `ExternalActor` model into standard resource blocks (Epic #1533).**

This eliminates the dual-path runtime (Block + ExternalActor) by folding actors into the unified block pipeline: schema, store, persistence, connections, rendering, templates, diff, and code generation.

### Migration Summary

| Sub-Issue | Scope          | Key Change                                                                                        |
| --------- | -------------- | ------------------------------------------------------------------------------------------------- |
| **#1534** | Resource Rules | Added `internet`/`browser` to `RESOURCE_RULES` with `category: 'delivery'`, `roles: ['external']` |
| **#1535** | Persistence    | Automatic migration of legacy `externalActors[]` → `ResourceBlock` nodes on workspace load        |
| **#1536** | Store          | Unified store actions; introduced bridge pattern for transition period                            |
| **#1537** | Connections    | Shared endpoint resolver normalizing all block types; pure table-lookup `canConnect()`            |
| **#1538** | Templates      | All 6 templates and blank architecture use `ResourceBlock` entries for externals                  |
| **#1539** | Rendering      | External blocks render as `BlockSprite` with full block geometry                                  |
| **#1540** | Cleanup        | Removed all runtime ExternalActor references; deleted `ExternalActorSprite` (−2,258 lines)        |
| **#1541** | E2E & Docs     | End-to-end verification, ADR-0015, documentation updates                                          |

### Impact

- **38 source files changed** across the migration
- **2,258 lines removed** in final cleanup alone
- **3 files deleted**: ExternalActorSprite component, CSS, and tests
- **Zero user-facing behavior change** — Internet and Browser look and behave identically
- **Backward compatible** — legacy workspaces migrate transparently on load
- **All 2,208 tests pass** at ≥90.45% branch coverage

### Architecture Decision

- [ADR-0015: ExternalActor-to-Block Migration](docs/adr/0015-external-actor-to-block-migration.md)

---

## Positioning Reset — Visual Cloud Learning Tool (2026-03-28)

**Repositioned CloudBlocks from "preset-driven visual architecture design tool" to "visual cloud learning tool for beginners."**

This is a documentation-only change applied on top of v0.26.0. No code changes.

### What Changed

- **Product identity**: "preset-driven visual architecture design tool" → "visual cloud learning tool for beginners"
- **Evolution stages**: V1 Design / V2 Compile / V3 Prove / V4 Compare → **V1 Learn / V2 Export / V3 Practice / V4 Teach**
- **Learning Mode**: Promoted from "V1 Advanced (off by default)" to **V1 Core** — now the primary product experience
- **Terraform starter export**: Promoted from "Experimental" to **V1 Core** learning feature
- **Bicep & Pulumi**: Labeled as **Experimental** consistently across all documentation
- **Provider strategy**: Removed "Azure-Only Implementation" / "Azure depth-first" language → provider-aware learning
- **Target audience**: General users → beginners (bootcamp grads, career changers, junior devs)
- **Kill switches**: Added D7 retention < 15% and template→edit→export < 30% kill switches in RELEASE_GATES.md
- **PRD.md**: Added superseded banner pointing to current product direction

### Files Updated (21 files)

- README.md, docs/README.md
- docs/concept/ROADMAP.md, V1_PRODUCT_CONTRACT.md, COMPATIBILITY.md, PRODUCT_DIRECTION_SPEC.md, UI_FLOW.md, PRD.md
- docs/design/LEARNING_MODE_SPEC.md, RELEASE_GATES.md
- docs/user-guide/index.md, faq.md, first-architecture.md, core-concepts.md
- docs/engine/generator.md, provider.md
- docs/advanced/blank-canvas.md, code-generation.md
- mkdocs.yml, package.json, CHANGELOG.md

---

## [v0.26.0] — 2026-03-25

**Milestone 26 — Visual Language & Routing**

Cleaned up obsolete documentation, implemented cross-container connection routing using LCA-based transition segments, and removed dead ConnectionPath code — closing the Connection Architecture Epic (#1351).

### Documentation Cleanup (PR #1420)

- Deleted 5 obsolete docs: `AZURE_PROVISIONING_RUNBOOK.md`, `PLAUSIBLE_SETUP.md`, `LAUNCH_PACKET.md`, `MODULAR_SURFACE_SPEC.md`, `KPI_SCORECARD.md`
- Renamed `showStuds` → `showPorts` in uiStore with localStorage migration
- Updated ROADMAP, ARCHITECTURE, and NFR_TARGETS for current state

### Cross-Container Routing (PR #1421)

- LCA-based routing algorithm for connections spanning multiple container blocks
- `findLCA()` finds shared ancestor surface for cross-container connections
- `routeCrossContainer()` generates transition segments through container boundaries
- 8 new tests covering nested, sibling, and deep hierarchy routing

### ConnectionPath Dead Code Removal (PR #1422)

- Deleted `ConnectionPath.tsx` (175 lines) and `ConnectionPath.test.tsx` (456 lines) — dead code not imported anywhere
- Documented legacy fallback seam in `ConnectionRenderer.tsx` with `TODO(#1351)` markers
- Added 3 new tests for surface route vs fallback path selection
- Updated ARCHITECTURE.md, CONNECTION_SPEC.md, and NFR_TARGETS.md

### Epic Completion

- Closed Epic #1351 (Connection Architecture) — all 7 sub-issues (#1352–#1358) completed
- Legacy fallback for external actor connections retained with TODO markers for future removal

### Statistics

- 6 issues closed, 3 PRs merged
- 124 test files, 2,073 tests — all passing
- Build clean, lint clean, type check clean

## [v0.25.0] — 2026-03-24

**Milestone 25 — V1 Documentation & Product Contract**

Rewrote all public-facing documentation for V1 positioning as a preset-driven visual architecture design tool. Established product contract, compatibility policy, and restructured roadmap from 0.x milestones to V1→V4 evolution stages.

### Documentation Rewrite (PR #1419)

- Created V1 Product Contract (`V1_PRODUCT_CONTRACT.md`) — defines what V1 guarantees vs what it doesn't
- Created Compatibility Policy (`COMPATIBILITY.md`) — versioning, migration, and deprecation rules
- Restructured ROADMAP.md from flat milestone list to V1→V2→V3→V4 evolution stages
- Archived 0.x milestone history to `ROADMAP_0X_HISTORY.md`
- Rewrote README.md for preset-driven design tool positioning
- Updated docs/README.md homepage with card grids and 5-step onboarding
- Updated ARCHITECTURE.md, DOMAIN_MODEL.md, and all guide documents
- 14 files changed across documentation overhaul

### Statistics

- 7 issues closed, 1 PR merged
- Documentation-only milestone — no code changes

## [v0.24.0] — 2026-03-24

**Milestone 24 — Block Unification**

Eliminated all Lego-derived terminology from the codebase. Unified vocabulary under Block model with `kind` + `traits` type system. Added CI gate to prevent banned terms from re-entering the codebase.

### Terminology Unification (PR #1408)

- Renamed all `brick`/`plate`/`stud`/`stub`/`lego` references to `block`/`container`/`port`/`endpoint` equivalents
- 295 files changed across apps/web, packages/schema, packages/cloudblocks-domain, and docs
- ADR-0013 documents the block unification architecture decision
- CI banned-terms gate (`scripts/check-banned-terms.sh`) prevents regression
- Exceptions: `student`/`Student`, vitest API stubs, immutable historical docs

### Bug Fixes (PRs #1409–#1412)

- Show demo mode info bar when no backend is configured (#1409)
- Add Browser external actor to all templates and import fallback (#1410)
- Use floor routing for fallback connections (#1411)
- Align RightDrawer to top of viewport instead of 40px offset (#1412)

### Statistics

- 11 issues closed, 5 PRs merged
- 295 files changed in terminology unification (single PR)
- Build clean, lint clean, type check clean

## [v0.23.0] — 2026-03-24

**Milestone 23 — Taxonomy & Hardening**

Hardening sprint focused on making M1–M22 work end-to-end. Visual language refactored to matte shading, connection rendering overhauled, resource palette expanded, onboarding simplified, CI infrastructure improved, and 8th resource category added.

### Visual Language Refactor

- Matte shading system replacing glossy block aesthetic (#1386)
- Dynamic isometric connection renderer (#1391)
- Azure visual overhaul — icons, labels, colors, external actors (#1394)
- Removed MVP_RESOURCE_ALLOWLIST — all 25 resources visible in palette (#1392)
- Simplified onboarding tour to 3-step canvas workflow (#1390)
- Renamed figure-helper widget to helper — removed Lego branding (#1388)

### Connection & Routing

- World-space surface routing model with Manhattan routing (#1359)
- Floor routing for fallback connections (#1411)

### Infrastructure & CI

- Codecov upload and coverage badge (#1314)
- Prettier + husky pre-commit hooks (#1332)
- Path-based CI filtering to reduce unnecessary runs (#1344)
- Removed `--admin` bypass from merge convention (#1342)
- Playwright demo recording infrastructure (#1309)
- Removed preview.yml — Azure SWA has no deploy token (#1385)

### Content & Docs

- 8th resource category: expanded ResourceCategory schema (#1378)
- Removed all stud/stub infrastructure (#1379)
- Removed LEGO/Roblox CSS aliases and hardcoded reds (#1380)
- Coming Soon badges for backend-dependent surfaces (#1330)
- FigureHelper floating widget for beginner guidance (#1308)
- End-user documentation (#1327)
- Dead code removal via knip analysis (#1328)
- Plausible analytics integration (#1298)

### Statistics

- 97 issues closed across 15+ PRs
- Visual language completely overhauled
- CI pipeline modernized with path filtering and coverage reporting

## [v0.22.0] — 2026-03-23

**Milestone 22 — Core Lock (Endpoint + Connection Architecture)**

Schema v4 endpoint-based architecture replacing stub-addressable connections, canvas-centric UX overhaul with right-drawer panel system, semantic port rendering, drag-to-connect interaction, and dual theme design system (blueprint/workshop).

### Schema v4 — Endpoint Architecture (PR #1240)

- First-class `Endpoint` entities with `id`, `nodeId`, `direction`, `semantic` fields
- `EndpointDirection` ('input' | 'output') and `EndpointSemantic` ('http' | 'event' | 'data') enums
- `Connection` model refactored to `from`/`to` endpoint IDs (replacing `sourceId`/`targetId`)
- Helper functions: `endpointId()`, `generateEndpointsForNode()`, `parseEndpointId()`, `resolveConnectionNodes()`
- `CATEGORY_PORTS` rules and `ALLOWED_CONNECTIONS` validation matrix
- Full v3→v4 migration path with backward compatibility
- Diff engine and connection components updated for endpoint-based model

### Canvas-Centric Layout

- 2-column BuilderView layout (palette + canvas) replacing 4-panel CSS Grid (#1243)
- Right-drawer panel system for ScenarioGallery, LearningPanel, ValidationDrawer, Properties (#1242)
- Removed bottom dock (#1244) and FlowDiagram overlay (#1245)
- Compact toolbar/MenuBar with panel access buttons (#1256)

### Connection UX

- Semantic port colors (http=blue, event=amber, data=teal) with occupied dimming and glow (#1250)
- Drag-to-connect from ports with hover glow feedback (#1251)
- Connection snap animation and drop affordances (#1252)
- Invalid connection prevention with silent cancel (#1253)

### Panels & Features

- ScenarioGallery (#1246), LearningPanel (#1248), ValidationDrawer (#1255) moved to right drawer
- Properties panel edit-centric rebuild with auto-open on selection (#1254)
- Empty-canvas CTA with template quick-start (#1260)
- BlockPalette search text highlighting (#1257)

### Design System

- Hardcoded modular colors replaced with themeTokens (blueprint/workshop) (#1249)
- Unified icon usage with lucide-react (#1258)
- UI terminology update: Block→Node, Plate→Container, Stub→Endpoint (#1259)
- Modular stud toggle as theme option (blueprint=studs on, workshop=studs off) (#1261)
- First-run-only student onboarding (#1247)

### Documentation

- THEME_SYSTEM_SPEC.md updated to match code naming (blueprint/workshop) (#1233)
- New ENDPOINT_PORT_MODEL.md documenting Schema v4 architecture (#1233)

### Statistics

- 39 issues closed across 2 PRs (#1240, #1331)
- 137 test files, 2204 tests — all passing
- 91 files changed, 5123 insertions, 1633 deletions (UX overhaul)
- Build clean, lint clean, type check clean

## [v0.21.0] — 2026-03-23

**Milestone 21 — UI/UX Overhaul & Stub Connections**

Complete UI redesign with Professional theme (default), stub-addressable connection model, CSS Grid builder layout, and new panel system — landing page, sidebar palette, inspector panel, and tabbed bottom dock.

### Stub-Addressable Connection Model

- Added `sourceStub`/`targetStub` fields to Connection schema
- Added `CATEGORY_PORTS` policy mapping resource categories to allowed port positions
- Store auto-allocates stub positions during connection creation
- Stub anchor routing resolves world-space endpoints via `getConnectionEndpointWorldAnchors()`

### Semantic Block Shapes

- Replaced silhouette-based block rendering with semantic category shapes
- Resource palette filtered to MVP set for clean first-time experience
- Dark-themed first screen overlay for onboarding

### Theme System (Phases 7–9)

- Added `ThemeVariant` system with blueprint/workshop token sets
- CSS custom properties for all visual tokens (colors, spacing, typography, shadows)
- Migrated hardcoded `font-family` values to CSS variables
- Blueprint (Professional) and Workshop (Modular) theme toggle via `data-theme` attribute

### Landing Page & Builder Layout (Phases 10–11)

- New landing page with navbar, hero section, feature highlights, and CTA
- Extracted `BuilderView` from monolithic `App.tsx`
- CSS Grid shell layout: sidebar + canvas + inspector + bottom dock
- Removed `EmptyCanvasOverlay` from `SceneCanvas` (moved to landing flow)

### Sidebar Palette (Phase 12)

- New `SidebarPalette` widget with drag-and-drop resource creation
- Extracted shared creation constants to `useTechTree` hook
- Category grouping with Azure resource icons

### Inspector Panel (Phase 13)

- Right-side `InspectorPanel` with Properties, Code, and Connections tabs
- `InspectorTabId` and `rightOverlay` state in uiStore
- Embedded `CodePreview` mode for inspector integration

### Bottom Dock (Phase 14)

- Tabbed `BottomPanel` replacing standalone overlay panels
- Output, Validation, Logs, and Diff tabs
- Collapsible dock with drag-resize handle
- Default state: open (visible on load)

### Canvas & Visual Polish (Phases 15–16)

- In-canvas invalid connection visualization with red dashed feedback
- View menu restructured with keyboard shortcuts for all panels
- Professional dot grid canvas background replacing modular baseplate

### Onboarding & Animation (Phases 17–18)

- Onboarding tour selectors updated for new layout structure
- Panel transition animations (slide-in/slide-out)
- Connector draw-in animation via SVG `stroke-dashoffset`
- `@keyframes connector-draw-in` defined in global CSS

### Professional Theme Tokens

- MenuBar themed with professional color tokens
- All modular-specific hardcoded values wrapped in `[data-visual-mode="lego"]` selectors (code identifier)
- Professional mode is the default visual style

### Azure Subnet Unification

- Removed public/private subnet distinction
- Unified subnet model matching Azure's flat subnet architecture

### Statistics

- 32 commits across 18 implementation phases
- 1992 tests passing across all test files
- MODULAR visual mode preserved for M22 dual theme system

## [v0.20.0] — 2026-03-22

**Milestone 20 — UX Polish & GitHub Hardening**

Redesigned panel roles, hardened GitHub integration (17 bug fixes), introduced multi-persona UX, added 19 new Azure resource types to the catalog, and completed the ResourceNode unification — eliminating the Plate/Block type separation across the entire frontend.

### Panel Role Redesign (Epic #1112)

- Resource Guide becomes read-only encyclopedia; Command Panel becomes action + property hub
- Connection editing mode added to Command Panel
- Workspace dashboard replaces welcome state in Resource Guide
- Onboarding tour updated to reflect new panel roles

### GitHub Integration Hardening (17 issues)

- Fixed OAuth redirect, sign-out, and auth failure routing
- Fixed create/link repo flow and default visibility
- Fixed PR submission guards, branch collision, unsaved edits, and body prefill
- Fixed dirty indicator, safe panel closure, and post-pull diff
- Fixed read-only mode, lifecycle warnings, and region/compare preservation
- Added integration test coverage for GitHub panel flows

### Multi-Persona UX (Epic #1076)

- Persona selection on first run (DevOps, Backend, PM, Student)
- Complexity levels (beginner/standard/advanced) control panel visibility
- IaC code preview abstraction levels

### Azure Resource Catalog Parity (#1195)

- Added 19 new resource types: virtual_machine, container_instance, kubernetes_cluster, cosmos_db,
  application_gateway, azure_firewall, nat_gateway, network_security_group, bastion_host,
  azure_front_door, internal_load_balancer, public_ip_address, network_interface, key_vault,
  event_hub, service_bus, log_analytics, application_insights, cdn_profile
- RESOURCE_RULES expanded from 15 to 34 entries

### ResourceNode Unification (#1194)

- Added unified store API: addNode, removeNode, renameNode, moveNodePosition
- Removed ProviderAdapter interface; terraform.ts uses ProviderDefinition directly
- Removed legacy provider exports, getProvider(), legacyGenerate(), terraformPipeline
- Renamed UI category 'plate' → 'foundation' in useTechTree and CommandCard
- Migrated all 22 apps/web files from deprecated type aliases:
  Block → LeafNode, Plate → ContainerNode, BlockCategory → ResourceCategory
- Deprecated schema exports preserved for backward compat

### Demo Hardening

- Block selection UI consolidated into unified property panel (#1137)
- AI features graceful fallback when backend unavailable (#1138)
- Ops features disabled/stubbed without backend (#1139)

### Content Modernization

- Templates migrated to canonical 7-category vocabulary (#1140)
- Learning scenarios migrated to canonical vocabulary (#1141)
- Codegen outputs honest Azure-only code (#1143)

### Infrastructure & Launch

- Auto-trigger onboarding tour on first visit (#1193)
- Launch landing copy and meta tags updated (#1190)
- Demo loader and first-time UX overlay

### Statistics

- 46 files changed in ResourceNode unification (452 insertions, 604 deletions)
- 1920 tests passing across 108 test files
- All CI checks passing (lint, type check, build)

## [v0.19.3] — 2026-03-22

**Hotfix — Panel Role Redesign + BlockSprite Crash Fix**

Redesigns the bottom panel roles: Command Panel becomes the interactive hub (properties display, connection editing, actions), Resource Guide becomes 100% read-only (workspace dashboard, encyclopedia content). Also fixes a React infinite loop crash in BlockSprite.

### Panel Role Redesign (Epic #1112)

- Rename `showProperties`/`Inspector` to `showResourceGuide`/`Resource Guide` across store and components (#1118)
- Add read-only properties display to Command Panel actions (#1117)
- Add connection editing mode to Command Panel with source/target display and delete (#1115)
- Replace welcome state with workspace dashboard in Resource Guide (#1113)
- Add encyclopedia content (overview, use cases, best practices) to Resource Guide detail views (#1114)
- Update onboarding tour Step 2 to reflect new panel roles (#1116)

### Bug Fix

- Move `.filter()` outside Zustand selector in `BlockSprite` to fix React #185 infinite re-render crash (#1134)

## [v0.19.2] — 2026-03-22

**Hotfix — App Load Crash (React #185)**

Fixed a crash on initial app load caused by a Zustand selector in `ExternalActorSprite` creating a new array reference on every `getSnapshot` call via `.filter()` inside the selector. React 19's `useSyncExternalStore` detected the unstable snapshot and threw an infinite loop error (React error #185), rendering the entire app blank.

### Bug Fix

- Move `.filter()` call outside the Zustand selector in `ExternalActorSprite` to avoid creating new array references on each snapshot (#1128)

## [v0.19.1] — 2026-03-22

**Hotfix — Schema Migration Crash**

Fixed a crash when loading localStorage data saved under schema v2.0.0 (10-category system). Old category names (`database`, `storage`, `gateway`, `function`, `queue`, `event`, `analytics`, `identity`, `observability`) were not remapped to the new 7-category system, causing `getBlockVisualProfile()` to return `undefined` and crashing `BlockSvg` rendering.

### Bug Fix

- Add `LEGACY_CATEGORY_MAP` to `schema.ts` to remap old 10-category names during deserialization (#1126)
- Remap categories on both freshly-migrated and already-persisted nodes
- Add `'2.0.0'` to `SUPPORTED_VERSIONS` for explicit migration support
- Add defensive fallback in `getBlockVisualProfile()` and `getBlockDimensions()` for unknown categories
- Add 3 new tests covering legacy category migration paths

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
- VITE\_\* env var audit ensures only `VITE_API_URL` reaches the frontend bundle

### Retrospective

M19 was scoped as a 1-day milestone — resource model unification, minifigure removal, provider label fixes, demo resilience, and CI hardening. All 28 issues closed. The ResourceNode unification touched 121+ files but preserved all existing test coverage (1811 tests passing, 90.27% branch coverage).

## [v0.18.0] — 2026-03-22

**Milestone 18 — DevOps UX**

Introduced Technic Beam connectors, fixed provider-specific UX issues, and clarified product direction by removing features that didn't fit the "architecture compiler" identity. Several originally planned features (OpsCenter, Notification System, AI panel) were deferred after evaluation showed they added complexity without immediate user value.

### Block-Style Connectors (Area E)

- Redesigned connection lines as Technic liftarm beams with pin holes, side faces, and typed color differentiation
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

- Unified overlay panels to modular building design system (#1021)
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
- Modular-themed MkDocs documentation site with custom CSS
- User-centric navigation restructure (6-tab layout)
- Dark mode modular baseplate theme and light mode default
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

- Mascot character SVG component (Azure variant)
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

[v0.35.0]: https://github.com/yeongseon/cloudblocks/compare/v0.34.0...v0.35.0
[v0.34.0]: https://github.com/yeongseon/cloudblocks/compare/v0.33.0...v0.34.0
[v0.33.0]: https://github.com/yeongseon/cloudblocks/compare/v0.32.0...v0.33.0
[v0.32.0]: https://github.com/yeongseon/cloudblocks/compare/v0.31.0...v0.32.0
[v0.31.0]: https://github.com/yeongseon/cloudblocks/compare/v0.30.0...v0.31.0
[v0.30.0]: https://github.com/yeongseon/cloudblocks/compare/v0.29.0...v0.30.0
[v0.29.0]: https://github.com/yeongseon/cloudblocks/compare/v0.28.0...v0.29.0
[v0.28.0]: https://github.com/yeongseon/cloudblocks/compare/v0.27.0...v0.28.0
[v0.27.0]: https://github.com/yeongseon/cloudblocks/compare/v0.26.0...v0.27.0
[v0.26.0]: https://github.com/yeongseon/cloudblocks/compare/v0.22.0...v0.26.0
[v0.25.0]: https://github.com/yeongseon/cloudblocks/compare/v0.24.0...v0.25.0
[v0.24.0]: https://github.com/yeongseon/cloudblocks/compare/v0.23.0...v0.24.0
[v0.23.0]: https://github.com/yeongseon/cloudblocks/compare/v0.22.0...v0.23.0
[v0.22.0]: https://github.com/yeongseon/cloudblocks/compare/v0.21.0...v0.22.0
[v0.21.0]: https://github.com/yeongseon/cloudblocks/compare/v0.20.0...v0.21.0
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

# CloudBlocks — Product Roadmap

> For the 0.x milestone development history, see [ROADMAP_0X_HISTORY.md](ROADMAP_0X_HISTORY.md).

## Product Evolution

CloudBlocks evolves through four stages — from visual cloud learning tool to educator platform.

| Stage  | Name     | Focus                                                          |
| ------ | -------- | -------------------------------------------------------------- |
| **V1** | Learn    | Visual cloud learning tool for beginners                       |
| **V2** | Export   | Trustworthy Terraform starter code with hypothesis validation  |
| **V3** | Practice | Learning paths with progress tracking and guided scenarios     |
| **V4** | Teach    | Educator distribution, curriculum packaging, community sharing |

---

## V1 — Learn (Current)

**Vision**: A visual cloud learning tool where beginners start from guided templates, learn common cloud architecture patterns through interactive scenarios, and export Terraform starter code — all in the browser. No backend required.

### V1 Core (Guaranteed)

- **Guided Templates** — Start from 6 built-in architecture patterns (three-tier, serverless, data storage, event pipeline, full stack)
- **Learning Mode** — Interactive guided scenarios to learn cloud architecture patterns (beginner → intermediate → advanced)
- **Editable Diagrams** — Customize layouts with drag-and-drop block placement and grid snapping
- **Curated Palette** — 8 resource categories: Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations
- **Block Modeling** — Container blocks (boundaries) + Resource blocks (resources) + typed Connections
- **Port System** — Port-based connections with category-aware port policies
- **Visual Theme** — Assembly-board visual language with provider-specific colors (Azure, AWS, GCP)
- **Multi-Cloud Preview** — Visual preview across providers
- **Validation Engine** — Real-time rule checking for placement and connections
- **Terraform Starter Export** — Export your design to Terraform starter code for learning and prototyping
- **Workspace Persistence** — Save/load workspaces via localStorage
- **Frontend-Only** — Works entirely in the browser

### V1 Advanced (Present, Off by Default)

- **Free-Form Building** — Full resource catalog beyond curated palette
- **Bicep & Pulumi Export** — Additional IaC export formats (Experimental)
- **Blank Canvas Mode** — Start from scratch without a template (recommended for experienced users)

### Not in V1 Default

- AI-assisted architecture (backend-dependent)
- GitHub OAuth / repository sync / PR workflow (backend-dependent)
- Production-grade code generation guarantees
- README generation (planned for later milestone)

### V1 Milestones

| Milestone | Focus                               | Status  |
| --------- | ----------------------------------- | ------- |
| M22       | Port Connections & Visual Theme              | ✅ Done |
| M23       | Taxonomy & Hardening                         | ✅ Done |
| M24       | Block Unification                            | ✅ Done |
| M25       | V1 Documentation & Product Contract          | ✅ Done |
| M26       | Visual Language & Routing                    | ✅ Done |
| M27       | Positioning Documentation Completion         | ✅ Done |
| M28       | UX Polish & Accessibility                    | ✅ Done |
| M29       | Mobile Responsive Layout                     | ✅ Done |
| M30       | Isometric Scene Visual Redesign              | ✅ Done |
| M31       | Palette Tier Audit & External Actor Restore  | ✅ Done |
| M32       | UX–Documentation Alignment                   | ✅ Done |
| M33       | Learning Content Validation                  | ✅ Done |
| M34       | ExternalActor-to-Block Unification           | ✅ Done |
| M35       | Visual Hierarchy & Presentation Consistency  | ✅ Done |
| M36       | Editor UX Completeness                       | ✅ Done |
| M37       | Template Architecture Accuracy               | ✅ Done |
| M38       | Code Review Quality Gate                     | ✅ Done |
| M39       | Provider UX & Validation Polish              | ✅ Done |
| M40       | Visual Quality & Interaction Polish          | ✅ Done |
| M41       | Template Visual Hierarchy                    | ✅ Done |
| M42       | Connection Packet Flow Animation             | ✅ Done |
| M43       | Landing Page Credibility & Sharing           | ✅ Done |
| M44       | Maintenance & Polish                         | ✅ Done |
| M45       | Packet & Container Visual Tuning              | ✅ Done |
| M46       | Packet Flow UX & Visual Hierarchy              | ✅ Done |

### Version Transition

```
v0.{milestone}.0 per milestone (current: v0.46.0)
```

Version numbers follow `v0.N.0` where N is the milestone number. This convention continues through V1 development. See `docs/design/VERSION_POLICY.md` for details.

---

## V2 — Export (Next)

**Vision**: Trustworthy Terraform starter code with hypothesis validation — proving beginners can go from visual design to working infrastructure.

- Terraform export promoted from starter to Stable with validation guarantees
- Starter repo scaffolding with best-practice structure
- Code generation validation pipeline
- CI/CD template integration
- **Kill switch**: If template→edit→export completion < 30%, re-evaluate export UX before continuing
- Bicep & Pulumi exports remain Experimental — promote only after Terraform kill switch passes

---

## V3 — Practice (Later)

**Vision**: Learning paths with progress tracking, guided scenarios, and structured curricula for cloud beginners.

- Structured learning paths (e.g., "Cloud Networking 101", "Serverless for Beginners")
- Progress tracking and achievement system
- Branching scenario narratives
- AI-powered adaptive hints
- Community-contributed scenarios
- **Kill switch**: If D7 retention < 15% or significantly worse than expert cohort, reassess learning-first positioning

---

## V4 — Teach (Future)

**Vision**: Educator distribution and curriculum packaging — CloudBlocks becomes a teaching platform, not just a learning tool.

- Scenario authoring tools for educators
- Curriculum packaging and sharing
- Classroom mode (instructor + students)
- LMS integration (Moodle, Canvas, Google Classroom)
- Community marketplace for learning content

---

## Current State

| Metric                   | Value                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| 0.x milestones completed | 46 (M8–M46, all closed)                                                                                   |
| Tests passing            | 3,747+                                                                                                     |
| Branch coverage          | ≥ 90%                                                                                                     |
| Codebase                 | TypeScript (React 19) + Python (FastAPI) monorepo                                                         |
| Architecture             | Block-based composition with `kind` + `traits` type system ([ADR-0013](../adr/0013-block-unification.md)) |

## See Also

- [V1 Product Contract](V1_PRODUCT_CONTRACT.md) — What V1 guarantees
- [Compatibility Policy](COMPATIBILITY.md) — Versioning and migration
- [0.x Development History](ROADMAP_0X_HISTORY.md) — Full milestone archive

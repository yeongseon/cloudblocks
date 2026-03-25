# CloudBlocks — Product Roadmap

> For the 0.x milestone development history, see [ROADMAP_0X_HISTORY.md](ROADMAP_0X_HISTORY.md).

## Product Evolution

CloudBlocks evolves through four stages — from visual design tool to multi-cloud mapping studio.

| Stage  | Name    | Focus                                               |
| ------ | ------- | --------------------------------------------------- |
| **V1** | Design  | Preset-driven visual architecture design tool       |
| **V2** | Compile | Architecture compiler → starter infrastructure code |
| **V3** | Prove   | Azure-proven DevOps design and review tool          |
| **V4** | Compare | Multi-cloud mapping studio                          |

---

## V1 — Design (Current)

**Vision**: A visual architecture design tool where users start from presets, customize layouts with drag-and-drop blocks, and preview multi-cloud infrastructure — all in the browser. No backend required.

### V1 Core (Guaranteed)

- **Preset Templates** — Start from 6 built-in architecture patterns (three-tier, serverless, data storage, event pipeline, full stack)
- **Editable Diagrams** — Customize layouts with drag-and-drop block placement and grid snapping
- **Curated Palette** — 8 resource categories: Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations
- **Block Modeling** — Container blocks (boundaries) + Resource blocks (resources) + typed Connections
- **Port System** — Port-based connections with category-aware port policies
- **Visual Theme** — Assembly-board visual language with provider-specific colors (Azure, AWS, GCP)
- **Multi-Cloud Preview** — Visual preview across providers (best-effort — Azure depth-first)
- **Validation Engine** — Real-time rule checking for placement and connections
- **Workspace Persistence** — Save/load workspaces via localStorage
- **Frontend-Only** — Works entirely in the browser

### V1 Advanced (Present, Off by Default)

- **Free-Form Building** — Full resource catalog beyond curated palette
- **Code Generation** — Export to Terraform, Bicep, or Pulumi (Experimental)
- **Learning Mode** — Guided scenarios for learning cloud architecture patterns

### Not in V1 Default

- AI-assisted architecture (backend-dependent)
- GitHub OAuth / repository sync / PR workflow (backend-dependent)
- Production-grade code generation guarantees

### V1 Milestones

| Milestone | Focus                               | Status  |
| --------- | ----------------------------------- | ------- |
| M22       | Port Connections & Visual Theme     | ✅ Done |
| M23       | Taxonomy & Hardening                | ✅ Done |
| M24       | Block Unification                   | ✅ Done |
| M25       | V1 Documentation & Product Contract | ✅ Done |
| M26       | Visual Language & Routing           | ✅ Done |

### Version Transition

```
v0.26.0 (current) → v1.0.0-beta.1 (first public release) → v1.0.0 (baseline)
```

After v1.0.0, development continues with backward-compatible minor releases (v1.1.0, v1.2.0, ...).

---

## V2 — Compile (Next)

**Vision**: Transform visual designs into starter infrastructure code with validation guarantees.

- Architecture compiler with strong export guarantees
- Starter repo scaffolding (Terraform / Bicep / Pulumi)
- Code generation validation pipeline
- CI/CD template integration
- Code generation promoted from Experimental to Stable

---

## V3 — Prove (Later)

**Vision**: Azure-proven DevOps design and review tool.

- Server-side features: GitHub integration, workspace sync, PR workflow
- AI-assisted architecture suggestions and cost estimation
- Architecture review and optimization
- Azure deployment verification
- Team collaboration features

---

## V4 — Compare (Future)

**Vision**: Multi-cloud mapping studio.

- Per-provider capability matrix
- Cloud migration planning
- Cost comparison across providers
- Architecture portability analysis
- Provider-specific recommendation engine

---

## Current State

| Metric                   | Value                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| 0.x milestones completed | 26 (M0–M26)                                                                                               |
| Tests passing            | 2,073                                                                                                     |
| Branch coverage          | ≥ 90%                                                                                                     |
| Codebase                 | TypeScript (React 19) + Python (FastAPI) monorepo                                                         |
| Architecture             | Block-based composition with `kind` + `traits` type system ([ADR-0013](../adr/0013-block-unification.md)) |

## See Also

- [V1 Product Contract](V1_PRODUCT_CONTRACT.md) — What V1 guarantees
- [Compatibility Policy](COMPATIBILITY.md) — Versioning and migration
- [0.x Development History](ROADMAP_0X_HISTORY.md) — Full milestone archive

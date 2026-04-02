# CloudBlocks — Architecture History (Pre-V1)

> **Status**: Historical (Superseded) — Do not edit.
>
> This document preserves early-stage architecture snapshots from Milestone 1.
> For the current architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

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

---

## Frontend Responsibilities (Milestone 1)

- 2.5D isometric builder interface (SVG + CSS transforms)
- Click-to-add block placement via palette
- Architecture validation (in-browser Rule Engine)
- Local persistence (localStorage)

---

## MVP Architecture (Milestone 1)

Milestone 1 is implemented as a **frontend-only SPA**. No backend required.

```
Browser (React + SVG/CSS)
├── Isometric Scene (SVG + CSS transforms + DOM layering — rendering layer)
├── Domain Model (Zustand Store — 2D coordinates + hierarchy)
├── Rule Engine (in-browser)
└── localStorage (workspace persistence)
```

---

## Milestone 1 Storage (Local)

Milestone 1 uses browser localStorage for persistence. Storage key: `cloudblocks:workspaces`.

The persisted format uses `schemaVersion: "4.0.0"` (see `CURRENT_SCHEMA_VERSION` in `apps/web/src/shared/types/schema.ts`) with a `workspaces[]` array, each containing a single `architecture: ArchitectureModel` object.

> For the full workspace model and serialization format, see [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md).

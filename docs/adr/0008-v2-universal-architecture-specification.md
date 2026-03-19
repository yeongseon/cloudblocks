# ADR-0008: v2.0 Universal Architecture Specification

**Status**: Accepted
**Date**: 2026-03
**Supersedes**: [ADR-0003](0003-lego-style-composition-model.md) (partially — composition model retained, dimensional system replaced)

## Context

CloudBlocks v1.x visual system grew organically, accumulating scattered magic numbers (`TILE_W=64`, `STUD_RX=12`, `STUD_RY=6`, `STUD_HEIGHT=5`, `STUD_INNER_RX=7.2`) with no formal derivation chain. This created several problems:

1. **No single source of truth** — dimensions were independent constants that happened to work together, but the relationships were implicit and undocumented.
2. **Incomplete layer model** — v1.x supported only 2 layers (network, subnet). Real cloud architectures need 6 layers (global → edge → region → zone → subnet → resource).
3. **Limited categories** — 8 categories missed analytics, identity, and observability — three of the fastest-growing cloud domains.
4. **Category-based coloring** — all compute blocks were the same color regardless of provider, making multi-cloud diagrams visually ambiguous.
5. **No aggregation** — representing 50 identical instances required 50 individual blocks.
6. **No zoom scalability** — the pixel-coupled unit system couldn't adapt to different render targets (e.g., PDF export, thumbnail view).

The Lego specification (LDU = 0.4mm, stud pitch = 20 LDU = 8mm) demonstrates that a single base unit with ratio-derived dimensions produces a self-consistent, extensible system. We adopted this principle.

## Decision

### Adopt the CloudBlocks Universal Architecture Specification v2.0

The full specification is documented in [`docs/design/CLOUDBLOCKS_SPEC_V2.md`](../design/CLOUDBLOCKS_SPEC_V2.md). Key decisions:

### 1. CU + RENDER_SCALE unit system

Introduce **CU (Cloud Unit)** as an abstract logical unit, with a separate **RENDER_SCALE** (default: 32 px/CU) for pixel output. All visual constants derive from RENDER_SCALE via fixed ratios:

```
RENDER_SCALE = 32 px/CU  (the ONLY magic number)
├── TILE_W      = RENDER_SCALE × 2      = 64 px
├── TILE_H      = RENDER_SCALE           = 32 px
├── STUD_RX     = RENDER_SCALE × 3/8    = 12 px
├── STUD_RY     = STUD_RX / 2           = 6 px
└── STUD_HEIGHT = RENDER_SCALE × 5/32   = 5 px
```

This preserves all current pixel values while establishing a formal derivation chain.

### 2. Provider-resource-based coloring

Block colors are determined by `(provider, resourceType)` instead of category. AWS EC2 is orange (`#D86613`), Azure VM is blue (`#0078D4`), GCP Compute Engine is blue (`#4285F4`). Colors follow each provider's official icon palette.

### 3. 6-layer hierarchy

Expand from 2 layers to 6: `global → edge → region → zone → subnet → resource`. Each layer is represented by a distinct plate type with enforced nesting rules.

### 4. 10 resource categories

Expand from 8 to 10 categories, adding: `analytics`, `identity`, `observability`.

### 5. Clean start (no v1.x migration)

Schema version bumps to `2.0.0`. No automated migration from v1.x data. This avoids compromising the new model to accommodate legacy constraints.

### 6. Universal Stud Standard preserved

The INVIOLABLE stud standard (rx=12, ry=6, height=5, 3-layer structure) is preserved — now formally derived from RENDER_SCALE rather than being a standalone magic number.

## Consequences

### Positive

- **Single source of truth** — one constant (RENDER_SCALE) determines the entire visual system
- **Zoom/export scalability** — changing RENDER_SCALE adapts all dimensions proportionally
- **Multi-cloud clarity** — provider-based colors make it immediately obvious which cloud a resource belongs to
- **Complete layer model** — global and edge resources (CDN, DNS, WAF) now have proper homes
- **Aggregation** — count badges reduce visual clutter for scaled-out architectures
- **Integer-only rendering** — no sub-pixel blurring, crisp at any scale

### Negative

- **Breaking change** — v1.x diagrams are not compatible; users must recreate them
- **Larger color palette** — maintaining official colors for 3+ providers requires ongoing curation
- **Implementation scope** — touching designTokens, visualProfile, blockFaceColors, BlockSvg, PlateSvg, placement rules, connection matrix, and schema

### Related Documents

- [`docs/design/CLOUDBLOCKS_SPEC_V2.md`](../design/CLOUDBLOCKS_SPEC_V2.md) — Full v2.0 specification
- [`docs/design/BRICK_DESIGN_SPEC.md`](../design/BRICK_DESIGN_SPEC.md) — v1.x spec (superseded)
- [`docs/design/VISUAL_DESIGN_SPEC.md`](../design/VISUAL_DESIGN_SPEC.md) — v1.x visual spec (superseded)
- [ADR-0003](0003-lego-style-composition-model.md) — Lego composition model (partially superseded)
- [ADR-0005](0005-2d-first-editor-with-25d-rendering.md) — 2D-first editor (still valid)

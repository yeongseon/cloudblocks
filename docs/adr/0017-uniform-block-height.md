# ADR-0017: Uniform Block Height Across Resource Categories

**Status**: Accepted
**Date**: 2026-04
**Related**: [#1596](https://github.com/yeongseon/cloudblocks/issues/1596), [Epic #1590](https://github.com/yeongseon/cloudblocks/issues/1590)

## Context

CloudBlocks defines five block tiers (`micro`, `small`, `medium`, `large`, `wide`) with corresponding grid dimensions, but currently maps all eight resource categories to the `medium` tier (2×2×2 CU). A UX checklist (§3-1.2) raised the question of whether categories should have distinct heights for visual differentiation.

The current visual differentiation strategy relies on **silhouettes** (Phase 3, #1580):

| Category   | Silhouette |
| ---------- | ---------- |
| compute    | rect       |
| data       | cylinder   |
| delivery   | gateway    |
| security   | shield     |
| messaging  | hex        |
| network    | rect       |
| identity   | circle     |
| operations | rect       |

Additionally, each category has a distinct color via the theme token system. Together, silhouette + color already provide strong visual category differentiation.

## Decision

**Option A: Keep uniform height (chosen).**

All resource categories remain mapped to the `medium` tier in `CATEGORY_TIER_MAP`. The `SUBTYPE_SIZE_OVERRIDES` record remains empty.

Rationale:

1. **Silhouettes already differentiate.** Six distinct shapes across eight categories provide immediate visual category recognition without relying on height.
2. **Grid alignment.** Uniform height ensures all blocks snap to the same grid and ports align predictably. Mixed heights would require complex snapping logic and risk breaking the Universal Port Standard (rx=12, ry=6, h=5).
3. **Container layout.** Uniform block height simplifies container auto-sizing calculations. Variable heights would require per-child height tracking for container frame expansion.
4. **Cognitive simplicity.** Users learn one block size. Height variation would add a dimension of meaning (what does "taller" mean?) without clear semantic justification.

Rejected alternatives:
- **Option B (Category-based heights)** — Map categories to different tiers. Risk: breaks grid alignment, complicates container layout, adds cognitive overhead for minimal UX benefit given existing silhouette/color differentiation.

## Consequences

### Positive

- Grid snapping remains simple — one height for all resource blocks.
- Universal Port Standard is trivially preserved — no height-dependent port calculations needed.
- Container auto-sizing calculations remain straightforward.
- Tier infrastructure (`BlockTier`, `TIER_DIMENSIONS`, `SUBTYPE_SIZE_OVERRIDES`) is preserved for future use if a specific subtype needs a size override.

### Negative

- Height cannot be used as a visual signal for category or importance. This is acceptable because silhouette + color already fill that role.

### When to Revisit

- If a new resource subtype has a genuine need for a different size (e.g., a wide dashboard widget), use `SUBTYPE_SIZE_OVERRIDES` for targeted overrides rather than changing the category-wide mapping.
- If user research indicates that silhouette + color differentiation is insufficient, reconsider category-based heights with proper grid alignment validation.

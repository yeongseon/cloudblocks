# ADR-0016: Connection Type Taxonomy Alignment

**Status**: Accepted
**Date**: 2026-04
**Related**: [#1595](https://github.com/yeongseon/cloudblocks/issues/1595), [Epic #1590](https://github.com/yeongseon/cloudblocks/issues/1590)

## Context

The visual editor uses two type systems for connections:

1. **Legacy `ConnectionType`** (v3) — `dataflow`, `http`, `internal`, `data`, `async`. Used by `connectionVisualTokens.ts` for stroke styles. Deprecated in schema.
2. **Current `EndpointSemantic`** (v4) — `http`, `event`, `data`. Used by the endpoint-based connection model.

A UX checklist proposed a third taxonomy (`ingress`, `internal`, `data`, `management`) but this would require breaking schema changes with no proportional user benefit.

The properties panel currently displayed raw semantic strings (e.g., "http", "event", "data") without user-friendly labels, reducing UI polish and clarity.

## Decision

**Option A: Alias mapping (chosen).**

Keep the existing schema types unchanged. Add a display label layer (`connectionTypeLabels.ts`) that maps raw enum values to human-readable names in the UI. This preserves all saved workspaces, avoids schema migration, and makes the UI more accessible without backend changes.

### Implementation

- Create `apps/web/src/shared/tokens/connectionTypeLabels.ts` with two mapping exports:
  - `CONNECTION_TYPE_LABELS: Record<ConnectionType, string>` — Maps legacy types to display names
  - `ENDPOINT_SEMANTIC_LABELS: Record<EndpointSemantic, string>` — Maps current types to display names
  - `resolveSemanticLabel(semantic: EndpointSemantic | string | undefined): string` — Helper for safe resolution with fallback to raw value
- Update `PropertiesDrawerPanel.tsx` to use `resolveSemanticLabel()` when rendering connection semantic in the properties panel and connection summary items
- Full test coverage (100%) for all label mappings and the resolution helper

### Rejected Alternatives

- **Option B (Schema migration)** — Replace `EndpointSemantic` with new taxonomy. Breaking change to saved workspaces, requires migration, disproportionate risk for cosmetic improvement.
- **Option C (Hybrid)** — Add new enum types alongside old ones. Increases schema complexity without clear benefit; creates confusion about which type to use.

## Consequences

### Positive

- No breaking changes to saved workspaces or schema versioning.
- UI shows clear, human-readable labels ("HTTP", "Data", "Event") instead of raw enum values.
- Single source of truth for display names in `connectionTypeLabels.ts` — future UI improvements need only update this file.
- Label values are independently testable; resolveSemanticLabel() has graceful fallback for unknown types.
- Supports future taxonomy refinements without code changes — additional aliases can be added to the mappings.

### Negative

- Legacy `ConnectionType` labels remain in code alongside `EndpointSemantic` labels until the deprecated type is fully removed from the schema.
- Minor indirection when rendering — semantic values must be resolved through the label function instead of displayed directly.

### Neutral

- The UX checklist's proposed taxonomy terms (`ingress`, `internal`, `data`, `management`) can be introduced as additional aliases in a future label refinement without schema changes.
- No impact on connection validation, rendering, or code generation — this is purely a display-layer concern.

## Related Documents

- [Domain Model §5 — Connection Types](../model/DOMAIN_MODEL.md) — Overview of EndpointSemantic and ConnectionType
- [Issue #1595](https://github.com/yeongseon/cloudblocks/issues/1595) — GitHub tracking issue
- [Epic #1590](https://github.com/yeongseon/cloudblocks/issues/1590) — UX Polish Epic (parent issue)

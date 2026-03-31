# ADR-0015: ExternalActor-to-Block Migration

**Status**: Accepted
**Date**: 2026-03
**Related**: [Epic #1533](https://github.com/yeongseon/cloudblocks/issues/1533)

## Context

CloudBlocks originally modeled external endpoints (Internet, Browser) as a separate `ExternalActor` entity with its own data path, rendering component, store actions, and connection resolution logic. This created a dual-path runtime where every system that touched blocks also had to handle actors:

| System | Block Path | Actor Path |
| --- | --- | --- |
| **Data storage** | `nodes[]` | `externalActors[]` |
| **Store actions** | `addBlock`, `removeBlock`, `moveBlock` | `addExternalActor`, `removeExternalActor`, `moveActorPosition` |
| **Rendering** | `BlockSprite` | `ExternalActorSprite` |
| **Connection resolution** | `resolveEndpointSource(id, nodes)` | `resolveEndpointSource(id, nodes, externalActors)` |
| **Positioning** | `getBlockWorldAnchors` | `EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET` (hardcoded) |
| **Templates** | `nodes[]` entries | `externalActors[]` entries |

This dual-path architecture caused:

1. **Code duplication**: Every function that resolved blocks needed an optional `externalActors?` parameter and a fallback branch.
2. **Inconsistent geometry**: Actors used a hardcoded Y-offset for connection anchors instead of proper block geometry, causing visual misalignment.
3. **Testing burden**: Every test that involved connections or rendering needed to set up both `nodes[]` and `externalActors[]` fixtures.
4. **Feature friction**: New features (diff engine, validation, code generation) each had to independently handle the actor special case.

## Decision

Fold `ExternalActor` into the standard `ResourceBlock` model. Internet and Browser become resource blocks with:

- `kind: 'resource'`
- `category: 'delivery'`
- `roles: ['external']`
- `resourceType: 'internet' | 'browser'`
- `parentId: null` (root-level, no container parent)

The migration was executed incrementally across 7 sub-issues (#1534–#1540) to maintain a working system at every step:

| Issue | Scope | Strategy |
| --- | --- | --- |
| **#1534** | Resource rules | Added `internet`/`browser` to `RESOURCE_RULES` with `isExternalResourceType()` helper |
| **#1535** | Persistence | `deserialize()` migrates legacy `externalActors[]` → `ResourceBlock` nodes transparently |
| **#1536** | Store | Added `addExternalBlock()`, introduced bridge pattern for dual-path resolution |
| **#1537** | Connections | Shared `endpointResolver.ts` with `resolveEndpointSource()` normalizing both paths |
| **#1538** | Templates | All 6 templates + `createBlankArchitecture()` use `ResourceBlock` entries for externals |
| **#1539** | Rendering | `SceneCanvas` renders externals as `BlockSprite` with full block geometry |
| **#1540** | Cleanup | Removed all runtime ExternalActor references, deleted `ExternalActorSprite`, simplified all signatures |

### Backward Compatibility

The `ExternalActor` TypeScript interface and `migrateExternalActorsToBlocks()` function are preserved in the schema/persistence layer (`packages/schema/src/model.ts`, `apps/web/src/shared/types/schema.ts`). Workspaces saved before the migration are automatically converted on load. No user action is required.

### Code Generation

External blocks are excluded from infrastructure-as-code output via `isExternalResourceType()` filters in all three generators (Terraform, Bicep, Pulumi). Internet and Browser are architectural boundary markers, not deployable resources.

## Consequences

### Positive

- **Single code path**: All systems (store, rendering, connections, validation, diff, code generation) use one unified `nodes[]` collection. No more `externalActors?` optional parameters.
- **Correct geometry**: External blocks use the same `getBlockWorldAnchors` + `getBlockDimensions` pipeline as all other blocks, eliminating visual misalignment.
- **Reduced code**: #1540 alone removed 2,258 lines and deleted 3 files (ExternalActorSprite component, CSS, tests).
- **Simplified testing**: Test fixtures only need `nodes[]` — no separate actor setup.
- **Future-proof**: Any new external endpoint type (e.g., "Mobile Client", "IoT Device") is just another `ResourceBlock` with `roles: ['external']`.

### Negative

- **Schema migration code persists**: The `ExternalActor` interface and migration function remain in the codebase indefinitely for backward compatibility with saved workspaces.
- **Migration window complexity**: During the 7-PR migration, the codebase had mixed old/new paths, requiring careful bridge patterns to avoid regressions.

### Neutral

- **No user-facing behavior change**: Internet and Browser look and behave identically to users. The change is purely architectural.
- **Branch coverage maintained**: All 2,208 tests pass at ≥ 90.45% branch coverage after migration.

## Related Documents

- [DOMAIN_MODEL.md §6](../model/DOMAIN_MODEL.md) — Migration history and post-migration state
- [ADR-0013](0013-block-unification.md) — Block Unification (broader unification effort)
- [Epic #1533](https://github.com/yeongseon/cloudblocks/issues/1533) — GitHub tracking issue

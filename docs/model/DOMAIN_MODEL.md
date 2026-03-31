# CloudBlocks Platform — Domain Model

> **Audience**: Beginners / Contributors | **Status**: Stable — V1 Core | **Verified against**: v4.1.0 schema

> **Canonical Source Declaration**
>
> This document is the **canonical specification** for the CloudBlocks domain model. All other documentation must reference and conform to the types, field names, and relationships defined here.
>
> - **Schema types**: `packages/schema/src/` — `model.ts` (Block, ArchitectureModel), `enums.ts` (ResourceCategory, BlockKind, LayerType), `rules.ts` (RESOURCE_RULES, CanvasTier)
> - **Domain constraints**: `packages/cloudblocks-domain/src/constraints.ts` — validateContainment, validateBlockIntegrity, validateBlockPlacement
> - **Shared types**: `apps/web/src/shared/types/index.ts` re-exports from `@cloudblocks/schema`
> - **Connection rules**: `apps/web/src/entities/validation/connection.ts`
> - **Placement rules**: `apps/web/src/entities/validation/placement.ts`
> - **Serialization format**: `apps/web/src/shared/types/schema.ts` — SCHEMA_VERSION `4.1.0`
> - **Version timelines**: `docs/concept/ROADMAP.md`
> - **Code generation pipeline**: `docs/engine/generator.md`

CloudBlocks represents cloud architecture using a **block abstraction model**. In V1, this model powers a visual cloud learning tool for beginners: guided templates and scenarios create the architecture state, the platform validates it against architectural rules, and users can export Terraform starter code to study how the design maps to infrastructure-as-code. Bicep and Pulumi remain Experimental.

---

# 1. Domain Philosophy

Cloud infrastructure is represented as a **layered containment model** composed of:

- **Blocks** — Container blocks (VNet, Subnet) and resource blocks (VM, Database, etc.)
- **Endpoints** — Typed connection points on blocks (input/output × http/event/data)
- **Connections** — Data/event flow between endpoints
- **Rules** — Compatibility and placement constraints driven by RESOURCE_RULES
- **External Actors** — External endpoints (Internet) _(deprecated — see §6)_

This model provides a visual abstraction that maps directly to real cloud resources and IaC constructs. The internal representation uses a **2D coordinate system with hierarchy** — the 2.5D isometric view is a rendering projection, not the source of truth.

### Unified Model (M19)

Prior to M19, the model used separate container and resource entities. M19 unified them into a single `Block` discriminated union:

- **ContainerBlock** (`kind: 'container'`) — holds child blocks and has a frame for rendering.
- **ResourceBlock** (`kind: 'resource'`) — a leaf resource that cannot contain children.

Both are resource types governed by the same `RESOURCE_RULES` constraint table.

---

# 2. Model Invariants

These invariants **must hold at all times** in a valid `ArchitectureModel`. Violations indicate a bug, not user error.

### 2.1 Identity Rules

| Rule                      | Description                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID Uniqueness**         | All entity IDs within an `ArchitectureModel` are globally unique. No two entities (blocks, endpoints, connections, external actors) share an ID.                                                                                  |
| **ID Format**             | IDs follow the pattern `{type}-{uuid}` where type is `block`, `conn`, or `ext`. Example: `block-a1b2c3`, `block-d4e5f6`. Endpoint IDs use the deterministic format `endpoint-{blockId}-{direction}-{semantic}`.                   |
| **ID Immutability**       | Once assigned, an entity's ID never changes. IDs are stable across save/load cycles.                                                                                                                                              |
| **Referential Integrity** | All ID references must resolve. `parentId` must reference an existing `ContainerBlock` or be `null` (root). `Connection.from` and `Connection.to` must reference valid endpoint IDs whose parent blocks exist in the model. |

### 2.2 Structural Invariants

| Rule                      | Description                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root Blocks**           | An `ArchitectureModel` has one or more root blocks (`parentId: null`). Root blocks include `ContainerBlock` with `virtual_network` as well as 14 resource types that allow root placement (see `ROOT_ALLOWED_RESOURCE_TYPES` in `placement.ts`): `public_ip`, `dns_zone`, `cdn_profile`, `front_door`, `blob_storage`, `managed_identity`, `service_account`, `function_compute`, `app_service`, `container_instances`, `cosmos_db`, `key_vault`, `identity_access`, and `virtual_network`. |
| **Containment Hierarchy** | `ContainerBlock`s form a strict tree: `virtual_network` (root) → `subnet` (child). No cycles. Validated by `RESOURCE_RULES.allowedParents`.                                                                                                                                                                                                                            |
| **Resource Placement**    | A `ResourceBlock`'s `parentId` references a `ContainerBlock` or is `null` for root-allowed types. Allowed parents are determined by `RESOURCE_RULES.allowedParents`. Most resources require a `subnet` parent; messaging resources (`message_queue`, `event_hub`) require `virtual_network`; root-allowed resources can have `parentId: null`.                           |
| **Kind Consistency**      | A block's `kind` must be consistent with its `resourceType`. Only `containerCapable` resource types can be `kind: 'container'`. Validated by `validateBlockIntegrity()`.                                                                                                                                                                                                |

### 2.3 Connection Invariants

| Rule                          | Description                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No Self-Connections**       | A connection's source and target must reference different blocks. The block resolved from `connection.from` must differ from the block resolved from `connection.to`. |
| **No Duplicate Connections**  | At most one connection per ordered (source block, target block) pair.                                                                                           |
| **Receiver-Only Enforcement** | `data`, `security`, `operations`, `identity`, and `network` resources never appear as connection sources. They are receiver-only.                                |
| **Messaging Bidirectional**   | `messaging` resources can both send to and receive from `compute`.                                                                                              |

---

# 3. Block

The unified type for all architecture elements — both container blocks (VNet, Subnet) and resource blocks (VM, Database, etc.).

### 3.1 BlockBase (shared fields)

```typescript
interface BlockBase {
  id: string;
  name: string;
  kind: BlockKind; // 'container' | 'resource'
  layer: LayerType; // 'global' | 'edge' | 'region' | 'zone' | 'subnet' | 'resource'
  resourceType: string; // e.g. 'virtual_network', 'web_compute', 'relational_database'
  category: ResourceCategory; // 'network' | 'delivery' | 'compute' | 'data' | 'messaging' | 'security' | 'identity' | 'operations'
  provider: ProviderType; // 'azure' | 'aws' | 'gcp'
  parentId: string | null; // parent ContainerBlock ID, null for root
  position: Position; // { x, y, z }
  metadata: Record<string, unknown>;
  config?: Record<string, unknown>; // provider-specific configuration
  subtype?: string; // e.g. 'linux' for compute, 'postgresql' for data
  aggregation?: Aggregation; // cluster/scaling (mode + count)
  roles?: BlockRole[]; // visual-only role indicators
  profileId?: string; // visual profile preset identifier
  canvasTier?: CanvasTier; // 'shared' | 'web' | 'app' | 'data' — visual grouping
}
```

### 3.2 ContainerBlock

Holds child blocks. Rendered as a container block with ports.

```typescript
export interface ContainerBlock extends BlockBase {
  kind: 'container';
  resourceType: ContainerCapableResourceType; // 'virtual_network' | 'subnet'
  frame: Size; // { width, height, depth }
}
```

### 3.3 ResourceBlock

A leaf resource block.

```typescript
export interface ResourceBlock extends BlockBase {
  kind: 'resource';
}
```

### 3.4 Block Union

```typescript
export type Block = ContainerBlock | ResourceBlock;
```

Discriminant: the `kind` field (`'container'` or `'resource'`).

### 3.5 Deprecated Aliases

```typescript
/** @deprecated Use ContainerBlock instead. */
export type LegacyContainerBlock = ContainerBlock;

/** @deprecated Use ResourceBlock instead. */
export type LegacyResourceBlock = ResourceBlock;
```

---

# 4. RESOURCE_RULES

Single source of truth for resource type constraints. Defined in `packages/schema/src/rules.ts`.

### 4.1 Rule Entry

```typescript
export interface ResourceRuleEntry {
  readonly containerCapable: boolean;
  readonly allowedParents: readonly (string | null)[];
  readonly category: ResourceCategory;
  readonly canvasTier: CanvasTier;
}
```

### 4.2 Resource Type Table

| Resource Type            | Container? | Allowed Parents   | Category   | Canvas Tier |
| ------------------------ | ---------- | ----------------- | ---------- | ----------- |
| `virtual_network`        | ✅         | `null` (root)     | network    | shared      |
| `subnet`                 | ✅         | `virtual_network` | network    | shared      |
| `nat_gateway`            | ❌         | `subnet`          | network    | shared      |
| `public_ip`              | ❌         | `null` (root)     | network    | shared      |
| `route_table`            | ❌         | `subnet`          | network    | shared      |
| `private_endpoint`       | ❌         | `subnet`          | network    | shared      |
| `dns_zone`               | ❌         | `null` (root)     | delivery   | web         |
| `cdn_profile`            | ❌         | `null` (root)     | delivery   | web         |
| `front_door`             | ❌         | `null` (root)     | delivery   | web         |
| `application_gateway`    | ❌         | `subnet`          | delivery   | web         |
| `internal_load_balancer` | ❌         | `subnet`          | delivery   | web         |
| `load_balancer`          | ❌         | `subnet`          | delivery   | web         |
| `outbound_access`        | ❌         | `subnet`          | delivery   | web         |
| `function_compute`       | ❌         | `subnet`, `null`  | compute    | app         |
| `app_service`            | ❌         | `subnet`, `null`  | compute    | app         |
| `container_instances`    | ❌         | `subnet`, `null`  | compute    | app         |
| `virtual_machine`        | ❌         | `subnet`          | compute    | app         |
| `kubernetes_cluster`     | ❌         | `subnet`          | compute    | app         |
| `web_compute`            | ❌         | `subnet`          | compute    | web         |
| `app_compute`            | ❌         | `subnet`          | compute    | app         |
| `blob_storage`           | ❌         | `null` (root)     | data       | data        |
| `sql_database`           | ❌         | `subnet`          | data       | data        |
| `cosmos_db`              | ❌         | `subnet`, `null`  | data       | data        |
| `relational_database`    | ❌         | `subnet`          | data       | data        |
| `cache_store`            | ❌         | `subnet`          | data       | data        |
| `key_vault`              | ❌         | `subnet`, `null`  | security   | shared      |
| `bastion_host`           | ❌         | `subnet`          | security   | shared      |
| `firewall_security`      | ❌         | `subnet`          | security   | shared      |
| `network_security_group` | ❌         | `subnet`          | security   | shared      |
| `secret_store`           | ❌         | `subnet`          | security   | shared      |
| `identity_access`        | ❌         | `subnet`, `null`  | identity   | shared      |
| `managed_identity`       | ❌         | `null` (root)     | identity   | shared      |
| `service_account`        | ❌         | `null` (root)     | identity   | shared      |
| `monitoring`             | ❌         | `subnet`          | operations | shared      |
| `message_queue`          | ❌         | `virtual_network` | messaging  | app         |
| `event_hub`              | ❌         | `virtual_network` | messaging  | app         |

### 4.3 Derived Types

```typescript
export type ResourceType = keyof typeof RESOURCE_RULES; // all 36 types
export type ContainerCapableResourceType = 'virtual_network' | 'subnet';
export type LeafOnlyResourceType = Exclude<ResourceType, ContainerCapableResourceType>;
```

### 4.4 Runtime Helpers

```typescript
export function isContainerCapable(resourceType: string): boolean;
export function getAllowedParents(resourceType: string): readonly (string | null)[] | undefined;
export function getCanvasTier(resourceType: string): CanvasTier | undefined;
export function getDefaultCategory(resourceType: string): ResourceCategory | undefined;
```

---

# 5. Endpoint & Connection Model

In v4, connections use an **endpoint-based model**. Each block has typed connection points (endpoints), and connections link an output endpoint to an input endpoint.

### 5.1 Endpoint

An endpoint is a typed connection point on a block. Every block auto-generates 6 endpoints (3 semantics × 2 directions). Endpoint IDs are deterministic to prevent diff churn.

```typescript
export interface Endpoint {
  id: string; // "endpoint-{blockId}-{direction}-{semantic}"
  blockId: string;
  direction: EndpointDirection; // 'input' | 'output'
  semantic: EndpointSemantic; // 'http' | 'event' | 'data'
}
```

**Endpoint ID format**: `endpoint-{blockId}-{direction}-{semantic}`

Example: `endpoint-block-a1b2c3-output-http`

Endpoint generation is deterministic — given a block ID, the 6 endpoints are always the same. See `generateEndpointsForBlock()` in `packages/schema/src/endpoints.ts`.

### 5.2 Connection

A connection links an output endpoint on one block to an input endpoint on another.

```typescript
export interface Connection {
  id: string;
  from: string; // output endpoint ID
  to: string; // input endpoint ID
  metadata: Record<string, unknown>;
}
```

> **v3 → v4 migration**: The v3 `Connection` had `sourceId`, `targetId`, and `type: ConnectionType` fields. In v4, `from`/`to` are endpoint ID strings, and the connection semantic is encoded in the endpoint itself. The `ConnectionType` enum is `@deprecated` and kept only for migration. See `LegacyConnection` in `model.ts`.

### 5.3 Connection Rules

| Source (Initiator) | Allowed Targets (Receiver)                    |
| ------------------ | --------------------------------------------- |
| `internet`         | `delivery`                                    |
| `delivery`         | `compute`                                     |
| `compute`          | `data`, `operations`, `security`, `messaging` |
| `messaging`        | `compute`                                     |

**Receiver-only**: `data`, `security`, `operations`, `identity`, and `network` never initiate connections.

### 5.4 Endpoint Semantics

| Semantic | Description                                     | Legacy ConnectionType Mapping |
| -------- | ----------------------------------------------- | ----------------------------- |
| `http`   | HTTP request/response path                      | `http`                        |
| `event`  | Asynchronous trigger / queue-driven             | `async`                       |
| `data`   | Data access, internal service, general dataflow | `dataflow`, `internal`, `data` |

### 5.5 Helper Functions

```typescript
// Generate deterministic endpoint ID
export function endpointId(blockId: string, direction: EndpointDirection, semantic: EndpointSemantic): string;

// Generate all 6 endpoints for a block
export function generateEndpointsForBlock(blockId: string): Endpoint[];

// Map legacy ConnectionType to EndpointSemantic (migration)
export function connectionTypeToSemantic(type: string): EndpointSemantic;

// Parse endpoint ID back to components
export function parseEndpointId(epId: string): { blockId: string; direction: EndpointDirection; semantic: EndpointSemantic } | null;

// Resolve v4 connection to source/target block IDs (for UI compatibility)
export function resolveConnectionNodes(conn: { from: string; to: string }): { sourceId: string; targetId: string; type: string };
```

---

# 6. External Actor

> **@deprecated — Active Migration (Epic #1533)**: ExternalActors are being folded into standard resource blocks. Migration progress:
>
> - **#1534 (Resource Rules)**: Added `internet`/`browser` entries to `RESOURCE_RULES` with `category: 'delivery'`, `roles: ['external']`, `allowedParents: [null]`. Added `isExternalResourceType()` helper and `EXTERNAL_RESOURCE_TYPES` constant.
> - **#1535 (Persistence Migration)**: `serialize()` materializes remaining `externalActors` into `ResourceBlock` nodes (with `kind: 'resource'`, `category: 'delivery'`, `roles: ['external']`). `deserialize()` migrates legacy `externalActors[]` via `migrateExternalActorsToBlocks()`, preserving actor IDs.
> - **#1536 (Store Unification)**: Added `addExternalBlock()` store action that creates external blocks as root-level `ResourceBlock` nodes in `nodes[]`. Legacy shims (`addExternalActor`, `removeExternalActor`, `moveActorPosition`) remain operational on `externalActors[]` for rendering compatibility. `addConnection` resolves endpoints from **both** `nodes[]` and `externalActors[]` via a bridge pattern. `getEffectiveEndpointType()` maps external blocks to their `resourceType` as `EndpointType` (not `category`). `createBlankArchitecture()` still creates `externalActors` (deferred to #1538).
>
> The `ExternalActor` interface is kept for backward compatibility during the migration window.

An External Actor represents an endpoint outside the architecture. After migration, these become `ResourceBlock` nodes with `roles: ['external']` and `resourceType: 'internet' | 'browser'`.

```typescript
/** @deprecated Folded into blocks in v4. Kept for v3→v4 migration. */
export interface ExternalActor {
  id: string;
  name: string; // e.g., "Internet"
  type: 'internet' | 'browser';
  position: Position;
}
```

After persistence migration (#1535), external actors are stored as regular resource blocks:

```typescript
// Migration helper — converts ExternalActor[] to ResourceBlock[]
export function migrateExternalActorsToBlocks(
  externalActors: ExternalActor[],
  existingNodeIds: ReadonlySet<string>,
  provider: 'azure' | 'aws' | 'gcp',
): ResourceBlock[];
```

### 6.1 Store Bridge Pattern (#1536)

During the migration window, two parallel data paths coexist in the architecture store:

| Path | Collection | APIs | Used By |
| --- | --- | --- | --- |
| **Legacy** (active for rendering) | `externalActors[]` | `addExternalActor`, `removeExternalActor`, `moveActorPosition` | `SceneCanvas`, `ExternalActorSprite`, `SidebarPalette` |
| **New** (forward-looking) | `nodes[]` | `addExternalBlock`, `addNode({parentId: null})`, `moveBlockPosition({parentId: null})` | `BlockSprite` (connect mode), `addConnection` |

**Bridge**: `addConnection` resolves source/target blocks from **both** `nodes[]` and `externalActors[]`. The `getEffectiveEndpointType()` helper maps external `ResourceBlock` nodes to their `resourceType` (`'internet'` or `'browser'`) as `EndpointType`, preserving connection rule semantics.

```typescript
// Store action — creates external block as root-level ResourceBlock in nodes[]
addExternalBlock: (type: 'internet' | 'browser', position?: Position) => void;

// Helper — maps external blocks to EndpointType for connection rules
function getEffectiveEndpointType(block: ResourceBlock): EndpointType {
  if (isExternalResourceType(block.resourceType)) {
    return block.resourceType as EndpointType; // 'internet' | 'browser'
  }
  return block.category; // ResourceCategory for normal blocks
}
```

All legacy shims are annotated `@deprecated` with `#1540` as the removal target. The rendering migration (#1539) will switch `SceneCanvas` to read from `nodes[]`, after which the legacy path can be removed.
---

# 7. Rule Engine

Rules define **compatibility and placement constraints**. All placement rules are derived from `RESOURCE_RULES`.

### 7.1 Placement Rules

Placement validation is implemented in `apps/web/src/entities/validation/placement.ts`. Rules are derived from `RESOURCE_RULES` at module load time via `buildCategoryPlacementMap()`.

The placement engine also maintains a `ROOT_ALLOWED_RESOURCE_TYPES` set (built from `buildRootAllowedResourceTypes()`) that identifies which resource types can be placed at root level (`parentId: null`). Currently 14 resource types plus `virtual_network` allow root placement — see the Resource Type Table in §4.2 for which types have `null` in their `allowedParents`.

| Category     | Typical Parent             | Notes                                                         |
| ------------ | -------------------------- | ------------------------------------------------------------- |
| `network`    | `null` or `virtual_network` | `virtual_network` and `public_ip` at root; others on subnet |
| `delivery`   | `subnet` or `null`         | `dns_zone`, `cdn_profile`, `front_door` at root; others on subnet |
| `compute`    | `subnet` or `null`         | `function_compute`, `app_service`, `container_instances` allow root |
| `data`       | `subnet` or `null`         | `blob_storage`, `cosmos_db` allow root                       |
| `security`   | `subnet` or `null`         | `key_vault` allows root                                       |
| `identity`   | `null` or `subnet`         | `managed_identity`, `service_account` at root; `identity_access` allows both |
| `operations` | `subnet`                   | —                                                             |
| `messaging`  | `virtual_network`          | —                                                             |

### 7.2 Containment Rules

Containment validation is implemented in `packages/cloudblocks-domain/src/constraints.ts`.

```typescript
// Validate parent-child relationship against RESOURCE_RULES.allowedParents
export function validateContainment(
  child: Block,
  parent: Block | null | undefined,
): ContainmentError | null;

// Validate kind vs resourceType consistency (containerCapable check)
export function validateBlockIntegrity(block: Block): BlockIntegrityError[];

// Combined: both containment + integrity in one call
export function validateBlockPlacement(
  block: Block,
  allBlocks: readonly Block[],
): (BlockIntegrityError | ContainmentError)[];
```

### 7.3 Validation Result

```typescript
interface ValidationError {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  blockId: string;
}
```

---

# 8. Visual Identity Model

Blocks use **visual characteristics** to communicate function in the isometric view.

> **Canonical specification**: For detailed SVG specs and pixel dimensions, see [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md).

### 2-Layer Visual Hierarchy

| Layer         | Element                                                 | Purpose                               |
| ------------- | ------------------------------------------------------- | ------------------------------------- |
| **Container** | Container block frame (3 tiers: S/M/L)                  | Network boundaries (VNet, Subnet)     |
| **Resource**  | Resource block (5 tiers: micro/small/medium/large/wide) | Cloud resources (compute, data, etc.) |

### Resource Color Coding (8 Categories)

| Category     | Hex Color |
| ------------ | --------- |
| `compute`    | `#F25022` |
| `data`       | `#00A4EF` |
| `delivery`   | `#0078D4` |
| `security`   | `#D6232C` |
| `messaging`  | `#737373` |
| `operations` | `#693BC5` |
| `network`    | `#6366F1` |
| `identity`   | `#00B294` |

---

# 9. ArchitectureModel

The root type — the canonical JSON wire format.

```typescript
export interface ArchitectureModel {
  id: string;
  name: string;
  version: string; // user-facing revision counter
  nodes: Block[]; // all container blocks and resource blocks in a flat array
  endpoints: Endpoint[]; // all endpoints for all blocks
  connections: Connection[]; // endpoint-to-endpoint connections
  /** @deprecated Folded into blocks in v4. Kept for v3→v4 migration loading. */
  externalActors?: ExternalActor[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

Note: The model uses a flat `nodes[]` array. Containment hierarchy is expressed through `parentId` references, not nesting. The `endpoints[]` array contains all connection points for all blocks — typically 6 per block (3 semantics × 2 directions).

---

# 10. Schema Versioning

### Schema Version

The storage format uses `schemaVersion` (currently `"4.1.0"`) to track the serialization shape. This is **separate** from `ArchitectureModel.version`, which is a user-facing architecture revision counter.

| Field                       | Purpose                                     | Canonical Source                                         |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `schemaVersion`             | Storage format version — enables migrations | `apps/web/src/shared/types/schema.ts` → `SCHEMA_VERSION` |
| `ArchitectureModel.version` | User-facing revision counter                | `packages/schema/src/model.ts`                           |

The `schemaVersion` is stored in the serialized `SerializedData` wrapper, not inside `ArchitectureModel` itself. Supported versions for migration: `4.1.0` (current), `4.0.0`, `3.0.0`, `2.0.0`. Legacy versions `0.1.0` and `0.2.0` are rejected (no migration path).

### Migration Policy

- Any change to frozen fields requires bumping `SCHEMA_VERSION`.
- The `deserialize()` function in `schema.ts` must detect version mismatches and either migrate or reject.
- Additive changes (new optional fields with defaults) may be introduced without a version bump.
- Destructive changes (field renames, type changes, removals) always require a version bump and a migration function.

### Active Migrations

| Migration | Trigger | Source | Target | Helper |
| --- | --- | --- | --- | --- |
| v3 plates+blocks → v4 nodes | `plates[]` present in data | v2.0.0 / v3.0.0 | v4.0.0 | `deserialize()` inline |
| v3 ConnectionType → v4 Endpoints | `type` field on Connection | v3.0.0 | v4.0.0 | `connectionTypeToSemantic()` |
| Legacy 10-category → 7-category | Old category names | v2.0.0 | v4.0.0 | `deserialize()` inline |
| ExternalActor → ResourceBlock | `externalActors[]` present | any | v4.0.0 | `migrateExternalActorsToBlocks()` |

> **ExternalActor migration (#1535)**: Detects by data presence (`externalActors[]` exists), not by `schemaVersion`. Actor IDs are preserved as block IDs so connections remain valid without remapping. `serialize()` also materializes actors to ensure saved JSON is self-contained.

---

# 11. Code Generation Model

> **Canonical source**: The code generation pipeline is fully specified in [`generator.md`](../engine/generator.md).

CloudBlocks transforms visual architecture into deployable infrastructure code through a multi-stage pipeline:

```
Architecture Model → Normalize → Validate → Provider Map → Generate → Format → Output
```

Supported generators: Terraform (HCL), Bicep (ARM), Pulumi (TypeScript).

---

# 12. Provider Abstraction

CloudBlocks uses a **provider abstraction layer** for multi-cloud support. Azure is the primary target for v1.

Each `resourceType` maps to provider-specific resources through the adapter layer:

```
resourceType: web_compute → Azure: "Microsoft.Web/sites"
resourceType: relational_database → Azure: "Microsoft.Sql/servers/databases"
```

Adding AWS/GCP support requires only new adapter entries, not schema changes. See [provider.md](../engine/provider.md).

---

# 13. Summary

Key concepts:

```
ContainerBlock   → Network boundary (VNet, Subnet)
ResourceBlock    → Cloud resource (compute, data, delivery, security, identity...)
Block            → Discriminated union of ContainerBlock | ResourceBlock
Endpoint         → Typed connection point on a block (input/output × http/event/data)
Connection       → Endpoint-to-endpoint data/event flow
External Actor   → External endpoint (Internet) — @deprecated
RESOURCE_RULES   → Single source of truth for constraints
Provider Adapter → Cloud-specific resource mapping
Generator        → IaC code output (Terraform / Bicep / Pulumi)
```

Visual hierarchy:

```
ResourceBlock (micro → wide)        ← Resource layer
    ↓ placed on
ContainerBlock (S/M/L frame)        ← Network layer
```

This model enables:

- Visual architecture design in a 2.5D isometric environment
- Constraint validation driven by a single RESOURCE_RULES table
- Automated code generation from architecture graph
- Multi-cloud abstraction with Azure-first v1 scope
- Git-native workflow integration

---

# 14. Design Goals

The architecture model (DSL) is designed around four principles:

1. **Provider-neutral modeling** — Infrastructure is described independently of cloud vendors
2. **Visual-first composition** — The visual diagram is the primary authoring surface
3. **Deterministic generation** — Same architecture model always produces the same IaC output
4. **Rule-based validation** — Constraints are checked before code is generated

The architecture graph can be read as a directed flow:

```
internet → delivery → compute → data
                          → messaging → compute
```

This graph is consumed by the **rule engine** (validates constraints) and the **generator** (produces IaC code).

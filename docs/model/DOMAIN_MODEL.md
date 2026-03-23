# CloudBlocks Platform — Domain Model

> **Canonical Source Declaration**
>
> This document is the **canonical specification** for the CloudBlocks domain model. All other documentation must reference and conform to the types, field names, and relationships defined here.
>
> - **Schema types**: `packages/schema/src/` — `model.ts` (ResourceNode, ArchitectureModel), `enums.ts` (ResourceCategory, NodeKind, LayerType), `rules.ts` (RESOURCE_RULES, CanvasTier)
> - **Domain constraints**: `packages/cloudblocks-domain/src/constraints.ts` — validateContainment, validateNodeIntegrity, validateNodePlacement
> - **Shared types**: `apps/web/src/shared/types/index.ts` re-exports from `@cloudblocks/schema`
> - **Connection rules**: `apps/web/src/entities/validation/connection.ts`
> - **Placement rules**: `apps/web/src/entities/validation/placement.ts`
> - **Serialization format**: `apps/web/src/shared/types/schema.ts` — SCHEMA_VERSION `3.0.0`
> - **Version timelines**: `docs/concept/ROADMAP.md`
> - **Code generation pipeline**: `docs/engine/generator.md`

CloudBlocks represents cloud architecture using a **resource node abstraction model**. Users visually construct cloud systems in a 2.5D isometric environment, the platform validates them against architectural rules, and generates deployable infrastructure code (Terraform, Bicep, Pulumi).

---

# 1. Domain Philosophy

Cloud infrastructure is represented as a **layered containment model** composed of:

- **ResourceNodes** — Container nodes (VNet, Subnet) and leaf resource nodes (VM, Database, etc.)
- **Connections** — Typed data/event flow between resources
- **Rules** — Compatibility and placement constraints driven by RESOURCE_RULES
- **External Actors** — External endpoints (Internet)

This model provides a visual abstraction that maps directly to real cloud resources and IaC constructs. The internal representation uses a **2D coordinate system with hierarchy** — the 2.5D isometric view is a rendering projection, not the source of truth.

### Unified Model (M19)

Prior to M19, the model used separate `Plate` and `Block` entities. M19 unified them into a single `ResourceNode` discriminated union:

- **ContainerNode** (`kind: 'container'`) — replaces Plate. Holds child nodes, has a size for rendering.
- **LeafNode** (`kind: 'resource'`) — replaces Block. A leaf resource that cannot contain children.

Both are resource types governed by the same `RESOURCE_RULES` constraint table.

---

# 2. Model Invariants

These invariants **must hold at all times** in a valid `ArchitectureModel`. Violations indicate a bug, not user error.

### 2.1 Identity Rules

| Rule                      | Description                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID Uniqueness**         | All entity IDs within an `ArchitectureModel` are globally unique. No two entities (nodes, connections, external actors) share an ID.                                                                    |
| **ID Format**             | IDs follow the pattern `{type}-{uuid}` where type is `plate`, `block`, `conn`, or `ext`. Example: `plate-a1b2c3`, `block-d4e5f6`.                                                                       |
| **ID Immutability**       | Once assigned, an entity's ID never changes. IDs are stable across save/load cycles.                                                                                                                    |
| **Referential Integrity** | All ID references must resolve. `parentId` must reference an existing ContainerNode or be `null` (root). `Connection.sourceId` and `targetId` must reference an existing ResourceNode or ExternalActor. |

### 2.2 Structural Invariants

| Rule                      | Description                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root Nodes**            | An `ArchitectureModel` has one or more root ContainerNodes (`parentId: null`). Valid root resource types: `virtual_network`.                                                                                                |
| **Containment Hierarchy** | ContainerNodes form a strict tree: `virtual_network` (root) → `subnet` (child). No cycles. Validated by `RESOURCE_RULES.allowedParents`.                                                                                    |
| **Resource Placement**    | Every LeafNode has a `parentId` referencing a ContainerNode. Allowed parents are determined by `RESOURCE_RULES`. Most resources go on `subnet`; messaging resources (`message_queue`, `event_hub`) go on `virtual_network`. |
| **Kind Consistency**      | A node's `kind` must be consistent with its `resourceType`. Only `containerCapable` resource types can be `kind: 'container'`. Validated by `validateNodeIntegrity()`.                                                      |

### 2.3 Connection Invariants

| Rule                          | Description                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **No Self-Connections**       | `connection.sourceId !== connection.targetId`.                                                                |
| **No Duplicate Connections**  | At most one connection per ordered `(sourceId, targetId)` pair.                                               |
| **Receiver-Only Enforcement** | `data`, `security`, `operations`, and `network` resources never appear as `sourceId`. They are receiver-only. |
| **Messaging Bidirectional**   | `messaging` resources can both send to and receive from `compute`.                                            |

---

# 3. ResourceNode

The unified type for all architecture elements — both containers (VNet, Subnet) and leaf resources (VM, Database, etc.).

### 3.1 NodeBase (shared fields)

```typescript
interface NodeBase {
  id: string;
  name: string;
  kind: NodeKind; // 'container' | 'resource'
  layer: LayerType; // 'global' | 'edge' | 'region' | 'zone' | 'subnet' | 'resource'
  resourceType: string; // e.g. 'virtual_network', 'web_compute', 'relational_database'
  category: ResourceCategory; // 'network' | 'security' | 'edge' | 'compute' | 'data' | 'messaging' | 'operations'
  provider: ProviderType; // 'azure' | 'aws' | 'gcp'
  parentId: string | null; // parent ContainerNode ID, null for root
  position: Position; // { x, y, z }
  metadata: Record<string, unknown>;
  config?: Record<string, unknown>; // provider-specific configuration
  subtype?: string; // e.g. 'linux' for compute, 'postgresql' for data
  aggregation?: Aggregation; // cluster/scaling (mode + count)
  roles?: BlockRole[]; // visual-only role indicators
  subnetAccess?: SubnetAccess; // 'public' | 'private' — meaningful for subnet containers
  profileId?: string; // visual profile preset identifier
  canvasTier?: CanvasTier; // 'shared' | 'web' | 'app' | 'data' — visual grouping
}
```

### 3.2 ContainerNode

Holds child nodes. Rendered as a plate with studs.

```typescript
export interface ContainerNode extends NodeBase {
  kind: 'container';
  resourceType: ContainerCapableResourceType; // 'virtual_network' | 'subnet'
  size: Size; // { width, height, depth }
}
```

### 3.3 LeafNode

A leaf resource. Rendered as a brick.

```typescript
export interface LeafNode extends NodeBase {
  kind: 'resource';
}
```

### 3.4 ResourceNode Union

```typescript
export type ResourceNode = ContainerNode | LeafNode;
```

Discriminant: the `kind` field (`'container'` or `'resource'`).

### 3.5 Deprecated Aliases

```typescript
/** @deprecated Use ContainerNode instead. */
export type Plate = ContainerNode;

/** @deprecated Use LeafNode instead. */
export type Block = LeafNode;
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

| Resource Type         | Container? | Allowed Parents   | Category   | Canvas Tier |
| --------------------- | ---------- | ----------------- | ---------- | ----------- |
| `virtual_network`     | ✅         | `null` (root)     | network    | shared      |
| `subnet`              | ✅         | `virtual_network` | network    | shared      |
| `load_balancer`       | ❌         | `subnet`          | edge       | web         |
| `outbound_access`     | ❌         | `subnet`          | edge       | web         |
| `web_compute`         | ❌         | `subnet`          | compute    | web         |
| `app_compute`         | ❌         | `subnet`          | compute    | app         |
| `relational_database` | ❌         | `subnet`          | data       | data        |
| `cache_store`         | ❌         | `subnet`          | data       | data        |
| `firewall_security`   | ❌         | `subnet`          | security   | shared      |
| `secret_store`        | ❌         | `subnet`          | security   | shared      |
| `identity_access`     | ❌         | `subnet`          | security   | shared      |
| `monitoring`          | ❌         | `subnet`          | operations | shared      |
| `message_queue`       | ❌         | `virtual_network` | messaging  | app         |
| `event_hub`           | ❌         | `virtual_network` | messaging  | app         |

### 4.3 Derived Types

```typescript
export type ResourceType = keyof typeof RESOURCE_RULES; // all 14 types
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

# 5. Connection

Connections represent **data or event flow** between resource nodes.

Direction represents the **request initiator**. Responses flow implicitly in reverse.

### 5.1 Connection Properties

```typescript
export interface Connection {
  id: string;
  sourceId: string; // ResourceNode or ExternalActor ID (initiator)
  targetId: string; // ResourceNode or ExternalActor ID (receiver)
  type: ConnectionType; // 'dataflow' | 'http' | 'internal' | 'data' | 'async'
  metadata: Record<string, unknown>;
}
```

### 5.2 Connection Rules

| Source (Initiator) | Allowed Targets (Receiver)                    |
| ------------------ | --------------------------------------------- |
| `internet`         | `edge`                                        |
| `edge`             | `compute`                                     |
| `compute`          | `data`, `operations`, `security`, `messaging` |
| `messaging`        | `compute`                                     |

**Receiver-only**: `data`, `security`, `operations`, and `network` never initiate connections.

### 5.3 Connection Types

| Type       | Description                         | Visual Style     |
| ---------- | ----------------------------------- | ---------------- |
| `dataflow` | General request/response            | Solid line       |
| `http`     | HTTP request path                   | Thick solid line |
| `internal` | Internal service-to-service         | Short dash       |
| `data`     | Data access path                    | Long dash        |
| `async`    | Asynchronous trigger / queue-driven | Dot-dash         |

---

# 6. External Actor

An External Actor represents an endpoint outside the architecture.

```typescript
export interface ExternalActor {
  id: string;
  name: string; // e.g., "Internet"
  type: 'internet';
  position: Position;
}
```

External Actors can only be used as a source or target of a Connection — they are not ResourceNodes.

---

# 7. Rule Engine

Rules define **compatibility and placement constraints**. All placement rules are derived from `RESOURCE_RULES`.

### 7.1 Placement Rules

Placement validation is implemented in `apps/web/src/entities/validation/placement.ts`. Rules are derived from `RESOURCE_RULES` at module load time via `buildCategoryPlacementMap()`.

| Category     | Required Parent Layer      | Additional Constraint                     |
| ------------ | -------------------------- | ----------------------------------------- |
| `edge`       | `subnet`                   | Parent must have `subnetAccess: 'public'` |
| `compute`    | `subnet`                   | —                                         |
| `data`       | `subnet`                   | —                                         |
| `security`   | `subnet`                   | —                                         |
| `operations` | `subnet`                   | —                                         |
| `messaging`  | `region` (virtual_network) | —                                         |

### 7.2 Containment Rules

Containment validation is implemented in `packages/cloudblocks-domain/src/constraints.ts`.

```typescript
// Validate parent-child relationship against RESOURCE_RULES.allowedParents
export function validateContainment(
  child: ResourceNode,
  parent: ResourceNode | null | undefined,
): ContainmentError | null;

// Validate kind vs resourceType consistency (containerCapable check)
export function validateNodeIntegrity(node: ResourceNode): NodeIntegrityError[];

// Combined: both containment + integrity in one call
export function validateNodePlacement(
  node: ResourceNode,
  allNodes: readonly ResourceNode[],
): (NodeIntegrityError | ContainmentError)[];
```

### 7.3 Validation Result

```typescript
interface ValidationError {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  targetId: string;
}
```

---

# 8. Visual Identity Model

ResourceNodes use **visual characteristics** to communicate function in the isometric view.

> **Canonical specification**: For detailed SVG specs and pixel dimensions, see [CLOUDBLOCKS_SPEC_V2.md](../design/CLOUDBLOCKS_SPEC_V2.md).

### 2-Layer Visual Hierarchy

| Layer         | Element                                             | Purpose                               |
| ------------- | --------------------------------------------------- | ------------------------------------- |
| **Container** | Baseplate (3 size tiers: S/M/L)                     | Network boundaries (VNet, Subnet)     |
| **Resource**  | Brick (5 size tiers: micro/small/medium/large/wide) | Cloud resources (compute, data, etc.) |

### Resource Color Coding (7 Categories)

| Category     | Hex Color |
| ------------ | --------- |
| `compute`    | `#F25022` |
| `data`       | `#00A4EF` |
| `edge`       | `#0078D4` |
| `security`   | `#D6232C` |
| `messaging`  | `#737373` |
| `operations` | `#693BC5` |
| `network`    | `#6366F1` |

---

# 9. ArchitectureModel

The root type — the canonical JSON wire format.

```typescript
export interface ArchitectureModel {
  id: string;
  name: string;
  version: string; // user-facing revision counter
  nodes: ResourceNode[]; // all containers and resources in a flat array
  connections: Connection[];
  externalActors: ExternalActor[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

Note: The model uses a flat `nodes[]` array. Containment hierarchy is expressed through `parentId` references, not nesting.

---

# 10. Schema Versioning

### Schema Version

The storage format uses `schemaVersion` (currently `"3.0.0"`) to track the serialization shape. This is **separate** from `ArchitectureModel.version`, which is a user-facing architecture revision counter.

| Field                       | Purpose                                     | Canonical Source                                         |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `schemaVersion`             | Storage format version — enables migrations | `apps/web/src/shared/types/schema.ts` → `SCHEMA_VERSION` |
| `ArchitectureModel.version` | User-facing revision counter                | `packages/schema/src/model.ts`                           |

### Migration Policy

- Any change to frozen fields requires bumping `SCHEMA_VERSION`.
- The `deserialize()` function in `schema.ts` must detect version mismatches and either migrate or reject.
- Additive changes (new optional fields with defaults) may be introduced without a version bump.
- Destructive changes (field renames, type changes, removals) always require a version bump and a migration function.

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
ContainerNode    → Network boundary (VNet, Subnet) — rendered as plate
LeafNode         → Cloud resource (compute, data, edge, security...) — rendered as brick
ResourceNode     → Discriminated union of ContainerNode | LeafNode
Connection       → Data/Event flow (initiator direction)
External Actor   → External endpoint (Internet)
RESOURCE_RULES   → Single source of truth for constraints
Provider Adapter → Cloud-specific resource mapping
Generator        → IaC code output (Terraform / Bicep / Pulumi)
```

Visual hierarchy:

```
LeafNode (brick: micro → wide)     ← Resource layer
    ↓ placed on
ContainerNode (S/M/L baseplate)    ← Network layer
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
internet → edge → compute → data
                          → messaging → compute
```

This graph is consumed by the **rule engine** (validates constraints) and the **generator** (produces IaC code).

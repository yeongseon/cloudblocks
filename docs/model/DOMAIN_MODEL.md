# CloudBlocks Platform — Domain Model

> **Canonical Source Declaration**
>
> This document is the **canonical specification** for the CloudBlocks domain model. All other documentation must reference and conform to the types, field names, and relationships defined here.
>
> - **Milestone 1 implementation**: `apps/web/src/shared/types/index.ts` is the source of truth for TypeScript types. If a discrepancy exists between this document and the code, the code wins for Milestone 1.
> - **Serialization format**: `apps/web/src/shared/types/schema.ts` is the source of truth for storage shape and schema versioning.
> - **Connection rules**: `apps/web/src/entities/validation/connection.ts` is the source of truth for allowed connections.
> - **Version timelines**: `docs/concept/ROADMAP.md` is the canonical source for when features ship.
> - **Code generation pipeline**: `docs/engine/generator.md` is the canonical source for the generation pipeline. This document does not define the pipeline.

CloudBlocks represents cloud architecture using a **block-based spatial abstraction model**. Users visually construct cloud systems in a 2.5D isometric environment, the platform validates them against architectural rules, and generates deployable infrastructure code (Terraform, Bicep, Pulumi).

---

# 1. Domain Philosophy

Cloud infrastructure is represented as a **layered containment model** composed of:

- Plates (Infrastructure regions)
- Blocks (Cloud services)
- Connections (Data flow)
- Rules (Compatibility constraints)
- External Actors (External endpoints)

This model provides a visual abstraction that maps directly to real cloud resources and IaC constructs. The internal representation uses a **2D coordinate system with hierarchy** — the 2.5D isometric view is a rendering projection, not the source of truth.

> **Current scope note**: Compute refers to resources deployed within a Subnet (VM, Container App). Serverless categories (`function`, `queue`, `event`, `timer`) are deployed on the Network Plate.

---

# 2. Model Invariants

These invariants **must hold at all times** in a valid `ArchitectureModel`. Violations indicate a bug, not user error.

### 2.1 Identity Rules

| Rule | Description |
|------|-------------|
| **ID Uniqueness** | All entity IDs within an `ArchitectureModel` are globally unique. No two entities (plates, blocks, connections, external actors) share an ID. |
| **ID Format** | IDs follow the pattern `{type}-{uuid}` where type is `plate`, `block`, `conn`, or `ext`. Example: `plate-a1b2c3`, `block-d4e5f6`, `conn-g7h8i9`, `ext-internet`. |
| **ID Immutability** | Once assigned, an entity's ID never changes. IDs are stable across save/load cycles and are used as persistent references (e.g., `placementId`, `sourceId`, `targetId`, `children[]`). |
| **Referential Integrity** | All ID references must resolve. `Block.placementId` must reference an existing Plate. `Connection.sourceId` and `targetId` must reference an existing Block or ExternalActor. `Plate.children[]` must reference existing child Plates or Blocks. `Plate.parentId` must reference an existing Plate or be `null` (root). |

### 2.2 Structural Invariants

| Rule | Description |
|------|-------------|
| **Single Root** | An `ArchitectureModel` has exactly one root Network Plate (`parentId: null`). All other Plates and Blocks are descendants. |
| **Containment Hierarchy** | Plates form a strict tree: Network → Subnet. No cycles in the containment tree. |
| **Block Placement** | Every Block has a `placementId` referencing a Plate. `compute`, `database`, `storage`, and `gateway` are placed on Subnet Plates; `function`, `queue`, `event`, and `timer` are placed on Network Plates. Blocks cannot exist outside the hierarchy. |
| **Children Consistency** | A Plate's `children[]` must match the set of entities whose `parentId` or `placementId` references that Plate. |

### 2.3 Connection Invariants

| Rule | Description |
|------|-------------|
| **No Self-Connections** | `connection.sourceId !== connection.targetId`. |
| **No Duplicate Connections** | UI/domain store operations prevent adding duplicate ordered pairs `(sourceId, targetId)` during connection creation. |
| **No Cycles (Planned Validation)** | The intended architecture constraint is a DAG-style flow, but explicit cycle detection is planned rather than fully enforced in validation rules today. |
| **Receiver-Only Enforcement** | `database` and `storage` blocks never appear as `sourceId` in any connection. They are receiver-only. `queue`, `timer`, and `event` may appear as `sourceId` only when targeting `function`. |

---

# 3. Core Entities

## 3.1 Plate

Plates represent **spatial infrastructure regions**.

They act as containers for other elements (child Plates or Blocks).

Example hierarchy:

```
Network Plate
└ Subnet Plate (Public)
  └ Gateway Block
└ Subnet Plate (Private)
  └ Compute Block
  └ Database Block
```

### Plate Types

| Plate | Description |
|------|-------------|
| NetworkPlate | Cloud network (Azure VNet / AWS VPC) |
| SubnetPlate | Subnet within a network (Public or Private) |

### Plate Size Tiers

> **Canonical specification**: See [BRICK_DESIGN_SPEC.md](../design/BRICK_DESIGN_SPEC.md) for detailed SVG specs and pixel dimensions.

Plates are sized for **learning progression**. Each tier represents a complexity level appropriate for different learners:

| Level | Name | Subnet (Studs) | VNet (Studs) | Capacity | Learning Scenario |
|-------|------|----------------|--------------|----------|-------------------|
| 입문 (Beginner) | **S** | 4×6 | 8×12 | 1-2 blocks | First VM, basic network |
| 기초 (Basic) | **M** | 6×8 | 12×16 | 3-4 blocks | Web+DB, public/private |
| 중급 (Intermediate) | **L** | 8×10 | 16×20 | 5-6 blocks | Hub-Spoke, multi-tier |

**Learning Scenarios:**

- **입문 (S)**: "내 첫 번째 VM" — Single resource, understand VNet/Subnet basics
- **기초 (M)**: "웹서버-DB 구성" — Public/Private separation, 3-tier architecture
- **중급 (L)**: "Hub-Spoke 아키텍처" — Multi-VNet, shared services pattern

### Plate Properties

```
id            — unique identifier ({type}-{uuid})
name          — display name
type          — 'network' | 'subnet'
subnetAccess  — 'public' | 'private' (subnet only)
parentId      — parent plate ID (null for network plate)
children      — child plate/block IDs
position      — position {x, y, z} (x/z = layout plane, y = elevation)
size          — dimensions {width, height, depth}
metadata      — additional properties
```

---

# 4. Block

Blocks represent **cloud resources** (infrastructure layer).

They are placed on Plates and represent deployable infrastructure services. Each block has a **brick size** that determines its visual footprint and application capacity.

### Block Categories (Implemented)

| Category | Description |
|---------|-------------|
| ComputeBlock | Compute resources (VM, Container App) |
| DatabaseBlock | Relational or NoSQL database |
| StorageBlock | Object or file storage |
| GatewayBlock | Load balancer or gateway |
| FunctionBlock | Serverless compute |
| QueueBlock | Messaging services |
| EventBlock | Event triggers |
| TimerBlock | Scheduled triggers |

### Brick Size Tiers

> **Canonical specification**: See [BRICK_DESIGN_SPEC.md](../design/BRICK_DESIGN_SPEC.md) for detailed SVG specs and pixel dimensions.

Brick size represents **architectural weight** — the resource's importance, statefulness, and operational complexity. Larger bricks are harder to replace and more central to the architecture.

| Tier | Name | Studs | Hostable | Architectural Weight |
|------|------|-------|----------|---------------------|
| 1 | **signal** | 1×2 | No | Minimal — ephemeral triggers |
| 2 | **light** | 2×2 | Yes (1 app) | Low — stateless, replaceable |
| 3 | **service** | 2×4 | No | Medium — managed services |
| 4 | **core** | 3×4 | Yes (3-4 apps) | High — primary workload hosts |
| 5 | **anchor** | 4×6 | No (managed) | Critical — stateful data |

> **Hostable**: Can user applications (nginx, python, etc.) be placed on this resource?

**Resource → Brick Size Mapping:**

| Category | Brick Size | Hostable | Rationale |
|----------|------------|----------|-----------|
| `timer`, `event` | signal (1×2) | No | Triggers only |
| `function` | light (2×2) | Yes | Single runtime |
| `gateway`, `queue`, `storage` | service (2×4) | No | Managed services |
| `compute` | core (3×4) | Yes | Full app stack |
| `database` | anchor (4×6) | No | Cloud-managed data |

---

# 4.5 Application

Applications represent **software you operate** on cloud resources (application layer).

They are visual 1×1 cylindrical pieces that sit ON TOP of **hostable** Block bricks. Applications teach users what software runs on cloud infrastructure.

> **Key distinction**: Applications are only placed on `compute` and `function` resources. Managed services (`gateway`, `queue`, `storage`, managed `database`) are complete resources — they don't host user applications.

### Application Placement Rules

| Resource | Accepts Apps? | Rationale |
|----------|---------------|-----------|
| `compute` | ✅ Yes | VMs/containers host your software |
| `function` | ✅ Yes | Serverless hosts your handler code |
| `gateway` | ❌ No | Managed load balancer |
| `queue` | ❌ No | Managed messaging |
| `storage` | ❌ No | Managed object store |
| `database` | ❌ No | Managed database |
| `timer`, `event` | ❌ No | Triggers only |

### Managed vs Self-hosted

| Approach | Example | How to Model |
|----------|---------|--------------|
| **Managed DB** | Azure SQL, RDS | `database` block (no apps) |
| **Self-hosted DB** | PostgreSQL on VM | `compute` block + `postgres` app |

### Application Categories

| Category | Examples | Description | Placed On |
|----------|----------|-------------|-----------|
| **web-server** | nginx, apache, caddy | HTTP servers | compute |
| **runtime** | nodejs, deno, bun | JS/TS runtimes | compute, function |
| **language** | java, python, go, rust | Language runtimes | compute, function |
| **database** | postgres, mysql, redis | DB engines (self-hosted) | compute |
| **package** | npm, docker, k8s | Containers | compute |

### Application Properties

```
id        — unique identifier (e.g., "nginx", "postgres")
name      — display name (e.g., "nginx", "PostgreSQL")
category  — application category
icon      — emoji or SVG reference
color     — hex color code
```

### Application → Block Relationship

```
Application (1×1 cylinder)
    ↓ sits on
Block (brick with studs)
    ↓ placed on
Plate (baseplate)
```

Example:
```
┌──┐ ┌──┐          ← Applications: nginx, python
│🌐│ │🐍│
└──┘ └──┘
┌──────────────┐   ← Block: compute (core 3×4)
│   compute    │
└──────────────┘
┌──────────────────┐ ← Plate: Subnet
│                  │
└──────────────────┘
```

---

# 5. Block Structure

```
Block
  id            — unique identifier ({type}-{uuid})
  name          — display name
  category      — 'compute' | 'database' | 'storage' | 'gateway' | 'function' | 'queue' | 'event' | 'timer'
  placementId   — parent plate ID
  position      — position relative to parent plate {x, y, z}
  metadata      — additional properties
  provider?: ProviderType  — optional cloud provider
```

Example:

```
Block
  id: block-app01
  name: AppServer
  category: compute
  placementId: plate-subnet-private
  position: { x: 2, y: 0, z: 1 }
```

---

# 6. Connection

Connections represent **data or event flow** between blocks.

A Connection represents the **request initiation direction (initiator)**.

- The arrow indicates "who initiates the request"
- The response flows implicitly in the reverse direction
- The rule `Database → Gateway ❌` means "Database cannot directly initiate a request to Gateway"

Example:

```
Internet → Gateway → App → Database
```

### Connection Properties

```
id        — unique identifier ({type}-{uuid})
sourceId  — source block or external actor ID
targetId  — target block or external actor ID
type      — connection type
metadata  — additional properties
```

### Connection Semantics

| Property | Rule |
|----------|------|
| **Direction** | Source → Target = initiator → receiver. Responses are implicit. |
| **Cardinality** | One-to-many: a block can have multiple outgoing or incoming connections, but at most one connection per ordered `(source, target)` pair. |
| **Cycles** | Intended constraint is DAG-style flow; explicit cycle detection is planned and not yet fully enforced by current frontend validation rules. |
| **Receiver-only types** | `database` and `storage` are receiver-only — they never appear as `sourceId`. |

### Connection Types

| Type | Description |
|-----|-------------|
| `dataflow` | General request/response communication |
| `http` | HTTP request path |
| `internal` | Internal service-to-service communication |
| `data` | Data access path |
| `async` | Asynchronous trigger or queue/event-driven path |

---

# 6.1 External Actor

An External Actor represents an endpoint outside the system.

- Internet (entry point for external user traffic)

An External Actor is an external entity (not a Plate or Block) that can only be used as a source or target of a Connection.

```
id    — unique identifier ({type}-{uuid})
name  — display name (e.g., "Internet")
type  — 'internet'
```

---

# 7. Rule Engine

Rules define **compatibility and placement constraints**.

### Placement Rules

```
ComputeBlock must be placed on SubnetPlate
DatabaseBlock must be placed on private SubnetPlate
GatewayBlock must be placed on public SubnetPlate
StorageBlock must be placed on SubnetPlate
FunctionBlock must be placed on NetworkPlate
QueueBlock must be placed on NetworkPlate
EventBlock must be placed on NetworkPlate
TimerBlock must be placed on NetworkPlate
```

### Connection Rules

```
Internet → Gateway    ✔  (external traffic enters through gateway)
Gateway  → Compute    ✔  (gateway forwards to compute)
Gateway  → Function   ✔  (gateway forwards to serverless handlers)
Compute  → Database   ✔  (app queries database)
Compute  → Storage    ✔  (app reads/writes storage)
Function → Storage    ✔  (function accesses storage)
Function → Database   ✔  (function accesses database)
Function → Queue      ✔  (function enqueues messages)
Queue    → Function   ✔  (queue trigger)
Timer    → Function   ✔  (scheduled trigger)
Event    → Function   ✔  (event trigger)
Database → Gateway    ❌  (database does not initiate requests to gateway)
Database → Internet   ❌  (database does not initiate external requests)
Database → Compute    ❌  (database is receiver-only)
Storage  → Gateway    ❌  (storage does not initiate requests to gateway)
Storage  → Internet   ❌  (storage does not initiate external requests)
Storage  → Compute    ❌  (storage is receiver-only)
```

**Database and Storage are receiver-only** — they never appear as connection sources (initiators).
**Queue, Timer, and Event connect only to Function** when used as initiators.
Responses flow implicitly in the reverse direction and do not require a separate connection.

### Rule Specification Format

Rules are defined in JSON:

```json
{
  "id": "rule-db-private",
  "name": "database_private_subnet",
  "type": "placement",
  "severity": "error",
  "condition": {
    "blockCategory": "database",
    "plateAccess": "public"
  },
  "message": "Database cannot be placed on a Public Subnet",
  "suggestion": "Move the Database to a Private Subnet"
}
```

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  targetId: string; // block or connection ID
}

type ValidationWarning = ValidationError;
```

---

# 8. Visual Identity Model

Blocks use **visual characteristics** to communicate function in the isometric view.

> **Canonical specification**: For detailed visual specs including brick sizes, plate sizes, and SVG templates, see [VISUAL_DESIGN_SPEC.md](../design/VISUAL_DESIGN_SPEC.md) and [BRICK_DESIGN_SPEC.md](../design/BRICK_DESIGN_SPEC.md).

### 3-Layer Visual Hierarchy

CloudBlocks uses a **3-layer Lego-style visual system**:

| Layer | Element | Size Range | Purpose |
|-------|---------|------------|---------|
| **Application** | 1×1 cylinders | 40×40 px | Software on resources (nginx, python, etc.) |
| **Resource** | Brick (5 sizes) | 40×80 ~ 160×240 px | Cloud resources (compute, database, etc.) |
| **Plate** | Baseplate (3 tiers) | 160×240 ~ 640×800 px | Network boundaries (VNet, Subnet) |

### Block Color Coding

| Category | Hex Color |
|------|----------|
| `compute` | `#F25022` |
| `database` | `#00A4EF` |
| `storage` | `#7FBA00` |
| `gateway` | `#0078D4` |
| `function` | `#FFB900` |
| `queue` | `#737373` |
| `event` | `#D83B01` |
| `timer` | `#5C2D91` |

Plate colors are defined separately in the canonical visual specs and type constants (`PLATE_COLORS` in `apps/web/src/shared/types/index.ts`).

### Shape Coding

| Shape | Meaning | Size |
|------|---------|------|
| Plate | Infrastructure region | S/M/L by learning level |
| Brick | Cloud resource | signal/light/service/core/anchor |
| Cylinder | Application | 1×1 (sits on bricks) |

---

# 9. Schema Versioning & Stability

### Schema Version

The storage format uses `schemaVersion` (currently `"0.1.0"`) to track the serialization shape. This is **separate** from `ArchitectureModel.version`, which is a user-facing architecture revision counter.

| Field | Purpose | Canonical Source |
|-------|---------|-----------------|
| `schemaVersion` | Storage format version — enables future model migrations | `apps/web/src/shared/types/schema.ts` → `SCHEMA_VERSION` |
| `ArchitectureModel.version` | User-facing revision counter (incremented on save/export) | `apps/web/src/shared/types/index.ts` |

### Schema Stability Policy

The following types and fields are **frozen for Milestone 1** and will not change without a schema version bump:

| Frozen Type | Frozen Fields |
|-------------|---------------|
| `Plate` | `id`, `name`, `type`, `subnetAccess`, `parentId`, `children`, `position`, `size`, `metadata` |
| `Block` | `id`, `name`, `category`, `placementId`, `position`, `metadata`, `provider?` |
| `Connection` | `id`, `sourceId`, `targetId`, `type`, `metadata` |
| `ExternalActor` | `id`, `name`, `type` |
| `ArchitectureModel` | `id`, `name`, `version`, `plates`, `blocks`, `connections`, `externalActors`, `createdAt`, `updatedAt` |
| `Workspace` | `id`, `name`, `architecture`, `createdAt`, `updatedAt` |
| `SerializedData` | `schemaVersion`, `workspaces` |

### Migration Policy

- Any change to frozen fields requires bumping `SCHEMA_VERSION`.
- The `deserialize()` function in `schema.ts` must detect version mismatches and either migrate or reject.
- Additive changes (new optional fields with defaults) may be introduced without a version bump, but must be backward-compatible.
- Destructive changes (field renames, type changes, removals) always require a version bump and a migration function.

---

# 10. Code Generation Model

> **Canonical source**: The code generation pipeline is fully specified in [`generator.md`](../engine/generator.md). This section provides a brief overview for context.

CloudBlocks transforms visual architecture into deployable infrastructure code through a multi-stage pipeline:

```
Architecture Model → Normalize → Validate → Provider Map → Generate → Format → Output
```

> **Milestone 3**: Code generation is implemented. See [`generator.md`](../engine/generator.md) for the pipeline specification and [`ROADMAP.md`](../concept/ROADMAP.md) for timeline.

### Generator Interface

```typescript
interface Generator {
  name: string;
  version: string;
  supportedProviders: string[];
  generate(architecture: ArchitectureModel, options: GeneratorOptions): GeneratedOutput;
}
```

> For full interface contracts, options, output format, and determinism guarantees, see [`generator.md`](../engine/generator.md).

> **Milestone 4+**: Templates are planned for Milestone 4 (workspace management) and expanded in Milestone 6 (marketplace). See [`templates.md`](../engine/templates.md) for the template specification.

---

# 11. Provider Abstraction

> **Milestone 3+**: Provider adapters are planned for Milestone 3 (Azure-first). Multi-cloud support is planned for Milestone 8.

CloudBlocks uses a **provider abstraction layer** for multi-cloud support. Azure is the primary target. Each generic block category (compute, database, storage, gateway) maps to provider-specific resources through the adapter layer.

> For the full provider mapping tables (block mapping, plate mapping, connection interpretation) and adapter interface, see [provider.md](../engine/provider.md).

---

# 12. GitHub Integration Model

> **Milestone 5+**: GitHub integration is planned for Milestone 5. This section describes the target design. No implementation exists yet.

Architecture assets are stored in GitHub repos following a standard layout. The backend mediates between the UI, GitHub, and the generation engine — it does not store architecture data.

> For the full GitHub repo structure, data placement strategy, metadata DB schema, and migration plan, see [STORAGE_ARCHITECTURE.md](./STORAGE_ARCHITECTURE.md).

---

# 13. Workspace Model

### Client-Side (Milestone 1)

```typescript
interface Workspace {
  id: string;
  name: string;
  architecture: ArchitectureModel;  // single architecture per workspace
  createdAt: string;
  updatedAt: string;
}
```

### Server-Side (Milestone 5+)

> **Milestone 5+**: Server-side workspace management is planned for Milestone 5. These interfaces align with the migration files in `apps/api/app/infrastructure/db/migrations/`.

```typescript
// User identity
interface User {
  id: string;
  email: string;
  name: string;
  githubId?: string;
  createdAt: string;
  updatedAt: string;
}

// Workspace links to a GitHub repo
interface WorkspaceRecord {
  id: string;
  ownerId: string;
  name: string;
  githubRepo: string;           // e.g., "user/my-cloud-project"
  githubBranch: string;         // default branch
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Generation run record
interface GenerationRun {
  id: string;
  workspaceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  generator: string;
  commitSha?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}
```

> **Note**: The server-side models align with the actual migration files in `apps/api/app/infrastructure/db/migrations/`. The table is `workspaces` (not `projects`), and status values are `pending | running | completed | failed` (not `queued | succeeded`).

---

# 14. Implementation Schema

TypeScript type definitions for implementing the domain model.

## ID Convention

All entities use IDs in the format `{type}-{uuid}`.

Example: `plate-a1b2c3`, `block-d4e5f6`, `conn-g7h8i9`

## Core Types

```typescript
// Plate Types
type PlateType = 'network' | 'subnet';
type SubnetAccess = 'public' | 'private';

interface Plate {
  id: string;
  name: string;
  type: PlateType;
  subnetAccess?: SubnetAccess; // only for subnet type
  parentId: string | null;     // null for root (network plate)
  children: string[];          // child plate/block IDs
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

// Block Types
type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway' | 'function' | 'queue' | 'event' | 'timer';
type ProviderType = 'azure' | 'aws' | 'gcp';

interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string;  // parent plate ID
  position: Position;   // relative to parent plate
  metadata: Record<string, unknown>;
  provider?: ProviderType;
}

// Connection
type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';

interface Connection {
  id: string;
  sourceId: string; // block or external actor ID
  targetId: string; // block or external actor ID
  type: ConnectionType;
  metadata: Record<string, unknown>;
}

// External Actor
interface ExternalActor {
  id: string;
  name: string;   // e.g., "Internet"
  type: 'internet';
}

// Spatial (internal 2D coordinate system)
interface Position {
  x: number;
  y: number;
  z: number;
}

interface Size {
  width: number;
  height: number;
  depth: number;
}

// Architecture Model (root)
interface ArchitectureModel {
  id: string;
  name: string;
  version: string;
  plates: Plate[];
  blocks: Block[];
  connections: Connection[];
  externalActors: ExternalActor[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

> **Note on coordinates**: The `Position` and `Size` types retain `z`/`depth` fields for isometric rendering. The editing model treats placement as 2D (x, y) with containment hierarchy. The z-axis is managed by the rendering layer for isometric projection — users do not directly manipulate depth.

## Serialization Format

The architecture model is serialized as JSON. A version field is included to support future schema migrations.

```json
{
  "schemaVersion": "0.1.0",
  "architecture": {
    "id": "arch-abc123",
    "name": "3-Tier Web App",
    "version": "1",
    "plates": [],
    "blocks": [],
    "connections": [],
    "externalActors": [
      { "id": "ext-internet", "name": "Internet", "type": "internet" }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

# 15. Domain Extensions

### Serverless Architecture (Implemented)

Serverless architecture blocks are implemented and available in the current domain model:

- FunctionBlock (Serverless compute)
- QueueBlock (Messaging services)
- EventBlock (Event triggers)
- TimerBlock (Scheduled triggers)

Example:

```
HTTP → Function → Storage
```

---

### Architecture Simulation (Milestone 9)

> **Milestone 9+**: Not yet implemented.

Allow architecture execution simulation:

```
request flow visualization
latency simulation
failure simulation
```

---

# 16. Summary

The CloudBlocks Domain Model provides a **visual abstraction layer for cloud architecture** that maps directly to infrastructure code.

Key concepts:

```
Application     → Software on resources (nginx, python, postgres...)
Block           → Cloud resource (compute, database, storage, gateway...)
Plate           → Infrastructure region (VNet, Subnet)
Connection      → Data/Event flow (initiator direction)
External Actor  → External endpoint (Internet)
Rule            → Architecture constraints
Provider Adapter → Cloud-specific resource mapping
Generator       → IaC code output (Terraform / Bicep / Pulumi)
Template        → Pre-built architecture patterns
```

3-layer visual hierarchy:
```
Application (1×1 cylinder)  ← Software layer
    ↓ sits on
Block (brick: signal → anchor)  ← Resource layer
    ↓ placed on
Plate (S/M/L by learning level)  ← Network layer
```

This model enables:

- Visual architecture design in a 2.5D isometric environment
- Educational progression through plate sizing (입문 → 기초 → 중급)
- Clear software-to-infrastructure relationship through app cylinders
- Automated code generation from architecture graph
- Multi-cloud abstraction
- Git-native workflow integration

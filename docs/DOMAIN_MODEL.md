# CloudBlocks Platform — Domain Model

This document defines the core domain model used by the CloudBlocks Platform.

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

> **Simplification for MVP**: In the MVP, Compute refers to resources deployed within a Subnet (VM, Container App). Services that exist outside a Subnet (e.g., App Service) will be addressed in future extensions.

---

# 2. Core Entities

## 2.1 Plate

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

# 3. Block

Blocks represent **cloud resources**.

They are placed on Plates and represent deployable infrastructure services.

### Block Categories (MVP)

| Category | Description |
|---------|-------------|
| ComputeBlock | Compute resources (VM, Container App) |
| DatabaseBlock | Relational or NoSQL database |
| StorageBlock | Object or file storage |
| GatewayBlock | Load balancer or gateway |

### Future Block Categories (v1.0+)

| Category | Description | Version |
|---------|-------------|---------|
| FunctionBlock | Serverless compute | v1.0 |
| QueueBlock | Messaging services | v1.0 |
| EventBlock | Event triggers | v1.0 |
| TimerBlock | Scheduled triggers | v1.0 |

---

# 4. Block Structure

```
Block
  id            — unique identifier ({type}-{uuid})
  name          — display name
  category      — 'compute' | 'database' | 'storage' | 'gateway'
  placementId   — parent plate ID
  position      — position relative to parent plate {x, y, z}
  metadata      — additional properties
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

Example:

```
Block
  id: block-app01
  name: AppServer
  category: compute
  placementId: plate-subnet-private
  position: { x: 2, y: 1 }
```

---

# 5. Connection

Connections represent **data or event flow** between blocks.

A Connection represents the **request initiation direction (initiator)**.

- The arrow indicates "who initiates the request"
- The response flows implicitly in the reverse direction
- The rule `Database → Gateway ❌` means "Database cannot directly initiate a request to Gateway"

Example:

```
Internet → Gateway → App → Database
```

Connection properties:

```
id        — unique identifier ({type}-{uuid})
sourceId  — source block or external actor ID
targetId  — target block or external actor ID
type      — connection type
metadata  — additional properties
```

### Connection Types

| Type | Description | Version |
|-----|-------------|---------|
| DataFlow | Request/response communication (solid arrow) | MVP |
| EventFlow | Event-driven trigger (dotted arrow) | v1.0 |
| Dependency | Resource dependency (dashed line) | v1.0 |

MVP (v0.1) supports DataFlow only.

---

# 5.1 External Actor

An External Actor represents an endpoint outside the system.

- Internet (entry point for external user traffic)

An External Actor is an external entity (not a Plate or Block) that can only be used as a source or target of a Connection.

```
id    — unique identifier ({type}-{uuid})
name  — display name (e.g., "Internet")
type  — 'internet'
```

---

# 6. Rule Engine

Rules define **compatibility and placement constraints**.

### Placement Rules

```
ComputeBlock must be placed on SubnetPlate
DatabaseBlock must be placed on private SubnetPlate
GatewayBlock must be placed on public SubnetPlate
StorageBlock must be placed on SubnetPlate
```

### Connection Rules

```
Internet → Gateway    ✔  (external traffic enters through gateway)
Gateway  → Compute    ✔  (gateway forwards to compute)
Compute  → Database   ✔  (app queries database)
Compute  → Storage    ✔  (app reads/writes storage)
Database → Gateway    ❌  (database does not initiate requests to gateway)
Database → Internet   ❌  (database does not initiate external requests)
Database → Compute    ❌  (database is receiver-only)
Storage  → Gateway    ❌  (storage does not initiate requests to gateway)
Storage  → Internet   ❌  (storage does not initiate external requests)
Storage  → Compute    ❌  (storage is receiver-only)
```

**Database and Storage are receiver-only** — they never appear as connection sources (initiators).
Responses flow implicitly in the reverse direction and do not require a separate connection.

> **Event-driven patterns** (e.g., Azure Event Grid from Blob Storage, AWS DynamoDB Streams → Lambda)
> should be modeled with explicit intermediary services once the EventFlow connection type is
> available in v1.0. In MVP, use polling: `Compute → Database` / `Compute → Storage`.

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

# 7. Visual Identity Model

Blocks use **visual characteristics** to communicate function in the isometric view.

### Color Coding

| Color | Category |
|------|----------|
| Blue | Network (Plate) |
| Green | Compute |
| Orange | Database |
| Yellow | Storage |
| Purple | Gateway |
| Gray | Infrastructure |

### Shape Coding

| Shape | Meaning |
|------|---------|
| Plate | Infrastructure region |
| Brick | Compute |
| Cylinder | Database |
| Box | Storage |
| Arch | Gateway |

---

# 8. Code Generation Model

The core value of CloudBlocks — transforming visual architecture into deployable infrastructure code.

### Generation Pipeline

```
Architecture Model (JSON)
↓
Schema Validation
↓
Provider Adapter (Azure / AWS / GCP)
↓
Generator Plugin (Terraform / Bicep / Pulumi)
↓
Generated Code Output
↓
GitHub Commit / PR
```

### Generator Interface

```typescript
interface Generator {
  name: string;
  version: string;
  supportedProviders: string[];
  generate(architecture: ArchitectureModel, options: GeneratorOptions): GeneratedOutput;
}

interface GeneratorOptions {
  provider: 'azure' | 'aws' | 'gcp';
  outputFormat: 'terraform' | 'bicep' | 'pulumi';
  templateOverrides?: Record<string, unknown>;
}

interface GeneratedOutput {
  files: GeneratedFile[];
  metadata: {
    generator: string;
    version: string;
    provider: string;
    generatedAt: string;
  };
}

interface GeneratedFile {
  path: string;      // e.g., "main.tf"
  content: string;   // file content
  language: string;  // e.g., "hcl", "bicep", "typescript"
}
```

### Template Model

Templates are pre-built architecture patterns:

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  category: 'webapp' | 'ai-stack' | 'serverless' | 'data-pipeline';
  architecture: ArchitectureModel;
  tags: string[];
}
```

---

# 9. Provider Abstraction

CloudBlocks uses a **provider abstraction layer** for multi-cloud support. Azure is the primary target.

| Generic | Azure | AWS | GCP |
|---------|-------|-----|-----|
| Network (Plate) | VNet | VPC | VPC |
| Subnet (Plate) | Subnet | Subnet | Subnet |
| Compute | VM / Container App | EC2 | Compute Engine |
| Database | Azure SQL | RDS | Cloud SQL |
| Storage | Blob Storage | S3 | Cloud Storage |
| Gateway | Application Gateway | ALB | Load Balancer |
| Function (v1.0) | Azure Function | Lambda | Cloud Functions |

---

# 10. GitHub Integration Model

Architecture assets are stored in GitHub repos following a standard layout:

```
my-cloud-project/
├── cloudblocks/
│   ├── architecture.json       # Architecture model
│   ├── schemaVersion           # Schema version
│   └── generator.lock          # Pinned generator versions
├── infra/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── bicep/
│   └── pulumi/
└── .github/
    └── workflows/
        └── plan.yml            # Auto terraform plan on PR
```

### Git Workflow

```
Edit architecture in UI
↓
Commit to branch
↓
Open PR (architecture.json + generated code)
↓
CI runs terraform plan
↓
Review & merge
↓
CD applies infrastructure
```

---

# 11. Workspace Model

### Client-Side (v0.1)

```typescript
interface Workspace {
  id: string;
  name: string;
  architecture: ArchitectureModel;  // single architecture per workspace
  createdAt: string;
  updatedAt: string;
}
```

### Server-Side (v0.5+)

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

# 12. Implementation Schema

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
type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway';

interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string;  // parent plate ID
  position: Position;   // relative to parent plate
  metadata: Record<string, unknown>;
}

// Connection
type ConnectionType = 'dataflow';  // v0.1 — EventFlow and Dependency planned for v1.0

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

> **Note on coordinates**: The `Position` and `Size` types retain `z`/`depth` fields for Three.js rendering compatibility. The editing model treats placement as 2D (x, y) with containment hierarchy. The z-axis is managed by the rendering layer for isometric projection — users do not directly manipulate depth.

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

# 13. Future Domain Extensions

### Serverless Architecture (v1.0)

Add:

- FunctionBlock (Serverless compute)
- QueueBlock (Messaging services)
- EventBlock (Event triggers)
- TimerBlock (Scheduled triggers)

Example:

```
HTTP → Function → Storage
```

---

### Architecture Simulation (v2.5)

Allow architecture execution simulation:

```
request flow visualization
latency simulation
failure simulation
```

---

# 14. Summary

The CloudBlocks Domain Model provides a **visual abstraction layer for cloud architecture** that maps directly to infrastructure code.

Key concepts:

```
Plate           → Infrastructure region (container)
Block           → Cloud resource (service)
Connection      → Data/Event flow (initiator direction)
External Actor  → External endpoint (Internet)
Rule            → Architecture constraints
Provider Adapter → Cloud-specific resource mapping
Generator       → IaC code output (Terraform / Bicep / Pulumi)
Template        → Pre-built architecture patterns
```

This model enables:

- Visual architecture design in a 2.5D isometric environment
- Automated code generation from architecture graph
- Multi-cloud abstraction
- Git-native workflow integration

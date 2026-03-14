# CloudBlocks Platform - Domain Model

This document defines the core domain model used by the CloudBlocks Platform.

The platform represents cloud architecture using a **block-based spatial abstraction model** that allows users to visually construct cloud systems and optionally deploy them to real cloud providers.

---

# 1. Domain Philosophy

Cloud infrastructure is represented as a **spatial block model** composed of:

- Plates (Infrastructure regions)
- Blocks (Cloud services)
- Connections (Data flow)
- Rules (Compatibility constraints)
- External Actors (External endpoints)

This model allows beginners to visually understand cloud architecture.

> **교육 단순화 기준**: 이 모델은 클라우드 아키텍처의 핵심 개념을 교육하기 위한 추상화이다. 실제 클라우드 서비스의 모든 세부사항을 반영하지 않으며, 학습에 필요한 수준으로 단순화한다.

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
| NetworkPlate | Represents a cloud network (VNet / VPC) |
| SubnetPlate | Represents a subnet within a network (Public or Private) |

### Plate Properties

```
id            — unique identifier ({type}-{uuid})
name          — display name
type          — 'network' | 'subnet'
subnetAccess  — 'public' | 'private' (subnet only)
parentId      — parent plate ID (null for network plate)
children      — child plate/block IDs
position      — 3D position {x, y, z}
size          — dimensions {width, height, depth}
metadata      — additional properties
```

Example:

```
NetworkPlate
  id: plate-vnet01
  children:
    - plate-subnet-public
    - plate-subnet-private
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
  position      — 3D position relative to parent plate {x, y, z}
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

---

# 5. Connection

Connections represent **data or event flow** between blocks.

Connection은 **요청 발신 방향(initiator)**을 나타낸다.

- 화살표는 "누가 요청을 시작하는가"를 표현한다
- 응답(response)은 역방향으로 암묵적으로 흐른다
- `Database → Gateway ❌` 규칙은 "Database가 Gateway에 직접 요청을 보내는 관계는 성립하지 않음"을 의미한다

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

MVP (v0.1)에서는 DataFlow만 지원한다.

---

# 5.1 External Actor

External Actor는 시스템 외부의 엔드포인트를 나타낸다.

- Internet (외부 사용자 트래픽의 진입점)

External Actor는 Plate나 Block이 아닌 외부 엔티티로, Connection의 source 또는 target으로만 사용된다.

```
id    — unique identifier ({type}-{uuid})
name  — display name (e.g., "Internet")
type  — 'internet'
```

---

# 6. Rule Engine

Rules define **compatibility and placement constraints**.

These rules help beginners learn correct architecture patterns.

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
```

### Rule Example

```
rule: database_private_subnet

if block.category == database
and plate.subnetAccess == public
then ERROR "Database는 Public Subnet에 배치할 수 없습니다"
suggest "Database를 Private Subnet으로 이동하세요"
```

### Rule Specification Format

규칙은 JSON 형식으로 정의된다.

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
  "message": "Database는 Public Subnet에 배치할 수 없습니다",
  "suggestion": "Database를 Private Subnet으로 이동하세요"
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

Blocks use **visual characteristics** to communicate function.

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

# 8. Scenario Model

Scenarios represent **learning missions**.

Example:

### Scenario

Create a 3-tier architecture

Expected structure:

```
Internet
↓
Gateway (Public Subnet)
↓
App (Private Subnet)
↓
Database (Private Subnet)
```

Scenario components:

```
required_plates
required_blocks
required_connections
validation_rules
```

---

# 9. Provider Abstraction

CloudBlocks uses a **provider abstraction layer**.

Generic blocks map to provider-specific resources.

> 교육 단순화 기준: MVP에서 Compute는 Subnet 내에 배치되는 리소스(VM, Container App)로 간주한다. App Service와 같이 Subnet 외부에 존재하는 서비스는 향후 확장에서 다룬다.

Example:

| Generic | Azure | AWS | GCP |
|-------|-------|-----|-----|
| Network (Plate) | VNet | VPC | VPC |
| Subnet (Plate) | Subnet | Subnet | Subnet |
| Compute | VM / Container App | EC2 | Compute Engine |
| Database | Azure SQL | RDS | Cloud SQL |
| Storage | Blob Storage | S3 | Cloud Storage |
| Gateway | Application Gateway | ALB | Load Balancer |
| Function (v1.0) | Azure Function | Lambda | Cloud Functions |

---

# 10. Deployment Model

The platform converts block architecture into deployable infrastructure.

Pipeline:

```
Visual Model
↓
Logical Architecture
↓
Provider Adapter
↓
Infrastructure Code
↓
Cloud Deployment
```

Supported formats:

- Bicep
- Terraform
- ARM (optional)

---

# 11. Server-Side Data Model (v0.5+)

v0.5 이상에서 CUBRID 도입 시 사용되는 서버 측 데이터 모델.

### Core Entities

```typescript
// User account
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Workspace contains architecture models
interface ServerWorkspace {
  id: string;
  userId: string;
  name: string;
  architecture: ArchitectureModel;
  createdAt: string;
  updatedAt: string;
}

// Learning scenario definition
interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  requiredStructure: {
    requiredPlates: string[];
    requiredBlocks: string[];
    requiredConnections: string[];
    validationRules: string[];
  };
  createdAt: string;
}

// Per-user learning progress
interface LearningProgress {
  id: string;
  userId: string;
  scenarioId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt: string | null;
}

// Deployment history
interface DeploymentRecord {
  id: string;
  workspaceId: string;
  provider: 'azure' | 'aws' | 'gcp';
  status: 'queued' | 'provisioning' | 'succeeded' | 'failed' | 'canceled';
  infrastructureCode: string | null;
  logs: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Repository Pattern

```typescript
interface UserRepository {
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface WorkspaceRepository {
  findById(id: string): Promise<ServerWorkspace>;
  findByUserId(userId: string): Promise<ServerWorkspace[]>;
  save(workspace: ServerWorkspace): Promise<void>;
  delete(id: string): Promise<void>;
}

interface ScenarioRepository {
  findAll(): Promise<ScenarioDefinition[]>;
  findById(id: string): Promise<ScenarioDefinition>;
}

interface DeploymentRepository {
  findByWorkspaceId(workspaceId: string): Promise<DeploymentRecord[]>;
  save(deployment: DeploymentRecord): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
}
```

> 이 모델들은 커스텀 ORM을 통해 CUBRID와 매핑된다.

---

# 12. Future Domain Extensions

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

### Cloud Simulation (v2.5)

Allow architecture execution simulation.

Example:

```
request flow visualization
latency simulation
failure simulation
```

---

### Physical Block Integration (v3.5)

Future extension allowing IoT-enabled physical blocks.

Example:

```
Physical Block → Sensor Detection → Cloud Model Update
```

---

# 13. Implementation Schema

도메인 모델의 구현을 위한 TypeScript 타입 정의.

## ID Convention

모든 엔티티는 `{type}-{uuid}` 형식의 ID를 사용한다.

예: `plate-a1b2c3`, `block-d4e5f6`, `conn-g7h8i9`

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
type ConnectionType = 'dataflow' | 'eventflow' | 'dependency';

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

// Spatial
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

## Workspace

```typescript
interface Workspace {
  id: string;
  name: string;
  architectures: ArchitectureModel[];
  createdAt: string;
  updatedAt: string;
}
```

## Serialization Format

아키텍처 모델은 JSON으로 직렬화된다. 버전 필드를 포함하여 향후 스키마 마이그레이션을 지원한다.

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

# 14. Summary

The CloudBlocks Domain Model provides a **visual abstraction layer for cloud architecture**.

Key concepts:

```
Plate           → Infrastructure region (container)
Block           → Cloud resource (service)
Connection      → Data/Event flow (initiator direction)
External Actor  → External endpoint (Internet)
Rule            → Architecture constraints
Provider Adapter → Cloud mapping
```

This model enables:

- Cloud learning
- Architecture design
- Infrastructure deployment
- Multi-cloud abstraction

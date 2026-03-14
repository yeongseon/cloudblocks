# CloudBlocks Platform - System Architecture

This document defines the system architecture for the CloudBlocks Platform.

The platform enables users to visually construct cloud architecture using a block-style interface and optionally deploy the resulting architecture to real cloud environments.

---

# 1. Architecture Overview

The platform consists of the following major layers:

```
Frontend (3D Block Builder)
│
Core Modeling Engine
│
Rule Engine
│
Data Layer (CUBRID + Custom ORM)
│
Provider Adapter
│
Infrastructure Generator
│
Cloud Deployment Engine
```

---

# 2. System Layers

## 2.1 Frontend Layer

Responsible for:

- Visual block builder interface
- Drag and drop interaction
- Block placement on Plates
- Connection visualization
- Architecture flow display

### Technologies

Recommended stack:

- React
- TypeScript
- React Three Fiber
- Three.js
- Zustand (state management)

### Frontend Responsibilities

- Render Plates and Blocks in 3D
- Manage scene interactions (drag, drop, select, connect)
- Validate architecture via Rule Engine
- Display validation feedback
- Save/load workspace to local storage

## 2.2 MVP Architecture (v0.1)

v0.1은 **프론트엔드 전용 SPA(Single Page Application)**으로 구현한다.

```
Browser (React + R3F)
├── 3D Scene (Three.js)
├── Domain Model (Zustand Store)
├── Rule Engine (in-browser)
└── Local Storage (workspace persistence)
```

백엔드는 v0.1에서 불필요하다. 모든 로직이 클라이언트에서 실행된다.

### v0.1 Component Structure

```
src/
├── components/        # React UI components
│   ├── canvas/        # 3D canvas and scene
│   ├── panels/        # side panels (block palette, properties)
│   └── toolbar/       # top toolbar (save, load, validate)
├── models/            # Domain model types
│   ├── types.ts       # Plate, Block, Connection, Rule types
│   └── schema.ts      # Serialization schema
├── store/             # Zustand state management
│   ├── architectureStore.ts
│   └── uiStore.ts
├── rules/             # Rule engine
│   ├── engine.ts      # Validation engine
│   ├── placement.ts   # Placement rules
│   └── connection.ts  # Connection rules
├── three/             # Three.js / R3F components
│   ├── PlateModel.tsx
│   ├── BlockModel.tsx
│   └── ConnectionLine.tsx
└── utils/             # Utilities
    ├── storage.ts     # localStorage operations
    └── id.ts          # ID generation
```

---

# 2.5 Data Layer (v0.5+)

v0.5 이상에서 도입되는 데이터 레이어. CUBRID를 주요 관계형 데이터베이스로 사용한다.

### Storage Architecture

```
Application Layer
│
├─ Custom ORM Layer
│   ├─ Repository Pattern (WorkspaceRepository, UserRepository, ...)
│   ├─ Query Abstraction
│   └─ Object Mapping
│
├─ CUBRID (Primary Database)
│   ├─ Users, Workspaces, Architecture Models
│   ├─ Scenario Definitions, Learning Progress
│   └─ Deployment History, Template Metadata
│
├─ Redis (Cache & Session)
│   ├─ Session storage
│   ├─ Architecture state cache
│   └─ Task queues
│
└─ Object Storage (Cloud Provider)
    ├─ Template assets
    ├─ Deployment artifacts
    └─ Logs
```

### Why CUBRID

- 성숙한 관계형 데이터베이스 (ACID, MVCC 지원)
- 구조화된 워크로드에 적합한 성능
- SaaS 멀티테넌트 데이터 모델에 적합
- CUBRID 생태계 레퍼런스 아키텍처 제공 기회

### Custom ORM Layer

커스텀 ORM을 통해 애플리케이션 로직이 데이터베이스 구현에서 분리된다.

```typescript
// Repository Pattern Example
interface WorkspaceRepository {
  findById(id: string): Promise<Workspace>;
  findByUserId(userId: string): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  delete(id: string): Promise<void>;
}

// ORM Layer abstracts CUBRID specifics
class CubridWorkspaceRepository implements WorkspaceRepository {
  // CUBRID-specific query implementation
}
```

### Data Entity Relationships

```
User
└ Workspace
      └ Architecture Model
            ├─ Plates
            ├─ Blocks
            └─ Connections

Scenario Definition
└ Learning Progress (per User)

Deployment History (per Architecture)
```

---

# 3. Core Modeling Engine

The Core Modeling Engine manages the **CloudBlocks Domain Model**.

This layer is responsible for:

- Constructing the architecture model
- Managing block placement on plates
- Maintaining containment hierarchy (Network → Subnet → Block)

Example structure:

```
NetworkPlate
└ SubnetPlate (Public)
  └ GatewayBlock
└ SubnetPlate (Private)
  └ ComputeBlock
  └ DatabaseBlock
```

Key responsibilities:

- maintain architecture graph
- enforce containment relationships
- serialize model state

---

# 4. Rule Engine

The Rule Engine validates architecture constraints.

It ensures that user-created architectures follow correct cloud design patterns.

### Rule Categories

Placement Rules

```
ComputeBlock must be placed on SubnetPlate
DatabaseBlock must be placed on private SubnetPlate
GatewayBlock must be placed on public SubnetPlate
StorageBlock must be placed on SubnetPlate
```

Connection Rules

```
Internet → Gateway    ✔
Gateway  → Compute    ✔
Compute  → Database   ✔
Database → Gateway    ❌
Database → Internet   ❌
```

Architecture Rules

```
3-tier architecture must include:
  Gateway
  Compute
  Database
```

The Rule Engine returns validation results to the UI.

Example response:

```json
{
  "valid": false,
  "errors": [
    {
      "ruleId": "rule-db-private",
      "severity": "error",
      "message": "Database cannot be placed in public subnet",
      "suggestion": "Move Database to a private subnet",
      "targetId": "block-db01"
    }
  ],
  "warnings": []
}
```

검증 결과는 severity 레벨을 포함한다:
- `error`: 규칙 위반. 배포 불가.
- `warning`: 권장사항 위반. 배포는 가능하나 권장하지 않음.

### Connection Type Handling

Connection은 DOMAIN_MODEL의 세 가지 타입을 지원한다:
- **DataFlow**: 요청/응답 통신. 시각화에서 실선 화살표로 표현.
- **EventFlow**: 이벤트 기반 트리거. 시각화에서 점선 화살표로 표현. (v1.0)
- **Dependency**: 리소스 의존성. 시각화에서 대시선으로 표현. (v1.0)

MVP (v0.1)에서는 DataFlow만 지원한다.

---

# 5. Provider Adapter Layer

The Provider Adapter translates the generic CloudBlocks model into cloud provider resources.

Supported providers:

- Azure
- AWS (v2.0)
- GCP (v2.0)

> 교육 단순화 기준: MVP에서 Compute는 Subnet 내에 배치되는 리소스(VM, Container App)로 간주한다.

Example mapping:

| Generic Resource | Azure | AWS | GCP |
|------------------|------|-----|-----|
| Network (Plate) | VNet | VPC | VPC |
| Subnet (Plate) | Subnet | Subnet | Subnet |
| Compute | VM / Container App | EC2 | Compute Engine |
| Database | Azure SQL | RDS | Cloud SQL |
| Storage | Blob Storage | S3 | Cloud Storage |
| Gateway | Application Gateway | ALB | Load Balancer |
| Function (v1.0) | Azure Function | Lambda | Cloud Functions |

---

# 6. Infrastructure Generator

Converts logical architecture into infrastructure definitions.

Supported formats:

- Terraform
- Bicep
- ARM templates (optional)

Example pipeline:

```
CloudBlocks Model
↓
Logical Architecture
↓
Provider Adapter
↓
Infrastructure Code
```

Example output:

```
terraform/
bicep/
arm/
```

---

# 7. Cloud Deployment Engine

Responsible for deploying infrastructure to cloud providers.

Deployment flow:

```
Infrastructure Code
↓
Deployment API
↓
Cloud Provider
↓
Infrastructure Provisioned
```

Supported methods:

- Terraform apply
- Azure Bicep deploy
- Cloud API execution

Deployment results are returned to the UI.

---

# 8. API Contracts (v0.5+)

v0.5 이상에서 백엔드 도입 시 사용할 API 계약.

## Architecture CRUD

```
POST   /api/architectures          # 새 아키텍처 생성
GET    /api/architectures           # 아키텍처 목록 조회
GET    /api/architectures/:id       # 아키텍처 상세 조회
PUT    /api/architectures/:id       # 아키텍처 업데이트
DELETE /api/architectures/:id       # 아키텍처 삭제
```

## Validation

```
POST   /api/validate                # 아키텍처 검증
```

Request: `{ architecture: ArchitectureModel }`
Response: `{ valid: boolean, errors: ValidationError[], warnings: ValidationWarning[] }`

## Deployment (v0.5)

```
POST   /api/deployments             # 배포 시작
GET    /api/deployments/:id         # 배포 상태 조회
GET    /api/deployments/:id/logs    # 배포 로그 조회
DELETE /api/deployments/:id         # 배포 취소
```

### Deployment State Machine

```
queued → provisioning → succeeded
                      → failed
         ↓
       canceled
```

| State | Description |
|-------|-------------|
| queued | 배포 요청 접수됨 |
| provisioning | 클라우드 리소스 생성 중 |
| succeeded | 배포 완료 |
| failed | 배포 실패 |
| canceled | 사용자에 의해 취소됨 |

---

# 9. Serverless Extension (v1.0)

Serverless components can be modeled using event blocks.

Supported blocks:

- Function
- Queue
- Event
- Timer

Example architecture:

```
HTTP → Function → Storage
```

This allows teaching event-driven architecture.

---

# 10. Scenario Engine (Learning Mode)

Provides guided architecture exercises.

Example:

Mission: Build a 3-tier architecture

Required blocks:

```
Gateway (on Public Subnet)
Compute (on Private Subnet)
Database (on Private Subnet)
```

Validation checks ensure correct design.

---

# 11. State Management

### v0.1 Storage (Local)

v0.1에서는 브라우저 localStorage를 사용한다.

Key: `cloudblocks:workspaces`

```json
{
  "schemaVersion": "0.1.0",
  "workspaces": [
    {
      "id": "ws-abc123",
      "name": "My First Architecture",
      "architecture": {
        "id": "arch-001",
        "name": "3-Tier Web App",
        "version": "1",
        "plates": [],
        "blocks": [],
        "connections": [],
        "externalActors": []
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### v0.5+ Storage (CUBRID)

CUBRID를 주요 데이터 저장소로 사용한다.

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  architecture CLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE scenarios (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description CLOB,
  required_structure CLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_progress (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scenario_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

CREATE TABLE deployments (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  infrastructure_code CLOB,
  logs CLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

Redis는 세션 캐시 및 임시 상태 저장에 사용한다.

---

# 12. Cloud Status Integration (Future)

The platform may reflect real infrastructure state.

Example:

- green → running
- red → error
- yellow → deploying

This enables **Cloud Digital Twin visualization**.

---

# 13. Physical Block Integration (Future)

Future architecture supports IoT-enabled blocks.

Example architecture:

```
Physical Block
↓
IoT Sensor
↓
Cloud Model Update
↓
Deployment Trigger
```

Possible technologies:

- NFC
- RFID
- BLE
- ESP32 sensors

---

# 14. Security Considerations

Key security features:

- workspace isolation
- cloud credential protection (v0.5+)
- sandbox deployment limits (v0.5+)
- cost protection (v0.5+)

Students should deploy in controlled environments.

---

# 15. Scalability

The architecture supports horizontal scalability.

Key scalable components:

- frontend CDN
- stateless backend API (v0.5+)
- containerized deployment engine (v0.5+)
- provider adapters

---

# 16. Summary

The CloudBlocks Platform architecture separates concerns into modular components:

```
Frontend (v0.1: SPA with R3F)
Core Model (Zustand store)
Rule Engine (in-browser validation)
Data Layer (v0.5+: CUBRID + Custom ORM + Redis)
Provider Adapter (v0.5+)
Infrastructure Generator (v0.5+)
Deployment Engine (v0.5+)
```

This modular architecture enables:

- cloud education
- infrastructure simulation
- real cloud deployment
- multi-cloud expansion

# Cloud Lego Platform - System Architecture

This document defines the system architecture for the Cloud Lego Platform.

The platform enables users to visually construct cloud architecture using a Lego-style interface and optionally deploy the resulting architecture to real cloud environments.

---

# 1. Architecture Overview

The platform consists of the following major layers:

```
Frontend (3D Lego Builder)
│
Core Modeling Engine
│
Rule Engine
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

- Visual Lego builder interface
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

# 3. Core Modeling Engine

The Core Modeling Engine manages the **Cloud Lego Domain Model**.

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

The Provider Adapter translates the generic Cloud Lego model into cloud provider resources.

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
Cloud Lego Model
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

Key: `cloude-lego:workspaces`

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

### v0.5+ Storage (Server)

PostgreSQL 스키마:

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  architecture JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Redis for session cache.

---

# 12. Cloud Status Integration (Future)

The platform may reflect real infrastructure state.

Example:

- green → running
- red → error
- yellow → deploying

This enables **Cloud Digital Twin visualization**.

---

# 13. Physical Lego Integration (Future)

Future architecture supports IoT-enabled Lego blocks.

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

The Cloud Lego Platform architecture separates concerns into modular components:

```
Frontend (v0.1: SPA with R3F)
Core Model (Zustand store)
Rule Engine (in-browser validation)
Provider Adapter (v0.5+)
Infrastructure Generator (v0.5+)
Deployment Engine (v0.5+)
```

This modular architecture enables:

- cloud education
- infrastructure simulation
- real cloud deployment
- multi-cloud expansion

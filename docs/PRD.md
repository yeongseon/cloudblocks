# CloudBlocks Platform
Build cloud architecture like blocks, learn it visually, and make it real.

---

# 1. Product Overview

CloudBlocks Platform은 클라우드 아키텍처를 블록처럼 조립하면서 학습하고, 실제 클라우드 인프라로 배포할 수 있는 교육 중심 플랫폼이다.

이 플랫폼은 클라우드 입문자가 다음을 자연스럽게 이해하도록 설계된다.

- 클라우드 네트워크 구조
- 서비스 간 관계
- 이벤트 기반 아키텍처
- serverless 개념
- 실제 인프라 동작 방식

사용자는 3D 블록을 배치하여 클라우드 아키텍처를 구성할 수 있다.

플랫폼은 다음 개념을 기반으로 한다.

- Plate (네트워크 영역 — 공간적 컨테이너)
- Block (서비스 리소스 — 클라우드 서비스)
- Connection (서비스 연결 — 데이터 흐름)
- Rule (배치 및 연결 규칙 — 아키텍처 제약)
- External Actor (외부 엔드포인트 — Internet 등)

구성된 아키텍처는 실제 클라우드 환경(Azure first)에 배포할 수 있다.

또한 이 프로젝트는 **CUBRID 생태계의 실제 서비스 레퍼런스 구현**으로서의 역할도 수행한다.

---

# 2. Vision

클라우드 구조를 **시각적으로 이해하고 실제로 실행할 수 있는 플랫폼**을 만든다.

장기적으로는 다음을 목표로 한다.

- Visual Cloud Architecture Builder
- Cloud Learning Platform
- Cloud Simulator
- Physical Block + Cloud IoT Integration
- **CUBRID 기반 SaaS 레퍼런스 아키텍처**

---

# 3. Target Users

## Primary Users

### Cloud Beginners
- 대학생
- 부트캠프 수강생
- 주니어 개발자
- 클라우드 입문자

### Secondary Users

- 교육 기관
- 기업 교육 프로그램
- 클라우드 아키텍트 트레이닝

---

# 4. Core Concept

## Block Cloud Model

Cloud Architecture는 다음 구조로 표현된다.

```
Network Plate
└ Subnet Plate (Public / Private)
  └ Resource Block
```

### Plate

공간적 영역. 다른 Plate나 Block을 포함하는 컨테이너.

- Network Plate — 클라우드 네트워크 (VNet / VPC)
- Subnet Plate — 네트워크 내 서브넷 (Public / Private)

### Block

클라우드 서비스. Plate 위에 배치되는 리소스.

- Compute Block — 컴퓨팅 리소스 (VM, Container)
- Database Block — 데이터베이스
- Storage Block — 스토리지
- Gateway Block — 로드밸런서 / 게이트웨이

### Connection

서비스 간 데이터 흐름.

Connection은 **요청 발신 방향(initiator)**을 나타낸다. 화살표는 "누가 요청을 시작하는가"를 표현하며, 응답은 역방향으로 암묵적으로 흐른다.

예:

```
Internet → Gateway → App → Database
```

### External Actor

시스템 외부의 엔드포인트.

- Internet (외부 사용자 트래픽의 진입점)

External Actor는 Plate나 Block이 아닌 외부 엔티티로, Connection의 source 또는 target으로만 사용된다.

---

# 5. MVP Scope

초기 MVP는 Azure 기반으로 시작한다.

## Supported Plates

- Network Plate
- Subnet Plate (Public / Private)

## Supported Blocks

- Compute (App)
- Database
- Storage
- Gateway

## Example Architecture

3-tier Web Application

```
Internet
↓
Gateway (Public Subnet)
↓
App (Private Subnet)
↓
Database (Private Subnet)
```

## MVP Acceptance Criteria

MVP (v0.1)는 다음 시나리오를 모두 통과해야 완료된다.

### Scenario 1: 3-Tier Architecture Construction
- Network Plate를 캔버스에 배치할 수 있다
- Public/Private Subnet Plate를 Network Plate 안에 배치할 수 있다
- Gateway를 Public Subnet에, Compute(App)와 Database를 Private Subnet에 배치할 수 있다
- 아키텍처 검증이 에러 없이 통과한다

### Scenario 2: Architecture Validation
- Database를 Public Subnet에 배치하면 검증 에러가 발생한다
- Compute를 Subnet 밖에 배치하면 검증 에러가 발생한다
- Database → Gateway 연결을 생성하면 검증 에러가 발생한다

### Scenario 3: Workspace Persistence
- 현재 아키텍처를 로컬 스토리지에 저장할 수 있다
- 저장된 아키텍처를 불러올 수 있다
- 불러온 아키텍처가 저장 시점과 동일하다

### Out of Scope (v0.1)
- Cloud deployment (v0.5)
- Serverless blocks — Function, Queue, Event, Timer (v1.0)
- Multi-cloud support (v2.0)
- User authentication
- Collaboration features

---

# 6. Core Features

## Visual Architecture Builder

- Block style placement
- Plate 기반 구조
- Drag and drop UI

## Architecture Validation

블록 간 규칙 검증

예:

- Database는 Public Subnet에 배치 불가
- Gateway는 Public Subnet에 배치
- Compute는 Subnet 위에 배치

## Architecture Flow Visualization

데이터 흐름 시각화

```
Internet → Gateway → App → Database
```

## Workspace Save/Load

아키텍처를 로컬 스토리지에 저장하고 불러올 수 있다.

---

# 7. Data Layer Strategy

## Primary Database — CUBRID

CloudBlocks Platform은 **CUBRID를 주요 관계형 데이터베이스**로 채택한다.

이 결정은 다음 목표를 기반으로 한다.

1. CUBRID를 사용한 **실제 서비스 레퍼런스 아키텍처** 제공
2. 커스텀 ORM 구현의 **프로덕션 환경 검증**
3. **CUBRID 생태계 활성화** 기여
4. 현대적 SaaS 플랫폼이 CUBRID 위에서 운영 가능함을 증명

## Core Data Entities

CUBRID에 저장되는 핵심 엔티티:

- Users (사용자 계정)
- Workspaces (작업 공간)
- Architecture Models (아키텍처 모델)
- Scenario Definitions (학습 시나리오)
- Learning Progress (학습 진행 상황)
- Deployment History (배포 이력)
- Template Metadata (템플릿 메타데이터)

```
User
└ Workspace
      └ Architecture Model
            └ Blocks
            └ Connections
```

## ORM Layer

커스텀 ORM 레이어를 통해 CUBRID와 상호작용한다.

- 객체 매핑 (Object Mapping)
- 쿼리 추상화 (Query Abstraction)
- 리포지토리 패턴 (Repository Pattern)
- 데이터베이스 이식성 (Database Portability)

```
WorkspaceRepository
ScenarioRepository
DeploymentRepository
UserRepository
```

## Hybrid Storage Architecture

| Storage | 용도 |
|---------|------|
| CUBRID | 핵심 애플리케이션 데이터, 워크스페이스, 시나리오, 사용자 상태, 배포 이력 |
| Redis | 캐싱, 세션 저장, 임시 아키텍처 상태, 태스크 큐 |
| Object Storage (Cloud) | 템플릿 에셋, 배포 아티팩트, 로그 |

> v0.1에서는 localStorage를 사용한다. CUBRID 및 Redis는 v0.5에서 도입된다.

---

# 8. Post-MVP Features (v0.5)

## Deploy to Cloud

구성된 아키텍처를 실제 클라우드로 배포 (v0.5에서 지원 예정. ROADMAP.md 참고)

초기 지원

- Azure

추후 지원

- AWS
- GCP

---

# 9. Serverless Extension (v1.0)

기본 인프라 위에 serverless 개념을 확장할 수 있다.

추가 블록

- Function
- Queue
- Event
- Timer

예시

```
HTTP → Function → Storage
```

---

# 10. Learning Mode (v1.5)

학습 시나리오 기반 미션 제공

예:

### Mission 1
Create a 3-tier web architecture

### Mission 2
Build a serverless API

### Mission 3
Build an event driven system

---

# 11. Monetization (Future)

가능한 SaaS 모델

- Free learning tier
- Classroom license
- Enterprise training
- Cloud deployment credits

---

# 12. CUBRID Ecosystem Contribution

프로젝트 발전에 따라 다음과 같은 생태계 기여를 계획한다.

- 개선된 ORM 도구
- CUBRID 기반 SaaS 아키텍처 예제
- Terraform 배포 예제
- 성능 벤치마크
- 개발자 문서

CloudBlocks Platform은 **CUBRID 기반 SaaS 플랫폼 구축의 레퍼런스 구현**이 될 수 있다.

---

# 13. Long Term Expansion

### Multi Cloud Support (v2.0)

- Azure
- AWS
- GCP

### Cloud Simulation (v2.5)

아키텍처 실행 흐름 시뮬레이션

### Digital Twin (v3.0)

실제 인프라 상태 반영

### Physical Block Integration (v3.5)

IoT 기반 실제 블록 감지

```
Physical Block → Cloud Model → Infrastructure Deploy
```

---

# 14. Success Metrics

- User onboarding success rate
- Completed learning scenarios
- Successful cloud deployments
- Active education users

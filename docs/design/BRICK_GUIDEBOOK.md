# 🧱 CloudBlocks Brick Design Guidebook

> 클라우드를 레고처럼 — Build Cloud Like Lego

CloudBlocks는 복잡한 클라우드 아키텍처를 레고(Lego) 브릭처럼 직관적으로 시각화하고 설계할 수 있는 도구입니다. 이 가이드북은 CloudBlocks의 디자인 시스템과 조립 규칙을 비전문가도 쉽게 이해할 수 있도록 설명합니다.

---

## Table of Contents
1. [Welcome — 환영합니다](#1-welcome--환영합니다)
2. [Parts Catalog — 모든 부품 한눈에](#2-parts-catalog--모든-부품-한눈에)
   - [2.1 Plates (기판)](#21-plates-기판)
   - [2.2 Blocks (브릭)](#22-blocks-브릭)
   - [2.3 Studs (스터드)](#23-studs-스터드)
   - [2.4 Connections (화살표)](#24-connections-화살표)
   - [2.5 External Actors (외부 요소)](#25-external-actors-외부-요소)
3. [Assembly Rules — 조립 규칙](#3-assembly-rules--조립-규칙)
4. [Provider Themes — 클라우드별 테마](#4-provider-themes--클라우드별-테마)
5. [Build Examples — 완성 레퍼런스](#5-build-examples--완성-레퍼런스)
6. [Quick Reference Card — 한 페이지 치트시트](#6-quick-reference-card--한-페이지-치트시트)

---

## 1. Welcome — 환영합니다

CloudBlocks는 클라우드 서비스를 '레고 브릭'으로 표현합니다.

*   **Plates (기판)**: 네트워크 경계를 나타내는 베이스판입니다. 블록들을 올려놓는 기초가 됩니다.
*   **Blocks (브릭)**: 가상 머신, 데이터베이스와 같은 실제 클라우드 서비스를 나타냅니다.
*   **Studs (스터드)**: 모든 부품 위에 돋아난 원형 돌기입니다. 부품 간의 크기 규격을 맞추는 핵심 요소입니다.
*   **Connections (화살표)**: 데이터의 흐름이나 네트워크 요청의 방향을 나타냅니다.

---

## 2. Parts Catalog — 모든 부품 한눈에

### 2.1 Plates (기판)

네트워크와 서브넷을 나타내는 기판입니다. 크기와 색상에 따라 용도가 다릅니다.

| 종류 (Kind) | 이름 (Name) | 색상 (Color) | 용도 (Purpose) |
| :--- | :--- | :--- | :--- |
| **Network** | 가상 네트워크 | Deep Blue (#2563EB) | 전체 아키텍처를 감싸는 가장 큰 네트워크 경계 |
| **Public Subnet** | 공용 서브넷 | Bright Green (#22C55E) | 인터넷과 직접 통신하는 서비스가 위치하는 공간 |
| **Private Subnet** | 사설 서브넷 | Indigo/Red (#6366F1/DC2626) | 내부 통신만 허용되는 보안이 중요한 서비스 공간 |

---

### 2.2 Blocks (브릭)

클라우드 서비스들은 기능에 따라 8가지 카테고리로 분류되며, 중요도에 따라 크기(Tier)가 결정됩니다.

| Category | Tier | Size (Cols×Rows) | Color (Azure) | Cloud Examples |
| :--- | :--- | :--- | :--- | :--- |
| **compute** | core | 3×4 | #F25022 | Virtual Machine, ECS, GCE |
| **database** | anchor | 4×6 | #00A4EF | SQL DB, RDS, Spanner |
| **storage** | service | 2×4 | #7FBA00 | Blob Storage, S3, GCS |
| **gateway** | service | 2×4 | #0078D4 | App Gateway, ALB, Load Balancer |
| **function** | light | 2×2 | #FFB900 | App Service, Lambda, Functions |
| **queue** | service | 2×4 | #737373 | Message Queue, SQS, Service Bus |
| **event** | signal | 1×2 | #D83B01 | Event Hub, EventBridge, Event Grid |
| **timer** | signal | 1×2 | #5C2D91 | Timer, CloudWatch, Scheduler |

#### 크기 체계 (Tier System)
*   **signal (1×2)**: 가장 작음 — 트리거나 스케줄러와 같은 신호 발생기
*   **light (2×2)**: 컴팩트 — 서버리스 함수와 같은 가벼운 서비스
*   **service (2×4)**: 표준 — 대부분의 일반적인 서비스
*   **core (3×4)**: 대형 — 주요 연산 처리를 담당하는 핵심 서비스
*   **anchor (4×6)**: 가장 큼 — 데이터베이스와 같은 아키텍처의 중심축

---

### 2.3 Studs (스터드)

CloudBlocks의 모든 요소(기판, 블록 등)는 **유니버설 스터드 표준(Universal Stud Standard)**을 따릅니다.

*   **동일한 규격**: 모든 스터드는 크기(rx=12, ry=6, height=5)가 동일합니다.
*   **조립 가능 (Assembly Possible)**: "같은 규격 = 조립 가능" 원칙에 따라, 어떤 블록이든 기판 위에 정확하게 들어맞습니다.
*   **3층 구조**: 그림자(Shadow), 상단 원(Top), 내부 링(Inner Ring)으로 구성되어 입체감을 제공합니다.

---

### 2.4 Connections (화살표)

서비스 간의 연결은 요청의 **시작점(Initiator)**에서 **도착점(Receiver)**으로 화살표를 그립니다.

1.  **Internet → Gateway**: 외부 트래픽이 서비스로 들어오는 경로
2.  **Gateway → Compute, Function**: 요청을 실제 처리 부서로 전달
3.  **Compute → Database, Storage**: 데이터 읽기/쓰기 접근
4.  **Function → Storage, Database, Queue**: 서버리스 프로세싱 결과 저장 또는 전달
5.  **Queue/Timer/Event → Function**: 비동기 트래픽이나 스케줄에 의한 자동 실행

---

### 2.5 External Actors (외부 요소)

*   **Internet 아이콘**: 외부 네트워크 트래픽의 근원지를 나타냅니다.
*   **User 아이콘**: 서비스를 사용하는 최종 사용자를 나타냅니다.

---

## 3. Assembly Rules — 조립 규칙

### 3.1 "이 블록은 어디에 놓을 수 있나?" (Placement)

서비스의 성격에 따라 놓일 수 있는 기판의 종류가 정해져 있습니다.

| Block | Allowed Placement | Rule |
| :--- | :--- | :--- |
| **gateway** | Public Subnet ONLY | 게이트웨이는 외부 인터넷을 마주해야 합니다. |
| **database** | Private Subnet ONLY | 데이터베이스는 보안을 위해 항상 보호받아야 합니다. |
| **compute, storage** | Any Subnet | 유연하게 배치할 수 있습니다. |
| **function, queue, event, timer** | Network (Directly) | 서버리스 서비스들은 서브넷 없이 네트워크에 바로 놓입니다. |

### 3.2 "무엇을 연결할 수 있나?" (Connections)

*   **유효한 연결**: 게이트웨이에서 연산 장치로, 연산 장치에서 데이터베이스로 연결하는 것은 권장되는 패턴입니다.
*   **주의 사항**: 데이터베이스끼리 직접 연결하거나, 외부 인터넷에서 데이터베이스로 직접 연결하는 것은 보안 규칙상 금지됩니다.

---

## 4. Provider Themes — 클라우드별 테마

브릭의 색상은 선택한 클라우드 제공업체에 따라 달라집니다. (기판의 색상은 유지됩니다.)

### Azure (현재 구현됨)
가장 표준적인 Azure 브랜드 색상 테마를 사용합니다. (예: Compute - Red, Database - Blue)

### AWS (예정)
오렌지와 네이비 톤의 AWS 브랜드 팔레트를 적용할 예정입니다.

### GCP (예정)
구글의 상징색인 블루, 그린, 옐로우, 레드를 활용한 테마를 적용할 예정입니다.

---

## 5. Build Examples — 완성 레퍼런스

### 5.1 Three-Tier Web App (표준 웹 앱)
가장 고전적인 웹 서비스 구조입니다.
`인터넷 → 게이트웨이 (Public) → 가상 머신 (Private) → 데이터베이스 (Private)`

### 5.2 Serverless API (서버리스 API)
빠르고 가벼운 서비스 구조입니다.
`인터넷 → 게이트웨이 (Public) → 함수 (Network) → 데이터베이스 (Private)`

### 5.3 Event-Driven Pipeline (이벤트 기반 파이프라인)
데이터 처리를 자동화하는 구조입니다.
`이벤트 (Network) → 함수 (Network) → 저장소 (Subnet) → 큐 (Network) → 함수 (Network)`

---

## 6. Quick Reference Card — 한 페이지 치트시트

| Category | Size | Color | Placement | Icon |
| :--- | :--- | :--- | :--- | :--- |
| **gateway** | 2×4 | #0078D4 | Public Subnet | 🛡️ |
| **compute** | 3×4 | #F25022 | Any Subnet | 🖥️ |
| **database** | 4×6 | #00A4EF | Private Subnet | 🗄️ |
| **storage** | 2×4 | #7FBA00 | Any Subnet | 📦 |
| **function** | 2×2 | #FFB900 | Network | ⚡ |
| **queue** | 2×4 | #737373 | Network | 📨 |
| **event** | 1×2 | #D83B01 | Network | 🔔 |
| **timer** | 1×2 | #5C2D91 | Network | ⏰ |

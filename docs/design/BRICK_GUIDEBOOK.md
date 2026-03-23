# 🧱 CloudBlocks Brick Design Guidebook

> Build Cloud Like Lego

CloudBlocks is a tool that lets you intuitively visualize and design complex cloud architectures as if they were Lego bricks. This guidebook explains the CloudBlocks design system and assembly rules so that even non-experts can easily understand them.

---

## Table of Contents

1. [Welcome](#1-welcome)
2. [Parts Catalog — All Parts at a Glance](#2-parts-catalog--all-parts-at-a-glance)
   - [2.1 Plates](#21-plates)
   - [2.2 Blocks](#22-blocks)
   - [2.3 Studs](#23-studs)
   - [2.4 Connections](#24-connections)
   - [2.5 External Actors](#25-external-actors)
3. [Assembly Rules](#3-assembly-rules)
4. [Provider Themes](#4-provider-themes)
5. [Build Examples](#5-build-examples)
6. [Quick Reference Card](#6-quick-reference-card)

---

## 1. Welcome

CloudBlocks represents cloud services as "Lego bricks."

- **Plates**: Baseplates that represent network boundaries. They serve as the foundation on which blocks are placed.
- **Blocks**: Represent actual cloud services such as virtual machines and databases.
- **Studs**: Circular protrusions on top of every part. They are the key element that ensures uniform sizing across components.
- **Connections**: Arrows that indicate the direction of data flow or network requests.

---

## 2. Parts Catalog — All Parts at a Glance

### 2.1 Plates

Baseplates that represent networks and subnets. Their purpose varies by size and color.

| Kind               | Name            | Color                       | Purpose                                                                      |
| :----------------- | :-------------- | :-------------------------- | :--------------------------------------------------------------------------- |
| **Network**        | Virtual Network | Deep Blue (#2563EB)         | The largest network boundary that encloses the entire architecture           |
| **Public Subnet**  | Public Subnet   | Bright Green (#22C55E)      | Space where services that communicate directly with the internet are located |
| **Private Subnet** | Private Subnet  | Indigo/Red (#6366F1/DC2626) | Secure service space where only internal communication is allowed            |

---

### 2.2 Blocks

Cloud services are classified into 8 categories by function, and their size (Tier) is determined by importance.

| Category     | Tier    | Size (Cols×Rows) | Color (Azure) | Cloud Examples                     |
| :----------- | :------ | :--------------- | :------------ | :--------------------------------- |
| **compute**  | core    | 3×4              | #F25022       | Virtual Machine, ECS, GCE          |
| **database** | anchor  | 4×6              | #00A4EF       | SQL DB, RDS, Spanner               |
| **storage**  | service | 2×4              | #7FBA00       | Blob Storage, S3, GCS              |
| **gateway**  | service | 2×4              | #0078D4       | App Gateway, ALB, Load Balancer    |
| **function** | light   | 2×2              | #FFB900       | App Service, Lambda, Functions     |
| **queue**    | service | 2×4              | #737373       | Message Queue, SQS, Service Bus    |
| **event**    | signal  | 1×2              | #D83B01       | Event Hub, EventBridge, Event Grid |
| **timer**    | signal  | 1×2              | #5C2D91       | Timer, CloudWatch, Scheduler       |

#### Tier System

- **signal (1×2)**: Smallest — signal generators such as triggers and schedulers
- **light (2×2)**: Compact — lightweight services such as serverless functions
- **service (2×4)**: Standard — most general-purpose services
- **core (3×4)**: Large — core services responsible for primary computation
- **anchor (4×6)**: Largest — architectural anchors such as databases

---

### 2.3 Studs

Every element in CloudBlocks (plates, blocks, etc.) follows the **Universal Stud Standard**.

- **Identical dimensions**: All studs share the same size (rx=12, ry=6, height=5).
- **Assembly possible**: Following the "same gauge = assembly possible" principle, any block fits precisely onto any plate.
- **3-layer structure**: Composed of a shadow, top surface, and inner ring to provide a three-dimensional appearance.

---

### 2.4 Connections

Connections between services are drawn as arrows from the **Initiator** to the **Receiver**.

1.  **Internet → Gateway**: The path through which external traffic enters the service
2.  **Gateway → Compute, Function**: Forwards requests to the actual processing units
3.  **Compute → Database, Storage**: Data read/write access
4.  **Function → Storage, Database, Queue**: Stores or forwards serverless processing results
5.  **Queue/Timer/Event → Function**: Automatic execution triggered by asynchronous traffic or schedules

---

### 2.5 External Actors

- **Internet icon**: Represents the origin of external network traffic.
- **User icon**: Represents the end user who uses the service.

---

## 3. Assembly Rules

### 3.1 Placement — "Where can this block go?"

The type of plate on which a service can be placed is determined by the nature of the service.

| Block                             | Allowed Placement   | Rule                                                                     |
| :-------------------------------- | :------------------ | :----------------------------------------------------------------------- |
| **gateway**                       | Public Subnet ONLY  | Gateways must face the external internet.                                |
| **database**                      | Private Subnet ONLY | Databases must always be protected for security.                         |
| **compute, storage**              | Any Subnet          | Can be flexibly placed on any subnet.                                    |
| **function, queue, event, timer** | Network (Directly)  | Serverless services are placed directly on the network without a subnet. |

### 3.2 Connections — "What can be connected?"

- **Valid connections**: Connecting from a gateway to compute, or from compute to a database, are recommended patterns.
- **Caution**: Directly connecting databases to each other, or connecting from the external internet directly to a database, is prohibited by security rules.

---

## 4. Provider Themes

Block colors vary depending on the selected cloud provider. (Plate colors remain the same.)

### Azure (Currently Implemented)

Uses the standard Azure brand color theme. (e.g., Compute - Red, Database - Blue)

### AWS (Planned)

An orange and navy AWS brand palette will be applied.

### GCP (Planned)

A theme using Google's signature colors — blue, green, yellow, and red — will be applied.

---

## 5. Build Examples

### 5.1 Three-Tier Web App

The most classic web service architecture.
`Internet → Gateway (Public) → Virtual Machine (Private) → Database (Private)`

### 5.2 Serverless API

A fast and lightweight service architecture.
`Internet → Gateway (Public) → Function (Network) → Database (Private)`

### 5.3 Event-Driven Pipeline

An architecture that automates data processing.
`Event (Network) → Function (Network) → Storage (Subnet) → Queue (Network) → Function (Network)`

---

## 6. Quick Reference Card

| Category     | Size | Color   | Placement      | Icon |
| :----------- | :--- | :------ | :------------- | :--- |
| **gateway**  | 2×4  | #0078D4 | Public Subnet  | 🛡️   |
| **compute**  | 3×4  | #F25022 | Any Subnet     | 🖥️   |
| **database** | 4×6  | #00A4EF | Private Subnet | 🗄️   |
| **storage**  | 2×4  | #7FBA00 | Any Subnet     | 📦   |
| **function** | 2×2  | #FFB900 | Network        | ⚡   |
| **queue**    | 2×4  | #737373 | Network        | 📨   |
| **event**    | 1×2  | #D83B01 | Network        | 🔔   |
| **timer**    | 1×2  | #5C2D91 | Network        | ⏰   |

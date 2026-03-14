# Cloud Lego Platform - Development Roadmap

This document defines the staged development roadmap for the Cloud Lego Platform.

The platform aims to evolve from a **visual cloud learning tool** into a **full cloud architecture platform** capable of real deployment, simulation, and physical interaction.

---

# Phase 0 — Concept Validation

Goal:
Validate the Cloud Lego abstraction model.

Key Objectives:

- Plate based architecture modeling
- Block based resource representation
- Rule-based architecture validation

Deliverables:

- Core Domain Model (TypeScript types)
- Basic Block/Plate System
- Architecture validation engine

Outcome:

Proof that the **Lego abstraction works for cloud architecture education**.

### Exit Criteria
- [ ] Domain model types implemented in TypeScript
- [ ] Basic block/plate system compiles without errors
- [ ] Architecture validation engine returns correct results for 5+ test cases

---

# v0.1 — Cloud Lego Builder (MVP)

Goal:
Create a working **Cloud Lego visual architecture builder**.

Features:

Visual Editor

- Network Plate
- Subnet Plate (Public / Private)
- Basic resource blocks
- Drag and drop block placement

Plates

- Network Plate
- Subnet Plate (Public / Private)

Basic Blocks

- Compute (App)
- Database
- Storage
- Gateway

Rule Engine

Examples:

- Database cannot be placed in public subnet
- Compute must be inside subnet
- Gateway must be placed on public subnet

Architecture Flow Visualization

Example:

```
Internet → Gateway → App → Database
```

Workspace Persistence

- Save architecture to local storage
- Load saved architecture
- Architecture state preserved on reload

Deliverables:

- Visual Lego Builder (React + React Three Fiber)
- Basic architecture validation (in-browser Rule Engine)
- Workspace save/load (localStorage)

Target Users:

Cloud beginners.

### Exit Criteria
- [ ] 3-tier architecture (Gateway → App → Database) can be constructed visually
- [ ] Placement validation catches 100% of rule violations
- [ ] Connection validation catches invalid connections
- [ ] Workspace save/load roundtrip preserves all state
- [ ] Build passes with zero errors

### Dependencies
- Phase 0 complete

---

# v0.5 — Azure Deployment Integration

Goal:
Allow users to **deploy Lego architecture to Azure**.

Supported Infrastructure:

- Virtual Network
- Subnet
- VM / Container App
- Azure SQL
- Blob Storage
- Application Gateway

Pipeline:

```
Visual Model
↓
Provider Adapter (Azure)
↓
Infrastructure Code (Bicep / Terraform)
↓
Azure Deployment
```

Features:

- Deploy button
- Deployment status feedback
- URL access for deployed apps

Outcome:

Users can see their architecture **running in real cloud infrastructure**.

### Exit Criteria
- [ ] Azure deployment succeeds for 3-tier architecture
- [ ] Deployment status displayed in real-time
- [ ] Deployed application accessible via URL
- [ ] Cost guard: deployment limited to sandbox resource group

### Dependencies
- v0.1 complete
- Azure credential management implemented
- Deployment sandbox environment configured

---

# v1.0 — Serverless Learning Platform

Goal:
Teach event-driven architecture.

New Blocks:

- Function
- Queue
- Event
- Timer

Example Scenario:

```
HTTP → Function → Storage
```

Learning Missions:

Mission 1

Build a serverless API.

Mission 2

Build an event-driven pipeline.

Mission 3

Build a scheduled job.

Features:

- Event flow visualization
- Trigger compatibility rules
- Serverless architecture templates

Outcome:

Platform becomes a **complete cloud learning environment**.

### Exit Criteria
- [ ] Function, Queue, Event, Timer blocks available
- [ ] Serverless architecture (HTTP → Function → Storage) constructable
- [ ] All 3 learning missions completable

### Dependencies
- v0.5 complete

---

# v1.5 — Scenario Engine

Goal:
Provide guided learning experiences.

Features:

- Learning missions
- Architecture templates
- Auto validation
- Guided hints

Example Missions:

- 3-tier architecture
- Serverless API
- Data pipeline

Outcome:

Cloud Lego becomes a **cloud education platform**.

### Exit Criteria
- [ ] 3+ guided scenarios with step-by-step hints
- [ ] Auto-validation provides actionable feedback
- [ ] Scenario completion rate tracked

### Dependencies
- v1.0 complete

---

# v2.0 — Multi Cloud Platform

Goal:
Support multiple cloud providers.

Providers:

- Azure
- AWS
- GCP

Architecture remains the same.

Example mapping:

Network

- Azure → VNet
- AWS → VPC
- GCP → VPC

Compute

- Azure → VM / Container App
- AWS → EC2
- GCP → Compute Engine

Features:

- Provider switch
- Multi cloud architecture examples
- Cross cloud comparison learning

Outcome:

Cloud Lego becomes a **universal cloud learning system**.

### Exit Criteria
- [ ] AWS and GCP provider adapters functional
- [ ] Same architecture deployable to any supported provider
- [ ] Provider comparison view available

### Dependencies
- v1.0 complete (can run parallel with v1.5)

---

# v2.5 — Cloud Simulation Engine

Goal:
Simulate architecture behavior.

Features:

- Request flow simulation
- Latency modeling
- Failure simulation
- Scaling simulation

Example:

User request simulation

```
Internet → Gateway → App → DB
```

Outcome:

Students can **see how architecture behaves under load**.

---

# v3.0 — Cloud Digital Twin

Goal:
Synchronize visual architecture with real infrastructure.

Features:

- Live infrastructure status
- Real time cloud health visualization
- Deployment monitoring

Example:

- Green block → running
- Red block → error
- Yellow block → deploying

Outcome:

Visual architecture becomes a **cloud operations dashboard**.

---

# v3.5 — Physical Lego Integration

Goal:
Allow real Lego blocks to control cloud architecture.

Technologies:

- NFC
- RFID
- BLE sensors
- IoT microcontrollers

Architecture:

```
Physical Lego Block
↓
IoT Sensor Detection
↓
Cloud Lego Model Update
↓
Infrastructure Deployment
```

Outcome:

Cloud Lego becomes a **tangible cloud learning system**.

---

# Long Term Vision

Cloud Lego Platform evolves into:

- Cloud education platform
- Visual cloud architecture builder
- Cloud simulator
- Cloud operations dashboard
- Physical Lego cloud interface

---

# Development Strategy

Key principles:

1. Start with **small core model**
2. Validate Lego abstraction early
3. Expand through modular layers
4. Maintain provider abstraction
5. Prioritize education-first experience

---

# Success Metrics

Phase 0 + v0.1

- Architecture built successfully
- Validation engine working
- Workspace persistence functional

v0.5

- Successful Azure deployments

v1.0

- Serverless scenarios completed

v1.5

- Guided learning scenarios operational

v2.0

- Multi cloud architecture support

v2.5+

- Simulation and digital twin operational
- Physical Lego prototype working

---

# Summary

The roadmap evolves Cloud Lego from:

Visual Cloud Builder (v0.1)

→ Cloud Deployment Platform (v0.5)

→ Learning Platform (v1.0 / v1.5)

→ Multi Cloud Architecture Tool (v2.0)

→ Cloud Simulator (v2.5)

→ Cloud Digital Twin (v3.0)

→ Physical Cloud Interface (v3.5)

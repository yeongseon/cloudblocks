# CloudBlocks PRD

Build cloud architecture visually and generate production-ready Infrastructure-as-Code.

---

# 1. Product Summary

CloudBlocks is an **open-source visual cloud architecture builder** that allows users to design infrastructure using a **2.5D isometric block interface** and export the architecture as Infrastructure-as-Code.

Unlike traditional diagram tools, every visual element represents a **real infrastructure component** and maps directly to deployable code.

The system enforces architectural rules and generates infrastructure definitions such as Terraform.

---

# 2. Problem Statement

Designing cloud architecture currently requires switching between multiple tools:

| Task | Tool |
|-----|------|
| Architecture design | draw.io / Lucidchart |
| Infrastructure code | Terraform / Bicep |
| Validation | Manual review |
| Deployment | CI/CD pipelines |

This workflow creates several problems:

- Visual diagrams do not match deployed infrastructure
- Infrastructure code is difficult for beginners
- Architecture validation is manual
- Design → deployment pipeline is fragmented

CloudBlocks solves this by making **visual architecture the source of truth**.

---

# 3. Product Vision

CloudBlocks enables a new workflow:

```
Architecture Design → Validation → Code Generation → Deployment
```

Users design architecture visually and the system generates deployable infrastructure code.

Long-term goal:

**Architecture becomes the primary interface for infrastructure.**

---

# 4. Goals

### Primary Goals

1. Enable users to design cloud architecture visually
2. Enforce architecture correctness through rule validation
3. Export architecture as a structured model
4. Generate Infrastructure-as-Code from architecture

### MVP Goals

- Build valid cloud architecture visually
- Enforce architecture placement rules
- Export architecture model (`architecture.json`)

---

# 5. Non-Goals (MVP)

The following features are **not included in MVP**:

- Multi-user collaboration
- Authentication
- Cloud deployment
- Full 3D modeling
- Real-time infrastructure sync
- Multi-cloud support

---

# 6. Target Users

## Primary Users

### Developers

Developers designing infrastructure for applications.

Use cases:

- Prototype architecture quickly
- Understand system layout visually
- Export infrastructure code

### DevOps Engineers

DevOps teams designing deployment architecture.

Use cases:

- Define infrastructure patterns
- Generate Terraform templates
- Review architecture visually

### Solution Architects

Architects prototyping cloud designs before implementation.

---

# 7. User Workflow

## Primary Workflow

```
Create Architecture
↓
Add Network
↓
Add Subnets
↓
Place Resources
↓
Connect Resources
↓
Validate Architecture
↓
Export Architecture Model
```

---

# 8. Core Concepts

CloudBlocks uses a **hierarchical architecture model**.

```
ExternalActor (Internet)
└ Plate (Network)
  └ Plate (Subnet)
    └ Block (Resource)
```

### Terminology Mapping

| PRD Term | Code Type | Description |
|----------|-----------|-------------|
| Network | `Plate` (type: `network`) | Cloud network container (Azure VNet, AWS VPC) |
| Subnet | `Plate` (type: `subnet`) | Subnet within a network |
| Resource | `Block` | Infrastructure component (compute, database, storage, gateway) |
| Internet | `ExternalActor` (type: `internet`) | External traffic entry point |
| Connection | `Connection` (type: `dataflow`) | Request flow between components |
| Architecture | `ArchitectureModel` | Root model containing all elements |
| Workspace | `Workspace` | Container for one architecture + metadata |

> See also: ARCHITECTURE.md §3 (Core Modeling Engine), §3.5 (Architecture Model Schema)

---

# 9. Architecture Elements

## 9.1 Plates

Plates represent **infrastructure containers**.

### Network Plate

Represents cloud network.

Examples:

- Azure VNet
- AWS VPC

### Subnet Plate

Represents subnet within a network.

Types:

- Public
- Private

Rules:

- Must exist inside Network Plate

---

## 9.2 Blocks

Blocks represent **infrastructure resources**.

| Block Type | Description |
|------------|-------------|
| Compute | Application runtime |
| Database | Persistent database |
| Storage | Object/file storage |
| Gateway | Entry traffic point |

Example architecture:

```
Internet → Gateway → Compute → Database
```

---

## 9.3 Connections

Connections represent **request flow between components**.

Rules:

- Direction indicates request initiator
- Responses are implicit reverse flow

Example:

```
Internet → Gateway → App → Database
```

---

# 10. Layout Model

CloudBlocks uses **hierarchical spatial containment**.

```
Internet
└ Network
  └ Subnet
    └ Blocks
```

Rules:

- Blocks must be placed inside Subnets
- Subnets must be inside Networks
- Blocks cannot exist outside Subnets

---

# 11. Architecture Rules

The system validates architecture automatically.

Example rules:

| Rule | Description |
|----|-----|
| Database cannot exist in Public Subnet | Security rule |
| Gateway must exist in Public Subnet | Entry traffic |
| Compute must exist in Subnet | Network requirement |
| Blocks cannot exist outside Subnet | Structural rule |

> See also: ARCHITECTURE.md §4 (Rule Engine)

If rules are violated the system displays validation errors.

---

# 12. MVP Feature Set

## Visual Builder

Features:

- Isometric architecture editor
- Block placement
- Plate hierarchy
- Snap-to-grid placement
- Resource palette

---

## Architecture Validation

The system validates architecture in real time.

Validation examples:

- Invalid placement
- Invalid connections
- Missing required components

---

## Architecture Model Export

Users can export architecture as structured JSON.

Example output:

```json
{
  "id": "arch-001",
  "name": "3-Tier Web App",
  "version": "1",
  "plates": [
    {
      "id": "plate-001",
      "name": "Main VNet",
      "type": "network",
      "parentId": null,
      "children": ["plate-002", "plate-003"],
      "position": { "x": 0, "y": 0, "z": 0 },
      "size": { "width": 12, "height": 0.3, "depth": 10 },
      "metadata": {}
    },
    {
      "id": "plate-002",
      "name": "Public Subnet",
      "type": "subnet",
      "subnetAccess": "public",
      "parentId": "plate-001",
      "children": ["block-001"],
      "position": { "x": -3, "y": 0.3, "z": 0 },
      "size": { "width": 5, "height": 0.2, "depth": 8 },
      "metadata": {}
    }
  ],
  "blocks": [
    {
      "id": "block-001",
      "name": "App Gateway",
      "category": "gateway",
      "placementId": "plate-002",
      "position": { "x": 0, "y": 0.5, "z": 0 },
      "metadata": {}
    }
  ],
  "connections": [
    {
      "id": "conn-001",
      "sourceId": "ext-internet",
      "targetId": "block-001",
      "type": "dataflow",
      "metadata": {}
    }
  ],
  "externalActors": [
    { "id": "ext-internet", "name": "Internet", "type": "internet" }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

> This JSON matches the `ArchitectureModel` schema defined in `apps/web/src/shared/types/index.ts`. The export is the full model, not a simplified projection.

# 13. User Interface

## Main Components

### Canvas

Main architecture editing space.

Features:

- Isometric view
- Grid placement
- Block interaction

### Palette

Contains components users can place.

Items:

- Network
- Subnet
- Compute
- Database
- Storage
- Gateway

### Inspector Panel

Displays properties of selected component.

Users can modify:

- Name
- Type
- Metadata

### Validation Panel

Displays architecture errors.

> See also: ARCHITECTURE.md §6 (Rendering Layer Architecture)
---

# 14. Technical Constraints

The editor uses 2.5D isometric rendering.

Reasons:

- Improved readability
- Reduced interaction complexity
- Simpler implementation than full 3D

The system internally uses a 2D coordinate model.

> See also: ARCHITECTURE.md §6 (Rendering Layer), §14 (Technical Constraints)

---

# 15. Success Metrics

## MVP Metrics

| Metric | Target |
|--------|--------|
| Architecture build time | <5 minutes |
| Validation accuracy | >95% |
| Architecture export success | >99% |

---

# 16. Future Roadmap

## v0.3 — Code Generation

- Terraform generation
- Architecture → IaC pipeline

## v0.5 — GitHub Integration

- GitHub OAuth
- Commit architecture to repo
- Pull request workflow

## v1.0 — Template System

- Prebuilt architecture templates
- Serverless patterns
- Event driven architectures

> See also: ARCHITECTURE.md §5 (Code Generation Pipeline), §8 (GitHub Integration)

---

# 17. Monetization

CloudBlocks will use an open core model.

| Tier | Description |
|------|-------------|
| Open Source | Core builder |
| Pro | Hosted SaaS |
| Enterprise | Architecture consulting |

---

# 18. Risks

## Product Risk

Users may perceive CloudBlocks as a diagram tool instead of an infrastructure generator.

Mitigation:

- Focus messaging on architecture-to-code.

## UX Risk

2.5D isometric interactions may have a learning curve for users.

Mitigation:

- Fixed camera
- Snap-to-grid
- Hierarchical containment

---

# 19. Summary

CloudBlocks provides a visual architecture-to-code platform.

Users design cloud systems visually and the system produces deployable infrastructure definitions.

The product combines:

- Visual architecture design
- Architecture validation
- Infrastructure code generation

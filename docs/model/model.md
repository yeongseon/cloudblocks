# CloudBlocks Architecture Model

CloudBlocks is an **architecture compiler**.

Instead of generating infrastructure code directly from diagrams, CloudBlocks introduces an intermediate **architecture model layer**.

```
Diagram (UI)
    ↓
Architecture Model (CloudBlocks DSL)
    ↓
Generator
    ↓
Infrastructure Code
```

The architecture model provides a **provider-agnostic** representation of infrastructure architecture.

---

## Core Model

### Workspace

Workspace is the top-level container for architecture projects.

```json
{
  "id": "workspace-1",
  "name": "My Architecture",
  "architecture": {
    "id": "arch-1",
    "name": "3-Tier Web App",
    "plates": [],
    "blocks": [],
    "connections": [],
    "externalActors": []
  }
}
```

**Responsibilities:**

- Group architecture projects
- Manage versions
- Integrate with Git repositories

---

### Architecture

Architecture represents a deployable infrastructure topology.

```json
{
  "id": "arch-1",
  "name": "Three-tier web app",
  "plates": [],
  "blocks": [],
  "connections": []
}
```

**Responsibilities:**

- Infrastructure topology definition
- Validation input
- Generator input

---

### Plate

Plate represents a logical infrastructure boundary.

**Examples:** VPC, Subnet, Resource Group, Network Zone

```json
{
  "id": "plate-1",
  "type": "subnet",
  "children": []
}
```

**Responsibilities:**

- Network boundary
- Logical grouping
- Layout container

---

### Block

Block represents an infrastructure resource.

**Examples:** Compute, Database, Storage, Gateway

```json
{
  "id": "block-1",
  "category": "compute",
  "placementId": "plate-1"
}
```

**Responsibilities:**

- Infrastructure resource abstraction
- Generator mapping

---

### Connection

Connection represents communication between resources.

```json
{
  "sourceId": "block-a",
  "targetId": "block-b",
  "type": "dataflow"
}
```

**Connection types:**

| Type | Meaning | Version |
|------|---------|---------|
| `dataflow` | Request/response communication | v0.1 (MVP) |
| `eventflow` | Event-driven trigger | v1.0 (planned) |
| `dependency` | Resource dependency | v1.0 (planned) |

### External Actor

An External Actor represents an endpoint outside the system (e.g., Internet).

```json
{
  "id": "ext-internet",
  "name": "Internet",
  "type": "internet"
}
```

External Actors can be used as a source or target of a Connection, but are not Plates or Blocks.

> **v0.1 supports `dataflow` only.** EventFlow and Dependency are planned for v1.0.
---

## Policy Model

Policies enforce architecture constraints.

**Example policy:**

```
internet → gateway → compute → database
```

Policies are validated by the rule engine. See [rules.md](../engine/rules.md) for details.

---

## Versioning

Architecture models contain version metadata.

| Field | Purpose |
|-------|---------|
| `schemaVersion` | Storage format version — enables future model migrations |
| `modelVersion` | User-facing revision counter |

---

## Future Extensions

Planned model extensions:

- Deployment environments
- Scaling policies
- Security policies

---

> **Cross-references:**
> - Domain model details: [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)
> - Rule engine: [rules.md](../engine/rules.md)
> - Code generation: [generator.md](../engine/generator.md)
> - Provider mapping: [provider.md](../engine/provider.md)

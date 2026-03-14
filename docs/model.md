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
  "architectures": []
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

**Examples:** Compute, Database, Storage, Queue, Gateway

```json
{
  "id": "block-1",
  "type": "compute",
  "plateId": "plate-1"
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
  "source": "block-a",
  "target": "block-b",
  "type": "network"
}
```

**Connection types:**

| Type | Meaning |
|------|---------|
| `network` | TCP/HTTP connectivity |
| `data` | Database/storage access |
| `event` | Message/event flow |

---

## Policy Model

Policies enforce architecture constraints.

**Example policy:**

```
internet → gateway → compute → database
```

Policies are validated by the rule engine. See [rules.md](./rules.md) for details.

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
> - Rule engine: [rules.md](./rules.md)
> - Code generation: [generator.md](./generator.md)
> - Provider mapping: [provider.md](./provider.md)

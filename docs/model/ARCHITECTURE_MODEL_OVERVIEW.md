# CloudBlocks Architecture Model Overview

> **Status**: Supporting  
> **Canonical Source**: [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)

CloudBlocks is an **architecture compiler** that converts visual infrastructure designs into deployable code.

---

## Pipeline

```
Diagram (UI)
    ↓
Architecture Model (DSL)
    ↓
Validation (Rule Engine)
    ↓
Generator
    ↓
Infrastructure Code (Terraform, Bicep, Pulumi)
```

The architecture model provides a **provider-agnostic** representation of infrastructure.

---

## Core Entities

| Entity | Description | Canonical Reference |
|--------|-------------|---------------------|
| **Workspace** | Top-level container for architecture projects | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §13 |
| **Architecture** | Deployable infrastructure topology | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §14 |
| **Plate** | Infrastructure boundary (Network / Subnet) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §3 |
| **Block** | Infrastructure resource (compute, database, storage, gateway) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §4-5 |
| **Application** | Software on hostable resources (nginx, nodejs, postgres) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §4.5 |
| **Connection** | Communication flow between blocks (initiator model) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §6 |
| **External Actor** | External endpoint (e.g., Internet) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §6.1 |

---

## DSL Design Goals

- Provider-neutral infrastructure modeling
- Visual-first architecture composition
- Deterministic infrastructure generation
- Rule-based architecture validation

The DSL serves as the canonical representation between the visual diagram editor and infrastructure generators.

---

## Position Model

CloudBlocks stores object positions using a 3D coordinate system:

| Axis | Meaning |
|------|---------|
| x | Horizontal position |
| z | Layout depth |
| y | Elevation (2.5D rendering layer) |

The visual editor operates on the **x-z plane**. The y-axis is used only for visual stacking (2.5D projection).

---

## Architecture Graph

The architecture model can be interpreted as a directed graph:

```
internet → gateway → compute → database
                           → storage
```

This graph is consumed by:
- **Rule engine** — validates constraints
- **Generator** — produces IaC code

---

## Policy Model

Policies enforce architecture constraints.

Example valid flow:
```
internet → gateway → compute → database
```

Example violations:
- `internet → database` (database must not be directly exposed)
- `database → compute` (database is receiver-only)

> For complete rule set, see [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §7.

---

## Versioning

| Field | Purpose |
|-------|---------|
| `schemaVersion` | Storage format version — enables model migrations |
| `modelVersion` | User-facing revision counter |

> See [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §9 for details.

---

## Infrastructure Generation

Generator pipeline:

```
Architecture Model
    ↓
Dependency Graph
    ↓
Provider Mapping (Azure, AWS, GCP)
    ↓
IaC Generation (Terraform, Bicep, Pulumi)
```

> See [generator.md](../engine/generator.md) and [provider.md](../engine/provider.md).

---

## Cross-References

| Topic | Document |
|-------|----------|
| Domain model (canonical) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) |
| Visual sizing | [BRICK_SIZE_SPEC.md](../design/BRICK_SIZE_SPEC.md) |
| Rule engine | [rules.md](../engine/rules.md) |
| Code generation | [generator.md](../engine/generator.md) |
| Provider mapping | [provider.md](../engine/provider.md) |

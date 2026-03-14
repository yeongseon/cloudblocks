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

The CloudBlocks model is composed of the following core entities:

| Entity | Description | Canonical Reference |
|--------|-------------|---------------------|
| **Workspace** | Top-level container for architecture projects | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §13 |
| **Architecture** | Deployable infrastructure topology (root container) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §14 |
| **Plate** | Infrastructure boundary (Network / Subnet) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §3 |
| **Block** | Infrastructure resource (compute / database / storage / gateway) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §4-5 |
| **Connection** | Communication flow between blocks (initiator model) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §6 |
| **External Actor** | External endpoint (e.g., Internet) | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §6.1 |

> For full TypeScript interfaces, JSON examples, field specifications, and model invariants, see [DOMAIN_MODEL.md](./DOMAIN_MODEL.md).

---

## Policy Model

Policies enforce architecture constraints.

**Example policy:**

```
internet → gateway → compute → database
```

Policies are validated by the rule engine. See [rules.md](../engine/rules.md) for details and [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §7 for the complete rule set.

---

## Versioning

Architecture models contain version metadata.

| Field | Purpose | Canonical Source |
|-------|---------|-----------------|
| `schemaVersion` | Storage format version — enables future model migrations | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §9 |
| `modelVersion` | User-facing revision counter | [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) §9 |

---

## Future Extensions

Planned model extensions:

- Deployment environments
- Scaling policies
- Security policies

---

> **Cross-references:**
> - Domain model (canonical): [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)
> - DSL specification: [DSL_SPEC.md](../DSL_SPEC.md)
> - Architecture graph: [ARCHITECTURE_GRAPH.md](../ARCHITECTURE_GRAPH.md)
> - Rule engine: [rules.md](../engine/rules.md)
> - Code generation: [generator.md](../engine/generator.md)
> - Provider mapping: [provider.md](../engine/provider.md)

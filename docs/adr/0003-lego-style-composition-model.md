# ADR-0003: Lego-Style Composition Model

**Status**: Accepted
**Date**: 2025-01

## Context

CloudBlocks needs a visual metaphor for modeling cloud infrastructure. The metaphor must be:

- Intuitive to non-experts (not just DevOps engineers)
- Structurally accurate (not just decorative boxes)
- Composable (infrastructure is hierarchical)
- Constrainable (not everything connects to everything)

Options considered:

1. **Free-form diagram** — boxes and arrows, no constraints (like draw.io)
2. **Node-graph** — input/output ports with wires (like Unreal Blueprints)
3. **Lego-style composition** — plates as containers, blocks as resources, connections as dataflow

Option 1 provides no semantic structure — any box can connect to any other box. Option 2 is powerful but overwhelming for infrastructure modeling (too many ports, too much flexibility).

## Decision

**Use a Lego-style composition model with three primitives: Plate, Block, and Connection.**

| Primitive | Role | Cloud Analogy | Lego Analogy |
|-----------|------|---------------|--------------|
| **Plate** | Infrastructure boundary | VNet, Subnet | Baseplate |
| **Block** | Infrastructure resource | VM, Database, Storage, Gateway | Brick |
| **Connection** | Communication flow | Network traffic, data flow | Connector |

### Composition rules

1. **Plates contain blocks** — blocks must be placed on a plate (enforced by placement rules)
2. **Plates nest hierarchically** — subnets are placed on networks
3. **Blocks connect via connections** — connections follow the initiator model
4. **Not everything connects** — the rule engine enforces valid connection patterns

### Hierarchy

```
Network Plate
├── Subnet Plate (Public)
│   ├── Gateway Block
│   └── Compute Block
└── Subnet Plate (Private)
    ├── Compute Block
    ├── Database Block
    └── Storage Block
```

### Connection direction (initiator model)

```
Internet → Gateway → Compute → Database
                            → Storage
```

Database and Storage are **receiver-only** — they never initiate connections. This matches real infrastructure topology.

## Consequences

### Positive

- **Intuitive** — "place blocks on plates" is immediately understandable
- **Constrained by design** — the composition model prevents invalid topologies before validation
- **Hierarchical** — naturally maps to cloud infrastructure (VNet → Subnet → Resource)
- **Extensible** — new block types and plate types can be added without changing the model
- **Visual clarity** — plates provide visual grouping, reducing diagram clutter

### Negative

- **Rigid topology** — some valid infrastructure patterns may not fit the plate/block model
- **Limited expressiveness** — the model is intentionally simpler than raw Terraform/Bicep
- **Learning curve** — users must learn the plate/block vocabulary (though it maps to Lego)

### Related Documents

- [PRD.md](../concept/PRD.md) — Product requirements (§3 Lego-Style Architecture Modeling)
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Entity definitions and rules
- [rules.md](../engine/rules.md) — Placement and connection validation rules

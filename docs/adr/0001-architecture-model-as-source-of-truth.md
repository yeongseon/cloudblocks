# ADR-0001: Architecture Model as Source of Truth

**Status**: Accepted
**Date**: 2025-01

## Context

CloudBlocks occupies a unique position between diagram tools (draw.io, Lucidchart) and infrastructure-as-code tools (Terraform, Bicep). A fundamental architectural question: what is the canonical representation of a user's infrastructure design?

Options considered:

1. **Visual layout is canonical** — the diagram IS the architecture (like draw.io)
2. **Generated code is canonical** — the IaC output IS the architecture (like Terraform)
3. **Architecture model is canonical** — an intermediate model layer between visual and code

Option 1 conflates visual presentation with infrastructure semantics. A repositioned block would mean a "changed" architecture even though nothing about the infrastructure changed. Option 2 would make CloudBlocks just a GUI for Terraform, losing the ability to support multiple generators or validate before generation.

## Decision

**The architecture model is the source of truth.** The visual editor and IaC generators are both projections of the underlying model.

```
Visual Editor (projection)  ←→  Architecture Model (source of truth)  →  IaC Code (projection)
```

The architecture model:

- Uses a provider-agnostic schema (no Azure/AWS/GCP specifics)
- Is defined in TypeScript types (`apps/web/src/shared/types/index.ts`)
- Is specified in `docs/model/DOMAIN_MODEL.md`
- Contains entities: `Plate`, `Block`, `Connection`, `ExternalActor`, wrapped in `ArchitectureModel`
- Serializes to JSON with versioned schema (`schemaVersion: "0.1.0"`)

This means:

- Moving a block visually does not change the architecture unless the placement changes
- Multiple visual themes can render the same model differently
- Multiple generators can consume the same model
- Validation operates on the model, not the visual representation

## Consequences

### Positive

- **Clean separation of concerns** — visual layer, model layer, and generation layer are independent
- **Multi-generator support** — same model generates Terraform, Bicep, or Pulumi
- **Testable validation** — rule engine validates the model directly, no DOM or 3D scene needed
- **Portable** — architecture model is just JSON, can be stored, versioned, diffed
- **Provider-agnostic** — model doesn't know about Azure/AWS, enabling multi-cloud

### Negative

- **Extra abstraction layer** — visual changes must sync to model and vice versa
- **Schema evolution** — model schema changes require migration strategy (addressed in `CONTRIBUTING.md` documentation policy)
- **Model completeness** — the model must capture all semantically meaningful information, not just visual layout

### Related Documents

- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Canonical model specification
- [ARCHITECTURE.md](../concept/ARCHITECTURE.md) — System architecture overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — Documentation versioning and layering policy

# Architecture Rule Engine

> **Audience**: Contributors | **Status**: Stable — Internal | **Verified against**: v0.26.0

> **Status**: Supporting — see [VALIDATION_CONTRACT.md](../design/VALIDATION_CONTRACT.md) for the canonical rule set.

CloudBlocks validates architecture models using a rules-based system. This document provides a high-level overview of the engine's purpose and architecture. For the complete list of implemented validation rules, refer to the [Validation Contract](../design/VALIDATION_CONTRACT.md).

---

## Purpose

The goal of the rule engine is to detect invalid or insecure architectures during the design phase, before any infrastructure-as-code is generated or deployed.

---

## Rule Execution Flow

```
Visual Architecture Model
          ↓
  Rule Engine (Orchestrator)
          ↓
  Validation Passes (Placement, Role, Connection, etc.)
          ↓
  Validation Result (Errors and Warnings)
```

---

## Validation Result

The engine produces a unified `ValidationResult` containing:

- **valid**: boolean (true if zero errors)
- **errors**: blocking violations that prevent code generation
- **warnings**: non-blocking suggestions or security hints

---

## Current Implementation

The rule engine is implemented as a set of focused modules that run in-browser after any architecture mutation.

- **Placement validation** — ensures blocks are on compatible container blocks.
- **Connection validation** — enforces client-server initiator semantics.
- **Role and Aggregation validation** — checks resource identity and scaling.
- **Provider-specific hints** — warns about provider-specific best practices.

### Implementation Reference

For the full implementation, see the following source files:

- `apps/web/src/entities/validation/engine.ts` (Orchestrator)
- `apps/web/src/entities/validation/placement.ts`
- `apps/web/src/entities/validation/connection.ts`
- `apps/web/src/entities/validation/aggregation.ts`
- `apps/web/src/entities/validation/role.ts`
- `apps/web/src/entities/validation/providerValidation.ts`

---

> **Cross-references:**
>
> - Canonical Rule Set: [VALIDATION_CONTRACT.md](../design/VALIDATION_CONTRACT.md)
> - Domain Model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Generator Pipeline: [generator.md](./generator.md)

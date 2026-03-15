# Validation Contract — Single Source of Truth

> Covers issues #23 and #24.

This document defines the canonical validation rule contract for CloudBlocks. All frontend and backend validation **must** derive from this specification. No layer may invent rules that are not listed here.

---

## 1. Ownership and Authority

| Aspect | Policy |
|--------|--------|
| **Rule owner** | This document (`docs/design/VALIDATION_CONTRACT.md`) |
| **Change process** | PR with updates to this doc + corresponding FE/BE code changes in the same PR |
| **Versioning** | Semantic — bump `ruleSchemaVersion` when adding/removing/changing rules |
| **Current version** | `1.0.0` |

---

## 2. Rule Schema

Every validation rule is identified by a unique `ruleId` and produces a `ValidationError`:

```typescript
interface ValidationError {
  ruleId: string;        // Unique rule identifier (e.g., "rule-db-private")
  severity: "error" | "warning";
  message: string;       // Human-readable description
  suggestion: string;    // Actionable fix suggestion
  targetId: string;      // ID of the entity that violates the rule
}
```

---

## 3. Placement Rules

Placement rules validate that blocks are placed on appropriate plates.

| Rule ID | Severity | Condition | Message |
|---------|----------|-----------|---------|
| `rule-plate-exists` | error | Block has no `placementId` or plate not found | Block is not placed on any plate |
| `rule-compute-subnet` | error | Compute block not on a `subnet` plate | Compute block must be placed on a Subnet Plate |
| `rule-db-private` | error | Database block not on a `subnet` plate with `subnetAccess: "private"` | Database block must be placed on a private Subnet Plate |
| `rule-gw-public` | error | Gateway block not on a `subnet` plate with `subnetAccess: "public"` | Gateway block must be placed on a public Subnet Plate |
| `rule-storage-subnet` | error | Storage block not on a `subnet` plate | Storage block must be placed on a Subnet Plate |

### Implementation References

- **Frontend**: `apps/web/src/entities/validation/placement.ts`
- **Backend**: Not yet implemented (planned for Phase 6 server-side validation)

---

## 4. Connection Rules

Connection rules validate dataflow between blocks. Connections follow **initiator semantics** — the source is the client/initiator, the target is the server/receiver.

| Rule ID | Severity | Condition | Message |
|---------|----------|-----------|---------|
| `rule-conn-source` | error | Source endpoint ID not found in blocks or external actors | Connection source not found |
| `rule-conn-target` | error | Target endpoint ID not found in blocks or external actors | Connection target not found |
| `rule-conn-self` | error | `sourceId === targetId` | A block cannot connect to itself |
| `rule-conn-invalid` | error | Source → Target pair not in allowed connections map | Invalid connection: {source} → {target} |

### Allowed Connection Map

| Source (Initiator) | Allowed Targets (Receiver) |
|-------------------|---------------------------|
| `internet` | `gateway` |
| `gateway` | `compute` |
| `compute` | `database`, `storage` |

`database` and `storage` are receiver-only — they never initiate connections.

### Implementation References

- **Frontend**: `apps/web/src/entities/validation/connection.ts`
- **Backend**: Not yet implemented (planned for Phase 6 server-side validation)

---

## 5. Orchestration

The validation engine iterates all blocks and connections, collecting errors and warnings into a single `ValidationResult`:

```typescript
interface ValidationResult {
  valid: boolean;       // true when errors.length === 0
  errors: ValidationError[];
  warnings: ValidationError[];
}
```

### Implementation References

- **Frontend**: `apps/web/src/entities/validation/engine.ts`

---

## 6. FE/BE Alignment Contract

### Current State (Phase 5)

- **Frontend**: Full validation engine implemented in TypeScript (`entities/validation/`)
- **Backend**: No server-side validation. The backend is a thin orchestration layer that trusts frontend-validated data.

### Future State (Phase 6+)

When backend validation is introduced:

1. **Rule definitions must be generated from this document** — no hand-written rule divergence.
2. **Compatibility tests must exist**: a shared JSON test fixture file (`tests/fixtures/validation-cases.json`) containing input architectures and expected validation results. Both FE and BE test suites must consume this file.
3. **Rule additions**: Add to this document first, then implement in both layers in the same PR.
4. **Rule changes**: Update this document, update both implementations, update shared fixtures.

### Compatibility Test Format

```json
{
  "ruleSchemaVersion": "1.0.0",
  "cases": [
    {
      "name": "database-on-public-subnet",
      "input": { "blocks": [...], "plates": [...], "connections": [...] },
      "expected": {
        "valid": false,
        "errors": [{ "ruleId": "rule-db-private", "targetId": "block-db01" }]
      }
    }
  ]
}
```

---

## 7. Migration Notes

- When adding new block categories (e.g., `FunctionBlock` in Phase 6), add corresponding placement rules to this document first.
- When adding new connection types (e.g., `EventFlow`), update the allowed connection map here first.
- Breaking rule changes (removing a rule, changing severity) require a `ruleSchemaVersion` bump.

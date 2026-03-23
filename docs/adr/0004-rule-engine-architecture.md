# ADR-0004: Rule Engine Architecture

**Status**: Accepted
**Date**: 2025-01

## Context

CloudBlocks validates architecture designs against real-world infrastructure constraints. This validation must happen in real-time as users build, not as a batch check after completion.

Key requirements:

- Real-time validation (sub-100ms response)
- Runs in the browser (Milestone 1 is frontend-only)
- Extensible for future rule categories
- Deterministic — same model always produces same validation result
- Clear error messages with actionable suggestions

Options considered:

1. **Ad-hoc validation** — scattered if/else checks throughout the codebase
2. **Schema validation only** — JSON Schema or Zod for structural validation
3. **Dedicated rule engine** — modular validation system with categorized rules

Option 1 becomes unmaintainable as rules grow. Option 2 only validates structure, not semantic constraints (e.g., "database must be on private subnet").

## Decision

**Implement a dedicated, modular rule engine that validates the architecture model against categorized rules.**

### Architecture

```
apps/web/src/entities/validation/
├── engine.ts       # Orchestration entrypoint: validateArchitecture(model)
├── placement.ts    # Placement rules: validatePlacement(block, plate)
└── connection.ts   # Connection rules: validateConnection(connection, blocks, actors)
```

### Validation flow

1. `engine.ts` receives the full `ArchitectureModel`
2. Iterates all blocks → runs placement rules from `placement.ts`
3. Iterates all connections → runs connection rules from `connection.ts`
4. Aggregates results into a single `ValidationResult`

### Rule categories

**Placement rules** (Milestone 1):

| Rule               | Constraint                         |
| ------------------ | ---------------------------------- |
| Compute placement  | Must be on SubnetPlate             |
| Database placement | Must be on **private** SubnetPlate |
| Gateway placement  | Must be on **public** SubnetPlate  |
| Storage placement  | Must be on SubnetPlate             |

**Connection rules** (Milestone 1):

| Source              | Valid Targets                   |
| ------------------- | ------------------------------- |
| Internet (external) | Gateway                         |
| Gateway             | Compute                         |
| Compute             | Database, Storage               |
| Database            | _(receiver-only — no outbound)_ |
| Storage             | _(receiver-only — no outbound)_ |

### Validation response format

```json
{
  "valid": false,
  "errors": [
    {
      "ruleId": "rule-db-private",
      "severity": "error",
      "message": "Database cannot be placed in public subnet",
      "suggestion": "Move Database to a private subnet",
      "targetId": "block-db01"
    }
  ],
  "warnings": []
}
```

### Key design choices

- **Pure functions** — validators are pure functions taking model data, returning results. No side effects.
- **Browser-first** — entire engine runs in the browser with no backend dependency
- **Initiator model** — connection direction is determined by the source block type, not user choice
- **Fail-open for unknown** — unrecognized block categories generate warnings, not errors

## Consequences

### Positive

- **Real-time feedback** — validation runs on every model change, results appear instantly
- **Modular** — each rule category is a separate module, easy to add new rules
- **Testable** — pure functions with clear inputs/outputs, no mocking needed
- **Portable** — same engine can run on backend for server-side validation (Milestone 5+)
- **Deterministic** — no randomness, no external dependencies, same input → same output

### Negative

- **Browser performance** — large models with many rules may impact UI responsiveness
- **Rule conflicts** — as rules grow, interactions between rules may produce confusing results
- **Limited expressiveness** — Milestone 1 rules are intentionally simple; complex policies (OPA-style) are v1.x

### Related Documents

- [rules.md](../engine/rules.md) — Extended rule framework design (v1.x)
- [ARCHITECTURE.md](../concept/ARCHITECTURE.md) — Rule Engine section (§4)
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Connection invariants

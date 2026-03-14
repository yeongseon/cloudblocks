# Architecture Rule Engine

CloudBlocks validates architecture models using a rule engine.

**Goal:** Detect invalid or insecure architectures before infrastructure deployment.

---

## Rule Types

### Network Rules

**Example invalid pattern:**

```
database → internet
```

Database should not be publicly exposed.

### Security Rules

**Example:**

```
database must be inside private subnet
```

### Architecture Rules

**Example best practice:**

```
internet → gateway → compute → database
```

---

## Rule Execution Flow

```
model
  ↓
rule-engine
  ↓
validation result
```

---

## Rule Result

```json
{
  "valid": false,
  "errors": [],
  "warnings": []
}
```

---

## Rule Sources

Rules can originate from:

- **Built-in rules** — shipped with CloudBlocks
- **Custom organization rules** — defined per-team or per-project
- **Security frameworks** — external policy integrations

---

## Current Implementation (v0.1)

The MVP rule engine runs in-browser and validates:

- **Placement rules** — blocks must be on valid plate types (e.g., database on private subnet)
- **Connection rules** — pure initiator model (`internet → gateway → compute → database/storage`)
- **Auto-validation** — debounced (300ms) after architecture mutations

See [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) §Connection Rules for the current rule set.

---

## Future Direction

Potential integrations:

- Open Policy Agent (OPA)
- Security scanning
- Cloud best practice frameworks

---

> **Cross-references:**
> - Architecture model: [model.md](../model/model.md)
> - Domain model rules: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Generator pipeline: [generator.md](./generator.md)

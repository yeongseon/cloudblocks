# Architecture Templates

Templates allow users to start from predefined architectures.

Templates are reusable architecture models that serve as starting points for new workspaces.

### Terminology

| Term | Definition |
|------|-----------|
| **Template** | A reusable, pre-built `ArchitectureModel` JSON that users can instantiate as a new workspace. Templates define the infrastructure topology (plates, blocks, connections). |
| **Scenario** | A guided tutorial that walks users through building an architecture step-by-step, with validation checks at each stage. Scenarios live in `packages/scenario-library/`. |

> Templates provide instant starting points; Scenarios provide learning experiences. Both use the same `ArchitectureModel` format internally.
---

## Template Structure

```
src/features/templates/
  builtin.ts          # Built-in template definitions
  registry.ts         # Template registry (CRUD operations)
```

---

## Example Template

**Three-tier architecture:**

```
Internet
  ↓
Load Balancer
  ↓
Application Server
  ↓
Database
```

---

## Template Metadata

```json
{
  "id": "template-three-tier",
  "name": "Three-tier architecture",
  "description": "A classic 3-tier web application with Gateway, Compute, and Database",
  "category": "web-application",
  "difficulty": "beginner",
  "tags": ["networking", "three-tier", "beginner", "terraform"],
  "architecture": {
    "plates": [],
    "blocks": [],
    "connections": [],
    "externalActors": [
      { "id": "ext-internet", "name": "Internet", "type": "internet" }
    ]
  }
}
```

---

## Built-in Templates

CloudBlocks ships these built-in templates (Phase 4):

- **Three-Tier Web Application** — Gateway, Compute, Database, and Storage across public/private subnets
- **Simple Compute Setup** — Minimal architecture with a single compute instance
- **Data Storage Backend** — Compute connected to database and blob storage in a private subnet

> **Note (Phase 6+):** Additional templates (Serverless API, Event-driven pipeline, Microservices) require FunctionBlock and QueueBlock, which are planned for Phase 6. See `features/templates/builtin.ts` for the current implementations.
> **Note:** Example architectures are available in the [`examples/`](../examples/) directory.

---

## Community Templates

Templates may be shared via Git repositories.

**Example:**

```
github.com/cloudblocks/templates
```

---

## Future Template Marketplace

Possible template marketplace for:

- SaaS architectures
- AI pipelines
- Data platforms

---

> **Cross-references:**
> - Architecture model format: [model.md](../model/model.md)
> - Roadmap timeline: [ROADMAP.md](../concept/ROADMAP.md)

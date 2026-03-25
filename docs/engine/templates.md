# Architecture Templates

> **Audience**: Contributors | **Status**: Stable — Internal | **Verified against**: v0.26.0

Templates allow users to start from predefined architectures.

Templates are reusable architecture models that serve as starting points for new workspaces.

### Terminology

| Term         | Definition                                                                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Template** | A reusable, pre-built `ArchitectureModel` JSON that users can instantiate as a new workspace. Templates define the infrastructure topology (container blocks, resource blocks, connections).  |
| **Scenario** | A guided tutorial that walks users through building an architecture step-by-step, with validation checks at each stage. Scenarios are defined in `apps/web/src/features/learning/scenarios/`. |

> Templates provide instant starting points; Scenarios provide learning experiences. Both use the same `ArchitectureModel` format internally.

---

## Template Structure

```
apps/web/src/features/templates/
  builtin.ts          # Built-in template definitions (6 templates)
  registry.ts         # Template registry (register/get/list/search + marketplace manifest helpers)
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
    "nodes": [],
    "blocks": [],
    "connections": [],
    "externalActors": [{ "id": "ext-internet", "name": "Internet", "type": "internet" }]
  }
}
```

---

## Built-in Templates

CloudBlocks ships these built-in templates:

- **Three-Tier Web Application** — Classic three-tier architecture with gateway, compute, database, and storage
- **Simple Compute Setup** — Minimal architecture with a single compute instance in a public subnet
- **Data Storage Backend** — Backend architecture where compute connects to database and storage in a private subnet
- **Serverless HTTP API** — Gateway-triggered function API with storage and database backends
- **Event-Driven Pipeline** — Event and queue-driven processing functions writing results to storage
- **Full-Stack Serverless with Event Processing** — End-to-end architecture combining web frontend, API function, queue workers, event processing, database, and storage

> **Note:** Example architectures are available in the [`examples/`](../../examples/) directory.

---

## Community Templates (Planned)

> Template sharing via Git repositories is planned for a future milestone. The registry API supports loading external marketplace manifests (`loadMarketplaceManifest()` in `registry.ts`), but no community template distribution is implemented yet.

---

## Template Marketplace (Planned)

TypeScript types (`MarketplaceManifest`, `MarketplaceEntry`) and registry functions are scaffolded in `apps/web/src/shared/types/template.ts` and `registry.ts`, but marketplace UI and distribution are not yet implemented. Planned use cases:

- SaaS architectures
- AI pipelines
- Data platforms

---

## Package Structure (Scaffolded)

The `packages/` directory contains scaffolded packages that are **not yet functional**:

| Package                         | Status      | Purpose                                              |
| ------------------------------- | ----------- | ---------------------------------------------------- |
| `packages/scenario-library/`    | Placeholder | Future shared scenario definitions                   |
| `packages/schema/`              | Placeholder | Shared type definitions between frontend and backend |
| `packages/terraform-templates/` | Placeholder | Generated Terraform template storage                 |
| `packages/cloudblocks-domain/`  | Placeholder | Shared domain logic                                  |
| `packages/cloudblocks-ui/`      | Placeholder | Shared React components                              |

> Current template and scenario logic lives entirely within `apps/web/src/features/`.

---

> **Cross-references:**
>
> - Architecture model format: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Roadmap timeline: [ROADMAP.md](../concept/ROADMAP.md)

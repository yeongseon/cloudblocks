# Resource Category Strategy

> Status: Active — Governs M19–M27 implementation.
>
> Principle: **Universal resource categories, Azure-only supported resources (v1).** CloudBlocks is a preset-driven visual architecture design tool; code generation is an Experimental feature.

## Motivation

The original 10-category `BlockCategory` (compute, database, storage, gateway, function, queue, event, analytics, identity, observability) was tightly coupled to specific implementation patterns — `function` as its own category, `queue` and `event` as separate concepts, `database` and `storage` split unnecessarily. As CloudBlocks evolves toward a production visual design tool with multi-cloud preview, categories must:

1. Reflect industry-standard resource groupings across all major cloud providers.
2. Remain stable as provider coverage expands (Azure → AWS → GCP).
3. Support future code generation output (Terraform modules, Bicep resources, Pulumi components) when promoted from Experimental.
4. Minimize forced abstraction — group by real operational similarity, not marketing categories.

## Category Taxonomy (7 Categories)

| Category     | Description                                                    | Example Resources                                  |
| ------------ | -------------------------------------------------------------- | -------------------------------------------------- |
| `network`    | Virtual networks, subnets — the container infrastructure       | Azure VNet, Subnet                                 |
| `security`   | Firewalls, key vaults, identity and access management          | Azure Firewall, Key Vault, Entra ID                |
| `edge`       | Load balancers, outbound access — public-facing ingress/egress | Azure Load Balancer, NAT Gateway                   |
| `compute`    | Execution environments (VMs, containers, serverless functions) | Azure App Service, Container Apps, Functions       |
| `data`       | Databases, caches, object storage                              | Azure SQL, Redis Cache, Blob Storage               |
| `messaging`  | Message queues, event streams, pub/sub                         | Azure Service Bus, Event Hub, Event Grid           |
| `operations` | Monitoring, logging, alerting, analytics                       | Azure Monitor, Log Analytics, Application Insights |

### TypeScript Type

```typescript
// packages/schema/src/enums.ts
export type ResourceCategory =
  | 'network'
  | 'security'
  | 'edge'
  | 'compute'
  | 'data'
  | 'messaging'
  | 'operations';

/** @deprecated Use ResourceCategory instead. */
export type BlockCategory = ResourceCategory;
```

## Migration from 10-Category Model

### Mapping Table

| Old Category (10) | New Category (7) | Rationale                                                        |
| ----------------- | ---------------- | ---------------------------------------------------------------- |
| `compute`         | `compute`        | Retained — now includes functions                                |
| `function`        | `compute`        | Functions are a compute execution model, not a separate category |
| `database`        | `data`           | Merged with storage — both are persistence resources             |
| `storage`         | `data`           | Merged with database — both are persistence resources            |
| `gateway`         | `edge`           | Renamed — gateways are edge/ingress infrastructure               |
| `identity`        | `security`       | Merged — identity is a security concern                          |
| `queue`           | `messaging`      | Consolidated — queues are a messaging pattern                    |
| `event`           | `messaging`      | Consolidated — events are a messaging pattern                    |
| `analytics`       | `operations`     | Merged with observability — both are operational concerns        |
| `observability`   | `operations`     | Renamed — now includes analytics                                 |

### New Category (no old equivalent)

| New Category | Why Added                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `network`    | Virtual networks and subnets are container infrastructure — they were previously modeled as "container blocks" rather than categorized resources |

### Normalization Function

A normalization layer handles legacy data on load:

```typescript
function normalizeCategory(category: string): ResourceCategory {
  const LEGACY_MAP: Record<string, ResourceCategory> = {
    function: 'compute',
    database: 'data',
    storage: 'data',
    gateway: 'edge',
    identity: 'security',
    queue: 'messaging',
    event: 'messaging',
    analytics: 'operations',
    observability: 'operations',
  };
  return LEGACY_MAP[category] ?? (category as ResourceCategory);
}
```

This runs at project load time to ensure backward compatibility with saved architectures.

## RESOURCE_RULES — Single Source of Truth

All resource type constraints are defined in `packages/schema/src/rules.ts` as the `RESOURCE_RULES` constant. This replaces scattered hard-coded rules with a single canonical table.

Each entry defines:

- **containerCapable** — whether the resource type can be `kind: 'container'`
- **allowedParents** — which parent resourceTypes are valid (`null` = root-level)
- **category** — default `ResourceCategory`
- **canvasTier** — default visual grouping on the canvas

### Resource Type Table

| Resource Type         | Container? | Allowed Parents   | Category   | Canvas Tier |
| --------------------- | ---------- | ----------------- | ---------- | ----------- |
| `virtual_network`     | ✅         | `null` (root)     | network    | shared      |
| `subnet`              | ✅         | `virtual_network` | network    | shared      |
| `load_balancer`       | ❌         | `subnet`          | edge       | web         |
| `outbound_access`     | ❌         | `subnet`          | edge       | web         |
| `web_compute`         | ❌         | `subnet`          | compute    | web         |
| `app_compute`         | ❌         | `subnet`          | compute    | app         |
| `relational_database` | ❌         | `subnet`          | data       | data        |
| `cache_store`         | ❌         | `subnet`          | data       | data        |
| `firewall_security`   | ❌         | `subnet`          | security   | shared      |
| `secret_store`        | ❌         | `subnet`          | security   | shared      |
| `identity_access`     | ❌         | `subnet`          | security   | shared      |
| `monitoring`          | ❌         | `subnet`          | operations | shared      |
| `message_queue`       | ❌         | `virtual_network` | messaging  | app         |
| `event_hub`           | ❌         | `virtual_network` | messaging  | app         |

### Derived Types

```typescript
// packages/schema/src/rules.ts
export type ResourceType = keyof typeof RESOURCE_RULES; // all 14 types
export type ContainerCapableResourceType = 'virtual_network' | 'subnet';
export type LeafOnlyResourceType = Exclude<ResourceType, ContainerCapableResourceType>;
```

## Kind System (NodeKind)

The `NodeKind` discriminator replaces the old ContainerBlock/ResourceBlock distinction:

| Kind        | Description                                                 | Resource Types              |
| ----------- | ----------------------------------------------------------- | --------------------------- |
| `container` | Holds child nodes — rendered as container blocks with ports | `virtual_network`, `subnet` |
| `resource`  | Leaf resource — rendered as resource blocks                 | All other 12 resource types |

```typescript
// packages/schema/src/enums.ts
export type NodeKind = 'container' | 'resource';
```

Whether a resource type can be `kind: 'container'` is determined by its `containerCapable` flag in `RESOURCE_RULES`. The old `ContainerBlockType` alias is deprecated:

```typescript
/** @deprecated Use LayerType + NodeKind='container' instead. */
export type ContainerBlockType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';
```

## Canvas Tier (CanvasTier)

Canvas tier is the structural grouping visible on the canvas — orthogonal to both `category` (domain grouping) and `layer` (hierarchy depth).

| Tier     | Purpose                 | Resource Types                                                               |
| -------- | ----------------------- | ---------------------------------------------------------------------------- |
| `shared` | Cross-cutting resources | virtual_network, subnet, firewall, secret_store, identity_access, monitoring |
| `web`    | Public-facing tier      | load_balancer, outbound_access, web_compute                                  |
| `app`    | Application tier        | app_compute, message_queue, event_hub                                        |
| `data`   | Persistence tier        | relational_database, cache_store                                             |

```typescript
// packages/schema/src/rules.ts
export type CanvasTier = 'shared' | 'web' | 'app' | 'data';
```

## Connection Rules

Connections represent the **initiator direction** — who starts the request. Responses flow implicitly in reverse.

| Source (Initiator) | Allowed Targets (Receiver)                    |
| ------------------ | --------------------------------------------- |
| `internet`         | `edge`                                        |
| `edge`             | `compute`                                     |
| `compute`          | `data`, `operations`, `security`, `messaging` |
| `messaging`        | `compute`                                     |

**Receiver-only categories**: `data`, `security`, `operations`, and `network` never initiate connections.

Source: `apps/web/src/entities/validation/connection.ts`

## Scope Rules

### Product Scope = Azure Only (v1)

- UI resource picker shows only Azure-supported resources.
- Non-Azure providers are hidden or marked "coming soon" in the UI.
- Templates and learning scenarios use Azure resource names and references.

### Domain Model = Multi-Cloud Ready

- `ResourceCategory` type contains no provider-specific values.
- `resourceType` values are provider-agnostic (e.g., `web_compute`, not `azure_app_service`).
- Provider mapping is a separate adapter layer, not embedded in the category or resource type system.
- Adding AWS/GCP support requires only new adapter entries, not schema changes.

## Implementation Timeline

| Milestone | Scope                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M19**   | Schema + domain layer: unify ContainerBlock/ResourceBlock → Block, realign categories 10→7, add RESOURCE_RULES, add constraint validators, wire placement to RESOURCE_RULES |
| **M20**   | UI layer: migrate palette, tech tree, templates, scenarios, generators to new category visuals                                                                              |
| **M21**   | Define full Azure resource catalog per category; scope UI to Azure-only                                                                                                     |

## Related Documents

- [ROADMAP.md](ROADMAP.md) — Milestone definitions (M19–M27)
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Architecture model specification
- [enums.ts](../../packages/schema/src/enums.ts) — `ResourceCategory` type definition
- [rules.ts](../../packages/schema/src/rules.ts) — `RESOURCE_RULES` canonical constraint table
- [model.ts](../../packages/schema/src/model.ts) — `Block` union type (`ContainerBlock | ResourceBlock`)
- [constraints.ts](../../packages/cloudblocks-domain/src/constraints.ts) — Runtime constraint validators

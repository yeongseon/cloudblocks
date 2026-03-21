# Resource Category Strategy

> Status: Active — Governs M19–M21 implementation.
>
> Principle: **Universal resource categories, Azure-only supported resources (v1).**

## Motivation

The original 10-category `BlockCategory` was created for the initial visual builder and is tightly coupled to specific implementation patterns (e.g., `function` as its own category, `queue` and `event` as separate concepts). As CloudBlocks evolves toward a production architecture compiler, categories must:

1. Reflect industry-standard resource groupings across all major cloud providers.
2. Remain stable as provider coverage expands (Azure → AWS → GCP).
3. Map cleanly to infrastructure code output (Terraform modules, Bicep resources, Pulumi components).

## Category Taxonomy (11 Categories)

| Category | Description | Example Resources |
|----------|-------------|-------------------|
| `compute` | Execution environments (VMs, containers, serverless functions) | Azure VM, App Service, Functions, Container Apps |
| `storage` | Object/file/blob storage | Azure Blob Storage, File Share |
| `database` | Managed databases and caches | Azure SQL, Cosmos DB, Redis Cache |
| `network` | Virtual networks, subnets, load balancers, DNS | Azure VNet, NSG, Load Balancer, DNS Zone |
| `gateway` | API gateways and ingress controllers | Azure API Management, Application Gateway, Front Door |
| `messaging` | Message queues, event streams, pub/sub | Azure Service Bus, Event Hub, Event Grid |
| `security` | Key vaults, certificates, firewalls, WAF | Azure Key Vault, Firewall, WAF Policy |
| `observability` | Monitoring, logging, alerting, analytics | Azure Monitor, Log Analytics, Application Insights |
| `integration` | Workflow orchestration, logic apps, data pipelines | Azure Logic Apps, Data Factory |
| `identity` | Identity and access management | Azure AD (Entra ID), Managed Identity |
| `external` | External services and third-party endpoints | User-defined external actors, SaaS services |

### TypeScript Type

```typescript
export type BlockCategory =
  | 'compute'
  | 'storage'
  | 'database'
  | 'network'
  | 'gateway'
  | 'messaging'
  | 'security'
  | 'observability'
  | 'integration'
  | 'identity'
  | 'external';
```

## Migration from 10-Category Model

### Mapping Table

| Old Category | New Category | Rationale |
|---|---|---|
| `compute` | `compute` | No change |
| `database` | `database` | No change |
| `storage` | `storage` | No change |
| `gateway` | `gateway` | No change |
| `identity` | `identity` | No change |
| `observability` | `observability` | No change |
| `function` | `compute` | Functions are a compute execution model, not a separate category |
| `queue` | `messaging` | Queues are a messaging pattern |
| `event` | `messaging` | Events are a messaging pattern |
| `analytics` | `observability` | Analytics is part of the observability domain |

### New Categories (no old equivalent)

| New Category | Why Added |
|---|---|
| `network` | Virtual networks, subnets, and load balancers are fundamental infrastructure |
| `security` | Key vaults, firewalls, and WAF are distinct from identity |
| `messaging` | Consolidates queue + event into an industry-standard grouping |
| `integration` | Workflow orchestration is distinct from compute |
| `external` | External actors and third-party services need a formal category |

### Normalization Function

A normalization layer must handle legacy data on load:

```typescript
function normalizeCategory(category: string): BlockCategory {
  const LEGACY_MAP: Record<string, BlockCategory> = {
    function: 'compute',
    queue: 'messaging',
    event: 'messaging',
    analytics: 'observability',
  };
  return LEGACY_MAP[category] ?? (category as BlockCategory);
}
```

This runs at project load time to ensure backward compatibility with saved architectures.

## Kind System

Each category has **kinds** — provider-agnostic subtypes that describe what kind of resource it is:

```
Category: compute
  Kinds: vm, container, function, app-service

Category: messaging
  Kinds: queue, topic, event-stream, event-grid
```

Kinds are defined in the domain layer and are the unit of provider mapping:

```
Kind: vm → Azure: "Microsoft.Compute/virtualMachines"
Kind: queue → Azure: "Microsoft.ServiceBus/namespaces/queues"
```

The full kind catalog is defined during M21 (Azure v1 Resource Catalog).

## Scope Rules

### Product Scope = Azure Only (v1)

- UI resource picker shows only Azure-supported resources.
- Non-Azure providers are hidden or marked "coming soon" in the UI.
- Templates and learning scenarios use Azure resource names and references.

### Domain Model = Multi-Cloud Ready

- `BlockCategory` type contains no provider-specific values.
- `kind` values are provider-agnostic (e.g., `vm`, not `azure-vm`).
- Provider mapping is a separate adapter layer, not embedded in the category system.
- Adding AWS/GCP support requires only new adapter entries, not schema changes.

## Implementation Timeline

| Milestone | Scope |
|-----------|-------|
| **M19** | Schema + domain layer: replace `BlockCategory` type (10→11), add normalization, remove minifigure |
| **M20** | UI layer: migrate palette, tech tree, templates, scenarios, generators to new categories |
| **M21** | Define kind catalog per category and map Azure resources; scope UI to Azure-only |

## Related Documents

- [ROADMAP.md](ROADMAP.md) — Milestone definitions (M19–M27)
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Architecture model specification
- [enums.ts](../../packages/schema/src/enums.ts) — Current `BlockCategory` type definition

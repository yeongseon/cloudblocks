# Provider Definition Specification

> **Audience**: Contributors | **Status**: Stable — Internal | **Verified against**: v0.29.0

CloudBlocks uses `ProviderDefinition` as the canonical provider abstraction for generation.

This keeps the architecture model provider-neutral while allowing Terraform, Bicep, and Pulumi output from the same model. Provider coverage varies by template, resource, and export path — the learning experience is provider-aware, not provider-locked.

---

# Purpose

The provider layer exists to:

- map generic block concepts to provider resources
- preserve provider-neutral modeling in the architecture DSL
- enable consistent multi-generator output from one provider definition
- surface unsupported mappings explicitly instead of silently dropping resources

---

# Canonical Abstraction: `ProviderDefinition`

`ProviderDefinition` is the single source of truth for provider generation behavior.

```ts
interface ProviderDefinition {
  name: ProviderType;
  displayName: string;
  blockMappings: BlockResourceMap;
  containerBlockMappings: ContainerBlockResourceMap;
  generators: {
    terraform: TerraformProviderConfig;
    bicep: BicepProviderConfig;
    pulumi: PulumiProviderConfig;
  };
  subtypeBlockMappings?: SubtypeResourceMap;
}
```

## `generators` section

Every provider definition includes generator-specific settings:

- `terraform: TerraformProviderConfig` — V1 Core (Terraform Starter Export)
  - `requiredProviders(): string` — Terraform required_providers block
  - `providerBlock(region: string): string` — Provider configuration block
  - `regionVariableDescription?: string` — Description for the location variable (default: "Deployment region")
  - `renderSharedResources?(ctx: TerraformRenderContext): string[]` — Top-level shared resources (e.g., Azure resource group, service plan). Optional.
  - `renderContainerBody(ctx: TerraformContainerContext): string[]` — Body lines for container block resources. **Required.**
  - `renderContainerCompanions?(ctx: TerraformContainerContext): string[]` — Companion resources adjacent to containers (e.g., route tables, NAT attachments). Optional.
  - `renderBlockCompanions?(ctx: TerraformBlockContext): string[]` — Companion resources for blocks (e.g., Azure PIP + NIC for VMs). Optional.
  - `renderBlockBody(ctx: TerraformBlockContext): string[]` — Body lines for resource block resources. **Required.**
  - `extraVariables?(ctx: TerraformRenderContext): string[]` — Provider-specific variable declarations (e.g., GCP project_id). Optional.
  - `extraOutputs?(ctx: TerraformRenderContext): TerraformOutputSpec[]` — Provider-specific output declarations. Optional.
- `bicep: BicepProviderConfig` — Experimental
  - `targetScope: 'resourceGroup' | 'subscription'`
- `pulumi: PulumiProviderConfig` — Experimental
  - `packageName: string`
  - `runtime: 'nodejs'`

---

## Terraform Render Hooks

The Terraform generator delegates all provider-specific code to render hooks defined in `TerraformProviderConfig`. The orchestrator (`terraform.ts`) is fully provider-agnostic — it calls hooks in a fixed order and assembles the output.

### Hook Execution Order

```
1. requiredProviders()          → terraform {} block
2. providerBlock(region)        → provider "..." {} block
3. renderSharedResources(ctx)   → shared resources (resource group, service plan, etc.)
4. For each container:
   a. renderContainerBody(ctx)      → container resource body lines
   b. renderContainerCompanions(ctx) → companion resources for container
5. For each block:
   a. renderBlockCompanions(ctx)    → companion resources (PIP, NIC, etc.)
   b. renderBlockBody(ctx)          → block resource body lines
6. Connection comments
```

### Context Types

All hooks receive context objects that provide the normalized model, generation options, and resource name mappings:

- **`TerraformRenderContext`** — Base context with `normalized`, `options`, `resourceNames`
- **`TerraformContainerContext`** — Extends base with `container`, `mapping`, `resourceName`, `parentResourceName`
- **`TerraformBlockContext`** — Extends base with `block`, `mapping`, `resourceName`, `parentResourceName`

### Return Convention

- **Body hooks** (`renderContainerBody`, `renderBlockBody`) return indented lines (2-space indent) that go inside `resource "..." "..." { ... }`
- **Top-level hooks** (`renderSharedResources`, `renderBlockCompanions`, `renderContainerCompanions`) return complete top-level HCL blocks including the resource declaration
- **`extraVariables`** returns complete `variable "..." { ... }` blocks as lines
- **`extraOutputs`** returns `TerraformOutputSpec` objects (name + value pairs) that the orchestrator wraps in `output "..." { ... }`

### Required vs Optional

| Hook | Required | Reason |
|------|----------|--------|
| `renderContainerBody` | ✅ Yes | Every provider must produce container resource bodies |
| `renderBlockBody` | ✅ Yes | Every provider must produce block resource bodies |
| `renderSharedResources` | ❌ No | Not all providers need shared scaffolding |
| `renderContainerCompanions` | ❌ No | Container-adjacent resources are provider-specific |
| `renderBlockCompanions` | ❌ No | Block companion resources are provider-specific |
| `extraVariables` | ❌ No | Provider-specific variables (e.g., GCP project) |
| `extraOutputs` | ❌ No | Provider-specific outputs (e.g., Azure resource_group_name) |

# Implemented Providers

## Azure (V1 Active)

- `renderSharedResources`: Emits `azurerm_resource_group` + `azurerm_service_plan`
- `renderContainerBody`: Azure VNet / subnet with `address_space` and `address_prefixes`
- `renderBlockBody`: Category-based dispatch (`azurerm_linux_web_app`, `azurerm_mssql_database`, etc.)
- `renderBlockCompanions`: NIC + PIP for VMs
- `extraOutputs`: `resource_group_name`

## AWS (V1 Starter)

- `renderSharedResources`: SSM parameter data source (region-agnostic Amazon Linux 2 AMI) + `aws_availability_zones` data source
- `renderContainerBody`: VPC with `cidr_block` / `enable_dns_*` / tags; subnet with `vpc_id`, indexed `cidr_block`, `availability_zone` from data source
- `renderBlockBody`: Switch on `resourceType` — concrete bodies for EC2, RDS, DynamoDB, S3, SQS, SNS, IAM, CloudWatch, API Gateway, Security Group; explicit "cannot be planned" warnings for ECS, Lambda, ALB, NAT
- `renderBlockCompanions`: `[]`
- `extraVariables`: `[]`
- `extraOutputs`: `[]`
- EC2 AMI uses `data.aws_ssm_parameter.amazon_linux_ami.value` (no hardcoded AMI IDs)
- S3 uses `bucket_prefix` with sanitized/trimmed name (24-char limit)
- Security groups emit error comment when no ancestor VPC found

## GCP (V1 Starter)

- `renderSharedResources`: Conditional `google_project_service` resources for each GCP API used (compute, run, cloudfunctions, sqladmin, firestore, storage, pubsub, eventarc, apigateway, iam, monitoring); uses `disable_on_destroy = false`
- `renderContainerBody`: VPC with `name` (RFC 1035), `auto_create_subnetworks = false`, `depends_on`; subnet with `name`, `network` reference, indexed `ip_cidr_range`, `region`
- `renderBlockBody`: Switch on `resourceType` — concrete bodies for Compute Engine, Cloud Run, Cloud SQL, Cloud Storage, Firestore, Pub/Sub, Service Account, Firewall, BigQuery, Monitoring Dashboard, API Gateway, Compute URL Map; explicit "cannot be planned" warnings for Cloud Functions, Cloud NAT, Eventarc
- `renderBlockCompanions`: `google_compute_image` data source for Compute Engine instances (Debian 12)
- `extraVariables`: `project_id` (GCP project ID) + `zone` (compute zone)
- `extraOutputs`: `[]`
- All GCP resource `name` attributes use RFC 1035 naming (hyphens, not underscores) via `toGcpName()` helper
- Firewall emits minimal scaffold with `direction`, `source_ranges`, and `allow` block (with WARNING for production)
- Cloud SQL uses `deletion_protection = false` with production WARNING
- Storage bucket naming uses `var.project_id` prefix for global uniqueness
- Firestore warns about `(default)` database singleton constraint
- All resources include `depends_on` referencing their `google_project_service` API enablement resource


# Subtype-Aware Resource Resolution

Use `subtypeBlockMappings` when a block category has multiple provider resources depending on subtype.

- base mapping: `blockMappings[category]`
- subtype override: `subtypeBlockMappings[category][subtype]`

### `resolveBlockMapping()`

`resolveBlockMapping(blockMappings, subtypeMappings, category, subtype?)` resolves in this order:

1. Return subtype mapping when `subtype` is provided and exists
2. Otherwise return `blockMappings[category]`
3. Return `undefined` when neither mapping exists

This gives deterministic fallback behavior while supporting subtype precision.

---

# Generation Pipeline Flow

Provider resolution is part of the generation pipeline:

1. `validate` - run generator/plugin validation rules
2. `resolve provider` - load `ProviderDefinition` by target provider
3. `normalize` - convert architecture into generator-ready normalized model
4. `generate` - produce files using provider + generator config
5. `format` - apply optional generator formatter pass

Pipeline stages are pure and deterministic for the same input model and options.

---

# `ProviderAdapter` Deprecation

`ProviderAdapter` is deprecated and kept only for backward compatibility with older Terraform-only paths.

Migration guidance:

- new provider work must implement `ProviderDefinition`
- new generator capabilities must read from `ProviderDefinition.generators`
- existing `ProviderAdapter` usages should be incrementally migrated to `ProviderDefinition`

---

# Constraints

Provider definitions and resolution logic must:

- not mutate the canonical architecture model
- keep generation deterministic
- report unsupported mappings clearly
- avoid leaking provider-specific semantics back into the DSL

---

> **Cross-references:**
>
> - Generator pipeline: [generator.md](./generator.md)
> - Architecture model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)

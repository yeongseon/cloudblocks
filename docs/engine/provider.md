# Provider Adapter Specification

CloudBlocks uses provider adapters to convert provider-neutral architecture models into cloud-specific infrastructure definitions.

This allows the core DSL and rule engine to remain generic while infrastructure generation becomes cloud-aware.

---

# Purpose

The provider adapter layer exists to:

- map generic block categories to provider resources
- translate architecture graph semantics into cloud-specific constructs
- keep the core DSL provider-neutral
- support future multi-cloud generation

---

# Core Principle

CloudBlocks DSL must remain generic.

Examples of generic categories:

- compute
- database
- storage
- gateway

Examples of provider-specific resources:

- Azure App Service
- AWS ECS Service
- GCP Cloud Run

The adapter layer performs this mapping.

---

# Adapter Responsibilities

Each provider adapter must implement:

- block mapping
- plate mapping
- connection interpretation
- code generation hooks
- validation extensions

---

# Block Mapping

A provider adapter maps generic blocks to provider resources.

Example:

| DSL Block | Azure | AWS | GCP |
|-----------|-------|-----|-----|
| compute | azurerm_linux_web_app | aws_ecs_service | google_cloud_run_v2_service |
| database | azurerm_postgresql_flexible_server | aws_db_instance | google_sql_database_instance |
| storage | azurerm_storage_account | aws_s3_bucket | google_storage_bucket |
| gateway | azurerm_application_gateway | aws_lb | google_compute_backend_service |

---

# Plate Mapping

A provider adapter maps structural boundaries to provider-specific containers.

Examples:

| DSL Plate | Azure | AWS | GCP |
|-----------|-------|-----|-----|
| network | virtual network | VPC | VPC network |
| subnet | subnet | subnet | subnetwork |
| resource group boundary | resource group | n/a | project/folder context |

Not all providers support identical boundary concepts.

Adapters may need approximation rules.

---

# Connection Interpretation

Connections in the DSL represent abstract communication flow.

Provider adapters interpret these flows into infrastructure relationships such as:

- network permissions
- routing
- security groups
- firewall rules
- private endpoints

The adapter decides how to express the flow in the target platform.

---

# Adapter Interface

A provider adapter should expose a minimal interface like:

- mapArchitecture()
- mapPlate()
- mapBlock()
- mapConnection()
- generateArtifacts()

Exact implementation details may vary by language and package structure.

---

# Output Responsibility

Provider adapters do not own the full pipeline.

Recommended division of responsibility:

- core pipeline builds normalized architecture graph
- provider adapter maps graph elements to provider model
- generator backend renders IaC artifacts

---

# Adapter Constraints

Provider adapters must follow these constraints:

- must not mutate the canonical DSL model
- must preserve deterministic generation
- must report unsupported mappings clearly
- must avoid leaking provider-specific assumptions into the DSL

---

# Unsupported Mappings

If a DSL concept cannot be represented by the provider, the adapter must:

- return an explicit error
- explain the unsupported mapping
- avoid silently dropping resources

This is critical for trust and predictability.

---

# Packaging Strategy

Recommended long-term package structure:

```
packages/
  model/
  graph/
  rule-engine/
  generator-core/
  provider-azure/
  provider-aws/
  provider-gcp/
```

This allows providers to evolve independently.

---

# Future Direction

Planned provider adapter improvements:

- plugin discovery
- provider capability metadata
- provider-specific validation packs
- mixed-provider experimental support

# Cross-Provider Challenges

Mapping the same DSL to multiple providers introduces real-world inconsistencies:

| Challenge | Example | Mitigation |
|-----------|---------|------------|
| Naming divergence | Azure uses `azurerm_linux_web_app`, GCP uses `google_cloud_run_v2_service` | Adapter mapping table per provider |
| Feature gaps | AWS has no direct equivalent to Azure Resource Groups | Adapter approximation rules + explicit warnings |
| Networking models | Azure VNet vs AWS VPC vs GCP VPC Network have different subnet semantics | Plate mapping abstraction layer |
| Security model | Security Groups (AWS) vs NSG (Azure) vs Firewall Rules (GCP) | Connection interpretation per provider |
| Default configurations | Each provider has different defaults for compute, storage, etc. | Provider-specific default packs |

When an exact mapping is impossible, adapters must surface a clear error rather than silently approximate.
---

> **Cross-references:**
> - Generator pipeline: [generator.md](./generator.md)
> - Architecture model: [model.md](../model/model.md)
> - DSL specification: [DSL_SPEC.md](../DSL_SPEC.md)
> - Architecture graph: [ARCHITECTURE_GRAPH.md](../ARCHITECTURE_GRAPH.md)
> - Roadmap timeline: [ROADMAP.md](../concept/ROADMAP.md)

# Infrastructure Code Generator

CloudBlocks converts architecture models into infrastructure code.

```
Architecture Model
    ↓
Generator
    ↓
Infrastructure Code (Terraform, Bicep, Pulumi)
```

---

## Generator Architecture

```
model
  ↓
generator-core
  ↓
provider-adapter
  ↓
iac-code
```

---

## Generator Pipeline

### Step 1 — Normalize Model

Normalize the diagram model into canonical architecture model.

```
normalize(model)
```

### Step 2 — Dependency Graph

Build resource dependency graph.

**Example:**

```
gateway → compute
compute → database
```

### Step 3 — Provider Mapping

Map generic infrastructure blocks to provider resources.

**Example mapping:**

| Block | Azure | AWS | GCP |
|-------|-------|-----|-----|
| `compute` | `azurerm_linux_web_app` | `aws_ecs_service` | `cloud_run` |
| `storage` | `azurerm_storage_account` | `s3_bucket` | `gcs_bucket` |

See [provider.md](./provider.md) for full provider abstraction details.

### Step 4 — Module Generation

Generate IaC modules.

**Example Terraform output:**

```hcl
module "compute" {
  source = "./modules/compute"
}
```

---

## Generator Types

Supported generators:

| Generator | Target |
|-----------|--------|
| `terraform` | Multi-cloud |
| `bicep` | Azure |
| `pulumi` | Code-based IaC |
| `yaml` | Documentation |

---

## Deterministic Generation

Code generation must be deterministic.

**Same architecture model → same output code.**

This enables reliable diffing, version control, and CI/CD integration.

---

## Planned Features

Future generator capabilities:

- Partial regeneration
- Infrastructure diff detection
- Git integration

---

> **Cross-references:**
> - Architecture model: [model.md](./model.md)
> - Provider adapters: [provider.md](./provider.md)
> - Validation before generation: [rules.md](./rules.md)
> - Roadmap timeline: [ROADMAP.md](./ROADMAP.md)

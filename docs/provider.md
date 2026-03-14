# Cloud Provider Abstraction

CloudBlocks uses a provider abstraction layer.

This allows a single architecture model to generate infrastructure code for **multiple cloud providers**.

---

## Provider Adapter Flow

```
Architecture Model
    ↓
Provider Adapter
    ↓
Provider Resources
```

---

## Example Mapping

**Block type: Compute**

| Provider | Resource |
|----------|----------|
| Azure | `azurerm_linux_web_app` |
| AWS | `aws_ecs_service` |
| GCP | `google_cloud_run` |

---

## Provider Interface

Each provider adapter implements:

| Method | Purpose |
|--------|---------|
| `mapBlock()` | Map a generic block to provider-specific resource |
| `mapConnection()` | Map a connection to provider-specific networking |
| `generateModule()` | Generate an IaC module for the provider |

---

## Supported Providers

Planned providers (Azure-first strategy):

| Provider | Priority | Status |
|----------|----------|--------|
| Azure | Primary | Planned |
| AWS | Secondary | Planned |
| GCP | Tertiary | Planned |

---

## Provider Plugins

Providers may be distributed as plugins.

**Example packages:**

```
@cloudblocks/provider-azure
@cloudblocks/provider-aws
@cloudblocks/provider-gcp
```

---

> **Cross-references:**
> - Generator pipeline: [generator.md](./generator.md)
> - Architecture model: [model.md](./model.md)
> - Roadmap timeline: [ROADMAP.md](./ROADMAP.md)

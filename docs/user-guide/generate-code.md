# Generate Code

CloudBlocks converts your visual architecture into infrastructure-as-code. This guide explains how to generate, preview, and export code in Terraform, Bicep, or Pulumi.

---

## Generating Code

1. Design your architecture on the canvas (see [Create an Architecture](create-architecture.md))
2. Go to **Build → Generate** in the menu bar
3. The **Code Preview** panel opens, showing your architecture as infrastructure code

That's it — CloudBlocks generates code automatically from your visual design.

---

## Output Formats

CloudBlocks supports three infrastructure-as-code formats:

| Format        | Language                               | Best For                                     |
| ------------- | -------------------------------------- | -------------------------------------------- |
| **Terraform** | HCL (HashiCorp Configuration Language) | Multi-cloud deployments, industry standard   |
| **Bicep**     | Bicep (Azure Resource Manager)         | Azure-native infrastructure                  |
| **Pulumi**    | TypeScript                             | Developers who prefer code over config files |

Switch between formats using the selector in the Code Preview panel. The default is Terraform.

!!! tip "Same architecture, different outputs"
You can generate code in all three formats from the same architecture. This is useful for comparing approaches or migrating between tools.

---

## Generation Modes

| Mode           | Purpose                                          | Use When                  |
| -------------- | ------------------------------------------------ | ------------------------- |
| **Draft**      | Quick preview with inline values                 | Prototyping and exploring |
| **Production** | Full module structure with variables and outputs | Ready to deploy           |

Draft mode is fast and simple — great for seeing what your architecture looks like in code. Production mode generates commit-ready code with proper variable extraction, output declarations, and module structure.

---

## Cloud Provider Regions

Code generation uses default regions based on your active cloud provider:

| Provider  | Default Region |
| --------- | -------------- |
| **Azure** | `eastus`       |
| **AWS**   | `us-east-1`    |
| **GCP**   | `us-central1`  |

---

## What Gets Generated

The generated code includes:

- **Resource definitions** — Each node in your architecture maps to a cloud resource
- **Network configuration** — Containers map to VPCs, VNets, subnets
- **Connection wiring** — Connections map to security rules, IAM bindings, and network configurations
- **Variables** — Configurable parameters extracted from your architecture (production mode)
- **Outputs** — Key values exported for use by other infrastructure (production mode)

### Example: Terraform Output

For a simple compute + database architecture, Terraform generates:

```hcl
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "network" {
  name                = "vnet-main"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_linux_web_app" "compute" {
  name                = "app-compute"
  # ...
}

resource "azurerm_mssql_database" "database" {
  name      = "db-main"
  # ...
}
```

---

## Copying and Exporting

- **Copy** — Click the Copy button in the Code Preview panel to copy all generated code to your clipboard
- **Preview** — Scroll through the generated code in the Code Preview panel to review before copying

!!! info "Deterministic generation"
CloudBlocks generates the same code every time for the same architecture. This means you can safely regenerate without worrying about unexpected changes — only actual architecture modifications produce different code.

---

## Validation Before Generation

CloudBlocks validates your architecture before generating code. If validation finds errors:

1. The validation panel shows what needs to be fixed
2. Fix the issues (invalid placements, broken connections)
3. Re-run generation

Generation will not proceed with an invalid architecture. This prevents generating broken infrastructure code.

---

## Advanced: GitHub Integration

If you're running the CloudBlocks backend, you can push generated code directly to a GitHub repository:

1. Log in with GitHub OAuth via **File → GitHub → Login**
2. Link your workspace to a repository
3. Push your architecture and generated code
4. Create pull requests with architecture changes

!!! info "Backend required"
GitHub integration requires the CloudBlocks backend API. The frontend-only demo does not include GitHub features. See the [Getting Started guide](../guides/TUTORIALS.md) for backend setup.

---

## What's Next?

| Goal                                | Guide                                       |
| ----------------------------------- | ------------------------------------------- |
| Start from a pre-built architecture | [Use Templates](templates.md)               |
| Learn all keyboard shortcuts        | [Keyboard Shortcuts](keyboard-shortcuts.md) |
| Understand the building blocks      | [Core Concepts](core-concepts.md)           |

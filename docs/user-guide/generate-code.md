# Generating Code

CloudBlocks converts your visual architecture into infrastructure-as-code as an **Experimental** feature. This guide explains how to generate, preview, and export code in Terraform, Bicep, or Pulumi.

> **Note**: Code generation is an **Experimental** feature in V1. It is available for users who want to export their visual designs to infrastructure-as-code, but it is not the primary product focus.

---

## Generating Code

Design your architecture on the canvas by placing resource blocks on container blocks and connecting them. Once your design is ready, you can view the generated code in two ways:

- **Inspector Panel**: Click the **Code** tab in the Inspector Panel on the right side of the screen. This displays the generated code immediately as you modify your architecture.
- **Menu Bar**: Use the **Build → Generate Code** menu option to focus the Code tab.

There is no separate code preview window. All code interaction happens within the Code tab of the Inspector Panel.

---

## Output Formats

CloudBlocks supports three industry-standard infrastructure-as-code formats. Use the selector inside the Inspector's Code tab to switch between them:

| Format        | Language                               | Best For                                             |
| :------------ | :------------------------------------- | :--------------------------------------------------- |
| **Terraform** | HCL (HashiCorp Configuration Language) | Multi-cloud deployments, industry standard (default) |
| **Bicep**     | Bicep (Azure Resource Manager)         | Azure-native infrastructure                          |
| **Pulumi**    | TypeScript                             | Developers who prefer code-first IaC                 |

---

## Generation Modes

You can toggle between two generation modes depending on your workflow:

- **Draft mode**: Generates a quick preview with inline values. This is ideal for prototyping and exploring how different configurations look in code.
- **Production mode**: Generates a full module structure including variables, outputs, and proper resource naming conventions. Use this mode when you are ready to commit code to a repository.

---

## Cloud Provider Regions

Code generation uses default regions based on your active cloud provider:

| Provider  | Default Region |
| :-------- | :------------- |
| **Azure** | `eastus`       |
| **AWS**   | `us-east-1`    |
| **GCP**   | `us-central1`  |

---

## What Gets Generated

The code generation pipeline maps your visual design to specific infrastructure components:

- **Resource definitions**: Each node on the canvas maps to its corresponding cloud resource.
- **Network configuration**: Container blocks map to VPCs, VNets, and subnets.
- **Connection wiring**: Connections between blocks map to security rules, IAM bindings, and network configurations.
- **Variables and outputs**: In Production mode, the generator extracts configurable parameters and exports key values.

### Example: Terraform Output

For a simple compute and database architecture, Terraform generates:

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

- **Copy to Clipboard**: Use the Copy button in the Inspector's Code tab to copy the generated code.
- **Export JSON**: Use **File → Export JSON** to save the architecture model itself as a JSON file.
- **Import JSON**: Use **File → Import JSON** to restore a previously exported architecture model.

---

## Validation Before Generation

CloudBlocks runs a validation engine before generating code. If there are issues with your architecture:

1. Errors appear in the **Validation** tab within the **Bottom Dock**.
2. You must fix these issues, such as invalid placements or broken connections, before the code reflects the intended state.
3. The generator ensures that only valid architectures produce infrastructure code.

---

## GitHub Integration

The GitHub integration allows you to sync your architecture directly with a repository.

- **Requirements**: This feature requires the CloudBlocks backend API and is not available in the frontend-only demo.
- **Sign In**: Use the **Sign In** button located in the **GitHub** section of the menu bar.
- **Workflow**:
  - Link your workspace to a specific GitHub repository.
  - Push your architecture and generated code directly to the repo.
  - Create pull requests for architecture changes.
  - Compare your local canvas with the state on GitHub.

---

## What's Next?

| Goal                                | Guide                                       |
| :---------------------------------- | :------------------------------------------ |
| Start from a pre-built architecture | [Use Templates](templates.md)               |
| Learn all keyboard shortcuts        | [Keyboard Shortcuts](keyboard-shortcuts.md) |
| Understand the building blocks      | [Core Concepts](core-concepts.md)           |

# Code Generation

> **Audience**: Beginners | **Status**: V1 Core (Terraform — Azure, AWS, GCP) / Experimental (Bicep, Pulumi) | **Verified against**: v0.31.0

!!! info "Terraform Starter Export"
    Terraform starter export is a V1 Core feature — it generates starter code for Azure, AWS, and GCP. Bicep (Azure-only by design) and Pulumi (Azure-only in V1) are available as Experimental features.

Export your visual architecture to Terraform starter code for Azure, AWS, or GCP. Bicep and Pulumi export are also available _(Experimental, Azure only)_.

---

## How to Generate Code

### From the Inspector Panel

1. Select any block on the canvas.
2. Click the **Code** tab in the Inspector Panel (right side).
3. The tab shows the generated code for the selected block.

### From the Build Menu

1. Go to **Build → Generate Code** in the menu bar.
2. This generates code for the entire architecture.

---

## Supported Formats

| Format        | Providers                     | Output                          | Status       |
| :------------ | :---------------------------- | :------------------------------ | :----------- |
| **Terraform** | Azure, AWS, GCP               | HCL configuration (default)     | V1 Core      |
| **Bicep**     | Azure only (by design)        | Azure Bicep templates           | Experimental |
| **Pulumi**    | Azure only (multi-cloud in V2)| Pulumi TypeScript configuration | Experimental |

Use the format selector to switch between output formats. Click **Copy** to copy the generated code to your clipboard.

---

## Multi-Cloud Output

CloudBlocks generates Terraform starter code for the currently active canvas provider (Azure, AWS, or GCP). Switching the canvas provider automatically clears any previously generated output and resets the generator to Terraform when the current selection is incompatible.

!!! info "Provider Coverage"
    Provider coverage varies by template, resource, and export path. Terraform starter export supports all three providers. Bicep is Azure-only. Pulumi is Azure-only.

### Provider-Specific Output

Each provider generates idiomatic Terraform using its native resource types:

| Provider  | Provider block       | Example resources                       | Default region |
| :-------- | :------------------- | :-------------------------------------- | :------------- |
| **Azure** | `azurerm`            | `azurerm_resource_group`, `azurerm_linux_web_app` | `eastus`       |
| **AWS**   | `aws`                | `aws_instance`, `aws_db_instance`       | `us-east-1`    |
| **GCP**   | `google`             | `google_cloud_run_v2_service`, `google_sql_database_instance` | `us-central1`  |

AWS and GCP output includes `# TODO` comments for resource fields that the visual model does not capture (e.g., AMI IDs for AWS, machine types for GCP). These are marked for you to fill in before applying.

Each provider remembers your last entered region when you switch between providers during a session.

### Region Validation

Each provider validates the region input against a curated allowlist of commonly used regions. If you enter an unsupported region, the generator returns an error in this format:

```
Unsupported <Provider> region for CloudBlocks starter generation: "<region>"
```

Regions (not availability zones) are validated — for example, `us-east-1` is valid for AWS, but `us-east-1a` is not.

---

## What the Starter Code Teaches You

The Terraform starter code shows you:

- How your visual architecture translates to infrastructure-as-code
- Which Terraform resources correspond to each block on your canvas
- How connections between blocks map to resource references in code
- Basic Terraform structure: providers, resources, variables, and outputs

This is designed for learning — review the code to deepen your understanding of cloud infrastructure.

---

## Limitations

- Terraform starter code is designed for **learning and prototyping** — review and adapt it before using in production.
- AWS and GCP output uses `# TODO` comments for fields the visual model does not capture — fill these in before applying.
- Not all resource properties are captured in the generated output.
- Complex networking configurations may need additional manual setup.
- The generator does not handle state management or deployment orchestration.
- Bicep is Azure-only by design (Bicep is an Azure-native language). Pulumi multi-cloud support is planned for V2.

---

## What's Next?

| Goal                            | Guide                                           |
| :------------------------------ | :---------------------------------------------- |
| Browse architecture patterns    | [Templates](../user-guide/templates.md)         |
| Build from a blank canvas       | [Blank Canvas Mode](blank-canvas.md)            |
| Understand connection semantics | [Core Concepts](../user-guide/core-concepts.md) |
| Try guided learning scenarios   | Click the **Learn** button in the menu bar      |

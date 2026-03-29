# Code Generation

> **Audience**: Beginners | **Status**: V1 Core (Terraform) / Experimental (Bicep, Pulumi) | **Verified against**: v0.26.0

!!! info "Terraform Starter Export"
    Terraform starter export is a V1 Core feature — it helps you learn what your visual architecture looks like as infrastructure-as-code. Bicep and Pulumi are available as Experimental features. The UI currently labels Generate Code as "Experimental" — it generates Terraform starter code using the V1 Core pipeline.

Export your visual architecture to Terraform starter code for learning and prototyping. Bicep and Pulumi export are also available _(Experimental)_.

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

| Format        | Output                          | Status       |
| :------------ | :------------------------------ | :----------- |
| **Terraform** | HCL configuration (default)     | V1 Core      |
| **Bicep**     | Azure Bicep templates           | Experimental |
| **Pulumi**    | Pulumi TypeScript configuration | Experimental |

Use the format selector to switch between output formats. Click **Copy** to copy the generated code to your clipboard.

---

## Multi-Cloud Output

CloudBlocks generates code for the currently active provider. Azure is active by default; AWS and GCP tabs are visible but marked Coming Soon. The code generation engine supports all three providers for Terraform output.

!!! info "Provider Coverage"
    Provider coverage varies by template, resource, and export path. Terraform starter export supports all three providers. Bicep is Azure-only. Pulumi is Azure-only.

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
- Not all resource properties are captured in the generated output.
- Complex networking configurations may need additional manual setup.
- The generator does not handle state management or deployment orchestration.
- Bicep and Pulumi outputs are Experimental and may change between versions.

---

## What's Next?

| Goal                            | Guide                                           |
| :------------------------------ | :---------------------------------------------- |
| Browse architecture patterns    | [Templates](../user-guide/templates.md)         |
| Build from a blank canvas       | [Blank Canvas Mode](blank-canvas.md)            |
| Understand connection semantics | [Core Concepts](../user-guide/core-concepts.md) |
| Try guided learning scenarios   | Click the **Learn** button in the menu bar      |

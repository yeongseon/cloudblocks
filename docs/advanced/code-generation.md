# Code Generation

> **Audience**: Intermediate users | **Status**: Experimental | **Verified against**: v0.26.0

!!! warning "Experimental Feature"
Code generation is available as an Experimental feature in V1. Generated output is intended as a starting point for infrastructure code, not as production-ready deployment artifacts. Always review and test generated code before using it.

Export your visual architecture to Terraform, Bicep, or Pulumi code.

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

| Format        | Output                          |
| :------------ | :------------------------------ |
| **Terraform** | HCL configuration (default)     |
| **Bicep**     | Azure Bicep templates           |
| **Pulumi**    | Pulumi TypeScript configuration |

Use the format selector to switch between output formats. Click **Copy** to copy the generated code to your clipboard.

---

## Multi-Cloud Output

CloudBlocks generates code for the currently active provider tab (Azure, AWS, or GCP). Switch provider tabs in the menu bar to generate code for different cloud platforms.

!!! info "Azure Depth-First"
Azure has the most complete resource coverage. AWS and GCP outputs are best-effort previews.

---

## Limitations

- Generated code is a **starting point** — it may require manual adjustments for your specific environment.
- Not all resource properties are captured in the generated output.
- Complex networking configurations may need additional manual setup.
- The generator does not handle state management or deployment orchestration.

---

## What's Next?

| Goal                            | Guide                                           |
| :------------------------------ | :---------------------------------------------- |
| Browse architecture patterns    | [Templates](../user-guide/templates.md)         |
| Build from a blank canvas       | [Blank Canvas Mode](blank-canvas.md)            |
| Understand connection semantics | [Core Concepts](../user-guide/core-concepts.md) |

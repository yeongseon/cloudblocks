# Provider Support

> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.26.0

CloudBlocks supports three cloud providers: **Azure**, **AWS**, and **GCP**. All three providers are available in the visual builder and Terraform starter export. Azure has the deepest template and scenario coverage; AWS and GCP have full Terraform code generation support.

---

## Provider Coverage Summary

| Feature                    | Azure            | AWS                        | GCP                        |
| :------------------------- | :--------------- | :------------------------- | :------------------------- |
| **Visual builder**         | ✅ Active         | ✅ Active                    | ✅ Active                    |
| **Templates & scenarios**  | ✅ Azure content  | — None yet                 | — None yet                 |
| **Validation engine**      | ✅ Full           | ✅ Full                      | ✅ Full                      |
| **Terraform starter code** | ✅ Full           | ✅ Full                      | ✅ Full                      |
| **Bicep export**           | ✅ Azure-only     | — (Azure-only by design)   | — (Azure-only by design)   |
| **Pulumi export**          | ✅ Azure-only     | — (Planned for V2)         | — (Planned for V2)         |

AWS and GCP Terraform output includes `# TODO` comments for resource properties that the visual model does not capture. Review and fill in these fields before applying the generated code.

---

## Provider Selector (Current State)

The menu bar shows three provider tabs: **Azure**, **AWS**, and **GCP**. Clicking a different provider tab creates a new provider-specific workspace after a confirmation dialog — your current workspace is preserved.

- Each provider workspace starts from a blank canvas (or from a template if you load one).
- Switching providers creates a separate workspace — it does not change your existing architecture in place.
- Previously generated code is cleared when you switch providers to avoid stale output.
- Each provider remembers your last entered region during the session.

---

## Multi-Cloud Terraform Generation

CloudBlocks supports multi-cloud Terraform generation — each provider workspace generates provider-specific Terraform starter code for Azure, AWS, or GCP.

!!! info "Learning focus"
    Multi-cloud support is a learning feature — it shows you the provider-specific resources and structure for the same architecture pattern. CloudBlocks does not deploy infrastructure or manage Terraform state.

---

## Export Format by Provider

| Export Format   | Providers Supported               | Status       |
| :-------------- | :-------------------------------- | :----------- |
| **Terraform**   | Azure ✅, AWS ✅, GCP ✅             | V1 Core      |
| **Bicep**       | Azure only (by design)            | Experimental |
| **Pulumi**      | Azure only (multi-cloud in V2)    | Experimental |

For details on exporting code, see [Code Generation](../advanced/code-generation.md).

---

## What's Next?

| Goal                             | Guide                                            |
| :------------------------------- | :----------------------------------------------- |
| Export Terraform starter code    | [Code Generation](../advanced/code-generation.md) |
| Understand the building blocks   | [Core Concepts](core-concepts.md)                |
| Browse architecture patterns     | [Templates](templates.md)                        |

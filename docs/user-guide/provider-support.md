# Provider Support

> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.27.0

CloudBlocks is designed around three cloud providers: **Azure**, **AWS**, and **GCP**. In V1, Azure is fully active — AWS and GCP have engine-level support but are not yet exposed in the UI.

---

## Provider Coverage Summary

| Feature                    | Azure            | AWS                        | GCP                        |
| :------------------------- | :--------------- | :------------------------- | :------------------------- |
| **Visual builder**         | ✅ Active         | 🔜 Coming Soon              | 🔜 Coming Soon              |
| **Templates & scenarios**  | ✅ Azure content  | — None yet                 | — None yet                 |
| **Validation engine**      | ✅ Full           | ⚠️ Engine only              | ⚠️ Engine only              |
| **Terraform starter code** | ✅ Full           | ⚠️ Engine only              | ⚠️ Engine only              |
| **Bicep export**           | ✅ Azure-only     | —                          | —                          |
| **Pulumi export**          | ✅ Azure-only     | —                          | —                          |

**What does "⚠️ Engine only" mean?** The code generation and validation engines include AWS and GCP provider definitions internally, but these providers are not yet selectable in the UI. You cannot switch to AWS or GCP in the current release.

---

## Provider Selector (Current State)

The menu bar shows three provider tabs: **Azure**, **AWS**, and **GCP**.

- **Azure** is the active provider — click it to use the builder.
- **AWS** and **GCP** tabs are visible but disabled, labeled **Coming Soon**. Clicking them has no effect.

When AWS and GCP become active in a future release, switching providers will change how blocks are rendered and what code is generated — but your architecture design stays the same.

---

## What "Multi-Cloud Preview" Means

CloudBlocks is building toward multi-cloud preview — the ability to visualize the same architecture across Azure, AWS, and GCP, so you can compare how providers name and organize equivalent services.

In V1, multi-cloud preview is **not yet active**. The provider selector shows the planned providers, but only Azure is functional. AWS and GCP visual preview will ship in a future milestone.

!!! info "Learning focus"
    Multi-cloud preview is a learning feature — it will show you the provider-specific names and structure for the same architecture pattern. It is not a deployment tool.

---

## Export Format by Provider

| Export Format   | Providers Supported          | Status       |
| :-------------- | :--------------------------- | :----------- |
| **Terraform**   | Azure (AWS, GCP engine-only) | V1 Core      |
| **Bicep**       | Azure only                   | Experimental |
| **Pulumi**      | Azure only                   | Experimental |

For details on exporting code, see [Code Generation](../advanced/code-generation.md).

---

## What's Next?

| Goal                             | Guide                                            |
| :------------------------------- | :----------------------------------------------- |
| Export Terraform starter code    | [Code Generation](../advanced/code-generation.md) |
| Understand the building blocks   | [Core Concepts](core-concepts.md)                |
| Browse architecture patterns     | [Templates](templates.md)                        |

# Provider Support

> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.26.0

CloudBlocks supports three cloud providers: **Azure**, **AWS**, and **GCP**. This page explains what works for each provider in V1.

---

## Provider Coverage Summary

| Feature                    | Azure       | AWS         | GCP         |
| :------------------------- | :---------- | :---------- | :---------- |
| **Visual builder**         | ✅ Full      | ✅ Full      | ✅ Full      |
| **Templates & scenarios**  | ✅ Full      | ✅ Full      | ✅ Full      |
| **Validation engine**      | ✅ Full      | ✅ Full      | ✅ Full      |
| **Terraform starter code** | ✅ Full      | ✅ Full      | ✅ Full      |
| **Bicep export**           | ✅ Azure-only | —           | —           |
| **Pulumi export**          | ✅ Azure-only | —           | —           |

---

## How to Switch Providers

1. Open the **menu bar** at the top of the builder.
2. Click the **provider tabs** (Azure, AWS, GCP) to switch the active provider.
3. The canvas, palette, and code preview update to reflect the selected provider.

Your architecture model is **provider-neutral** — switching providers changes how blocks are rendered and what code is generated, but your design stays the same.

---

## What "Multi-Cloud Preview" Means

CloudBlocks lets you **visualize** the same architecture across Azure, AWS, and GCP. This helps you compare how cloud providers name and organize equivalent services.

!!! info "Learning focus"
    Multi-cloud preview is a learning feature — it shows you the provider-specific names and structure for the same architecture pattern. It is not a deployment tool.

---

## Export Format by Provider

| Export Format   | Providers Supported | Status       |
| :-------------- | :------------------ | :----------- |
| **Terraform**   | Azure, AWS, GCP     | V1 Core      |
| **Bicep**       | Azure only          | Experimental |
| **Pulumi**      | Azure only          | Experimental |

For details on exporting code, see [Code Generation](../advanced/code-generation.md).

---

## What's Next?

| Goal                             | Guide                                            |
| :------------------------------- | :----------------------------------------------- |
| Export Terraform starter code    | [Code Generation](../advanced/code-generation.md) |
| Understand the building blocks   | [Core Concepts](core-concepts.md)                |
| Browse architecture patterns     | [Templates](templates.md)                        |

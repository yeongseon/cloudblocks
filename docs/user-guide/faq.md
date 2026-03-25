# FAQ

> **Audience**: All Users | **Status**: Stable — V1 Core | **Verified against**: v0.26.0

Find answers to frequently asked questions about CloudBlocks.

---

## General

### What is CloudBlocks?

CloudBlocks is a preset-driven visual architecture design tool that lets you design cloud infrastructure by placing blocks and creating connections. Your designs are validated against real-world rules, and you can preview infrastructure across Azure, AWS, and GCP. Code generation to Terraform, Bicep, or Pulumi is available as an Experimental feature.

### Is CloudBlocks free?

Yes. CloudBlocks is an open-source project under the Apache 2.0 license.

### Do I need a cloud account?

No. You can design architectures and generate code entirely in the browser without any cloud provider account. You only need a cloud account when you decide to deploy the generated code to a real environment.

### Does CloudBlocks deploy infrastructure?

CloudBlocks generates infrastructure-as-code files as an Experimental feature. You then use your preferred deployment tool (Terraform, Bicep, or Pulumi CLI) to deploy that code. The core product focuses on visual architecture design and validation.

---

## Architecture Design

### What cloud providers are supported?

CloudBlocks supports Azure, AWS, and GCP. Azure currently offers the most comprehensive resource coverage.

### What are the 8 resource categories?

The eight resource categories are: Network, Delivery, Compute, Data, Messaging, Security, Identity, and Operations.

### Why can't I initiate a connection from a Database?

CloudBlocks uses an initiator model to reflect real-world connectivity patterns. Only certain categories can initiate connections: Compute, Delivery, and Messaging.

The following categories are receiver-only: Data, Security, Operations, Identity, and Network. For example, an application (Compute) connects to a database (Data), but a database does not initiate a connection back to an application.

### Where do I find resource details?

To see and edit the details of a block, click on it and look at the **Inspector Panel** on the right side of the editor. To add new resources, use the **Sidebar Palette** on the left side.

---

## Code Generation

### What output formats are supported?

- Terraform (HCL)
- Bicep (Azure)
- Pulumi (TypeScript)

### Is the code production-ready?

The generated code follows standard cloud patterns and is provided as-is (Experimental). You should review the output to ensure it matches your organization's specific naming conventions and security policies before deploying to a production environment.

### Is code generation deterministic?

Yes. Given the same architecture, the generator will always produce the same code.

---

## Data and Storage

### Where is my architecture saved?

Your work is saved in your browser's local storage. This means it persists across sessions on the same browser and device.

### Can I export my work?

You can export your design as infrastructure code via the code preview feature. If the backend API is connected, you can also sync your architecture with a GitHub repository.

---

## GitHub Integration

### Do I need a GitHub account?

A GitHub account is only required if you want to use advanced features like repo sync, pull request creation, and architecture diffing. The core builder and code generation work without any login.

---

## Troubleshooting

### Why can't I place a block?

Blocks must be placed inside a Network or Subnet block. Make sure you have placed a Network block on the canvas first.

### Why won't my connection work?

Check that your source category can initiate connections (Compute, Delivery, or Messaging). If you are trying to connect from a Data, Security, Operations, Identity, or Network block, the builder will block it because those categories are receiver-only.

### Where is Learning Mode?

You can access Learning Mode via **Build → Browse Scenarios** or by clicking the **Learn How** button on the empty canvas. There are three built-in scenarios: Three-Tier Web Application, Serverless HTTP API, and Event-Driven Data Pipeline.

---

## Getting Help

If you run into issues or have questions, you can report bugs on GitHub Issues or join the conversation on GitHub Discussions.

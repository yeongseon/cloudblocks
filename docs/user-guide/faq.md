# FAQ

> **Audience**: Beginners | **Status**: Stable — V1 Core | **Verified against**: v0.26.0

Find answers to frequently asked questions about CloudBlocks.

---

## General

### What is CloudBlocks?

CloudBlocks is a visual cloud learning tool for beginners. Start from guided templates, learn common architecture patterns step by step, and export Terraform starter code — all in your browser. It is designed for bootcamp students, career changers, and junior developers who are just getting started with cloud infrastructure.

### Who is CloudBlocks for?

CloudBlocks is designed for beginners — bootcamp students, career changers, and junior developers learning cloud infrastructure for the first time. Experienced engineers may find it useful for quick prototyping and architecture visualization.

### Is CloudBlocks free?

Yes. CloudBlocks is an open-source project under the Apache 2.0 license.

### Do I need a cloud account?

No. You can learn cloud architecture patterns and export Terraform starter code entirely in the browser without any cloud provider account. You only need a cloud account when you decide to deploy the generated code to a real environment.

### Does CloudBlocks deploy infrastructure?

No. CloudBlocks is a learning tool, not a deployment platform. It exports Terraform starter code that you can use to learn infrastructure-as-code concepts. You then use your preferred deployment tool (Terraform CLI) to deploy that code when you are ready. Bicep and Pulumi export are also available as Experimental features.

---

## Learning

### How do I start learning?

Click **Start Learning** on the empty canvas, or click the **Learn** button in the menu bar. Choose a scenario that matches your level (beginner, intermediate, or advanced) and follow the guided steps.

### What scenarios are available?

Three built-in guided scenarios are available:

1. **Three-Tier Web Application** (Beginner, ~10 min) — Build a classic frontend + API + database architecture
2. **Serverless HTTP API** (Intermediate, ~8 min) — Build a serverless function architecture
3. **Event-Driven Data Pipeline** (Advanced, ~12 min) — Build an event processing pattern

In addition, there are 6 built-in templates (including the 3 scenario templates plus Simple Compute Setup, Data Storage Backend, and Full-Stack Serverless with Event Processing) that you can load from the template gallery.

### Can I exit a scenario early?

Yes. You can exit Learning Mode at any time and keep the architecture you have built so far.

---

## Architecture Design

### What cloud providers are supported?

Azure is the active provider with full resource coverage across all 8 categories. AWS and GCP tabs are visible in the menu bar but marked Coming Soon. The code generation engine supports all three providers for Terraform output.

### What are the 8 resource categories?

The eight resource categories are: Network, Delivery, Compute, Data, Messaging, Security, Identity, and Operations.

### Why can't I initiate a connection from a Database?

CloudBlocks uses an initiator model to reflect real-world connectivity patterns. Only certain categories can initiate connections: Compute, Delivery, and Messaging.

The following categories are receiver-only: Data, Security, Operations, Identity, and Network. For example, an application (Compute) connects to a database (Data), but a database does not initiate a connection back to an application.

### Where do I find resource details?

To see and edit the details of a block, click on it and look at the **Inspector Panel** on the right side of the editor. To add new resources, use the **Sidebar Palette** on the left side.

---

## Code Export

### What output formats are supported?

- **Terraform** (HCL) — Starter export for learning and prototyping (V1 Core)
- **Bicep** (Azure) — _(Experimental)_
- **Pulumi** (TypeScript) — _(Experimental)_

### Is the exported code production-ready?

The Terraform starter code is designed for learning and prototyping, not production deployment. You should review the output and adapt it to your organization's naming conventions and security policies before deploying to a production environment. Bicep and Pulumi exports are Experimental and may change between versions.

### Is code generation deterministic?

Yes. Given the same architecture, the generator will always produce the same code.

---

## Data and Storage

### Where is my architecture saved?

Your work is saved in your browser's local storage. This means it persists across sessions on the same browser and device.

### Can I export my work?

You can export your design as Terraform starter code via the code preview feature. If the backend API is connected, you can also sync your architecture with a GitHub repository.

---

## GitHub Integration

### Do I need a GitHub account?

A GitHub account is only required if you want to use advanced features like repo sync, pull request creation, and architecture diffing. The core learning experience and code export work without any login.

---

## Troubleshooting

### Why can't I place a block?

Blocks must be placed inside a Network or Subnet block. Make sure you have placed a Network block on the canvas first.

### Why won't my connection work?

Check that your source category can initiate connections (Compute, Delivery, or Messaging). If you are trying to connect from a Data, Security, Operations, Identity, or Network block, the builder will block it because those categories are receiver-only.

### Where is Learning Mode?

You can access Learning Mode by clicking the **Learn** button in the menu bar, or by clicking **Start Learning** on the empty canvas. There are three built-in scenarios: Three-Tier Web Application, Serverless HTTP API, and Event-Driven Data Pipeline.

---

## Getting Help

If you run into issues or have questions, you can report bugs on GitHub Issues or join the conversation on GitHub Discussions.

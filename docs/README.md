# Welcome to CloudBlocks

**CloudBlocks** is a visual cloud learning tool for beginners — start from guided templates, learn common architecture patterns, and export Terraform starter code. Everything runs in your browser. No cloud account or backend required.

<div class="grid cards" markdown>

- :material-school:{ .lg .middle } **Learn Cloud Architecture**

  ***

  Follow guided scenarios to learn cloud infrastructure patterns step by step — from your first VNet to a full three-tier web app.

  [:octicons-arrow-right-24: First Architecture](user-guide/first-architecture.md)

- :material-rocket-launch:{ .lg .middle } **Quick Start**

  ***

  Install locally and launch the builder in under 2 minutes.

  [:octicons-arrow-right-24: Get started](user-guide/quick-start.md)

- :material-shield-check:{ .lg .middle } **Validation**

  ***

  Real-time constraint checking ensures your architecture follows cloud best practices.

  [:octicons-arrow-right-24: Learn more](user-guide/validation.md)

- :material-lightbulb:{ .lg .middle } **Core Concepts**

  ***

  Understand blocks, connections, templates, and the 8 resource categories.

  [:octicons-arrow-right-24: Read concepts](user-guide/core-concepts.md)

</div>

---

## Your First Architecture in 4 Steps

| Step  | What You Do                                    | Guide                                                  |
| :---: | ---------------------------------------------- | ------------------------------------------------------ |
| **1** | Open the builder (live demo or local)          | [Quick Start](user-guide/quick-start.md)               |
| **2** | Load a guided template and follow the steps    | [First Architecture](user-guide/first-architecture.md) |
| **3** | Customize — add blocks, connect, validate      | [Editor Basics](user-guide/editor-basics.md)           |
| **4** | Export Terraform starter code to keep learning | [Code Generation](advanced/code-generation.md)         |

---

## Key Concepts

CloudBlocks uses a **block-based composition model** where everything snaps together:

- **Container blocks** — Logical boundaries (VPC, resource group, subnet). Container blocks hold other blocks.
- **Resource blocks** — Cloud resources (VM, database, storage, function). Resource blocks sit inside container blocks.
- **Connections** — Typed links between blocks (http, data, event).
- **Templates** — Pre-built architecture patterns you can load, learn from, and customize.

> New to cloud architecture? Start with [First Architecture from a Template](user-guide/first-architecture.md) — it walks you through a real-world pattern step by step.

---

## What Can You Build?

| Pattern               | Description                               | Template     |
| --------------------- | ----------------------------------------- | ------------ |
| Three-Tier Web App    | Frontend + API + database with networking | Built-in     |
| Serverless API        | Functions + API gateway + storage         | Built-in     |
| Event-Driven Pipeline | Queues + event hubs + processing          | Built-in     |
| Custom Architecture   | Start from scratch — any cloud pattern    | Blank canvas |

---

## Features at a Glance

| Feature                      | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Guided Templates**         | 6 built-in architecture patterns with step-by-step learning scenarios       |
| **Learning Mode**            | Interactive guided scenarios to learn cloud architecture patterns (V1 Core) |
| **Visual Builder**           | Drag-and-drop editor with grid snapping and auto-layout                     |
| **Validation Engine**        | Real-time rule checking for placement, connections, and constraints         |
| **8 Resource Categories**    | Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations |
| **Terraform Starter Export** | Export your design to Terraform starter code for learning and prototyping   |
| **Multi-Cloud Preview**      | Visual preview for Azure, AWS, and GCP                                      |
| **Dual Theme System**        | Workshop (light) and Blueprint (dark) themes                                |
| **Bicep & Pulumi**           | Additional IaC export formats _(Experimental)_                              |

---

## Learn More

<div class="grid cards" markdown>

- :material-book-open-variant:{ .lg .middle } **Templates**

  ***

  Browse all 6 built-in architecture patterns and learn how to customize them.

  [:octicons-arrow-right-24: Templates](user-guide/templates.md)

- :material-pencil-ruler:{ .lg .middle } **Blank Canvas Mode**

  ***

  Build a custom architecture from scratch without a template. Recommended after completing guided scenarios.

  [:octicons-arrow-right-24: Blank canvas](advanced/blank-canvas.md)

- :material-file-document:{ .lg .middle } **Architecture Model**

  ***

  The domain model behind CloudBlocks — block types, categories, and connection semantics.

  [:octicons-arrow-right-24: Domain Model](model/DOMAIN_MODEL.md)

- :material-code-braces:{ .lg .middle } **Terraform Starter Export**

  ***

  Export your design to Terraform starter code. Bicep and Pulumi are also available _(Experimental)_.

  [:octicons-arrow-right-24: Learn how](advanced/code-generation.md)

</div>

---

## Contributing

Interested in contributing to CloudBlocks? See the [Contributing Guide](contributing.md) for development setup, coding standards, and the PR process.

# Welcome to CloudBlocks

**CloudBlocks** is a preset-driven visual architecture design tool — start from built-in templates, customize with drag-and-drop blocks, validate against real-world rules, and preview across Azure, AWS, and GCP — all from the browser. No backend required.

<div class="grid cards" markdown>

- :material-puzzle:{ .lg .middle } **Start from a Template**

  ***

  Load a pre-built architecture pattern — three-tier web app, serverless API, or event pipeline — and customize it.

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

| Step  | What You Do                               | Guide                                                  |
| :---: | ----------------------------------------- | ------------------------------------------------------ |
| **1** | Open the builder (live demo or local)     | [Quick Start](user-guide/quick-start.md)               |
| **2** | Load a template and explore the interface | [First Architecture](user-guide/first-architecture.md) |
| **3** | Customize — add blocks, connect, validate | [Editor Basics](user-guide/editor-basics.md)           |
| **4** | Save your workspace                       | [Workspaces](user-guide/workspaces.md)                 |

---

## Key Concepts

CloudBlocks uses a **block-based composition model** where everything snaps together:

- **Container blocks** — Logical boundaries (VPC, resource group, subnet). Container blocks hold other blocks.
- **Resource blocks** — Cloud resources (VM, database, storage, function). Resource blocks sit inside container blocks.
- **Connections** — Typed links between blocks (http, data, event).
- **Templates** — Pre-built architecture patterns you can load and customize.

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

| Feature                   | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| **Visual Builder**        | Drag-and-drop editor with grid snapping and auto-layout                     |
| **Preset Templates**      | 6 built-in architecture patterns (three-tier, serverless, event pipeline)   |
| **8 Resource Categories** | Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations |
| **Multi-Cloud Preview**   | Visual preview for Azure, AWS, and GCP (Azure depth-first)                  |
| **Validation Engine**     | Real-time rule checking for placement, connections, and constraints         |
| **Learning Mode**         | Guided scenarios to learn cloud architecture patterns                       |
| **Dual Theme System**     | Workshop (light) and Blueprint (dark) themes                                |
| **Code Generation**       | Export to Terraform, Bicep, or Pulumi _(Experimental)_                      |

---

## Learn More

<div class="grid cards" markdown>

- :material-book-open-variant:{ .lg .middle } **Templates**

  ***

  Browse all 6 built-in architecture patterns and learn how to customize them.

  [:octicons-arrow-right-24: Templates](user-guide/templates.md)

- :material-pencil-ruler:{ .lg .middle } **Blank Canvas Mode**

  ***

  Build a custom architecture from scratch without a template.

  [:octicons-arrow-right-24: Blank canvas](advanced/blank-canvas.md)

- :material-file-document:{ .lg .middle } **Architecture Model**

  ***

  The domain model behind CloudBlocks — block types, categories, and connection semantics.

  [:octicons-arrow-right-24: Domain Model](model/DOMAIN_MODEL.md)

- :material-code-braces:{ .lg .middle } **Code Generation** _(Experimental)_

  ***

  Export your design to Terraform, Bicep, or Pulumi.

  [:octicons-arrow-right-24: Learn how](advanced/code-generation.md)

</div>

---

## Contributing

Interested in contributing to CloudBlocks? See the [Contributing Guide](contributing.md) for development setup, coding standards, and the PR process.

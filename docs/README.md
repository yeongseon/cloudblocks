# Welcome to CloudBlocks

**CloudBlocks** is a preset-driven visual architecture design tool — start from built-in templates, customize with drag-and-drop blocks, validate against real-world rules, and preview across Azure, AWS, and GCP — all from the browser.

<div class="grid cards" markdown>

- :material-rocket-launch:{ .lg .middle } **Quick Start**

  ***

  Clone the repo, run `pnpm dev`, and open the builder in under 2 minutes.

  [:octicons-arrow-right-24: Get started](guides/TUTORIALS.md)

- :material-puzzle:{ .lg .middle } **Templates**

  ***

  Start from a pre-built architecture — three-tier web app, serverless API, or event pipeline.

  [:octicons-arrow-right-24: Browse templates](engine/templates.md)

- :material-code-braces:{ .lg .middle } **Code Generation** _(Experimental)_

  ***

  Export your design to Terraform, Bicep, or Pulumi. Available as an Experimental feature.

  [:octicons-arrow-right-24: Learn how](engine/generator.md)

- :material-shield-check:{ .lg .middle } **Validation Rules**

  ***

  Real-time constraint checking ensures your architecture is valid before you export.

  [:octicons-arrow-right-24: View rules](engine/rules.md)

</div>

---

## Your First Architecture in 5 Steps

| Step  | What You Do                               | Guide                                            |
| :---: | ----------------------------------------- | ------------------------------------------------ |
| **1** | Install and launch the builder            | [Installation](guides/DEPLOYMENT.md#quick-start) |
| **2** | Follow a guided tutorial in Learning Mode | [Tutorials](guides/TUTORIALS.md)                 |
| **3** | Design your own architecture              | [Using the Editor](concept/UI_FLOW.md)           |
| **4** | Preview across cloud providers            | [Multi-Cloud Preview](concept/UI_FLOW.md)        |
| **5** | Optionally generate infrastructure code   | [Code Generator](engine/generator.md)            |

---

## Key Concepts

CloudBlocks uses a **block-based composition model** where everything snaps together:

- **Container blocks** — Logical boundaries (VPC, resource group, subnet). Container blocks hold blocks.
- **Resource blocks** — Cloud resources (VM, database, storage, function). Resource blocks sit on container blocks.
- **Connections** — Typed links between blocks (network, data, event, IAM).
- **Templates** — Pre-built architecture patterns you can load and customize.

> New to cloud architecture? Start with the [Tutorials](guides/TUTORIALS.md) — they walk you through real-world patterns step by step.

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

| Feature                   | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| **Visual Builder**        | Drag-and-drop editor with grid snapping and auto-layout                   |
| **Preset Templates**      | 6 built-in architecture patterns (three-tier, serverless, event pipeline) |
| **7 Resource Categories** | Network, Security, Edge, Compute, Data, Messaging, Operations             |
| **Multi-Cloud Preview**   | Visual preview for Azure, AWS, and GCP (Azure depth-first)                |
| **Validation Engine**     | Real-time rule checking for placement, connections, and constraints       |
| **Learning Mode**         | Guided scenarios to learn cloud architecture patterns                     |
| **Code Generation**       | Export to Terraform, Bicep, or Pulumi (Experimental — off by default)     |
| **AI Assistant**          | Architecture suggestions and cost estimation (requires backend)           |
| **GitHub Integration**    | OAuth login, repo sync, PR creation (requires backend)                    |

---

## Learn More

<div class="grid cards" markdown>

- :material-book-open-variant:{ .lg .middle } **Guides**

  ***

  Environment setup, deployment strategies, and workspace configuration.

  [:octicons-arrow-right-24: Guides](guides/ENVIRONMENT_STRATEGY.md)

- :material-robot:{ .lg .middle } **AI Engine**

  ***

  Use natural language to generate architectures, get suggestions, and estimate costs.

  [:octicons-arrow-right-24: AI docs](engine/ai.md)

- :material-file-document:{ .lg .middle } **Spec Reference**

  ***

  CloudBlocks design specification — geometry, providers, visual tokens.

  [:octicons-arrow-right-24: Spec v2.0](design/CLOUDBLOCKS_SPEC_V2.md)

- :material-api:{ .lg .middle } **REST API**

  ***

  Backend API endpoints for architectures, templates, AI, and GitHub integration.

  [:octicons-arrow-right-24: API spec](api/API_SPEC.md)

</div>

---

## Contributing

Interested in contributing to CloudBlocks? See the [Contributing Guide](contributing.md) for development setup, coding standards, and the PR process.

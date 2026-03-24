# Welcome to CloudBlocks

**CloudBlocks** is an architecture compiler — a visual IDE for cloud infrastructure that turns designs into infrastructure-as-code. Place blocks, connect resources, validate constraints, and generate Terraform, Bicep, or Pulumi — all from the browser.

<div class="grid cards" markdown>

- :material-rocket-launch:{ .lg .middle } **Quick Start**

  ***

  Clone the repo, run `pnpm dev`, and open the builder in under 2 minutes.

  [:octicons-arrow-right-24: Get started](guides/TUTORIALS.md)

- :material-puzzle:{ .lg .middle } **Templates**

  ***

  Start from a pre-built architecture — three-tier web app, serverless API, or event pipeline.

  [:octicons-arrow-right-24: Browse templates](engine/templates.md)

- :material-code-braces:{ .lg .middle } **Code Generation**

  ***

  Export your design to Terraform, Bicep, or Pulumi with one click.

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
| **4** | Generate infrastructure code              | [Code Generator](engine/generator.md)            |
| **5** | Deploy to your cloud environment          | [Deployment](guides/DEPLOYMENT.md)               |

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

| Feature                   | Description                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Visual Builder**        | Drag-and-drop editor with grid snapping and auto-layout                                                             |
| **7 Resource Categories** | Network, security, edge, compute, data, messaging, operations                                                       |
| **Multi-Cloud Output**    | Generate Terraform (HCL — HashiCorp Configuration Language), Bicep (Azure Resource Manager), or Pulumi (TypeScript) |
| **Validation Engine**     | Real-time rule checking for placement, connections, and constraints                                                 |
| **AI Assistant**          | Natural language to architecture, smart suggestions, cost estimation (requires backend)                             |
| **GitHub Integration**    | OAuth login, repo sync, PR creation, architecture diff                                                              |
| **Learning Mode**         | Guided scenarios to learn cloud architecture patterns                                                               |
| **Multi-Environment**     | Design for dev, staging, and production in one project                                                              |

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

  Full CloudBlocks v2.0 specification — geometry, providers, visual tokens.

  [:octicons-arrow-right-24: Spec v2.0](design/CLOUDBLOCKS_SPEC_V2.md)

- :material-api:{ .lg .middle } **REST API**

  ***

  Backend API endpoints for architectures, templates, AI, and GitHub integration.

  [:octicons-arrow-right-24: API spec](api/API_SPEC.md)

</div>

---

## Contributing

Interested in contributing to CloudBlocks? See the [Contributing Guide](contributing.md) for development setup, coding standards, and the PR process.

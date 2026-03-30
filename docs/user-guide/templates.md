# Templates

> **Audience**: Beginners | **Status**: Stable — V1 Core | **Verified against**: v0.26.0

Templates are pre-built architecture patterns that provide a working starting point. Instead of building from scratch, load a template and customize it for your needs.

> New to CloudBlocks? Start with the [First Architecture from a Template](first-architecture.md) walkthrough.

---

## Loading a Template

You can load a template in two ways:

1. From the builder toolbar, click the **Templates** button to open the Template Gallery.
2. Or use the menu: **Build → Browse Templates** to open the same Template Gallery view.

The Template Gallery shows all available patterns. Click any template to see a preview and description. Click **Use** to load it into your workspace.

When a template loads, it creates a complete workspace with all blocks and connections pre-configured.

---

## Built-in Templates

CloudBlocks includes six built-in templates covering common cloud architecture patterns. All templates use Azure resources by default, with multi-cloud preview available.

### 1. Three-Tier Web Application

**Difficulty:** Beginner | **Category:** Web Application

The classic web architecture pattern. An Internet source connects to an **Application Gateway** (delivery), which routes traffic to a **Virtual Machine** (compute). The backend includes both an **Azure SQL Database** (data) and **Blob Storage** (data). Resources are organized into two subnets inside a Virtual Network.

### 2. Simple Compute Setup

**Difficulty:** Beginner | **Category:** Web Application

A minimal architecture for simple workloads. Internet traffic flows through a **Gateway** to an **App Service** (compute) inside a single subnet. Ideal for learning the builder interface.

### 3. Data Storage Backend

**Difficulty:** Intermediate | **Category:** Data Pipeline

A backend-focused pattern where compute connects to multiple data stores. Includes an Internet source, an **Application Gateway**, and an **API Server** (compute). The architecture splits across two subnets: an App Subnet for compute and a Data Subnet for **Database** and **File Storage** resources.

### 4. Serverless HTTP API

**Difficulty:** Intermediate | **Category:** Serverless

A serverless pattern using managed services. Internet traffic routes through an **Application Gateway** to an **HTTP Handler** (function compute). Data is persisted in **Blob Storage** and **Cosmos DB**. Demonstrates scalable APIs without traditional servers.

### 5. Event-Driven Pipeline

**Difficulty:** Advanced | **Category:** Data Pipeline

A pure asynchronous processing pipeline. **Event Sources** and a **Message Queue** (messaging) trigger **Processing Functions** (function compute), which store results in **Data Lake Storage**. No direct internet traffic — driven entirely by timers and events.

### 6. Full-Stack Serverless with Event Processing

**Difficulty:** Advanced | **Category:** Serverless

The most complex built-in template — 13 blocks and 11 connections. Combines a synchronous web frontend (Internet → Application Gateway → Web Frontend + API Handler Function) with an asynchronous processing backend (Message Queue → Worker Function and Event Hub → Batch Processor).

---

## Customizing Templates

Templates are fully editable. After loading one, you can modify it just like any workspace:

- **Add resources**: Drag new components from the **Sidebar Palette** on the left.
- **Remove elements**: Select any block or connection and press **Delete**.
- **Connect components**: Click an output port on a source block, then click an input port on a target block.
- **Rearrange**: Drag blocks to change their position on the canvas.
- **Rename**: Click a block to select it, then edit its name in the **Inspector Panel** on the right.

### Safe Modifications

| ✅ Safe to Do                                 | ⚠️ Be Careful                                     | ❌ May Break Validation                         |
| :-------------------------------------------- | :------------------------------------------------ | :---------------------------------------------- |
| Add new resource blocks to existing subnets   | Removing a block that has connections             | Moving a resource block outside its container   |
| Rename any block                              | Adding a subnet without connecting it             | Deleting a container block with children inside |
| Add new connections between compatible blocks | Changing a block's resource type after connecting | Creating circular connection dependencies       |
| Rearrange block positions within a container  | Adding blocks from a different canvas tier        |                                                 |

> **Tip**: The validation engine runs in real-time. If a modification causes an issue, you'll see it immediately in the Validation panel. Use **Ctrl+Z** to undo.

---

## From Template to Custom Architecture

Templates are starting points, not constraints. Here's how to evolve a template into your own design:

1. **Start with the closest template** — pick the pattern that most resembles your target architecture.
2. **Modify incrementally** — add, remove, or reconnect blocks one at a time. Check validation after each change.
3. **Extend with new subnets** — if your architecture needs additional network segmentation, add new subnets inside the Virtual Network.
4. **Save your workspace** — once customized, your workspace is independent of the original template. See [Workspaces & Save/Load](workspaces.md).

---

## Choosing the Right Template

| If you need...                                  | Use this template          |
| :---------------------------------------------- | :------------------------- |
| A standard web app with a database              | Three-Tier Web Application |
| The simplest possible starting point            | Simple Compute Setup       |
| A backend with structured and unstructured data | Data Storage Backend       |
| A serverless API without server management      | Serverless HTTP API        |
| Asynchronous, event-driven processing           | Event-Driven Pipeline      |
| A complete serverless stack                     | Full-Stack Serverless      |

---

## What's Next?

| Goal                                     | Guide                                                       |
| :--------------------------------------- | :---------------------------------------------------------- |
| Walk through a template step by step     | [First Architecture from a Template](first-architecture.md) |
| Learn the editor interface               | [Editor Basics](editor-basics.md)                           |
| Build from scratch without a template    | [Blank Canvas Mode](../advanced/blank-canvas.md)            |
| Understand blocks, connections, and more | [Core Concepts](core-concepts.md)                           |

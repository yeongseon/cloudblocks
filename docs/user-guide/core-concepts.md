# Core Concepts

> **Audience**: All users | **Status**: V1 Core | **Verified against**: v0.26.0

CloudBlocks is a visual cloud learning tool that uses a block-based composition model. You learn cloud architecture by placing elements on the canvas, connecting them with typed protocols, and validating against real-world rules.

---

## Blocks

Blocks represent both logical boundaries and cloud resources in a unified model.

| Block Type  | Cloud Equivalent (Azure / AWS / GCP) | Placement Rules                                |
| ----------- | ------------------------------------ | ---------------------------------------------- |
| **Network** | VNet / VPC / VPC                     | Top-level block placed directly on the canvas. |
| **Subnet**  | Subnet / Subnet / Subnet             | Must be placed inside a Network block.         |

Blocks are placed inside either a Network or a Subnet to define their network location.

!!! info "Nesting"
    A typical architecture starts with a Network block, followed by one or more Subnet blocks inside it. Blocks like virtual machines or databases are then placed within those subnets.

---

## Blocks by Category

Blocks represent individual cloud resources. CloudBlocks organizes resources into exactly **8 categories**:

| Category       | What It Does                             | Example Azure Resources                                                 |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| **Network**    | Manages network infrastructure           | VNet, Subnet, NAT Gateway, Public IP, Route Table, Private Endpoint     |
| **Delivery**   | Handles traffic entry and routing        | Application Gateway, Front Door, CDN, DNS Zone, Load Balancer, Firewall |
| **Compute**    | Runs application code                    | VM, App Service, Functions, Container Instances, AKS                    |
| **Data**       | Stores and manages data                  | SQL Database, Cosmos DB, Blob Storage, Cache Store                      |
| **Messaging**  | Connects services asynchronously         | Queue (Service Bus), Event Hub                                          |
| **Security**   | Protects resources and manages access    | Key Vault, Bastion, NSG, Secret Store                                   |
| **Identity**   | Manages authentication and authorization | Entra ID, Service Principal                                             |
| **Operations** | Monitors and observes                    | Monitoring                                                              |

!!! tip "Sidebar Palette"
    You can find and drag these resources from the **Sidebar Palette** on the left side of the editor. In Learning Mode, the palette shows only the resources relevant to your current scenario.

---

## Connections

Connections represent communication flows between blocks. CloudBlocks uses a port-based model where each block has defined endpoints.

### Endpoint Model

- **EndpointSemantic**: `http`, `event`, or `data`. This describes the protocol or data type.
- **EndpointDirection**: `input` or `output`.

A connection links an **output port** on a source block to an **input port** on a target block.

### Allowed Connection Flows

The following flows are supported based on resource categories:

| Source Category | Target Category | Allowed Semantics |
| --------------- | --------------- | ----------------- |
| internet        | Delivery        | http, data        |
| Delivery        | Delivery        | http, data        |
| Delivery        | Compute         | http, data        |
| Compute         | Data            | data              |
| Compute         | Operations      | event, data       |
| Compute         | Security        | data              |
| Compute         | Messaging       | event, data       |
| Messaging       | Compute         | event, data       |

!!! warning "Receiver-only Categories"
    The following categories can only receive connections and cannot initiate them: **Data**, **Security**, **Operations**, **Identity**, and **Network**.

---

## Templates

Templates provide pre-configured architecture patterns to help you learn common cloud patterns. There are 6 built-in templates available, each with a guided learning scenario:

1.  **Three-Tier Web Application** (beginner, web-application)
2.  **Simple Compute Setup** (beginner, web-application)
3.  **Data Storage Backend** (intermediate, data-pipeline)
4.  **Serverless HTTP API** (intermediate, serverless)
5.  **Event-Driven Pipeline** (advanced, data-pipeline)
6.  **Full-Stack Serverless with Event Processing** (advanced, serverless)

---

## Cloud Providers

CloudBlocks supports multiple cloud providers, adapting resource names and icons automatically. Provider coverage varies by template, resource, and export path.

- **Azure**: Full resource coverage across all 8 categories.
- **AWS**: Resource names adapt to AWS terminology (e.g., VPC, EC2, Lambda, S3, RDS).
- **GCP**: Resource names adapt to GCP terminology (e.g., Compute Engine, Cloud Functions, Cloud Storage).

Use the provider tabs in the menu bar to switch the active provider for your workspace.

---

## Validation

The validation engine ensures your design follows cloud best practices and technical constraints.

- **Real-time Validation**: Errors appear instantly as you place resources or create connections.
- **Manual Check**: Run a full audit via **Build → Validate Architecture**.
- **Results**: View detailed error messages and warnings in the **Bottom Dock** under the validation tab.

---

## Workspaces

Workspaces allow you to manage multiple projects independently.

- **Storage**: Saved automatically to your browser's local storage.
- **Management**: Create, rename, or delete projects via the **Workspaces** button in the menu bar.

!!! note "GitHub Sync"
    GitHub sync requires the backend. See [Backend Integrations](../advanced/backend-integrations.md) for setup.

---

## Learning Mode

Learning Mode is the **primary way beginners interact with CloudBlocks**. Interactive guided scenarios teach you cloud architecture patterns step by step.

- **Three-Tier Web Application**: Beginner scenario, approximately 10 minutes.
- **Serverless HTTP API**: Intermediate scenario, approximately 8 minutes.
- **Event-Driven Data Pipeline**: Advanced scenario, approximately 12 minutes.

Access these guided scenarios via **Build → Browse Scenarios** in the menu bar, or by clicking **Start from Template** on an empty canvas.

---

## What's Next?

| Goal                          | Guide                                            |
| ----------------------------- | ------------------------------------------------ |
| Build your first architecture | [First Architecture](first-architecture.md)      |
| Learn the editor interface    | [Editor Basics](editor-basics.md)                |
| Build from a blank canvas     | [Blank Canvas Mode](../advanced/blank-canvas.md) |
| Explore pre-built patterns    | [Templates](templates.md)                        |
| Work faster with hotkeys      | [Keyboard Shortcuts](keyboard-shortcuts.md)      |

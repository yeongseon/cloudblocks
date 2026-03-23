# Core Concepts

CloudBlocks uses a Lego-style composition model. You build cloud architectures by snapping together four types of elements: **containers**, **nodes**, **connections**, and **templates**.

---

## Containers

Containers are the large boundary areas that represent network infrastructure. Every node must be placed inside a container.

| Container Type | Cloud Equivalent               | Nesting                                   |
| -------------- | ------------------------------ | ----------------------------------------- |
| **Network**    | Azure VNet / AWS VPC / GCP VPC | Top-level — placed directly on the canvas |
| **Subnet**     | Public or private subnet       | Must be inside a Network                  |

Containers define the network topology of your architecture. A typical setup has one Network containing one or more Subnets.

!!! info "Nesting rules"
Subnets must be placed inside a Network. Nodes must be placed inside a Subnet (or directly inside a Network). CloudBlocks enforces these rules and shows an error if placement is invalid.

---

## Nodes

Nodes are individual cloud resources — the actual services that run your workload. They are placed inside containers.

CloudBlocks organizes nodes into **10 categories**:

| Category          | Examples                          | Can Initiate Connections? |
| ----------------- | --------------------------------- | ------------------------- |
| **Compute**       | VM, App Service, ECS              | Yes                       |
| **Database**      | SQL Database, Cosmos DB, RDS      | No (receiver only)        |
| **Storage**       | Blob Storage, S3, Data Lake       | No (receiver only)        |
| **Gateway**       | API Gateway, Load Balancer        | Yes                       |
| **Function**      | Azure Function, Lambda            | Yes                       |
| **Queue**         | Service Bus, SQS                  | Yes                       |
| **Event**         | Event Grid, EventBridge           | Yes                       |
| **Analytics**     | Log Analytics, CloudWatch         | No (receiver only)        |
| **Identity**      | Entra ID, IAM                     | No (receiver only)        |
| **Observability** | Azure Monitor, CloudWatch Metrics | No (receiver only)        |

!!! tip "Initiator vs. receiver"
The "Can Initiate Connections?" column matters when you create connections. Only initiator nodes can be the **source** of a connection. Receiver-only nodes (like databases and storage) can only be **targets**. This reflects real-world patterns — a compute service connects to a database, not the other way around.

---

## Connections

Connections are the lines between nodes that represent communication flows. Each connection has a **type** that describes the nature of the communication.

| Type         | Meaning                                | Visual Style |
| ------------ | -------------------------------------- | ------------ |
| **Dataflow** | Directional traffic flow               | Solid arrow  |
| **HTTP**     | Request/response interaction           | Dashed arrow |
| **Internal** | Internal control-plane communication   | Dotted line  |
| **Data**     | Data synchronization and state-sharing | Double line  |
| **Async**    | Asynchronous event or callback         | Wavy line    |

### Creating a Connection

1. Click on the source node (must be an initiator)
2. Click on the target node
3. Select the connection type

### Connection Rules

- The source must be an initiator category (Compute, Gateway, Function, Queue, or Event)
- Queue and Event nodes can only connect to Function nodes
- A node cannot connect to itself
- CloudBlocks validates connections in real-time and prevents invalid ones

---

## Templates

Templates are pre-built architecture patterns that you can load and customize. They give you a working starting point instead of building from scratch.

CloudBlocks includes 6 built-in templates:

| Template                       | Description                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------- |
| **Three-Tier Web Application** | Gateway → Compute → Database + Storage                                       |
| **Simple Compute Setup**       | Single compute instance in a public subnet                                   |
| **Data Storage Backend**       | Compute → Database + Storage in a private subnet                             |
| **Serverless HTTP API**        | Gateway → Function → Storage + Database                                      |
| **Event-Driven Pipeline**      | Event → Function → Queue → Function → Storage                                |
| **Full-Stack Serverless**      | Complete architecture with API, queue workers, events, database, and storage |

Templates are fully editable — load one, then add, remove, or rearrange nodes and connections to match your needs.

For details on using templates, see [Use Templates](templates.md).

---

## Cloud Providers

CloudBlocks supports three cloud providers:

- **Azure** (default)
- **AWS**
- **GCP**

You can switch the active provider using the provider tabs in the menu bar. The provider determines which cloud-specific resources are available and how generated code is structured.

!!! warning "Mixed-provider architectures"
CloudBlocks allows mixing resources from different providers in the same architecture, but warns you when this happens. In most cases, you'll want to use a single provider for the entire architecture.

---

## Validation

CloudBlocks validates your architecture in real-time at three levels:

| Level            | What It Checks                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| **Placement**    | Nodes are inside valid containers (e.g., compute inside a subnet)           |
| **Connection**   | Valid source/target pairs, initiator rules                                  |
| **Architecture** | Cross-cutting constraints (e.g., database not directly exposed to internet) |

Validation errors appear as you build. You can also run a full validation manually via **Build → Validate Architecture**.

---

## Workspaces

A workspace is a saved architecture project. Each workspace has its own:

- Architecture (containers, nodes, connections)
- Undo/redo history
- GitHub link (optional)

You can create, rename, and switch between multiple workspaces using the **File** menu. Workspaces are saved to your browser's local storage.

---

## What's Next?

| Goal                                        | Guide                                            |
| ------------------------------------------- | ------------------------------------------------ |
| Build your first architecture               | [Quick Start](quick-start.md)                    |
| Design a complete architecture step by step | [Create an Architecture](create-architecture.md) |
| Generate infrastructure code                | [Generate Code](generate-code.md)                |

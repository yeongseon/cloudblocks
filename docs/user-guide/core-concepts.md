# Core Concepts

CloudBlocks uses a block-based composition model for cloud architecture. You build infrastructure by placing elements on the canvas, connecting them with typed protocols, and validating against real-world rules.

---

## Containers

Containers represent logical boundaries and network infrastructure. They are the "plates" that hold other resources.

| Container Type | Cloud Equivalent (Azure / AWS / GCP) | Placement Rules                                |
| -------------- | ------------------------------------ | ---------------------------------------------- |
| **Network**    | VNet / VPC / VPC                     | Top-level plate placed directly on the canvas. |
| **Subnet**     | Subnet / Subnet / Subnet             | Must be placed inside a Network plate.         |

Nodes are placed inside either a Network or a Subnet to define their network location.

!!! info "Nesting"
A typical architecture starts with a Network plate, followed by one or more Subnet plates inside it. Resources like virtual machines or databases are then placed within those subnets.

---

## Nodes

Nodes represent individual cloud resources. CloudBlocks organizes all resources into exactly **7 categories**:

| Category       | What It Does                          | Example Azure Resources                                                 |
| -------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| **Compute**    | Runs application code                 | VM, App Service, Functions, Container Instances, AKS                    |
| **Data**       | Stores and manages data               | SQL Database, Cosmos DB, Blob Storage, Cache Store                      |
| **Edge**       | Handles traffic entry and routing     | Application Gateway, Front Door, CDN, DNS Zone, Load Balancer, Firewall |
| **Security**   | Protects resources and manages access | Key Vault, Bastion, NSG, Secret Store                                   |
| **Messaging**  | Connects services asynchronously      | Queue (Service Bus), Event Hub                                          |
| **Network**    | Manages network infrastructure        | NAT Gateway, Public IP, Route Table, Private Endpoint                   |
| **Operations** | Monitors and observes                 | Monitoring                                                              |

!!! tip "Sidebar Palette"
You can find and drag these resources from the **Sidebar Palette** on the left side of the editor.

---

## Connections

Connections represent communication flows between nodes. CloudBlocks uses a port-based model where each node has defined endpoints.

### Endpoint Model

- **EndpointSemantic**: `http`, `event`, or `data`. This describes the protocol or data type.
- **EndpointDirection**: `input` or `output`.

A connection links an **output port** on a source node to an **input port** on a target node.

### Allowed Connection Flows

The following flows are supported based on resource categories:

| Source Category | Target Category | Allowed Semantics |
| --------------- | --------------- | ----------------- |
| internet        | Edge            | http, data        |
| Edge            | Edge            | http, data        |
| Edge            | Compute         | http, data        |
| Compute         | Data            | data              |
| Compute         | Operations      | event, data       |
| Compute         | Security        | data              |
| Compute         | Messaging       | event, data       |
| Messaging       | Compute         | event, data       |

!!! warning "Receiver-only Categories"
The following categories can only receive connections and cannot initiate them: **Data**, **Security**, **Operations**, and **Network**.

---

## Templates

Templates provide pre-configured architecture patterns to help you start quickly. There are 6 built-in templates available:

1.  **Three-Tier Web Application** (beginner, web-application)
2.  **Simple Compute Setup** (beginner, web-application)
3.  **Data Storage Backend** (intermediate, data-pipeline)
4.  **Serverless HTTP API** (intermediate, serverless)
5.  **Event-Driven Pipeline** (advanced, data-pipeline)
6.  **Full-Stack Serverless with Event Processing** (advanced, serverless)

---

## Cloud Providers

CloudBlocks supports multiple cloud providers, adapting resource names and icons automatically.

- **Azure**: The default provider with full resource coverage.
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
- **GitHub Sync**: Connect a workspace to a GitHub repository to sync your designs and generate Pull Requests.

---

## Learning Mode

Learning Mode offers interactive scenarios to help you master cloud architecture patterns.

- **Three-Tier Web Application**: Beginner scenario, approximately 10 minutes.
- **Serverless HTTP API**: Intermediate scenario, approximately 8 minutes.
- **Event-Driven Data Pipeline**: Advanced scenario, approximately 12 minutes.

Access these guided tutorials via **Build → Browse Scenarios** or by clicking the **Learn How** button on an empty canvas.

---

## What's Next?

| Goal                          | Guide                                         |
| ----------------------------- | --------------------------------------------- |
| Build your first architecture | [Quick Start](quick-start.md)                 |
| Create a custom design        | [Create Architecture](create-architecture.md) |
| Generate infrastructure code  | [Generate Code](generate-code.md)             |
| Explore pre-built patterns    | [Templates](templates.md)                     |
| Work faster with hotkeys      | [Keyboard Shortcuts](keyboard-shortcuts.md)   |

# Create an Architecture

This guide walks you through designing a cloud architecture from scratch on the CloudBlocks canvas. By the end, you'll have a working three-tier web application ready for code generation.

---

## Step 1 — Create a Network

Every architecture starts with a network container.

1. Open CloudBlocks. On the empty canvas, click **Start from Scratch**
   - This creates a default Network (VNet) container on the canvas
2. Alternatively, use the menu: **Insert → Network**

The network container represents a Virtual Private Cloud (VPC on AWS/GCP) or Virtual Network (VNet on Azure).

---

## Step 2 — Add Subnets

Subnets divide your network into isolated segments.

1. Go to **Insert → Subnet** (or drag a Subnet from the Command Palette at the bottom)
2. Place the subnet inside your network container
3. Add a second subnet for separation (e.g., one public, one private)

!!! tip "Public vs. private"
A common pattern is two subnets: a **public** subnet for internet-facing resources (gateways, load balancers) and a **private** subnet for backend resources (databases, internal services).

---

## Step 3 — Place Nodes

Nodes are the cloud resources that make up your workload. Add them from the **Command Palette** at the bottom of the screen.

1. **Gateway** — Drag a Gateway node into your public subnet. This represents your API Gateway or Load Balancer.
2. **Compute** — Drag a Compute node into your public or private subnet. This represents your application server.
3. **Database** — Drag a Database node into your private subnet. This represents your data store.

!!! info "Drag from the Command Palette"
The Command Palette at the bottom of the screen shows all available node categories. Drag a category onto the canvas to place it. The palette filters based on your active cloud provider.

### Node Placement Rules

- Nodes must be placed inside a container (network or subnet)
- CloudBlocks validates placement in real-time
- If a placement is invalid, you'll see an error notification

---

## Step 4 — Connect Nodes

Create connections to define communication flows between your nodes.

1. Click on the **Gateway** node (the source)
2. Click on the **Compute** node (the target)
3. Select the connection type — choose **HTTP** for request/response traffic
4. Repeat: connect **Compute** → **Database** with a **Data** connection type

### Connection Type Guide

| When to use...                 | Choose this type |
| ------------------------------ | ---------------- |
| API calls, web requests        | **HTTP**         |
| General traffic flow           | **Dataflow**     |
| Database reads/writes          | **Data**         |
| Background processing          | **Async**        |
| Internal service communication | **Internal**     |

!!! warning "Initiator rules"
Only certain node categories can be the **source** of a connection. Gateway, Compute, Function, Queue, and Event nodes can initiate connections. Database, Storage, Analytics, Identity, and Observability nodes are receiver-only.

---

## Step 5 — Validate

CloudBlocks validates your architecture in real-time, but you can also run a full check:

1. Go to **Build → Validate Architecture**
2. Review any errors or warnings
3. Fix issues by adjusting placement or connections

Validation checks three levels:

- **Placement** — Are nodes inside valid containers?
- **Connection** — Are source/target pairs valid?
- **Architecture** — Are there cross-cutting constraint violations?

---

## Step 6 — Generate Code

Once your architecture passes validation:

1. Go to **Build → Generate**
2. The Code Preview panel shows your architecture as infrastructure code
3. Choose your output format: Terraform, Bicep, or Pulumi
4. Click **Copy** to copy the code to your clipboard

For detailed options, see [Generate Code](generate-code.md).

---

## Tips for Better Architectures

### Use Templates as a Starting Point

Instead of building from scratch, load a [template](templates.md) and modify it. Templates follow cloud best practices.

### Follow the Tiered Pattern

Organize resources into tiers:

```
Internet → Gateway → Compute → Database/Storage
```

This is the most common cloud architecture pattern and maps cleanly to subnet boundaries.

### Use Meaningful Names

Click on any node or container to rename it in the bottom panel. Clear names make your architecture easier to understand and produce more readable generated code.

### Leverage Undo/Redo

Made a mistake? Press **Ctrl+Z** to undo. Press **Ctrl+Shift+Z** to redo. CloudBlocks maintains a full history of your changes.

---

## Example: Three-Tier Web Application

Here's the architecture you just built:

```
Network (VNet)
├── Public Subnet
│   ├── Gateway (API Gateway / Load Balancer)
│   └── Compute (App Server)
└── Private Subnet
    └── Database (SQL Database)

Connections:
  Gateway  →[HTTP]→     Compute
  Compute  →[Data]→     Database
```

This pattern is available as a built-in template — select **Three-Tier Web Application** from the Template Gallery.

---

## What's Next?

| Goal                             | Guide                                       |
| -------------------------------- | ------------------------------------------- |
| Export your architecture as code | [Generate Code](generate-code.md)           |
| Start from a pre-built pattern   | [Use Templates](templates.md)               |
| Learn the keyboard shortcuts     | [Keyboard Shortcuts](keyboard-shortcuts.md) |

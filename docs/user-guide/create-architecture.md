# Create an Architecture

This guide walks you through designing a cloud architecture on the CloudBlocks canvas. Follow these steps to build a valid, deployable architecture from scratch.

---

## Step 1: Create a Network

Every architecture starts with a network container to hold your resources.

1.  On the empty canvas, click **Start from Scratch**. This creates a Network (VNet) container.
2.  Alternatively, open the **Sidebar Palette** on the left side of the screen.
3.  Find the **Foundation** group and click or drag **Network (VNet)** onto the canvas.

The network container represents your primary logical boundary, such as a Virtual Private Cloud or Virtual Network.

---

## Step 2: Add Subnets

Subnets allow you to partition your network into smaller, isolated segments.

1.  Once a network exists, the **Subnet** option becomes enabled in the Sidebar Palette.
2.  In the Sidebar Palette, find **Subnet** under the Foundation group.
3.  Click it or drag it inside your Network on the canvas.
4.  Add a second subnet to separate different tiers. A common pattern uses one subnet for internet-facing resources and another for backend services.

The Sidebar Palette shows disabled resources with a tooltip. If you cannot select a subnet, the tooltip will explain that you must create a network first.

---

## Step 3: Place Resources

Add resources from the **Sidebar Palette** on the left side of the screen. The palette organizes resources into functional groups.

### Resource Groups

| Group      | Resources                                                                       |
| ---------- | ------------------------------------------------------------------------------- |
| Foundation | Network (VNet), Subnet                                                          |
| Compute    | Functions, App Service, Container Instances, Virtual Machine, Kubernetes (AKS)  |
| Data       | Blob Storage, SQL Database, Cosmos DB                                           |
| Edge       | DNS Zone, CDN Profile, Front Door, Application Gateway, Load Balancer, Firewall |
| Security   | Key Vault, Bastion, Network Security Group                                      |
| Messaging  | Queue, Event Hub                                                                |
| Network    | NAT Gateway, Public IP, Route Table, Private Endpoint                           |
| Operations | Monitoring                                                                      |

### How to Add Resources

- **Click**: Select a resource in the Sidebar Palette to place it automatically on the best available container.
- **Drag**: Move a resource from the Sidebar Palette onto the canvas and drop it in your preferred location.

Some resources require a network to exist before you can place them. These resources appear disabled in the palette until you add a network.

---

## Step 4: Connect Resources

CloudBlocks uses a port-based connection model to define how resources communicate.

### Port Types

Each resource has input and output ports (endpoints). Ports use one of three semantic types:

- **http**: For web requests and API calls.
- **event**: For asynchronous messaging and triggers.
- **data**: For database access and storage operations.

### Create a Connection

1.  Click an **output port** on the source resource.
2.  Click an **input port** on the target resource.

### Connection Rules

Connections follow real-world traffic patterns:

- **Internet to Edge**: http, data
- **Edge to Compute**: http, data
- **Compute to Data**: data only
- **Compute to Messaging**: event, data
- **Messaging to Compute**: event, data (bidirectional)

Resources in the Data, Security, Operations, and Network categories are receiver-only. They cannot initiate connections to other resources.

---

## Step 5: Validate

CloudBlocks validates your design in real-time. You can also run a manual check to ensure your architecture is ready for deployment.

1.  Open the menu and select **Build > Validate Architecture**.
2.  View the results in the **Validation** tab within the **Bottom Dock**.
3.  Fix any placement or connection errors shown in the list.

---

## Step 6: Generate Code

When your architecture is complete, export it as infrastructure code.

1.  Click the **Code** tab in the **Inspector Panel** on the right side of the screen.
2.  Alternatively, use the menu: **Build > Generate Code**.
3.  Choose your preferred format: **Terraform**, **Bicep**, or **Pulumi**.
4.  Click **Copy** to save the code to your clipboard.

---

## Tips for Success

- **Use Templates**: Start with a pre-built template to save time and follow best practices.
- **Tiered Pattern**: Arrange your resources in a logical flow from Internet to Edge, then Compute, and finally Data.
- **Rename Nodes**: Click any node name in the **Inspector Panel** to give it a meaningful name.
- **Undo Changes**: Use **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (macOS) to quickly revert mistakes.

---

## Example: Three-Tier Web Application

A standard three-tier architecture separates the presentation, logic, and data layers into different subnets.

```text
Network (VNet)
├── Subnet 1
│   ├── Application Gateway (edge)
│   └── Virtual Machine (compute)
└── Subnet 2
    ├── SQL Database (data)
    └── Blob Storage (data)
```

---

## What's Next?

| Goal                             | Guide                                       |
| :------------------------------- | :------------------------------------------ |
| Master the code generator        | [Generate Code](generate-code.md)           |
| Browse all architecture patterns | [Templates](templates.md)                   |
| Learn all keyboard shortcuts     | [Keyboard Shortcuts](keyboard-shortcuts.md) |
| Understand the building blocks   | [Core Concepts](core-concepts.md)           |

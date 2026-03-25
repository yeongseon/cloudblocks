# Blank Canvas Mode

> **Audience**: Intermediate users | **Status**: V1 Advanced | **Verified against**: v0.26.0

!!! note "Start with Templates"
If this is your first time using CloudBlocks, start with [First Architecture from a Template](../user-guide/first-architecture.md) instead. Blank canvas mode is for users who want to build a custom architecture from scratch.

This guide walks you through designing a cloud architecture from an empty canvas without using a template.

---

## Step 1 — Create a Network

Every architecture starts with a network block.

1. On the empty canvas, click **Start from Scratch** to create a Network (VNet) block.
2. Alternatively, open the **Sidebar Palette** and drag **Network (VNet)** onto the canvas.

The network block represents your primary logical boundary (Virtual Network or VPC).

---

## Step 2 — Add Subnets

Subnets partition your network into isolated segments.

1. In the Sidebar Palette, find **Subnet** (under Network category or Foundation group).
2. Click or drag it inside your Network on the canvas.
3. Add a second subnet to separate tiers — one for internet-facing resources, another for backend services.

!!! tip "Disabled Resources"
Resources that require a network appear disabled in the palette. Hover over them to see the requirement tooltip.

---

## Step 3 — Place Resources

Add resources from the Sidebar Palette. Resources are organized into 8 categories:

| Category       | Example Resources                                                               |
| :------------- | :------------------------------------------------------------------------------ |
| **Network**    | NAT Gateway, Public IP, Route Table, Private Endpoint                           |
| **Delivery**   | DNS Zone, CDN Profile, Front Door, Application Gateway, Load Balancer, Firewall |
| **Compute**    | Functions, App Service, Container Instances, VM, AKS                            |
| **Data**       | Blob Storage, SQL Database, Cosmos DB                                           |
| **Messaging**  | Queue (Service Bus), Event Hub                                                  |
| **Security**   | Key Vault, Bastion, NSG                                                         |
| **Identity**   | Entra ID, Service Principal                                                     |
| **Operations** | Monitoring                                                                      |

- **Click** a resource in the palette to place it automatically on the best available container.
- **Drag** a resource onto the canvas to place it manually.

---

## Step 4 — Connect Resources

CloudBlocks uses a port-based connection model.

1. Click an **output port** on the source resource.
2. Click an **input port** on the target resource.

See [Core Concepts — Connections](../user-guide/core-concepts.md#connections) for allowed connection flows and semantic types.

---

## Step 5 — Validate

Run **Build → Validate Architecture** and check the Validation tab in the Bottom Dock. Fix any placement or connection errors.

---

## Example: Three-Tier Web Application

```text
Network (VNet)
├── Subnet 1
│   ├── Application Gateway (Delivery)
│   └── Virtual Machine (Compute)
└── Subnet 2
    ├── SQL Database (Data)
    └── Blob Storage (Data)
```

---

## Tips

- **Tiered Pattern**: Arrange resources in a logical flow — Internet → Delivery → Compute → Data.
- **Rename Blocks**: Click any block and edit its name in the Inspector Panel.
- **Undo**: Use Ctrl+Z / Cmd+Z to quickly revert mistakes.
- **Templates**: Consider starting from a [template](../user-guide/templates.md) and modifying it rather than building from scratch.

---

## What's Next?

| Goal                              | Guide                                           |
| :-------------------------------- | :---------------------------------------------- |
| Understand blocks and connections | [Core Concepts](../user-guide/core-concepts.md) |
| Generate infrastructure code      | [Code Generation](code-generation.md)           |
| Browse architecture patterns      | [Templates](../user-guide/templates.md)         |

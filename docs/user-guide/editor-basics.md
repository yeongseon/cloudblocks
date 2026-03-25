# Editor Basics

> **Audience**: All users | **Status**: V1 Core | **Verified against**: v0.26.0

The CloudBlocks editor is a visual canvas for building cloud architecture diagrams. This page covers the interface layout and common interactions.

---

## Interface Layout

The builder uses a 4-panel layout:

- **Menu Bar** (top) — Access File, Edit, Build, and View menus. Switch between Provider tabs (Azure, AWS, GCP). Manage workspaces.
- **Sidebar Palette** (left) — Resource palette grouped by category. Click or drag items to create resources.
- **Canvas** (center) — The main isometric drawing area where you build your architecture.
- **Inspector Panel** (right) — View and edit details for the selected block. Includes Properties, Code preview, and Connections tabs.
- **Bottom Dock** (bottom) — Monitor system state through Output, Validation, Logs, and Diff tabs.

---

## Common Interactions

| Action             | How                                                                        |
| :----------------- | :------------------------------------------------------------------------- |
| **Place a block**  | Click a resource in the Sidebar Palette, or drag it onto the canvas        |
| **Select a block** | Click on it in the canvas                                                  |
| **Move a block**   | Drag it to a new position                                                  |
| **Connect blocks** | Click an output port on the source, then click an input port on the target |
| **Zoom**           | Scroll with mouse wheel or trackpad                                        |
| **Undo**           | Ctrl+Z (Windows/Linux) or Cmd+Z (macOS)                                    |
| **Redo**           | Ctrl+Shift+Z or Cmd+Shift+Z                                                |
| **Save**           | Ctrl+S or Cmd+S                                                            |

---

## Sidebar Palette

The palette organizes cloud resources into 8 categories:

| Category       | What It Contains                                                                |
| :------------- | :------------------------------------------------------------------------------ |
| **Network**    | VNet, Subnet, NAT Gateway, Public IP, Route Table, Private Endpoint             |
| **Delivery**   | DNS Zone, CDN Profile, Front Door, Application Gateway, Load Balancer, Firewall |
| **Compute**    | Functions, App Service, Container Instances, VM, AKS                            |
| **Data**       | Blob Storage, SQL Database, Cosmos DB                                           |
| **Messaging**  | Queue (Service Bus), Event Hub                                                  |
| **Security**   | Key Vault, Bastion, NSG, Secret Store                                           |
| **Identity**   | Entra ID, Service Principal                                                     |
| **Operations** | Monitoring                                                                      |

Resources that require a Network block on the canvas will appear disabled until you create one.

---

## Inspector Panel

Click any block to open its details in the Inspector Panel:

- **Properties tab** — View block type, category, and cloud resource mapping. Rename the block or perform actions.
- **Code tab** — See a live preview of generated infrastructure code (Experimental).
- **Connections tab** — Review all connections linked to the selected block.

---

## Bottom Dock

The Bottom Dock provides real-time feedback:

- **Output** — Activity log of your actions.
- **Validation** — Rule check results for your architecture.
- **Logs** — System messages and warnings.
- **Diff** — Compare architecture versions.

---

## What's Next?

| Goal                              | Guide                                       |
| :-------------------------------- | :------------------------------------------ |
| Build from a template             | [First Architecture](first-architecture.md) |
| Understand blocks and connections | [Core Concepts](core-concepts.md)           |
| Learn all keyboard shortcuts      | [Keyboard Shortcuts](keyboard-shortcuts.md) |

# Quick Start

Build your first cloud architecture in under 5 minutes. No cloud account required — everything runs in your browser.

---

## 1. Launch CloudBlocks

**Option A — Live Demo (no install)**

Open the live demo at [https://yeongseon.github.io/cloudblocks/](https://yeongseon.github.io/cloudblocks/) in your browser.

**Option B — Run Locally**

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
cd apps/web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 2. Start from a Template

When CloudBlocks opens, you'll see three options on the empty canvas:

| Option | What It Does |
|---|---|
| **Use Template** | Opens the Template Gallery with pre-built architectures |
| **Start from Scratch** | Creates a blank network container on the canvas |
| **Learn How** | Opens guided tutorials for learning cloud patterns |

Click **Use Template** and select **Three-Tier Web Application**. This loads a complete architecture with a gateway, compute node, and database — all pre-wired.

!!! tip
    Templates are fully editable. Use them as a starting point, then customize for your needs.

---

## 3. Explore the Canvas

Your template is now on the canvas. Here's what you see:

- **Containers** (the large rectangular areas) represent network boundaries like VPCs and subnets
- **Nodes** (the smaller elements inside containers) represent cloud resources like VMs, databases, and gateways
- **Connections** (the lines between nodes) represent communication flows

Try these interactions:

- **Drag** a node to reposition it within its container
- **Click** a node to select it and see its details in the bottom panel
- **Scroll** to zoom in and out
- Press **Ctrl+Z** to undo any change

---

## 4. Generate Infrastructure Code

Now turn your visual design into real infrastructure code:

1. Open the menu: **Build → Generate**
2. The Code Preview panel opens showing your architecture as Terraform code
3. Click the **Copy** button to copy the generated code to your clipboard

!!! info "Three output formats"
    CloudBlocks generates code in three formats:

    - **Terraform** (HCL) — Multi-cloud, the default
    - **Bicep** — Azure-native
    - **Pulumi** (TypeScript) — Code-first IaC

    Toggle between formats using the selector in the Code Preview panel.

---

## 5. Save Your Work

CloudBlocks saves your architecture to your browser's local storage automatically. Your work persists across browser sessions.

To create a new workspace or switch between saved workspaces, use the **File** menu.

---

## What's Next?

| Goal | Guide |
|---|---|
| Understand the building blocks | [Core Concepts](core-concepts.md) |
| Build an architecture from scratch | [Create an Architecture](create-architecture.md) |
| Learn about code generation options | [Generate Code](generate-code.md) |
| Explore all available templates | [Use Templates](templates.md) |
| Speed up with keyboard shortcuts | [Keyboard Shortcuts](keyboard-shortcuts.md) |

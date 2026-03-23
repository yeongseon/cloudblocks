# Quick Start

Build your first cloud architecture in under 5 minutes. No cloud account required. Everything runs in your browser.

---

## Step 1 — Launch CloudBlocks

You can use CloudBlocks directly in your browser or run it locally for development.

- **Option A: Live Demo** — Visit [https://yeongseon.github.io/cloudblocks/](https://yeongseon.github.io/cloudblocks/) to start immediately.
- **Option B: Run Locally** — Use these commands to launch a local development server:

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
cd apps/web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

When CloudBlocks opens, you'll see a landing page. Choose a persona (e.g., Developer) to enter the builder.

---

## Step 2 — Start from a Template

When the builder opens with an empty canvas, you'll see the Empty Canvas CTA with three options:

| Option                 | What it does                                              |
| :--------------------- | :-------------------------------------------------------- |
| **Use Template**       | Opens the Template Gallery with 6 pre-built architectures |
| **Start from Scratch** | Creates a VNet (Network) container on the canvas          |
| **Learn How**          | Opens guided learning scenarios                           |

Click **Use Template** and select **Three-Tier Web Application**. This loads a complete architecture with an Application Gateway, VM, SQL Database, and Blob Storage. All components are pre-wired with connections.

---

## Step 3 — Explore the Interface

The builder uses a 4-panel layout designed for professional architecture modeling:

- **Menu Bar** (top) — Access File, Edit, Build, and View menus. Use the Workspaces button to manage projects, switch between Provider tabs (Azure, AWS, GCP), and access the GitHub section.
- **Sidebar Palette** (left) — Contains the resource palette grouped by category (foundation, compute, data, edge, security, messaging, operations). Click or drag items to create resources.
- **Canvas** (center) — The main isometric drawing area where you build and view your architecture.
- **Inspector Panel** (right) — Manage your selected nodes using three tabs:
  - **Properties**: View node details and perform actions.
  - **Code**: See a live preview of the generated IaC.
  - **Connections**: Review related connections for the selected node.
- **Bottom Dock** (bottom) — Monitor system state through four tabs:
  - **Output**: View the activity log.
  - **Validation**: Check rule results for your architecture.
  - **Logs**: Read system messages.
  - **Diff**: Compare architecture versions.

### Common Interactions

- **Drag** a node to reposition it on the canvas.
- **Click** a node to see its details in the Inspector Panel on the right.
- **Scroll** with your mouse or trackpad to zoom in and out.
- Press **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (macOS) to undo your last action.

---

## Step 4 — Generate Infrastructure Code

Turn your visual design into production-ready infrastructure code:

1. Click the **Code** tab in the Inspector Panel on the right side.
2. Alternatively, go to **Build → Generate Code** in the top menu bar.
3. The Code tab displays your architecture as Terraform code by default.
4. Use the format selector to switch between **Terraform**, **Bicep**, or **Pulumi**.
5. Click **Copy** to copy the generated code to your clipboard.

!!! info "Multi-Cloud Output"
CloudBlocks generates valid IaC for multiple providers and tools. You can design once and export to the format that fits your team's workflow.

---

## Step 5 — Save Your Work

Your progress is automatically saved to your browser's local storage.

- Press **Ctrl+S** or **Cmd+S** to save manually.
- Use **File → Save Workspace** from the menu bar.
- To manage multiple architectures, click the **Workspaces** button in the menu bar.

---

## What's Next?

| Goal                             | Guide                                         |
| :------------------------------- | :-------------------------------------------- |
| Learn the core building blocks   | [Core Concepts](core-concepts.md)             |
| Create a custom design           | [Create Architecture](create-architecture.md) |
| Master the code generator        | [Generate Code](generate-code.md)             |
| Browse all architecture patterns | [Templates](templates.md)                     |
| Work faster with keys            | [Keyboard Shortcuts](keyboard-shortcuts.md)   |

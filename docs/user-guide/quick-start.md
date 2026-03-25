# Quick Start

> **Audience**: New users | **Status**: V1 Core | **Verified against**: v0.26.0

Build your first cloud architecture in under 5 minutes. No cloud account required. Everything runs in your browser.

---

## Step 1 — Launch CloudBlocks

You can use CloudBlocks directly in your browser or run it locally.

- **Option A: Live Demo** — Visit [https://yeongseon.github.io/cloudblocks/](https://yeongseon.github.io/cloudblocks/) to start immediately.
- **Option B: Run Locally**:

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

When CloudBlocks opens, you will see a landing page. Choose a persona (e.g., Developer) to enter the builder.

---

## Step 2 — Start from a Template

On the empty canvas, you will see three options:

| Option                 | What it does                                              |
| :--------------------- | :-------------------------------------------------------- |
| **Use Template**       | Opens the Template Gallery with 6 pre-built architectures |
| **Start from Scratch** | Creates a Network (VNet) block on the canvas              |
| **Learn How**          | Opens guided learning scenarios                           |

Click **Use Template** and select **Three-Tier Web Application**. This loads a complete architecture with an Application Gateway, VM, SQL Database, and Blob Storage — all pre-wired with connections.

---

## Step 3 — Explore the Interface

The builder uses a 4-panel layout:

- **Menu Bar** (top) — Access File, Edit, Build, and View menus. Switch between Provider tabs (Azure, AWS, GCP). Manage workspaces.
- **Sidebar Palette** (left) — Resource palette grouped into 8 categories: Network, Delivery, Compute, Data, Messaging, Security, Identity, and Operations. Click or drag items to create resources.
- **Canvas** (center) — The main isometric drawing area where you build your architecture.
- **Inspector Panel** (right) — View and edit details for the selected block:
  - **Properties**: Block details and actions.
  - **Code**: Live preview of generated infrastructure code _(Experimental)_.
  - **Connections**: Related connections for the selected block.
- **Bottom Dock** (bottom) — Monitor system state:
  - **Output**: Activity log.
  - **Validation**: Rule check results.
  - **Logs**: System messages.
  - **Diff**: Compare architecture versions.

### Common Interactions

- **Drag** a block to reposition it on the canvas.
- **Click** a block to see its details in the Inspector Panel.
- **Scroll** to zoom in and out.
- Press **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (macOS) to undo.

---

## Step 4 — Save Your Work

Your progress is automatically saved to your browser's local storage.

- Press **Ctrl+S** or **Cmd+S** to save manually.
- Use **File → Save Workspace** from the menu bar.
- To manage multiple architectures, click the **Workspaces** button in the menu bar.

---

## What's Next?

| Goal                                | Guide                                       |
| :---------------------------------- | :------------------------------------------ |
| Learn the core building blocks      | [Core Concepts](core-concepts.md)           |
| Build from a template step by step  | [First Architecture](first-architecture.md) |
| Learn the editor interface          | [Editor Basics](editor-basics.md)           |
| Browse all architecture patterns    | [Templates](templates.md)                   |
| Work faster with keyboard shortcuts | [Keyboard Shortcuts](keyboard-shortcuts.md) |

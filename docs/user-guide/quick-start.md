# Quick Start

> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.43.0

Build your first cloud architecture in under 5 minutes. No cloud account required. Everything runs in your browser.

!!! tip "Desktop recommended"
    CloudBlocks is optimized for desktop browsers (Chrome, Firefox, Edge). The SVG-based visual editor works best with a mouse and keyboard.

---

## Step 1 — Launch CloudBlocks

You can use CloudBlocks directly in your browser or run it locally.

- **Option A: Live Demo** — Visit [https://yeongseon.github.io/cloudblocks/](https://yeongseon.github.io/cloudblocks/) to start immediately.
- **Option B: Documentation Site** — Browse the full docs at [https://yeongseon.github.io/cloudblocks/docs/](https://yeongseon.github.io/cloudblocks/docs/).
- **Option C: Run Locally**:

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

When CloudBlocks opens, you will see a landing page. Click **Get Started** to enter the builder.

---

## Step 2 — Start from a Template

On the empty canvas, you will see two options:

| Option                          | What it does                                                     |
| :------------------------------ | :--------------------------------------------------------------- |
| **Start Learning**              | Opens the Scenario Gallery with guided architecture patterns     |
| **Practice on Blank Canvas**    | Dismisses the overlay so you can build manually from the sidebar |

Click **Start Learning** and select **Three-Tier Web Application**. This loads a guided scenario with an Application Gateway, VM, SQL Database, and Blob Storage — all pre-wired with connections.

---

## Step 3 — Explore the Interface

The builder uses a 4-panel layout:

- **Menu Bar** (top) — Access File, Edit, Build, and View menus. The provider selector shows Azure (active), AWS, and GCP. Manage workspaces.
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

## Step 4 — Export Starter Code

Once your architecture looks right, export Terraform starter code to see what the design produces:

1. Open **Build → Generate Code** from the menu bar to open the code panel.
2. Click **Generate Code** in the panel to create the Terraform configuration.
3. Review the generated Terraform configuration in the panel.
4. Click **Copy** or **Download All** to save the output.

The exported code is a learning artifact — it shows the real Terraform resources behind each block. You can open it in any editor to study the structure.

!!! tip "Experimental formats"
    Bicep and Pulumi export are also available under Build → Generate Code, marked as experimental.

---

## Step 5 — Save Your Work

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

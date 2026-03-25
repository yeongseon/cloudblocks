# First Architecture from a Template

> **Audience**: New users | **Status**: V1 Core | **Verified against**: v0.26.0

Build your first cloud architecture in 5 minutes using a built-in template. No cloud account or backend required — everything runs in your browser.

---

## Step 1 — Open CloudBlocks

- **Live Demo**: Visit [https://yeongseon.github.io/cloudblocks/](https://yeongseon.github.io/cloudblocks/)
- **Local**: Clone and run (see [Quick Start](quick-start.md))

When CloudBlocks opens, choose a persona (e.g., Developer) to enter the builder.

---

## Step 2 — Load a Template

On the empty canvas, you will see three options:

| Option                 | What it does                                              |
| :--------------------- | :-------------------------------------------------------- |
| **Use Template**       | Opens the Template Gallery with 6 pre-built architectures |
| **Start from Scratch** | Creates a blank canvas with a Network block               |
| **Learn How**          | Opens guided learning scenarios                           |

Click **Use Template** and select **Three-Tier Web Application**.

This loads a complete architecture with:

- An Application Gateway (Delivery)
- A Virtual Machine (Compute)
- A SQL Database (Data)
- A Blob Storage (Data)

All components are pre-wired with connections.

---

## Step 3 — Explore What You Got

Take a moment to understand the loaded template:

- **Click** any block to see its details in the Inspector Panel (right side).
- **Scroll** to zoom in and out on the canvas.
- Notice how blocks are organized inside Network and Subnet containers.

The template follows a standard three-tier pattern: traffic enters through the Delivery layer, reaches the Compute layer, and stores data in the Data layer.

---

## Step 4 — Customize the Template

Templates are starting points, not fixed designs. Try these modifications:

1. **Add a resource**: Open the Sidebar Palette (left) and drag a new resource onto a subnet.
2. **Create a connection**: Click an output port on one block, then click an input port on another.
3. **Rename a block**: Click a block, then edit its name in the Inspector Panel.
4. **Move blocks**: Drag any block to reposition it on the canvas.

Press **Ctrl+Z** / **Cmd+Z** to undo any change.

---

## Step 5 — Validate Your Design

CloudBlocks validates your architecture in real-time. You can also run a manual check:

1. Go to **Build → Validate Architecture** in the menu bar.
2. Check results in the **Validation** tab in the Bottom Dock.
3. Fix any errors shown in the list.

---

## Step 6 — Save Your Work

Your progress is automatically saved to your browser's local storage.

- Press **Ctrl+S** / **Cmd+S** to save manually.
- Use **File → Save Workspace** from the menu bar.

---

## What's Next?

| Goal                             | Guide                                            |
| :------------------------------- | :----------------------------------------------- |
| Understand the building blocks   | [Core Concepts](core-concepts.md)                |
| Browse all architecture patterns | [Templates](templates.md)                        |
| Build from a blank canvas        | [Blank Canvas Mode](../advanced/blank-canvas.md) |
| Learn keyboard shortcuts         | [Keyboard Shortcuts](keyboard-shortcuts.md)      |

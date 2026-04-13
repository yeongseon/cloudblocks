# Workspaces & Save/Load

> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.43.0

Workspaces let you keep separate learning exercises, template variations, and practice architectures. All data is stored in your browser's local storage — no account or backend required.

!!! tip "Good learning setup"
    Create one workspace per template or scenario so you can compare versions without losing the original example.

---

## Managing Workspaces

Click the **Workspaces** button in the menu bar to:

- **Create** a new workspace for a separate architecture project.
- **Switch** between existing workspaces.
- **Rename** workspaces to keep them organized.
- **Delete** workspaces you no longer need.

Each workspace stores its own architecture model, including all blocks, connections, and layout positions.

---

## Saving Your Work

CloudBlocks automatically saves your progress to local storage. You can also save manually:

- Press **Ctrl+S** (Windows/Linux) or **Cmd+S** (macOS).
- Use **File → Save Workspace** from the menu bar.

---

## Import & Export

- **Export**: Use **File → Export** to download your architecture as a JSON file.
- **Import**: Use **File → Import** to load a previously exported architecture.

This lets you share architectures between browsers or back up your work.

---

## Storage Details

- All data is stored in your browser's **localStorage**.
- Data persists across browser sessions but is specific to the browser and domain.
- Clearing browser data will remove all saved workspaces.

!!! warning "Browser Storage Limits"
    Most browsers limit localStorage to 5–10 MB. For large architectures, consider exporting regularly as backup.

---

## GitHub Sync _(Backend Required)_

!!! note "Advanced Feature"
    GitHub sync requires the optional Python backend. See [Setup Guide](../guides/TUTORIALS.md) for backend installation.

With the backend running, you can:

- Connect a workspace to a GitHub repository.
- Sync your designs to a repo.
- Generate Pull Requests from your architecture changes.

---

## What's Next?

| Goal                           | Guide                                       |
| :----------------------------- | :------------------------------------------ |
| Build your first architecture  | [First Architecture](first-architecture.md) |
| Learn the editor interface     | [Editor Basics](editor-basics.md)           |
| Understand the building blocks | [Core Concepts](core-concepts.md)           |

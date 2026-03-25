# Validation

> **Audience**: All users | **Status**: V1 Core | **Verified against**: v0.26.0

CloudBlocks validates your architecture in real-time as you build. The validation engine checks placement rules, connection semantics, and structural constraints to ensure your design follows cloud best practices.

---

## Real-Time Validation

As you place resources and create connections, CloudBlocks automatically checks:

- **Placement rules** — Resources must be placed in valid containers (e.g., VMs go inside subnets, subnets go inside networks).
- **Connection rules** — Only valid connection flows are allowed (e.g., Compute → Data, Delivery → Compute).
- **Structural rules** — Architectures must have at least one network, and resources cannot exist outside containers.

Errors appear instantly as visual indicators on the canvas.

---

## Manual Validation

Run a full architecture audit at any time:

1. Go to **Build → Validate Architecture** in the menu bar.
2. View detailed results in the **Validation** tab in the Bottom Dock.
3. Each error includes the affected block and a description of the issue.

---

## Connection Rules

Connections follow real-world traffic patterns. See [Core Concepts — Connections](core-concepts.md#connections) for the full connection flow table.

Key constraints:

- **Receiver-only categories**: Data, Security, Operations, Identity, and Network can only receive connections — they cannot initiate them.
- **Allowed semantics**: `http`, `event`, and `data` — each connection flow allows specific semantic types.

---

## What's Next?

| Goal                         | Guide                             |
| :--------------------------- | :-------------------------------- |
| Understand connection rules  | [Core Concepts](core-concepts.md) |
| Browse architecture patterns | [Templates](templates.md)         |
| Learn the editor interface   | [Editor Basics](editor-basics.md) |

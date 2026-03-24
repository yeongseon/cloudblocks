# Launch Packet

> Covers issue #477.  
> Ready-to-use assets for announcing CloudBlocks on promotion channels.

---

## 1. Project Summary (3-Line Intro)

> **CloudBlocks** is an open-source preset-driven visual architecture design tool — design cloud infrastructure by placing blocks, validate against real-world rules, and preview across Azure, AWS, and GCP.  
> Design cloud architectures by placing blocks, connect components, validate in real time, and optionally generate Terraform, Bicep, or Pulumi (Experimental).  
> No YAML. No HCL. Just place, connect, validate, preview.

---

## 2. Key Links

| Asset                 | URL                                                      |
| --------------------- | -------------------------------------------------------- |
| **Live Demo**         | https://yeongseon.github.io/cloudblocks/                 |
| **GitHub Repository** | https://github.com/yeongseon/cloudblocks                 |
| **Documentation**     | https://yeongseon.github.io/cloudblocks/docs/            |
| **Latest Release**    | https://github.com/yeongseon/cloudblocks/releases/latest |

---

## 3. Feature Highlights (Bullet Form)

- **Visual architecture builder** — Modular container blocks (boundaries) + resource blocks with isometric 2.5D rendering
- **Preset templates** — Start from 6 built-in architecture patterns (three-tier, serverless, event pipeline)
- **Real-time validation** — Rule engine validates placement and connections as you build
- **Multi-cloud preview** — Visual preview for Azure, AWS, and GCP (Azure depth-first)
- **7 resource categories** — Network, Security, Edge, Compute, Data, Messaging, Operations
- **Learning mode** — Guided scenarios to learn cloud architecture patterns
- **Code generation** _(Experimental)_ — Export to Terraform, Bicep, or Pulumi
- **GitHub integration** _(Backend required)_ — OAuth login, repo sync, PR creation
- **Templates** — Pre-built patterns (three-tier web app, serverless API, event-driven pipeline)
- **Frontend-only mode** — Works instantly in the browser without backend setup

---

## 4. Screenshot / GIF Suggestions

Capture the following for promotion materials:

| Asset               | Description                                                       | Suggested Dimensions |
| ------------------- | ----------------------------------------------------------------- | -------------------- |
| Hero screenshot     | Full canvas with a three-tier architecture                        | 1280 x 720           |
| Place & connect GIF | Drag block into a container block, create connection (5-10s loop) | 800 x 450            |
| Code generation GIF | Click Generate → show Terraform output (3-5s)                     | 800 x 450            |
| Template load GIF   | Select template → auto-populate canvas (3-5s)                     | 800 x 450            |

**How to capture**:

1. Open the live demo
2. Load the "Three-Tier Web App" template
3. Use a screen recorder (e.g., macOS Cmd+Shift+5, or Kap for GIF)
4. Crop to the canvas area

> Note: A hero screenshot should be captured and added before launch.

---

## 5. Social Copy Templates

### Twitter / X (280 chars)

```
CloudBlocks — design cloud architecture visually, generate Terraform/Bicep/Pulumi instantly.

No YAML. No HCL. Place, connect, validate, generate.

Open source, runs in your browser.

Try it: https://yeongseon.github.io/cloudblocks/
```

### Reddit / Hacker News

```
Title: CloudBlocks — Open-source visual architecture design tool with multi-cloud preview

CloudBlocks lets you design cloud infrastructure by placing blocks within container blocks
(using a block-based composition model), then preview across Azure, AWS, and GCP. Code generation to Terraform, Bicep, or Pulumi is available as an Experimental feature.

It runs entirely in the browser — no backend required for the core builder.

Features:
- 7 resource categories covering network, compute, data, messaging, etc.
- Real-time validation against placement and connection rules
- Learning mode with guided architecture scenarios
- GitHub integration for repo sync and PR creation

Live demo: https://yeongseon.github.io/cloudblocks/
GitHub: https://github.com/yeongseon/cloudblocks
```

### LinkedIn (Professional)

```
Excited to share CloudBlocks — an open-source visual architecture design tool that
lets you model cloud infrastructure visually with multi-cloud preview.

Instead of writing HCL or Bicep by hand, you design your architecture
visually (like assembling building blocks), preview across Azure, AWS, and GCP,
and optionally generate Terraform, Bicep, or Pulumi code.

Key capabilities:
• Visual 2.5D isometric builder with drag-and-drop
• Preset templates for common architecture patterns
• Real-time validation engine with cloud-aware rules
• Multi-cloud preview (Azure, AWS, GCP)
• Code generation: Terraform + Bicep + Pulumi (Experimental)
• Learning mode for onboarding cloud architecture patterns
Try it now (no signup): https://yeongseon.github.io/cloudblocks/

#CloudArchitecture #VisualDesign #MultiCloud #OpenSource
```

---

## 6. Known Limitations (Transparency)

Include these in any launch communication to set expectations:

- **Azure-first**: Resource coverage and code generation are optimized for Azure. AWS/GCP are available in preview mode.
- **Code generation is Experimental**: Generates starter code, not production-grade infrastructure.
- **Frontend-only demo**: GitHub integration and AI features require the backend API (not deployed in the demo).
- **Single-user**: No real-time collaboration or multi-user editing (planned for future milestones).

---

## 7. Technical Facts (For Dev Audiences)

| Metric             | Value                          |
| ------------------ | ------------------------------ |
| Frontend framework | React 19 + TypeScript 5.9      |
| Rendering          | Pure SVG (no Canvas/WebGL)     |
| State management   | Zustand with zundo (undo/redo) |
| Backend            | FastAPI (Python 3.10+)         |
| Test count         | 2,076                          |
| Branch coverage    | ≥ 90%                          |
| License            | Apache 2.0                     |

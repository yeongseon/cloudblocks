# Launch Packet

> Covers issue #477.  
> Ready-to-use assets for announcing CloudBlocks on promotion channels.

---

## 1. Project Summary (3-Line Intro)

> **CloudBlocks** is an open-source architecture compiler that turns visual infrastructure designs into Terraform, Bicep, and Pulumi code — all from the browser.  
> Design cloud architectures by placing blocks, connect components, validate against real-world rules, and generate production-ready IaC.  
> No YAML. No HCL. Just place, connect, validate, generate.

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
- **Architecture compiler** — Generate Terraform, Bicep, or Pulumi from visual designs
- **Real-time validation** — Rule engine validates placement and connections as you build
- **7 resource categories** — Network, Security, Edge, Compute, Data, Messaging, Operations
- **Learning mode** — Guided scenarios to learn cloud architecture patterns
- **GitHub integration** — OAuth login, repo sync, PR creation, architecture diff
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
Title: CloudBlocks — Open-source visual architecture compiler (Terraform, Bicep, Pulumi)

CloudBlocks lets you design cloud infrastructure by placing blocks within container blocks
(using a block-based composition model), then compiles your design into Terraform, Bicep, or Pulumi code.

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
Excited to share CloudBlocks — an open-source architecture compiler that
converts visual infrastructure designs into infrastructure-as-code.

Instead of writing HCL or Bicep by hand, you design your architecture
visually (like assembling building blocks), and CloudBlocks generates
Terraform, Bicep, or Pulumi code automatically.

Key capabilities:
• Visual 2.5D isometric builder with drag-and-drop
• Real-time validation engine with cloud-aware rules
• Multi-generator output (Terraform + Bicep + Pulumi)
• GitHub integration for version control and PR workflows
• Learning mode for onboarding cloud architecture patterns

Try it now (no signup): https://yeongseon.github.io/cloudblocks/

#CloudArchitecture #InfrastructureAsCode #Terraform #OpenSource
```

---

## 6. Known Limitations (Transparency)

Include these in any launch communication to set expectations:

- **Azure-first**: Code generation is optimized for Azure. AWS/GCP provider adapters are scaffolded but not production-ready.
- **Frontend-only demo**: GitHub integration and AI features require the backend API (not deployed in the demo).
- **Desktop-optimized**: Canvas interaction works best on desktop browsers. Mobile is informational only.
- **Single-user**: No real-time collaboration or multi-user editing (planned for future milestones).

---

## 7. Technical Facts (For Dev Audiences)

| Metric             | Value                          |
| ------------------ | ------------------------------ |
| Frontend framework | React 19 + TypeScript 5.9      |
| Rendering          | Pure SVG (no Canvas/WebGL)     |
| State management   | Zustand with zundo (undo/redo) |
| Backend            | FastAPI (Python 3.10+)         |
| Test count         | 1900+ frontend tests           |
| Branch coverage    | ≥ 90%                          |
| License            | Apache 2.0                     |

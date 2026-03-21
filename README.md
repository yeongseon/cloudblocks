# CloudBlocks

> Learn Cloud Architecture by Building It

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml/badge.svg)](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/yeongseon/cloudblocks?label=version)](https://github.com/yeongseon/cloudblocks/releases/latest)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://yeongseon.github.io/cloudblocks/)

---

## Overview

CloudBlocks is a visual platform for learning and designing cloud architecture
by composing infrastructure as interactive building blocks.

> **[Try the Live Demo](https://yeongseon.github.io/cloudblocks/)** — Visual builder, code generation, and templates work instantly.

---

## Core Idea

> Everything is a resource node

All infrastructure is represented in a unified node structure:

- **ContainerNode** — Logical groupings (global, edge, region, zone, subnet)
- **LeafNode** — Actual cloud resources (7 categories: network, security, edge, compute, data, messaging, operations)

```typescript
nodes: ResourceNode[]   // ContainerNode | LeafNode
connections: Connection[]
```

Containers nest. Resources sit inside containers. Connections wire resources together.
The result is an architecture model that compiles directly to infrastructure-as-code.

---

## Agentic Development

This project is developed using **agentic coding workflows** —
AI agents handle implementation, code review, testing, and documentation
under human direction.

During early milestones, rapid iteration and exploratory commits produced
noisy history. The current architecture represents a stabilized,
production-quality system refined through 19 milestone cycles.

> Focus on the current structure rather than early commits.

---

## Current Status

| Area | Status |
|------|--------|
| Unified node model (ResourceNode) | Complete (v0.19.0) |
| Visual builder + validation engine | Complete |
| Multi-generator (Terraform, Bicep, Pulumi) | Complete |
| GitHub integration (OAuth, sync, PR) | Complete |
| Learning mode (guided scenarios) | Complete |
| Resource category UI migration | In progress (Milestone 20) |

---

## Quick Start

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to start building.

---

## Monorepo Layout

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@cloudblocks/web` | Frontend SPA — editor, validation, code generation |
| `apps/api` | — | FastAPI backend — GitHub OAuth, AI proxy, workspace sync |
| `packages/schema` | `@cloudblocks/schema` | Architecture model types, enums, JSON Schema |
| `packages/cloudblocks-domain` | `@cloudblocks/domain` | Domain helpers — hierarchy rules, labels, validation |

---

## Roadmap

| Version | Milestone | Status |
|---------|-----------|--------|
| v0.19.0 | Resource Category Realignment + Cleanup | ✅ |
| v0.20.0 | Resource Category UI + Pipeline Migration | |
| v0.21.0 | Azure v1 Resource Catalog | |
| v0.22.0 | Generator UX Abstraction | |
| v0.23.0 | Onboarding + Demo Flow ← **Community Launch** | |

See [CHANGELOG.md](CHANGELOG.md) for release details and [full roadmap](docs/concept/ROADMAP.md) for milestone breakdown.

---

## Documentation

- [Design & Architecture](./DESIGN.md)
- [Getting Started](docs/guides/TUTORIALS.md)
- [Domain Model](docs/model/DOMAIN_MODEL.md)
- [Roadmap](docs/concept/ROADMAP.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## Vision

> Make cloud architecture as intuitive as building with Lego

---

## Contributing

Contributions are welcome.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

---

## License

[Apache 2.0](LICENSE)

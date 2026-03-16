# Contributing to CloudBlocks

Thank you for your interest in contributing to CloudBlocks! This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Architecture Decision Records](#architecture-decision-records)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming, inclusive environment.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (enforced — npm/yarn will be rejected)
- **Python** >= 3.11 (for backend, optional in Milestone 1)
- **Git**

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks

# Install dependencies
pnpm install

# Start the frontend dev server
cd apps/web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to verify the app is running.

---

## Development Setup

### Frontend (Required)

```bash
# Development server with hot reload
pnpm dev

# Type check (strict mode — must pass before submitting)
cd apps/web && npx tsc -b

# Build
cd apps/web && pnpm build

# Lint
pnpm lint
```

### Backend (Optional — scaffolded, not required for Milestone 1)

```bash
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Using the Makefile

Common tasks are available via `make`:

```bash
make help        # Show all available commands
make install     # Install all dependencies (frontend + backend)
make dev         # Start both frontend and backend
make build       # Build frontend
make lint        # Run linters
make test        # Run backend tests
```

---

## Project Structure

```
cloudblocks/
├── apps/
│   ├── web/              # React + React Three Fiber frontend (FSD architecture)
│   └── api/              # Python FastAPI backend (scaffolded, Milestone 5+)
├── packages/             # Shared packages (scaffolded)
├── docs/                 # Project documentation
│   ├── concept/          # PRD, Architecture, Roadmap
│   ├── model/            # Domain model, schema specs
│   ├── engine/           # Generator, rules, templates, provider
│   ├── guides/           # Tutorials, deployment, API spec
│   ├── system/           # Versioning, architecture review
│   └── adr/              # Architecture Decision Records
├── examples/             # Example architecture READMEs
├── infra/                # Deployment scaffolds
└── scripts/              # Dev, build, deploy scripts
```

### Frontend Architecture (Feature-Sliced Design)

The frontend follows [Feature-Sliced Design](https://feature-sliced.design/) (FSD):

```
apps/web/src/
├── app/                 # App shell, providers, routing
├── shared/              # Types, utils, storage (used everywhere)
│   ├── types/           # Domain types — CANONICAL source for Milestone 1
│   └── utils/           # ID generation, storage operations
├── entities/            # Domain entities (store, block, plate, connection)
├── features/            # Feature modules (validate/)
└── widgets/             # Composite UI widgets (toolbar, palette, panels, scene)
```

**Key rule**: Dependencies flow downward only: `widgets → features → entities → shared`. Never import upward.

---

## Making Changes

### 1. Find or Create an Issue

- Check [existing issues](https://github.com/yeongseon/cloudblocks/issues) first
- For new features, open an issue to discuss before implementing
- Bug fixes can go directly to a PR with a clear description

### 2. Create a Branch

```bash
git checkout -b feature/your-feature    # New feature
git checkout -b fix/issue-description   # Bug fix
git checkout -b docs/what-changed       # Documentation
```

### 3. Make Your Changes

- Keep changes focused — one logical change per PR
- Follow existing code patterns (see [Coding Standards](#coding-standards))
- Update documentation if behavior changes

### 4. Verify Before Submitting

```bash
# MUST pass before submitting
cd apps/web && npx tsc -b        # TypeScript strict mode
cd apps/web && npx vite build    # Production build
pnpm lint                        # Linting
```

---

## Coding Standards

### TypeScript

- **Strict mode** is enforced (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports
- **`erasableSyntaxOnly: true`** — no `enum`, use union types instead
- **Never** use `as any`, `@ts-ignore`, or `@ts-expect-error`
- **Never** use empty catch blocks (`catch(e) {}`)

### React + Three.js

- React Three Fiber `<line>` conflicts with SVG — use `<primitive object={new THREE.Line(...)} />` instead
- The rendering layer is **projection only** — the editing model is 2D coordinates with containment hierarchy
- State management uses Zustand (not Redux, not Context)

### Domain Model

- Use canonical field names from `apps/web/src/shared/types/index.ts`:
  - `category` (not `type`) for blocks
  - `placementId` (not `plateId`) for block placement
  - `sourceId` / `targetId` (not `source` / `target`) for connections
  - `architecture` (singular, not `architectures[]`) in workspace
- Connection direction follows the **initiator model**: `internet → gateway → compute → database/storage`
- Database and Storage are **receiver-only** — they never initiate connections

### Commit Messages

Write clear, descriptive commit messages:

```
Add drag-and-drop block repositioning      # Feature
Fix connection validation for gateway       # Bug fix
Update DOMAIN_MODEL.md with connection rules # Documentation
Refactor plate rendering to use shared utils # Refactoring
```

---

## Documentation

### When to Update Docs

- **New feature** → Update relevant docs (PRD, ARCHITECTURE, TUTORIALS)
- **Changed behavior** → Update DOMAIN_MODEL.md and affected docs
- **New field/type** → Update both `index.ts` (source of truth) and DOMAIN_MODEL.md

### Documentation Rules

1. **Milestone 1 documents must match code exactly** — verify against canonical source files
2. **Future features must be labeled** with version markers (`> **Milestone 6+**: ...`)
3. **Field names must match** `DOMAIN_MODEL.md` / `index.ts` — never invent your own
4. **ROADMAP.md is canonical** for version timelines
5. **DOMAIN_MODEL.md is canonical** for model specification
6. **generator.md is canonical** for code generation pipeline

See [VERSIONING.md](docs/system/VERSIONING.md) for the full documentation layering strategy.

### Documentation PR Checklist

- [ ] Field names match canonical types (`placementId` not `plateId`, `category` not `type`)
- [ ] Connection rules follow initiator model (database/storage are receiver-only)
- [ ] Connection type is `dataflow` (not `network`/`event`) unless labeled Milestone 6+
- [ ] `Workspace.architecture` is singular (not `architectures[]`) in Milestone 1 context
- [ ] Future features have explicit version labels
- [ ] Cross-references use correct paths (docs are in subdirectories)

---

## Pull Request Process

### PR Requirements

1. **TypeScript strict mode passes** (`tsc -b` with zero errors)
2. **Production build succeeds** (`vite build`)
3. **Linting passes** (`eslint`)
4. **No type suppression** (`as any`, `@ts-ignore`, etc.)
5. **Changes are focused** — one logical change per PR

### PR Description Template

```markdown
## Summary

Brief description of what this PR does and why.

## Changes

- List of specific changes

## Verification

- [ ] `tsc -b` passes
- [ ] `vite build` succeeds
- [ ] Linting clean
- [ ] Docs updated (if applicable)
```

### Review Process

1. Submit PR against `main`
2. Automated checks must pass
3. At least one maintainer review required
4. Address review feedback
5. Squash and merge

---

## Architecture Decision Records

Major architectural decisions are documented in `docs/adr/`. Each ADR captures the context, decision, and consequences of a significant technical choice.

### When to Write an ADR

- Choosing a framework, library, or tool
- Defining a system boundary or integration pattern
- Establishing a convention that affects multiple files
- Making a trade-off between competing approaches

### ADR Format

See existing ADRs in `docs/adr/` for the template. Each ADR follows:

1. **Title** — Short description of the decision
2. **Status** — Accepted, Superseded, or Deprecated
3. **Context** — Why this decision was needed
4. **Decision** — What was decided
5. **Consequences** — Trade-offs and implications

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/yeongseon/cloudblocks/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yeongseon/cloudblocks/discussions)
- **Documentation**: Start with [README.md](README.md), then explore `docs/`

---

## License

By contributing to CloudBlocks, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

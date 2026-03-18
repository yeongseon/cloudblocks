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
- **Python** >= 3.11 (for backend)
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

### Backend (Required for GitHub integration)

```bash
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Auth implementation notes (current):
- Session auth is cookie-based (`cb_session`, httpOnly), not JWT-based
- OAuth state uses encrypted httpOnly `cb_oauth` cookie
- Frontend/backend auth calls must use credentialed requests (`credentials: 'include'`)

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
│   ├── web/              # React frontend (FSD architecture)
│   └── api/              # Python FastAPI backend
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
│   └── validation/      # Validation engine (placement + connection rules)
├── features/            # Feature modules
└── widgets/             # Composite UI widgets (toolbar, palette, panels, scene)
```

**Key rule**: Dependencies flow downward only: `widgets → features → entities → shared`. Never import upward.

---

## Making Changes

CloudBlocks uses two planning paths:

- **Roadmap implementation work**: `Milestone -> Epic -> Sub-issue -> Branch -> PR`
- **Small fixes, documentation, and maintenance**: `Issue -> Branch -> PR`

Current roadmap work is tracked under [open milestones](https://github.com/yeongseon/cloudblocks/milestones). Each milestone contains one or more Epic issues that group related sub-issues.

### Labeling Rules

Apply labels before starting work.

#### 1) Size / tracking labels

- `epic` — required for Epic tracking issues only

#### 2) Type labels

Use exactly one type label for every non-Epic issue:

- `enhancement` — feature work
- `bug` — defect fixes
- `testing` — test coverage, regression tests, test infrastructure
- `documentation` — docs-only changes

#### 3) Domain labels

Use one or more domain labels for implementation work:

- `frontend`
- `backend`
- `security`
- `auth`
- `infrastructure`
- `ux`
- `design-system`
- `domain-model`
- `cloud-provider`

Documentation issues may omit domain labels when the change is cross-cutting. If the docs clearly belong to one area, add the matching domain label.

#### 4) Required label combinations

| Issue kind | Required labels |
|---|---|
| Epic | `epic` + 1 or more domain labels |
| Sub-issue (feature) | `enhancement` + 1 or more domain labels |
| Sub-issue (bug) | `bug` + 1 or more domain labels |
| Sub-issue (testing) | `testing` + 1 or more domain labels |
| Documentation | `documentation` + optional domain label(s) |
| Small fix / maintenance | `bug` or `enhancement` + 1 or more domain labels |

### Roadmap Implementation Workflow

Use the full workflow for any feature that spans multiple PRs, multiple domains, or a named roadmap phase.

1. **Create or reuse a milestone**
   - Create a milestone when the work is a named phase or release, spans multiple Epics, or needs shared tracking across multiple implementation issues.
   - Milestone names use the format `Phase N - Name`.
   - Reuse an existing open milestone when the work clearly belongs to it.

2. **Create an Epic issue**
   - Use the title format `[Epic] <feature area>`.
   - Assign the Epic to the milestone.
   - Apply the `epic` label plus one or more domain labels.
   - Do not apply a type label to an Epic.
   - The Epic body must use this structure:

   ```md
   ## Overview

   ## Problems Solved
   | Problem | Why it matters |
   |---|---|
   | ... | ... |

   ## Architecture

   ## Sub-Issues
   - [ ] #123
   - [ ] #124

   ## Dependencies

   ## Constraints

   ## Branch Name
   `feature/<short-description>`
   ```

3. **Create sub-issues from the Epic**
   - Break the Epic into focused implementation units that fit in a single branch and a single PR.
   - A good sub-issue usually covers one entity, one route, one UI slice, one provider integration, one migration, or one test suite.
   - Assign each sub-issue to the same milestone and link it from the Epic checklist.
   - Apply exactly one type label and one or more domain labels.
   - Do not apply the `epic` label to sub-issues.

4. **Sync `main` before starting work**
   - Always update local `main` before creating or refreshing a branch:

   ```bash
   git checkout main
   git pull --ff-only origin main
   ```

5. **Create a branch from `main`**
   - `feature/description` — new features
   - `fix/description` — bug fixes
   - `docs/description` — documentation changes

6. **Implement and open a PR**
   - Work on one sub-issue per branch.
   - Open one PR per branch.
   - Reference the issue in the PR description with `Closes #<issue-number>`.
   - Keep each PR focused on one logical change.

7. **Merge requirements**
   - CI must pass before merge.
   - Merge via squash-and-merge to `main`.

### Small Changes Workflow

Small bug fixes, documentation updates, and maintenance tasks that do not belong to a milestone may use the simpler `Issue -> Branch -> PR` flow.

1. **Create or find an issue**
   - Check existing issues first.
   - Every PR must reference an issue. Open an issue before starting work.

2. **Apply labels**
   - Use exactly one type label.
   - Add one or more domain labels for implementation work.
   - Documentation issues may omit domain labels when the scope is cross-cutting.

3. **Sync `main`**
   - Always update local `main` first:

   ```bash
   git checkout main
   git pull --ff-only origin main
   ```

4. **Create a branch**
   - `feature/description` — new features
   - `fix/description` — bug fixes
   - `docs/description` — documentation changes

5. **Implement, verify, and open a PR**
   - Keep changes focused: one logical change per PR.
   - Reference the issue in the PR description with `Closes #<issue-number>`.
   - CI must pass before merge.
   - Merge via squash-and-merge to `main`.

### Branch Strategy

`main` branch has the following protections:

- Required status checks must pass before merge
- Force pushes are not allowed
- Branch deletion is not allowed
- Admin enforcement enabled (no bypassing)

### Verify Before Submitting

```bash
pnpm build
pnpm lint
```

---

## Coding Standards

### TypeScript

- **Strict mode** is enforced (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports
- **`erasableSyntaxOnly: true`** — no `enum`, use union types instead
- **Never** use `as any`, `@ts-ignore`, or `@ts-expect-error`
- **Never** use empty catch blocks (`catch(e) {}`)

### React + SVG Rendering

- The rendering layer uses SVG sprites with CSS transforms for 2.5D isometric projection
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
- [ ] Connection types are `dataflow`, `http`, `internal`, `data`, `async`
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

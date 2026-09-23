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
- **Python** >= 3.10 (for backend)
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

### Terminology

- **Now / Next / Later** = current work, bounded near-term queue, and product direction.
- **Milestone / Phase** = optional grouping or historical reference, never a release trigger.

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
│   ├── design/           # Visual specs, security, release gates
│   ├── api/              # API specification
│   ├── guides/           # Tutorials, deployment
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
│   ├── types/           # App types; canonical model lives in packages/schema
│   └── utils/           # ID generation, storage operations
├── entities/            # Domain entities (store, blocks, connections)
│   └── validation/      # Validation engine (placement + connection rules)
├── features/            # Feature modules
└── widgets/             # Composite UI widgets (toolbar, palette, panels, scene)
```

**Key rule**: Dependencies flow downward only: `widgets → features → entities → shared`. Never import upward.

---

## Making Changes

Use `Issue -> Branch -> PR` for all work. Milestones and Epics are optional aids for genuinely related work, not prerequisites or release units. See [ADR-0019](docs/adr/0019-decouple-versioning-from-milestones.md).

### Re-entry Checklist

Start each development burst with this short check, not a full repository audit:

1. Read [README.md](README.md) and the [V1 Product Contract](docs/concept/V1_PRODUCT_CONTRACT.md).
2. Check the working tree, sync a clean `main`, install with `pnpm install --frozen-lockfile`, then run `pnpm dev` and relevant tests. Use `pnpm test` for frontend/packages and `python3 -m pytest apps/api` for backend work.
3. Review open PRs and issues (`gh pr list`, `gh issue list`); identify failing CI or unfinished work before starting something new.
4. Pick one **Now** item, check its assignee, and assign yourself if unassigned. Do not take another contributor's work.
5. Clear stale administrative noise only where completion is verified; timebox housekeeping so the burst produces learner value.

### Planning Buckets

- **Now**: at most 3 active items; select one to work on at a time.
- **Next**: at most 10 concrete queued items. Promote one when Now has room.
- **Later**: narrative in [ROADMAP.md](docs/concept/ROADMAP.md), not a numbered milestone ladder.

Record Now/Next selections in a small issue checklist or project view; do not add a new management system just to hold the buckets. A completed milestone does not imply a version bump.

### Labeling Rules

Apply labels before starting work.

#### 1) Size / tracking labels

- `epic` — required for Epic tracking issues only
- `size/S` — Small: 1–2 files, < 1 hour
- `size/M` — Medium: 3–5 files, 1–3 hours
- `size/L` — Large: 6–10 files, 3–8 hours
- `size/XL` — Extra Large: 10+ files, 8+ hours

Every non-Epic issue should have exactly one `size/*` label. Assign it when the issue is created.

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

| Issue kind              | Required labels                                  |
| ----------------------- | ------------------------------------------------ |
| Epic                    | `epic` + 1 or more domain labels                 |
| Sub-issue (feature)     | `enhancement` + 1 or more domain labels          |
| Sub-issue (bug)         | `bug` + 1 or more domain labels                  |
| Sub-issue (testing)     | `testing` + 1 or more domain labels              |
| Documentation           | `documentation` + optional domain label(s)       |
| Small fix / maintenance | `bug` or `enhancement` + 1 or more domain labels |

### Issue-to-PR Workflow

Keep one logical change per PR. Split larger work into linked issues only when it helps execution.

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
   - `feat/<issue>-description` — new features
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
  - `from` / `to` endpoint IDs (not `source` / `target`) for connections
  - `architecture` (singular, not `architectures[]`) in workspace
- Connection direction follows the **initiator model**: `internet → gateway → compute → database/storage`
- Database and Storage are **receiver-only** — they never initiate connections

### Commit Messages

Write clear, descriptive commit messages:

```
feat(web): add drag-and-drop block repositioning
fix(web): correct gateway connection validation
docs(model): update connection rules
refactor(web): share container block rendering helpers
```

---

## Documentation

### When to Update Docs

- **New feature** → Update relevant docs (PRD, ARCHITECTURE, TUTORIALS)
- **Changed behavior** → Update DOMAIN_MODEL.md and affected docs
- **New field/type** → Update both `index.ts` (source of truth) and DOMAIN_MODEL.md

### Documentation Rules

1. **Implementation documents must match code exactly** — verify against canonical source files
2. **Future features must be labeled** explicitly (`> **Future (V2+)**: ...`)
3. **Field names must match** `DOMAIN_MODEL.md` / `index.ts` — never invent your own
4. **ROADMAP.md is canonical** for version timelines
5. **DOMAIN_MODEL.md is canonical** for model specification
6. **generator.md is canonical** for code generation pipeline

### Documentation Versioning & Layering Policy

When docs mix implemented behavior and future design, use these rules:

1. **Implementation docs must match code**
   - Verify claims against canonical source files before merging.
2. **Future concepts must be explicitly labeled**
   - Use explicit future markers for non-implemented features (for example: `> **Future (V2+)**: ...`).
3. **ROADMAP is the canonical timeline**
   - Product direction and capability status are defined in `docs/concept/ROADMAP.md`; release history lives in `CHANGELOG.md`.
4. **One concept, one canonical owner**
   - `DOMAIN_MODEL.md` owns domain model semantics.
   - `generator.md` owns generation pipeline semantics.
   - `ROADMAP.md` owns timeline semantics.
5. **Canonical source wins on conflicts**
   - If two docs disagree, update the non-canonical doc to match the canonical source.

### Documentation Lifecycle Policy

Status labels and meanings must stay consistent with the Document Ownership table in `docs/README.md`.

| Status                      | Meaning                                         | Handling rule                                                          |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| **Canonical**               | Source of truth for active behavior             | Update in place when behavior changes; other docs must align to it     |
| **Canonical (v2.0 Target)** | Accepted target spec not yet fully implemented  | Keep as forward-looking target; do not rewrite as implemented behavior |
| **Supporting**              | Reference material that explains canonical docs | Keep concise; update links and examples to match canonical docs        |
| **Historical**              | Past decisions/specs kept for traceability      | Do not evolve behavior here; keep read-only historical context         |
| **Superseded**              | Replaced by a newer canonical source            | Do not continue active edits; add/keep clear pointer to replacement    |
| **Accepted** (ADR)          | Active architectural decision in effect         | Keep immutable; create a new ADR if the decision changes               |

Decision rules for already-merged documentation:

1. **Update in place** when the doc is Canonical and behavior has changed.
2. **Demote to Supporting** when a doc duplicates canonical content and mainly adds explanation.
3. **Archive as Historical/Superseded** when content reflects past behavior or is replaced by a newer source.
4. **Merge duplicates** when two active docs cover the same canonical concept; keep one owner and convert the other to Supporting or Superseded.

### Documentation Update Requirement

All code changes that affect documented behavior **MUST** include corresponding documentation updates in the same PR.
If no docs change is needed, the PR description must explicitly state why.

### Documentation PR Checklist

- [ ] Field names match canonical types (`placementId` not `plateId`, `category` not `type`)
- [ ] Connection rules follow initiator model (database/storage are receiver-only)
- [ ] Connection types are `dataflow`, `http`, `internal`, `data`, `async`
- [ ] `Workspace.architecture` is singular (not `architectures[]`) in the current model
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
- [ ] Docs updated for any behavior changes (REQUIRED for code changes)
```

### Review Process

1. Submit PR against `main`
2. Automated checks must pass
3. Follow current branch protection requirements for approvals (maintainer review is recommended)
4. Read available review feedback, fix actual correctness/security defects, and explain dismissed or deferred suggestions. Copilot review is recommended for substantial changes, not a merge prerequisite; bot availability and stylistic nits do not block merging.
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

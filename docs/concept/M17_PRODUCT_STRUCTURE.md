# Milestone 17 — Product Structure

## Goal

Restructure the CloudBlocks monorepo from a scaffolded prototype into a modular, separation-ready architecture. Establish clear module boundaries, resolve rendering model ambiguity, extract shared packages, and redefine backend responsibilities.

---

## Background

After M15 (v2.0 Specification Implementation) and M16 (Documentation Architecture), the codebase needs structural consolidation before further feature work. A codebase analysis revealed five structural issues:

### 1. Rendering Model Ambiguity

The README states "React + SVG frontend (FSD architecture)" and ADR-0005 established a "2D-first editor with 2.5D rendering" approach. However, `apps/web/package.json` includes `three.js`, `@react-three/fiber`, and `@react-three/drei` as dependencies. These are installed but their usage status is unclear. The project needs a definitive decision: SVG-only, Canvas/Three.js, or a defined hybrid boundary.

### 2. Unused Package Scaffolding

The `packages/` directory contains scaffolded but unused packages:

| Package                            | State                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| `@cloudblocks/schema`              | Exports only `SCHEMA_VERSION = '2.0.0'` — no actual consumers |
| `@cloudblocks/domain`              | Placeholder                                                   |
| `@cloudblocks/ui`                  | Placeholder                                                   |
| `@cloudblocks/terraform-templates` | Placeholder                                                   |
| `@cloudblocks/scenario-library`    | Placeholder                                                   |

No `import` from `@cloudblocks/schema` (or any other package) exists anywhere in `apps/web` or `apps/api`.

### 3. Backend Role Drift

The README describes the backend as a "thin orchestration backend." The actual `apps/api` surface includes auth/session management, workspace CRUD, GitHub OAuth integration, code generation orchestration, AI-assisted architecture (keys, prompts, suggestions), and route-level business logic. This is broader than "thin orchestration" and needs an accurate role definition.

### 4. Version Inconsistencies

| Location                       | Version |
| ------------------------------ | ------- |
| Root `package.json`            | 0.11.0  |
| `apps/web/package.json`        | 0.11.0  |
| `apps/api/pyproject.toml`      | 0.11.0  |
| `packages/schema/package.json` | 0.1.0   |

The schema package version is misaligned. No versioning policy exists for when packages should track root version vs version independently.

### 5. Data Contract Coupling

The `ArchitectureModel` JSON schema is the shared contract between the TypeScript frontend and Python backend. It is currently duplicated in both languages with no single source of truth. This is the strongest coupling point in the monorepo and the primary barrier to future repo separation.

### Monorepo Decision

A coupling analysis found:

- **Code coupling**: WEAK — `apps/web` does not import from `packages/*`, `apps/api` is Python with no TypeScript dependencies
- **Data contract coupling**: STRONG — ArchitectureModel JSON duplicated across languages
- **Infrastructure coupling**: MEDIUM — Dockerfiles assume monorepo layout, but CI already has per-app jobs

**Decision**: Keep the monorepo. Structure it as a "modular monorepo" where packages define clear boundaries, enabling future repo separation without code changes if that becomes necessary.

---

## Scope

### Area A: Rendering Model Decision

**Problem**: Ambiguity between SVG and Three.js rendering approaches.

**Work**:

- Audit current rendering code: which renderer is actually used for what
- Write an ADR documenting the rendering model decision
- If SVG-only: remove Three.js dependencies (`three`, `@react-three/fiber`, `@react-three/drei`) and any associated code
- If hybrid: define the boundary (e.g., SVG for 2D editor, Three.js for 3D preview) and document in the ADR
- Update README and ARCHITECTURE.md to reflect the decision

**Options to evaluate** (decision made during implementation, not in this design doc):

| Option                  | Pros                                                  | Cons                                            |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| SVG-only                | Simpler, smaller bundle, matches current working code | Limits future 3D features                       |
| Hybrid (SVG + Three.js) | Future flexibility, 3D preview possible               | Complexity, larger bundle, dual rendering paths |
| Three.js migration      | Full 3D capability                                    | Major rewrite, breaks working SVG code          |

### Area B: Package Extraction

**Problem**: `packages/` contains empty scaffolding. Shared domain logic is duplicated.

**Work**:

- **`@cloudblocks/schema`**: Extract the ArchitectureModel JSON schema, TypeScript type definitions, and validation schemas. This becomes the single source of truth for the data contract.
- **`@cloudblocks/domain`**: Extract shared domain logic (block categories, connection types, validation rule definitions) used by both frontend and backend.
- **Remove unused packages**: Delete placeholder packages that have no planned consumers (`ui`, `terraform-templates`, `scenario-library`) or define concrete extraction plans for them.
- **Import boundaries**: `apps/web` and `apps/api` consume `packages/*`, never the reverse. Packages do not import from each other unless an explicit dependency is declared.
- **Version alignment**: All packages follow root version (currently 0.11.0).

**Key constraint**: The Python backend cannot directly consume TypeScript packages. The schema package must produce a language-neutral artifact (JSON Schema file) that both TypeScript and Python can consume, with generated types for each language.

### Area C: Backend Role Redefinition

**Problem**: Documented role ("thin orchestration") does not match actual responsibilities.

**Work**:

- Document the actual backend responsibilities accurately:
  - Authentication and session management (GitHub OAuth, cookie-based sessions)
  - Workspace persistence (SQLite metadata)
  - GitHub integration (repo sync, PR creation)
  - Code generation orchestration (Terraform, Bicep, Pulumi)
  - AI-assisted architecture (suggestions, prompts, natural language input)
- Define the API surface contract explicitly, organized by domain
- Create a shared data contract: ArchitectureModel JSON schema becomes the interface between frontend and backend (via the schema package from Area B)
- Decide validation rule ownership: frontend-only, backend-only, or shared (via domain package from Area B)
- Update README, ARCHITECTURE.md, and API_SPEC.md to reflect the actual role

### Area D: Monorepo Structure Cleanup

**Problem**: Build/test/lint configuration assumes a simpler structure than what exists.

**Work**:

- Consolidate workspace configuration (`pnpm-workspace.yaml`, `tsconfig` references)
- Ensure `pnpm build`, `pnpm lint`, and `pnpm test` work from root for all apps and packages
- Clean up unused entries in `scripts/`
- Align CI pipeline (`.github/workflows/ci.yml`) with actual module structure — ensure extracted packages are built and tested
- Verify Dockerfiles work with the restructured monorepo layout

### Area E: Version Strategy

**Problem**: No versioning policy. Schema package version misaligned.

**Work**:

- Define versioning policy: all packages track root version (single-version policy)
- Align `packages/schema` version from 0.1.0 to current root version
- Document the policy: pre-1.0 means no stability guarantees, version bumps are milestone-driven
- Add version validation to CI (all package.json versions must match root)

---

## Epic Decomposition

### [Epic] Rendering Model Resolution (Area A)

| #   | Title                                                   | Size |
| --- | ------------------------------------------------------- | ---- |
| 1   | Audit current rendering code and Three.js usage         | S    |
| 2   | Write ADR: Rendering model decision                     | M    |
| 3   | Implement rendering model decision (remove or boundary) | M    |

### [Epic] Package Extraction & Boundaries (Area B)

| #   | Title                                                          | Size |
| --- | -------------------------------------------------------------- | ---- |
| 1   | Design schema package: JSON Schema + TS types + Python codegen | M    |
| 2   | Extract `@cloudblocks/schema` with ArchitectureModel contract  | L    |
| 3   | Extract `@cloudblocks/domain` with shared domain logic         | L    |
| 4   | Migrate apps/web imports to use extracted packages             | M    |
| 5   | Remove or plan unused placeholder packages                     | S    |

### [Epic] Backend Role & API Contract (Area C)

| #   | Title                                                    | Size |
| --- | -------------------------------------------------------- | ---- |
| 1   | Document actual backend responsibilities and API surface | M    |
| 2   | Define shared ArchitectureModel contract (JSON Schema)   | M    |
| 3   | Decide and implement validation rule ownership           | M    |
| 4   | Update README, ARCHITECTURE.md, API_SPEC.md              | M    |

### [Epic] Monorepo Infrastructure (Areas D + E)

| #   | Title                                             | Size |
| --- | ------------------------------------------------- | ---- |
| 1   | Consolidate workspace and tsconfig configuration  | M    |
| 2   | Ensure root-level build/test/lint for all modules | M    |
| 3   | Align CI pipeline with restructured modules       | M    |
| 4   | Define and enforce version alignment policy       | S    |

---

## Exit Criteria

- [ ] Rendering model documented in ADR; unused dependencies removed or justified with clear boundary
- [ ] `packages/` contains real extracted code with actual consumers in `apps/web` and/or `apps/api`
- [ ] `@cloudblocks/schema` is the single source of truth for the ArchitectureModel contract
- [ ] Backend role accurately documented; API surface defined as explicit contract
- [ ] All package versions aligned with root or independently versioned with explicit documented policy
- [ ] `pnpm build`, `pnpm lint`, and tests pass from root for all apps and packages
- [ ] CI pipeline builds and tests extracted packages
- [ ] Monorepo structure supports future repo separation without code changes (verified by documentation, not by actually splitting)
- [ ] Validation rule ownership decided and documented
- [ ] No placeholder/empty packages remain in `packages/`

---

## Dependencies

- M16 complete (documentation must be accurate before restructuring the codebase it describes)

---

## Constraints

- No breaking changes to user-facing features — the builder must work identically before and after restructuring
- Keep modular monorepo — do not split repos
- Maintain test coverage >= 90%
- Always design/document first, then implement
- Pre-1.0: no stability guarantees, but version bumps should be intentional
- Python backend cannot consume TypeScript directly — cross-language contracts must use language-neutral formats (JSON Schema)

---

## Risks

| Risk                                                             | Impact                            | Mitigation                                                                            |
| ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| Package extraction breaks CI pipeline                            | Build failures, blocked PRs       | Incremental extraction: one package at a time, verify CI after each                   |
| Rendering model decision requires significant dependency removal | Large diff, potential regressions | Write ADR first, implement in isolated PR with thorough testing                       |
| Backend redefinition surfaces API inconsistencies                | API contract confusion            | Contract-first approach: define schema before changing code                           |
| Cross-language schema generation adds tooling complexity         | Maintenance burden                | Use established tools (e.g., `json-schema-to-typescript`, `datamodel-code-generator`) |

---

## Estimated Effort

- **Area A** (Rendering Model): ~3–4 days
- **Area B** (Package Extraction): ~2 weeks (largest area)
- **Area C** (Backend Role): ~1 week
- **Area D+E** (Monorepo + Versioning): ~1 week
- **Total**: ~4–6 weeks
- Design documents and ADRs are written first for each area before implementation begins

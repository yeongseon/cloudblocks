# Version Alignment Policy

> Canonical reference for all versioning in the CloudBlocks monorepo — app versions, schema versions, and documentation freshness markers.

## Single-Version Policy

All publishable packages in the CloudBlocks monorepo share **one version number**: the root `package.json` version. This is the **source of truth**.

### Version Sources (must all match)

| Location                  | Format                      | Example               |
| ------------------------- | --------------------------- | --------------------- |
| `package.json` (root)     | `"version": "X.Y.Z"`        | `"version": "0.17.0"` |
| `apps/web/package.json`   | `"version": "X.Y.Z"`        | `"version": "0.17.0"` |
| `apps/api/pyproject.toml` | `version = "X.Y.Z"`         | `version = "0.17.0"`  |
| `apps/api/app/main.py`    | `version="X.Y.Z"` (FastAPI) | `version="0.17.0"`    |
| `packages/*/package.json` | `"version": "X.Y.Z"`        | `"version": "0.17.0"` |

### When to Bump

Versions are bumped as part of the **release workflow** (see `AGENTS.md § Release Workflow`). A version bump happens exactly once per milestone completion:

```
Milestone N completed → version becomes 0.N.0
```

**Do not bump versions mid-milestone.** Work-in-progress code on feature branches uses the _current_ released version until the milestone ships.

### Versioning Convention

```
v0.{milestone}.{patch}

Examples:
  v0.16.0  — Milestone 16 release
  v0.16.1  — Hotfix on Milestone 16
  v0.17.0  — Milestone 17 release
```

- **Major** (`0.x.y`): Stays at `0` until the project reaches production stability (v1.0.0).
- **Minor** (`x.N.y`): Matches the milestone number. Milestone 17 = `0.17.0`.
- **Patch** (`x.y.Z`): Reserved for hotfixes only. Starts at `0` for each milestone release.

### Pre-1.0 Caveat

CloudBlocks is pre-1.0 software. No stability guarantees are provided for:

- Internal package APIs (`@cloudblocks/schema`, `@cloudblocks/domain`)
- Store shape or state management interfaces
- Backend API contracts (endpoints may change between milestones)
- File formats (architecture JSON schema may evolve)

Consumers should pin to specific versions and review changelogs before upgrading.

## Schema Versioning

The **architecture serialization format** has its own version number, independent of the app version. Schema version tracks the shape of persisted data (`SerializedData`, `Workspace`, `ArchitectureModel`) and controls localStorage migration.

### Canonical Source

| What | Location | Example |
| --- | --- | --- |
| **Source of truth** | `packages/schema/src/index.ts` → `SCHEMA_VERSION` | `'4.1.0'` |
| Runtime consumer | `apps/web/src/shared/types/schema.ts` → imports from `@cloudblocks/schema` | — |

There must be **exactly one** `SCHEMA_VERSION` constant in the codebase. `apps/web` imports it; it must not define its own copy.

### When to Bump Schema Version

Bump `SCHEMA_VERSION` when the **persisted data shape** changes:

- New required field added to `ArchitectureModel`, `Workspace`, or `SerializedData`
- Field renamed, removed, or type changed
- Container/resource block structure changes that affect serialization
- Migration logic added for a new format transition

Do **not** bump schema version for:

- UI-only changes (CSS, layout, panel visibility)
- New resource types added to `RESOURCE_RULES` (additive, backward-compatible)
- Code generation changes (Terraform/Bicep/Pulumi output)
- Backend API changes

### Schema Version Convention

```
{major}.{minor}.{patch}

Examples:
  4.0.0  — v4 format (endpoint-based connections, M22)
  4.1.0  — Added external actor migration to block nodes
  5.0.0  — (future) Breaking format change requiring new migration
```

- **Major**: Breaking format change — old data cannot load without migration
- **Minor**: Additive change — old data loads but may gain new defaults on save
- **Patch**: Fix to migration logic with no format change

### Relationship to App Version

App version and schema version are **independent**:

```
App v0.22.0  →  Schema v4.0.0  (M22 introduced endpoint-based connections)
App v0.35.0  →  Schema v4.1.0  (same schema, minor addition)
App v0.40.0  →  Schema v4.1.0  (possible — no format change needed)
```

Schema version bumps less frequently than app version. Many milestones may ship on the same schema version.

## Documentation Freshness Markers

Living documentation files include a `Verified against` marker in their metadata header (line 3):

```markdown
> **Audience**: Beginners | **Status**: V1 Core | **Verified against**: v0.35.0
```

### Rules

1. **Format**: Always use the app version: `Verified against: v{X.Y.Z}`
2. **Exception**: Schema-focused docs (e.g., `DOMAIN_MODEL.md`) may additionally note `v{schema} schema` when the schema version materially matters
3. **Update only after review**: A marker means "a human verified this document accurately describes the codebase at version X". Do not bulk-update markers without actually reviewing content.
4. **Exempt documents**: ADRs (`docs/decisions/ADR-*.md`) and documents marked "Historical (Superseded)" do not carry freshness markers — they are immutable records.
5. **Staleness threshold**: A marker more than 5 milestones behind the current release is considered stale and should be prioritized for review.

### Release Checklist Integration

During each milestone release, the release PR must review and update the `Verified against` marker for at least these **core documents**:

- `docs/concept/ARCHITECTURE.md`
- `docs/model/DOMAIN_MODEL.md`
- `docs/concept/V1_PRODUCT_CONTRACT.md`
- `docs/user-guide/quick-start.md`
- `docs/user-guide/core-concepts.md`

Other documents should be updated opportunistically when their content area is affected by the milestone.

## Enforcement

### Automated Check Script

`scripts/check-versions.sh` validates version alignment across all packages. It:

1. Reads the root `package.json` version as the expected version
2. Compares all other version sources against it
3. Exits with code 1 if any mismatch is found

Run manually:

```bash
./scripts/check-versions.sh
```

This script is intended to be integrated into CI (issue #434, Wave 8).

### Manual Review

During the release process (see `AGENTS.md § Release Workflow`), the release commit must update **all** version sources simultaneously. The PR reviewer must verify version alignment before merge.

## Bump Procedure

When completing a milestone release:

```bash
# 1. Determine the new version
NEW_VERSION="0.17.0"

# 2. Update all sources (example commands)
# Root
jq ".version = \"$NEW_VERSION\"" package.json > tmp && mv tmp package.json

# apps/web
jq ".version = \"$NEW_VERSION\"" apps/web/package.json > tmp && mv tmp apps/web/package.json

# apps/api pyproject.toml — update version line
sed -i "s/^version = .*/version = \"$NEW_VERSION\"/" apps/api/pyproject.toml

# apps/api FastAPI metadata
sed -i "s/version=\"[^\"]*\"/version=\"$NEW_VERSION\"/" apps/api/app/main.py

# packages/*
for pkg in packages/*/package.json; do
  jq ".version = \"$NEW_VERSION\"" "$pkg" > tmp && mv tmp "$pkg"
done

# 3. Run version check
./scripts/check-versions.sh

# 4. Commit as part of release
git add -A
git commit -m "chore: release v$NEW_VERSION"
```

## Related Documents

- [AGENTS.md § Release Workflow](../../AGENTS.md) — Full release process
- [RELEASE_GATES.md](RELEASE_GATES.md) — Pre-release gate checks
- [CHANGELOG.md](../../CHANGELOG.md) — Release history
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Schema version referenced in model docs

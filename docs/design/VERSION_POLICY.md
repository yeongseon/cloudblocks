# Version Alignment Policy

> Canonical reference for CloudBlocks monorepo versioning.

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

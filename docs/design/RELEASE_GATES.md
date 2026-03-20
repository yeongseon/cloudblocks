# Release Gate Checklist

> Covers issue #28.

This document defines mandatory pre-release checks, blocker vs. warning criteria, and incident response linkage for CloudBlocks releases.

---

## 1. Pre-Release Checklist

Every release to `main` (or tagged release) must pass ALL of the following gates. A single blocker failure halts the release.

### Gate 1: Build & Type Safety

| Check | Command | Criteria | Level |
|-------|---------|----------|-------|
| TypeScript compilation | `cd apps/web && npx tsc -b` | Zero errors | **Blocker** |
| Vite production build | `cd apps/web && npx vite build` | Exit code 0 | **Blocker** |
| Python syntax | `cd apps/api && python -m py_compile app/main.py` | No syntax errors | **Blocker** |

### Gate 2: Linting

| Check | Command | Criteria | Level |
|-------|---------|----------|-------|
| Frontend lint | `pnpm lint` | Zero errors | **Blocker** |
| Backend lint | `cd apps/api && ruff check app/` | Zero errors | **Blocker** |
| Frontend warnings | `pnpm lint` | Zero warnings | **Warning** |

### Gate 3: Tests

| Check | Command | Criteria | Level |
|-------|---------|----------|-------|
| Frontend tests | `cd apps/web && npx vitest run` | All pass | **Blocker** |
| Backend tests | `cd apps/api && pytest app/tests/ -v` | All pass | **Blocker** |
| Frontend coverage | `cd apps/web && npx vitest run --coverage` | ≥ 90% (statements, branches, functions, lines) | **Blocker** |
| Backend coverage | `cd apps/api && pytest --cov=app --cov-fail-under=90` | ≥ 90% | **Blocker** |

### Gate 4: Security

| Check | Criteria | Level |
|-------|----------|-------|
| No secrets in code | No API keys, tokens, or passwords in source | **Blocker** |
| Session secret policy | Session secret is configured and 32+ chars in non-dev | **Blocker** |
| Session cookie transport | Auth uses httpOnly `cb_session` cookie with credentialed requests | **Blocker** |
| Dependency audit | No known critical CVEs in dependencies | **Blocker** |
| Dependency audit | No known high CVEs in dependencies | **Warning** |

### Gate 5: Documentation Sync

| Check | Criteria | Level |
|-------|----------|-------|
| ROADMAP.md | Version exit criteria reflect actual state | **Blocker** |
| README.md | Feature list matches implemented features | **Warning** |
| CHANGELOG | Release notes written for new version | **Warning** |
| Design docs | All design docs updated if related code changed | **Warning** |

---

## 2. Blocker vs. Warning Criteria

### Blockers (Release MUST NOT proceed)

A blocker is any condition that:

- Breaks the build or type safety
- Causes test failures
- Drops coverage below 90%
- Introduces a security vulnerability
- Violates a design contract (validation rules, session cookie transport, session secret policy)
- Breaks backward compatibility without migration path

**Policy**: Zero tolerance. Fix before release. No exceptions.

### Warnings (Release MAY proceed with acknowledgment)

A warning is any condition that:

- Lint warnings (not errors) exist
- Documentation is slightly outdated but not misleading
- Non-critical dependency has a known vulnerability
- Bundle size increased > 10% but stays within budget
- A non-critical NFR target is not met

**Policy**: Document in release notes. Create follow-up issue. Release may proceed if the release manager explicitly acknowledges each warning.

---

## 3. Release Process

### Standard Release (to `main`)

```
1. All PRs merged to feature branch
2. Run pre-release checklist (Gates 1–5)
3. Fix all blockers
4. Document all warnings
5. Create release commit: "Release vX.Y — [summary]"
6. Tag: git tag vX.Y
7. Push: git push origin main --tags
```

### Hotfix Release

```
1. Branch from latest tag: git checkout -b hotfix/vX.Y.Z vX.Y
2. Apply minimal fix
3. Run Gates 1–3 (build, lint, tests)
4. Gate 4 (security) if fix is security-related
5. Merge to main
6. Tag: git tag vX.Y.Z
```

---

## 4. Rollback Plan

### When to Rollback

- Critical bug discovered post-release that affects core functionality
- Security vulnerability introduced by the release
- Data corruption risk (architecture JSON, workspace state)

### How to Rollback

```bash
# Revert to previous release
git revert HEAD          # If single commit release
git revert HEAD~N..HEAD  # If multi-commit release

# Or reset to last known good tag
git checkout vX.Y-1
git checkout -b hotfix/rollback
# Cherry-pick fixes, create new release
```

### Rollback Scope

| Component | Rollback Method |
|-----------|----------------|
| Frontend | Deploy previous build artifact |
| Backend | Redeploy previous container/tag |
| Database | Run down migration (if schema changed) |
| localStorage | Schema version check handles gracefully |

---

## 5. Incident Response Linkage

### Severity Levels

| Level | Definition | Response Time | Resolution Time |
|-------|-----------|---------------|-----------------|
| **P0** | Service down, data loss risk | < 1 hour | < 4 hours |
| **P1** | Core feature broken (build, generate, validate) | < 4 hours | < 24 hours |
| **P2** | Non-core feature broken (UI polish, non-critical widget) | < 24 hours | < 1 week |
| **P3** | Minor issue, workaround exists | Best effort | Next release |

### Post-Incident Actions

1. Create GitHub issue with `incident` label
2. Write brief post-mortem (what happened, why, what prevents recurrence)
3. Add regression test for the specific failure
4. Update release gates if a new check category is needed

---

## 6. CI Integration

All Gate 1–3 checks are automated in `.github/workflows/ci.yml`:

| CI Job | Gates Covered |
|--------|--------------|
| `web-lint` | Gate 2 (frontend lint) |
| `web-build` | Gate 1 (TypeScript + Vite build), matrix Node 20 & 22 |
| `web-test` | Gate 3 (frontend tests + coverage) |
| `api-lint` | Gate 2 (backend lint) |
| `api-test` | Gate 3 (backend tests + coverage) |

Gate 4 (security) and Gate 5 (documentation) are manual review steps in the PR process.

---

## 7. Version-Specific Gates

### Milestone 5 (Completed)

- All 5 CI jobs pass
- 1015+ frontend tests, 170+ backend tests
- Coverage ≥ 90% both layers
- Store decomposition complete (5 slices)
- GitHub integration functional

### Phase 7 (Completed)

- Session auth migration complete (JWT removed)
- Cookie-based session flow active (`cb_oauth` + `cb_session`)
- Server-side session storage active in SQLite

### Milestone 6 (Completed)

All Milestone 5 gates plus:

- Bicep generator produces valid output
- Pulumi generator produces valid output
- Template marketplace has 5+ templates
- Generator plugin interface documented
- Shared validation test fixtures exist (FE/BE compatibility)
- Performance regression tests pass (validation latency targets)

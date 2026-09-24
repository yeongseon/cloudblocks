# Release Checklist & Launch Runbook

> Covers issue #476.  
> Single reference for validation, tagging, release creation, and post-release checks.  
> See also: [RELEASE_GATES.md](../design/RELEASE_GATES.md) and [VERSION_POLICY.md](../design/VERSION_POLICY.md).

---

## 1. Pre-Release Checklist

Complete every item before proceeding to tagging. A single ❌ in a **Blocker** row halts the release.

### Gate 1: Build & Type Safety

| #   | Check                 | Command                                           | Pass? |
| --- | --------------------- | ------------------------------------------------- | ----- |
| 1   | TypeScript compiles   | `pnpm run typecheck`                              | ☐     |
| 2   | Vite production build | `pnpm build`                                      | ☐     |
| 3   | Python syntax         | `cd apps/api && python -m py_compile app/main.py` | ☐     |

### Gate 2: Lint

| #   | Check                       | Command                          | Pass? |
| --- | --------------------------- | -------------------------------- | ----- |
| 4   | Frontend lint (zero errors) | `pnpm lint`                      | ☐     |
| 5   | Backend lint (zero errors)  | `cd apps/api && ruff check app/` | ☐     |

### Gate 3: Tests & Coverage

| #   | Check                   | Command                                                                            | Pass? |
| --- | ----------------------- | ---------------------------------------------------------------------------------- | ----- |
| 6   | Frontend tests pass     | `cd apps/web && npx vitest run`                                                    | ☐     |
| 7   | Frontend branches ≥ 85%; other metrics ≥ 90% | `cd apps/web && npx vitest run --coverage`                                         | ☐     |
| 8   | Backend tests pass      | `python3 -m pytest apps/api/app/tests/ -v`                                        | ☐     |
| 9   | Backend coverage ≥ 90%  | `python3 -m pytest apps/api --cov=app --cov-fail-under=90`                         | ☐     |
| 10  | Package tests pass      | `pnpm --filter @cloudblocks/schema test && pnpm --filter @cloudblocks/domain test` | ☐     |

### Gate 4: Security

| #   | Check                            | Pass? |
| --- | -------------------------------- | ----- |
| 11  | No secrets in source code        | ☐     |
| 12  | Build output secret scan passes  | ☐     |
| 13  | No critical CVEs in dependencies | ☐     |

### Gate 5: Demo Verification (MANDATORY)

| #   | Check                                                            | Pass? |
| --- | ---------------------------------------------------------------- | ----- |
| 14  | App loads without console errors                                 | ☐     |
| 15  | Existing localStorage data loads and renders                     | ☐     |
| 16  | Create workspace → place container block → place block → connect | ☐     |
| 17  | Validation results display correctly                             | ☐     |
| 18  | Generate Terraform/Bicep/Pulumi                                  | ☐     |
| 19  | Load a template and render                                       | ☐     |

### Gate 6: Documentation

| #   | Check                                                              | Pass? |
| --- | ------------------------------------------------------------------ | ----- |
| 20  | CHANGELOG.md entry written (use [template](#appendix-changelog-template)) | ☐     |
| 21  | ROADMAP.md exit criteria checked off                               | ☐     |
| 22  | README feature list matches implemented features                   | ☐     |

---

## 2. Release Steps

Release only for a learner-visible capability bundle or a bug fix, not because a milestone closed. Follow [Version Alignment Policy](../design/VERSION_POLICY.md#when-to-bump) to select `v0.x.0` or `v0.x.y` and update **all** version sources together. A beta prerelease has additional evidence gates in [#1916](https://github.com/yeongseon/cloudblocks/issues/1916); routine maintenance does not authorize one.

1. Verify the production build and core flows against the active [release gates](../design/RELEASE_GATES.md). Record any unmeasured gate as unknown, not passed.
2. Create an issue-linked release branch, update the version sources and `CHANGELOG.md`, and run `./scripts/check-versions.sh` until it exits 0.
3. Open a release PR, wait for required CI and review available feedback. Squash-merge normally with `gh pr merge <PR_NUMBER> --squash --delete-branch`; never bypass branch protection.
4. Sync clean `main`, create and push an annotated `v0.x.y` tag, then create the GitHub Release with notes drawn from the matching changelog section.
5. Verify the release page and live demo. Update the roadmap only when product direction or capability status changes. Milestones and CI cache cleanup are optional housekeeping, not release gates.

---

## 3. Post-Release Verification

| #   | Check                                                     | Pass? |
| --- | --------------------------------------------------------- | ----- |
| 1   | GitHub Release page shows correct tag and notes           | ☐     |
| 2   | GitHub Pages deployment succeeded (if frontend changed)   | ☐     |
| 3   | Live demo loads: https://yeongseon.github.io/cloudblocks/ | ☐     |
| 4   | Product direction or capability status updated if changed | ☐     |

---

## 4. Hotfix Release (Abbreviated)

For patch releases (`v0.x.y`), use the abbreviated flow:

1. Branch from the latest applicable tag: `git checkout -b hotfix/v0.x.y v0.x.0`
2. Apply minimal fix
3. Run Gates 1–3 (build, lint, tests)
4. Run Gate 5 (demo verification)
5. Commit, push, create PR, merge
6. Create an annotated tag for the selected patch version.
7. Push tag, create GitHub Release
8. Verify the release and live demo; milestones remain optional planning aids.

---

## 5. Emergency Rollback

If the release introduces a critical issue post-deploy:

1. Revert the release commit on `main`: `git revert HEAD`
2. Push the revert and create a hotfix PR
3. Follow the Hotfix Release flow (§4) to ship the fix
4. Create a post-mortem issue with the `incident` label

See [RELEASE_GATES.md § Rollback Plan](../design/RELEASE_GATES.md#4-rollback-plan) for detailed rollback scope and procedures.

---

## Appendix: Changelog Template

Use this template when adding a new entry to `CHANGELOG.md`. Copy the block below and fill in the details.

```markdown
## [v0.{minor}.0] — {YYYY-MM-DD}

**{Learner-visible capability bundle}**

{1-3 sentence summary of what this milestone delivers, focused on user-facing impact.}

### {Feature Area 1} (Epic #{number})

- {User-visible change description} (#{issue})
- {User-visible change description} (#{issue})

### {Feature Area 2} (Epic #{number})

- {User-visible change description} (#{issue})

### Bug Fixes

- {What was broken and how it was fixed} (#{issue})

### Infrastructure

- {CI/CD, deployment, or build system changes} (#{issue})

### Documentation

- {New or updated docs} (#{issue})
```

### Writing Style

| Do                                            | Don't                                       |
| --------------------------------------------- | ------------------------------------------- |
| "Add real-time validation for connections"    | "Implemented validation logic in engine.ts" |
| "Fix crash when loading legacy architectures" | "Fixed bug #1234"                           |
| "Generate Bicep output alongside Terraform"   | "Added bicep.ts generator module"           |

- **Lead with the user impact**, not the implementation detail.
- **Use imperative mood**: "Add", "Fix", "Remove", "Update" — not "Added", "Fixed".
- **Reference issue numbers** at the end of each line: `(#123)`.
- **Keep entries to one line** — link to the PR/issue for details.
- Omit empty sections.

### Hotfix Entries

For patch releases (`v0.x.y`), use a simplified format:

```markdown
## [v0.{minor}.{patch}] — {YYYY-MM-DD}

**Hotfix — {Brief Description}**

{1-2 sentence description of what was broken and how it was fixed.}

### Bug Fix

- {Description} (#{issue})
```

### Version Convention

- **Meaningful capability bundle → v0.x.0** (feature release)
- **Bug fix / hotfix → v0.x.y** (patch release)
- See [Version Alignment Policy](../design/VERSION_POLICY.md) for the canonical release convention.

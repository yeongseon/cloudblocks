# Release Checklist & Launch Runbook

> Covers issue #476.  
> Single reference for validation, tagging, release creation, and post-release checks.  
> See also: [RELEASE_GATES.md](../design/RELEASE_GATES.md), [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md), [CHANGELOG_TEMPLATE.md](CHANGELOG_TEMPLATE.md).

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
| 7   | Frontend coverage ≥ 90% | `cd apps/web && npx vitest run --coverage`                                         | ☐     |
| 8   | Backend tests pass      | `cd apps/api && pytest app/tests/ -v`                                              | ☐     |
| 9   | Backend coverage ≥ 90%  | `cd apps/api && pytest --cov=app --cov-fail-under=90`                              | ☐     |
| 10  | Package tests pass      | `pnpm --filter @cloudblocks/schema test && pnpm --filter @cloudblocks/domain test` | ☐     |

### Gate 4: Security

| #   | Check                            | Pass? |
| --- | -------------------------------- | ----- |
| 11  | No secrets in source code        | ☐     |
| 12  | Build output secret scan passes  | ☐     |
| 13  | No critical CVEs in dependencies | ☐     |

### Gate 5: Demo Verification (MANDATORY)

| #   | Check                                                  | Pass? |
| --- | ------------------------------------------------------ | ----- |
| 14  | App loads without console errors                       | ☐     |
| 15  | Existing localStorage data loads and renders           | ☐     |
| 16  | Create workspace → place plate → place block → connect | ☐     |
| 17  | Validation results display correctly                   | ☐     |
| 18  | Generate Terraform/Bicep/Pulumi                        | ☐     |
| 19  | Load a template and render                             | ☐     |

### Gate 6: Documentation

| #   | Check                                                              | Pass? |
| --- | ------------------------------------------------------------------ | ----- |
| 20  | CHANGELOG.md entry written (use [template](CHANGELOG_TEMPLATE.md)) | ☐     |
| 21  | ROADMAP.md exit criteria checked off                               | ☐     |
| 22  | README feature list matches implemented features                   | ☐     |

---

## 2. Release Steps

Execute in order after all checklist items pass.

```bash
# Variables — set these for your release
export MILESTONE=20
export VERSION="0.${MILESTONE}.0"
export TITLE="UX Polish & GitHub Hardening"
export OWNER=yeongseon
export REPO=cloudblocks

# Step 1: Version bump
# Update `version` in package.json to $VERSION

# Step 2: CHANGELOG
# Add new section to CHANGELOG.md using the template

# Step 3: Release commit
git add package.json CHANGELOG.md
git commit -m "chore: release v${VERSION}"

# Step 4: Squash-merge the release PR
gh pr merge <PR_NUMBER> --squash --admin --delete-branch

# Step 5: Pull the merge commit
git checkout main && git pull --ff-only origin main

# Step 6: Create annotated tag
git tag -a "v${VERSION}" -m "v${VERSION} — ${TITLE}"

# Step 7: Push tag
git push origin "v${VERSION}"

# Step 8: Create GitHub Release
gh release create "v${VERSION}" \
  --title "v${VERSION} — ${TITLE}" \
  --notes-file - <<< "$(sed -n "/## \[v${VERSION}\]/,/^## \[/{ /^## \[v${VERSION}\]/d; /^## \[/d; p; }" CHANGELOG.md)"

# Step 9: Close milestone
MILESTONE_NUMBER=$(gh api "repos/${OWNER}/${REPO}/milestones" --jq ".[] | select(.title | contains(\"Milestone ${MILESTONE}\")) | .number")
gh api "repos/${OWNER}/${REPO}/milestones/${MILESTONE_NUMBER}" -X PATCH -f state=closed

# Step 10: CI cleanup
gh api "repos/${OWNER}/${REPO}/actions/caches" --paginate \
  --jq '.actions_caches[] | select(.ref != "refs/heads/main") | .id' | \
  while read id; do gh api -X DELETE "repos/${OWNER}/${REPO}/actions/caches/$id"; done

gh api "repos/${OWNER}/${REPO}/actions/artifacts" --paginate \
  --jq '[.artifacts[].id] | .[3:] | .[]' | \
  while read id; do gh api -X DELETE "repos/${OWNER}/${REPO}/actions/artifacts/$id"; done

# Step 11: Roadmap sync
# Update docs/concept/ROADMAP.md — check exit criteria, update summary chain
```

---

## 3. Post-Release Verification

| #   | Check                                                     | Pass? |
| --- | --------------------------------------------------------- | ----- |
| 1   | GitHub Release page shows correct tag and notes           | ☐     |
| 2   | GitHub Pages deployment succeeded (if frontend changed)   | ☐     |
| 3   | Live demo loads: https://yeongseon.github.io/cloudblocks/ | ☐     |
| 4   | Milestone closed on GitHub                                | ☐     |
| 5   | ROADMAP.md updated with completion markers                | ☐     |

---

## 4. Hotfix Release (Abbreviated)

For patch releases (v0.N.1+), use the abbreviated flow:

1. Branch from the latest tag: `git checkout -b hotfix/v0.N.P v0.N.0`
2. Apply minimal fix
3. Run Gates 1–3 (build, lint, tests)
4. Run Gate 5 (demo verification)
5. Commit, push, create PR, merge
6. Tag: `git tag -a v0.N.P -m "v0.N.P — hotfix description"`
7. Push tag, create GitHub Release
8. Do NOT close the milestone (already closed)

---

## 5. Emergency Rollback

If the release introduces a critical issue post-deploy, follow the [Rollback Runbook](ROLLBACK_RUNBOOK.md).

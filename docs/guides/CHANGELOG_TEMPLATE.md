# Changelog Template

> Covers issue #475.  
> Defines the standard structure for CHANGELOG.md entries across milestone releases.

---

## Template

Use this template when adding a new entry to `CHANGELOG.md`. Copy the block below and fill in the details.

```markdown
## [v0.{milestone}.0] — {YYYY-MM-DD}

**Milestone {milestone} — {Milestone Title}**

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

---

## Guidelines

### Section Ordering

1. **Feature areas** — grouped by Epic, largest impact first
2. **Bug Fixes** — user-visible fixes only
3. **Infrastructure** — CI/CD, deployment, build changes
4. **Documentation** — new or updated docs

Omit empty sections.

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

### Hotfix Entries

For patch releases (v0.N.1, v0.N.2), use a simplified format:

```markdown
## [v0.{milestone}.{patch}] — {YYYY-MM-DD}

**Hotfix — {Brief Description}**

{1-2 sentence description of what was broken and how it was fixed.}

### Bug Fix

- {Description} (#{issue})
```

### Version Convention

- **Milestone N → v0.N.0** (feature release)
- **Patch → v0.N.1, v0.N.2** (hotfix releases)
- See `AGENTS.md` Release Workflow for the full release process.

---

## Example

```markdown
## [v0.20.0] — 2026-03-25

**Milestone 20 — UX Polish & GitHub Hardening**

Hardens GitHub integration reliability, adds persona-based UX, improves
infrastructure readiness, and closes remaining test coverage gaps.

### Persona System (Epic #1081)

- Add bottom-panel persona toggle with Developer/Architect/DevOps modes (#1082)
- Filter resource bar and validation by active persona (#1083)
- Add persona state persistence to uiStore (#1084)
- Integrate persona selection into onboarding tour (#1085)

### GitHub Bug Fixes (Epic #835)

- Fix OAuth login failure when session cookie is stale (#836)
- Fix repo list not refreshing after new repo creation (#840)

### Infrastructure

- Add preview deployment workflow for PR branches (#465)
- Add CI bundle-size budget gate (#472)
- Standardize .env.example for web and API (#468)

### Documentation

- Add rollback runbook (#467)
- Add release checklist and launch runbook (#476)
```

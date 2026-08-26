# ADR-0019: Decouple Versioning from Milestones

**Status**: Accepted
**Date**: 2026-08
**Related**: [#1900](https://github.com/yeongseon/cloudblocks/issues/1900)

## Context

CloudBlocks is developed by a single developer who works in sporadic bursts and
delegates execution to AI agents. Over the first five months the project
accumulated scaled-team governance: 53 milestones, 51 releases, a 207-line
`AGENTS.md`, and a 509-line `CONTRIBUTING.md`.

A meta-review (issue #1900) found a **process–product inversion** — energy was
spent managing work rather than validating learner value. The central mechanism
driving the inflation was the rule **`Milestone N = v0.N.0`**, which coupled two
independent concepts:

- **Milestones** — planning slices used to organize and track work.
- **Versions** — user-visible product state that consumers pin to and read
  changelogs for.

Because every milestone was forced to become a public version, tiny visual or
label changes became full releases (multiple `v0.x` tags per day), every issue
and PR required milestone assignment (including dependency bumps and docs), and
re-entering the project after dormancy meant reconstructing planning ceremony
before doing product work.

This entanglement was originally documented in `AGENTS.md § Release Workflow` and
`docs/design/VERSION_POLICY.md § When to Bump` ("Milestone N completed → version
becomes 0.N.0").

## Decision

**Decouple versioning from milestones.**

1. **Versions represent user-visible product state, not planning progress.**
   - `v0.x.0` — a meaningful capability bundle worth announcing to learners.
   - `v0.x.y` — bug fixes and hotfixes.
   - **No version bump** for routine PRs, visual tweaks, docs, refactors, or
     dependency updates.
2. **Release only when there is a learner-visible reason** — not when a milestone
   closes. A milestone closing no longer implies a release, tag, or version bump.
3. **The minor number no longer tracks the milestone number.** The next release
   version is chosen by the significance of the delivered capability, continuing
   from the current released version.
4. **Milestones are optional planning aids, not release units.** Planning moves to
   `Now / Next / Later` buckets (tracked as follow-up in #1900). Issues and PRs no
   longer require universal milestone assignment.

The single-version alignment across packages (root `package.json`,
`apps/web`, `apps/api`, `packages/*`) and the `check-versions.sh` gate are
**retained** — those concern package consistency, not milestone coupling.

## Consequences

### Positive

- Removes the primary source of re-entry friction after dormancy.
- Ends release inflation — tags now mark notable deliveries, not process units.
- Eliminates per-PR milestone-assignment overhead for dependency and doc changes.
- Version numbers become meaningful to consumers again.

### Negative

- Version numbers no longer encode the milestone number, so historical
  `v0.N.0 = Milestone N` mappings apply only to releases through `v0.51.0`.
  The 0.x history in `docs/concept/ROADMAP_0X_HISTORY.md` remains an accurate
  record of that earlier convention.
- Requires judgment about what constitutes a "learner-visible" release rather
  than a mechanical rule.

### When to Revisit

- If the project transitions to multi-contributor, steady-cadence development,
  revisit whether formal milestone-per-release tracking should return.
- At `v1.0.0`, establish stability guarantees and a formal SemVer policy.

## Supersedes

This ADR supersedes the `Milestone N = v0.N.0` versioning convention previously
defined in `AGENTS.md § Release Workflow` and
`docs/design/VERSION_POLICY.md § When to Bump` / `§ Versioning Convention`.
Those documents are updated to reference this decision.

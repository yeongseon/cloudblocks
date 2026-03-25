# ADR-0014: Promote/Rollback Static Data Placeholders

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks includes a promote-to-production and rollback workflow (Milestone 7) that lets users visually manage deployments. The current implementation uses **static placeholder data** for environment state — staging image tags, commit SHAs, deployment timestamps, available rollback versions, and the authenticated user identity.

Four locations contain static data:

| File                 | Line | Placeholder                                                                          |
| -------------------- | ---- | ------------------------------------------------------------------------------------ |
| `PromoteDialog.tsx`  | 28   | Static staging environment snapshot (imageTag, commitSha, commitMessage, deployedAt) |
| `RollbackDialog.tsx` | 25   | Static production environment snapshot (same fields)                                 |
| `promoteStore.ts`    | 99   | Hardcoded `commitSha: 'abc1234'` in promotion record                                 |
| `promoteStore.ts`    | 101  | Hardcoded `promotedBy: 'current-user'` in promotion record                           |

These placeholders exist because:

1. **No backend deployment API yet.** The `apps/api` backend does not expose staging/production environment endpoints. The frontend has no source for live deployment data.
2. **Frontend-only demo mode.** CloudBlocks ships a frontend-only live demo at `yeongseon.github.io/cloudblocks/` — the promote/rollback UI must render meaningfully without a backend.
3. **Deliberate scoping.** Milestone 7 focused on the visual workflow (dialog UX, checklist gates, history tracking). Backend integration was explicitly deferred to a later milestone.

All four locations are now tagged with `TODO(backend):` comments that describe the required replacement.

## Decision

1. **Accept static placeholders as the current implementation.** The promote/rollback dialogs use hardcoded data that is visually representative but not connected to real deployments.

2. **Standardize all placeholders with `TODO(backend):` markers.** Each marker includes a description of what backend endpoint or service is needed:
   - `TODO(backend): Replace with live environment data from staging deployment API`
   - `TODO(backend): Replace with live environment data from production deployment API`
   - `TODO(backend): Resolve from actual staging deployment`
   - `TODO(backend): Resolve from authenticated user session`

3. **Define the backend integration contract.** When the backend deployment API is implemented, it must provide:
   - `GET /api/deployments/{environment}` — Returns the current deployment state (imageTag, commitSha, commitMessage, deployedAt).
   - `GET /api/deployments/{environment}/history` — Returns available rollback versions.
   - The authenticated user identity from the existing GitHub OAuth session (`authStore`).

4. **No behavioral change in demo mode.** When no backend is available, the frontend should fall back to the current static data gracefully (or show an explicit "Backend not connected" state).

## Consequences

### Positive

- **Unblocks frontend work.** The promote/rollback UI is fully functional for demonstration, testing, and UX iteration without waiting for backend infrastructure.
- **Clear migration path.** `TODO(backend):` markers are grep-searchable and self-documenting. A future implementer can find all four locations with `grep -r 'TODO(backend)'`.
- **No false confidence.** The `ComingSoonBanner` component already signals to users that the feature requires backend integration.

### Negative

- **Static data diverges from reality.** Users exploring the promote/rollback flow see placeholder values that do not reflect any actual deployment. This is mitigated by the ComingSoonBanner.
- **Four integration points to update.** When the backend API is ready, all four `TODO(backend)` sites must be updated together to avoid inconsistent state. This should be tracked as a single sub-issue in the backend integration epic.

### When to Revisit

This ADR should be revisited when:

- A deployment API is added to `apps/api` (likely Milestone 30+).
- The promote/rollback feature moves from "preview" to "production" status.
- A decision is made about whether to support promote/rollback in frontend-only mode permanently.

# Rollback Runbook

> Covers issue #467.  
> Companion to [RELEASE_GATES.md](../design/RELEASE_GATES.md) §4 and [ENVIRONMENT_STRATEGY.md](ENVIRONMENT_STRATEGY.md) §7.

---

## 1. When to Rollback

Trigger a rollback when any of the following occur **after** a release is deployed:

| Trigger | Severity | Max Decision Time |
|---------|----------|-------------------|
| Application crashes on load (blank page) | P0 | Immediate |
| Data corruption (localStorage architecture JSON mangled) | P0 | Immediate |
| Core flow broken (place → connect → validate → generate) | P1 | < 1 hour |
| GitHub integration fully non-functional | P1 | < 4 hours |
| UI regression affecting > 50% of users | P2 | < 24 hours |

**Do NOT rollback for**: cosmetic issues, non-critical feature regressions, or problems with workarounds.

---

## 2. Decision Criteria

Before rolling back, verify:

1. **Is the issue caused by this release?** Compare behavior on the previous version.
2. **Can a hotfix be deployed faster than a rollback?** If the fix is < 30 minutes, prefer hotfix.
3. **Does rollback introduce data compatibility issues?** Check if schema migrations occurred.

---

## 3. Rollback Procedures

### 3.1. GitHub Pages (Frontend Demo)

The frontend is deployed to GitHub Pages via the `pages.yml` workflow.

```bash
# Option A: Revert the merge commit and push to main
git revert <merge-commit-sha> --no-edit
git push origin main
# pages.yml will automatically redeploy the reverted state

# Option B: Re-run the Pages workflow on a previous commit
gh workflow run pages.yml --ref <previous-tag>
```

**Verification**: Open https://yeongseon.github.io/cloudblocks/ and confirm the app loads.

### 3.2. Staging (Azure Container App + Static Web App)

```bash
# 1. Identify the last healthy image tag
az containerapp revision list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?properties.healthState=='Healthy'].name" \
  --output table

# 2. Activate the previous healthy revision
az containerapp revision activate \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --revision <healthy-revision-name>

# 3. Deactivate the broken revision
az containerapp revision deactivate \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --revision <broken-revision-name>

# 4. Verify health
curl -s "https://<staging-api-url>/health" | jq .
```

For the Static Web App (frontend):
```bash
# Re-deploy from a previous commit
gh workflow run deploy.yml --ref <previous-tag>
```

### 3.3. Production (Tag-Gated)

Production deployments are tag-gated. Rollback by deploying the previous tag:

```bash
# 1. Find the previous release tag
git tag --sort=-version:refname | head -5

# 2. Trigger production deployment with the previous tag
gh workflow run deploy.yml \
  --ref <previous-tag> \
  -f environment=production

# 3. Verify
curl -s "https://<production-api-url>/health" | jq .
```

---

## 4. Post-Rollback Actions

| Step | Action | Owner |
|------|--------|-------|
| 1 | Verify rollback succeeded (health check + smoke test) | On-call |
| 2 | Create GitHub issue with `incident` label | On-call |
| 3 | Notify stakeholders of rollback and current status | On-call |
| 4 | Root cause analysis — identify the breaking change | Developer |
| 5 | Write regression test covering the failure | Developer |
| 6 | Fix forward — create hotfix branch from last good tag | Developer |
| 7 | Update release gates if a new check is needed | Developer |

---

## 5. Rollback Scope Reference

| Component | Rollback Method | Data Impact |
|-----------|----------------|-------------|
| Frontend (GitHub Pages) | Revert commit or re-run workflow | None (client-side only) |
| Frontend (SWA staging) | Re-deploy previous build | None |
| API (Container App) | Activate previous revision | None if no DB migration |
| Database | Run down migration | Potential data loss — requires review |
| localStorage | Schema version check handles gracefully | User may need to re-import |

---

## 6. Communication Template

```
Subject: [CloudBlocks] Rollback — v{version}

Status: ROLLED BACK to v{previous-version}
Time: {timestamp}
Impact: {description of user impact}
Cause: {brief root cause or "under investigation"}
Next: {hotfix ETA or "monitoring"}
```

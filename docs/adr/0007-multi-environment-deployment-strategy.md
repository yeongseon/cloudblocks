# ADR-0007: Multi-Environment Deployment Strategy

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks needs staging and production environments on Azure. Currently only a dev environment exists.

The current Terraform and deployment flow are single-environment oriented:
- Terraform is implemented as one monolithic stack in `infra/terraform/environments/dev/`
- GitHub Actions deployment uses a single set of repository-level Azure secrets
- Promotion flow between environments is not defined

Key questions:
- How many cloud environments should be operated?
- How should infrastructure code be shared across environments?
- How should changes be promoted from staging to production?
- How should local development relate to cloud deployment?

## Decision

- Use two cloud environments:
  - `staging`: auto-deploy on push to `main`
  - `production`: manual promotion after staging verification
- Extract a shared Terraform module at `infra/terraform/modules/cloudblocks-stack/` and invoke it via thin environment wrappers:
  - `infra/terraform/environments/staging/`
  - `infra/terraform/environments/production/`
- Provision ACR in staging and reference the same registry from production.
- Use GitHub Environments for environment-scoped secrets and governance:
  - `staging` environment for non-production deploy secrets
  - `production` environment with required reviewers for promotion control
- Keep local development on Docker Compose. Terraform is for cloud environments only.

## Consequences

- Reduced blast radius: staging catches deployment and configuration issues before production.
- DRY infrastructure: one shared module with per-environment inputs and separate state.
- Better secret isolation: environment-scoped secrets reduce accidental cross-environment usage.
- Slightly increased complexity:
  - Two Terraform state files (`staging`, `production`)
  - Environment-specific variable management and workflow controls
- Increased cloud cost due to two environments, mitigated by scale-to-zero and smaller SKUs in staging.

Estimated monthly cost impact:
- `staging`: about $80/month
- `production`: about $250/month

# CloudBlocks Environment Strategy

## 1. Overview

CloudBlocks uses a progressive deployment pipeline:

`Local (Docker Compose) -> Staging (Azure, automatic) -> Production (Azure, manual promotion)`

- **Local** is the fastest feedback loop for development and debugging.
- **Staging** validates infrastructure and application changes in cloud conditions.
- **Production** receives only promoted, verified artifacts.

## 2. Environment Matrix

| Dimension      | Local          | Staging                | Production                      |
| -------------- | -------------- | ---------------------- | ------------------------------- |
| Trigger        | manual         | push to `main`         | `workflow_dispatch` (promotion) |
| Runtime        | Docker Compose | Azure managed services | Azure managed services          |
| SKUs           | Docker         | Basic                  | Standard + GP                   |
| API replicas   | 1              | 0-3                    | 2-5                             |
| ACR            | N/A            | Provisions shared ACR  | References staging ACR          |
| PostgreSQL     | Docker         | `B_Standard_B1ms`      | `GP_Standard_D2s_v3`            |
| Redis          | Docker         | Basic C0               | Standard C1                     |
| Estimated cost | $0             | ~$80/month             | ~$250/month                     |

## 3. Infrastructure Layout

Planned Terraform layout for multi-environment deployment:

```text
infra/terraform/
|- modules/cloudblocks-stack/    <- Shared module (Phase B)
|- environments/staging/         <- Staging wrapper (Phase B)
|- environments/production/      <- Production wrapper (Phase B)
`- environments/dev/             <- Legacy (deprecated)
```

Notes:

- `environments/dev/` remains available temporarily for compatibility.
- New cloud deployments should target staging/production wrappers once implemented.

## 4. Naming Convention

Use the pattern `{type}-cloudblocks-{env}` for Azure resources.

Examples:

- Resource group: `rg-cloudblocks-staging`, `rg-cloudblocks-production`
- Log Analytics workspace: `law-cloudblocks-staging`
- Container App environment: `cae-cloudblocks-production`
- API Container App: `ca-cloudblocks-api-staging`

## 5. Secret Management

Use GitHub Environments to scope secrets and deployment controls:

- **Environment `staging`**
  - Holds staging Azure credentials and resource identifiers.
  - Allows automatic deployment from `main`.
- **Environment `production`**
  - Holds production Azure credentials and resource identifiers.
  - Requires reviewers before deployment approval.

Guidelines:

- Do not use shared repository-level secrets for both cloud environments.
- Keep secret names consistent across environments where possible.
- Rotate production credentials on schedule and after incidents.

## 6. Deployment Flow

1. CI validates code (lint/build/test).
2. Build job publishes image artifact/tag.
3. Staging deploy runs automatically on push to `main`.
4. Team verifies staging health and behavior.
5. Production deploy is triggered manually (`workflow_dispatch`) and approved via required reviewers.

This creates an explicit promotion gate between staging and production.

## 7. Rollback

Rollback uses redeployment of a previously known-good image tag:

1. Identify the last healthy tag from deployment history.
2. Trigger deployment via `workflow_dispatch` with that tag.
3. Verify `/health` and smoke checks.
4. Record rollback cause and follow-up actions.

No Terraform rollback is required for normal application rollback scenarios.

## 8. Cost Breakdown

Estimated monthly environment cost targets:

| Environment | Estimated Monthly Cost | Notes                                            |
| ----------- | ---------------------- | ------------------------------------------------ |
| Local       | $0                     | Runs on developer machine via Docker Compose     |
| Staging     | ~$80                   | Lower SKUs, scale-to-zero for API where possible |
| Production  | ~$250                  | Higher availability and capacity SKUs            |

Cost control guidance:

- Keep staging autoscaling minimum replicas at 0 when acceptable.
- Use lower-cost SKUs in staging by default.
- Review idle resource usage monthly.

# CloudBlocks Deployment Guide

## Canonical Deploy Vocabulary

| Term             | Definition                                                                     | Usage                                     |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| **Deploy**       | Push a new version of the application to a target environment                  | "Deploy to staging"                       |
| **Promote**      | Move a validated staging build to production without rebuilding                | "Promote staging image to production"     |
| **Rollback**     | Revert an environment to a previously known-good version                       | "Rollback production to previous version" |
| **Pipeline**     | An automated CI/CD workflow (GitHub Actions)                                   | "The CI pipeline passed"                  |
| **Environment**  | A deployment target: `local`, `staging`, or `production`                       | "The staging environment is healthy"      |
| **Revision**     | A specific deployed instance of the application (Azure Container Apps concept) | "New revision is active"                  |
| **Image Tag**    | The unique identifier for a container image (git SHA)                          | "Promote image tag abc123..."             |
| **Health Check** | Automated verification that a deployment is serving correctly                  | "Health check passed"                     |

## Environment Names

Always use full names, never abbreviations:

- `local` — Local development environment (no cloud deployment)
- `staging` — Pre-production environment for validation
- `production` — Live environment serving real users

## Deployment Flow

1. Code merges to `main` branch
2. CI pipeline runs (lint, test, typecheck)
3. **Deploy to staging** — Build image, push to ACR, deploy to staging Container App + SWA
4. Manual validation on staging
5. **Promote to production** — Same image tag deployed to production (no rebuild)
6. Health checks verify production deployment

## Rollback Flow

1. Identify the last known-good image tag (git SHA)
2. Trigger production rollback with the known-good tag
3. Health checks verify the rollback succeeded

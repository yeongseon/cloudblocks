# CloudBlocks CI/CD Templates

A collection of CI/CD workflow templates designed to automate infrastructure-as-code processes for CloudBlocks-generated Terraform configurations.

## Overview

These templates enable continuous integration and deployment workflows for CloudBlocks architecture changes. Currently included:

- `terraform-plan.yml` — Automatically runs Terraform plan when `cloudblocks/architecture.json` changes in a pull request

## Installation

1. Copy the workflow file to your repository:

```bash
mkdir -p .github/workflows
cp terraform-plan.yml .github/workflows/
```

2. Ensure your repository structure includes:

```
.
├── .github/workflows/terraform-plan.yml
├── cloudblocks/
│   └── architecture.json
└── infra/
    ├── main.tf
    ├── variables.tf
    └── terraform.tfvars
```

3. Configure your Terraform backend and variables as needed in `infra/terraform.tfvars`.

4. Push the workflow file to your repository and enable GitHub Actions if not already enabled.

## Prerequisites

- GitHub repository with Actions enabled
- Terraform installed locally (for testing)
- CloudBlocks-generated Terraform code in the `infra/` directory
- `cloudblocks/architecture.json` committed to the repository

## How It Works

The Terraform Plan workflow:

1. Triggers on pull requests that modify `cloudblocks/architecture.json`
2. Checks out the repository
3. Initializes Terraform in the `infra/` directory
4. Runs `terraform plan` and captures the output
5. Posts the plan output as a collapsible comment on the pull request
6. Reports success or failure in the comment

## Customization

To customize the workflow, edit `.github/workflows/terraform-plan.yml`:

- **Change the trigger path**: Modify the `paths` under `on.pull_request` to monitor different files
- **Change the Terraform directory**: Update the `working-directory` in steps that run Terraform commands
- **Add additional steps**: Insert additional steps before or after the plan to run other commands (e.g., `terraform validate`, `tflint`)
- **Configure variables**: Use GitHub repository or organization secrets for sensitive Terraform variables

### Example: Add Terraform validation

```yaml
- name: Terraform Validate
  run: terraform validate
  working-directory: ./infra
```

## Environment Variables

The workflow uses the following configurable environment variable:

- `TF_VAR_FILE`: Path to Terraform variables file (default: `terraform.tfvars`)

Set this via GitHub repository variables or organization variables as needed.

## License

Apache-2.0

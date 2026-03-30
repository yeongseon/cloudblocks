# Plan: Multi-Cloud Terraform Starter Generation

**Epic**: #1509 — [Epic] Multi-Cloud Terraform Starter Generation
**Goal**: Extend Terraform code generation from Azure-only to Azure + AWS + GCP.

---

## Architecture Decision

**Option C (Strategy pattern)** — extend `TerraformProviderConfig` with render hooks. `terraform.ts` remains the single orchestrator. Each provider definition implements its own hooks.

Oracle consultation confirmed this is the lowest-risk approach:

- Option A (declarative fields): Would become disguised imperative code for nested HCL bodies
- Option B (per-provider files): Duplicates ordering/naming/connection logic across 3 files too early for V1

### New Interface (extends existing `TerraformProviderConfig` in `apps/web/src/features/generate/types.ts`)

```typescript
interface TerraformRenderContext {
  normalized: NormalizedModel;
  options: GenerationOptions;
  resourceNames: Map<string, string>;
}

interface TerraformContainerContext extends TerraformRenderContext {
  container: ContainerBlock;
  mapping: ResourceMapping;
  resourceName: string;
  parentResourceName: string | null;
}

interface TerraformBlockContext extends TerraformRenderContext {
  block: ResourceBlock;
  mapping: ResourceMapping;
  resourceName: string;
  parentResourceName: string | null;
}

interface TerraformOutputSpec {
  name: string;
  value: string;
}

interface TerraformProviderConfig {
  // Existing (unchanged)
  requiredProviders: () => string;
  providerBlock: (region: string) => string;

  // New hooks
  regionVariableDescription?: string; // default: "Deployment region"
  renderScaffold?: (ctx: TerraformRenderContext) => string[]; // default: []
  renderContainerBody: (ctx: TerraformContainerContext) => string[];
  renderImplicitResources?: (ctx: TerraformBlockContext) => string[]; // default: []
  renderBlockBody: (ctx: TerraformBlockContext) => string[];
  extraOutputs?: (ctx: TerraformRenderContext) => TerraformOutputSpec[]; // default: []
}
```

### Escalation trigger

If provider hooks grow >100 lines each, refactor to `terraform/common.ts` + `terraform/{azure,aws,gcp}.ts` (Option B).

---

## Sub-Issues

### #1510 — refactor(web): extract Terraform render hooks and restore Azure parity

**Size**: L
**Branch**: `refactor/1510-terraform-render-hooks`
**Dependencies**: None (first in sequence)
**Goal**: Refactor `terraform.ts` to use hooks, move Azure-specific code into Azure provider definition. Azure output must be byte-identical.

**Files to change**:

| File                                                                                                                                                                                                                                                                                                       | Change                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/generate/types.ts` (line 126–129)                                                                                                                                                                                                                                                   | Extend `TerraformProviderConfig` with new context types and hook signatures                                                                                                           |
| `apps/web/src/features/generate/providers/azure/index.ts` (line 155–178, `generators.terraform`)                                                                                                                                                                                                           | Add `renderScaffold`, `renderContainerBody`, `renderImplicitResources`, `renderBlockBody`, `extraOutputs`, `regionVariableDescription` implementations — move logic from terraform.ts |
| `apps/web/src/features/generate/terraform.ts` (lines 110–149 `generateImplicitResources`, 153–187 `generatePlateResource`, 189–243 `generateBlockResource`, 265–307 scaffold in `generateMainTf`, 383 variable description in `generateVariablesTf`, 413–415 resource_group output in `generateOutputsTf`) | Replace hardcoded Azure logic with hook calls                                                                                                                                         |
| `apps/web/src/features/generate/providers/aws/index.ts` (line 100–115, `generators.terraform`)                                                                                                                                                                                                             | Add stub hooks: `renderContainerBody: () => []`, `renderBlockBody: () => ['  # TODO: ...']`                                                                                           |
| `apps/web/src/features/generate/providers/gcp/index.ts` (line 98–113, `generators.terraform`)                                                                                                                                                                                                              | Add stub hooks: `renderContainerBody: () => []`, `renderBlockBody: () => ['  # TODO: ...']`                                                                                           |
| `apps/web/src/features/generate/terraformPlugin.test.ts` (line 78)                                                                                                                                                                                                                                         | Existing `supportedProviders` assertion stays `['azure']` — add hook-call unit test                                                                                                   |
| `apps/web/src/features/generate/terraform.test.ts`                                                                                                                                                                                                                                                         | Azure snapshot tests must pass unchanged                                                                                                                                              |

**Acceptance criteria**:

- [ ] Azure Terraform output is byte-identical to current output (snapshot comparison)
- [ ] All existing tests pass without modification to assertions
- [ ] `terraform.ts` contains zero `azurerm_*` string literals
- [ ] `terraform.ts` contains zero `resource_group` string literals
- [ ] `terraform.ts` contains zero `service_plan` string literals
- [ ] New `TerraformProviderConfig` types are exported from `types.ts`
- [ ] AWS and GCP provider definitions compile with stub hooks
- [ ] `supportedProviders` remains `['azure']`
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Branch coverage >= 90%

---

### #1511 — feat(web): AWS Terraform starter generation

**Size**: M
**Branch**: `feat/1511-aws-terraform-generation`
**Dependencies**: #1510
**Goal**: Implement AWS render hooks and unlock AWS in Terraform plugin.

**Files to change**:

| File                                                                                           | Change                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/generate/providers/aws/index.ts` (line 100–115, `generators.terraform`) | Replace stub hooks with full AWS implementations: `renderContainerBody` (VPC tags, subnet vpc_id+cidr+az), `renderBlockBody` (per-category: EC2 ami+instance_type, RDS engine+class, Lambda runtime+handler, S3 bucket, ALB type, SQS/SNS stubs, DynamoDB hash_key) |
| `apps/web/src/features/generate/terraformPlugin.ts` (line 14)                                  | Change `supportedProviders: ['azure']` to `['azure', 'aws']`                                                                                                                                                                                                        |
| `apps/web/src/features/generate/terraformPlugin.test.ts` (line 78)                             | Update assertion to `['azure', 'aws']`, add AWS smoke test                                                                                                                                                                                                          |
| `apps/web/src/features/generate/pipeline.test.ts`                                              | Add test: `generateCode()` with `provider: 'aws'` does not throw                                                                                                                                                                                                    |

**Acceptance criteria**:

- [ ] AWS users see Terraform in CodePreview generator dropdown
- [ ] Generated `main.tf` contains `provider "aws"` and `hashicorp/aws`
- [ ] Generated `main.tf` contains `aws_vpc` for VPC containers and `aws_subnet` for subnets
- [ ] Generated `main.tf` contains appropriate AWS resource types for all 8 block categories
- [ ] Generated `variables.tf` says "AWS region" not "Azure region"
- [ ] No `azurerm_*` strings in AWS-generated output
- [ ] No `resource_group` references in AWS output
- [ ] Azure output is unaffected (existing tests pass)
- [ ] `pnpm build` && `pnpm lint` pass
- [ ] Branch coverage >= 90%

---

### #1512 — feat(web): GCP Terraform starter generation

**Size**: M
**Branch**: `feat/1512-gcp-terraform-generation`
**Dependencies**: #1510 (parallelizable with #1511)
**Goal**: Implement GCP render hooks and unlock GCP in Terraform plugin.

**Files to change**:

| File                                                                                          | Change                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/generate/providers/gcp/index.ts` (line 98–113, `generators.terraform`) | Replace stub hooks with full GCP implementations: `renderContainerBody` (google_compute_network name+auto_create, subnetwork network+cidr+region), `renderBlockBody` (per-category: Compute Engine machine_type+zone+boot_disk, Cloud Run template, Cloud SQL version+tier, Cloud Storage name+location, Pub/Sub stubs) |
| `apps/web/src/features/generate/terraformPlugin.ts` (line 14)                                 | Change `supportedProviders` to `['azure', 'aws', 'gcp']`                                                                                                                                                                                                                                                                |
| `apps/web/src/features/generate/terraformPlugin.test.ts` (line 78)                            | Update assertion to `['azure', 'aws', 'gcp']`, add GCP smoke test                                                                                                                                                                                                                                                       |
| `apps/web/src/features/generate/pipeline.test.ts`                                             | Add test: `generateCode()` with `provider: 'gcp'` does not throw                                                                                                                                                                                                                                                        |

**Acceptance criteria**:

- [ ] GCP users see Terraform in CodePreview generator dropdown
- [ ] Generated `main.tf` contains `provider "google"` and `hashicorp/google`
- [ ] Generated `main.tf` contains `google_compute_network` for VPC containers and `google_compute_subnetwork` for subnets
- [ ] Generated `main.tf` contains appropriate GCP resource types for all 8 block categories
- [ ] Generated `variables.tf` says "GCP region"
- [ ] No `azurerm_*` or `aws_*` strings in GCP output
- [ ] Azure and AWS output unaffected
- [ ] `pnpm build` && `pnpm lint` pass
- [ ] Branch coverage >= 90%

---

### #1513 — fix(web): multi-cloud pipeline plumbing

**Size**: S
**Branch**: `fix/1513-multicloud-pipeline-plumbing`
**Dependencies**: #1511 + #1512
**Goal**: AWS/GCP region validation and CodePreview empty-state UX.

**Files to change**:

| File                                                                         | Change                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/src/features/generate/types.ts` (after line 240)                   | Add `AWS_REGIONS` and `GCP_REGIONS` allowlists, `isValidAwsRegion()`, `isValidGcpRegion()` |
| `apps/web/src/features/generate/pipeline.ts` (lines 33–43, `validateRegion`) | Extend to validate AWS and GCP regions via switch                                          |
| `apps/web/src/widgets/code-preview/CodePreview.tsx` (around line 42–48)      | Add empty-state message when `generatorOptions.length === 0`                               |
| `apps/web/src/widgets/code-preview/CodePreview.css`                          | Style the empty state                                                                      |
| `apps/web/src/features/generate/pipeline.test.ts`                            | Add AWS/GCP region validation tests                                                        |
| `apps/web/src/widgets/code-preview/CodePreview.test.tsx`                     | Add empty generator state test                                                             |

**Acceptance criteria**:

- [ ] Invalid AWS regions throw `GenerationError`
- [ ] Invalid GCP regions throw `GenerationError`
- [ ] Azure validation unchanged
- [ ] CodePreview shows informative message when no generators support active provider
- [ ] `pnpm build` && `pnpm lint` pass
- [ ] Branch coverage >= 90%

---

### #1514 — docs: align code generation documentation

**Size**: S
**Branch**: `docs/1514-multicloud-generation-docs`
**Dependencies**: #1513
**Goal**: Documentation reflects actual multi-cloud generation capabilities.

**Files to change**:

| File                                  | Change                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/advanced/code-generation.md`    | Add Azure/AWS/GCP examples, note `# TODO` comments, clarify Bicep/Pulumi scope |
| `docs/user-guide/provider-support.md` | Update provider × generator support matrix                                     |
| `docs/concept/COMPATIBILITY.md`       | Update provider capabilities section                                           |
| `docs/README.md`                      | Update feature descriptions                                                    |

**Acceptance criteria**:

- [ ] `code-generation.md` includes examples for all 3 providers
- [ ] `provider-support.md` has accurate Terraform/Bicep/Pulumi × provider matrix
- [ ] No claims of features that don't exist
- [ ] No edits to immutable historical documents
- [ ] All documentation in English
- [ ] `pnpm build` passes

---

## Dependency Graph

```
#1510 (hooks refactor, size/L)
  ├── #1511 (AWS, size/M)
  │     └── #1513 (plumbing, size/S)
  └── #1512 (GCP, size/M)
        └── #1513 (plumbing, size/S)
                └── #1514 (docs, size/S)
```

#1511 and #1512 are parallelizable after #1510 merges.

## Constraints

- V1 starter code — use `# TODO` for required args the model doesn't capture
- Bicep stays Azure-only (correct by design)
- Pulumi multi-cloud is V2 scope (not in this Epic)
- Historical docs immutable per AGENTS.md
- No new Zustand stores per AGENTS.md
- English only per AGENTS.md

## Risks

1. **Provider hooks growing too large** — Mitigated by escalation trigger (>100 lines → Option B refactor)
2. **Azure output regression** — Mitigated by byte-identical snapshot requirement in #1510
3. **AWS/GCP starter code validity** — Mitigated by V1 "starter code" framing + `# TODO` comments
4. **Service plan being subtype-unaware** — Oracle flagged that `hasCompute` check currently applies service_plan to VMs/AKS too. Address in Azure hook implementation (#1510)

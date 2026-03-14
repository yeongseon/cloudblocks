# Infrastructure Code Generator

> **This is the canonical source** for the CloudBlocks code generation pipeline. All other documents (DOMAIN_MODEL.md, ARCHITECTURE.md, PRD.md) reference this document for pipeline details.
>
> **Status**: Design specification only — not yet implemented. Planned for v0.3.

CloudBlocks converts architecture models into infrastructure code.

```
Architecture Model
    ↓
Generator
    ↓
Infrastructure Code (Terraform, Bicep, Pulumi)
```

---

## Generator Architecture

```
model
  ↓
generator-core
  ↓
provider-adapter
  ↓
iac-code
```

---

## Generator Pipeline

The generation pipeline has 5 stages. Each stage is a pure function — no side effects, no external I/O.

### Step 1 — Normalize Model

Normalize the architecture model into a canonical, generation-safe form (stable IDs, resolved references, defaults).

```
normalize(architectureModel) → NormalizedModel
```

**Responsibilities:**
- Resolve all ID references (ensure `placementId`, `sourceId`, `targetId` point to valid entities)
- Apply default values for optional fields
- Sort entities for deterministic output (plates by ID, blocks by ID, connections by ID)
- Strip transient UI state (selection, hover, etc.)

**Error handling:** Throws `NormalizationError` if unresolvable references are found.

### Step 2 — Validate

Run schema validation and rule engine checks before generation.

```
validate(normalizedModel) → ValidationResult
```

**Responsibilities:**
- Verify structural invariants (see DOMAIN_MODEL.md §2)
- Run placement rules and connection rules
- Return errors/warnings — generation halts on errors

**Error handling:** Returns `ValidationResult`. If `valid === false`, the pipeline stops and returns errors to the caller. Generation never proceeds with an invalid model.

### Step 3 — Provider Mapping

Map generic infrastructure blocks to provider-specific resources.

```
mapToProvider(normalizedModel, provider) → ProviderMappedModel
```

**Example mapping:**

| Block | Azure | AWS | GCP |
|-------|-------|-----|-----|
| `compute` | `azurerm_linux_web_app` | `aws_ecs_service` | `google_cloud_run` |
| `storage` | `azurerm_storage_account` | `s3_bucket` | `gcs_bucket` |
| `database` | `azurerm_mssql_server` | `aws_db_instance` | `google_sql_database_instance` |
| `gateway` | `azurerm_application_gateway` | `aws_lb` | `google_compute_url_map` |

See [provider.md](./provider.md) for full provider abstraction details.

**Error handling:** Throws `ProviderMappingError` if a block category has no mapping for the selected provider.

### Step 4 — Generate

Generate IaC modules from provider-mapped model.

```
generate(providerMappedModel, format) → GeneratedFiles[]
```

**Responsibilities:**
- Produce resource definitions in the target format (HCL, Bicep, TypeScript)
- Generate variable declarations and outputs
- Create module structure with proper cross-references

### Step 5 — Format

Assemble final output files and directory structure for commit/export.

```
format(generatedFiles) → GeneratedOutput
```

**Example Terraform output:**

```hcl
module "compute" {
  source = "./modules/compute"
}
```

**Output directory structure:**

```
infra/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
```

---

## Generator Interface

```typescript
interface Generator {
  name: string;
  version: string;
  supportedProviders: string[];
  generate(architecture: ArchitectureModel, options: GeneratorOptions): GeneratedOutput;
}

interface GeneratorOptions {
  provider: 'azure' | 'aws' | 'gcp';
  outputFormat: 'terraform' | 'bicep' | 'pulumi';
  templateOverrides?: Record<string, unknown>;
}

interface GeneratedOutput {
  files: GeneratedFile[];
  metadata: {
    generator: string;
    version: string;
    provider: string;
    generatedAt: string;
  };
}

interface GeneratedFile {
  path: string;      // e.g., "main.tf"
  content: string;   // file content
  language: string;  // e.g., "hcl", "bicep", "typescript"
}
```

---

## Generator Types

Supported generators:

| Generator | Target | Priority |
|-----------|--------|----------|
| `terraform` | Multi-cloud | Primary (v0.3) |
| `bicep` | Azure | v0.5 |
| `pulumi` | Code-based IaC | v1.0 |
| `yaml` | Documentation | v1.0 |

---

## Deterministic Generation

Code generation **must** be deterministic.

**Same architecture model → same output code.**

This is a hard requirement, not a guideline. Determinism enables:

- Reliable `git diff` — only real architecture changes produce code changes
- CI/CD trust — reruns produce identical output
- Review confidence — reviewers see only intentional changes

### How determinism is enforced:

1. **Normalization** (Step 1) sorts all entities by ID before generation
2. **No timestamps** in generated code (timestamps go in `GeneratedOutput.metadata` only)
3. **No random values** — all identifiers are derived from the architecture model
4. **Provider mapping** is a pure function with no external state

---

## Error Handling

| Stage | Error Type | Behavior |
|-------|-----------|----------|
| Normalize | `NormalizationError` | Pipeline stops. Returns unresolvable reference details. |
| Validate | `ValidationResult.valid === false` | Pipeline stops. Returns all errors and warnings. |
| Provider Map | `ProviderMappingError` | Pipeline stops. Returns unmapped block categories. |
| Generate | `GenerationError` | Pipeline stops. Returns partial output + error details. |
| Format | `FormatError` | Pipeline stops. Returns formatting failure details. |

All errors include enough context for the UI to display actionable feedback to the user.

---

## Planned Features

Future generator capabilities:

- Partial regeneration (regenerate only changed blocks)
- Infrastructure diff detection (compare current vs. generated)
- Git integration (commit generated code to branches, create PRs)

---

> **Cross-references:**
> - Architecture model: [model.md](../model/model.md)
> - Provider adapters: [provider.md](./provider.md)
> - Validation before generation: [rules.md](./rules.md)
> - Domain model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Roadmap timeline: [ROADMAP.md](../concept/ROADMAP.md)

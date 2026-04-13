# Infrastructure Code Generator

> **Audience**: Contributors | **Status**: Internal | **Verified against**: v0.43.0

> **This is the canonical source** for the CloudBlocks code generation pipeline. All other documents (DOMAIN_MODEL.md, ARCHITECTURE.md, PRD.md) reference this document for pipeline details.
> **Status**: Implemented. Terraform starter export is a V1 Core learning feature. Bicep and Pulumi generators are Experimental.
>
> **V1 Note**: Terraform starter export is available as a **V1 Core** feature for learning and prototyping. Bicep and Pulumi are **Experimental** and will be evaluated in V2 (Export stage). See `ROADMAP.md` (internal, excluded from public docs) for the product evolution plan.

CloudBlocks converts architecture models into infrastructure code. In V1, Terraform starter export is a **core learning feature** — it helps beginners understand what their visual architecture looks like as infrastructure-as-code. Bicep and Pulumi exports are Experimental.

```
Architecture Model
    ↓
Generator
    ↓
Infrastructure Code (Terraform starter, Bicep*, Pulumi*)
    * Experimental
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
- Sort entities for deterministic output (container blocks by ID, blocks by ID, connections by ID)
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

**Example:** A `compute` block maps to `azurerm_linux_web_app` (Azure), `aws_instance` (AWS), or `google_cloud_run_v2_service` (GCP).

See [provider.md](./provider.md) for the complete provider mapping table and adapter specification.

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
interface GeneratorPipeline {
  generate: (architecture: ArchitectureModel, options: GenerationOptions) => GeneratedOutput;
}

interface GenerationOptions {
  /** Target cloud provider */
  provider: 'azure' | 'aws' | 'gcp';
  /** draft = inline preview, production = full module structure */
  mode: 'draft' | 'production';
  /** Project name for resource naming */
  projectName: string;
  /** Azure region or equivalent */
  region: string;
}

interface GeneratedOutput {
  files: GeneratedFile[];
  metadata: GenerationMetadata;
}

interface GeneratedFile {
  path: string; // e.g., "main.tf"
  content: string; // file content
  language: FileLanguage;
}

type KnownLanguage = 'hcl' | 'json' | 'bicep' | 'typescript';
type FileLanguage = KnownLanguage | (string & {});

interface GenerationMetadata {
  generator: string;
  version: string;
  provider: string;
  generatedAt: string;
}
```

---

## Generator Types

Supported generators:

| Generator   | Target         | Status                                |
| ----------- | -------------- | ------------------------------------- |
| `terraform` | Multi-cloud    | ✅ V1 Core — Terraform Starter Export |
| `bicep`     | Azure          | ⚗️ Experimental                       |
| `pulumi`    | Code-based IaC | ⚗️ Experimental                       |
| `yaml`      | Documentation  | Planned (later milestone)             |

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

| Stage        | Error Type                         | Behavior                                                |
| ------------ | ---------------------------------- | ------------------------------------------------------- |
| Normalize    | `NormalizationError`               | Pipeline stops. Returns unresolvable reference details. |
| Validate     | `ValidationResult.valid === false` | Pipeline stops. Returns all errors and warnings.        |
| Provider Map | `ProviderMappingError`             | Pipeline stops. Returns unmapped block categories.      |
| Generate     | `GenerationError`                  | Pipeline stops. Returns partial output + error details. |
| Format       | `FormatError`                      | Pipeline stops. Returns formatting failure details.     |

All errors include enough context for the UI to display actionable feedback to the user.

---

## Provider-Aware Learning

CloudBlocks supports Azure, AWS, and GCP for code generation. Provider coverage varies by template, resource, and export path. The Terraform starter export works across all three providers. Bicep is Azure-only. Pulumi is Azure-only.

This is a pragmatic scope decision, not a lock-in — the provider-neutral DSL ensures any architecture can be retargeted to any supported provider.

---

## Generation Modes

The generator supports two modes:

| Mode           | Purpose                       | Output                                                   |
| -------------- | ----------------------------- | -------------------------------------------------------- |
| **Draft**      | Quick preview during learning | Minimal output, no variable extraction, inline values    |
| **Production** | Full starter code for export  | Full module structure, variables, outputs, documentation |

Draft mode enables fast feedback in the UI code preview panel. Production mode generates complete starter code for export.

---

## Non-Goals

The generator explicitly does NOT:

- **Execute infrastructure** — generation produces code files, not deployments
- **Manage state** — Terraform state, Pulumi state, etc. are managed by the IaC tool, not CloudBlocks
- **Monitor infrastructure** — runtime monitoring is outside the generator scope
- **Reverse-engineer existing infra** — CloudBlocks is architecture-to-code, not code-to-architecture

---

## Planned Features

Future generator capabilities (planned for V2 Export stage):

- Partial regeneration (regenerate only changed blocks)
- Infrastructure diff detection (compare current vs. generated)
- Git integration (commit generated code to branches, create PRs)
- Strong export guarantees (V2)

---

> **Cross-references:**
>
> - Architecture model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Provider adapters: [provider.md](./provider.md)
> - Validation before generation: [rules.md](./rules.md)
> - Domain model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)
> - Roadmap timeline: `ROADMAP.md` (internal, excluded from public docs)

# Provider Definition Specification

> **Audience**: Contributors | **Status**: Stable — Internal | **Verified against**: v0.26.0

CloudBlocks uses `ProviderDefinition` as the canonical provider abstraction for generation.

This keeps the architecture model provider-neutral while allowing Terraform, Bicep, and Pulumi output from the same model.

---

# Purpose

The provider layer exists to:

- map generic block concepts to provider resources
- preserve provider-neutral modeling in the architecture DSL
- enable consistent multi-generator output from one provider definition
- surface unsupported mappings explicitly instead of silently dropping resources

---

# Canonical Abstraction: `ProviderDefinition`

`ProviderDefinition` is the single source of truth for provider generation behavior.

```ts
interface ProviderDefinition {
  name: ProviderType;
  displayName: string;
  blockMappings: BlockResourceMap;
  containerBlockMappings: ContainerBlockResourceMap;
  generators: {
    terraform: TerraformProviderConfig;
    bicep: BicepProviderConfig;
    pulumi: PulumiProviderConfig;
  };
  subtypeBlockMappings?: SubtypeResourceMap;
}
```

## `generators` section

Every provider definition includes generator-specific settings:

- `terraform: TerraformProviderConfig`
  - `requiredProviders(): string`
  - `providerBlock(region: string): string`
- `bicep: BicepProviderConfig`
  - `targetScope: 'resourceGroup' | 'subscription'`
- `pulumi: PulumiProviderConfig`
  - `packageName: string`
  - `runtime: 'nodejs'`

---

# Subtype-Aware Resource Resolution

Use `subtypeBlockMappings` when a block category has multiple provider resources depending on subtype.

- base mapping: `blockMappings[category]`
- subtype override: `subtypeBlockMappings[category][subtype]`

### `resolveBlockMapping()`

`resolveBlockMapping(blockMappings, subtypeMappings, category, subtype?)` resolves in this order:

1. Return subtype mapping when `subtype` is provided and exists
2. Otherwise return `blockMappings[category]`
3. Return `undefined` when neither mapping exists

This gives deterministic fallback behavior while supporting subtype precision.

---

# Generation Pipeline Flow

Provider resolution is part of the generation pipeline:

1. `validate` - run generator/plugin validation rules
2. `resolve provider` - load `ProviderDefinition` by target provider
3. `normalize` - convert architecture into generator-ready normalized model
4. `generate` - produce files using provider + generator config
5. `format` - apply optional generator formatter pass

Pipeline stages are pure and deterministic for the same input model and options.

---

# `ProviderAdapter` Deprecation

`ProviderAdapter` is deprecated and kept only for backward compatibility with older Terraform-only paths.

Migration guidance:

- new provider work must implement `ProviderDefinition`
- new generator capabilities must read from `ProviderDefinition.generators`
- existing `ProviderAdapter` usages should be incrementally migrated to `ProviderDefinition`

---

# Constraints

Provider definitions and resolution logic must:

- not mutate the canonical architecture model
- keep generation deterministic
- report unsupported mappings clearly
- avoid leaking provider-specific semantics back into the DSL

---

> **Cross-references:**
>
> - Generator pipeline: [generator.md](./generator.md)
> - Architecture model: [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md)

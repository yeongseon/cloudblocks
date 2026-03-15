# CloudBlocks Architecture DSL Specification

CloudBlocks defines a domain-specific language (DSL) for describing cloud infrastructure architecture.

The DSL provides a provider-neutral representation of infrastructure topology that can be validated and compiled into infrastructure-as-code.

## Design Goals

The CloudBlocks DSL is designed to satisfy the following principles:

- provider-neutral infrastructure modeling
- visual-first architecture composition
- deterministic infrastructure generation
- rule-based architecture validation

The DSL serves as the canonical representation between the visual diagram editor and infrastructure generators.

## Architecture Model

The CloudBlocks DSL defines infrastructure architecture using a graph-based model.

Core entities:

- Workspace
- Architecture
- Plate
- Block
- Connection

### Workspace

Workspace represents the top-level container for architecture projects. CloudBlocks Phase 1 supports a single architecture per workspace.

> For full field specifications, see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §13 (Workspace Model).

### Architecture

Architecture represents a deployable infrastructure topology.

> For full field specifications, see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §14 (Implementation Schema).

### Plate

Plate represents an infrastructure boundary (VPC, Subnet, Resource Group, Network Zone).

> For full field specifications and plate types, see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §3 (Plate).

### Block

Block represents a deployable infrastructure component (compute, database, storage, gateway).

> For full field specifications and block categories, see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §4-5 (Block).

### Connection

Connection represents a communication flow between blocks. Direction indicates the request initiator. Phase 1 supports `dataflow` only.

> For full field specifications and connection types, see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §6 (Connection).

## Position Model

CloudBlocks stores object positions using a 3D coordinate system.

```
position
  x
  y
  z
```

Axis semantics:

| Axis | Meaning |
|------|---------|
| x | horizontal position |
| z | layout depth |
| y | elevation (used by 2.5D rendering) |

The visual editor operates on the x-z plane.

## Architecture Graph

The architecture model can be interpreted as a directed graph.

Example:

```
gateway → compute → database
compute → storage
```

This graph is used by:

- rule engine
- infrastructure generator

## Architecture Rules

CloudBlocks enforces architecture validation rules (placement constraints and connection rules).

> For the complete rule set (placement rules, connection rules, allowed/disallowed patterns), see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §7 (Rule Engine).

## Infrastructure Generation

The DSL acts as input for infrastructure generators.

Generator pipeline:

```
diagram
→ architecture model
→ dependency graph
→ provider mapping
→ IaC generation
```

Supported infrastructure formats may include:

- Terraform
- Bicep
- Pulumi

## Provider Abstraction

The CloudBlocks DSL remains provider-neutral. Generic block categories (compute, database, storage, gateway) are mapped to provider-specific resources during code generation.

> For the full provider mapping tables and adapter interface, see [provider.md](engine/provider.md).

## Model Versioning

Architecture models include version metadata.

Fields:

- schemaVersion
- modelVersion

These fields ensure compatibility across versions.

## Future Extensions

Planned DSL extensions include:

- multiple architectures per workspace
- additional connection types
- infrastructure metadata
- policy definitions
- multi-cloud deployment targets

## Canonical Representation

The CloudBlocks DSL is the canonical representation of infrastructure architecture.

Visual diagrams are projections of the DSL model.

Infrastructure generators consume the DSL to produce deployment artifacts.

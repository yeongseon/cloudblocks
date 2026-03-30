# CloudBlocks V1 Product Contract

> **Audience**: Beginners | **Status**: Stable — V1 Core | **Verified against**: v0.26.0

This document defines what CloudBlocks v1.0.0 guarantees to its users.

## V1 Core (Guaranteed)

These features are stable, tested, and will not break without a major version bump.

| Feature                  | Description                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Guided Templates         | Start from 6 built-in architecture templates with step-by-step learning scenarios                  |
| Learning Mode            | Interactive guided scenarios to learn cloud architecture patterns (beginner → advanced)            |
| Terraform Starter Export | Export your design to Terraform starter code for learning and prototyping                          |
| Editable Diagrams        | Customize template layouts with drag-and-drop block placement                                      |
| Curated Palette          | 8 resource categories: Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations |
| Block Modeling           | Container blocks (boundaries) + Resource blocks (resources) + typed Connections                    |
| Port System              | Port-based connections with category-aware port policies                                           |
| Visual Theme             | Consistent assembly-board visual language with provider-specific colors                            |
| Multi-Cloud Preview      | Visual preview for Azure, AWS, and GCP (best-effort — provider coverage varies by template)        |
| Workspace Persistence    | Save/load workspaces via localStorage                                                              |
| Validation Engine        | Real-time rule checking for placement and connections                                              |
| Frontend-Only            | Works entirely in the browser — no backend required                                                |

## V1 Advanced (Present, Experimental)

These features exist but are labeled as Experimental or require explicit opt-in.

| Feature            | Description                                         | Label        |
| ------------------ | --------------------------------------------------- | ------------ |
| Free-Form Building | Full resource catalog beyond curated preset palette | Advanced     |
| Bicep Export       | Export to Bicep (Azure only)                        | Experimental |
| Pulumi Export      | Export to Pulumi (Azure only)                       | Experimental |

## Not in V1

These features require the backend API and are not part of the default V1 experience.

- AI-assisted architecture generation
- GitHub OAuth / repository sync / PR workflow
- Cost estimation
- Architecture optimization suggestions

## Deferred to V2+

| Feature                           | Target |
| --------------------------------- | ------ |
| Strong export guarantees          | V2     |
| Starter repo scaffolding          | V2     |
| Hypothesis validation metrics     | V2     |
| Server-side features (GitHub, AI) | V3     |
| Learning paths with progress      | V3     |
| Educator distribution             | V4     |
| Bicep & Pulumi promoted to Stable | V2+ (after Terraform kill switch passes) |

## Version Transition

| Version        | Meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| v0.x (current) | Experimental — APIs and data formats may change                  |
| v1.0.0-beta.1  | First public release — core features stable, collecting feedback |
| v1.0.0         | Baseline — "this product is ready to use" contract begins        |
| v1.x.0         | New features added with backward compatibility                   |
| v2.0.0         | Breaking changes allowed (when needed for Export stage)          |

## What "Stable" Means

For features in V1 Core:

- Workspace data saved in v1.0.0 will load in v1.x.0 (migration provided if format changes)
- UI patterns (block placement, connection, template loading) will not fundamentally change
- No features will be removed without deprecation notice in a prior minor release

See [COMPATIBILITY.md](COMPATIBILITY.md) for the full compatibility and migration policy.

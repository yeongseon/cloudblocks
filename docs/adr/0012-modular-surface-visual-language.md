# ADR-0012: Modular Surface Visual Language

**Status**: Superseded by [ADR-0013](0013-block-unification.md)
**Date**: 2026-03
**Supersedes**: [ADR-0003](0003-lego-style-composition-model.md)
**Superseded by**: [ADR-0013](0013-block-unification.md) — Full terminology unification; plate/brick/stud vocabulary removed from code.

## Context

CloudBlocks originally used "Lego-style" terminology throughout its documentation and visual identity. While the composition model (plates, blocks, connections) remains effective, the branding and naming require a shift to align with product maturity and legal requirements.

The visual language has evolved since the initial "Lego-style" implementation:

- Matte shading (lighten 4 / darken 8, 6, 12) replaced glossy gradients.
- Surface grid lines on plate top faces replaced dense stud patterns.
- A cyan and orange connection color palette replaced saturated primary colors.
- Stud placement became sparse (0-2 per block) as the system moves toward full removal.

There is also a significant legal and trademark risk. "LEGO" is a trademark of the LEGO Group. Using this term to describe an unaffiliated software product creates trademark concerns and potential confusion. Furthermore, as the product targets enterprise users, playful "toy" branding can undermine professional credibility and trust in technical environments.

## Decision

We will adopt "modular surface visual language" as the primary terminology for the product's design system.

1. Replace "Lego-style", "LEGO-style", and "Lego" references in all mutable documentation with "block-based", "modular system", or "modular surface" as contextually appropriate.
2. The fundamental composition model primitives remain unchanged: Plate, Block, and Connection.
3. The `'lego'` theme variant identifier in the codebase remains as-is. This is an internal code identifier and not part of the public prose branding or user-facing documentation.
4. Historical and superseded documents, including BRICK_DESIGN_SPEC.md, VISUAL_DESIGN_SPEC.md, BRICK_GUIDEBOOK.md, ADR-0003, and ADR-0008, are considered immutable snapshots and will not be modified.
5. A new living specification, MODULAR_SURFACE_SPEC.md, will be created to define the current and future visual language requirements.

## Consequences

### Positive

- Eliminates legal risks associated with unauthorized use of the LEGO trademark.
- Establishes a professional brand identity suitable for enterprise cloud architecture tools.
- Ensures consistent terminology across user-facing documentation and marketing.

### Negative

- Historical documents will still reference the old "Lego-style" terminology. This is intentional to preserve the project's decision history, but it may cause minor confusion for new contributors reading older specs.

### Neutral

- The `'lego'` ThemeVariant name persists in the code for now. A future refactor to rename this to `'classic'` or another identifier remains an option but is not a priority for this branding shift.

### Related Documents

- [MODULAR_SURFACE_SPEC.md](../design/MODULAR_SURFACE_SPEC.md)
- [ADR-0003](0003-lego-style-composition-model.md) (superseded)
- [ADR-0011](0011-dual-theme-system.md) (related: theme system)
- [THEME_SYSTEM_SPEC.md](../design/THEME_SYSTEM_SPEC.md)

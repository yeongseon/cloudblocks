# Modular Surface Visual Language Specification

**Status**: Active
**Date**: 2026-03
**Supersedes**: Visual language sections of BRICK_DESIGN_SPEC.md and VISUAL_DESIGN_SPEC.md (historical, immutable)
**Related**: [ADR-0012](../adr/0012-modular-surface-visual-language.md), [CLOUDBLOCKS_SPEC_V2.md](CLOUDBLOCKS_SPEC_V2.md), [THEME_SYSTEM_SPEC.md](THEME_SYSTEM_SPEC.md)

## §0. Design Principles

- **Modular composition**: Plates contain blocks, while blocks connect via typed connections.
- **Professional aesthetic**: Matte surfaces, muted palettes, and clean geometry define the visual style.
- **Functional clarity**: Visual elements communicate architectural meaning rather than decoration.
- **Provider identity**: Resource colors derive from cloud providers such as Azure blue, AWS orange, and GCP colors.
- **Theme independence**: Geometry and layout remain constant across themes. Only color tokens vary between light and dark modes.

## §1. Block Rendering

Blocks use an isometric 2.5D projection (2:1 dimetric) with a matte shading model.

| Face        | Shading Formula       |
| :---------- | :-------------------- |
| Top Face    | base color lighten(4) |
| Left Face   | base color darken(8)  |
| Right Face  | base color darken(6)  |
| Bottom Edge | base color darken(12) |

- **Dimensions**: Defined in Canvas Units (CU) and rendered via a silhouette system.
- **Icons**: Centered on the top face with a subtle drop shadow.
- **Labels**: Resource labels appear directly below the block.

## §2. Plate Rendering

Plates are flat isometric surfaces that represent infrastructure boundaries and support nesting for subnets or nested networks.

- **Surface Grid**: Subtle dotted lines on the top face at regular 1 CU intervals provide visual structure.
- **Grid Color**:
  - Light Theme: rgba(0,0,0,0.06)
  - Dark Theme: rgba(255,255,255,0.08)
- **Titles**: Rendered on the top face at the top-left of the plate.

## §3. Connection Rendering

Connections use a muted, functional color palette to communicate type without labels.

| Semantic | Foreground (Hex) | Background (Hex) |
| :------- | :--------------- | :--------------- |
| HTTP     | #4C78A8          | #2C4A6E          |
| Event    | #6B86B4          | #3E506E          |
| Data     | #5C97A3          | #3A6670          |

- **Routing**: Quadratic curve paths between block endpoints.
- **States**: Hover and selected states increase stroke width by 2px.
- **Width**: Varies by connection type (2–3px default).
- **Dash patterns**: Solid for dataflow/http, short dash for internal, long dash for data, dot-dash for async.

## §4. Stud Policy

Studs are optional indicators of block connectivity. Their removal is currently in progress (PR #1379), and future versions may eliminate them entirely.

- **Placement**: Sparse placement with a maximum of 0 to 2 studs per block face.
- **Standard**: When present, studs follow the Universal Stud Standard (rx=12, ry=6, height=5) with a 3-layer structure.

## §5. Color System

- **Resources**: Blocks use provider-identity colors that remain consistent across themes.
- **Chrome**: UI shell, panels, and the canvas use theme tokens.
- **Themes**:
  - **Professional**: Light theme (default).
  - **Classic**: Dark theme (opt-in).
- Detailed token definitions are available in THEME_SYSTEM_SPEC.md.

## §6. Typography & Labels

| Element     | Font Style              | Size | Position             |
| :---------- | :---------------------- | :--- | :------------------- |
| Block Label | System sans-serif       | 11px | Centered below block |
| Plate Title | System sans-serif, bold | 13px | Top-left of plate    |

Connection types are communicated via color rather than text labels.

## §7. Migration from Historical Specs

BRICK_DESIGN_SPEC.md and VISUAL_DESIGN_SPEC.md are retained as immutable historical documents. This specification serves as the authoritative source for all current and future visual language decisions.

| Feature       | Historical Specs | Modular Surface Spec |
| :------------ | :--------------- | :------------------- |
| Shading       | Glossy           | Matte                |
| Stud Density  | Dense            | Sparse / Optional    |
| Color Palette | Saturated        | Functional / Muted   |

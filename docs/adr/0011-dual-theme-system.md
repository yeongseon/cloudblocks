# ADR-0011: Dual Theme System — Professional and Lego

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks originally shipped with a single visual identity inspired by Lego-style brick building — saturated colors, dark backgrounds, pronounced shadows, and playful visual cues. This aesthetic was encoded in the "blueprint" (dark) and "workshop" (light) theme variants, both sharing a `ThemeTokens` interface with 24 color tokens.

As the product matured through 21 milestones toward a production architecture tool, user feedback and internal assessment revealed a tension:

1. **Enterprise users** expect a clean, professional UI that conveys reliability and precision. The Lego aesthetic, while charming, can undermine credibility in architecture review sessions.
2. **Creative users and learners** value the playful Lego aesthetic — it makes the tool approachable and fun, which aligns with the "Learning Mode" feature.

The existing `blueprint`/`workshop` naming conflated two independent concepts: visual style (Lego vs Professional) and color mode (dark vs light). This made it impossible to offer a professional dark mode or a Lego light mode.

### Constraints

- **User requirement**: Professional theme must be the default; Lego is an opt-in alternative.
- **Scope**: M22 targets "light theme (tokens only)" — same layout, different visual tokens. No geometry or layout changes between themes.
- **Historical documents**: BRICK_DESIGN_SPEC.md, VISUAL_DESIGN_SPEC.md, and BRICK_GUIDEBOOK.md are immutable. New documentation must supersede, not modify.
- **Universal Stud Standard**: Stud dimensions are theme-independent (INVIOLABLE per CLOUDBLOCKS_SPEC_V2.md §2).
- **Vendor colors**: Resource block colors come from cloud providers (CLOUDBLOCKS_SPEC_V2.md §7) and must not be altered by theme selection.

### Options Considered

**Option A: Simple rename — 2 variants**
- `ThemeVariant = 'professional' | 'lego'`
- Professional = refined light theme (default), Lego = playful dark theme
- Simplest. Matches user's "light theme (tokens only)" constraint.

**Option B: Two-dimensional — style × mode (4 variants)**
- `ThemeStyle = 'professional' | 'lego'` × `ThemeMode = 'light' | 'dark'`
- 4 token sets to maintain. More flexible but premature given current needs.

**Option C: Separate toggles — style + mode (4 variants, different UX)**
- Two independent UI toggles. Most flexible, most complex.
- Confusing UX for a pre-1.0 product.

## Decision

**We adopt Option A: two theme variants — `professional` (default) and `lego` (alternative).**

### Specifics

1. **`ThemeVariant = 'professional' | 'lego'`** replaces `'blueprint' | 'workshop'`.
2. **Professional** is a clean, light-background theme optimized for enterprise use. It becomes the default for all new users.
3. **Lego** is a saturated, dark-background theme preserving the original brick-building aesthetic. It is opt-in via the View menu.
4. **Vendor colors are theme-independent** — resource blocks always use provider-identity colors from CLOUDBLOCKS_SPEC_V2.md §7.
5. **Connector colors are theme-independent** — connection lines always use connection-type colors.
6. **CSS custom properties** (`--cb-*`) are adopted as the target architecture for token delivery, with TypeScript objects as the current implementation.
7. **localStorage migration** handles existing `'blueprint'` → `'lego'` and `'workshop'` → `'professional'` values gracefully.
8. **Extension path**: If dark Professional or light Lego are needed later, the `ThemeVariant` type expands to a template literal (`\`${ThemeStyle}-${ThemeMode}\``) with no breaking changes.

### Full specification

See [THEME_SYSTEM_SPEC.md](../design/THEME_SYSTEM_SPEC.md) for token definitions, CSS custom property naming, migration plan, and accessibility requirements.

## Consequences

### Positive

- **Clear product identity**: Professional default signals enterprise readiness; Lego opt-in preserves creative roots.
- **Simple implementation**: 2 token sets vs 4 reduces surface area for bugs and maintenance.
- **Vendor color integrity**: Provider identity is never distorted by theme — Azure blue is always `#0078D4`.
- **Forward-compatible**: The extension path to 4 variants (style × mode) is documented and non-breaking.
- **Instant switching**: Token-only theming means no layout reflow — just color transitions.

### Negative

- **No dark Professional mode** in M22. Users who want a dark theme must use Lego, which carries the playful aesthetic. This is acceptable for a pre-1.0 product; the extension path is documented.
- **Migration burden**: All files referencing `'blueprint'` or `'workshop'` must be updated. TypeScript compiler enforcement mitigates risk.
- **localStorage migration**: Existing users' preferences must be mapped to new values. A one-time migration function handles this.

### Neutral

- Category colors (`cat-*` tokens) currently have identical values across both themes. They may diverge in future milestones if accessibility audits require it.
- Typography and motion tokens remain theme-independent — this is intentional, not a limitation.

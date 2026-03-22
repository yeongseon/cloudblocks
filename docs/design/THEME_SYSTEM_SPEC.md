# CloudBlocks Theme System Specification

**Status**: Draft
**Date**: 2026-03
**Supersedes**: Visual styling sections of BRICK_DESIGN_SPEC.md and VISUAL_DESIGN_SPEC.md
**Related**: [CLOUDBLOCKS_SPEC_V2.md](CLOUDBLOCKS_SPEC_V2.md) §7 (Color System), [ADR-0011](../adr/0011-dual-theme-system.md)

---

## 0. Purpose

This specification defines the **dual theme system** for CloudBlocks. It establishes the Professional theme as the default visual identity and the Lego theme as a fun, playful alternative. Both themes share identical layout, geometry, and interaction — only visual tokens (colors, border-radius, shadows) differ.

### Scope

| In scope | Out of scope |
|----------|-------------|
| Theme token definitions (color, surface, border) | Layout or geometry changes between themes |
| CSS custom property architecture | Vendor-specific resource colors (see V2 spec §7) |
| Theme switching mechanism | Animation or motion token differences |
| Migration plan from `blueprint`/`workshop` naming | Stud dimensions (see V2 spec §2 — INVIOLABLE) |

---

## 1. Design Principles

1. **Tokens, not overrides** — Every visual difference between themes is expressed through a named token. No ad-hoc color values.
2. **Same gauge** — Layout grid, stud dimensions, block sizes, plate proportions, and the Universal Stud Standard (V2 spec §2) are theme-independent.
3. **Provider identity preserved** — Resource colors come from the cloud provider (V2 spec §7). Themes only affect the chrome (UI shell, panels, canvas background), never the resource blocks themselves.
4. **Instant switch** — Theme changes apply immediately with no page reload. Transition duration ≤ 200ms.
5. **Persistence** — The selected theme is persisted in `localStorage` and restored on next visit.

---

## 2. Theme Variants

### 2.1 Naming

```typescript
export type ThemeVariant = 'professional' | 'lego';
```

| Old name | New name | Description |
|----------|----------|-------------|
| `workshop` | `professional` | Clean, minimal, enterprise-grade light UI — the default |
| `blueprint` | `lego` | Saturated, playful dark UI with the original brick aesthetic |

The rename reflects the product's evolution: Professional is the default production surface; Lego preserves the original creative identity as an opt-in alternative.

### 2.2 Professional Theme (Default)

The Professional theme targets users who treat CloudBlocks as a production architecture tool. Visual cues are understated and informational.

**Visual character**:
- Light background palette (neutral grays, white surfaces)
- Subtle shadows (`0 1px 3px rgba(0,0,0,0.1)`)
- Muted accent colors — blue primary, teal secondary
- Small border-radius (`4px` on panels, `2px` on inputs)
- High text contrast for readability (WCAG AA minimum)
- Clean, flat panel chrome without decorative elements

### 2.3 Lego Theme (Alternative)

The Lego theme preserves the original CloudBlocks brick-building aesthetic. It is colorful, saturated, and fun.

**Visual character**:
- Dark background palette (slate/navy tones)
- Pronounced shadows with colored glow effects
- Vivid accent colors — bright blue primary, cyan secondary
- Larger border-radius (`8px` on panels, `4px` on inputs)
- Playful visual density — the canvas feels like a building workspace
- Panel chrome may include subtle texture or depth cues

---

## 3. Token Architecture

### 3.1 Token Interface

The `ThemeTokens` interface defines all theme-dependent visual properties. Both themes implement the full interface — no optional fields, no fallbacks.

```typescript
export interface ThemeTokens {
  // Backgrounds
  'bg-app': string;            // Application shell background
  'bg-canvas': string;         // Main canvas area
  'bg-surface': string;        // Panel and card backgrounds
  'bg-surface-raised': string; // Elevated surfaces (dropdowns, modals)
  'bg-overlay': string;        // Modal backdrop overlay

  // Text
  'text-primary': string;      // Primary content text
  'text-secondary': string;    // Secondary/descriptive text
  'text-muted': string;        // Disabled or hint text
  'text-inverse': string;      // Text on inverted backgrounds

  // Borders
  'border-default': string;    // Standard element borders
  'border-subtle': string;     // Subtle dividers
  'border-strong': string;     // Emphasized borders (focus, active)

  // Accents
  'accent-primary': string;    // Primary interactive elements
  'accent-secondary': string;  // Secondary interactive elements
  'accent-success': string;    // Success states
  'accent-warning': string;    // Warning states
  'accent-error': string;      // Error states

  // Category colors (UI-only — NOT resource identity colors)
  'cat-network': string;       // Network category indicator
  'cat-security': string;      // Security category indicator
  'cat-edge': string;          // Edge/CDN category indicator
  'cat-compute': string;       // Compute category indicator
  'cat-data': string;          // Data/storage category indicator
  'cat-messaging': string;     // Messaging category indicator
  'cat-operations': string;    // Operations category indicator
}
```

> **Important**: The `cat-*` tokens are UI chrome colors (sidebar icons, palette badges). They are **not** the resource block colors. Resource blocks use provider-identity colors from V2 spec §7.

### 3.2 Token Values

#### Professional Theme

```typescript
export const professionalTheme: ThemeTokens = {
  'bg-app':             '#F8FAFC',
  'bg-canvas':          '#FFFFFF',
  'bg-surface':         '#F1F5F9',
  'bg-surface-raised':  '#FFFFFF',
  'bg-overlay':         'rgba(0, 0, 0, 0.3)',

  'text-primary':       '#0F172A',
  'text-secondary':     '#475569',
  'text-muted':         '#94A3B8',
  'text-inverse':       '#F1F5F9',

  'border-default':     '#E2E8F0',
  'border-subtle':      '#F1F5F9',
  'border-strong':      '#CBD5E1',

  'accent-primary':     '#2563EB',
  'accent-secondary':   '#0891B2',
  'accent-success':     '#16A34A',
  'accent-warning':     '#CA8A04',
  'accent-error':       '#DC2626',

  'cat-network':        '#3B82F6',
  'cat-security':       '#EF4444',
  'cat-edge':           '#F97316',
  'cat-compute':        '#8B5CF6',
  'cat-data':           '#14B8A6',
  'cat-messaging':      '#EAB308',
  'cat-operations':     '#64748B',
};
```

#### Lego Theme

```typescript
export const legoTheme: ThemeTokens = {
  'bg-app':             '#0F172A',
  'bg-canvas':          '#0B1220',
  'bg-surface':         '#1E293B',
  'bg-surface-raised':  '#334155',
  'bg-overlay':         'rgba(0, 0, 0, 0.6)',

  'text-primary':       '#F1F5F9',
  'text-secondary':     '#94A3B8',
  'text-muted':         '#64748B',
  'text-inverse':       '#0F172A',

  'border-default':     '#334155',
  'border-subtle':      '#1E293B',
  'border-strong':      '#475569',

  'accent-primary':     '#3B82F6',
  'accent-secondary':   '#06B6D4',
  'accent-success':     '#22C55E',
  'accent-warning':     '#EAB308',
  'accent-error':       '#EF4444',

  'cat-network':        '#3B82F6',
  'cat-security':       '#EF4444',
  'cat-edge':           '#F97316',
  'cat-compute':        '#8B5CF6',
  'cat-data':           '#14B8A6',
  'cat-messaging':      '#EAB308',
  'cat-operations':     '#64748B',
};
```

### 3.3 Theme-Independent Tokens

Typography and motion tokens do **not** vary by theme. They are shared constants.

```typescript
// Typography — identical across all themes
export const typography = {
  fontUi:     "'Inter', system-ui, -apple-system, sans-serif",
  fontMono:   "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  'text-xs':  '11px',
  'text-sm':  '12px',
  'text-base':'13px',
  'text-md':  '14px',
  'text-lg':  '16px',
  'text-xl':  '20px',
  'text-2xl': '24px',
  'text-3xl': '32px',
};

// Motion — identical across all themes
export const motion = {
  'duration-fast':      '100ms',
  'duration-normal':    '200ms',
  'duration-slow':      '300ms',
  'easing-default':     'cubic-bezier(0.2, 0, 0, 1)',
  'easing-decelerate':  'cubic-bezier(0, 0, 0, 1)',
  'easing-accelerate':  'cubic-bezier(0.3, 0, 1, 1)',
};
```

---

## 4. Vendor Color Integration

### 4.1 Principle: Theme Does Not Own Resource Colors

Resource block colors are **provider-identity colors**, not theme tokens. They are defined in [CLOUDBLOCKS_SPEC_V2.md §7](CLOUDBLOCKS_SPEC_V2.md#7-color-system) and are invariant across themes.

| Provider | Brand Primary | Source |
|----------|--------------|--------|
| Azure | `#0078D4` | Microsoft Fluent Design |
| AWS | `#D86613` (Compute), `#232F3E` (Brand Dark) | AWS Architecture Icons |
| GCP | `#4285F4` | Google Brand Colors |

The full service family → color mappings are in V2 spec §7.2–§7.4. This spec does not duplicate them.

### 4.2 Theme × Vendor Color Interaction

Themes affect how vendor colors appear on the canvas through contrast and context:

| Aspect | Professional (light) | Lego (dark) |
|--------|---------------------|-------------|
| Canvas background | `#FFFFFF` | `#0B1220` |
| Block contrast | Vendor colors on white — good natural contrast | Vendor colors on dark — enhanced pop |
| Block shadows | `rgba(0,0,0,0.08)` — subtle, flat | `rgba(0,0,0,0.3)` — deeper, 3D feel |
| Connection lines | Slightly desaturated on light | Full saturation on dark |

### 4.3 Rules

1. **Vendor colors are never modified by theme** — the hex value of Azure `#0078D4` is the same in Professional and Lego.
2. **Face color derivation** (lighten/darken for isometric faces) follows V2 spec §7.7 — same algorithm regardless of theme.
3. **Shadow and glow effects** around blocks may differ by theme (stronger in Lego, subtle in Professional) but the block color itself does not change.
4. **Connector colors** are connection-type-based (see §5), not theme-based. Both themes use the same connector palette.

---

## 5. Connection Theme

Connector (connection line) colors are based on **connection type**, not theme variant. Both Professional and Lego themes use the same connector palette.

| Connection Type | Tile | Shadow | Dark | Accent | Pin Hole |
|----------------|------|--------|------|--------|----------|
| `dataflow` | `#64748b` | `#475569` | `#334155` | `#94a3b8` | open |
| `http` | `#3b82f6` | `#2563eb` | `#1d4ed8` | `#60a5fa` | filled |
| `internal` | `#8b5cf6` | `#7c3aed` | `#6d28d9` | `#a78bfa` | cross |
| `data` | `#f59e0b` | `#d97706` | `#b45309` | `#fbbf24` | double |
| `async` | `#10b981` | `#059669` | `#047857` | `#34d399` | dashed |

The `ConnectorTheme` interface:

```typescript
export interface ConnectorTheme {
  tile: string;       // Primary connection line color
  shadow: string;     // Darker shade for depth
  dark: string;       // Darkest shade for strong contrast
  accent: string;     // Lighter shade for highlights/hover
  pinHoleStyle: 'open' | 'filled' | 'cross' | 'double' | 'dashed';
}
```

### 5.1 Diff Overlay Colors

Architecture diff overlays are also theme-independent:

| State | Color | Opacity |
|-------|-------|---------|
| Added | `#22c55e` | 1.0 |
| Removed | `#ef4444` | 0.4 |
| Modified | `#eab308` | 1.0 |

---

## 6. CSS Custom Property Architecture

### 6.1 Current State (TypeScript-only)

Today, theme tokens are consumed as TypeScript objects via `getThemeTokens(variant)`. Components access them as:

```typescript
const tokens = getThemeTokens(themeVariant);
const bg = tokens['bg-app'];
```

This works but has limitations:
- CSS files cannot reference tokens
- Theme changes require React re-renders to propagate
- CSS-based animations cannot use token values

### 6.2 Target State (CSS Custom Properties)

The target architecture uses CSS custom properties (`--cb-*` namespace) applied to `:root`, enabling both TypeScript and CSS consumption.

#### Naming Convention

```
--cb-{category}-{name}
```

Full property list:

```css
:root {
  /* Backgrounds */
  --cb-bg-app: #F8FAFC;
  --cb-bg-canvas: #FFFFFF;
  --cb-bg-surface: #F1F5F9;
  --cb-bg-surface-raised: #FFFFFF;
  --cb-bg-overlay: rgba(0, 0, 0, 0.3);

  /* Text */
  --cb-text-primary: #0F172A;
  --cb-text-secondary: #475569;
  --cb-text-muted: #94A3B8;
  --cb-text-inverse: #F1F5F9;

  /* Borders */
  --cb-border-default: #E2E8F0;
  --cb-border-subtle: #F1F5F9;
  --cb-border-strong: #CBD5E1;

  /* Accents */
  --cb-accent-primary: #2563EB;
  --cb-accent-secondary: #0891B2;
  --cb-accent-success: #16A34A;
  --cb-accent-warning: #CA8A04;
  --cb-accent-error: #DC2626;

  /* Category (UI chrome only) */
  --cb-cat-network: #3B82F6;
  --cb-cat-security: #EF4444;
  --cb-cat-edge: #F97316;
  --cb-cat-compute: #8B5CF6;
  --cb-cat-data: #14B8A6;
  --cb-cat-messaging: #EAB308;
  --cb-cat-operations: #64748B;

  /* Typography (theme-independent) */
  --cb-font-ui: 'Inter', system-ui, -apple-system, sans-serif;
  --cb-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  /* Motion (theme-independent) */
  --cb-duration-fast: 100ms;
  --cb-duration-normal: 200ms;
  --cb-duration-slow: 300ms;
}
```

#### Application Function

```typescript
function applyTheme(variant: ThemeVariant): void {
  const tokens = getThemeTokens(variant);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--cb-${key}`, value);
  }

  // Persist selection
  localStorage.setItem('cloudblocks:theme-variant', variant);
}
```

#### CSS Consumption

```css
.panel {
  background: var(--cb-bg-surface);
  color: var(--cb-text-primary);
  border: 1px solid var(--cb-border-default);
}

.panel:hover {
  border-color: var(--cb-border-strong);
}
```

### 6.3 Migration Path

The migration from TypeScript-only to CSS custom properties is incremental:

1. **Phase 1** (M22 E1): Add `applyTheme()` function that sets `--cb-*` properties on `:root`. Keep `getThemeTokens()` as the primary API.
2. **Phase 2** (M22 E1): New CSS should prefer `var(--cb-*)` over TypeScript token access.
3. **Phase 3** (post-M22): Gradually migrate existing inline styles to CSS custom property references.

No Big Bang migration — both access patterns coexist indefinitely.

---

## 7. Theme Switching

### 7.1 Mechanism

```typescript
// In uiStore.ts
interface UiState {
  themeVariant: ThemeVariant;          // 'professional' | 'lego'
  setThemeVariant: (v: ThemeVariant) => void;
}
```

`setThemeVariant` triggers:
1. Update Zustand store state
2. Call `applyTheme(variant)` to set CSS custom properties
3. Persist to `localStorage` key `cloudblocks:theme-variant`
4. React components re-render via Zustand subscription

### 7.2 Default

```typescript
const DEFAULT_THEME: ThemeVariant = 'professional';
```

First-time visitors see the Professional theme. The Lego theme is opt-in via the menu bar switcher.

### 7.3 Persistence

| Key | Value | Default |
|-----|-------|---------|
| `cloudblocks:theme-variant` | `'professional'` or `'lego'` | `'professional'` |

On app init:
1. Read `localStorage` value
2. If valid variant → apply it
3. If missing or invalid → apply `'professional'`

### 7.4 UI: Theme Switcher

The theme switcher lives in the **View** menu of the menu bar. It presents a simple toggle or radio group:

```
View >
  ☑ Professional
  ☐ Lego
```

No separate settings page. One click to switch. Change applies instantly.

---

## 8. Migration Plan

### 8.1 Token Rename

| File | Change |
|------|--------|
| `themeTokens.ts` | Rename `blueprintTheme` → `legoTheme`, `workshopTheme` → `professionalTheme` |
| `themeTokens.ts` | Update `ThemeVariant` type: `'blueprint' \| 'workshop'` → `'professional' \| 'lego'` |
| `themeTokens.ts` | Update `getThemeTokens()` to use new names |
| `uiStore.ts` | Update default: `'blueprint'` → `'professional'` |
| `uiStore.ts` | Add migration: read old `localStorage` value, map to new |

### 8.2 localStorage Migration

Existing users may have `cloudblocks:theme-variant` set to `'blueprint'` or `'workshop'`. The app must handle this gracefully:

```typescript
function migrateThemeVariant(stored: string | null): ThemeVariant {
  if (stored === 'professional' || stored === 'lego') return stored;
  if (stored === 'workshop') return 'professional';
  if (stored === 'blueprint') return 'lego';
  return 'professional'; // default
}
```

### 8.3 Consumer Migration Checklist

All files that import from `themeTokens.ts` must be updated:

1. Replace `'blueprint'` string literals → `'lego'`
2. Replace `'workshop'` string literals → `'professional'`
3. Replace `blueprintTheme` import → `legoTheme`
4. Replace `workshopTheme` import → `professionalTheme`
5. Verify: `grep -r "blueprint\|workshop" apps/web/src/` returns zero theme-related hits

---

## 9. Accessibility

### 9.1 Contrast Requirements

Both themes must meet WCAG 2.1 AA contrast ratios:

| Pair | Minimum ratio | Professional | Lego |
|------|--------------|-------------|------|
| `text-primary` on `bg-surface` | 4.5:1 | `#0F172A` on `#F1F5F9` = 15.4:1 ✅ | `#F1F5F9` on `#1E293B` = 11.0:1 ✅ |
| `text-secondary` on `bg-surface` | 4.5:1 | `#475569` on `#F1F5F9` = 5.9:1 ✅ | `#94A3B8` on `#1E293B` = 4.6:1 ✅ |
| `text-muted` on `bg-surface` | 3:1 (large text) | `#94A3B8` on `#F1F5F9` = 2.7:1 ⚠️ | `#64748B` on `#1E293B` = 3.2:1 ✅ |

> **Note**: `text-muted` in Professional is below AA for small text. This is acceptable because muted text is used for non-essential hints and disabled states, not critical content. For small text, prefer `text-secondary`.

### 9.2 Focus Indicators

Focus indicators use `accent-primary` with a 2px solid outline offset by 2px. This is theme-independent in behavior, but the color adapts:

| Theme | Focus color | On background |
|-------|------------|---------------|
| Professional | `#2563EB` | Light surfaces — clearly visible |
| Lego | `#3B82F6` | Dark surfaces — clearly visible |

---

## 10. Extension Points

### 10.1 Adding a New Theme

To add a new theme variant:

1. Add the variant name to `ThemeVariant` union type
2. Create a new `ThemeTokens` object with all 24 tokens
3. Update `getThemeTokens()` to handle the new variant
4. Add the variant to the menu bar switcher
5. Update `migrateThemeVariant()` if the new variant replaces an existing one

### 10.2 Adding New Tokens

To add a new token:

1. Add the key to `ThemeTokens` interface
2. Add values to **all** theme objects (Professional and Lego)
3. Add the corresponding `--cb-*` CSS custom property
4. TypeScript compiler will enforce completeness — missing values are compile errors

### 10.3 Future: Light/Dark Mode per Theme

The current architecture uses a 1-dimensional variant (`professional` | `lego`). If a future milestone requires light/dark modes within each theme style, the extension path is:

```typescript
// Future — NOT part of M22
export type ThemeStyle = 'professional' | 'lego';
export type ThemeMode = 'light' | 'dark';
export type ThemeVariant = `${ThemeStyle}-${ThemeMode}`;
// → 'professional-light' | 'professional-dark' | 'lego-light' | 'lego-dark'
```

This requires 4 token sets instead of 2 but uses the same `ThemeTokens` interface. The migration from 2 to 4 variants is additive — no breaking changes.

---

## 11. Summary

| Aspect | Decision |
|--------|----------|
| Default theme | Professional (light, clean, enterprise) |
| Alternative theme | Lego (dark, playful, creative) |
| Theme dimensionality | 1D — variant only (no separate light/dark toggle) |
| Token count | 24 color tokens + 8 typography + 6 motion |
| CSS architecture | `--cb-*` custom properties on `:root` |
| Vendor colors | Theme-independent — defined in V2 spec §7 |
| Connector colors | Theme-independent — defined by connection type |
| Persistence | `localStorage` key `cloudblocks:theme-variant` |
| Default value | `'professional'` |
| Switching | Instant, via View menu |
| Extension | New variants = new `ThemeTokens` object + union member |
| Accessibility | WCAG AA for primary/secondary text |

---

*This specification is the authoritative reference for theme-related decisions in CloudBlocks. For resource color definitions, see [CLOUDBLOCKS_SPEC_V2.md §7](CLOUDBLOCKS_SPEC_V2.md#7-color-system). For the architectural decision record, see [ADR-0011](../adr/0011-dual-theme-system.md).*

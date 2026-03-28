# CloudBlocks Theme System Specification

> **Audience**: Contributors / Design System | **Status**: Stable — Internal | **Verified against**: v0.26.0

**Status**: Active
**Date**: 2026-03
**Supersedes**: Visual styling sections of BRICK_DESIGN_SPEC.md and VISUAL_DESIGN_SPEC.md
**Related**: [CLOUDBLOCKS_SPEC_V2.md](CLOUDBLOCKS_SPEC_V2.md) §7 (Color System), [ADR-0011](../adr/0011-dual-theme-system.md)

---

## 0. Purpose

This specification defines the **dual theme system** for CloudBlocks — a visual cloud learning tool for beginners. It establishes two visual themes that share identical layout, geometry, and interaction — only visual tokens (colors, border-radius, shadows) differ.

### Current Implementation (M22)

The codebase uses `blueprint` and `workshop` as theme variant names:

| Variant     | Character                                                     | Default? |
| ----------- | ------------------------------------------------------------- | -------- |
| `workshop`  | Light, clean, enterprise-grade — the default                  | ✅       |
| `blueprint` | Dark, saturated, playful — the original block-based aesthetic |          |

> **Planned rename**: A future milestone will rename `blueprint` → `blocks` and `workshop` → `professional` to better reflect each theme's identity. Until then, `blueprint`/`workshop` are the canonical code names.

### Scope

| In scope                                         | Out of scope                                     |
| ------------------------------------------------ | ------------------------------------------------ |
| Theme token definitions (color, surface, border) | Layout or geometry changes between themes        |
| CSS custom property architecture                 | Vendor-specific resource colors (see V2 spec §7) |
| Theme switching mechanism                        | Animation or motion token differences            |
| Port visibility toggle per theme                 | Port dimensions (see V2 spec §2 — INVIOLABLE)    |

---

## 1. Design Principles

1. **Tokens, not overrides** — Every visual difference between themes is expressed through a named token. No ad-hoc color values.
2. **Same gauge** — Layout grid, port dimensions, block sizes, container block proportions, and the Universal Port Standard (V2 spec §2) are theme-independent.
3. **Provider identity preserved** — Resource colors come from the cloud provider (V2 spec §7). Themes only affect the chrome (UI shell, panels, canvas background), never the resource blocks themselves.
4. **Instant switch** — Theme changes apply immediately with no page reload. Transition duration ≤ 200ms.
5. **Persistence** — The selected theme is persisted in `localStorage` and restored on next visit.

---

## 2. Theme Variants

### 2.1 Naming (Current Code)

```typescript
export type ThemeVariant = 'blueprint' | 'workshop';
```

| Variant     | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| `workshop`  | Light background palette, subtle shadows, muted accents — the default |
| `blueprint` | Dark background palette, saturated colors, pronounced shadows         |

### 2.2 Workshop Theme (Default)

The Workshop theme is the default learning environment. Visual cues are calm, readable, and instructional so beginners can focus on architecture concepts without visual overload.

**Visual character**:

- Light background palette (neutral grays, white surfaces)
- Subtle shadows (`rgba(0,0,0,0.1)`)
- Muted accent colors — blue primary, teal secondary
- High text contrast for readability (WCAG AA minimum)
- Clean, flat panel chrome without decorative elements
- Ports hidden by default (`showPorts: false`)

### 2.3 Blueprint Theme (Alternative)

The Blueprint theme preserves the original CloudBlocks block-building aesthetic. It is colorful, saturated, and fun.

**Visual character**:

- Dark background palette (slate/navy tones)
- Pronounced shadows with colored glow effects
- Vivid accent colors — bright blue primary, cyan secondary
- Playful visual density — the canvas feels like a building workspace
- Ports visible by default (`showPorts: true`)

### 2.4 Port Visibility Toggle

Port visibility is **independent** of theme variant. Each theme has a default, but users can override:

| Theme       | Default `showPorts` | User can override?            |
| ----------- | ------------------- | ----------------------------- |
| `workshop`  | `false`             | Yes — via MenuBar grid button |
| `blueprint` | `true`              | Yes — via MenuBar grid button |

When the user switches themes, `showPorts` resets to the new theme's default unless the user has explicitly toggled it.

---

## 3. Token Architecture

### 3.1 Token Interface

The `ThemeTokens` interface defines all theme-dependent visual properties. Both themes implement the full interface — no optional fields, no fallbacks.

```typescript
export interface ThemeTokens {
  // Backgrounds
  'bg-app': string; // Application shell background
  'bg-canvas': string; // Main canvas area
  'bg-surface': string; // Panel and card backgrounds
  'bg-surface-raised': string; // Elevated surfaces (dropdowns, modals)
  'bg-overlay': string; // Modal backdrop overlay

  // Text
  'text-primary': string; // Primary content text
  'text-secondary': string; // Secondary/descriptive text
  'text-muted': string; // Disabled or hint text
  'text-inverse': string; // Text on inverted backgrounds

  // Borders
  'border-default': string; // Standard element borders
  'border-subtle': string; // Subtle dividers
  'border-strong': string; // Emphasized borders (focus, active)

  // Accents
  'accent-primary': string; // Primary interactive elements
  'accent-secondary': string; // Secondary interactive elements
  'accent-success': string; // Success states
  'accent-warning': string; // Warning states
  'accent-error': string; // Error states

  // Category colors (UI-only — NOT resource identity colors)
  'cat-network': string; // Network category indicator
  'cat-security': string; // Security category indicator
  'cat-edge': string; // Edge/CDN category indicator
  'cat-compute': string; // Compute category indicator
  'cat-data': string; // Data/storage category indicator
  'cat-messaging': string; // Messaging category indicator
  'cat-operations': string; // Operations category indicator
}
```

> **Important**: The `cat-*` tokens are UI chrome colors (sidebar icons, palette badges). They are **not** the resource block colors. Resource blocks use provider-identity colors from V2 spec §7.

### 3.2 Token Values

#### Blueprint Theme (Dark)

```typescript
export const blueprintTheme: ThemeTokens = {
  'bg-app': '#0F172A',
  'bg-canvas': '#0B1220',
  'bg-surface': '#1E293B',
  'bg-surface-raised': '#334155',
  'bg-overlay': 'rgba(0, 0, 0, 0.6)',

  'text-primary': '#F1F5F9',
  'text-secondary': '#94A3B8',
  'text-muted': '#64748B',
  'text-inverse': '#0F172A',

  'border-default': '#334155',
  'border-subtle': '#1E293B',
  'border-strong': '#475569',

  'accent-primary': '#3B82F6',
  'accent-secondary': '#06B6D4',
  'accent-success': '#22C55E',
  'accent-warning': '#EAB308',
  'accent-error': '#EF4444',

  'cat-network': '#3B82F6',
  'cat-security': '#EF4444',
  'cat-edge': '#F97316',
  'cat-compute': '#8B5CF6',
  'cat-data': '#14B8A6',
  'cat-messaging': '#EAB308',
  'cat-operations': '#64748B',
};
```

#### Workshop Theme (Light — Default)

```typescript
export const workshopTheme: ThemeTokens = {
  'bg-app': '#F8FAFC',
  'bg-canvas': '#FFFFFF',
  'bg-surface': '#F1F5F9',
  'bg-surface-raised': '#FFFFFF',
  'bg-overlay': 'rgba(0, 0, 0, 0.3)',

  'text-primary': '#0F172A',
  'text-secondary': '#475569',
  'text-muted': '#94A3B8',
  'text-inverse': '#F1F5F9',

  'border-default': '#E2E8F0',
  'border-subtle': '#F1F5F9',
  'border-strong': '#CBD5E1',

  'accent-primary': '#2563EB',
  'accent-secondary': '#0891B2',
  'accent-success': '#16A34A',
  'accent-warning': '#CA8A04',
  'accent-error': '#DC2626',

  'cat-network': '#3B82F6',
  'cat-security': '#EF4444',
  'cat-edge': '#F97316',
  'cat-compute': '#8B5CF6',
  'cat-data': '#14B8A6',
  'cat-messaging': '#EAB308',
  'cat-operations': '#64748B',
};
```

### 3.3 Theme-Independent Tokens

Typography and motion tokens do **not** vary by theme. They are shared constants.

```typescript
// Typography — identical across all themes
export const typography = {
  fontUi: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  'text-xs': '11px',
  'text-sm': '12px',
  'text-base': '13px',
  'text-md': '14px',
  'text-lg': '16px',
  'text-xl': '20px',
  'text-2xl': '24px',
  'text-3xl': '32px',
};

// Motion — identical across all themes
export const motion = {
  'duration-fast': '100ms',
  'duration-normal': '200ms',
  'duration-slow': '300ms',
  'easing-default': 'cubic-bezier(0.2, 0, 0, 1)',
  'easing-decelerate': 'cubic-bezier(0, 0, 0, 1)',
  'easing-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
};
```

---

## 4. Vendor Color Integration

### 4.1 Principle: Theme Does Not Own Resource Colors

Resource block colors are **provider-identity colors**, not theme tokens. They are defined in [CLOUDBLOCKS_SPEC_V2.md §7](CLOUDBLOCKS_SPEC_V2.md#7-color-system) and are invariant across themes.

| Provider | Brand Primary                               | Source                  |
| -------- | ------------------------------------------- | ----------------------- |
| Azure    | `#0078D4`                                   | Microsoft Fluent Design |
| AWS      | `#D86613` (Compute), `#232F3E` (Brand Dark) | AWS Architecture Icons  |
| GCP      | `#4285F4`                                   | Google Brand Colors     |

The full service family → color mappings are in V2 spec §7.2–§7.4. This spec does not duplicate them.

### 4.2 Theme × Vendor Color Interaction

Themes affect how vendor colors appear on the canvas through contrast and context:

| Aspect            | Workshop (light)                               | Blueprint (dark)                     |
| ----------------- | ---------------------------------------------- | ------------------------------------ |
| Canvas background | `#FFFFFF`                                      | `#0B1220`                            |
| Block contrast    | Vendor colors on white — good natural contrast | Vendor colors on dark — enhanced pop |
| Block shadows     | `rgba(0,0,0,0.08)` — subtle, flat              | `rgba(0,0,0,0.3)` — deeper, 3D feel  |
| Connection lines  | Slightly desaturated on light                  | Full saturation on dark              |

### 4.3 Rules

1. **Vendor colors are never modified by theme** — the hex value of Azure `#0078D4` is the same in both themes.
2. **Face color derivation** (lighten/darken for isometric faces) follows V2 spec §7.7 — same algorithm regardless of theme.
3. **Shadow and glow effects** around blocks may differ by theme (stronger in Blueprint, subtle in Workshop) but the block color itself does not change.
4. **Connector colors** are connection-type-based (see §5), not theme-based. Both themes use the same connector palette.

---

## 5. Connection Theme

Connector (connection line) colors are based on **endpoint semantic type**, not theme variant. Both themes use the same connector palette.

| Endpoint Semantic | Color             | Usage                          |
| ----------------- | ----------------- | ------------------------------ |
| `http`            | `#3B82F6` (Blue)  | HTTP/REST traffic              |
| `event`           | `#F59E0B` (Amber) | Event-driven / async messaging |
| `data`            | `#14B8A6` (Teal)  | Data flow / storage access     |

Port (visual connection anchor) colors match the endpoint semantic and are defined in `designTokens.ts`:

```typescript
export const PORT_COLOR_HTTP = '#3B82F6'; // Blue — HTTP traffic
export const PORT_COLOR_EVENT = '#F59E0B'; // Amber — event/async
export const PORT_COLOR_DATA = '#14B8A6'; // Teal — data/dataflow
export const PORT_COLOR_OCCUPIED = '#475569'; // Slate — occupied port (dimmed)
```

---

## 6. CSS Custom Property Architecture

### 6.1 Current State (TypeScript-only)

Theme tokens are consumed as TypeScript objects via `getThemeTokens(variant)`. Components access them as:

```typescript
const tokens = getThemeTokens(themeVariant);
const bg = tokens['bg-app'];
```

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
  --cb-bg-app: #f8fafc;
  --cb-bg-canvas: #ffffff;
  --cb-bg-surface: #f1f5f9;
  --cb-bg-surface-raised: #ffffff;
  --cb-bg-overlay: rgba(0, 0, 0, 0.3);

  /* Text */
  --cb-text-primary: #0f172a;
  --cb-text-secondary: #475569;
  --cb-text-muted: #94a3b8;
  --cb-text-inverse: #f1f5f9;

  /* Borders */
  --cb-border-default: #e2e8f0;
  --cb-border-subtle: #f1f5f9;
  --cb-border-strong: #cbd5e1;

  /* Accents */
  --cb-accent-primary: #2563eb;
  --cb-accent-secondary: #0891b2;
  --cb-accent-success: #16a34a;
  --cb-accent-warning: #ca8a04;
  --cb-accent-error: #dc2626;

  /* Category (UI chrome only) */
  --cb-cat-network: #3b82f6;
  --cb-cat-security: #ef4444;
  --cb-cat-edge: #f97316;
  --cb-cat-compute: #8b5cf6;
  --cb-cat-data: #14b8a6;
  --cb-cat-messaging: #eab308;
  --cb-cat-operations: #64748b;

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

### 6.3 Migration Path

The migration from TypeScript-only to CSS custom properties is incremental:

1. **Phase 1**: Add `applyTheme()` function that sets `--cb-*` properties on `:root`. Keep `getThemeTokens()` as the primary API.
2. **Phase 2**: New CSS should prefer `var(--cb-*)` over TypeScript token access.
3. **Phase 3**: Gradually migrate existing inline styles to CSS custom property references.

No Big Bang migration — both access patterns coexist indefinitely.

---

## 7. Theme Switching

### 7.1 Mechanism

```typescript
// In uiStore.ts
interface UiState {
  themeVariant: ThemeVariant; // 'blueprint' | 'workshop'
  showPorts: boolean; // independent of theme
  setThemeVariant: (v: ThemeVariant) => void;
}
```

`setThemeVariant` triggers:

1. Update Zustand store state
2. Call `applyTheme(variant)` to set CSS custom properties
3. Persist to `localStorage` key `cloudblocks:theme-variant`
4. React components re-render via Zustand subscription
5. Reset `showPorts` to theme default (unless user has explicitly toggled)

### 7.2 Default

```typescript
const DEFAULT_THEME: ThemeVariant = 'workshop';
```

First-time visitors see the Workshop theme. The Blueprint theme is opt-in via the menu bar switcher.

### 7.3 Persistence

| Key                         | Value                         | Default      |
| --------------------------- | ----------------------------- | ------------ |
| `cloudblocks:theme-variant` | `'blueprint'` or `'workshop'` | `'workshop'` |

On app init:

1. Read `localStorage` value
2. If valid variant → apply it
3. If missing or invalid → apply `'workshop'`

### 7.4 UI: Theme Switcher

The theme switcher lives in the **View** menu of the menu bar. It presents a simple toggle or radio group:

```
View >
  ☑ Workshop
  ☐ Blueprint
```

No separate settings page. One click to switch. Change applies instantly.

---

## 8. Future Rename Plan

A future milestone will rename the theme variants to be more descriptive:

| Current (M22) | Planned (future) | Reason                                              |
| ------------- | ---------------- | --------------------------------------------------- |
| `workshop`    | `professional`   | Better communicates enterprise-grade identity       |
| `blueprint`   | `blocks`         | Better communicates playful block-building identity |

### Migration checklist (for the rename milestone):

1. Update `ThemeVariant` type: `'blueprint' | 'workshop'` → `'professional' | 'blocks'`
2. Rename exports: `blueprintTheme` → `blocksTheme`, `workshopTheme` → `professionalTheme`
3. Update `getThemeTokens()` to use new names
4. Update `uiStore.ts` default
5. Add localStorage migration for existing users
6. Update all consumer files
7. Update this spec

### localStorage Migration (for rename milestone)

```typescript
function migrateThemeVariant(stored: string | null): ThemeVariant {
  if (stored === 'professional' || stored === 'blocks') return stored;
  if (stored === 'workshop') return 'professional';
  if (stored === 'blueprint') return 'blocks';
  return 'professional'; // default
}
```

---

## 9. Accessibility

### 9.1 Contrast Requirements

Both themes must meet WCAG 2.1 AA contrast ratios:

| Pair                             | Minimum ratio    | Workshop                           | Blueprint                          |
| -------------------------------- | ---------------- | ---------------------------------- | ---------------------------------- |
| `text-primary` on `bg-surface`   | 4.5:1            | `#0F172A` on `#F1F5F9` = 15.4:1 ✅ | `#F1F5F9` on `#1E293B` = 11.0:1 ✅ |
| `text-secondary` on `bg-surface` | 4.5:1            | `#475569` on `#F1F5F9` = 5.9:1 ✅  | `#94A3B8` on `#1E293B` = 4.6:1 ✅  |
| `text-muted` on `bg-surface`     | 3:1 (large text) | `#94A3B8` on `#F1F5F9` = 2.7:1 ⚠️  | `#64748B` on `#1E293B` = 3.2:1 ✅  |

> **Note**: `text-muted` in Workshop is below AA for small text. This is acceptable because muted text is used for non-essential hints and disabled states, not critical content. For small text, prefer `text-secondary`.

### 9.2 Focus Indicators

Focus indicators use `accent-primary` with a 2px solid outline offset by 2px:

| Theme     | Focus color | On background                    |
| --------- | ----------- | -------------------------------- |
| Workshop  | `#2563EB`   | Light surfaces — clearly visible |
| Blueprint | `#3B82F6`   | Dark surfaces — clearly visible  |

---

## 10. Extension Points

### 10.1 Adding a New Theme

To add a new theme variant:

1. Add the variant name to `ThemeVariant` union type
2. Create a new `ThemeTokens` object with all 24 tokens
3. Update `getThemeTokens()` to handle the new variant
4. Add the variant to the menu bar switcher
5. Set appropriate `showPorts` default for the new theme

### 10.2 Adding New Tokens

To add a new token:

1. Add the key to `ThemeTokens` interface
2. Add values to **all** theme objects
3. Add the corresponding `--cb-*` CSS custom property
4. TypeScript compiler will enforce completeness — missing values are compile errors

### 10.3 Future: Light/Dark Mode per Theme

If a future milestone requires light/dark modes within each theme style, the extension path is:

```typescript
// Future — NOT part of current implementation
export type ThemeStyle = 'professional' | 'blocks';
export type ThemeMode = 'light' | 'dark';
export type ThemeVariant = `${ThemeStyle}-${ThemeMode}`;
```

This requires 4 token sets instead of 2 but uses the same `ThemeTokens` interface.

---

## 11. Summary

| Aspect               | Decision                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| Default theme        | Workshop (light, clean, enterprise)                                    |
| Alternative theme    | Blueprint (dark, playful, creative)                                    |
| Theme dimensionality | 1D — variant only (no separate light/dark toggle)                      |
| Token count          | 24 color tokens + 8 typography + 6 motion                              |
| CSS architecture     | `--cb-*` custom properties on `:root` (target)                         |
| Vendor colors        | Theme-independent — defined in V2 spec §7                              |
| Connector colors     | Theme-independent — defined by endpoint semantic type                  |
| Persistence          | `localStorage` key `cloudblocks:theme-variant`                         |
| Default value        | `'workshop'`                                                           |
| Switching            | Instant, via View menu                                                 |
| Port visibility      | Per-theme default, user-overridable                                    |
| Extension            | New variants = new `ThemeTokens` object + union member                 |
| Accessibility        | WCAG AA for primary/secondary text                                     |
| Planned rename       | `workshop` → `professional`, `blueprint` → `blocks` (future milestone) |

---

_This specification is the authoritative reference for theme-related decisions in CloudBlocks. For resource color definitions, see [CLOUDBLOCKS_SPEC_V2.md §7](CLOUDBLOCKS_SPEC_V2.md#7-color-system). For the architectural decision record, see [ADR-0011](../adr/0011-dual-theme-system.md)._

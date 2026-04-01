import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';

// ═══════════════════════════════════════════════════════════════
// Block Face Color System — v2.0
// See CLOUDBLOCKS_SPEC_V2.md §7 (Color System)
//
// Color represents PROVIDER RESOURCE IDENTITY.
// Not category, not arbitrary palette — the provider's official
// brand color for that service family.
//
// Flow: provider + subtype → service family → base hex → deriveFaceColors()
// ═══════════════════════════════════════════════════════════════

export interface BlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

/** Full derived color set from a single base hex. */
export interface DerivedFaceColors {
  top: string;
  topStroke: string;
  right: string;
  left: string;
}

// ─── Color Utilities ─────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = Number.parseInt(h, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const ch = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/**
 * Lighten a hex color by mixing toward white.
 * `percent` is 0-100 (e.g. 15 means 15%).
 */
export function lighten(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const ratio = percent / 100;
  return toHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}

/**
 * Darken a hex color by mixing toward black.
 * `percent` is 0-100 (e.g. 10 means 10%).
 */
export function darken(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const ratio = 1 - percent / 100;
  return toHex(r * ratio, g * ratio, b * ratio);
}

// ─── HSL Utilities ───────────────────────────────────────────

/** Convert RGB [0-255] to HSL [h:0-360, s:0-100, l:0-100]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** Convert HSL [h:0-360, s:0-100, l:0-100] to hex. */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return toHex(v, v, v);
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;
  return toHex(
    Math.round(hueToRgb(p, q, hn + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hn) * 255),
    Math.round(hueToRgb(p, q, hn - 1 / 3) * 255),
  );
}

/**
 * Adjust a hex color in HSL space.
 * - saturationScale: multiply saturation (0.3 = 30% of original).
 * - lightnessBoost: add to lightness (in percentage points).
 */
export function adjustColorHsl(
  hex: string,
  opts: { saturationScale: number; lightnessBoost: number },
): string {
  const [r, g, b] = parseHex(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newS = Math.max(0, Math.min(100, s * opts.saturationScale));
  const newL = Math.max(0, Math.min(100, l + opts.lightnessBoost));
  return hslToHex(h, newS, newL);
}

// ─── Face Color Derivation (§7.7) ────────────────────────────

/**
 * Derive all face and port colors from a single provider base color.
 * See CLOUDBLOCKS_SPEC_V2.md §7.7.
 */
export function deriveFaceColors(base: string): DerivedFaceColors {
  return {
    top: lighten(base, 4),
    topStroke: darken(base, 8),
    right: darken(base, 6),
    left: darken(base, 12),
  };
}

/**
 * Derive face colors for container blocks with narrower deltas.
 * Containers use subtler face differentiation to appear as background plates.
 * Stroke uses a stronger darken (10%) than resource blocks (8%) to improve
 * border visibility against the lighter, desaturated container fills.
 */
export function deriveContainerFaceColors(base: string): DerivedFaceColors {
  return {
    top: lighten(base, 2),
    topStroke: darken(base, 10),
    right: darken(base, 3),
    left: darken(base, 6),
  };
}

// ─── Provider Brand Colors (§7.2–§7.4) ──────────────────────

/**
 * Single brand color per provider. Every block of a provider uses the same base color.
 * Only the provider identity determines the color — not the category or service family.
 */
export const PROVIDER_BRAND_COLOR: Record<ProviderType, string> = {
  azure: '#0078D4', // Azure Blue
  aws: '#D86613', // AWS Orange
  gcp: '#34A853', // Google Green (distinct from Azure Blue)
};

// ─── Color Lookup ─────────────────────────────────────────────

/**
 * Resolve the base provider color for a block.
 *
 * All blocks of a provider use the same brand color.
 * Category and subtype are accepted for API compatibility but ignored.
 *
 * @returns A hex color string (e.g. '#0078D4')
 */
export function getBlockColor(
  provider: ProviderType,
  _subtype: string | undefined,
  _category: ResourceCategory,
): string {
  return PROVIDER_BRAND_COLOR[provider];
}

// ─── Public API (backward-compatible) ─────────────────────────

/**
 * Get face colors for a block. Uses provider-resource color derivation.
 *
 * For v2.0: colors are derived algorithmically from a single base color
 * determined by the provider's service family for the given category.
 */
export function getBlockFaceColors(
  category: ResourceCategory,
  provider: ProviderType = 'azure',
  subtype?: string,
): BlockFaceColors {
  const base = getBlockColor(provider, subtype, category);
  const derived = deriveFaceColors(base);
  return {
    topFaceColor: derived.top,
    topFaceStroke: derived.topStroke,
    leftSideColor: derived.left,
    rightSideColor: derived.right,
  };
}

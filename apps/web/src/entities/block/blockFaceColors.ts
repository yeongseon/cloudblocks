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

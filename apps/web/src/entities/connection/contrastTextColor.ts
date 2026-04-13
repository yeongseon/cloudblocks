/**
 * Return '#1e293b' (dark) or '#ffffff' (white) depending on the background
 * luminance. Accepts raw hex ('#667894') or CSS var strings
 * ('var(--token, #667894)') — the fallback hex is extracted automatically.
 */
export function contrastTextColor(cssOrHex: string): string {
  // Extract the fallback hex from a CSS var() if present
  const hexMatch = cssOrHex.match(/#[0-9A-Fa-f]{6}/);
  if (!hexMatch) return '#ffffff'; // default to white for unparseable values
  const hex = hexMatch[0].replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

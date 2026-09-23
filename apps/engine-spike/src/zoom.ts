export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 1.8;
export const ZOOM_STEP = 0.2;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 10) / 10;
}

import type { LayerType, ProviderType } from '@cloudblocks/schema';
import {
  PROVIDER_BRAND_COLOR,
  deriveContainerFaceColors,
  adjustColorHsl,
} from '../block/blockFaceColors';

type PlateLayerType = Exclude<LayerType, 'resource'>;

export interface ContainerBlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

// ─── Per-Layer HSL Adjustment Config ─────────────────────────
// saturationScale: fraction of original saturation to keep (0.3 = 30%).
// lightnessBoost: percentage points added to lightness.
// Outer layers are more washed-out; inner layers retain slightly more color.
// Both parameters form a strictly monotonic ladder (outer → inner):
//   saturationScale increases: 0.18 → 0.22 → 0.26 → 0.30 → 0.34
//   lightnessBoost  decreases:   35 →   30 →   26 →   22 →   18

interface LayerColorAdjustment {
  saturationScale: number;
  lightnessBoost: number;
}

const CONTAINER_LAYER_COLOR_ADJUSTMENTS: Record<PlateLayerType, LayerColorAdjustment> = {
  global: { saturationScale: 0.18, lightnessBoost: 35 },
  edge: { saturationScale: 0.22, lightnessBoost: 30 },
  region: { saturationScale: 0.26, lightnessBoost: 26 },
  zone: { saturationScale: 0.3, lightnessBoost: 22 },
  subnet: { saturationScale: 0.34, lightnessBoost: 18 },
};

/**
 * Derive container face colors from the provider brand color.
 *
 * Container blocks use HSL desaturation to recede visually while
 * preserving provider hue for identity. Each layer type gets a
 * different saturation/lightness treatment so layers remain
 * distinguishable.
 *
 * Pipeline: brand hex → HSL desaturate/lighten → deriveContainerFaceColors()
 */
export function getContainerBlockFaceColors(container: {
  type: PlateLayerType;
  provider?: ProviderType;
}): ContainerBlockFaceColors {
  const brand = PROVIDER_BRAND_COLOR[container.provider ?? 'azure'];
  const adj = CONTAINER_LAYER_COLOR_ADJUSTMENTS[container.type];
  const desaturated = adjustColorHsl(brand, adj);

  const derived = deriveContainerFaceColors(desaturated);
  return {
    topFaceColor: derived.top,
    topFaceStroke: derived.topStroke,
    leftSideColor: derived.left,
    rightSideColor: derived.right,
  };
}

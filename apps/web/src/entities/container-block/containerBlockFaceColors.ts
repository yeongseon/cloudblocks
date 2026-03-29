import type { LayerType, ProviderType } from '@cloudblocks/schema';
import { PROVIDER_BRAND_COLOR, deriveFaceColors, darken, lighten } from '../block/blockFaceColors';

type PlateLayerType = Exclude<LayerType, 'resource'>;

export interface ContainerBlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

/**
 * Derive container face colors from the provider brand color.
 *
 * All container layers use the same provider brand color as resource blocks,
 * with layer-specific darkness adjustments so layers remain visually
 * distinguishable while staying on-brand.
 *
 * - global: lightest (lighten 20%)
 * - edge: lighten 10%
 * - region (VNet): darken 15%
 * - zone: lighten 5%
 * - subnet: darken 8%
 */
export function getContainerBlockFaceColors(container: {
  type: PlateLayerType;
  provider?: ProviderType;
}): ContainerBlockFaceColors {
  const brand = PROVIDER_BRAND_COLOR[container.provider ?? 'azure'];

  let adjusted: string;
  switch (container.type) {
    case 'global':
      adjusted = lighten(brand, 20);
      break;
    case 'edge':
      adjusted = lighten(brand, 10);
      break;
    case 'region':
      adjusted = darken(brand, 15);
      break;
    case 'zone':
      adjusted = lighten(brand, 5);
      break;
    default: // subnet
      adjusted = darken(brand, 8);
      break;
  }

  const derived = deriveFaceColors(adjusted);
  return {
    topFaceColor: derived.top,
    topFaceStroke: derived.topStroke,
    leftSideColor: derived.left,
    rightSideColor: derived.right,
  };
}

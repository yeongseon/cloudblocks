import type { LayerType } from '@cloudblocks/schema';

type PlateLayerType = Exclude<LayerType, 'resource'>;

export interface PlateFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

export function getPlateFaceColors(plate: {
  type: PlateLayerType;
}): PlateFaceColors {
  if (plate.type === 'global') {
    return {
      topFaceColor: '#B39DDB',
      topFaceStroke: '#D1C4E9',
      leftSideColor: '#9575CD',
      rightSideColor: '#7E57C2',
    };
  }

  if (plate.type === 'edge') {
    return {
      topFaceColor: '#80CBC4',
      topFaceStroke: '#B2DFDB',
      leftSideColor: '#4DB6AC',
      rightSideColor: '#26A69A',
    };
  }

  if (plate.type === 'region') {
    return {
      topFaceColor: '#90CAF9',
      topFaceStroke: '#BBDEFB',
      leftSideColor: '#64B5F6',
      rightSideColor: '#42A5F5',
    };
  }

  if (plate.type === 'zone') {
    return {
      topFaceColor: '#A5D6A7',
      topFaceStroke: '#C8E6C9',
      leftSideColor: '#81C784',
      rightSideColor: '#66BB6A',
    };
  }

  // Subnet — unified indigo
  return {
    topFaceColor: '#6366F1',
    topFaceStroke: '#818CF8',
    leftSideColor: '#4F46E5',
    rightSideColor: '#4338CA',
  };
}

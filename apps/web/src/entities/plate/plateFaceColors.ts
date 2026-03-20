import type { PlateType, SubnetAccess } from '@cloudblocks/schema';

export interface PlateFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

export function getPlateFaceColors(plate: {
  type: PlateType;
  subnetAccess?: SubnetAccess;
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

  if (plate.subnetAccess === 'public') {
    return {
      topFaceColor: '#22C55E',
      topFaceStroke: '#4ADE80',
      leftSideColor: '#16A34A',
      rightSideColor: '#15803D',
    };
  }
  return {
    topFaceColor: '#6366F1',
    topFaceStroke: '#818CF8',
    leftSideColor: '#4F46E5',
    rightSideColor: '#4338CA',
  };
}

import type {
  PlateType,
  SubnetAccess,
} from '../../shared/types/index';

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
  if (plate.type === 'network') {
    return {
      topFaceColor: '#2563EB',
      topFaceStroke: '#60A5FA',
      leftSideColor: '#1D4ED8',
      rightSideColor: '#1E40AF',
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

import type { LayerType } from '@cloudblocks/schema';

type PlateLayerType = Exclude<LayerType, 'resource'>;

export interface ContainerBlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

export function getContainerBlockFaceColors(container: {
  type: PlateLayerType;
}): ContainerBlockFaceColors {
  if (container.type === 'global') {
    return {
      topFaceColor: '#B39DDB',
      topFaceStroke: '#D1C4E9',
      leftSideColor: '#9575CD',
      rightSideColor: '#7E57C2',
    };
  }

  if (container.type === 'edge') {
    return {
      topFaceColor: '#80CBC4',
      topFaceStroke: '#B2DFDB',
      leftSideColor: '#4DB6AC',
      rightSideColor: '#26A69A',
    };
  }

  if (container.type === 'region') {
    // Navy ramp — VNet level (dark navy)
    return {
      topFaceColor: '#162537',
      topFaceStroke: '#4B6886',
      leftSideColor: '#0F1B2A',
      rightSideColor: '#0B1420',
    };
  }

  if (container.type === 'zone') {
    return {
      topFaceColor: '#A5D6A7',
      topFaceStroke: '#C8E6C9',
      leftSideColor: '#81C784',
      rightSideColor: '#66BB6A',
    };
  }

  // Subnet — navy ramp (lighter than VNet)
  return {
    topFaceColor: '#22364B',
    topFaceStroke: '#7F9BB6',
    leftSideColor: '#182A3D',
    rightSideColor: '#122030',
  };
}

export type CloudProvider = 'azure' | 'aws' | 'gcp';

export interface MinifigureFaceColors {
  torso: { top: string; front: string; side: string };
  legs: { front: string; side: string };
  skin: { main: string; shade: string };
}

const PROVIDER_COLORS: Record<CloudProvider, MinifigureFaceColors['torso']> = {
  azure: {
    top: '#078DCE',
    front: '#067AB3',
    side: '#0570A4',
  },
  aws: {
    top: '#FF9900',
    front: '#E68A00',
    side: '#CC7A00',
  },
  gcp: {
    top: '#FFFFFF',
    front: '#EBEBEB',
    side: '#E0E0E0',
  },
};

const LEG_COLORS = {
  front: '#858585',
  side: '#787878',
};

const SKIN_COLORS = {
  main: '#F2CD37',
  shade: '#D4B124',
};

export function getMinifigureFaceColors(provider: CloudProvider): MinifigureFaceColors {
  return {
    torso: PROVIDER_COLORS[provider],
    legs: LEG_COLORS,
    skin: SKIN_COLORS,
  };
}

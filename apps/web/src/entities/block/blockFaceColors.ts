import type { BlockCategory, ProviderType, StudColorSpec } from '../../shared/types/index';

export interface BlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
];

const AZURE_BLOCK_FACE_COLORS: Record<BlockCategory, BlockFaceColors> = {
  compute: {
    topFaceColor: '#F25022',
    topFaceStroke: '#FF7A52',
    leftSideColor: '#D93B0B',
    rightSideColor: '#E04418',
  },
  database: {
    topFaceColor: '#00A4EF',
    topFaceStroke: '#33B8F5',
    leftSideColor: '#0078B4',
    rightSideColor: '#008ACC',
  },
  storage: {
    topFaceColor: '#7FBA00',
    topFaceStroke: '#99D11A',
    leftSideColor: '#5A8500',
    rightSideColor: '#6B9D00',
  },
  gateway: {
    topFaceColor: '#0078D4',
    topFaceStroke: '#3393DE',
    leftSideColor: '#00569A',
    rightSideColor: '#0066B8',
  },
  function: {
    topFaceColor: '#FFB900',
    topFaceStroke: '#FFCA33',
    leftSideColor: '#CC9400',
    rightSideColor: '#E6A600',
  },
  queue: {
    topFaceColor: '#737373',
    topFaceStroke: '#8C8C8C',
    leftSideColor: '#525252',
    rightSideColor: '#616161',
  },
  event: {
    topFaceColor: '#D83B01',
    topFaceStroke: '#E16233',
    leftSideColor: '#A82D00',
    rightSideColor: '#C03400',
  },
  analytics: {
    topFaceColor: '#693BC5',
    topFaceStroke: '#8259D0',
    leftSideColor: '#4E2B94',
    rightSideColor: '#5B33AC',
  },
  identity: {
    topFaceColor: '#E0301E',
    topFaceStroke: '#E65A4B',
    leftSideColor: '#B32618',
    rightSideColor: '#CC2B1B',
  },
  observability: {
    topFaceColor: '#0078D4',
    topFaceStroke: '#3393DE',
    leftSideColor: '#00569A',
    rightSideColor: '#0066B8',
  },
};

const AWS_BLOCK_FACE_COLORS: Record<BlockCategory, BlockFaceColors> = {
  compute: {
    topFaceColor: '#FF9900',
    topFaceStroke: '#FF9900',
    leftSideColor: '#CC7A00',
    rightSideColor: '#E68A00',
  },
  database: {
    topFaceColor: '#3B48CC',
    topFaceStroke: '#3B48CC',
    leftSideColor: '#2D3899',
    rightSideColor: '#3340B2',
  },
  storage: {
    topFaceColor: '#3F8624',
    topFaceStroke: '#3F8624',
    leftSideColor: '#2D6119',
    rightSideColor: '#357420',
  },
  gateway: {
    topFaceColor: '#8C4FFF',
    topFaceStroke: '#8C4FFF',
    leftSideColor: '#6B3CC7',
    rightSideColor: '#7A45E0',
  },
  function: {
    topFaceColor: '#FF9900',
    topFaceStroke: '#FF9900',
    leftSideColor: '#CC7A00',
    rightSideColor: '#E68A00',
  },
  queue: {
    topFaceColor: '#FF4F8B',
    topFaceStroke: '#FF4F8B',
    leftSideColor: '#CC3F6F',
    rightSideColor: '#E6477E',
  },
  event: {
    topFaceColor: '#E7157B',
    topFaceStroke: '#E7157B',
    leftSideColor: '#B81162',
    rightSideColor: '#D0146F',
  },
  analytics: {
    topFaceColor: '#A166FF',
    topFaceStroke: '#A166FF',
    leftSideColor: '#7B4DC7',
    rightSideColor: '#8E59E0',
  },
  identity: {
    topFaceColor: '#D6232C',
    topFaceStroke: '#D6232C',
    leftSideColor: '#AB1C23',
    rightSideColor: '#C12028',
  },
  observability: {
    topFaceColor: '#693BC5',
    topFaceStroke: '#693BC5',
    leftSideColor: '#4E2B94',
    rightSideColor: '#5B33AC',
  },
};

const GCP_BLOCK_FACE_COLORS: Record<BlockCategory, BlockFaceColors> = {
  compute: {
    topFaceColor: '#4285F4',
    topFaceStroke: '#4285F4',
    leftSideColor: '#2D5FBF',
    rightSideColor: '#3A75DB',
  },
  database: {
    topFaceColor: '#FBBC04',
    topFaceStroke: '#FBBC04',
    leftSideColor: '#C99603',
    rightSideColor: '#E2A904',
  },
  storage: {
    topFaceColor: '#34A853',
    topFaceStroke: '#34A853',
    leftSideColor: '#267D3E',
    rightSideColor: '#2E9648',
  },
  gateway: {
    topFaceColor: '#EA4335',
    topFaceStroke: '#EA4335',
    leftSideColor: '#BB352A',
    rightSideColor: '#D33C2F',
  },
  function: {
    topFaceColor: '#4285F4',
    topFaceStroke: '#4285F4',
    leftSideColor: '#2D5FBF',
    rightSideColor: '#3A75DB',
  },
  queue: {
    topFaceColor: '#34A853',
    topFaceStroke: '#34A853',
    leftSideColor: '#267D3E',
    rightSideColor: '#2E9648',
  },
  event: {
    topFaceColor: '#EA4335',
    topFaceStroke: '#EA4335',
    leftSideColor: '#BB352A',
    rightSideColor: '#D33C2F',
  },
  analytics: {
    topFaceColor: '#34A853',
    topFaceStroke: '#34A853',
    leftSideColor: '#267D3E',
    rightSideColor: '#2E9648',
  },
  identity: {
    topFaceColor: '#FBBC05',
    topFaceStroke: '#FBBC05',
    leftSideColor: '#C99604',
    rightSideColor: '#E2A905',
  },
  observability: {
    topFaceColor: '#FBBC05',
    topFaceStroke: '#FBBC05',
    leftSideColor: '#C99604',
    rightSideColor: '#E2A905',
  },
};

const BLOCK_FACE_PALETTES: Record<ProviderType, Record<BlockCategory, BlockFaceColors>> = {
  azure: AZURE_BLOCK_FACE_COLORS,
  aws: AWS_BLOCK_FACE_COLORS,
  gcp: GCP_BLOCK_FACE_COLORS,
};

const AZURE_BLOCK_STUD_COLORS: Record<BlockCategory, StudColorSpec> = {
  compute: {
    main: '#ff693b',
    shadow: '#e34113',
    highlight: '#FFB4A0',
  },
  database: {
    main: '#33b8f5',
    shadow: '#008acc',
    highlight: '#99DCFA',
  },
  storage: {
    main: '#99d11a',
    shadow: '#6b9d00',
    highlight: '#CCE88C',
  },
  gateway: {
    main: '#3393de',
    shadow: '#0066b8',
    highlight: '#99C9EE',
  },
  function: {
    main: '#ffca33',
    shadow: '#e6a600',
    highlight: '#FFE599',
  },
  queue: {
    main: '#8c8c8c',
    shadow: '#616161',
    highlight: '#C6C6C6',
  },
  event: {
    main: '#e16233',
    shadow: '#c03400',
    highlight: '#F0B099',
  },
  analytics: {
    main: '#8259D0',
    shadow: '#5B33AC',
    highlight: '#C1ADE8',
  },
  identity: {
    main: '#E65A4B',
    shadow: '#CC2B1B',
    highlight: '#F3ADA5',
  },
  observability: {
    main: '#3393DE',
    shadow: '#0066B8',
    highlight: '#99C9EE',
  },
};

function lightenHexColor(hex: string, ratio = 0.4): string {
  const normalizedHex = hex.replace('#', '');
  const colorValue = Number.parseInt(normalizedHex, 16);
  const r = (colorValue >> 16) & 0xff;
  const g = (colorValue >> 8) & 0xff;
  const b = colorValue & 0xff;

  const lightenChannel = (channel: number): number =>
    Math.round(channel + (255 - channel) * ratio);

  const toHex = (channel: number): string =>
    channel.toString(16).padStart(2, '0').toUpperCase();

  return `#${toHex(lightenChannel(r))}${toHex(lightenChannel(g))}${toHex(lightenChannel(b))}`;
}

function buildStudPaletteFromFacePalette(facePalette: Record<BlockCategory, BlockFaceColors>): Record<BlockCategory, StudColorSpec> {
  return BLOCK_CATEGORIES.reduce<Record<BlockCategory, StudColorSpec>>((palette, category) => {
    const faceColors = facePalette[category];
    palette[category] = {
      main: faceColors.topFaceStroke,
      shadow: faceColors.rightSideColor,
      highlight: lightenHexColor(faceColors.topFaceStroke),
    };
    return palette;
  }, {} as Record<BlockCategory, StudColorSpec>);
}

const BLOCK_STUD_PALETTES: Record<ProviderType, Record<BlockCategory, StudColorSpec>> = {
  azure: AZURE_BLOCK_STUD_COLORS,
  aws: buildStudPaletteFromFacePalette(AWS_BLOCK_FACE_COLORS),
  gcp: buildStudPaletteFromFacePalette(GCP_BLOCK_FACE_COLORS),
};

export function getBlockFaceColors(category: BlockCategory, provider: ProviderType = 'azure'): BlockFaceColors {
  return BLOCK_FACE_PALETTES[provider][category];
}

export function getBlockStudColors(category: BlockCategory, provider: ProviderType = 'azure'): StudColorSpec {
  return BLOCK_STUD_PALETTES[provider][category];
}

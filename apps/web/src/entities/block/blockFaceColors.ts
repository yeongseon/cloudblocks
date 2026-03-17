import type { BlockCategory, StudColorSpec } from '../../shared/types/index';
import { BLOCK_COLORS } from '../../shared/types/index';

export interface BlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

const BLOCK_FACE_TINTS: Record<
  BlockCategory,
  Omit<BlockFaceColors, 'topFaceColor'>
> = {
  compute: {
    topFaceStroke: '#FF7A52',
    leftSideColor: '#D93B0B',
    rightSideColor: '#E04418',
  },
  database: {
    topFaceStroke: '#33B8F5',
    leftSideColor: '#0078B4',
    rightSideColor: '#008ACC',
  },
  storage: {
    topFaceStroke: '#99D11A',
    leftSideColor: '#5A8500',
    rightSideColor: '#6B9D00',
  },
  gateway: {
    topFaceStroke: '#3393DE',
    leftSideColor: '#00569A',
    rightSideColor: '#0066B8',
  },
  function: {
    topFaceStroke: '#FFCA33',
    leftSideColor: '#CC9400',
    rightSideColor: '#E6A600',
  },
  queue: {
    topFaceStroke: '#8C8C8C',
    leftSideColor: '#525252',
    rightSideColor: '#616161',
  },
  event: {
    topFaceStroke: '#E16233',
    leftSideColor: '#A82D00',
    rightSideColor: '#C03400',
  },
  timer: {
    topFaceStroke: '#7546AA',
    leftSideColor: '#3E1D63',
    rightSideColor: '#4D257A',
  },
};

const BLOCK_STUD_COLORS: Record<BlockCategory, StudColorSpec> = {
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
  timer: {
    main: '#7546aa',
    shadow: '#4d1e82',
    highlight: '#BAA3D5',
  },
};

export function getBlockFaceColors(category: BlockCategory): BlockFaceColors {
  return {
    topFaceColor: BLOCK_COLORS[category],
    ...BLOCK_FACE_TINTS[category],
  };
}

export function getBlockStudColors(category: BlockCategory): StudColorSpec {
  return BLOCK_STUD_COLORS[category];
}

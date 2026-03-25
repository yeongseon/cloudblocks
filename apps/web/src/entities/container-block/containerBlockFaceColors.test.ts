import { describe, expect, it } from 'vitest';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';

describe('getPlateFaceColors', () => {
  it('returns region colors for region container type', () => {
    expect(getContainerBlockFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#162537',
      topFaceStroke: '#4B6886',
      leftSideColor: '#0F1B2A',
      rightSideColor: '#0B1420',
    });
  });

  it('returns global colors for global container type', () => {
    expect(getContainerBlockFaceColors({ type: 'global' })).toEqual({
      topFaceColor: '#B39DDB',
      topFaceStroke: '#D1C4E9',
      leftSideColor: '#9575CD',
      rightSideColor: '#7E57C2',
    });
  });

  it('returns edge colors for edge container type', () => {
    expect(getContainerBlockFaceColors({ type: 'edge' })).toEqual({
      topFaceColor: '#80CBC4',
      topFaceStroke: '#B2DFDB',
      leftSideColor: '#4DB6AC',
      rightSideColor: '#26A69A',
    });
  });

  it('returns zone colors for zone container type', () => {
    expect(getContainerBlockFaceColors({ type: 'zone' })).toEqual({
      topFaceColor: '#A5D6A7',
      topFaceStroke: '#C8E6C9',
      leftSideColor: '#81C784',
      rightSideColor: '#66BB6A',
    });
  });

  it('returns unified navy subnet colors', () => {
    expect(getContainerBlockFaceColors({ type: 'subnet' })).toEqual({
      topFaceColor: '#22364B',
      topFaceStroke: '#7F9BB6',
      leftSideColor: '#182A3D',
      rightSideColor: '#122030',
    });
  });
});

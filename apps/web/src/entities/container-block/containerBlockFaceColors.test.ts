import { describe, expect, it } from 'vitest';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';

describe('getPlateFaceColors', () => {
  it('returns region colors for region container type', () => {
    expect(getContainerBlockFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#90CAF9',
      topFaceStroke: '#BBDEFB',
      leftSideColor: '#64B5F6',
      rightSideColor: '#42A5F5',
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

  it('returns unified indigo subnet colors', () => {
    expect(getContainerBlockFaceColors({ type: 'subnet' })).toEqual({
      topFaceColor: '#6366F1',
      topFaceStroke: '#818CF8',
      leftSideColor: '#4F46E5',
      rightSideColor: '#4338CA',
    });
  });
});

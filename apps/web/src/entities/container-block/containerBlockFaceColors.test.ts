import { describe, expect, it } from 'vitest';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';

describe('getPlateFaceColors', () => {
  it('returns region colors for region container type', () => {
    expect(getContainerBlockFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#0A6CB7',
      topFaceStroke: '#005EA6',
      leftSideColor: '#005A9E',
      rightSideColor: '#0060A9',
    });
  });

  it('returns global colors for global container type', () => {
    expect(getContainerBlockFaceColors({ type: 'global' })).toEqual({
      topFaceColor: '#3B97DE',
      topFaceStroke: '#2F87CB',
      leftSideColor: '#2D81C2',
      rightSideColor: '#308AD0',
    });
  });

  it('returns edge colors for edge container type', () => {
    expect(getContainerBlockFaceColors({ type: 'edge' })).toEqual({
      topFaceColor: '#238BDA',
      topFaceStroke: '#187BC7',
      leftSideColor: '#1776BE',
      rightSideColor: '#187ECB',
    });
  });

  it('returns zone colors for zone container type', () => {
    expect(getContainerBlockFaceColors({ type: 'zone' })).toEqual({
      topFaceColor: '#1784D8',
      topFaceStroke: '#0C75C5',
      leftSideColor: '#0B70BC',
      rightSideColor: '#0C77C9',
    });
  });

  it('returns unified navy subnet colors', () => {
    expect(getContainerBlockFaceColors({ type: 'subnet' })).toEqual({
      topFaceColor: '#0A74C5',
      topFaceStroke: '#0065B3',
      leftSideColor: '#0061AC',
      rightSideColor: '#0067B7',
    });
  });
});

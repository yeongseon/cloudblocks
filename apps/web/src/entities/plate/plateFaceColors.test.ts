import { describe, expect, it } from 'vitest';
import { getPlateFaceColors } from './plateFaceColors';

describe('getPlateFaceColors', () => {
it('returns region colors for region plate type', () => {
  expect(getPlateFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#90CAF9',
      topFaceStroke: '#BBDEFB',
      leftSideColor: '#64B5F6',
      rightSideColor: '#42A5F5',
  });
});

  it('returns public subnet colors for subnet with public access', () => {
    expect(getPlateFaceColors({ type: 'subnet', subnetAccess: 'public' })).toEqual({
      topFaceColor: '#22C55E',
      topFaceStroke: '#4ADE80',
      leftSideColor: '#16A34A',
      rightSideColor: '#15803D',
    });
  });

  it('returns private subnet colors by default', () => {
    expect(getPlateFaceColors({ type: 'subnet', subnetAccess: 'private' })).toEqual({
      topFaceColor: '#6366F1',
      topFaceStroke: '#818CF8',
      leftSideColor: '#4F46E5',
      rightSideColor: '#4338CA',
    });
  });
});

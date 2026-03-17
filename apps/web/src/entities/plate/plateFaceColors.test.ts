import { describe, expect, it } from 'vitest';
import { getPlateFaceColors } from './plateFaceColors';

describe('getPlateFaceColors', () => {
  it('returns network colors for network plate type', () => {
    expect(getPlateFaceColors({ type: 'network' })).toEqual({
      topFaceColor: '#2563EB',
      topFaceStroke: '#60A5FA',
      leftSideColor: '#1D4ED8',
      rightSideColor: '#1E40AF',
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

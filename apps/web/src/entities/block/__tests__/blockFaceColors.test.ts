import { describe, expect, it } from 'vitest';

import type { BlockCategory, ProviderType } from '../../../shared/types/index';
import { getBlockFaceColors } from '../blockFaceColors';

const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
const categories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'timer',
];

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

describe('getBlockFaceColors', () => {
  it('returns valid face colors for every provider and category pair', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const colors = getBlockFaceColors(category, provider);

        expect(colors).toBeDefined();
        expect(colors.topFaceColor).toMatch(hexColorPattern);
        expect(colors.topFaceStroke).toMatch(hexColorPattern);
        expect(colors.leftSideColor).toMatch(hexColorPattern);
        expect(colors.rightSideColor).toMatch(hexColorPattern);
      }
    }
  });

  it('uses distinct top-face colors across providers for the same category', () => {
    for (const category of categories) {
      const providerTopColors = providers.map((provider) =>
        getBlockFaceColors(category, provider).topFaceColor
      );

      expect(new Set(providerTopColors).size).toBe(providers.length);
    }
  });

  it('defaults to azure colors when provider is omitted or undefined', () => {
    for (const category of categories) {
      const azure = getBlockFaceColors(category, 'azure');
      const omittedProvider = getBlockFaceColors(category);
      const undefinedProvider = getBlockFaceColors(category, undefined);

      expect(omittedProvider).toEqual(azure);
      expect(undefinedProvider).toEqual(azure);
    }
  });
});

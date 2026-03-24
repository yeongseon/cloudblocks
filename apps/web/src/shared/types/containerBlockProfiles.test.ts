import { describe, expect, it } from 'vitest';

import type { ContainerBlockProfileId } from './index';
import {
  CONTAINER_BLOCK_PROFILES,
  buildContainerBlockSizeFromProfileId,
  getContainerBlockProfile,
  inferLegacyContainerBlockProfileId,
} from './index';

const profileIds = Object.keys(CONTAINER_BLOCK_PROFILES) as ContainerBlockProfileId[];

describe('container profile helpers', () => {
  it('defines exactly 8 container profiles with 4 network and 4 subnet', () => {
    const profiles = Object.values(CONTAINER_BLOCK_PROFILES);
    expect(profiles).toHaveLength(8);
    expect(profiles.filter((profile) => profile.type === 'region')).toHaveLength(4);
    expect(profiles.filter((profile) => profile.type === 'subnet')).toHaveLength(4);
  });

  it('returns the correct profile for each profile id', () => {
    for (const profileId of profileIds) {
      expect(getContainerBlockProfile(profileId)).toEqual(CONTAINER_BLOCK_PROFILES[profileId]);
    }
  });

  it('builds container size from each profile id', () => {
    for (const profileId of profileIds) {
      const profile = CONTAINER_BLOCK_PROFILES[profileId];
      expect(buildContainerBlockSizeFromProfileId(profileId)).toEqual({
        width: profile.worldWidth,
        depth: profile.worldDepth,
        height: profile.worldHeight,
      });
    }
  });

  it('infers exact legacy profile matches for known dimensions', () => {
    expect(
      inferLegacyContainerBlockProfileId({
        type: 'region',
        size: { width: 16, depth: 20 },
      }),
    ).toBe('network-platform');

    expect(
      inferLegacyContainerBlockProfileId({
        type: 'subnet',
        size: { width: 6, depth: 8 },
      }),
    ).toBe('subnet-service');
  });

  it('infers the closest network profile by area for non-exact legacy dimensions', () => {
    expect(
      inferLegacyContainerBlockProfileId({
        type: 'region',
        size: { width: 14, depth: 18 },
      }),
    ).toBe('network-application');
  });

  it('round-trips all profile ids through size builder and legacy inference', () => {
    for (const profileId of profileIds) {
      const profile = CONTAINER_BLOCK_PROFILES[profileId];
      const size = buildContainerBlockSizeFromProfileId(profileId);
      expect(
        inferLegacyContainerBlockProfileId({
          type: profile.type,
          size: { width: size.width, depth: size.depth },
        }),
      ).toBe(profileId);
    }
  });
});

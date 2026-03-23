import { describe, expect, it } from 'vitest';

import type { PlateProfileId, StudColorSpec } from './index';
import {
  NETWORK_STUD_COLORS,
  PLATE_PROFILES,
  SUBNET_STUD_COLORS,
  buildPlateSizeFromProfileId,
  getPlateProfile,
  getPlateStudColors,
  inferLegacyPlateProfileId,
} from './index';

const profileIds = Object.keys(PLATE_PROFILES) as PlateProfileId[];

describe('plate profile helpers', () => {
  it('defines exactly 8 plate profiles with 4 network and 4 subnet', () => {
    const profiles = Object.values(PLATE_PROFILES);
    expect(profiles).toHaveLength(8);
    expect(profiles.filter((profile) => profile.type === 'region')).toHaveLength(4);
    expect(profiles.filter((profile) => profile.type === 'subnet')).toHaveLength(4);
  });

  it('returns the correct profile for each profile id', () => {
    for (const profileId of profileIds) {
      expect(getPlateProfile(profileId)).toEqual(PLATE_PROFILES[profileId]);
    }
  });

  it('builds plate size from each profile id', () => {
    for (const profileId of profileIds) {
      const profile = PLATE_PROFILES[profileId];
      expect(buildPlateSizeFromProfileId(profileId)).toEqual({
        width: profile.worldWidth,
        depth: profile.worldDepth,
        height: profile.worldHeight,
      });
    }
  });

  it('infers exact legacy profile matches for known dimensions', () => {
    expect(
      inferLegacyPlateProfileId({
        type: 'region',
        size: { width: 16, depth: 20 },
      }),
    ).toBe('network-platform');

    expect(
      inferLegacyPlateProfileId({
        type: 'subnet',
        size: { width: 6, depth: 8 },
      }),
    ).toBe('subnet-service');
  });

  it('infers the closest network profile by area for non-exact legacy dimensions', () => {
    expect(
      inferLegacyPlateProfileId({
        type: 'region',
        size: { width: 14, depth: 18 },
      }),
    ).toBe('network-application');
  });

  it('round-trips all profile ids through size builder and legacy inference', () => {
    for (const profileId of profileIds) {
      const profile = PLATE_PROFILES[profileId];
      const size = buildPlateSizeFromProfileId(profileId);
      expect(
        inferLegacyPlateProfileId({
          type: profile.type,
          size: { width: size.width, depth: size.depth },
        }),
      ).toBe(profileId);
    }
  });

  it('returns network stud colors for network plates', () => {
    expect(getPlateStudColors({ type: 'region' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'global' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'edge' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'zone' })).toEqual(NETWORK_STUD_COLORS);
  });

  it('returns unified subnet stud colors for all subnet plates', () => {
    expect(getPlateStudColors({ type: 'subnet' })).toEqual(SUBNET_STUD_COLORS);
  });

  it('exports valid stud color specs', () => {
    const specs: StudColorSpec[] = [NETWORK_STUD_COLORS, SUBNET_STUD_COLORS];

    for (const spec of specs) {
      expect(spec.main).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.highlight).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

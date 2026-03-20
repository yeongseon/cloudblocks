import { describe, expect, it } from 'vitest';

import type { PlateProfileId, StudColorSpec } from './index';
import {
  DEFAULT_PLATE_PROFILE,
  DEFAULT_PLATE_SIZE,
  NETWORK_STUD_COLORS,
  PLATE_PROFILES,
  PRIVATE_SUBNET_STUD_COLORS,
  PUBLIC_SUBNET_STUD_COLORS,
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
      })
    ).toBe('network-platform');

    expect(
      inferLegacyPlateProfileId({
        type: 'subnet',
        size: { width: 6, depth: 8 },
      })
    ).toBe('subnet-service');
  });

  it('infers the closest network profile by area for non-exact legacy dimensions', () => {
    expect(
      inferLegacyPlateProfileId({
        type: 'region',
        size: { width: 14, depth: 18 },
      })
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
        })
      ).toBe(profileId);
    }
  });

  it('returns network stud colors for network plates', () => {
    expect(getPlateStudColors({ type: 'region' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'global' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'edge' })).toEqual(NETWORK_STUD_COLORS);
    expect(getPlateStudColors({ type: 'zone' })).toEqual(NETWORK_STUD_COLORS);
  });

  it('returns public subnet stud colors for public subnet plates', () => {
    expect(getPlateStudColors({ type: 'subnet', subnetAccess: 'public' })).toEqual(
      PUBLIC_SUBNET_STUD_COLORS
    );
  });

  it('returns private subnet stud colors for private subnet plates', () => {
    expect(getPlateStudColors({ type: 'subnet', subnetAccess: 'private' })).toEqual(
      PRIVATE_SUBNET_STUD_COLORS
    );
  });

  it('defaults subnet stud colors to private when subnetAccess is missing', () => {
    expect(getPlateStudColors({ type: 'subnet' })).toEqual(PRIVATE_SUBNET_STUD_COLORS);
  });

  it('defines expected default profile ids by plate type', () => {
    expect(DEFAULT_PLATE_PROFILE.global).toBe('network-hub');
    expect(DEFAULT_PLATE_PROFILE.edge).toBe('network-sandbox');
    expect(DEFAULT_PLATE_PROFILE.region).toBe('network-platform');
    expect(DEFAULT_PLATE_PROFILE.zone).toBe('network-application');
    expect(DEFAULT_PLATE_PROFILE.subnet).toBe('subnet-service');
  });

  it('defines expected default plate sizes from default profiles', () => {
    expect(DEFAULT_PLATE_SIZE.global).toEqual(
      buildPlateSizeFromProfileId('network-hub')
    );
    expect(DEFAULT_PLATE_SIZE.edge).toEqual(
      buildPlateSizeFromProfileId('network-sandbox')
    );
    expect(DEFAULT_PLATE_SIZE.region).toEqual(
      buildPlateSizeFromProfileId('network-platform')
    );
    expect(DEFAULT_PLATE_SIZE.zone).toEqual(
      buildPlateSizeFromProfileId('network-application')
    );
    expect(DEFAULT_PLATE_SIZE.subnet).toEqual(buildPlateSizeFromProfileId('subnet-service'));
  });

  it('exports valid stud color specs', () => {
    const specs: StudColorSpec[] = [
      NETWORK_STUD_COLORS,
      PUBLIC_SUBNET_STUD_COLORS,
      PRIVATE_SUBNET_STUD_COLORS,
    ];

    for (const spec of specs) {
      expect(spec.main).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.highlight).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

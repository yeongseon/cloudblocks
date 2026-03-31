import { describe, expect, it } from 'vitest';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';
import type { ProviderType, LayerType } from '@cloudblocks/schema';
import { PROVIDER_BRAND_COLOR } from '../block/blockFaceColors';

type PlateLayerType = Exclude<LayerType, 'resource'>;

// ─── Deterministic hex tests (Azure default) ─────────────────

describe('getContainerBlockFaceColors — deterministic', () => {
  it('returns region colors for region container type', () => {
    expect(getContainerBlockFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#6D9ABD',
      topFaceStroke: '#628CAD',
      leftSideColor: '#648FB1',
      rightSideColor: '#6793B6',
    });
  });

  it('returns global colors for global container type', () => {
    expect(getContainerBlockFaceColors({ type: 'global' })).toEqual({
      topFaceColor: '#A6BACA',
      topFaceStroke: '#97AAB9',
      leftSideColor: '#9AAEBD',
      rightSideColor: '#9FB3C3',
    });
  });

  it('returns edge colors for edge container type', () => {
    expect(getContainerBlockFaceColors({ type: 'edge' })).toEqual({
      topFaceColor: '#97B1C4',
      topFaceStroke: '#89A1B3',
      leftSideColor: '#8CA5B7',
      rightSideColor: '#91AABD',
    });
  });

  it('returns zone colors for zone container type', () => {
    expect(getContainerBlockFaceColors({ type: 'zone' })).toEqual({
      topFaceColor: '#86A8C1',
      topFaceStroke: '#7999B1',
      leftSideColor: '#7C9CB4',
      rightSideColor: '#80A1BA',
    });
  });

  it('returns subnet colors for subnet container type', () => {
    expect(getContainerBlockFaceColors({ type: 'subnet' })).toEqual({
      topFaceColor: '#779FBD',
      topFaceStroke: '#6B90AD',
      leftSideColor: '#6D94B1',
      rightSideColor: '#7198B6',
    });
  });
});

// ─── Multi-provider deterministic tests ─────────────────────

describe('getContainerBlockFaceColors — providers', () => {
  it('returns AWS region colors', () => {
    expect(getContainerBlockFaceColors({ type: 'region', provider: 'aws' })).toEqual({
      topFaceColor: '#BE9B82',
      topFaceStroke: '#AE8D75',
      leftSideColor: '#B29077',
      rightSideColor: '#B7947B',
    });
  });

  it('returns GCP region colors', () => {
    expect(getContainerBlockFaceColors({ type: 'region', provider: 'gcp' })).toEqual({
      topFaceColor: '#85AE8F',
      topFaceStroke: '#789E82',
      leftSideColor: '#7AA285',
      rightSideColor: '#7EA789',
    });
  });
});

// ─── Invariant / property-based tests ───────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = Number.parseInt(h, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

describe('getContainerBlockFaceColors — invariants', () => {
  const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
  const layers: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

  for (const provider of providers) {
    describe(`${provider} containers`, () => {
      const brandHex = PROVIDER_BRAND_COLOR[provider];
      const [br, bg, bb] = hexToRgb(brandHex);
      const brandHsl = rgbToHsl(br, bg, bb);

      it('container top face is less saturated than brand color', () => {
        for (const layer of layers) {
          const colors = getContainerBlockFaceColors({ type: layer, provider });
          const [r, g, b] = hexToRgb(colors.topFaceColor);
          const topHsl = rgbToHsl(r, g, b);
          expect(topHsl.s).toBeLessThan(brandHsl.s);
        }
      });

      it('container top face is lighter than brand color', () => {
        for (const layer of layers) {
          const colors = getContainerBlockFaceColors({ type: layer, provider });
          const [r, g, b] = hexToRgb(colors.topFaceColor);
          const topHsl = rgbToHsl(r, g, b);
          expect(topHsl.l).toBeGreaterThan(brandHsl.l);
        }
      });

      it('preserves provider hue (within ±5° tolerance)', () => {
        for (const layer of layers) {
          const colors = getContainerBlockFaceColors({ type: layer, provider });
          const [r, g, b] = hexToRgb(colors.topFaceColor);
          const topHsl = rgbToHsl(r, g, b);
          // Hue distance on circular scale
          const hueDiff = Math.abs(topHsl.h - brandHsl.h);
          const circularDiff = Math.min(hueDiff, 360 - hueDiff);
          expect(circularDiff).toBeLessThanOrEqual(5);
        }
      });

      it('face derivation deltas are narrower than resource blocks', () => {
        // Container: top=lighten(2), right=darken(3), left=darken(6)
        // Resource:  top=lighten(4), right=darken(6), left=darken(12)
        // So container left should be lighter than what resource derivation would produce
        for (const layer of layers) {
          const colors = getContainerBlockFaceColors({ type: layer, provider });
          const [topR, topG, topB] = hexToRgb(colors.topFaceColor);
          const [leftR, leftG, leftB] = hexToRgb(colors.leftSideColor);
          const topLum = topR * 0.299 + topG * 0.587 + topB * 0.114;
          const leftLum = leftR * 0.299 + leftG * 0.587 + leftB * 0.114;
          // top - left delta should be small (< 15 luminance units)
          expect(topLum - leftLum).toBeLessThan(15);
        }
      });
    });
  }

  it('different providers produce distinguishable colors', () => {
    const azureRegion = getContainerBlockFaceColors({ type: 'region', provider: 'azure' });
    const awsRegion = getContainerBlockFaceColors({ type: 'region', provider: 'aws' });
    const gcpRegion = getContainerBlockFaceColors({ type: 'region', provider: 'gcp' });

    // All three should have different top face colors
    expect(azureRegion.topFaceColor).not.toBe(awsRegion.topFaceColor);
    expect(azureRegion.topFaceColor).not.toBe(gcpRegion.topFaceColor);
    expect(awsRegion.topFaceColor).not.toBe(gcpRegion.topFaceColor);
  });
});

import { describe, expect, it } from 'vitest';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';
import type { ProviderType, LayerType } from '@cloudblocks/schema';
import { PROVIDER_BRAND_COLOR } from '../block/blockFaceColors';

type PlateLayerType = Exclude<LayerType, 'resource'>;

// ─── Deterministic hex tests (Azure default) ─────────────────

describe('getContainerBlockFaceColors — deterministic', () => {
  it('returns region colors for region container type', () => {
    expect(getContainerBlockFaceColors({ type: 'region' })).toEqual({
      topFaceColor: '#99B1C3',
      topFaceStroke: '#889EAF',
      leftSideColor: '#8EA5B6',
      rightSideColor: '#92AABC',
    });
  });

  it('returns global colors for global container type', () => {
    expect(getContainerBlockFaceColors({ type: 'global' })).toEqual({
      topFaceColor: '#B9C6CF',
      topFaceStroke: '#A6B1B9',
      leftSideColor: '#ADB9C2',
      rightSideColor: '#B2BFC8',
    });
  });

  it('returns edge colors for edge container type', () => {
    expect(getContainerBlockFaceColors({ type: 'edge' })).toEqual({
      topFaceColor: '#A9BAC7',
      topFaceStroke: '#96A7B2',
      leftSideColor: '#9DAEBA',
      rightSideColor: '#A2B3C0',
    });
  });

  it('returns zone colors for zone container type', () => {
    expect(getContainerBlockFaceColors({ type: 'zone' })).toEqual({
      topFaceColor: '#88A8BF',
      topFaceStroke: '#7995AB',
      leftSideColor: '#7E9CB3',
      rightSideColor: '#82A1B8',
    });
  });

  it('returns subnet colors for subnet container type', () => {
    expect(getContainerBlockFaceColors({ type: 'subnet' })).toEqual({
      topFaceColor: '#789FBC',
      topFaceStroke: '#698DA8',
      leftSideColor: '#6E94B0',
      rightSideColor: '#7198B5',
    });
  });
});

// ─── Multi-provider deterministic tests ─────────────────────

describe('getContainerBlockFaceColors — providers', () => {
  it('returns AWS region colors', () => {
    expect(getContainerBlockFaceColors({ type: 'region', provider: 'aws' })).toEqual({
      topFaceColor: '#C8B6AA',
      topFaceStroke: '#B3A397',
      leftSideColor: '#BBAA9E',
      rightSideColor: '#C1B0A3',
    });
  });

  it('returns GCP region colors', () => {
    expect(getContainerBlockFaceColors({ type: 'region', provider: 'gcp' })).toEqual({
      topFaceColor: '#A8BCAD',
      topFaceStroke: '#95A89A',
      leftSideColor: '#9CB0A1',
      rightSideColor: '#A1B5A6',
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
        // Resource:  top=lighten(6), right=darken(8), left=darken(15)
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

  it('layer ladder is strictly monotonic: outer→inner = lighter→darker, less→more saturated', () => {
    for (const provider of providers) {
      const hslByLayer = layers.map((layer) => {
        const colors = getContainerBlockFaceColors({ type: layer, provider });
        const [r, g, b] = hexToRgb(colors.topFaceColor);
        return rgbToHsl(r, g, b);
      });

      for (let i = 1; i < hslByLayer.length; i++) {
        // saturation strictly increases outer → inner
        expect(hslByLayer[i].s).toBeGreaterThan(hslByLayer[i - 1].s);
        // lightness strictly decreases outer → inner
        expect(hslByLayer[i].l).toBeLessThan(hslByLayer[i - 1].l);
      }
    }
  });
});

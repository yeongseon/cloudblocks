import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { ContainerBlockSvg } from './ContainerBlockSvg';
import type { LayerType } from '@cloudblocks/schema';
import { TILE_W, TILE_H, TILE_Z, BLOCK_PADDING } from '../../shared/tokens/designTokens';

type PlateLayerType = Exclude<LayerType, 'resource'>;

const defaultProps: ComponentProps<typeof ContainerBlockSvg> = {
  containerLayer: 'subnet',
  unitsX: 4,
  unitsY: 6,
  worldHeight: 0.5,
  topFaceColor: '#22C55E',
  topFaceStroke: '#4ADE80',
  leftSideColor: '#16A34A',
  rightSideColor: '#15803D',
};

function renderPlateSvg(props?: Partial<ComponentProps<typeof ContainerBlockSvg>>) {
  return render(<ContainerBlockSvg {...defaultProps} {...props} />);
}

// ─── Label & Icon Rendering ─────────────────────────────────

describe('PlateSvg — label and icon', () => {
  it('renders both label and icon when both props are provided', () => {
    const { container } = renderPlateSvg({ label: 'Subnet 1', iconUrl: 'test-icon.svg' });

    expect(screen.getByText('Subnet 1')).toBeInTheDocument();
    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
    expect(images[0]).toHaveAttribute('href', 'test-icon.svg');
  });

  it('renders label only when iconUrl is omitted', () => {
    const { container } = renderPlateSvg({ label: 'Subnet 2' });

    expect(screen.getByText('Subnet 2')).toBeInTheDocument();
    expect(container.querySelectorAll('image').length).toBe(0);
  });

  it('renders icon only when label is omitted', () => {
    const { container } = renderPlateSvg({ iconUrl: 'test-icon.svg' });

    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
    expect(screen.queryByText('Subnet 1')).not.toBeInTheDocument();
  });

  it('renders no text or image elements when neither label nor iconUrl provided', () => {
    const { container } = renderPlateSvg();

    expect(container.querySelectorAll('text')).toHaveLength(0);
    expect(container.querySelectorAll('image')).toHaveLength(0);
  });
});

// ─── ContainerBlock Type Attribute ───────────────────────────────────

describe('PlateSvg — container type attribute', () => {
  const allTypes: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

  it.each(allTypes)('sets data-container-type="%s"', (type) => {
    const { container } = renderPlateSvg({ containerLayer: type });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-container-type')).toBe(type);
  });
});

// ─── CU-Based Dimension Calculation ─────────────────────────

describe('PlateSvg — CU-based dimensions', () => {
  it('computes correct viewBox from unitsX/unitsY (CU)', () => {
    const unitsX = 8;
    const unitsY = 12;
    const worldHeight = 0.7;
    const { container } = renderPlateSvg({ unitsX, unitsY, worldHeight });

    const expectedWidth = ((unitsX + unitsY) * TILE_W) / 2;
    const expectedDiamondH = ((unitsX + unitsY) * TILE_H) / 2;
    const expectedSideWall = Math.round(worldHeight * TILE_Z);
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });

  it('handles small subnet profile (4×6 CU)', () => {
    const { container } = renderPlateSvg({ unitsX: 4, unitsY: 6, worldHeight: 0.5 });

    const expectedWidth = ((4 + 6) * TILE_W) / 2; // 320
    const expectedDiamondH = ((4 + 6) * TILE_H) / 2; // 160
    const expectedSideWall = Math.round(0.5 * TILE_Z); // 16
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });

  it('handles large network profile (20×24 CU)', () => {
    const { container } = renderPlateSvg({ unitsX: 20, unitsY: 24, worldHeight: 0.7 });

    const expectedWidth = ((20 + 24) * TILE_W) / 2; // 1408
    const expectedDiamondH = ((20 + 24) * TILE_H) / 2; // 704
    const expectedSideWall = Math.round(0.7 * TILE_Z); // 22
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });
});

// ─── SVG Structure ──────────────────────────────────────────

describe('PlateSvg — SVG structure', () => {
  it('renders 3 face polygons (top, left side, right side)', () => {
    const { container } = renderPlateSvg();
    // Exclude polygons inside <clipPath> (used by PlateSurfaceGrid)
    const polygons = container.querySelectorAll('polygon:not(clipPath polygon)');
    expect(polygons.length).toBe(3);
  });

  it('applies correct fill colors to face polygons', () => {
    const { container } = renderPlateSvg();
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0].getAttribute('fill')).toBe('#22C55E'); // top
    expect(polygons[1].getAttribute('fill')).toBe('#16A34A'); // left
    expect(polygons[2].getAttribute('fill')).toBe('#15803D'); // right
  });
});

// ─── Layer-Type Visual Differentiation ──────────────────────

describe('PlateSvg — layer-type visuals', () => {
  it('global container has thicker border than subnet', () => {
    const { container: globalC } = renderPlateSvg({ containerLayer: 'global' });
    const { container: subnetC } = renderPlateSvg({ containerLayer: 'subnet' });

    const globalStroke = Number(globalC.querySelector('polygon')?.getAttribute('stroke-width'));
    const subnetStroke = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-width'));
    expect(globalStroke).toBeGreaterThan(subnetStroke);
  });

  it('global container has higher stroke opacity than subnet', () => {
    const { container: globalC } = renderPlateSvg({ containerLayer: 'global' });
    const { container: subnetC } = renderPlateSvg({ containerLayer: 'subnet' });

    const globalOpacity = Number(globalC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    const subnetOpacity = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    expect(globalOpacity).toBeGreaterThan(subnetOpacity);
  });

  it('each container type gets a distinct stroke width', () => {
    const types: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
    const strokeWidths = types.map((type) => {
      const { container } = renderPlateSvg({ containerLayer: type });
      return Number(container.querySelector('polygon')?.getAttribute('stroke-width'));
    });

    // All stroke widths should be unique
    const unique = new Set(strokeWidths);
    expect(unique.size).toBe(types.length);
  });

  it('stroke widths follow hierarchy: global > edge > region > zone > subnet', () => {
    const types: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
    const strokeWidths = types.map((type) => {
      const { container } = renderPlateSvg({ containerLayer: type });
      return Number(container.querySelector('polygon')?.getAttribute('stroke-width'));
    });

    for (let i = 0; i < strokeWidths.length - 1; i++) {
      expect(strokeWidths[i]).toBeGreaterThan(strokeWidths[i + 1]);
    }
  });

  it('global container label uses larger font than subnet', () => {
    const { container: globalC } = renderPlateSvg({ containerLayer: 'global', label: 'Global' });
    const { container: subnetC } = renderPlateSvg({ containerLayer: 'subnet', label: 'Subnet' });

    const globalFontSize = Number(globalC.querySelector('text')?.getAttribute('font-size'));
    const subnetFontSize = Number(subnetC.querySelector('text')?.getAttribute('font-size'));
    expect(globalFontSize).toBeGreaterThan(subnetFontSize);
  });

  it('global container icon uses larger size than zone', () => {
    const { container: globalC } = renderPlateSvg({
      containerLayer: 'global',
      iconUrl: 'icon-g.svg',
    });
    const { container: zoneC } = renderPlateSvg({ containerLayer: 'zone', iconUrl: 'icon-z.svg' });

    const globalSize = Number(globalC.querySelector('image')?.getAttribute('width'));
    const zoneSize = Number(zoneC.querySelector('image')?.getAttribute('width'));
    expect(globalSize).toBeGreaterThan(zoneSize);
  });
});

// ─── Color Independence (container type doesn't affect colors) ──

describe('PlateSvg — colors are independent of containerLayer', () => {
  it('uses the provided face colors regardless of container type', () => {
    const customColors = {
      topFaceColor: '#FF0000',
      topFaceStroke: '#FF5555',
      leftSideColor: '#CC0000',
      rightSideColor: '#990000',
    };

    const { container } = renderPlateSvg({ containerLayer: 'global', ...customColors });
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0].getAttribute('fill')).toBe('#FF0000');
    expect(polygons[1].getAttribute('fill')).toBe('#CC0000');
    expect(polygons[2].getAttribute('fill')).toBe('#990000');
  });
});

// ─── All ContainerBlock Profiles Render Correctly ────────────────────

describe('PlateSvg — profile-based rendering', () => {
  const profiles = [
    {
      name: 'network-sandbox',
      unitsX: 8,
      unitsY: 12,
      worldHeight: 0.7,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-application',
      unitsX: 12,
      unitsY: 16,
      worldHeight: 0.7,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-platform',
      unitsX: 16,
      unitsY: 20,
      worldHeight: 0.7,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-hub',
      unitsX: 20,
      unitsY: 24,
      worldHeight: 0.7,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'subnet-utility',
      unitsX: 4,
      unitsY: 6,
      worldHeight: 0.5,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-service',
      unitsX: 6,
      unitsY: 8,
      worldHeight: 0.5,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-workload',
      unitsX: 8,
      unitsY: 10,
      worldHeight: 0.5,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-scale',
      unitsX: 10,
      unitsY: 12,
      worldHeight: 0.5,
      containerLayer: 'subnet' as PlateLayerType,
    },
  ];

  it.each(profiles)('renders $name profile with correct viewBox', (profile) => {
    const { container } = renderPlateSvg({
      containerLayer: profile.containerLayer,
      unitsX: profile.unitsX,
      unitsY: profile.unitsY,
      worldHeight: profile.worldHeight,
    });

    const expectedWidth = ((profile.unitsX + profile.unitsY) * TILE_W) / 2;
    const expectedDiamondH = ((profile.unitsX + profile.unitsY) * TILE_H) / 2;
    const expectedSideWall = Math.round(profile.worldHeight * TILE_Z);
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });
});

// ─── Backward Compatibility ─────────────────────────────────

describe('PlateSvg — backward compatibility', () => {
  it('pixel dimensions match v1.x formula at RENDER_SCALE=32', () => {
    // Subnet-utility: 4×6 CU, worldHeight 0.5
    const unitsX = 4;
    const unitsY = 6;
    const worldHeight = 0.5;

    // v1.x formula: screenWidth = (unitsX + unitsY) * TILE_W / 2
    const expectedWidth = ((unitsX + unitsY) * 64) / 2; // 320
    const expectedDiamondH = ((unitsX + unitsY) * 32) / 2; // 160
    const expectedSideWall = Math.round(worldHeight * 32); // 16

    const { container } = renderPlateSvg({ unitsX, unitsY, worldHeight });
    const svg = container.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox')?.split(' ').map(Number);

    expect(viewBox?.[2]).toBe(expectedWidth);
    expect(viewBox?.[3]).toBe(expectedDiamondH + expectedSideWall + BLOCK_PADDING);
  });
});

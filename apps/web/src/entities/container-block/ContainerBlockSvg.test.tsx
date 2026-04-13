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
  it('renders icon when both label and icon props are provided', () => {
    const { container } = renderPlateSvg({ label: 'Subnet 1', iconUrl: 'test-icon.svg' });

    // Label is now rendered as HTML chip outside SVG, so no SVG <text>
    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
    expect(images[0]).toHaveAttribute('href', 'test-icon.svg');
  });

  it('renders no icon when iconUrl is omitted', () => {
    const { container } = renderPlateSvg({ label: 'Subnet 2' });

    // Label is now HTML chip — no SVG text element
    expect(container.querySelectorAll('image').length).toBe(0);
  });

  it('renders icon only when label is omitted', () => {
    const { container } = renderPlateSvg({ iconUrl: 'test-icon.svg' });

    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
    expect(screen.queryByText('Subnet 1')).not.toBeInTheDocument();
  });

  it('renders short label text but no image when neither label nor iconUrl provided', () => {
    const { container } = renderPlateSvg();

    expect(container.querySelectorAll('text')).toHaveLength(1);
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
    const { container } = renderPlateSvg({ unitsX: 4, unitsY: 6, worldHeight: 0.8 });

    const expectedWidth = ((4 + 6) * TILE_W) / 2; // 320
    const expectedDiamondH = ((4 + 6) * TILE_H) / 2; // 160
    const expectedSideWall = Math.round(0.8 * TILE_Z);
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });

  it('handles large network profile (20×24 CU)', () => {
    const { container } = renderPlateSvg({ unitsX: 20, unitsY: 24, worldHeight: 1.25 });

    const expectedWidth = ((20 + 24) * TILE_W) / 2; // 1408
    const expectedDiamondH = ((20 + 24) * TILE_H) / 2; // 704
    const expectedSideWall = Math.round(1.25 * TILE_Z);
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });
});

// ─── SVG Structure ──────────────────────────────────────────

describe('PlateSvg — SVG structure', () => {
  it('renders 5 face polygons (top + 2 inset + left side + right side)', () => {
    const { container } = renderPlateSvg();
    // Exclude polygons inside <clipPath> (used by PlateSurfaceGrid)
    const polygons = container.querySelectorAll(
      'polygon:not(clipPath polygon):not([data-anchor-cell])',
    );
    expect(polygons.length).toBe(5);
  });

  it('applies correct fill colors to face polygons', () => {
    const { container } = renderPlateSvg();
    const polygons = container.querySelectorAll(
      'polygon:not(clipPath polygon):not([data-anchor-cell])',
    );

    expect(polygons[0].getAttribute('fill')).toBe('#22C55E'); // top
    // polygons[1] = inset-highlight (fill=none), polygons[2] = inset-shadow (fill=none)
    expect(polygons[3].getAttribute('fill')).toBe('#16A34A'); // left
    expect(polygons[4].getAttribute('fill')).toBe('#15803D'); // right
  });
});

// ─── Layer-Type Visual Differentiation ──────────────────────

describe('PlateSvg — layer-type visuals', () => {
  it('subnet container has thicker border than global (inner layers are more prominent)', () => {
    const { container: globalC } = renderPlateSvg({ containerLayer: 'global' });
    const { container: subnetC } = renderPlateSvg({ containerLayer: 'subnet' });

    const globalStroke = Number(globalC.querySelector('polygon')?.getAttribute('stroke-width'));
    const subnetStroke = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-width'));
    expect(subnetStroke).toBeGreaterThan(globalStroke);
  });

  it('subnet container has higher stroke opacity than global (inner layers are more prominent)', () => {
    const { container: globalC } = renderPlateSvg({ containerLayer: 'global' });
    const { container: subnetC } = renderPlateSvg({ containerLayer: 'subnet' });

    const globalOpacity = Number(globalC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    const subnetOpacity = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    expect(subnetOpacity).toBeGreaterThan(globalOpacity);
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

  it('stroke widths follow hierarchy: subnet > zone > region > edge > global (inner = more prominent)', () => {
    const types: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
    const strokeWidths = types.map((type) => {
      const { container } = renderPlateSvg({ containerLayer: type });
      return Number(container.querySelector('polygon')?.getAttribute('stroke-width'));
    });

    // Inner layers should have thicker strokes than outer layers
    for (let i = 0; i < strokeWidths.length - 1; i++) {
      expect(strokeWidths[i]).toBeLessThan(strokeWidths[i + 1]);
    }
  });

  it('global container uses larger icon than subnet (text labels are now HTML chips)', () => {
    // SVG text labels were removed — labels are now screen-aligned HTML chips.
    // Verify icon size differentiation instead.
    const { container: globalC } = renderPlateSvg({
      containerLayer: 'global',
      iconUrl: 'icon-g.svg',
    });
    const { container: subnetC } = renderPlateSvg({
      containerLayer: 'subnet',
      iconUrl: 'icon-s.svg',
    });

    const globalSize = Number(globalC.querySelector('image')?.getAttribute('width'));
    const subnetSize = Number(subnetC.querySelector('image')?.getAttribute('width'));
    expect(globalSize).toBeGreaterThan(subnetSize);
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
    const polygons = container.querySelectorAll(
      'polygon:not(clipPath polygon):not([data-anchor-cell])',
    );

    expect(polygons[0].getAttribute('fill')).toBe('#FF0000');
    // polygons[1] = inset-highlight, polygons[2] = inset-shadow
    expect(polygons[3].getAttribute('fill')).toBe('#CC0000');
    expect(polygons[4].getAttribute('fill')).toBe('#990000');
  });
});

// ─── All ContainerBlock Profiles Render Correctly ────────────────────

describe('PlateSvg — profile-based rendering', () => {
  const profiles = [
    {
      name: 'network-sandbox',
      unitsX: 8,
      unitsY: 12,
      worldHeight: 1.25,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-application',
      unitsX: 12,
      unitsY: 16,
      worldHeight: 1.25,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-platform',
      unitsX: 16,
      unitsY: 20,
      worldHeight: 1.25,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'network-hub',
      unitsX: 20,
      unitsY: 24,
      worldHeight: 1.25,
      containerLayer: 'region' as PlateLayerType,
    },
    {
      name: 'subnet-utility',
      unitsX: 4,
      unitsY: 6,
      worldHeight: 0.8,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-service',
      unitsX: 6,
      unitsY: 8,
      worldHeight: 0.8,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-workload',
      unitsX: 8,
      unitsY: 10,
      worldHeight: 0.8,
      containerLayer: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-scale',
      unitsX: 10,
      unitsY: 12,
      worldHeight: 0.8,
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

describe('PlateSvg — placement anchor tiles (#1581)', () => {
  it('renders anchor markers clipped to top face when no occupied cells', () => {
    const { container } = renderPlateSvg({ unitsX: 3, unitsY: 3 });
    const markerGroup = container.querySelector('[data-layer="anchor-markers"]');
    expect(markerGroup).toBeInTheDocument();

    const markers = container.querySelectorAll('[data-anchor-cell]');
    expect(markers.length).toBe(16);
  });

  it('marks occupied cells with data-anchor-state="occupied"', () => {
    const occupied = new Set(['1:1', '1:2', '2:1', '2:2']);
    const { container } = renderPlateSvg({ unitsX: 3, unitsY: 3, occupiedCells: occupied });

    const occupiedMarkers = container.querySelectorAll('[data-anchor-state="occupied"]');
    expect(occupiedMarkers.length).toBe(4);

    const emptyMarkers = container.querySelectorAll('[data-anchor-state="empty"]');
    expect(emptyMarkers.length).toBe(12);
  });

  it('occupied markers have lower opacity than empty markers', () => {
    const occupied = new Set(['1:1']);
    const { container } = renderPlateSvg({ unitsX: 2, unitsY: 2, occupiedCells: occupied });

    const occupiedMarker = container.querySelector('[data-anchor-state="occupied"]');
    const emptyMarker = container.querySelector('[data-anchor-state="empty"]');

    const occupiedOpacity = Number(occupiedMarker?.getAttribute('opacity'));
    const emptyOpacity = Number(emptyMarker?.getAttribute('opacity'));
    expect(occupiedOpacity).toBeLessThan(emptyOpacity);
  });

  it('renders clipPath for anchor markers', () => {
    const { container } = renderPlateSvg({ unitsX: 3, unitsY: 3 });
    const clipPath = container.querySelector('clipPath');
    expect(clipPath).toBeInTheDocument();
  });
});

// ─── Backward Compatibility ─────────────────────────────────

describe('PlateSvg — backward compatibility', () => {
  it('pixel dimensions match v1.x formula at RENDER_SCALE=32', () => {
    const unitsX = 4;
    const unitsY = 6;
    const worldHeight = 0.8;

    // v1.x formula: screenWidth = (unitsX + unitsY) * TILE_W / 2
    const expectedWidth = ((unitsX + unitsY) * 64) / 2; // 320
    const expectedDiamondH = ((unitsX + unitsY) * 32) / 2; // 160
    const expectedSideWall = Math.round(worldHeight * 32);

    const { container } = renderPlateSvg({ unitsX, unitsY, worldHeight });
    const svg = container.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox')?.split(' ').map(Number);

    expect(viewBox?.[2]).toBe(expectedWidth);
    expect(viewBox?.[3]).toBe(expectedDiamondH + expectedSideWall + BLOCK_PADDING);
  });
});

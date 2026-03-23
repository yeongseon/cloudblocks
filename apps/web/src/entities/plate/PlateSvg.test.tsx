import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { PlateSvg } from './PlateSvg';
import type { StudColorSpec } from '../../shared/types/index';
import type { LayerType } from '@cloudblocks/schema';
import { TILE_W, TILE_H, TILE_Z, BLOCK_PADDING } from '../../shared/tokens/designTokens';
import { useUIStore } from '../store/uiStore';

type PlateLayerType = Exclude<LayerType, 'resource'>;

const studColors: StudColorSpec = {
  main: '#66BB6A',
  shadow: '#2E7D32',
  highlight: '#A5D6A7',
};

const defaultProps: ComponentProps<typeof PlateSvg> = {
  plateType: 'subnet',
  studsX: 4,
  studsY: 6,
  worldHeight: 0.5,
  studColors,
  topFaceColor: '#22C55E',
  topFaceStroke: '#4ADE80',
  leftSideColor: '#16A34A',
  rightSideColor: '#15803D',
};

function renderPlateSvg(props?: Partial<ComponentProps<typeof PlateSvg>>) {
  return render(<PlateSvg {...defaultProps} {...props} />);
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

// ─── Plate Type Attribute ───────────────────────────────────

describe('PlateSvg — plate type attribute', () => {
  const allTypes: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

  it.each(allTypes)('sets data-plate-type="%s"', (type) => {
    const { container } = renderPlateSvg({ plateType: type });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-plate-type')).toBe(type);
  });
});

// ─── CU-Based Dimension Calculation ─────────────────────────

describe('PlateSvg — CU-based dimensions', () => {
  it('computes correct viewBox from studsX/studsY (CU)', () => {
    const studsX = 8;
    const studsY = 12;
    const worldHeight = 0.7;
    const { container } = renderPlateSvg({ studsX, studsY, worldHeight });

    const expectedWidth = ((studsX + studsY) * TILE_W) / 2;
    const expectedDiamondH = ((studsX + studsY) * TILE_H) / 2;
    const expectedSideWall = Math.round(worldHeight * TILE_Z);
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });

  it('handles small subnet profile (4×6 CU)', () => {
    const { container } = renderPlateSvg({ studsX: 4, studsY: 6, worldHeight: 0.5 });

    const expectedWidth = ((4 + 6) * TILE_W) / 2; // 320
    const expectedDiamondH = ((4 + 6) * TILE_H) / 2; // 160
    const expectedSideWall = Math.round(0.5 * TILE_Z); // 16
    const expectedHeight = expectedDiamondH + expectedSideWall + BLOCK_PADDING;

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${expectedWidth} ${expectedHeight}`);
  });

  it('handles large network profile (20×24 CU)', () => {
    const { container } = renderPlateSvg({ studsX: 20, studsY: 24, worldHeight: 0.7 });

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
  beforeEach(() => {
    useUIStore.setState({ showStuds: true });
  });

  it('renders 3 face polygons (top, left side, right side)', () => {
    const { container } = renderPlateSvg();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(3);
  });

  it('applies correct fill colors to face polygons', () => {
    const { container } = renderPlateSvg();
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0].getAttribute('fill')).toBe('#22C55E'); // top
    expect(polygons[1].getAttribute('fill')).toBe('#16A34A'); // left
    expect(polygons[2].getAttribute('fill')).toBe('#15803D'); // right
  });

  it('includes StudDefs and StudGrid', () => {
    const { container } = renderPlateSvg();
    // StudDefs creates a <defs> with nested ellipses
    expect(container.querySelector('defs')).toBeInTheDocument();
    // StudGrid creates <use> elements
    expect(container.querySelectorAll('use').length).toBeGreaterThan(0);
  });
});

// ─── Stud Grid ──────────────────────────────────────────────

describe('PlateSvg — stud grid', () => {
  beforeEach(() => {
    useUIStore.setState({ showStuds: true });
  });

  it('renders studsX × studsY stud <use> elements', () => {
    const studsX = 4;
    const studsY = 6;
    const { container } = renderPlateSvg({ studsX, studsY });

    const useElements = container.querySelectorAll('use');
    expect(useElements.length).toBe(studsX * studsY); // 24
  });

  it('renders correct stud count for large profiles', () => {
    const studsX = 16;
    const studsY = 20;
    const { container } = renderPlateSvg({ studsX, studsY });

    const useElements = container.querySelectorAll('use');
    expect(useElements.length).toBe(studsX * studsY); // 320
  });
});

// ─── Layer-Type Visual Differentiation ──────────────────────

describe('PlateSvg — layer-type visuals', () => {
  it('global plate has thicker border than subnet', () => {
    const { container: globalC } = renderPlateSvg({ plateType: 'global' });
    const { container: subnetC } = renderPlateSvg({ plateType: 'subnet' });

    const globalStroke = Number(globalC.querySelector('polygon')?.getAttribute('stroke-width'));
    const subnetStroke = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-width'));
    expect(globalStroke).toBeGreaterThan(subnetStroke);
  });

  it('global plate has higher stroke opacity than subnet', () => {
    const { container: globalC } = renderPlateSvg({ plateType: 'global' });
    const { container: subnetC } = renderPlateSvg({ plateType: 'subnet' });

    const globalOpacity = Number(globalC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    const subnetOpacity = Number(subnetC.querySelector('polygon')?.getAttribute('stroke-opacity'));
    expect(globalOpacity).toBeGreaterThan(subnetOpacity);
  });

  it('each plate type gets a distinct stroke width', () => {
    const types: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
    const strokeWidths = types.map((type) => {
      const { container } = renderPlateSvg({ plateType: type });
      return Number(container.querySelector('polygon')?.getAttribute('stroke-width'));
    });

    // All stroke widths should be unique
    const unique = new Set(strokeWidths);
    expect(unique.size).toBe(types.length);
  });

  it('stroke widths follow hierarchy: global > edge > region > zone > subnet', () => {
    const types: PlateLayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
    const strokeWidths = types.map((type) => {
      const { container } = renderPlateSvg({ plateType: type });
      return Number(container.querySelector('polygon')?.getAttribute('stroke-width'));
    });

    for (let i = 0; i < strokeWidths.length - 1; i++) {
      expect(strokeWidths[i]).toBeGreaterThan(strokeWidths[i + 1]);
    }
  });

  it('global plate label uses larger font than subnet', () => {
    const { container: globalC } = renderPlateSvg({ plateType: 'global', label: 'Global' });
    const { container: subnetC } = renderPlateSvg({ plateType: 'subnet', label: 'Subnet' });

    const globalFontSize = Number(globalC.querySelector('text')?.getAttribute('font-size'));
    const subnetFontSize = Number(subnetC.querySelector('text')?.getAttribute('font-size'));
    expect(globalFontSize).toBeGreaterThan(subnetFontSize);
  });

  it('global plate icon uses larger size than zone', () => {
    const { container: globalC } = renderPlateSvg({ plateType: 'global', iconUrl: 'icon-g.svg' });
    const { container: zoneC } = renderPlateSvg({ plateType: 'zone', iconUrl: 'icon-z.svg' });

    const globalSize = Number(globalC.querySelector('image')?.getAttribute('width'));
    const zoneSize = Number(zoneC.querySelector('image')?.getAttribute('width'));
    expect(globalSize).toBeGreaterThan(zoneSize);
  });
});

// ─── Color Independence (plate type doesn't affect colors) ──

describe('PlateSvg — colors are independent of plateType', () => {
  it('uses the provided face colors regardless of plate type', () => {
    const customColors = {
      topFaceColor: '#FF0000',
      topFaceStroke: '#FF5555',
      leftSideColor: '#CC0000',
      rightSideColor: '#990000',
    };

    const { container } = renderPlateSvg({ plateType: 'global', ...customColors });
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0].getAttribute('fill')).toBe('#FF0000');
    expect(polygons[1].getAttribute('fill')).toBe('#CC0000');
    expect(polygons[2].getAttribute('fill')).toBe('#990000');
  });
});

// ─── All Plate Profiles Render Correctly ────────────────────

describe('PlateSvg — profile-based rendering', () => {
  beforeEach(() => {
    useUIStore.setState({ showStuds: true });
  });

  const profiles = [
    {
      name: 'network-sandbox',
      studsX: 8,
      studsY: 12,
      worldHeight: 0.7,
      plateType: 'region' as PlateLayerType,
    },
    {
      name: 'network-application',
      studsX: 12,
      studsY: 16,
      worldHeight: 0.7,
      plateType: 'region' as PlateLayerType,
    },
    {
      name: 'network-platform',
      studsX: 16,
      studsY: 20,
      worldHeight: 0.7,
      plateType: 'region' as PlateLayerType,
    },
    {
      name: 'network-hub',
      studsX: 20,
      studsY: 24,
      worldHeight: 0.7,
      plateType: 'region' as PlateLayerType,
    },
    {
      name: 'subnet-utility',
      studsX: 4,
      studsY: 6,
      worldHeight: 0.5,
      plateType: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-service',
      studsX: 6,
      studsY: 8,
      worldHeight: 0.5,
      plateType: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-workload',
      studsX: 8,
      studsY: 10,
      worldHeight: 0.5,
      plateType: 'subnet' as PlateLayerType,
    },
    {
      name: 'subnet-scale',
      studsX: 10,
      studsY: 12,
      worldHeight: 0.5,
      plateType: 'subnet' as PlateLayerType,
    },
  ];

  it.each(profiles)('renders $name profile with correct stud count', (profile) => {
    const { container } = renderPlateSvg({
      plateType: profile.plateType,
      studsX: profile.studsX,
      studsY: profile.studsY,
      worldHeight: profile.worldHeight,
    });

    const useElements = container.querySelectorAll('use');
    expect(useElements.length).toBe(profile.studsX * profile.studsY);
  });

  it.each(profiles)('renders $name profile with correct viewBox', (profile) => {
    const { container } = renderPlateSvg({
      plateType: profile.plateType,
      studsX: profile.studsX,
      studsY: profile.studsY,
      worldHeight: profile.worldHeight,
    });

    const expectedWidth = ((profile.studsX + profile.studsY) * TILE_W) / 2;
    const expectedDiamondH = ((profile.studsX + profile.studsY) * TILE_H) / 2;
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
    const studsX = 4;
    const studsY = 6;
    const worldHeight = 0.5;

    // v1.x formula: screenWidth = (studsX + studsY) * TILE_W / 2
    const expectedWidth = ((studsX + studsY) * 64) / 2; // 320
    const expectedDiamondH = ((studsX + studsY) * 32) / 2; // 160
    const expectedSideWall = Math.round(worldHeight * 32); // 16

    const { container } = renderPlateSvg({ studsX, studsY, worldHeight });
    const svg = container.querySelector('svg');
    const viewBox = svg?.getAttribute('viewBox')?.split(' ').map(Number);

    expect(viewBox?.[2]).toBe(expectedWidth);
    expect(viewBox?.[3]).toBe(expectedDiamondH + expectedSideWall + BLOCK_PADDING);
  });
});

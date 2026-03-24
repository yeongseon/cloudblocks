import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { BlockSvg } from '../BlockSvg';
import { getBlockFaceColors } from '../blockFaceColors';
import {
  getBlockDimensions,
  CATEGORY_TIER_MAP,
  TIER_DIMENSIONS,
} from '../../../shared/types/visualProfile';
import type { BlockRole, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import { BLOCK_PADDING, TILE_H, TILE_W, TILE_Z } from '../../../shared/tokens/designTokens';

import { BLOCK_SHORT_NAMES } from '../../../shared/types/index';

// ─── Test Helpers ─────────────────────────────────────────────

/** Extract all polygon elements from rendered SVG. */
function getPolygons(container: HTMLElement) {
  return container.querySelectorAll('polygon');
}

/** Extract face color fills from rendered SVG, handling both polygon and cylinder rendering. */
function getFaceColors(container: HTMLElement) {
  // Cylinder rendering uses rect (leftSideColor), path (rightSideColor), ellipse (topFaceColor)
  // Must exclude elements inside <defs> (stud definitions contain ellipses/rects too)
  const svg = container.querySelector('svg')!;
  const allEllipses = Array.from(svg.querySelectorAll('ellipse'));
  const cylinderEllipse = allEllipses.find(
    (el) => !el.closest('defs') && !el.closest('[data-testid="stub-dots"]'),
  );
  if (cylinderEllipse) {
    const allRects = Array.from(svg.querySelectorAll('rect'));
    const bodyRect = allRects.find((el) => !el.closest('defs') && !el.closest('[data-testid]'));
    const allPaths = Array.from(svg.querySelectorAll('path'));
    const arcPath = allPaths.find((el) => !el.closest('defs'));
    return {
      topFaceColor: cylinderEllipse.getAttribute('fill'),
      topFaceStroke: cylinderEllipse.getAttribute('stroke'),
      leftSideColor: bodyRect?.getAttribute('fill') ?? null,
      rightSideColor: arcPath?.getAttribute('fill') ?? null,
    };
  }
  // Polygon rendering (standard 3-face isometric) — skip stub dot polygons
  const allPolygons = Array.from(svg.querySelectorAll('polygon'));
  const facePolygons = allPolygons.filter(
    (el) => !el.closest('defs') && !el.closest('[data-testid="stub-dots"]'),
  );
  return {
    topFaceColor: facePolygons[0]?.getAttribute('fill') ?? null,
    topFaceStroke: facePolygons[0]?.getAttribute('stroke') ?? null,
    leftSideColor: facePolygons[1]?.getAttribute('fill') ?? null,
    rightSideColor: facePolygons[2]?.getAttribute('fill') ?? null,
  };
}

/** Extract SVG viewBox dimensions. */
function getViewBox(container: HTMLElement) {
  const svg = container.querySelector('svg')!;
  const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
  return { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
}

/** Compute expected screen dimensions from CU. */
function expectedDims(cu: { width: number; depth: number; height: number }) {
  const screenWidth = ((cu.width + cu.depth) * TILE_W) / 2;
  const diamondHeight = ((cu.width + cu.depth) * TILE_H) / 2;
  const sideWallPx = Math.round(cu.height * TILE_Z);
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;
  return { screenWidth, diamondHeight, sideWallPx, svgHeight };
}

// ─── Provider Color Tests ─────────────────────────────────────

describe('BlockSvg provider colors', () => {
  it('renders provider-specific face colors when provider is supplied', () => {
    const category = 'compute';
    const provider = 'aws';
    const expected = getBlockFaceColors(category, provider);

    const { container } = render(<BlockSvg category={category} provider={provider} />);
    const polygons = getPolygons(container);

    expect(polygons[0]).toHaveAttribute('fill', expected.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', expected.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', expected.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', expected.rightSideColor);
  });

  it('falls back to azure palette when provider is omitted', () => {
    const category = 'compute';
    const expectedAzure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} />);
    const colors = getFaceColors(container);

    expect(colors.topFaceColor).toBe(expectedAzure.topFaceColor);
    expect(colors.topFaceStroke).toBe(expectedAzure.topFaceStroke);
    expect(colors.leftSideColor).toBe(expectedAzure.leftSideColor);
    expect(colors.rightSideColor).toBe(expectedAzure.rightSideColor);
  });

  it('keeps legacy blocks without provider visually azure by default', () => {
    const category = 'compute';
    const azure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} provider={undefined} />);
    const colors = getFaceColors(container);

    expect(colors.topFaceColor).toBe(azure.topFaceColor);
    expect(colors.topFaceStroke).toBe(azure.topFaceStroke);
    expect(colors.leftSideColor).toBe(azure.leftSideColor);
    expect(colors.rightSideColor).toBe(azure.rightSideColor);
  });

  it('renders all three providers with distinct colors for compute', () => {
    const providers: ProviderType[] = ['aws', 'azure', 'gcp'];
    const colors = providers.map((p) => {
      const { container } = render(<BlockSvg category="compute" provider={p} />);
      return getPolygons(container)[0].getAttribute('fill');
    });

    // All three providers should produce different top face colors
    expect(new Set(colors).size).toBe(3);
  });
});

// ─── Subtype Color Tests ──────────────────────────────────────

describe('BlockSvg subtype colors', () => {
  it('applies subtype-specific colors when subtype is provided', () => {
    const expected = getBlockFaceColors('compute', 'aws', 'ec2');
    const { container } = render(<BlockSvg category="compute" provider="aws" subtype="ec2" />);
    const colors = getFaceColors(container);

    expect(colors.topFaceColor).toBe(expected.topFaceColor);
  });

  it('falls back to category color when subtype is unknown', () => {
    const expected = getBlockFaceColors('compute', 'aws');
    const { container } = render(
      <BlockSvg category="compute" provider="aws" subtype="UnknownService" />,
    );
    const polygons = getPolygons(container);

    expect(polygons[0]).toHaveAttribute('fill', expected.topFaceColor);
  });
});

// ─── CU-based Dimension Tests ─────────────────────────────────

describe('BlockSvg CU-based dimensions', () => {
  const ALL_CATEGORIES: ResourceCategory[] = [
    'compute',
    'data',
    'delivery',
    'messaging',
    'operations',
    'security',
    'identity',
    'network',
  ];

  it.each(ALL_CATEGORIES)('renders %s with correct viewBox from CU dimensions', (category) => {
    const cu = getBlockDimensions(category);
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category={category} />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(screenWidth);
    expect(vb.height).toBe(svgHeight);
  });

  it('renders micro tier (1×1×1) correctly', () => {
    const cu = TIER_DIMENSIONS.micro;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="messaging" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(64); // (1+1)*32
    expect(vb.height).toBe(74); // 32+32+10
    expect(screenWidth).toBe(64);
    expect(svgHeight).toBe(74);
  });

  it('renders small tier (2×2×1) correctly', () => {
    const cu = TIER_DIMENSIONS.small;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="security" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(128); // (2+2)*32
    expect(vb.height).toBe(106); // 64+32+10
    expect(screenWidth).toBe(128);
    expect(svgHeight).toBe(106);
  });

  it('renders medium tier (2×2×2) correctly', () => {
    const cu = TIER_DIMENSIONS.medium;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="compute" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(128); // (2+2)*32
    expect(vb.height).toBe(138); // 64+64+10
    expect(screenWidth).toBe(128);
    expect(svgHeight).toBe(138);
  });

  it('renders large tier (3×3×2) correctly', () => {
    const cu = TIER_DIMENSIONS.large;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="data" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(192); // (3+3)*32
    expect(vb.height).toBe(170); // 96+64+10
    expect(screenWidth).toBe(192);
    expect(svgHeight).toBe(170);
  });

  it('renders wide tier (3×1×1) correctly', () => {
    const cu = TIER_DIMENSIONS.wide;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="delivery" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(128); // (3+1)*32
    expect(vb.height).toBe(106); // 64+32+10
    expect(screenWidth).toBe(128);
    expect(svgHeight).toBe(106);
  });

  it('produces integer-only pixel values in viewBox (no sub-pixel)', () => {
    ALL_CATEGORIES.forEach((category) => {
      const { container } = render(<BlockSvg category={category} />);
      const vb = getViewBox(container);

      expect(Number.isInteger(vb.width)).toBe(true);
      expect(Number.isInteger(vb.height)).toBe(true);
    });
  });
});

// ─── Subtype Size Override Tests ──────────────────────────────

describe('BlockSvg subtype size overrides', () => {
  it('uses subtype override dimensions when subtype is known', () => {
    // AWS EC2 overrides to 2×2×2 (medium), same as compute default
    const cu = getBlockDimensions('compute', 'aws', 'ec2');
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="compute" provider="aws" subtype="ec2" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(screenWidth);
    expect(vb.height).toBe(svgHeight);
  });

  it('falls back to category tier when subtype is unknown', () => {
    const cuDefault = getBlockDimensions('compute');
    const cuUnknown = getBlockDimensions('compute', 'aws', 'UnknownService');
    const { screenWidth, svgHeight } = expectedDims(cuDefault);

    expect(cuUnknown).toEqual(cuDefault);

    const { container } = render(
      <BlockSvg category="compute" provider="aws" subtype="UnknownService" />,
    );
    const vb = getViewBox(container);

    expect(vb.width).toBe(screenWidth);
    expect(vb.height).toBe(svgHeight);
  });
});

// ─── SVG Structure Tests ──────────────────────────────────────

describe('BlockSvg SVG structure', () => {
  it('renders 3 face polygons plus stub dot polygons even when showStubs is not enabled', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const polygons = getPolygons(container);
    expect(polygons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders edge highlight line', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(1);
  });

  it('renders short name text element and conditionally renders icon', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const texts = container.querySelectorAll('text');
    const images = container.querySelectorAll('image');
    expect(texts.length).toBe(1);
    expect(images.length).toBe(0);
  });

  it('renders icon when subtype has a registered icon', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" subtype="vm" />);
    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
  });

  it('has aria-hidden for decorative SVG', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

// ─── Category-Tier Consistency Tests ──────────────────────────

describe('BlockSvg category-tier mapping consistency', () => {
  it('all categories produce valid CU dimensions (positive integers)', () => {
    const categories: ResourceCategory[] = [
      'compute',
      'data',
      'delivery',
      'messaging',
      'operations',
      'security',
    ];

    categories.forEach((category) => {
      const cu = getBlockDimensions(category);
      expect(cu.width).toBeGreaterThan(0);
      expect(cu.depth).toBeGreaterThan(0);
      expect(cu.height).toBeGreaterThan(0);
      expect(Number.isInteger(cu.width)).toBe(true);
      expect(Number.isInteger(cu.depth)).toBe(true);
      expect(Number.isInteger(cu.height)).toBe(true);
    });
  });

  it('tier dimensions match spec §5.2', () => {
    expect(TIER_DIMENSIONS.micro).toEqual({ width: 1, depth: 1, height: 1 });
    expect(TIER_DIMENSIONS.small).toEqual({ width: 2, depth: 2, height: 1 });
    expect(TIER_DIMENSIONS.medium).toEqual({ width: 2, depth: 2, height: 2 });
    expect(TIER_DIMENSIONS.large).toEqual({ width: 3, depth: 3, height: 2 });
    expect(TIER_DIMENSIONS.wide).toEqual({ width: 3, depth: 1, height: 1 });
  });

  it('category-tier mapping matches spec §5.2', () => {
    expect(CATEGORY_TIER_MAP.compute).toBe('medium');
    expect(CATEGORY_TIER_MAP.data).toBe('large');
    expect(CATEGORY_TIER_MAP.delivery).toBe('wide');
    expect(CATEGORY_TIER_MAP.messaging).toBe('micro');
    expect(CATEGORY_TIER_MAP.network).toBe('large');
    expect(CATEGORY_TIER_MAP.identity).toBe('small');
    expect(CATEGORY_TIER_MAP.operations).toBe('small');
    expect(CATEGORY_TIER_MAP.security).toBe('small');
  });
});

// ─── Aggregation Badge Tests (v2.0 §8) ───────────────────────

describe('BlockSvg aggregation badge', () => {
  it('does not render badge when aggregationCount is undefined', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const badge = container.querySelector('[data-testid="aggregation-badge"]');
    expect(badge).toBeNull();
  });

  it('does not render badge when aggregationCount is 1', () => {
    const { container } = render(<BlockSvg category="compute" aggregationCount={1} />);
    const badge = container.querySelector('[data-testid="aggregation-badge"]');
    expect(badge).toBeNull();
  });

  it('renders badge with ×N text when aggregationCount > 1', () => {
    const { container } = render(<BlockSvg category="compute" aggregationCount={5} />);
    const badge = container.querySelector('[data-testid="aggregation-badge"]');
    expect(badge).not.toBeNull();
    const text = badge!.querySelector('text');
    expect(text!.textContent).toBe('×5');
  });

  it('renders badge for large count', () => {
    const { container } = render(<BlockSvg category="data" aggregationCount={100} />);
    const badge = container.querySelector('[data-testid="aggregation-badge"]');
    expect(badge).not.toBeNull();
    const text = badge!.querySelector('text');
    expect(text!.textContent).toBe('×100');
  });
});

// ─── Role Badge Tests (v2.0 §9) ──────────────────────────────

describe('BlockSvg role badges', () => {
  it('does not render role badges when roles is undefined', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const badges = container.querySelector('[data-testid="role-badges"]');
    expect(badges).toBeNull();
  });

  it('does not render role badges when roles is empty', () => {
    const { container } = render(<BlockSvg category="compute" roles={[]} />);
    const badges = container.querySelector('[data-testid="role-badges"]');
    expect(badges).toBeNull();
  });

  it('renders a single role badge', () => {
    const { container } = render(<BlockSvg category="compute" roles={['primary']} />);
    const badges = container.querySelector('[data-testid="role-badges"]');
    expect(badges).not.toBeNull();
    const primaryBadge = container.querySelector('[data-testid="role-badge-primary"]');
    expect(primaryBadge).not.toBeNull();
  });

  it('renders multiple role badges', () => {
    const roles: BlockRole[] = ['public', 'reader', 'primary'];
    const { container } = render(<BlockSvg category="compute" roles={roles} />);
    const badges = container.querySelector('[data-testid="role-badges"]');
    expect(badges).not.toBeNull();
    expect(container.querySelector('[data-testid="role-badge-public"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="role-badge-reader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="role-badge-primary"]')).not.toBeNull();
  });

  it('renders all 8 roles simultaneously', () => {
    const allRoles: BlockRole[] = [
      'primary',
      'secondary',
      'reader',
      'writer',
      'public',
      'private',
      'internal',
      'external',
    ];
    const { container } = render(<BlockSvg category="compute" roles={allRoles} />);
    allRoles.forEach((role) => {
      expect(container.querySelector(`[data-testid="role-badge-${role}"]`)).not.toBeNull();
    });
  });

  it('does not affect block size (viewBox unchanged with roles)', () => {
    const { container: without } = render(<BlockSvg category="compute" />);
    const { container: withRoles } = render(
      <BlockSvg category="compute" roles={['primary', 'public']} />,
    );
    const vbWithout = without.querySelector('svg')!.getAttribute('viewBox');
    const vbWith = withRoles.querySelector('svg')!.getAttribute('viewBox');
    expect(vbWith).toBe(vbWithout);
  });

  it('role badges coexist with aggregation badge', () => {
    const { container } = render(
      <BlockSvg category="compute" aggregationCount={3} roles={['primary']} />,
    );
    expect(container.querySelector('[data-testid="aggregation-badge"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="role-badge-primary"]')).not.toBeNull();
  });
});

// ─── Name Prop Tests ──────────────────────────────────────────

describe('BlockSvg name prop', () => {
  it('renders shortName on left wall when no subtype is provided', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const texts = container.querySelectorAll('text');
    expect(texts[0].textContent).toBe(BLOCK_SHORT_NAMES.compute);
  });

  it('renders subtype label on left wall when subtype is provided', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" subtype="vm" />);
    const texts = container.querySelectorAll('text');
    expect(texts[0].textContent).toBe('VM');
  });

  it('renders icon on right wall when subtype has a registered icon', () => {
    const { container } = render(
      <BlockSvg category="data" provider="azure" subtype="sql-database" />,
    );
    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
  });

  it('uses provider fallback when provider is nullish', () => {
    const { container } = render(
      <BlockSvg category="compute" provider={null as unknown as ProviderType} subtype="vm" />,
    );

    const texts = container.querySelectorAll('text');
    const images = container.querySelectorAll('image');
    expect(texts[0].textContent).toBe('VM');
    expect(images.length).toBe(1);
  });
});

describe('BlockSvg stub dot interaction branches', () => {
  it('renders hover glow when showStubs is false but hoveredPort matches', () => {
    const { container } = render(
      <BlockSvg category="compute" showStubs={false} hoveredPort="in-0" />,
    );

    expect(container.querySelector('[data-testid="stub-glow-in-0"]')).not.toBeNull();
  });

  it('does not render glow for occupied endpoints even when hovered', () => {
    const occupied = new Set<string>(['input-http']);
    const { container } = render(
      <BlockSvg
        category="compute"
        showStubs
        hoveredPort="in-0"
        occupiedEndpointSemantics={occupied}
      />,
    );

    const firstInboundDot = container.querySelector('[data-testid="stub-dot-in-0"]');
    expect(firstInboundDot).toHaveAttribute('data-occupied', 'true');
    expect(container.querySelector('[data-testid="stub-glow-in-0"]')).toBeNull();
  });

  it('invokes inbound/outbound port callbacks with mapped semantics', () => {
    const onPortPointerDown = vi.fn();
    const onPortPointerEnter = vi.fn();
    const onPortPointerLeave = vi.fn();

    const { container } = render(
      <BlockSvg
        category="compute"
        showStubs
        onPortPointerDown={onPortPointerDown}
        onPortPointerEnter={onPortPointerEnter}
        onPortPointerLeave={onPortPointerLeave}
      />,
    );

    const inbound0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    const outbound0 = container.querySelector('[data-testid="stub-dot-out-0"]')!;

    fireEvent.pointerEnter(inbound0);
    fireEvent.pointerLeave(inbound0);
    fireEvent.pointerDown(inbound0);

    fireEvent.pointerEnter(outbound0);
    fireEvent.pointerLeave(outbound0);
    fireEvent.pointerDown(outbound0);

    expect(onPortPointerEnter).toHaveBeenCalledWith({
      side: 'inbound',
      index: 0,
      semantic: 'http',
    });
    expect(onPortPointerLeave).toHaveBeenCalledWith({
      side: 'inbound',
      index: 0,
      semantic: 'http',
    });
    expect(onPortPointerEnter).toHaveBeenCalledWith({
      side: 'outbound',
      index: 0,
      semantic: 'http',
    });
    expect(onPortPointerLeave).toHaveBeenCalledWith({
      side: 'outbound',
      index: 0,
      semantic: 'http',
    });
    expect(onPortPointerDown).toHaveBeenCalledWith(
      { side: 'inbound', index: 0, semantic: 'http' },
      expect.any(Object),
    );
    expect(onPortPointerDown).toHaveBeenCalledWith(
      { side: 'outbound', index: 0, semantic: 'http' },
      expect.any(Object),
    );
  });
});

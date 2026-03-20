import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { BlockSvg } from '../BlockSvg';
import { getBlockFaceColors } from '../blockFaceColors';
import { getBlockDimensions, CATEGORY_TIER_MAP, TIER_DIMENSIONS } from '../../../shared/types/visualProfile';
import type { BlockCategory, BlockRole, ProviderType } from '@cloudblocks/schema';
import { BLOCK_PADDING, TILE_H, TILE_W, TILE_Z } from '../../../shared/tokens/designTokens';

import { BLOCK_SHORT_NAMES } from '../../../shared/types/index';

// ─── Test Helpers ─────────────────────────────────────────────

/** Extract all polygon elements from rendered SVG. */
function getPolygons(container: HTMLElement) {
  return container.querySelectorAll('polygon');
}

/** Extract SVG viewBox dimensions. */
function getViewBox(container: HTMLElement) {
  const svg = container.querySelector('svg')!;
  const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
  return { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
}

/** Compute expected screen dimensions from CU. */
function expectedDims(cu: { width: number; depth: number; height: number }) {
  const screenWidth = (cu.width + cu.depth) * TILE_W / 2;
  const diamondHeight = (cu.width + cu.depth) * TILE_H / 2;
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
    const category = 'storage';
    const expectedAzure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} />);
    const polygons = getPolygons(container);

    expect(polygons[0]).toHaveAttribute('fill', expectedAzure.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', expectedAzure.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', expectedAzure.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', expectedAzure.rightSideColor);
  });

  it('keeps legacy blocks without provider visually azure by default', () => {
    const category = 'database';
    const azure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} provider={undefined} />);
    const polygons = getPolygons(container);

    expect(polygons[0]).toHaveAttribute('fill', azure.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', azure.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', azure.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', azure.rightSideColor);
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
    const expected = getBlockFaceColors('database', 'azure', 'cosmos-db');
    const { container } = render(
      <BlockSvg category="database" provider="azure" subtype="cosmos-db" />,
    );
    const polygons = getPolygons(container);

    expect(polygons[0]).toHaveAttribute('fill', expected.topFaceColor);
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
  const ALL_CATEGORIES: BlockCategory[] = [
    'compute', 'database', 'storage', 'gateway', 'function',
    'queue', 'event', 'analytics', 'identity', 'observability',
  ];

  it.each(ALL_CATEGORIES)(
    'renders %s with correct viewBox from CU dimensions',
    (category) => {
      const cu = getBlockDimensions(category);
      const { screenWidth, svgHeight } = expectedDims(cu);

      const { container } = render(<BlockSvg category={category} />);
      const vb = getViewBox(container);

      expect(vb.width).toBe(screenWidth);
      expect(vb.height).toBe(svgHeight);
    },
  );

  it('renders micro tier (1×1×1) correctly', () => {
    // event, function, queue are all micro
    const cu = TIER_DIMENSIONS.micro;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="event" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(64); // (1+1)*32
    expect(vb.height).toBe(74); // 32+32+10
    expect(screenWidth).toBe(64);
    expect(svgHeight).toBe(74);
  });

  it('renders small tier (2×2×1) correctly', () => {
    const cu = TIER_DIMENSIONS.small;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="identity" />);
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

    const { container } = render(<BlockSvg category="database" />);
    const vb = getViewBox(container);

    expect(vb.width).toBe(192); // (3+3)*32
    expect(vb.height).toBe(170); // 96+64+10
    expect(screenWidth).toBe(192);
    expect(svgHeight).toBe(170);
  });

  it('renders wide tier (3×1×1) correctly', () => {
    const cu = TIER_DIMENSIONS.wide;
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(<BlockSvg category="gateway" />);
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

// ─── Stud Grid Tests ──────────────────────────────────────────

describe('BlockSvg stud grid', () => {
  it('renders width × depth studs for micro tier (1×1 = 1 stud)', () => {
    const { container } = render(<BlockSvg category="event" />);
    const uses = container.querySelectorAll('use');
    expect(uses.length).toBe(1); // 1×1 = 1 stud
  });

  it('renders width × depth studs for small tier (2×2 = 4 studs)', () => {
    const { container } = render(<BlockSvg category="identity" />);
    const uses = container.querySelectorAll('use');
    expect(uses.length).toBe(4); // 2×2 = 4 studs
  });

  it('renders width × depth studs for medium tier (2×2 = 4 studs)', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const uses = container.querySelectorAll('use');
    expect(uses.length).toBe(4); // 2×2 = 4 studs
  });

  it('renders width × depth studs for large tier (3×3 = 9 studs)', () => {
    const { container } = render(<BlockSvg category="database" />);
    const uses = container.querySelectorAll('use');
    expect(uses.length).toBe(9); // 3×3 = 9 studs
  });

  it('renders width × depth studs for wide tier (3×1 = 3 studs)', () => {
    const { container } = render(<BlockSvg category="gateway" />);
    const uses = container.querySelectorAll('use');
    expect(uses.length).toBe(3); // 3×1 = 3 studs
  });

  it('stud count matches CU width×depth for all categories', () => {
    const categories: BlockCategory[] = [
      'compute', 'database', 'storage', 'gateway', 'function',
      'queue', 'event', 'analytics', 'identity', 'observability',
    ];

    categories.forEach((category) => {
      const cu = getBlockDimensions(category);
      const { container } = render(<BlockSvg category={category} />);
      const uses = container.querySelectorAll('use');
      expect(uses.length).toBe(cu.width * cu.depth);
    });
  });
});

// ─── Subtype Size Override Tests ──────────────────────────────

describe('BlockSvg subtype size overrides', () => {
  it('uses subtype override dimensions when subtype is known', () => {
    // AWS EC2 overrides to 2×2×2 (medium), same as compute default
    const cu = getBlockDimensions('compute', 'aws', 'ec2');
    const { screenWidth, svgHeight } = expectedDims(cu);

    const { container } = render(
      <BlockSvg category="compute" provider="aws" subtype="ec2" />,
    );
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
  it('renders 3 polygons (top, left, right faces)', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const polygons = getPolygons(container);
    expect(polygons.length).toBe(3);
  });

  it('renders edge highlight line', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(1);
  });

  it('renders short name text and icon image elements', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const texts = container.querySelectorAll('text');
    const images = container.querySelectorAll('image');
    expect(texts.length).toBe(1); // name on left wall
    expect(images.length).toBe(1); // icon on right wall
  });

  it('has aria-hidden for decorative SVG', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders StudDefs and StudGrid', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const defs = container.querySelectorAll('defs');
    expect(defs.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Category-Tier Consistency Tests ──────────────────────────

describe('BlockSvg category-tier mapping consistency', () => {
  it('all categories produce valid CU dimensions (positive integers)', () => {
    const categories: BlockCategory[] = [
      'compute', 'database', 'storage', 'gateway', 'function',
      'queue', 'event', 'analytics', 'identity', 'observability',
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
    expect(CATEGORY_TIER_MAP.database).toBe('large');
    expect(CATEGORY_TIER_MAP.storage).toBe('medium');
    expect(CATEGORY_TIER_MAP.gateway).toBe('wide');
    expect(CATEGORY_TIER_MAP.function).toBe('micro');
    expect(CATEGORY_TIER_MAP.queue).toBe('micro');
    expect(CATEGORY_TIER_MAP.event).toBe('micro');
    expect(CATEGORY_TIER_MAP.analytics).toBe('large');
    expect(CATEGORY_TIER_MAP.identity).toBe('small');
    expect(CATEGORY_TIER_MAP.observability).toBe('small');
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
    const { container } = render(<BlockSvg category="database" aggregationCount={100} />);
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
    const allRoles: BlockRole[] = ['primary', 'secondary', 'reader', 'writer', 'public', 'private', 'internal', 'external'];
    const { container } = render(<BlockSvg category="compute" roles={allRoles} />);
    allRoles.forEach((role) => {
      expect(container.querySelector(`[data-testid="role-badge-${role}"]`)).not.toBeNull();
    });
  });

  it('does not affect block size (viewBox unchanged with roles)', () => {
    const { container: without } = render(<BlockSvg category="compute" />);
    const { container: withRoles } = render(<BlockSvg category="compute" roles={['primary', 'public']} />);
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
  it('renders shortName on left wall when name is not provided', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const texts = container.querySelectorAll('text');
    expect(texts[0].textContent).toBe(BLOCK_SHORT_NAMES.compute);
  });

  it('renders custom name on left wall when name is provided', () => {
    const { container } = render(<BlockSvg category="compute" name="MyVM" />);
    const texts = container.querySelectorAll('text');
    expect(texts[0].textContent).toBe('MyVM');
  });

  it('does not affect icon on right wall', () => {
    const { container } = render(<BlockSvg category="database" name="ProdDB" />);
    const texts = container.querySelectorAll('text');
    expect(texts[0].textContent).toBe('ProdDB');
    const images = container.querySelectorAll('image');
    expect(images.length).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import type { ArchitectureTemplate } from '../../../shared/types/template';
import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import type { GlobalBlock } from '../validateTemplateOverlaps';
import {
  computeGlobalPosition,
  computeOverlapArea,
  resolveGlobalBlocks,
  validateTemplateOverlaps,
} from '../validateTemplateOverlaps';

// ─── Test Helpers ────────────────────────────────────────────

function makeContainer(
  id: string,
  parentId: string | null,
  position: { x: number; y: number; z: number },
): ContainerBlock {
  return {
    id,
    name: id,
    kind: 'container',
    layer: parentId ? 'subnet' : 'region',
    resourceType: parentId ? 'subnet' : 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId,
    position,
    frame: { width: 10, height: 0.3, depth: 10 },
    metadata: {},
  } as ContainerBlock;
}

function makeResource(
  id: string,
  parentId: string | null,
  position: { x: number; y: number; z: number },
  overrides?: Partial<ResourceBlock>,
): ResourceBlock {
  return {
    id,
    name: id,
    kind: 'resource',
    layer: 'resource',
    resourceType: 'vm',
    category: 'compute',
    provider: 'azure',
    parentId,
    position,
    metadata: {},
    ...overrides,
  } as ResourceBlock;
}

function makeTemplate(
  nodes: Block[],
  connections: ArchitectureTemplate['architecture']['connections'] = [],
): ArchitectureTemplate {
  return {
    id: 'test-template',
    name: 'Test Template',
    description: 'Test',
    category: 'general',
    difficulty: 'beginner',
    tags: [],
    architecture: {
      name: 'Test',
      version: '1',
      endpoints: [],
      nodes,
      connections,
      externalActors: [],
    },
  };
}

// ─── computeGlobalPosition ──────────────────────────────────

describe('computeGlobalPosition', () => {
  it('returns block position directly when parentId is null', () => {
    const resource = makeResource('ext-browser', null, { x: -12, y: 0, z: -3 });
    const result = computeGlobalPosition(resource, []);
    expect(result).toEqual({ x: -12, y: 0, z: -3 });
  });

  it('adds container position when block has a parent container', () => {
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const resource = makeResource('block-1', 'vnet', { x: 3, y: 0.5, z: -2 });
    const result = computeGlobalPosition(resource, [vnet]);
    expect(result).toEqual({ x: 3, y: 0.5, z: -2 });
  });

  it('sums positions through VNet + Subnet hierarchy', () => {
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = makeContainer('subnet', 'vnet', { x: 4, y: 0.3, z: 0 });
    const resource = makeResource('block-1', 'subnet', { x: -1.5, y: 0.5, z: -2 });
    const result = computeGlobalPosition(resource, [vnet, subnet]);
    expect(result).toEqual({ x: 2.5, y: 0.8, z: -2 });
  });

  it('handles offset VNet position', () => {
    const vnet = makeContainer('vnet', null, { x: 5, y: 0, z: 3 });
    const subnet = makeContainer('subnet', 'vnet', { x: 2, y: 0.3, z: 1 });
    const resource = makeResource('block-1', 'subnet', { x: 1, y: 0.5, z: 1 });
    const result = computeGlobalPosition(resource, [vnet, subnet]);
    expect(result).toEqual({ x: 8, y: 0.8, z: 5 });
  });

  it('handles block directly in VNet (no subnet)', () => {
    const vnet = makeContainer('vnet', null, { x: 2, y: 0, z: 3 });
    const resource = makeResource('block-1', 'vnet', { x: -4, y: 0.5, z: 3 });
    const result = computeGlobalPosition(resource, [vnet]);
    expect(result).toEqual({ x: -2, y: 0.5, z: 6 });
  });

  it('handles missing parent gracefully (stops at missing container)', () => {
    const resource = makeResource('block-1', 'nonexistent', { x: 5, y: 0, z: 5 });
    const result = computeGlobalPosition(resource, []);
    expect(result).toEqual({ x: 5, y: 0, z: 5 });
  });

  it('handles deeply nested containers (3+ levels)', () => {
    const root = makeContainer('root', null, { x: 1, y: 0, z: 1 });
    const mid = makeContainer('mid', 'root', { x: 2, y: 0, z: 2 });
    const leaf = makeContainer('leaf', 'mid', { x: 3, y: 0, z: 3 });
    const resource = makeResource('block-1', 'leaf', { x: 4, y: 0, z: 4 });
    const result = computeGlobalPosition(resource, [root, mid, leaf]);
    expect(result).toEqual({ x: 10, y: 0, z: 10 });
  });
});

// ─── computeOverlapArea ─────────────────────────────────────

describe('computeOverlapArea', () => {
  it('returns 0 for non-overlapping blocks (separated on X)', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 5, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(0);
  });

  it('returns 0 for non-overlapping blocks (separated on Z)', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 0, y: 0, z: 5 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(0);
  });

  it('returns 0 for edge-touching blocks (X axis)', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 2, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(0);
  });

  it('returns 0 for edge-touching blocks (Z axis)', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 0, y: 0, z: 2 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(0);
  });

  it('returns correct area for partial overlap', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 1, y: 0, z: 1 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(1);
  });

  it('returns full area for identical positions', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(4);
  });

  it('returns correct area for complete containment', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 0, y: 0, z: 0 },
      width: 4,
      depth: 4,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 1, y: 0, z: 1 },
      width: 2,
      depth: 2,
    };
    expect(computeOverlapArea(a, b)).toBe(4);
  });

  it('handles negative coordinates correctly', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: -3, y: 0, z: -3 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: -2, y: 0, z: -2 },
      width: 2,
      depth: 2,
    };
    // a: [-3, -1] × [-3, -1], b: [-2, 0] × [-2, 0]
    // overlap: [-2, -1] × [-2, -1] = 1 CU²
    expect(computeOverlapArea(a, b)).toBe(1);
  });

  it('handles fractional coordinates correctly', () => {
    const a: GlobalBlock = {
      id: 'a',
      name: 'A',
      globalPosition: { x: 2.5, y: 0, z: -2 },
      width: 2,
      depth: 2,
    };
    const b: GlobalBlock = {
      id: 'b',
      name: 'B',
      globalPosition: { x: 3, y: 0, z: -3 },
      width: 2,
      depth: 2,
    };
    // a: [2.5, 4.5] × [-2, 0], b: [3, 5] × [-3, -1]
    // overlap X: [3, 4.5] = 1.5, Z: [-2, -1] = 1 → 1.5 CU²
    expect(computeOverlapArea(a, b)).toBe(1.5);
  });
});

// ─── resolveGlobalBlocks ────────────────────────────────────

describe('resolveGlobalBlocks', () => {
  it('resolves root-level blocks with their own positions', () => {
    const nodes: Block[] = [makeResource('ext-browser', null, { x: -12, y: 0, z: -3 })];
    const result = resolveGlobalBlocks(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].globalPosition).toEqual({ x: -12, y: 0, z: -3 });
    expect(result[0].width).toBe(2);
    expect(result[0].depth).toBe(2);
  });

  it('resolves blocks in containers to global positions', () => {
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = makeContainer('subnet', 'vnet', { x: 4, y: 0.3, z: 0 });
    const resource = makeResource('block-1', 'subnet', { x: -1.5, y: 0.5, z: -2 });
    const nodes: Block[] = [vnet, subnet, resource];
    const result = resolveGlobalBlocks(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].globalPosition).toEqual({ x: 2.5, y: 0.8, z: -2 });
  });

  it('excludes container blocks from the result', () => {
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const resource = makeResource('block-1', 'vnet', { x: 3, y: 0.5, z: 0 });
    const nodes: Block[] = [vnet, resource];
    const result = resolveGlobalBlocks(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('block-1');
  });

  it('uses correct dimensions for all categories', () => {
    const categories = [
      'compute',
      'data',
      'delivery',
      'messaging',
      'network',
      'security',
      'identity',
      'operations',
    ] as const;
    const nodes: Block[] = categories.map((cat, i) =>
      makeResource(`block-${cat}`, null, { x: i * 5, y: 0, z: 0 }, { category: cat }),
    );
    const result = resolveGlobalBlocks(nodes);
    expect(result).toHaveLength(categories.length);
    // All categories map to medium tier (2×2×2)
    for (const block of result) {
      expect(block.width).toBe(2);
      expect(block.depth).toBe(2);
    }
  });
});

// ─── validateTemplateOverlaps ───────────────────────────────

describe('validateTemplateOverlaps', () => {
  it('returns empty array for template with no overlaps', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
      makeResource('block-2', 'vnet', { x: 5, y: 0.5, z: 0 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(0);
  });

  it('detects overlap between two blocks in the same container', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
      makeResource('block-2', 'vnet', { x: 1, y: 0.5, z: 0 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].blockA.id).toBe('block-1');
    expect(violations[0].blockB.id).toBe('block-2');
    expect(violations[0].overlapArea).toBe(2);
  });

  it('detects cross-container overlap (blocks in different subnets)', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeContainer('subnet1', 'vnet', { x: -4, y: 0.3, z: 0 }),
      makeContainer('subnet2', 'vnet', { x: 4, y: 0.3, z: 0 }),
      // block in subnet2 at local (-1.5, 0.5, -2) → global (2.5, 0.8, -2)
      makeResource('block-in-subnet2', 'subnet2', { x: -1.5, y: 0.5, z: -2 }),
      // block at VNet level at (3, 0.5, -3) → global (3, 0.5, -3)
      // bbox: [3,5] × [-3,-1] overlaps [2.5,4.5] × [-2,0] → 1.5 CU²
      makeResource('block-in-vnet', 'vnet', { x: 3, y: 0.5, z: -3 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].overlapArea).toBeCloseTo(1.5, 5);
  });

  it('detects external actor overlap', () => {
    const template = makeTemplate([
      makeResource('ext-browser', null, { x: -12, y: 0, z: -3 }, {
        resourceType: 'browser',
        category: 'delivery',
        roles: ['external'],
      } as Partial<ResourceBlock>),
      makeResource('ext-internet', null, { x: -11, y: 0, z: -3 }, {
        resourceType: 'internet',
        category: 'delivery',
        roles: ['external'],
      } as Partial<ResourceBlock>),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].blockA.id).toBe('ext-browser');
    expect(violations[0].blockB.id).toBe('ext-internet');
  });

  it('allows edge-touching blocks (no overlap)', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
      makeResource('block-2', 'vnet', { x: 2, y: 0.5, z: 0 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(0);
  });

  it('detects multiple overlaps', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
      makeResource('block-2', 'vnet', { x: 1, y: 0.5, z: 0 }),
      makeResource('block-3', 'vnet', { x: 0.5, y: 0.5, z: 0 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    // block-1 overlaps block-2, block-1 overlaps block-3, block-2 overlaps block-3
    expect(violations).toHaveLength(3);
  });

  it('returns empty for template with no resource blocks', () => {
    const template = makeTemplate([makeContainer('vnet', null, { x: 0, y: 0, z: 0 })]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(0);
  });

  it('returns empty for template with single resource block', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(0);
  });

  it('violation includes human-readable message', () => {
    const template = makeTemplate([
      makeResource('block-a', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-b', null, { x: 1, y: 0, z: 1 }),
    ]);
    const violations = validateTemplateOverlaps(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('block-a');
    expect(violations[0].message).toContain('block-b');
    expect(violations[0].message).toContain('CU²');
  });

  describe('minGap option', () => {
    it('detects near-misses when minGap is specified', () => {
      const template = makeTemplate([
        makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
        // These blocks are exactly edge-touching (gap = 0)
        makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
        makeResource('block-2', 'vnet', { x: 2, y: 0.5, z: 0 }),
      ]);
      // Without minGap: no overlap
      expect(validateTemplateOverlaps(template)).toHaveLength(0);
      // With minGap=1: detect near-miss
      expect(validateTemplateOverlaps(template, { minGap: 1 })).toHaveLength(1);
    });

    it('still allows well-separated blocks with minGap', () => {
      const template = makeTemplate([
        makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
        makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 0 }),
        makeResource('block-2', 'vnet', { x: 5, y: 0.5, z: 0 }),
      ]);
      expect(validateTemplateOverlaps(template, { minGap: 1 })).toHaveLength(0);
    });

    it('boundary: exactly 0.5 CU gap passes, 0.49 fails', () => {
      // Blocks at x=0 and x=2.5 → gap is exactly 0.5 CU (block at x=0 ends at x=2)
      const templatePass = makeTemplate([
        makeResource('a', null, { x: 0, y: 0, z: 0 }),
        makeResource('b', null, { x: 2.5, y: 0, z: 0 }),
      ]);
      expect(validateTemplateOverlaps(templatePass, { minGap: 0.5 })).toHaveLength(0);

      // Blocks at x=0 and x=2.49 → gap is 0.49 CU (< 0.5)
      const templateFail = makeTemplate([
        makeResource('a', null, { x: 0, y: 0, z: 0 }),
        makeResource('b', null, { x: 2.49, y: 0, z: 0 }),
      ]);
      expect(validateTemplateOverlaps(templateFail, { minGap: 0.5 })).toHaveLength(1);
    });
  });
});

// ─── Quality Gate: ALL Builtin Templates ─────────────────────

describe('builtin template overlap quality gate', () => {
  it('all 6 builtin templates have zero overlaps', async () => {
    // Dynamic import to reset module state
    const { registerBuiltinTemplates } = await import('../builtin');
    const { listTemplates } = await import('../registry');

    registerBuiltinTemplates();

    const templates = listTemplates();
    expect(templates).toHaveLength(6);

    for (const template of templates) {
      const violations = validateTemplateOverlaps(template);
      if (violations.length > 0) {
        const details = violations.map((v) => `  - ${v.message}`).join('\n');
        throw new Error(
          `Template "${template.name}" (${template.id}) has ${violations.length} overlap(s):\n${details}`,
        );
      }
    }
  });

  it('all 6 builtin templates have at least 0.5 CU gap between blocks', async () => {
    const { registerBuiltinTemplates } = await import('../builtin');
    const { listTemplates } = await import('../registry');

    registerBuiltinTemplates();

    const templates = listTemplates();

    for (const template of templates) {
      const violations = validateTemplateOverlaps(template, { minGap: 0.5 });
      if (violations.length > 0) {
        const details = violations.map((v) => `  - ${v.message}`).join('\n');
        throw new Error(
          `Template "${template.name}" (${template.id}) has ${violations.length} near-overlap(s) (< 0.5 CU gap):\n${details}`,
        );
      }
    }
  });
});

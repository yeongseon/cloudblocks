import { describe, expect, it } from 'vitest';
import type { ArchitectureTemplate } from '../../../shared/types/template';
import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import type { GlobalBlock } from '../validateTemplateOverlaps';
import {
  computeGlobalPosition,
  computeOverlapArea,
  resolveGlobalBlocks,
  validateTemplateOverlaps,
  validateContainerBounds,
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

  it('adds immediate parent position (VNet at origin, subnet offset)', () => {
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = makeContainer('subnet', 'vnet', { x: 4, y: 0.3, z: 0 });
    const resource = makeResource('block-1', 'subnet', { x: -1.5, y: 0.5, z: -2 });
    const result = computeGlobalPosition(resource, [vnet, subnet]);
    expect(result).toEqual({ x: 2.5, y: 0.8, z: -2 });
  });

  it('adds immediate parent position only (no hierarchy walk)', () => {
    // Runtime semantics: worldPos = immediateParent.absolutePos + block.relativePos
    // VNet at (5,0,3), subnet at (2,0.3,1). Block in subnet → adds subnet only.
    const vnet = makeContainer('vnet', null, { x: 5, y: 0, z: 3 });
    const subnet = makeContainer('subnet', 'vnet', { x: 2, y: 0.3, z: 1 });
    const resource = makeResource('block-1', 'subnet', { x: 1, y: 0.5, z: 1 });
    const result = computeGlobalPosition(resource, [vnet, subnet]);
    // Only immediate parent (subnet) position is added:
    // x: 2+1=3, y: 0.3+0.5=0.8, z: 1+1=2
    expect(result).toEqual({ x: 3, y: 0.8, z: 2 });
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

  it('handles deeply nested containers (only adds immediate parent)', () => {
    const root = makeContainer('root', null, { x: 1, y: 0, z: 1 });
    const mid = makeContainer('mid', 'root', { x: 2, y: 0, z: 2 });
    const leaf = makeContainer('leaf', 'mid', { x: 3, y: 0, z: 3 });
    const resource = makeResource('block-1', 'leaf', { x: 4, y: 0, z: 4 });
    const result = computeGlobalPosition(resource, [root, mid, leaf]);
    // Only immediate parent (leaf) position added: 3+4=7, 0+0=0, 3+4=7
    expect(result).toEqual({ x: 7, y: 0, z: 7 });
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
    // network and data categories map to large tier (3×3), others to medium (2×2)
    for (const block of result) {
      const cat = block.id.replace('block-', '');
      if (cat === 'network' || cat === 'data') {
        expect(block.width, `${cat} should be large`).toBe(3);
        expect(block.depth, `${cat} should be large`).toBe(3);
      } else {
        expect(block.width, `${cat} should be medium`).toBe(2);
        expect(block.depth, `${cat} should be medium`).toBe(2);
      }
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

// ─── validateContainerBounds ────────────────────────────────────

describe('validateContainerBounds', () => {
  // Container frame: 10×10. Block dims: 2×2 (medium tier).
  // Allowed block center range: ±(10/2 - 2/2) = ±4 on X and Z.

  it('returns empty for blocks within container bounds', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 3, y: 0.5, z: 3 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(0);
  });

  it('detects block outside container on X axis (center offset exceeds allowed half)', () => {
    // Allowed X range: ±4. Block at x=5 exceeds +4.
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 5, y: 0.5, z: 0 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].child.id).toBe('block-1');
    expect(violations[0].ancestor.id).toBe('vnet');
  });

  it('detects block outside container on negative X axis', () => {
    // Allowed X range: ±4. Block at x=-5 exceeds -4.
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: -5, y: 0.5, z: 0 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].child.id).toBe('block-1');
  });

  it('detects block outside container on Z axis', () => {
    // Allowed Z range: ±4. Block at z=5 exceeds +4.
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 0, y: 0.5, z: 5 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].child.id).toBe('block-1');
  });

  it('detects subnet exceeding parent container bounds', () => {
    // VNet frame 10×10. Subnet frame 6×10.
    // Allowed subnet X range: ±(10/2 - 6/2) = ±2. Subnet at x=3 exceeds +2.
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = {
      ...makeContainer('subnet', 'vnet', { x: 3, y: 0.3, z: 0 }),
      frame: { width: 6, height: 0.2, depth: 10 },
    };
    const template = makeTemplate([vnet, subnet as ContainerBlock]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].child.id).toBe('subnet');
    expect(violations[0].ancestor.id).toBe('vnet');
  });

  it('allows subnet within parent container bounds', () => {
    // Allowed subnet X range: ±2. Subnet at x=2 is exactly at boundary.
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = {
      ...makeContainer('subnet', 'vnet', { x: 2, y: 0.3, z: 0 }),
      frame: { width: 6, height: 0.2, depth: 10 },
    };
    const template = makeTemplate([vnet, subnet as ContainerBlock]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(0);
  });

  it('checks resource block against direct parent only', () => {
    // VNet frame 10×10, Subnet at (0, 0.3, 0) frame 6×6.
    // Block in subnet at (4, 0.5, 0). Allowed range in subnet: ±(6/2 - 2/2) = ±2.
    // 4 > 2 → violation against subnet.
    const vnet = makeContainer('vnet', null, { x: 0, y: 0, z: 0 });
    const subnet = {
      ...makeContainer('subnet', 'vnet', { x: 0, y: 0.3, z: 0 }),
      frame: { width: 6, height: 0.2, depth: 6 },
    };
    const block = makeResource('block-1', 'subnet', { x: 4, y: 0.5, z: 0 });
    const template = makeTemplate([vnet, subnet as ContainerBlock, block]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].ancestor.id).toBe('subnet');
  });

  it('skips external actors (parentId === null)', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('ext-browser', null, { x: -14, y: 0, z: -3 }, {
        resourceType: 'browser',
        category: 'delivery',
        roles: ['external'],
      } as Partial<ResourceBlock>),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(0);
  });

  it('allows block exactly at container boundary (center-based edge)', () => {
    // Allowed block center range: ±4. Block at (4, 0.5, -4) is exactly at boundary.
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 4, y: 0.5, z: -4 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(0);
  });

  it('includes human-readable message in violation', () => {
    const template = makeTemplate([
      makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      makeResource('block-1', 'vnet', { x: 5, y: 0.5, z: 0 }),
    ]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('block-1');
    expect(violations[0].message).toContain('vnet');
    expect(violations[0].message).toContain('exceeds');
  });

  it('validates real template coords: VNet(16×14) with Subnet at x=-4, frame 6×5', () => {
    // Matches three-tier template. Allowed subnet X: ±(16/2 - 6/2) = ±5.
    // Subnet at x=-4: |-4| = 4 <= 5 ✓
    // Allowed subnet Z: ±(14/2 - 5/2) = ±4.5. Subnet at z=0: |0| = 0 <= 4.5 ✓
    const vnet = {
      ...makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      frame: { width: 16, height: 0.3, depth: 14 },
    } as ContainerBlock;
    const subnet = {
      ...makeContainer('subnet', 'vnet', { x: -4, y: 0.3, z: 0 }),
      frame: { width: 6, height: 0.2, depth: 5 },
    } as ContainerBlock;
    // Block in subnet: allowed X: ±(6/2 - 2/2) = ±2. |-1.5| = 1.5 <= 2 ✓
    // Block in subnet: allowed Z: ±(5/2 - 2/2) = ±1.5.
    // Use z=-1.5 to stay exactly at boundary.
    const block = makeResource('gw', 'subnet', { x: -1.5, y: 0.5, z: -1.5 });
    const template = makeTemplate([vnet, subnet, block]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(0);
  });

  it('catches out-of-bounds block in real template dimensions', () => {
    // Subnet frame 6×5. Block dims 2×2.
    // Allowed Z: ±(5/2 - 2/2) = ±1.5. Block at z=-2: |-2| > 1.5 → violation.
    const vnet = {
      ...makeContainer('vnet', null, { x: 0, y: 0, z: 0 }),
      frame: { width: 16, height: 0.3, depth: 14 },
    } as ContainerBlock;
    const subnet = {
      ...makeContainer('subnet', 'vnet', { x: -4, y: 0.3, z: 0 }),
      frame: { width: 6, height: 0.2, depth: 5 },
    } as ContainerBlock;
    const block = makeResource('gw', 'subnet', { x: -1.5, y: 0.5, z: -2 });
    const template = makeTemplate([vnet, subnet, block]);
    const violations = validateContainerBounds(template);
    expect(violations).toHaveLength(1);
    expect(violations[0].child.id).toBe('gw');
    expect(violations[0].ancestor.id).toBe('subnet');
  });
});

// ─── Quality Gate: ALL Builtin Templates Container Bounds ───────

describe('builtin template bounds quality gate', () => {
  it('all 6 builtin templates have all blocks within container bounds', async () => {
    const { registerBuiltinTemplates } = await import('../builtin');
    const { listTemplates } = await import('../registry');

    registerBuiltinTemplates();

    const templates = listTemplates();
    expect(templates).toHaveLength(6);

    for (const template of templates) {
      const violations = validateContainerBounds(template);
      if (violations.length > 0) {
        const details = violations.map((v) => `  - ${v.message}`).join('\n');
        throw new Error(
          `Template "${template.name}" (${template.id}) has ${violations.length} bounds violation(s):\n${details}`,
        );
      }
    }
  });
});

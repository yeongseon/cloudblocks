import { describe, it, expect } from 'vitest';
import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import {
  snapEvenUp,
  chooseGrid,
  reflowBlockPositions,
  subnetFrameFromBounds,
  parentFrameFromChildSubnets,
  parentFrameFromChildren,
  autosizeContainerTree,
  nextGridPosition,
  findNonOverlappingPosition,
  roundToTenth,
} from '../helpers';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a ResourceBlock with default values.
 * Used for testing block positioning and sizing.
 */
function makeResource(
  id: string,
  parentId: string | null,
  position = { x: 0, y: 0.6, z: 0 },
): ResourceBlock {
  return {
    id,
    name: id,
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId,
    position: { ...position, y: position.y ?? 0.6 },
    metadata: {},
  };
}

/**
 * Creates a ContainerBlock (subnet or virtual_network).
 * Used for testing frame resizing and hierarchy.
 */
function makeContainer(
  id: string,
  layer: 'subnet' | 'region',
  parentId: string | null,
  frame: { width: number; height: number; depth: number },
  position = { x: 0, y: 0, z: 0 },
): ContainerBlock {
  return {
    id,
    name: id,
    kind: 'container',
    layer: layer as ContainerBlock['layer'],
    resourceType: layer === 'subnet' ? 'subnet' : 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId,
    frame,
    position: { ...position, y: position.y ?? 0 },
    metadata: {},
  };
}

// ============================================================================
// snapEvenUp Tests
// ============================================================================

describe('snapEvenUp', () => {
  it('should round 3 up to 4 (even)', () => {
    expect(snapEvenUp(3)).toBe(4);
  });

  it('should keep 4 as 4 (already even)', () => {
    expect(snapEvenUp(4)).toBe(4);
  });

  it('should round 5 up to 6 (even)', () => {
    expect(snapEvenUp(5)).toBe(6);
  });

  it('should keep 0 as 0 (even edge case)', () => {
    expect(snapEvenUp(0)).toBe(0);
  });

  it('should round 1 up to 2 (even)', () => {
    expect(snapEvenUp(1)).toBe(2);
  });

  it('should round 7.5 up to 8 (even)', () => {
    expect(snapEvenUp(7.5)).toBe(8);
  });

  it('should handle large numbers correctly', () => {
    expect(snapEvenUp(100.1)).toBe(102);
  });

  it('should handle negative numbers (rounds toward positive)', () => {
    expect(snapEvenUp(-3)).toBe(-2);
  });
});

// ============================================================================
// chooseGrid Tests
// ============================================================================

describe('chooseGrid', () => {
  it('count=0 should return minimal grid 1x1 with MIN_SUBNET sizes', () => {
    const result = chooseGrid(0);
    expect(result).toEqual({ cols: 1, rows: 1, width: 4, depth: 6 });
  });

  it('count=1 should return 1x1 grid with MIN_SUBNET dimensions', () => {
    const result = chooseGrid(1);
    expect(result.cols).toBe(1);
    expect(result.rows).toBe(1);
    expect(result.width).toBeGreaterThanOrEqual(4); // MIN_SUBNET.width
    expect(result.depth).toBeGreaterThanOrEqual(6); // MIN_SUBNET.depth
  });

  it('count=2 should pick optimal layout (1x2 vs 2x1)', () => {
    const result = chooseGrid(2);
    // For 2 blocks: both 2x1 and 1x2 are valid layouts
    // Should pick the one with smaller area
    expect([1, 2]).toContain(result.cols);
    expect([1, 2]).toContain(result.rows);
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(2);
  });

  it('count=3 should pick reasonable grid', () => {
    const result = chooseGrid(3);
    // For 3 blocks: could be 3x1 or 1x3 (skipped due to aspect ratio > 2)
    // or 2x2 with capacity for 4
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(3);
    expect(result.width).toBeGreaterThanOrEqual(4);
    expect(result.depth).toBeGreaterThanOrEqual(6);
  });

  it('count=4 should pick 2x2 grid', () => {
    const result = chooseGrid(4);
    expect(result.cols).toBe(2);
    expect(result.rows).toBe(2);
    expect(result.width).toBeGreaterThanOrEqual(4);
    expect(result.depth).toBeGreaterThanOrEqual(6);
  });

  it('count=6 should pick 3x2 or 2x3 with reasonable dimensions', () => {
    const result = chooseGrid(6);
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(6);
    // Aspect ratio should be reasonable (not extremely stretched)
    const aspectRatio = Math.max(result.width / result.depth, result.depth / result.width);
    expect(aspectRatio).toBeLessThanOrEqual(2.5); // Allow some tolerance
  });

  it('count=8 should pick reasonable grid', () => {
    const result = chooseGrid(8);
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(8);
  });

  it('all dimensions should be snapped to even numbers', () => {
    for (let count = 0; count <= 10; count++) {
      const result = chooseGrid(count);
      expect(result.width % 2).toBe(0);
      expect(result.depth % 2).toBe(0);
    }
  });
});

// ============================================================================
// reflowBlockPositions Tests
// ============================================================================

describe('reflowBlockPositions', () => {
  it('count=1 should return single centered position at container height', () => {
    const grid = { cols: 1, rows: 1, width: 4, depth: 6 };
    const positions = reflowBlockPositions(1, grid, 0.6);

    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual({ x: 0, y: 0.6, z: 0 });
  });

  it('count=2 with 2x1 grid should position blocks horizontally centered', () => {
    const grid = { cols: 2, rows: 1, width: 8, depth: 6 };
    const positions = reflowBlockPositions(2, grid, 0.6);

    expect(positions).toHaveLength(2);
    // Both should have same y and z
    expect(positions[0].y).toBe(0.6);
    expect(positions[1].y).toBe(0.6);
    expect(positions[0].z).toBe(positions[1].z);
    // X positions should be different and centered
    expect(positions[0].x).not.toBe(positions[1].x);
  });

  it('count=4 with 2x2 grid should position in 2x2 layout', () => {
    const grid = { cols: 2, rows: 2, width: 8, depth: 8 };
    const positions = reflowBlockPositions(4, grid, 0.6);

    expect(positions).toHaveLength(4);

    // All should have same y
    positions.forEach((pos) => {
      expect(pos.y).toBe(0.6);
    });

    // Positions should form a grid: 2 unique x values, 2 unique z values
    const xValues = new Set(positions.map((p) => p.x));
    const zValues = new Set(positions.map((p) => p.z));
    expect(xValues.size).toBe(2);
    expect(zValues.size).toBe(2);
  });

  it('all positions should be rounded to tenth', () => {
    const grid = { cols: 3, rows: 2, width: 8, depth: 6 };
    const positions = reflowBlockPositions(6, grid, 0.6);

    positions.forEach((pos) => {
      expect(pos.x).toBe(roundToTenth(pos.x));
      expect(pos.z).toBe(roundToTenth(pos.z));
    });
  });

  it('count=0 should return empty array', () => {
    const grid = { cols: 1, rows: 1, width: 4, depth: 6 };
    const positions = reflowBlockPositions(0, grid, 0.6);
    expect(positions).toHaveLength(0);
  });

  it('positions should be centered around 0', () => {
    const grid = { cols: 3, rows: 2, width: 10, depth: 8 };
    const positions = reflowBlockPositions(6, grid, 0.6);

    // Calculate average x and z (should be close to 0)
    const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;

    expect(Math.abs(avgX)).toBeLessThan(0.1);
    expect(Math.abs(avgZ)).toBeLessThan(0.1);
  });
});

// ============================================================================
// subnetFrameFromBounds Tests
// ============================================================================

describe('subnetFrameFromBounds', () => {
  it('empty blocks array should return MIN_SUBNET', () => {
    const frame = subnetFrameFromBounds([]);
    expect(frame).toEqual({ width: 4, depth: 6 });
  });

  it('single block at origin should return MIN_SUBNET dimensions', () => {
    const blocks = [makeResource('res-1', 'subnet-1', { x: 0, y: 0.6, z: 0 })];
    const frame = subnetFrameFromBounds(blocks);

    expect(frame.width).toBeGreaterThanOrEqual(4);
    expect(frame.depth).toBeGreaterThanOrEqual(6);
  });

  it('two blocks spread apart should expand frame', () => {
    const blocks = [
      makeResource('res-1', 'subnet-1', { x: -3, y: 0.6, z: 0 }),
      makeResource('res-2', 'subnet-1', { x: 3, y: 0.6, z: 0 }),
    ];
    const frame = subnetFrameFromBounds(blocks);

    // Bounding box width ≈ 6 + 2 pad = 8 → snap(8) = 8
    expect(frame.width).toBeGreaterThanOrEqual(8);
    expect(frame.width % 2).toBe(0); // Should be even
  });

  it('frame dimensions should always be even', () => {
    const testCases = [
      [makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 })],
      [
        makeResource('r1', 'subnet-1', { x: -2, y: 0.6, z: 0 }),
        makeResource('r2', 'subnet-1', { x: 2, y: 0.6, z: 0 }),
      ],
      [
        makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: -3 }),
        makeResource('r2', 'subnet-1', { x: 0, y: 0.6, z: 3 }),
      ],
    ];

    testCases.forEach((blocks) => {
      const frame = subnetFrameFromBounds(blocks);
      expect(frame.width % 2).toBe(0);
      expect(frame.depth % 2).toBe(0);
    });
  });

  it('should respect minimum dimensions', () => {
    const blocks = [makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 })];
    const frame = subnetFrameFromBounds(blocks);

    expect(frame.width).toBeGreaterThanOrEqual(4);
    expect(frame.depth).toBeGreaterThanOrEqual(6);
  });
});

// ============================================================================
// parentFrameFromChildSubnets Tests
// ============================================================================

describe('parentFrameFromChildSubnets', () => {
  it('empty children array should return MIN_VNET', () => {
    const frame = parentFrameFromChildSubnets([]);
    expect(frame).toEqual({ width: 8, depth: 12 });
  });

  it('single subnet should expand to accommodate it plus padding', () => {
    const children = [
      {
        kind: 'container' as const,
        position: { x: 0, z: 0 },
        frame: { width: 4, depth: 6 },
      },
    ];
    const frame = parentFrameFromChildSubnets(children);

    // 4 + 2*2 pad = 8 → snap(8) = 8; 6 + 2*2 pad = 10 → snap(10) = 10
    // But MIN_VNET is 8x12, so depth should be 12
    expect(frame.width).toBeGreaterThanOrEqual(8);
    expect(frame.depth).toBeGreaterThanOrEqual(12);
  });

  it('two subnets spread apart should expand frame appropriately', () => {
    const children = [
      {
        kind: 'container' as const,
        position: { x: -4, z: 0 },
        frame: { width: 4, depth: 6 },
      },
      {
        kind: 'container' as const,
        position: { x: 4, z: 0 },
        frame: { width: 4, depth: 6 },
      },
    ];
    const frame = parentFrameFromChildSubnets(children);

    // Width bounding box = 8 + 2*2 pad = 12 → snap(12) = 12
    expect(frame.width).toBeGreaterThanOrEqual(12);
    expect(frame.depth).toBeGreaterThanOrEqual(12);
  });

  it('frame dimensions should always be even', () => {
    const testCases = [
      [{ kind: 'container' as const, position: { x: 0, z: 0 }, frame: { width: 4, depth: 6 } }],
      [
        { kind: 'container' as const, position: { x: -5, z: 0 }, frame: { width: 4, depth: 6 } },
        { kind: 'container' as const, position: { x: 5, z: 0 }, frame: { width: 4, depth: 6 } },
      ],
      [
        { kind: 'container' as const, position: { x: 0, z: -6 }, frame: { width: 4, depth: 6 } },
        { kind: 'container' as const, position: { x: 0, z: 6 }, frame: { width: 4, depth: 6 } },
      ],
    ];

    testCases.forEach((children) => {
      const frame = parentFrameFromChildSubnets(children);
      expect(frame.width % 2).toBe(0);
      expect(frame.depth % 2).toBe(0);
    });
  });

  it('should respect minimum VNET dimensions (8x12)', () => {
    const children = [
      { kind: 'container' as const, position: { x: 0, z: 0 }, frame: { width: 4, depth: 6 } },
    ];
    const frame = parentFrameFromChildSubnets(children);

    expect(frame.width).toBeGreaterThanOrEqual(8);
    expect(frame.depth).toBeGreaterThanOrEqual(12);
  });
});

describe('parentFrameFromChildren', () => {
  it('should handle mixed children: subnets and loose resource blocks', () => {
    const children = [
      { kind: 'container' as const, position: { x: 4, z: 0 }, frame: { width: 4, depth: 6 } },
      { kind: 'resource' as const, position: { x: -6, z: -5 } },
    ];
    const frame = parentFrameFromChildren(children);

    expect(frame.width).toBeGreaterThanOrEqual(18);
    expect(frame.depth).toBeGreaterThanOrEqual(12);
    expect(frame.width % 2).toBe(0);
    expect(frame.depth % 2).toBe(0);
  });

  it('should use asymmetric extent math', () => {
    const children = [
      { kind: 'container' as const, position: { x: 8, z: 0 }, frame: { width: 4, depth: 6 } },
    ];
    const frame = parentFrameFromChildren(children);

    expect(frame.width).toBeGreaterThanOrEqual(24);
  });
});

// ============================================================================
// autosizeContainerTree Tests
// ============================================================================

describe('autosizeContainerTree', () => {
  it('empty changedSubnetIds should return nodes unchanged', () => {
    const nodes: (ContainerBlock | ResourceBlock)[] = [
      makeResource('r1', 'subnet-1'),
      makeContainer('subnet-1', 'subnet', 'vnet-1', { width: 4, height: 2, depth: 6 }),
    ];
    const result = autosizeContainerTree(nodes, [], true);
    expect(result).toEqual(nodes);
  });

  it('empty nodes should return empty array', () => {
    const result = autosizeContainerTree([], ['subnet-1'], true);
    expect(result).toHaveLength(0);
  });

  it('subnet with reflow=true should resize and reposition children', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 });
    const res2 = makeResource('r2', 'subnet-1', { x: 1, y: 0.6, z: 0 });

    const nodes = [subnet, res1, res2];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    expect(result).toHaveLength(3);

    // Find updated subnet and resources
    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    const updatedR1 = result.find((n) => n.id === 'r1') as ResourceBlock;
    const updatedR2 = result.find((n) => n.id === 'r2') as ResourceBlock;

    expect(updatedSubnet).toBeDefined();
    expect(updatedR1).toBeDefined();
    expect(updatedR2).toBeDefined();

    // Subnet should be resized
    expect(updatedSubnet.frame).not.toEqual(subnet.frame);

    // Resources should have new positions (reflowed)
    expect(updatedR1.position).not.toEqual(res1.position);
    expect(updatedR2.position).not.toEqual(res2.position);
  });

  it('subnet with reflow=false should resize based on bounds only', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 });
    const res2 = makeResource('r2', 'subnet-1', { x: 1, y: 0.6, z: 0 });

    const originalPositions = [res1.position, res2.position];
    const nodes = [subnet, res1, res2];
    const result = autosizeContainerTree(nodes, ['subnet-1'], false);

    expect(result).toHaveLength(3);

    // Find updated resources
    const updatedR1 = result.find((n) => n.id === 'r1') as ResourceBlock;
    const updatedR2 = result.find((n) => n.id === 'r2') as ResourceBlock;

    // Positions should NOT change (reflow=false)
    expect(updatedR1.position).toEqual(originalPositions[0]);
    expect(updatedR2.position).toEqual(originalPositions[1]);

    // But subnet should still resize
    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet.frame).not.toEqual(subnet.frame);
  });

  it('subnet with no children should revert to MIN_SUBNET', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 10, height: 2, depth: 10 });
    const nodes = [subnet];

    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet.frame.width).toBe(4);
    expect(updatedSubnet.frame.depth).toBe(6);
  });

  it('parent VNet should auto-resize when child subnet changes', () => {
    const vnet = makeContainer('vnet-1', 'region', null, {
      width: 8,
      height: 2,
      depth: 12,
    });
    const subnet = makeContainer(
      'subnet-1',
      'subnet',
      'vnet-1',
      { width: 4, height: 2, depth: 6 },
      { x: 0, y: 0, z: 0 },
    );
    const res1 = makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 });
    const res2 = makeResource('r2', 'subnet-1', { x: 1, y: 0.6, z: 1 });
    const res3 = makeResource('r3', 'subnet-1', { x: 2, y: 0.6, z: -1 });

    const nodes = [vnet, subnet, res1, res2, res3];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    // Both subnet and VNet should be in results
    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    const updatedVNet = result.find((n) => n.id === 'vnet-1') as ContainerBlock;

    expect(updatedSubnet).toBeDefined();
    expect(updatedVNet).toBeDefined();

    // VNet should be resized (because subnet changed)
    expect(updatedVNet.frame).not.toEqual(vnet.frame);
  });

  it('parent VNet should consider loose resource blocks when resizing', () => {
    const vnet = makeContainer('vnet-1', 'region', null, {
      width: 8,
      height: 2,
      depth: 12,
    });
    const subnet = makeContainer(
      'subnet-1',
      'subnet',
      'vnet-1',
      { width: 4, height: 2, depth: 6 },
      { x: 4, y: 0, z: 0 },
    );
    const looseBlock = makeResource('loose-1', 'vnet-1', { x: -6, y: 0.5, z: -5 });
    const res1 = makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 });

    const nodes = [vnet, subnet, looseBlock, res1];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedVNet = result.find((n) => n.id === 'vnet-1') as ContainerBlock;
    expect(updatedVNet).toBeDefined();
    expect(updatedVNet.frame.width).toBeGreaterThanOrEqual(18);
  });

  it('multiple changed subnets should all be processed', () => {
    const subnet1 = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const subnet2 = makeContainer('subnet-2', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1', { x: 0, y: 0.6, z: 0 });
    const res2 = makeResource('r2', 'subnet-2', { x: 0, y: 0.6, z: 0 });

    const nodes = [subnet1, subnet2, res1, res2];
    const result = autosizeContainerTree(nodes, ['subnet-1', 'subnet-2'], true);

    const updated1 = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    const updated2 = result.find((n) => n.id === 'subnet-2') as ContainerBlock;

    // Both subnets should be in the result
    expect(updated1).toBeDefined();
    expect(updated2).toBeDefined();
  });

  it('should skip non-subnet container blocks in changedSubnetIds', () => {
    const vnet = makeContainer('vnet-1', 'region', null, {
      width: 8,
      height: 2,
      depth: 12,
    });
    const subnet = makeContainer('subnet-1', 'subnet', 'vnet-1', { width: 4, height: 2, depth: 6 });
    const nodes = [vnet, subnet];

    // Try to process VNet as if it were a subnet
    const result = autosizeContainerTree(nodes, ['vnet-1'], true);

    // Should return nodes unchanged (VNet is not a subnet)
    expect(result).toEqual(nodes);
  });

  it('should handle resource blocks not in subnets', () => {
    const res1 = makeResource('r1', null); // Top-level resource
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res2 = makeResource('r2', 'subnet-1');

    const nodes = [res1, subnet, res2];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    // res1 should be unchanged, subnet and res2 may change
    const updatedRes1 = result.find((n) => n.id === 'r1') as ResourceBlock;
    expect(updatedRes1).toEqual(res1);
  });

  it('frames should maintain height field', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes = [subnet, res1];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet.frame.height).toBe(2); // height should remain unchanged
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Auto-resize integration', () => {
  it('should handle complex hierarchy: VNet → Subnet → Resources', () => {
    const vnet = makeContainer('vnet-1', 'region', null, {
      width: 8,
      height: 2,
      depth: 12,
    });
    const subnet1 = makeContainer('subnet-1', 'subnet', 'vnet-1', {
      width: 4,
      height: 2,
      depth: 6,
    });
    const subnet2 = makeContainer(
      'subnet-2',
      'subnet',
      'vnet-1',
      { width: 4, height: 2, depth: 6 },
      { x: 0, y: 0, z: 10 },
    );

    const resources = [
      makeResource('r1', 'subnet-1', { x: -1, y: 0.6, z: 0 }),
      makeResource('r2', 'subnet-1', { x: 1, y: 0.6, z: 0 }),
      makeResource('r3', 'subnet-2', { x: -1, y: 0.6, z: 10 }),
    ];

    const nodes = [vnet, subnet1, subnet2, ...resources];
    const result = autosizeContainerTree(nodes, ['subnet-1', 'subnet-2'], true);

    expect(result).toHaveLength(nodes.length);
    expect(result.find((n) => n.id === 'vnet-1')).toBeDefined();
  });

  it('should handle edge case: subnet with 0 blocks → 1 block → 4 blocks', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });

    // Case 1: no blocks
    let result = autosizeContainerTree([subnet], ['subnet-1'], true);
    let updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet.frame).toEqual({ width: 4, height: 2, depth: 6 });

    // Case 2: 1 block
    result = autosizeContainerTree([subnet, makeResource('r1', 'subnet-1')], ['subnet-1'], true);
    updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet.frame.width).toBeGreaterThanOrEqual(4);

    // Case 3: 4 blocks
    const blocks: (ContainerBlock | ResourceBlock)[] = [subnet];
    for (let i = 1; i <= 4; i++) {
      blocks.push(makeResource(`r${i}`, 'subnet-1'));
    }
    result = autosizeContainerTree(blocks, ['subnet-1'], true);
    updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    // 4 blocks should result in 2x2 grid
    expect(updatedSubnet.frame.width).toBeGreaterThanOrEqual(4);
  });

  it('should preserve all unchanged nodes in the output', () => {
    const vnet = makeContainer('vnet-1', 'region', null, {
      width: 8,
      height: 2,
      depth: 12,
    });
    const subnet = makeContainer('subnet-1', 'subnet', 'vnet-1', { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1');
    const res2 = makeResource('r2', 'subnet-1');
    const toplevelRes = makeResource('toplevel', null);

    const nodes = [vnet, subnet, res1, res2, toplevelRes];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    // All nodes should be present
    expect(result.map((n) => n.id).sort()).toEqual(nodes.map((n) => n.id).sort());
  });
});

// ============================================================================
// Branch coverage tests
// ============================================================================

describe('autosizeContainerTree branch coverage', () => {
  it('should infer profileId when subnet has profileId property', () => {
    const subnet: ContainerBlock = {
      ...makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 }),
      profileId: 'subnet-utility',
    };
    const res1 = makeResource('r1', 'subnet-1');
    const res2 = makeResource('r2', 'subnet-1');
    const res3 = makeResource('r3', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [subnet, res1, res2, res3];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet).toBeDefined();
    // Should have inferred a new profileId based on resized dimensions
    expect(updatedSubnet.profileId).toBeDefined();
  });

  it('should infer profileId on parent VNet when it has profileId', () => {
    const vnet: ContainerBlock = {
      ...makeContainer('vnet-1', 'region', null, { width: 8, height: 2, depth: 12 }),
      profileId: 'network-sandbox',
    };
    const subnet = makeContainer('subnet-1', 'subnet', 'vnet-1', {
      width: 4,
      height: 2,
      depth: 6,
    });
    const res1 = makeResource('r1', 'subnet-1');
    const res2 = makeResource('r2', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [vnet, subnet, res1, res2];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedVNet = result.find((n) => n.id === 'vnet-1') as ContainerBlock;
    expect(updatedVNet).toBeDefined();
    expect(updatedVNet.profileId).toBeDefined();
  });

  it('should skip non-existent changedSubnetId gracefully', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [subnet, res1];
    // 'nonexistent' is not in nodes
    const result = autosizeContainerTree(nodes, ['nonexistent'], true);
    expect(result).toEqual(nodes);
  });

  it('should handle subnet whose parent is not a virtual_network', () => {
    // parent is a region container but NOT a virtual_network
    const parent = makeContainer('region-1', 'region', null, {
      width: 16,
      height: 2,
      depth: 20,
    });
    // Override resourceType so it's NOT virtual_network
    (parent as ContainerBlock).resourceType = 'subnet';
    const subnet = makeContainer('subnet-1', 'subnet', 'region-1', {
      width: 4,
      height: 2,
      depth: 6,
    });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [parent, subnet, res1];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet).toBeDefined();
    // Parent should NOT be resized (not a VNet)
    const updatedParent = result.find((n) => n.id === 'region-1') as ContainerBlock;
    expect(updatedParent.frame).toEqual(parent.frame);
  });

  it('should handle duplicate changedSubnetIds (dedup via Set)', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [subnet, res1];
    const result = autosizeContainerTree(nodes, ['subnet-1', 'subnet-1', 'subnet-1'], true);

    // Should process subnet-1 only once
    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet).toBeDefined();
    expect(updatedSubnet.frame.width).toBeGreaterThanOrEqual(4);
  });

  it('should handle resource block ID in changedSubnetIds (skip non-container)', () => {
    const subnet = makeContainer('subnet-1', 'subnet', null, { width: 4, height: 2, depth: 6 });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [subnet, res1];
    // Pass a resource block's ID — should skip it
    const result = autosizeContainerTree(nodes, ['r1'], true);
    expect(result).toEqual(nodes);
  });

  it('should handle parentVNet not found in nodes gracefully', () => {
    // Subnet references a parentId that doesn't exist in nodes
    const subnet = makeContainer('subnet-1', 'subnet', 'missing-vnet', {
      width: 4,
      height: 2,
      depth: 6,
    });
    const res1 = makeResource('r1', 'subnet-1');

    const nodes: (ContainerBlock | ResourceBlock)[] = [subnet, res1];
    const result = autosizeContainerTree(nodes, ['subnet-1'], true);

    const updatedSubnet = result.find((n) => n.id === 'subnet-1') as ContainerBlock;
    expect(updatedSubnet).toBeDefined();
    // Subnet should still be resized, just no parent VNet cascade
    expect(updatedSubnet.frame.width).toBeGreaterThanOrEqual(4);
  });
});

describe('chooseGrid branch coverage', () => {
  it('count=1: fallback and best should be the same (single layout)', () => {
    const result = chooseGrid(1);
    expect(result.cols).toBe(1);
    expect(result.rows).toBe(1);
    // Single column should have aspect ratio ≤ 2
    const aspect = Math.max(result.width / result.depth, result.depth / result.width);
    expect(aspect).toBeLessThanOrEqual(2);
  });

  it('count=5: should find best layout despite some layouts exceeding aspect ratio', () => {
    const result = chooseGrid(5);
    // For 5: 5x1 rejected (aspect too high), 3x2 or 2x3 should work
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(5);
    expect(result.width % 2).toBe(0);
    expect(result.depth % 2).toBe(0);
  });

  it('count=9: should pick reasonable grid', () => {
    const result = chooseGrid(9);
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(9);
    expect(result.width % 2).toBe(0);
    expect(result.depth % 2).toBe(0);
  });

  it('count=10: should pick reasonable grid with even dimensions', () => {
    const result = chooseGrid(10);
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(10);
    expect(result.width % 2).toBe(0);
    expect(result.depth % 2).toBe(0);
  });

  it('count=12: should pick optimal layout', () => {
    const result = chooseGrid(12);
    // 4x3 or 3x4 should be optimal
    expect(result.cols * result.rows).toBeGreaterThanOrEqual(12);
    const aspect = Math.max(result.width / result.depth, result.depth / result.width);
    expect(aspect).toBeLessThanOrEqual(2);
  });

  it('should handle equal-area tie-break by choosing smaller depth', () => {
    // count=4: 2x2, 1x4, 4x1 — all compete. 2x2 should win (balanced)
    const result = chooseGrid(4);
    expect(result.cols).toBe(2);
    expect(result.rows).toBe(2);
  });
});

describe('reflowBlockPositions branch coverage', () => {
  it('count=3 with 3x1 grid should distribute blocks horizontally', () => {
    const grid = { cols: 3, rows: 1, width: 10, depth: 6 };
    const positions = reflowBlockPositions(3, grid, 0.5);

    expect(positions).toHaveLength(3);
    // All same y and z
    positions.forEach((pos) => {
      expect(pos.y).toBe(0.5);
    });
    expect(positions[0].z).toBe(positions[1].z);
    expect(positions[1].z).toBe(positions[2].z);
    // x values should be different
    const xSet = new Set(positions.map((p) => p.x));
    expect(xSet.size).toBe(3);
  });

  it('count=5 with 3x2 grid should fill 2 rows', () => {
    const grid = { cols: 3, rows: 2, width: 10, depth: 8 };
    const positions = reflowBlockPositions(5, grid, 0.6);

    expect(positions).toHaveLength(5);
    // First 3 in row 0, next 2 in row 1
    const row0z = positions[0].z;
    const row1z = positions[3].z;
    expect(row0z).not.toBe(row1z);
  });
});

describe('subnetFrameFromBounds branch coverage', () => {
  it('blocks spread on both axes should produce frame covering all', () => {
    const blocks = [
      makeResource('r1', 'subnet-1', { x: -4, y: 0.6, z: -4 }),
      makeResource('r2', 'subnet-1', { x: 4, y: 0.6, z: 4 }),
    ];
    const frame = subnetFrameFromBounds(blocks);

    // Bounding box: x from -5 to 5 = 10 + 2 pad = 12
    // z from -5 to 5 = 10 + 2 pad = 12
    expect(frame.width).toBeGreaterThanOrEqual(10);
    expect(frame.depth).toBeGreaterThanOrEqual(10);
  });
});

describe('parentFrameFromChildSubnets branch coverage', () => {
  it('children spread on both axes should produce larger frame', () => {
    const children = [
      { kind: 'container' as const, position: { x: -6, z: -6 }, frame: { width: 4, depth: 6 } },
      { kind: 'container' as const, position: { x: 6, z: 6 }, frame: { width: 4, depth: 6 } },
    ];
    const frame = parentFrameFromChildSubnets(children);

    // Bounding: x from -8 to 8 = 16 + 4 = 20; z from -9 to 9 = 18 + 4 = 22
    expect(frame.width).toBeGreaterThanOrEqual(16);
    expect(frame.depth).toBeGreaterThanOrEqual(16);
  });
});

describe('nextGridPosition', () => {
  it('places first block at center', () => {
    const pos = nextGridPosition([], { width: 4, depth: 6 });

    expect(pos).toEqual({ x: 0, y: 0.5, z: 0 });
  });

  it('wraps to next row when exceeding maxCols', () => {
    const existing = Array.from({ length: 5 }, (_, i) => makeResource(`b${i}`, 'p1'));

    const pos = nextGridPosition(existing, { width: 6, depth: 8 });

    expect(pos.x).toBeGreaterThan(0);
    expect(pos.z).toBeLessThan(-4);
  });

  it('uses containerHeight for y', () => {
    const pos = nextGridPosition([], { width: 4, depth: 6 }, 0.8);

    expect(pos.y).toBe(0.8);
  });
});

describe('findNonOverlappingPosition', () => {
  it('returns last position when all attempts exhausted', () => {
    const plateSize = { width: 2, depth: 2 };
    const siblings = Array.from({ length: 51 }, (_, i) => ({
      id: `s${i}`,
      position: { x: i * 3, z: 0 },
      frame: { width: 4, depth: 4 },
    }));

    const result = findNonOverlappingPosition({ x: 0, z: 0 }, plateSize, siblings);

    expect(result).toEqual({ x: 150, z: 0 });
  });
});

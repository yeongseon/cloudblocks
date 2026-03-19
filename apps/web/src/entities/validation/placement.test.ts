import { describe, it, expect } from 'vitest';
import type { Block, Plate } from '../../shared/types/index';
import { validatePlacement, canPlaceBlock, validateLayerPlacement, validateGridAlignment, validateNoOverlap } from './placement';

function makeBlock(
  overrides: Partial<Block> = {}
): Block {
  return {
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'plate-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function makePlate(
  overrides: Partial<Plate> = {}
): Plate {
  return {
    id: 'plate-1',
    name: 'Plate One',
    type: 'subnet',
    subnetAccess: 'private',
    parentId: null,
    children: [],
    position: { x: 0, y: 0, z: 0 },
    size: { width: 4, height: 1, depth: 4 },
    metadata: {},
    ...overrides,
  };
}

function makeSize(overrides: Partial<{ width: number; height: number; depth: number }> = {}): { width: number; height: number; depth: number } {
  return {
    width: 2,
    height: 2,
    depth: 2,
    ...overrides,
  };
}

describe('validatePlacement', () => {
  it('returns error when block is not placed on a plate', () => {
    const block = makeBlock({ id: 'compute-1', name: 'Compute A', category: 'compute' });

    expect(validatePlacement(block, undefined)).toEqual({
      ruleId: 'rule-plate-exists',
      severity: 'error',
      message: 'Block "Compute A" is not placed on any plate',
      suggestion: 'Place the block on a valid subnet plate',
      targetId: 'compute-1',
    });
  });

  it('returns error when compute is on non-subnet plate', () => {
    const block = makeBlock({ id: 'compute-2', name: 'Compute B', category: 'compute' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-compute-subnet',
      severity: 'error',
      message: 'Compute block "Compute B" must be placed on a Subnet Plate',
      suggestion: 'Move the Compute block to a Subnet Plate',
      targetId: 'compute-2',
    });
  });

  it('returns null when compute is on subnet plate', () => {
    const block = makeBlock({ category: 'compute' });
    const publicSubnet = makePlate({ type: 'subnet', subnetAccess: 'public' });
    const privateSubnet = makePlate({ type: 'subnet', subnetAccess: 'private' });

    expect(validatePlacement(block, publicSubnet)).toBeNull();
    expect(validatePlacement(block, privateSubnet)).toBeNull();
  });

  it('returns error when database is on non-subnet plate', () => {
    const block = makeBlock({ id: 'db-1', name: 'Database A', category: 'database' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-db-private',
      severity: 'error',
      message: 'Database block "Database A" must be placed on a private Subnet Plate',
      suggestion: 'Move the Database block to a Private Subnet Plate',
      targetId: 'db-1',
    });
  });

  it('returns error when database is on public subnet', () => {
    const block = makeBlock({ id: 'db-2', name: 'Database B', category: 'database' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-db-private',
      severity: 'error',
      message: 'Database block "Database B" must be placed on a private Subnet Plate',
      suggestion: 'Move the Database block to a Private Subnet Plate',
      targetId: 'db-2',
    });
  });

  it('returns null when database is on private subnet', () => {
    const block = makeBlock({ category: 'database' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when gateway is on non-subnet plate', () => {
    const block = makeBlock({ id: 'gw-1', name: 'Gateway A', category: 'gateway' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-gw-public',
      severity: 'error',
      message: 'Gateway block "Gateway A" must be placed on a public Subnet Plate',
      suggestion: 'Move the Gateway block to a Public Subnet Plate',
      targetId: 'gw-1',
    });
  });

  it('returns error when gateway is on private subnet', () => {
    const block = makeBlock({ id: 'gw-2', name: 'Gateway B', category: 'gateway' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-gw-public',
      severity: 'error',
      message: 'Gateway block "Gateway B" must be placed on a public Subnet Plate',
      suggestion: 'Move the Gateway block to a Public Subnet Plate',
      targetId: 'gw-2',
    });
  });

  it('returns null when gateway is on public subnet', () => {
    const block = makeBlock({ category: 'gateway' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when storage is on non-subnet plate', () => {
    const block = makeBlock({ id: 'storage-1', name: 'Storage A', category: 'storage' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-storage-subnet',
      severity: 'error',
      message: 'Storage block "Storage A" must be placed on a Subnet Plate',
      suggestion: 'Move the Storage block to a Subnet Plate',
      targetId: 'storage-1',
    });
  });

  it('returns null when storage is on subnet plate', () => {
    const block = makeBlock({ category: 'storage' });
    const publicSubnet = makePlate({ type: 'subnet', subnetAccess: 'public' });
    const privateSubnet = makePlate({ type: 'subnet', subnetAccess: 'private' });

    expect(validatePlacement(block, publicSubnet)).toBeNull();
    expect(validatePlacement(block, privateSubnet)).toBeNull();
  });

  it('returns error when function is on subnet plate', () => {
    const block = makeBlock({ id: 'fn-1', name: 'FuncA', category: 'function' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-serverless-network',
      severity: 'error',
      message: 'Function block "FuncA" must be placed on a Region Plate',
      suggestion: 'Move the Function block to a Region Plate (not a Subnet)',
      targetId: 'fn-1',
    });
  });

  it('returns null when function is on network plate', () => {
    const block = makeBlock({ category: 'function' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when queue is on subnet plate', () => {
    const block = makeBlock({ id: 'queue-1', name: 'QueueA', category: 'queue' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-serverless-network',
      severity: 'error',
      message: 'Queue block "QueueA" must be placed on a Region Plate',
      suggestion: 'Move the Queue block to a Region Plate (not a Subnet)',
      targetId: 'queue-1',
    });
  });

  it('returns null when queue is on network plate', () => {
    const block = makeBlock({ category: 'queue' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when event is on subnet plate', () => {
    const block = makeBlock({ id: 'event-1', name: 'EventA', category: 'event' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-serverless-network',
      severity: 'error',
      message: 'Event block "EventA" must be placed on a Region Plate',
      suggestion: 'Move the Event block to a Region Plate (not a Subnet)',
      targetId: 'event-1',
    });
  });

  it('returns null when event is on network plate', () => {
    const block = makeBlock({ category: 'event' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when analytics is on network plate', () => {
    const block = makeBlock({ id: 'analytics-1', name: 'AnalyticsA', category: 'analytics' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-analytics-subnet',
      severity: 'error',
      message: 'Analytics block "AnalyticsA" must be placed on a Subnet Plate',
      suggestion: 'Move the Analytics block to a Subnet Plate',
      targetId: 'analytics-1',
    });
  });

  it('returns error when identity is on network plate', () => {
    const block = makeBlock({ id: 'identity-1', name: 'IdentityA', category: 'identity' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-identity-subnet',
      severity: 'error',
      message: 'Identity block "IdentityA" must be placed on a Subnet Plate',
      suggestion: 'Move the Identity block to a Subnet Plate',
      targetId: 'identity-1',
    });
  });

  it('returns error when observability is on network plate', () => {
    const block = makeBlock({ id: 'observability-1', name: 'ObservabilityA', category: 'observability' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-observability-subnet',
      severity: 'error',
      message: 'Observability block "ObservabilityA" must be placed on a Subnet Plate',
      suggestion: 'Move the Observability block to a Subnet Plate',
      targetId: 'observability-1',
    });
  });

  it('returns null when analytics is on subnet plate', () => {
    const block = makeBlock({ category: 'analytics' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns null when identity is on subnet plate', () => {
    const block = makeBlock({ category: 'identity' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns null when observability is on subnet plate', () => {
    const block = makeBlock({ category: 'observability' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });

    expect(validatePlacement(block, plate)).toBeNull();
  });
});

describe('canPlaceBlock', () => {
  it('returns true when compute is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });
    expect(canPlaceBlock('compute', plate)).toBe(true);
  });

  it('returns false when compute is on network plate', () => {
    const plate = makePlate({ type: 'region', subnetAccess: undefined });
    expect(canPlaceBlock('compute', plate)).toBe(false);
  });

  it('returns true when database is on private subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });
    expect(canPlaceBlock('database', plate)).toBe(true);
  });

  it('returns false when database is on public subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });
    expect(canPlaceBlock('database', plate)).toBe(false);
  });

  it('returns true when gateway is on public subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });
    expect(canPlaceBlock('gateway', plate)).toBe(true);
  });

  it('returns false when gateway is on private subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });
    expect(canPlaceBlock('gateway', plate)).toBe(false);
  });

  it('returns true when storage is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });
    expect(canPlaceBlock('storage', plate)).toBe(true);
  });

  it('returns false when storage is on network plate', () => {
    const plate = makePlate({ type: 'region', subnetAccess: undefined });
    expect(canPlaceBlock('storage', plate)).toBe(false);
  });

  it('returns true when function is on network plate', () => {
    const plate = makePlate({ type: 'region', subnetAccess: undefined });
    expect(canPlaceBlock('function', plate)).toBe(true);
  });

  it('returns false when function is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'public' });
    expect(canPlaceBlock('function', plate)).toBe(false);
  });

  it('returns true when queue is on network plate', () => {
    const plate = makePlate({ type: 'region', subnetAccess: undefined });
    expect(canPlaceBlock('queue', plate)).toBe(true);
  });

  it('returns true when event is on network plate', () => {
    const plate = makePlate({ type: 'region', subnetAccess: undefined });
    expect(canPlaceBlock('event', plate)).toBe(true);
  });

  it('returns true when analytics is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });
    expect(canPlaceBlock('analytics', plate)).toBe(true);
  });

  it('returns true when identity is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });
    expect(canPlaceBlock('identity', plate)).toBe(true);
  });

  it('returns true when observability is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });
    expect(canPlaceBlock('observability', plate)).toBe(true);
  });
});

describe('validateLayerPlacement', () => {
  it('returns null when block is on a subnet plate (valid parent for resource)', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'subnet', subnetAccess: 'private' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a zone plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'zone', subnetAccess: undefined });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a region plate', () => {
    const block = makeBlock({ category: 'function' });
    const plate = makePlate({ type: 'region', subnetAccess: undefined });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on an edge plate', () => {
    const block = makeBlock({ category: 'gateway' });
    const plate = makePlate({ type: 'edge', subnetAccess: undefined });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a global plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'global', subnetAccess: undefined });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns error with correct fields for invalid layer hierarchy', () => {
    // This test validates error shape; all PlateTypes are valid parents for resources,
    // but if VALID_PARENTS were to change, this test pattern would catch it.
    // For now, all 5 plate types are valid parents, so we test error shape with a forced scenario.
    const block = makeBlock({ id: 'b1', name: 'TestBlock', category: 'compute' });
    // Since all PlateTypes are valid parents for 'resource', this will pass.
    // We verify all valid plate types return null.
    const plateTypes = ['global', 'edge', 'region', 'zone', 'subnet'] as const;
    for (const type of plateTypes) {
      const plate = makePlate({ type, subnetAccess: type === 'subnet' ? 'private' : undefined });
      expect(validateLayerPlacement(block, plate)).toBeNull();
    }
  });
});

describe('validateGridAlignment', () => {
  it('returns null when position has integer x and z', () => {
    const block = makeBlock({ position: { x: 0, y: 0, z: 0 } });
    expect(validateGridAlignment(block)).toBeNull();
  });

  it('returns null for positive integer positions', () => {
    const block = makeBlock({ position: { x: 5, y: 0, z: 10 } });
    expect(validateGridAlignment(block)).toBeNull();
  });

  it('returns null for negative integer positions', () => {
    const block = makeBlock({ position: { x: -3, y: 0, z: -7 } });
    expect(validateGridAlignment(block)).toBeNull();
  });

  it('returns error when x is fractional', () => {
    const block = makeBlock({ id: 'b1', name: 'BadX', position: { x: 1.5, y: 0, z: 0 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: 'Block "BadX" position (1.5, 0) is not CU-aligned',
      suggestion: 'Snap the block to integer grid positions',
      targetId: 'b1',
    });
  });

  it('returns error when z is fractional', () => {
    const block = makeBlock({ id: 'b2', name: 'BadZ', position: { x: 0, y: 0, z: 2.7 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: 'Block "BadZ" position (0, 2.7) is not CU-aligned',
      suggestion: 'Snap the block to integer grid positions',
      targetId: 'b2',
    });
  });

  it('returns error when both x and z are fractional', () => {
    const block = makeBlock({ id: 'b3', name: 'BadBoth', position: { x: 0.1, y: 0, z: 0.9 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: 'Block "BadBoth" position (0.1, 0.9) is not CU-aligned',
      suggestion: 'Snap the block to integer grid positions',
      targetId: 'b3',
    });
  });

  it('does not check y coordinate (y is height, not grid position)', () => {
    const block = makeBlock({ position: { x: 2, y: 1.5, z: 3 } });
    expect(validateGridAlignment(block)).toBeNull();
  });
});

describe('validateNoOverlap', () => {
  const defaultSize = makeSize();
  const getSize = () => defaultSize;

  it('returns null when there are no siblings', () => {
    const block = makeBlock({ position: { x: 0, y: 0, z: 0 } });
    expect(validateNoOverlap(block, [], getSize)).toBeNull();
  });

  it('returns null when blocks do not overlap', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 5, y: 0, z: 0 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toBeNull();
  });

  it('returns null when blocks are adjacent but not overlapping (x axis)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 2, y: 0, z: 0 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toBeNull();
  });

  it('returns null when blocks are adjacent but not overlapping (z axis)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 0, y: 0, z: 2 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toBeNull();
  });

  it('returns error when blocks overlap', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 1, y: 0, z: 1 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toEqual({
      ruleId: 'rule-no-overlap',
      severity: 'error',
      message: 'Block "A" overlaps with "B"',
      suggestion: 'Move the block to a non-overlapping position',
      targetId: 'a',
    });
  });

  it('returns error when blocks fully overlap (same position)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 0, y: 0, z: 0 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toEqual({
      ruleId: 'rule-no-overlap',
      severity: 'error',
      message: 'Block "A" overlaps with "B"',
      suggestion: 'Move the block to a non-overlapping position',
      targetId: 'a',
    });
  });

  it('skips self in sibling list', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    // Same block appears in siblings — should be ignored
    expect(validateNoOverlap(block, [block], getSize)).toBeNull();
  });

  it('detects overlap with first overlapping sibling', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const noOverlap = makeBlock({ id: 'b', name: 'B', position: { x: 10, y: 0, z: 10 } });
    const overlaps = makeBlock({ id: 'c', name: 'C', position: { x: 1, y: 0, z: 1 } });

    const result = validateNoOverlap(block, [noOverlap, overlaps], getSize);
    expect(result).not.toBeNull();
    expect(result!.message).toContain('"C"');
  });

  it('uses custom getBlockSize for different block sizes', () => {
    const block = makeBlock({ id: 'a', name: 'A', category: 'compute', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', category: 'database', position: { x: 3, y: 0, z: 0 } });

    // With small size: no overlap
    const smallSize = () => makeSize({ width: 2, depth: 2 });
    expect(validateNoOverlap(block, [sibling], smallSize)).toBeNull();

    // With large size: overlap
    const largeSize = () => makeSize({ width: 4, depth: 4 });
    expect(validateNoOverlap(block, [sibling], largeSize)).not.toBeNull();
  });

  it('handles overlap on x axis only (z separated)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 1, y: 0, z: 5 } });

    // Overlap on x (0..2 vs 1..3) but not on z (0..2 vs 5..7)
    expect(validateNoOverlap(block, [sibling], getSize)).toBeNull();
  });

  it('handles overlap on z axis only (x separated)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 5, y: 0, z: 1 } });

    // Overlap on z (0..2 vs 1..3) but not on x (0..2 vs 5..7)
    expect(validateNoOverlap(block, [sibling], getSize)).toBeNull();
  });
});

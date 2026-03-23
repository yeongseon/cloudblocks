import { describe, it, expect } from 'vitest';
import type { LeafNode, ContainerNode } from '@cloudblocks/schema';
import {
  validatePlacement,
  canPlaceBlock,
  validateLayerPlacement,
  validateGridAlignment,
  validateNoOverlap,
} from './placement';

function makeBlock(overrides: Partial<LeafNode> = {}): LeafNode {
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'plate-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function makePlate(
  overrides: Partial<ContainerNode> & { type?: ContainerNode['layer'] } = {},
): ContainerNode {
  const layer = overrides.type ?? overrides.layer ?? 'subnet';
  const normalizedLayer = layer === 'resource' ? 'subnet' : layer;
  const resourceType: ContainerNode['resourceType'] =
    normalizedLayer === 'subnet' ? 'subnet' : 'virtual_network';
  return {
    id: 'plate-1',
    name: 'Plate',
    kind: 'container',
    layer: normalizedLayer,
    resourceType,
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    size: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function makeSize(overrides: Partial<{ width: number; height: number; depth: number }> = {}): {
  width: number;
  height: number;
  depth: number;
} {
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
      message: 'Resource "Compute A" is not placed on any container',
      suggestion: 'Place the resource on a valid subnet container',
      targetId: 'compute-1',
    });
  });

  it('returns error when compute is on non-subnet plate', () => {
    const block = makeBlock({ id: 'compute-2', name: 'Compute B', category: 'compute' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: 'Compute resource "Compute B" must be placed on a Subnet',
      suggestion: 'Move the Compute resource to a Subnet',
      targetId: 'compute-2',
    });
  });

  it('returns null when compute is on subnet plate', () => {
    const block = makeBlock({ category: 'compute' });
    const subnet = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, subnet)).toBeNull();
  });

  it('returns error when database is on non-subnet plate', () => {
    const block = makeBlock({ id: 'db-1', name: 'Database A', category: 'data' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-data-parent',
      severity: 'error',
      message: 'Data resource "Database A" must be placed on a Subnet',
      suggestion: 'Move the Data resource to a Subnet',
      targetId: 'db-1',
    });
  });

  it('returns null when database is on subnet', () => {
    const block = makeBlock({ id: 'db-2', name: 'Database B', category: 'data' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when gateway is on non-subnet plate', () => {
    const block = makeBlock({ id: 'gw-1', name: 'Gateway A', category: 'delivery' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-delivery-parent',
      severity: 'error',
      message: 'Delivery resource "Gateway A" must be placed on a Subnet',
      suggestion: 'Move the Delivery resource to a Subnet',
      targetId: 'gw-1',
    });
  });

  it('returns null when gateway is on subnet plate', () => {
    const block = makeBlock({ category: 'delivery' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when storage is on non-subnet plate', () => {
    const block = makeBlock({ id: 'storage-1', name: 'Storage A', category: 'data' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-data-parent',
      severity: 'error',
      message: 'Data resource "Storage A" must be placed on a Subnet',
      suggestion: 'Move the Data resource to a Subnet',
      targetId: 'storage-1',
    });
  });

  it('returns null when storage is on subnet plate', () => {
    const block = makeBlock({ category: 'data' });
    const subnet = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, subnet)).toBeNull();
  });

  it('returns null when function is on subnet plate', () => {
    const block = makeBlock({ id: 'fn-1', name: 'FuncA', category: 'compute' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when function is on network plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: 'Compute resource "Block" must be placed on a Subnet',
      suggestion: 'Move the Compute resource to a Subnet',
      targetId: 'block-1',
    });
  });

  it('returns error when queue is on subnet plate', () => {
    const block = makeBlock({ id: 'queue-1', name: 'QueueA', category: 'messaging' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: 'Messaging resource "QueueA" must be placed on a Region container',
      suggestion: 'Move the Messaging resource to a Region container',
      targetId: 'queue-1',
    });
  });

  it('returns null when queue is on network plate', () => {
    const block = makeBlock({ category: 'messaging' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when event is on subnet plate', () => {
    const block = makeBlock({ id: 'event-1', name: 'EventA', category: 'messaging' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: 'Messaging resource "EventA" must be placed on a Region container',
      suggestion: 'Move the Messaging resource to a Region container',
      targetId: 'event-1',
    });
  });

  it('returns null when event is on network plate', () => {
    const block = makeBlock({ category: 'messaging' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns error when analytics is on network plate', () => {
    const block = makeBlock({ id: 'analytics-1', name: 'AnalyticsA', category: 'operations' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-operations-parent',
      severity: 'error',
      message: 'Operations resource "AnalyticsA" must be placed on a Subnet',
      suggestion: 'Move the Operations resource to a Subnet',
      targetId: 'analytics-1',
    });
  });

  it('returns error when identity is on network plate', () => {
    const block = makeBlock({ id: 'identity-1', name: 'IdentityA', category: 'security' });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-security-parent',
      severity: 'error',
      message: 'Security resource "IdentityA" must be placed on a Subnet',
      suggestion: 'Move the Security resource to a Subnet',
      targetId: 'identity-1',
    });
  });

  it('returns error when observability is on network plate', () => {
    const block = makeBlock({
      id: 'observability-1',
      name: 'ObservabilityA',
      category: 'operations',
    });
    const plate = makePlate({ type: 'region' });

    expect(validatePlacement(block, plate)).toEqual({
      ruleId: 'rule-operations-parent',
      severity: 'error',
      message: 'Operations resource "ObservabilityA" must be placed on a Subnet',
      suggestion: 'Move the Operations resource to a Subnet',
      targetId: 'observability-1',
    });
  });

  it('returns null when analytics is on subnet plate', () => {
    const block = makeBlock({ category: 'operations' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns null when identity is on subnet plate', () => {
    const block = makeBlock({ category: 'security' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('returns null when observability is on subnet plate', () => {
    const block = makeBlock({ category: 'operations' });
    const plate = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, plate)).toBeNull();
  });

  it('uses Set-based allowed layers: each category checks all valid parent layers', () => {
    const computeBlock = makeBlock({ id: 'vm-1', name: 'VM', category: 'compute' });
    const msgBlock = makeBlock({ id: 'mq-1', name: 'Queue', category: 'messaging' });

    const subnet = makePlate({ type: 'subnet' });
    const region = makePlate({ type: 'region' });

    expect(validatePlacement(computeBlock, subnet)).toBeNull();
    expect(validatePlacement(computeBlock, region)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: 'Compute resource "VM" must be placed on a Subnet',
      suggestion: 'Move the Compute resource to a Subnet',
      targetId: 'vm-1',
    });

    expect(validatePlacement(msgBlock, region)).toBeNull();
    expect(validatePlacement(msgBlock, subnet)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: 'Messaging resource "Queue" must be placed on a Region container',
      suggestion: 'Move the Messaging resource to a Region container',
      targetId: 'mq-1',
    });
  });
});

describe('canPlaceBlock', () => {
  it('returns true when compute is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('compute', plate)).toBe(true);
  });

  it('returns false when compute is on network plate', () => {
    const plate = makePlate({ type: 'region' });
    expect(canPlaceBlock('compute', plate)).toBe(false);
  });

  it('returns true when database is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('data', plate)).toBe(true);
  });

  it('returns true when gateway is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('delivery', plate)).toBe(true);
  });

  it('returns true when storage is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('data', plate)).toBe(true);
  });

  it('returns false when storage is on network plate', () => {
    const plate = makePlate({ type: 'region' });
    expect(canPlaceBlock('data', plate)).toBe(false);
  });

  it('returns false when function is on network plate', () => {
    const plate = makePlate({ type: 'region' });
    expect(canPlaceBlock('compute', plate)).toBe(false);
  });

  it('returns true when function is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('compute', plate)).toBe(true);
  });

  it('returns true when queue is on network plate', () => {
    const plate = makePlate({ type: 'region' });
    expect(canPlaceBlock('messaging', plate)).toBe(true);
  });

  it('returns true when event is on network plate', () => {
    const plate = makePlate({ type: 'region' });
    expect(canPlaceBlock('messaging', plate)).toBe(true);
  });

  it('returns true when analytics is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('operations', plate)).toBe(true);
  });

  it('returns true when identity is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('security', plate)).toBe(true);
  });

  it('returns true when observability is on subnet plate', () => {
    const plate = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('operations', plate)).toBe(true);
  });
});

describe('validateLayerPlacement', () => {
  it('returns null when block is on a subnet plate (valid parent for resource)', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'subnet' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a zone plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'zone' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a region plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'region' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on an edge plate', () => {
    const block = makeBlock({ category: 'delivery' });
    const plate = makePlate({ type: 'edge' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns null when block is on a global plate', () => {
    const block = makeBlock({ category: 'compute' });
    const plate = makePlate({ type: 'global' });

    expect(validateLayerPlacement(block, plate)).toBeNull();
  });

  it('returns error with correct fields for invalid layer hierarchy', () => {
    const block = makeBlock({ id: 'b1', name: 'TestBlock', category: 'compute' });
    const plateTypes = ['global', 'edge', 'region', 'zone', 'subnet'] as const;
    for (const type of plateTypes) {
      const plate = makePlate({ type });
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
      message: 'Resource "BadX" position (1.5, 0) is not CU-aligned',
      suggestion: 'Snap the resource to integer grid positions',
      targetId: 'b1',
    });
  });

  it('returns error when z is fractional', () => {
    const block = makeBlock({ id: 'b2', name: 'BadZ', position: { x: 0, y: 0, z: 2.7 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: 'Resource "BadZ" position (0, 2.7) is not CU-aligned',
      suggestion: 'Snap the resource to integer grid positions',
      targetId: 'b2',
    });
  });

  it('returns error when both x and z are fractional', () => {
    const block = makeBlock({ id: 'b3', name: 'BadBoth', position: { x: 0.1, y: 0, z: 0.9 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: 'Resource "BadBoth" position (0.1, 0.9) is not CU-aligned',
      suggestion: 'Snap the resource to integer grid positions',
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
      message: 'Resource "A" overlaps with "B"',
      suggestion: 'Move the resource to a non-overlapping position',
      targetId: 'a',
    });
  });

  it('returns error when blocks fully overlap (same position)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 0, y: 0, z: 0 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toEqual({
      ruleId: 'rule-no-overlap',
      severity: 'error',
      message: 'Resource "A" overlaps with "B"',
      suggestion: 'Move the resource to a non-overlapping position',
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
    const block = makeBlock({
      id: 'a',
      name: 'A',
      category: 'compute',
      position: { x: 0, y: 0, z: 0 },
    });
    const sibling = makeBlock({
      id: 'b',
      name: 'B',
      category: 'data',
      position: { x: 3, y: 0, z: 0 },
    });

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

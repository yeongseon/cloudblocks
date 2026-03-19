import { describe, it, expect } from 'vitest';
import type { Block, Plate } from '../../shared/types/index';
import { validatePlacement, canPlaceBlock } from './placement';

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

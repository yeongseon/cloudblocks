import { describe, it, expect } from 'vitest';
import type { ResourceBlock, ContainerBlock } from '@cloudblocks/schema';
import {
  validatePlacement,
  canPlaceBlock,
  validateLayerPlacement,
  validateGridAlignment,
  validateNoOverlap,
} from './placement';

function makeBlock(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function makePlate(
  overrides: Partial<ContainerBlock> & { type?: ContainerBlock['layer'] } = {},
): ContainerBlock {
  const layer = overrides.type ?? overrides.layer ?? 'subnet';
  const normalizedLayer = layer === 'resource' ? 'subnet' : layer;
  const resourceType: ContainerBlock['resourceType'] =
    normalizedLayer === 'subnet' ? 'subnet' : 'virtual_network';
  return {
    id: 'container-1',
    name: 'ContainerBlock',
    kind: 'container',
    layer: normalizedLayer,
    resourceType,
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
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
  it('returns error when block is not placed on a container', () => {
    const block = makeBlock({ id: 'compute-1', name: 'Compute A', category: 'compute' });

    expect(validatePlacement(block, undefined)).toEqual({
      ruleId: 'rule-container-exists',
      severity: 'error',
      message: '"Compute A" needs a container \u2014 place it on a Subnet or Region container.',
      suggestion:
        'Most resources need a parent container to define their network scope. Drag this block onto a container on the canvas.',
      targetId: 'compute-1',
    });
  });

  it('returns error when compute is on non-subnet container', () => {
    const block = makeBlock({ id: 'compute-2', name: 'Compute B', category: 'compute' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: '"Compute B" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'compute-2',
    });
  });

  it('returns null when compute is on subnet container', () => {
    const block = makeBlock({ category: 'compute' });
    const subnet = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, subnet)).toBeNull();
  });

  it('returns error when database is on non-subnet container', () => {
    const block = makeBlock({ id: 'db-1', name: 'Database A', category: 'data' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-data-parent',
      severity: 'error',
      message: '"Database A" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'db-1',
    });
  });

  it('returns null when database is on subnet', () => {
    const block = makeBlock({ id: 'db-2', name: 'Database B', category: 'data' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns error when gateway is on non-subnet container', () => {
    const block = makeBlock({ id: 'gw-1', name: 'Gateway A', category: 'delivery' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-delivery-parent',
      severity: 'error',
      message: '"Gateway A" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'gw-1',
    });
  });

  it('returns null when gateway is on subnet container', () => {
    const block = makeBlock({ category: 'delivery' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns error when storage is on non-subnet container', () => {
    const block = makeBlock({ id: 'storage-1', name: 'Storage A', category: 'data' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-data-parent',
      severity: 'error',
      message: '"Storage A" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'storage-1',
    });
  });

  it('returns null when storage is on subnet container', () => {
    const block = makeBlock({ category: 'data' });
    const subnet = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, subnet)).toBeNull();
  });

  it('returns null when function is on subnet container', () => {
    const block = makeBlock({ id: 'fn-1', name: 'FuncA', category: 'compute' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns error when function is on network container', () => {
    const block = makeBlock({ category: 'compute' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: '"Block" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'block-1',
    });
  });

  it('returns error when queue is on subnet container', () => {
    const block = makeBlock({
      id: 'queue-1',
      name: 'QueueA',
      category: 'messaging',
      resourceType: 'message_queue',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: '"QueueA" is on the wrong container type \u2014 it needs a Region container.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'queue-1',
    });
  });

  it('returns null when queue is on network container', () => {
    const block = makeBlock({ category: 'messaging', resourceType: 'message_queue' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns error when event is on subnet container', () => {
    const block = makeBlock({
      id: 'event-1',
      name: 'EventA',
      category: 'messaging',
      resourceType: 'event_hub',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: '"EventA" is on the wrong container type \u2014 it needs a Region container.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'event-1',
    });
  });

  it('returns null when event is on network container', () => {
    const block = makeBlock({ category: 'messaging', resourceType: 'event_hub' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns error when analytics is on network container', () => {
    const block = makeBlock({ id: 'analytics-1', name: 'AnalyticsA', category: 'operations' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-operations-parent',
      severity: 'error',
      message: '"AnalyticsA" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'analytics-1',
    });
  });

  it('returns error when identity is on network container', () => {
    const block = makeBlock({ id: 'identity-1', name: 'IdentityA', category: 'security' });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-security-parent',
      severity: 'error',
      message: '"IdentityA" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'identity-1',
    });
  });

  it('returns error when observability is on network container', () => {
    const block = makeBlock({
      id: 'observability-1',
      name: 'ObservabilityA',
      category: 'operations',
    });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-operations-parent',
      severity: 'error',
      message: '"ObservabilityA" is on the wrong container type \u2014 it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'observability-1',
    });
  });

  it('returns null when analytics is on subnet container', () => {
    const block = makeBlock({ category: 'operations' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns null when identity is on subnet container', () => {
    const block = makeBlock({ category: 'security' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns null when observability is on subnet container', () => {
    const block = makeBlock({ category: 'operations' });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('uses Set-based allowed layers: each category checks all valid parent layers', () => {
    const computeBlock = makeBlock({ id: 'vm-1', name: 'VM', category: 'compute' });
    const msgBlock = makeBlock({
      id: 'mq-1',
      name: 'Queue',
      category: 'messaging',
      resourceType: 'message_queue',
    });

    const subnet = makePlate({ type: 'subnet' });
    const region = makePlate({ type: 'region' });

    expect(validatePlacement(computeBlock, subnet)).toBeNull();
    expect(validatePlacement(computeBlock, region)).toEqual({
      ruleId: 'rule-compute-parent',
      severity: 'error',
      message: '"VM" is on the wrong container type — it needs a Subnet.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'vm-1',
    });

    expect(validatePlacement(msgBlock, region)).toBeNull();
    expect(validatePlacement(msgBlock, subnet)).toEqual({
      ruleId: 'rule-messaging-parent',
      severity: 'error',
      message: '"Queue" is on the wrong container type — it needs a Region container.',
      suggestion:
        'Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.',
      targetId: 'mq-1',
    });
  });

  // ── Root-level placement (allowedParents includes null) ──

  it('returns null when root-allowed resource (dns_zone) has no parent', () => {
    const block = makeBlock({
      id: 'dns-1',
      name: 'DNS Zone',
      category: 'delivery',
      resourceType: 'dns_zone',
    });
    expect(validatePlacement(block, undefined)).toBeNull();
  });

  it('returns null when root-allowed resource (blob_storage) has no parent', () => {
    const block = makeBlock({
      id: 'blob-1',
      name: 'Blob Storage',
      category: 'data',
      resourceType: 'blob_storage',
    });
    expect(validatePlacement(block, undefined)).toBeNull();
  });

  it('returns null when root-allowed resource (public_ip) has no parent', () => {
    const block = makeBlock({
      id: 'pip-1',
      name: 'Public IP',
      category: 'network',
      resourceType: 'public_ip',
    });
    expect(validatePlacement(block, undefined)).toBeNull();
  });

  it('returns null when dual-placement resource (function_compute) has no parent', () => {
    const block = makeBlock({
      id: 'fn-root-1',
      name: 'Root Function',
      category: 'compute',
      resourceType: 'function_compute',
    });
    expect(validatePlacement(block, undefined)).toBeNull();
  });

  it('returns error when subnet-only resource (virtual_machine) has no parent', () => {
    const block = makeBlock({
      id: 'vm-1',
      name: 'VM',
      category: 'compute',
      resourceType: 'virtual_machine',
    });
    expect(validatePlacement(block, undefined)).toEqual({
      ruleId: 'rule-container-exists',
      severity: 'error',
      message: '"VM" needs a container — place it on a Subnet or Region container.',
      suggestion:
        'Most resources need a parent container to define their network scope. Drag this block onto a container on the canvas.',
      targetId: 'vm-1',
    });
  });

  it('returns error when subnet-only resource (sql_database) has no parent', () => {
    const block = makeBlock({
      id: 'sql-1',
      name: 'SQL DB',
      category: 'data',
      resourceType: 'sql_database',
    });
    expect(validatePlacement(block, undefined)).toEqual({
      ruleId: 'rule-container-exists',
      severity: 'error',
      message: '"SQL DB" needs a container — place it on a Subnet or Region container.',
      suggestion:
        'Most resources need a parent container to define their network scope. Drag this block onto a container on the canvas.',
      targetId: 'sql-1',
    });
  });

  // ── Regression: root-only resource types must be rejected in containers ──
  // These types have allowedParents: [null] — they should NOT be valid inside a subnet/region.

  it('returns error when root-only dns_zone is placed on subnet container', () => {
    const block = makeBlock({
      id: 'dns-1',
      name: 'DNS Zone',
      category: 'delivery',
      resourceType: 'dns_zone',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-delivery-parent',
      severity: 'error',
      message: expect.stringContaining('wrong container type'),
      suggestion: expect.stringContaining('Move this block'),
      targetId: 'dns-1',
    });
  });

  it('returns error when root-only public_ip is placed on subnet container', () => {
    const block = makeBlock({
      id: 'pip-1',
      name: 'Public IP',
      category: 'network',
      resourceType: 'public_ip',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-network-parent',
      severity: 'error',
      message: expect.stringContaining('wrong container type'),
      suggestion: expect.stringContaining('Move this block'),
      targetId: 'pip-1',
    });
  });

  it('returns error when root-only blob_storage is placed on subnet container', () => {
    const block = makeBlock({
      id: 'blob-1',
      name: 'Blob Storage',
      category: 'data',
      resourceType: 'blob_storage',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-data-parent',
      severity: 'error',
      message: expect.stringContaining('wrong container type'),
      suggestion: expect.stringContaining('Move this block'),
      targetId: 'blob-1',
    });
  });

  it('returns error when root-only managed_identity is placed on subnet container', () => {
    const block = makeBlock({
      id: 'mi-1',
      name: 'Managed Identity',
      category: 'identity',
      resourceType: 'managed_identity',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-identity-parent',
      severity: 'error',
      message: expect.stringContaining('wrong container type'),
      suggestion: expect.stringContaining('Move this block'),
      targetId: 'mi-1',
    });
  });

  it('returns error when root-only service_account is placed on region container', () => {
    const block = makeBlock({
      id: 'sa-1',
      name: 'Service Account',
      category: 'identity',
      resourceType: 'service_account',
    });
    const container = makePlate({ type: 'region' });

    expect(validatePlacement(block, container)).toEqual({
      ruleId: 'rule-identity-parent',
      severity: 'error',
      message: expect.stringContaining('wrong container type'),
      suggestion: expect.stringContaining('Move this block'),
      targetId: 'sa-1',
    });
  });

  // ── Positive control: dual-placement types are valid in containers ──

  it('returns null when dual-placement identity_access is on subnet container', () => {
    const block = makeBlock({
      id: 'iam-1',
      name: 'IAM',
      category: 'identity',
      resourceType: 'identity_access',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });

  it('returns null when dual-placement function_compute is on subnet container', () => {
    const block = makeBlock({
      id: 'fn-dual-1',
      name: 'Function',
      category: 'compute',
      resourceType: 'function_compute',
    });
    const container = makePlate({ type: 'subnet' });

    expect(validatePlacement(block, container)).toBeNull();
  });
});

describe('canPlaceBlock', () => {
  it('returns true when compute is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('compute', container)).toBe(true);
  });

  it('returns false when compute is on network container', () => {
    const container = makePlate({ type: 'region' });
    expect(canPlaceBlock('compute', container)).toBe(false);
  });

  it('returns true when database is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('data', container)).toBe(true);
  });

  it('returns true when gateway is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('delivery', container)).toBe(true);
  });

  it('returns true when storage is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('data', container)).toBe(true);
  });

  it('returns false when storage is on network container', () => {
    const container = makePlate({ type: 'region' });
    expect(canPlaceBlock('data', container)).toBe(false);
  });

  it('returns false when function is on network container', () => {
    const container = makePlate({ type: 'region' });
    expect(canPlaceBlock('compute', container)).toBe(false);
  });

  it('returns true when function is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('compute', container)).toBe(true);
  });

  it('returns true when queue is on network container', () => {
    const container = makePlate({ type: 'region' });
    expect(canPlaceBlock('messaging', container)).toBe(true);
  });

  it('returns true when event is on network container', () => {
    const container = makePlate({ type: 'region' });
    expect(canPlaceBlock('messaging', container)).toBe(true);
  });

  it('returns true when analytics is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('operations', container)).toBe(true);
  });

  it('returns true when identity is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('security', container)).toBe(true);
  });

  it('returns true when observability is on subnet container', () => {
    const container = makePlate({ type: 'subnet' });
    expect(canPlaceBlock('operations', container)).toBe(true);
  });
});

// ── Root-level placement via canPlaceBlock ──

it('returns true for root-allowed resource type with null container', () => {
  expect(canPlaceBlock('delivery', null, 'dns_zone')).toBe(true);
  expect(canPlaceBlock('delivery', null, 'cdn_profile')).toBe(true);
  expect(canPlaceBlock('delivery', null, 'front_door')).toBe(true);
  expect(canPlaceBlock('data', null, 'blob_storage')).toBe(true);
  expect(canPlaceBlock('network', null, 'public_ip')).toBe(true);
  expect(canPlaceBlock('identity', null, 'managed_identity')).toBe(true);
  expect(canPlaceBlock('identity', null, 'service_account')).toBe(true);
});

it('returns true for dual-placement resource type with null container', () => {
  expect(canPlaceBlock('compute', null, 'function_compute')).toBe(true);
  expect(canPlaceBlock('compute', null, 'app_service')).toBe(true);
  expect(canPlaceBlock('compute', null, 'container_instances')).toBe(true);
  expect(canPlaceBlock('data', null, 'cosmos_db')).toBe(true);
  expect(canPlaceBlock('security', null, 'key_vault')).toBe(true);
  expect(canPlaceBlock('identity', null, 'identity_access')).toBe(true);
});

it('returns false for subnet-only resource type with null container', () => {
  expect(canPlaceBlock('compute', null, 'virtual_machine')).toBe(false);
  expect(canPlaceBlock('compute', null, 'kubernetes_cluster')).toBe(false);
  expect(canPlaceBlock('data', null, 'sql_database')).toBe(false);
  expect(canPlaceBlock('data', null, 'cache_store')).toBe(false);
  expect(canPlaceBlock('security', null, 'bastion_host')).toBe(false);
  expect(canPlaceBlock('operations', null, 'monitoring')).toBe(false);
});

it('returns false when category alone (no resourceType) is not root-allowed', () => {
  // When resourceType is not provided, it uses the category representative type
  // e.g. 'compute' → 'web_compute', which is not in ROOT_ALLOWED_RESOURCE_TYPES
  expect(canPlaceBlock('compute', null)).toBe(false);
  expect(canPlaceBlock('data', null)).toBe(false);
  expect(canPlaceBlock('security', null)).toBe(false);
});

describe('validateLayerPlacement', () => {
  it('returns null when block is on a subnet container (valid parent for resource)', () => {
    const block = makeBlock({ category: 'compute' });
    const container = makePlate({ type: 'subnet' });

    expect(validateLayerPlacement(block, container)).toBeNull();
  });

  it('returns null when block is on a zone container', () => {
    const block = makeBlock({ category: 'compute' });
    const container = makePlate({ type: 'zone' });

    expect(validateLayerPlacement(block, container)).toBeNull();
  });

  it('returns null when block is on a region container', () => {
    const block = makeBlock({ category: 'compute' });
    const container = makePlate({ type: 'region' });

    expect(validateLayerPlacement(block, container)).toBeNull();
  });

  it('returns null when block is on an edge container', () => {
    const block = makeBlock({ category: 'delivery' });
    const container = makePlate({ type: 'edge' });

    expect(validateLayerPlacement(block, container)).toBeNull();
  });

  it('returns null when block is on a global container', () => {
    const block = makeBlock({ category: 'compute' });
    const container = makePlate({ type: 'global' });

    expect(validateLayerPlacement(block, container)).toBeNull();
  });

  it('returns error with correct fields for invalid layer hierarchy', () => {
    const block = makeBlock({ id: 'b1', name: 'TestBlock', category: 'compute' });
    const containerLayers = ['global', 'edge', 'region', 'zone', 'subnet'] as const;
    for (const type of containerLayers) {
      const container = makePlate({ type });
      expect(validateLayerPlacement(block, container)).toBeNull();
    }
  });

  it('returns error when container layer is not a valid parent for resources', () => {
    const block = makeBlock({ id: 'b-invalid', name: 'InvalidLayerBlock', category: 'compute' });
    const invalidContainer = {
      ...makePlate({ type: 'subnet' }),
      layer: 'resource' as ContainerBlock['layer'],
    };

    expect(validateLayerPlacement(block, invalidContainer)).toEqual({
      ruleId: 'rule-layer-hierarchy',
      severity: 'error',
      message: '"InvalidLayerBlock" can\'t go inside a "resource" container.',
      suggestion:
        'Resources can be placed on: subnet, zone, region, edge, global. This hierarchy mirrors how cloud providers organize infrastructure layers.',
      targetId: 'b-invalid',
    });
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
      message: '"BadX" is off the grid.',
      suggestion:
        'Snap it to a grid position. All blocks align to a uniform grid to keep architectures tidy and readable.',
      targetId: 'b1',
    });
  });

  it('returns error when z is fractional', () => {
    const block = makeBlock({ id: 'b2', name: 'BadZ', position: { x: 0, y: 0, z: 2.7 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: '"BadZ" is off the grid.',
      suggestion:
        'Snap it to a grid position. All blocks align to a uniform grid to keep architectures tidy and readable.',
      targetId: 'b2',
    });
  });

  it('returns error when both x and z are fractional', () => {
    const block = makeBlock({ id: 'b3', name: 'BadBoth', position: { x: 0.1, y: 0, z: 0.9 } });

    expect(validateGridAlignment(block)).toEqual({
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: '"BadBoth" is off the grid.',
      suggestion:
        'Snap it to a grid position. All blocks align to a uniform grid to keep architectures tidy and readable.',
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
      message: '"A" overlaps with "B".',
      suggestion:
        "Move one of them so they don't overlap. Each resource needs its own space on the container.",
      targetId: 'a',
    });
  });

  it('returns error when blocks fully overlap (same position)', () => {
    const block = makeBlock({ id: 'a', name: 'A', position: { x: 0, y: 0, z: 0 } });
    const sibling = makeBlock({ id: 'b', name: 'B', position: { x: 0, y: 0, z: 0 } });

    expect(validateNoOverlap(block, [sibling], getSize)).toEqual({
      ruleId: 'rule-no-overlap',
      severity: 'error',
      message: '"A" overlaps with "B".',
      suggestion:
        "Move one of them so they don't overlap. Each resource needs its own space on the container.",
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

import { beforeEach, describe, expect, it } from 'vitest';
import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { generateEndpointsForBlock, requiresDedicatedSubnet } from '@cloudblocks/schema';
import { validateDedicatedSubnets } from './dedicatedSubnet';
import { validateArchitecture } from './engine';
import { useArchitectureStore } from '../store/architectureStore';
import { RESOURCE_DEFINITIONS, type ResourceType } from '../../shared/hooks/useTechTree';

/**
 * #1928, first slice — Application Gateway, Bastion and Firewall cannot share a
 * subnet. Azure refuses the deployment outright, so this is not a tidiness rule.
 */

function container(overrides: Partial<ContainerBlock> = {}): ContainerBlock {
  return {
    id: 'subnet-1',
    name: 'Subnet',
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function resource(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId: 'subnet-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function model(nodes: Array<ContainerBlock | ResourceBlock>): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes,
    endpoints: nodes.flatMap((node) => generateEndpointsForBlock(node.id)),
    connections: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const DEDICATED: Array<[string, string]> = [
  ['application_gateway', 'delivery'],
  ['bastion_host', 'security'],
  ['firewall_security', 'security'],
];

describe('validateDedicatedSubnets', () => {
  it.each(DEDICATED)('accepts %s alone in its subnet', (resourceType, category) => {
    const architecture = model([
      container(),
      resource({ id: 'gw', resourceType, category: category as ResourceBlock['category'] }),
    ]);

    expect(validateDedicatedSubnets(architecture)).toEqual([]);
  });

  it.each(DEDICATED)('rejects %s sharing its subnet', (resourceType, category) => {
    const architecture = model([
      container(),
      resource({ id: 'gw', resourceType, category: category as ResourceBlock['category'] }),
      resource({ id: 'vm', name: 'Virtual Machine' }),
    ]);

    const errors = validateDedicatedSubnets(architecture);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ ruleId: 'rule-dedicated-subnet', targetId: 'gw' });
    expect(errors[0].message).toContain('Virtual Machine');
  });

  it('names every co-tenant so the user knows what to move', () => {
    const architecture = model([
      container(),
      resource({ id: 'gw', resourceType: 'application_gateway', category: 'delivery' }),
      resource({ id: 'vm-a', name: 'VM A' }),
      resource({ id: 'vm-b', name: 'VM B' }),
    ]);

    const [error] = validateDedicatedSubnets(architecture);

    expect(error.message).toContain('"VM A"');
    expect(error.message).toContain('"VM B"');
  });

  it('reports each exclusive resource separately when two share one subnet', () => {
    const architecture = model([
      container(),
      resource({ id: 'gw', resourceType: 'application_gateway', category: 'delivery' }),
      resource({ id: 'fw', resourceType: 'firewall_security', category: 'security' }),
    ]);

    expect(
      validateDedicatedSubnets(architecture)
        .map((error) => error.targetId)
        .sort(),
    ).toEqual(['fw', 'gw']);
  });

  it('leaves resources without the constraint alone', () => {
    const architecture = model([
      container(),
      resource({ id: 'vm-a', name: 'VM A' }),
      resource({ id: 'vm-b', name: 'VM B' }),
    ]);

    expect(validateDedicatedSubnets(architecture)).toEqual([]);
  });

  it('ignores a root-level exclusive resource that has no subnet at all', () => {
    const architecture = model([
      resource({
        id: 'gw',
        resourceType: 'application_gateway',
        category: 'delivery',
        parentId: null,
      }),
      resource({ id: 'vm', parentId: null }),
    ]);

    expect(validateDedicatedSubnets(architecture)).toEqual([]);
  });

  it('surfaces through validateArchitecture as a blocking error', () => {
    const architecture = model([
      container(),
      resource({ id: 'gw', resourceType: 'application_gateway', category: 'delivery' }),
      resource({ id: 'vm', name: 'Virtual Machine', position: { x: 4, y: 0, z: 0 } }),
    ]);

    const result = validateArchitecture(architecture);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.ruleId)).toContain('rule-dedicated-subnet');
  });
});

describe('the palette never offers a subnet it would then reject', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
  });

  function seed(): { vnetId: string; subnetId: string } {
    const store = useArchitectureStore.getState();
    store.addNode({
      kind: 'container',
      resourceType: 'virtual_network',
      name: 'VNet',
      parentId: null,
      layer: 'region',
    });
    const vnetId = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find(
        (node) => node.kind === 'container' && node.layer === 'region',
      )!.id;

    useArchitectureStore.getState().addNode({
      kind: 'container',
      resourceType: 'subnet',
      name: 'Subnet',
      parentId: vnetId,
      layer: 'subnet',
    });
    const subnetId = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find(
        (node) => node.kind === 'container' && node.layer === 'subnet',
      )!.id;

    return { vnetId, subnetId };
  }

  function create(type: ResourceType, parentId: string): void {
    const definition = RESOURCE_DEFINITIONS[type];
    useArchitectureStore.getState().addNode({
      kind: 'resource',
      resourceType: definition.schemaResourceType,
      name: definition.label,
      parentId,
      provider: 'azure',
      subtype: definition.azureSubtype,
    });
  }

  it('covers the three palette resources that claim a subnet exclusively', () => {
    const exclusive = (Object.keys(RESOURCE_DEFINITIONS) as ResourceType[]).filter((type) =>
      requiresDedicatedSubnet(RESOURCE_DEFINITIONS[type].schemaResourceType),
    );

    expect(exclusive.sort()).toEqual(['app-gateway', 'bastion', 'firewall']);
  });

  it('validates cleanly when each exclusive resource gets its own subnet', () => {
    const { vnetId, subnetId } = seed();

    create('vm', subnetId);

    for (const type of ['app-gateway', 'bastion', 'firewall'] as ResourceType[]) {
      useArchitectureStore.getState().addNode({
        kind: 'container',
        resourceType: 'subnet',
        name: `Subnet ${type}`,
        parentId: vnetId,
        layer: 'subnet',
      });
      const own = useArchitectureStore
        .getState()
        .workspace.architecture.nodes.filter(
          (node) => node.kind === 'container' && node.layer === 'subnet',
        )
        .at(-1)!.id;

      create(type, own);
    }

    const result = validateArchitecture(useArchitectureStore.getState().workspace.architecture);

    expect(result.errors.filter((error) => error.ruleId === 'rule-dedicated-subnet')).toEqual([]);
  });
});

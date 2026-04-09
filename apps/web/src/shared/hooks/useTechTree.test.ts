import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ArchitectureModel, ContainerBlock, ResourceCategory } from '@cloudblocks/schema';
import { makeTestBlock, makeTestPlate } from '../../__tests__/legacyModelTestUtils';
import {
  ACTION_DEFINITIONS,
  ACTION_GRID,
  ALL_RESOURCES,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  getCreationGroupId,
  getCreationGroupMeta,
  useTechTree,
} from './useTechTree';
import type {
  ActionDefinition,
  ActionType,
  ResourceDefinition,
  ResourceType,
  TechTreeState,
} from './useTechTree';

const BASE_ARCHITECTURE: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const NETWORK_PLATE: ContainerBlock = makeTestPlate({
  id: 'net-1',
  name: 'VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
});

const SUBNET_PLATE: ContainerBlock = makeTestPlate({
  id: 'sub-1',
  name: 'Subnet',
  type: 'subnet',
  parentId: 'net-1',
  children: [],
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
});

function buildArchitecture(plates: ContainerBlock[], blockCount = 0): ArchitectureModel {
  const blockCategories: ResourceCategory[] = [
    'compute',
    'data',
    'data',
    'delivery',
    'compute',
    'messaging',
    'messaging',
    'operations',
    'security',
    'operations',
  ];

  const resourceTypeByCategory: Record<ResourceCategory, string> = {
    network: 'virtual_network',
    security: 'firewall_security',
    delivery: 'load_balancer',
    compute: 'web_compute',
    data: 'relational_database',
    messaging: 'message_queue',
    operations: 'monitoring',
    identity: 'managed_identity',
  };

  const blocks = Array.from({ length: blockCount }, (_, index) =>
    makeTestBlock({
      id: `block-${index + 1}`,
      name: `Block ${index + 1}`,
      category: blockCategories[index % blockCategories.length],
      resourceType: resourceTypeByCategory[blockCategories[index % blockCategories.length]],
      placementId: plates[0]?.id ?? 'net-1',
      position: { x: index, y: 0, z: index },
      metadata: {},
    }),
  );

  return {
    ...BASE_ARCHITECTURE,
    nodes: [...plates, ...blocks],
  };
}

describe('useTechTree constants', () => {
  it('defines all resource entries with correct fields', () => {
    const expectedResources: Record<
      string,
      Pick<
        ResourceDefinition,
        | 'id'
        | 'schemaResourceType'
        | 'azureSubtype'
        | 'label'
        | 'shortLabel'
        | 'icon'
        | 'category'
        | 'blockCategory'
      >
    > = {
      network: {
        id: 'network',
        schemaResourceType: 'virtual_network',
        azureSubtype: 'vnet',
        label: 'Azure Virtual Network',
        shortLabel: 'VNet',
        icon: '🌐',
        category: 'foundation',
        blockCategory: 'network',
      },
      subnet: {
        id: 'subnet',
        schemaResourceType: 'subnet',
        azureSubtype: 'subnet',
        label: 'Subnet',
        shortLabel: 'Subnet',
        icon: '🔲',
        category: 'foundation',
        blockCategory: 'network',
      },
      storage: {
        id: 'storage',
        schemaResourceType: 'blob_storage',
        label: 'Storage Account',
        shortLabel: 'Storage',
        icon: '📦',
        category: 'always',
        blockCategory: 'data',
      },
      dns: {
        id: 'dns',
        schemaResourceType: 'dns_zone',
        label: 'Azure DNS',
        shortLabel: 'DNS',
        icon: '🌐',
        category: 'always',
        blockCategory: 'delivery',
      },
      cdn: {
        id: 'cdn',
        schemaResourceType: 'cdn_profile',
        label: 'Azure CDN',
        shortLabel: 'CDN',
        icon: '⚡',
        category: 'always',
        blockCategory: 'delivery',
      },
      'front-door': {
        id: 'front-door',
        schemaResourceType: 'front_door',
        label: 'Azure Front Door',
        shortLabel: 'Front Door',
        icon: '🚪',
        category: 'always',
        blockCategory: 'delivery',
      },
      sql: {
        id: 'sql',
        schemaResourceType: 'sql_database',
        label: 'Azure SQL Database',
        shortLabel: 'SQL',
        icon: '🗄️',
        category: 'vnet-optional',
        blockCategory: 'data',
      },
      function: {
        id: 'function',
        schemaResourceType: 'function_compute',
        label: 'Azure Functions',
        shortLabel: 'Functions',
        icon: '⚡',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      queue: {
        id: 'queue',
        schemaResourceType: 'message_queue',
        label: 'Azure Service Bus',
        shortLabel: 'Service Bus',
        icon: '📨',
        category: 'vnet-optional',
        blockCategory: 'messaging',
      },
      event: {
        id: 'event',
        schemaResourceType: 'event_hub',
        label: 'Azure Event Hubs',
        shortLabel: 'Event Hubs',
        icon: '🔔',
        category: 'vnet-optional',
        blockCategory: 'messaging',
      },
      monitor: {
        id: 'monitor',
        schemaResourceType: 'monitoring',
        label: 'Azure Monitor',
        shortLabel: 'Monitor',
        icon: '🔧',
        category: 'vnet-required',
        blockCategory: 'operations',
      },
      'app-service': {
        id: 'app-service',
        schemaResourceType: 'app_service',
        label: 'Azure App Service',
        shortLabel: 'App Service',
        icon: '🌐',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      'container-instances': {
        id: 'container-instances',
        schemaResourceType: 'container_instances',
        label: 'Azure Container Instances',
        shortLabel: 'ACI',
        icon: '📦',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      'cosmos-db': {
        id: 'cosmos-db',
        schemaResourceType: 'cosmos_db',
        label: 'Azure Cosmos DB',
        shortLabel: 'Cosmos DB',
        icon: '🌍',
        category: 'vnet-optional',
        blockCategory: 'data',
      },
      redis: {
        id: 'redis',
        schemaResourceType: 'cache_store',
        label: 'Azure Cache for Redis',
        shortLabel: 'Redis',
        icon: '⚡',
        category: 'vnet-optional',
        blockCategory: 'data',
      },
      'key-vault': {
        id: 'key-vault',
        schemaResourceType: 'key_vault',
        label: 'Azure Key Vault',
        shortLabel: 'Key Vault',
        icon: '🔐',
        category: 'vnet-optional',
        blockCategory: 'security',
      },
      'managed-identity': {
        id: 'managed-identity',
        schemaResourceType: 'managed_identity',
        label: 'Managed Identity',
        shortLabel: 'Managed Identity',
        icon: '🪪',
        category: 'vnet-optional',
        blockCategory: 'identity',
      },
      vm: {
        id: 'vm',
        schemaResourceType: 'virtual_machine',
        label: 'Virtual Machine',
        shortLabel: 'VM',
        icon: '🖥️',
        category: 'vnet-required',
        blockCategory: 'compute',
      },
      aks: {
        id: 'aks',
        schemaResourceType: 'kubernetes_cluster',
        label: 'Azure Kubernetes Service',
        shortLabel: 'AKS',
        icon: '☸️',
        category: 'vnet-required',
        blockCategory: 'compute',
      },
      'internal-lb': {
        id: 'internal-lb',
        schemaResourceType: 'internal_load_balancer',
        label: 'Internal Load Balancer',
        shortLabel: 'ILB',
        icon: '⚖️',
        category: 'vnet-required',
        blockCategory: 'delivery',
      },
      firewall: {
        id: 'firewall',
        schemaResourceType: 'firewall_security',
        label: 'Azure Firewall',
        shortLabel: 'Firewall',
        icon: '🛡️',
        category: 'vnet-required',
        blockCategory: 'security',
      },
      nsg: {
        id: 'nsg',
        schemaResourceType: 'network_security_group',
        label: 'Network Security Group',
        shortLabel: 'NSG',
        icon: '🔒',
        category: 'vnet-required',
        blockCategory: 'security',
      },
      bastion: {
        id: 'bastion',
        schemaResourceType: 'bastion_host',
        label: 'Azure Bastion',
        shortLabel: 'Bastion',
        icon: '🏰',
        category: 'vnet-required',
        blockCategory: 'security',
      },
      'nat-gateway': {
        id: 'nat-gateway',
        schemaResourceType: 'nat_gateway',
        label: 'Azure NAT Gateway',
        shortLabel: 'NAT GW',
        icon: '🚪',
        category: 'vnet-required',
        blockCategory: 'network',
      },
      'public-ip': {
        id: 'public-ip',
        schemaResourceType: 'public_ip',
        label: 'Public IP',
        shortLabel: 'PIP',
        icon: '🌐',
        category: 'always',
        blockCategory: 'network',
      },
      'route-table': {
        id: 'route-table',
        schemaResourceType: 'route_table',
        label: 'Route Table',
        shortLabel: 'Route Table',
        icon: '🔀',
        category: 'vnet-required',
        blockCategory: 'network',
      },
      'private-endpoint': {
        id: 'private-endpoint',
        schemaResourceType: 'private_endpoint',
        label: 'Private Endpoint',
        shortLabel: 'PE',
        icon: '🔒',
        category: 'vnet-required',
        blockCategory: 'network',
      },
      'app-gateway': {
        id: 'app-gateway',
        schemaResourceType: 'application_gateway',
        label: 'Azure Application Gateway',
        shortLabel: 'AGW',
        icon: '🚪',
        category: 'vnet-required',
        blockCategory: 'delivery',
      },
    };

    const resourceTypes = [
      'network',
      'subnet',
      'storage',
      'dns',
      'cdn',
      'front-door',
      'sql',
      'function',
      'queue',
      'event',
      'monitor',
      'app-service',
      'container-instances',
      'cosmos-db',
      'redis',
      'key-vault',
      'vm',
      'aks',
      'internal-lb',
      'firewall',
      'nsg',
      'bastion',
      'nat-gateway',
      'public-ip',
      'route-table',
      'private-endpoint',
      'app-gateway',
      'managed-identity',
    ];
    expect(resourceTypes).toHaveLength(28);

    for (const resourceType of resourceTypes) {
      const actual = RESOURCE_DEFINITIONS[resourceType as ResourceType];
      const expected = expectedResources[resourceType];
      expect(actual).toMatchObject(expected);
    }
  });

  it('defines all action entries with expected metadata', () => {
    const expectedActions: Record<
      ActionType,
      Pick<ActionDefinition, 'id' | 'label' | 'icon'> & { hotkey?: string }
    > = {
      link: { id: 'link', label: 'Link', icon: '🔗', hotkey: 'L' },
      edit: { id: 'edit', label: 'Edit', icon: '✏️', hotkey: 'E' },
      delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'Del' },
      copy: { id: 'copy', label: 'Copy', icon: '📋', hotkey: 'C' },
      rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'R' },
    };

    const actionTypes: ActionType[] = ['link', 'edit', 'delete', 'copy', 'rename'];
    expect(actionTypes).toHaveLength(5);

    for (const actionType of actionTypes) {
      const actual = ACTION_DEFINITIONS[actionType];
      const expected = expectedActions[actionType];
      expect(actual).toMatchObject(expected);
    }
  });

  it('defines a 3x3 action grid layout', () => {
    expect(ACTION_GRID).toHaveLength(3);
    for (const row of ACTION_GRID) {
      expect(row).toHaveLength(3);
    }
    expect(ACTION_GRID).toEqual([
      ['link', 'edit', 'copy'],
      ['rename', null, 'delete'],
      [null, null, null],
    ]);
  });

  it('assigns a valid tier to every resource definition', () => {
    const validTiers = ['starter', 'advanced'];
    for (const type of ALL_RESOURCES) {
      const def = RESOURCE_DEFINITIONS[type];
      expect(validTiers).toContain(def.tier);
    }
  });

  it('has exactly 13 starter and 15 advanced resources', () => {
    const starter = ALL_RESOURCES.filter((t) => RESOURCE_DEFINITIONS[t].tier === 'starter');
    const advanced = ALL_RESOURCES.filter((t) => RESOURCE_DEFINITIONS[t].tier === 'advanced');
    expect(starter).toHaveLength(13);
    expect(advanced).toHaveLength(15);
  });
});

describe('useTechTree hook', () => {
  it('returns expected state when no plates exist', () => {
    const { result } = renderHook(() => useTechTree(buildArchitecture([], 0)));
    const techTreeState: TechTreeState = result.current;

    expect(techTreeState.hasVNet).toBe(false);
    expect(techTreeState.hasSubnet).toBe(false);
    expect(techTreeState.blockCount).toBe(0);
    expect(techTreeState.plateCount).toBe(0);
  });

  it('enables network always, and gates subnet/vm/storage on vnet availability', () => {
    const { result: emptyResult } = renderHook(() => useTechTree(buildArchitecture([], 0)));

    expect(emptyResult.current.isEnabled('network')).toBe(true);
    expect(emptyResult.current.isEnabled('subnet')).toBe(false);
    expect(emptyResult.current.isEnabled('vm')).toBe(false);
    expect(emptyResult.current.isEnabled('storage')).toBe(false);

    const { result: vnetResult } = renderHook(() =>
      useTechTree(buildArchitecture([NETWORK_PLATE], 2)),
    );

    expect(vnetResult.current.hasVNet).toBe(true);
    expect(vnetResult.current.hasSubnet).toBe(false);
    expect(vnetResult.current.blockCount).toBe(2);
    expect(vnetResult.current.plateCount).toBe(1);
    expect(vnetResult.current.isEnabled('subnet')).toBe(true);
    expect(vnetResult.current.isEnabled('vm')).toBe(true);
    expect(vnetResult.current.isEnabled('storage')).toBe(true);
  });

  it('returns null disabled reason for enabled resources and custom reason for disabled ones', () => {
    const { result: emptyResult } = renderHook(() => useTechTree(buildArchitecture([], 0)));

    expect(emptyResult.current.getDisabledReason('vm')).toBe(
      'Create a Network first. Virtual Machines need a network to connect to.',
    );

    const { result: enabledResult } = renderHook(() =>
      useTechTree(buildArchitecture([NETWORK_PLATE], 0)),
    );

    expect(enabledResult.current.getDisabledReason('vm')).toBeNull();
    expect(enabledResult.current.getDisabledReason('network')).toBeNull();
  });

  it('falls back to default disabled paths for unexpected resource categories', () => {
    const originalNetwork = RESOURCE_DEFINITIONS.network;
    const mutatedNetwork = {
      ...originalNetwork,
      category: 'unexpected-category',
      disabledReason: undefined,
    };

    Reflect.set(RESOURCE_DEFINITIONS, 'network', mutatedNetwork);

    try {
      const { result } = renderHook(() => useTechTree(buildArchitecture([], 0)));

      expect(result.current.isEnabled('network')).toBe(false);
      expect(result.current.getDisabledReason('network')).toBe(
        'This resource is not available yet.',
      );
    } finally {
      Reflect.set(RESOURCE_DEFINITIONS, 'network', originalNetwork);
    }
  });

  it('returns all creation resources from RESOURCE_DEFINITIONS', () => {
    const { result } = renderHook(() => useTechTree(buildArchitecture([], 0)));

    const expectedResourceTypes = ALL_RESOURCES;
    const creationResources = result.current.getCreationResources();
    const actualTypes = creationResources.map((entry) => entry.resource.id);

    expect(creationResources).toHaveLength(expectedResourceTypes.length);
    expect(actualTypes).toEqual(expectedResourceTypes);

    for (const entry of creationResources) {
      expect(entry.resource).toBe(RESOURCE_DEFINITIONS[entry.resource.id]);
      expect(entry.enabled).toBe(result.current.isEnabled(entry.resource.id));
      expect(entry.disabledReason).toBe(result.current.getDisabledReason(entry.resource.id));
    }
  });

  it('selects target container for vm: subnet first, then network, otherwise null', () => {
    const { result: emptyResult } = renderHook(() => useTechTree(buildArchitecture([], 0)));
    expect(emptyResult.current.getTargetPlateId('vm')).toBeNull();

    const { result: networkOnlyResult } = renderHook(() =>
      useTechTree(buildArchitecture([NETWORK_PLATE], 0)),
    );
    expect(networkOnlyResult.current.getTargetPlateId('vm')).toBe('net-1');

    const { result: withSubnetResult } = renderHook(() =>
      useTechTree(buildArchitecture([NETWORK_PLATE, SUBNET_PLATE], 0)),
    );
    expect(withSubnetResult.current.getTargetPlateId('vm')).toBe('sub-1');
  });

  it('selects network container for non-vnet-required resources like storage', () => {
    const { result } = renderHook(() => useTechTree(buildArchitecture([NETWORK_PLATE], 0)));

    expect(result.current.getTargetPlateId('storage')).toBe('net-1');
  });

  it('returns null target container for non-vnet-required resources when no network exists', () => {
    const { result } = renderHook(() => useTechTree(buildArchitecture([], 0)));

    expect(result.current.getTargetPlateId('storage')).toBeNull();
  });
});

describe('getCreationGroupId', () => {
  it('maps dns to delivery group', () => {
    expect(getCreationGroupId('dns')).toBe('delivery');
  });

  it('maps vm to compute group', () => {
    expect(getCreationGroupId('vm')).toBe('compute');
  });

  it('maps storage to data group', () => {
    expect(getCreationGroupId('storage')).toBe('data');
  });

  it('maps firewall to security group', () => {
    expect(getCreationGroupId('firewall')).toBe('security');
  });

  it('maps network to network group', () => {
    expect(getCreationGroupId('network')).toBe('network');
  });

  it('maps subnet to network group', () => {
    expect(getCreationGroupId('subnet')).toBe('network');
  });

  it('maps queue to messaging group', () => {
    expect(getCreationGroupId('queue')).toBe('messaging');
  });

  it('maps managed-identity to identity group', () => {
    expect(getCreationGroupId('managed-identity')).toBe('identity');
  });

  it('maps monitor to operations group', () => {
    expect(getCreationGroupId('monitor')).toBe('operations');
  });
});

describe('provider-aware resource labels', () => {
  it('returns provider-specific labels when defined', () => {
    expect(getResourceLabel('vm', 'aws')).toBe('EC2');
    expect(getResourceShortLabel('vm', 'aws')).toBe('EC2');
  });

  it('falls back to default labels when a provider override is missing', () => {
    expect(getResourceLabel('subnet', 'gcp')).toBe('Subnet');
    expect(getResourceShortLabel('subnet', 'gcp')).toBe('Subnet');
  });
});

describe('getCreationGroupMeta', () => {
  it('returns metadata for each creation group', () => {
    const meta = getCreationGroupMeta('compute');
    expect(meta).toEqual({
      icon: '🖥️',
      label: 'Compute',
      color: 'var(--cat-compute)',
    });
  });

  it('returns metadata for network group', () => {
    const meta = getCreationGroupMeta('network');
    expect(meta).toHaveProperty('icon');
    expect(meta).toHaveProperty('label', 'Network');
    expect(meta).toHaveProperty('color');
  });

  it('returns metadata for all 8 groups', () => {
    const groups = [
      'network',
      'delivery',
      'compute',
      'data',
      'messaging',
      'security',
      'identity',
      'operations',
    ] as const;
    for (const g of groups) {
      const meta = getCreationGroupMeta(g);
      expect(meta).toHaveProperty('icon');
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('color');
    }
  });
});

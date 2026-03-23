import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureModel, ContainerNode, ResourceCategory } from '@cloudblocks/schema';
import { makeTestBlock, makeTestPlate } from '../../__tests__/legacyModelTestUtils';
import {
  ACTION_DEFINITIONS,
  ACTION_GRID,
  ALL_RESOURCES,
  RESOURCE_DEFINITIONS,
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

const NETWORK_PLATE: ContainerNode = makeTestPlate({
  id: 'net-1',
  name: 'VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
});

const SUBNET_PLATE: ContainerNode = makeTestPlate({
  id: 'sub-1',
  name: 'Subnet',
  type: 'subnet',
  parentId: 'net-1',
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
});

function buildArchitecture(plates: ContainerNode[], blockCount = 0): ArchitectureModel {
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

function setArchitectureState(architecture: ArchitectureModel): void {
  const workspace = useArchitectureStore.getState().workspace;
  useArchitectureStore.setState({
    workspace: { ...workspace, architecture },
    validationResult: null,
  });
}

describe('useTechTree constants', () => {
  it('defines all resource entries with correct fields', () => {
    const expectedResources: Record<
      string,
      Pick<
        ResourceDefinition,
        'id' | 'schemaResourceType' | 'label' | 'shortLabel' | 'icon' | 'category' | 'blockCategory'
      >
    > = {
      network: {
        id: 'network',
        schemaResourceType: 'virtual_network',
        label: 'Network (VNet)',
        shortLabel: 'VNet',
        icon: '🌐',
        category: 'foundation',
        blockCategory: null,
      },
      subnet: {
        id: 'subnet',
        schemaResourceType: 'subnet',
        label: 'Subnet',
        shortLabel: 'Subnet',
        icon: '🔲',
        category: 'foundation',
        blockCategory: null,
      },
      storage: {
        id: 'storage',
        schemaResourceType: 'blob_storage',
        label: 'Blob Storage',
        shortLabel: 'Storage',
        icon: '📦',
        category: 'always',
        blockCategory: 'data',
      },
      dns: {
        id: 'dns',
        schemaResourceType: 'dns_zone',
        label: 'DNS Zone',
        shortLabel: 'DNS',
        icon: '🌐',
        category: 'always',
        blockCategory: 'delivery',
      },
      cdn: {
        id: 'cdn',
        schemaResourceType: 'cdn_profile',
        label: 'CDN Profile',
        shortLabel: 'CDN',
        icon: '⚡',
        category: 'always',
        blockCategory: 'delivery',
      },
      'front-door': {
        id: 'front-door',
        schemaResourceType: 'front_door',
        label: 'Front Door',
        shortLabel: 'FrontDoor',
        icon: '🚪',
        category: 'always',
        blockCategory: 'delivery',
      },
      sql: {
        id: 'sql',
        schemaResourceType: 'sql_database',
        label: 'SQL Database',
        shortLabel: 'SQL',
        icon: '🗄️',
        category: 'vnet-optional',
        blockCategory: 'data',
      },
      function: {
        id: 'function',
        schemaResourceType: 'function_compute',
        label: 'Functions',
        shortLabel: 'Func',
        icon: '⚡',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      queue: {
        id: 'queue',
        schemaResourceType: 'message_queue',
        label: 'Queue',
        shortLabel: 'Queue',
        icon: '📨',
        category: 'vnet-optional',
        blockCategory: 'messaging',
      },
      event: {
        id: 'event',
        schemaResourceType: 'event_hub',
        label: 'Event Hub',
        shortLabel: 'Event',
        icon: '🔔',
        category: 'vnet-optional',
        blockCategory: 'messaging',
      },
      'app-service': {
        id: 'app-service',
        schemaResourceType: 'app_service',
        label: 'App Service',
        shortLabel: 'AppSvc',
        icon: '🌐',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      'container-instances': {
        id: 'container-instances',
        schemaResourceType: 'container_instances',
        label: 'Container Instances',
        shortLabel: 'ACI',
        icon: '📦',
        category: 'vnet-optional',
        blockCategory: 'compute',
      },
      'cosmos-db': {
        id: 'cosmos-db',
        schemaResourceType: 'cosmos_db',
        label: 'Cosmos DB',
        shortLabel: 'Cosmos',
        icon: '🌍',
        category: 'vnet-optional',
        blockCategory: 'data',
      },
      'key-vault': {
        id: 'key-vault',
        schemaResourceType: 'key_vault',
        label: 'Key Vault',
        shortLabel: 'KeyVault',
        icon: '🔐',
        category: 'vnet-optional',
        blockCategory: 'security',
      },
      'managed-identity': {
        id: 'managed-identity',
        schemaResourceType: 'managed_identity',
        label: 'Managed Identity',
        shortLabel: 'Identity',
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
        label: 'Kubernetes (AKS)',
        shortLabel: 'AKS',
        icon: '☸️',
        category: 'vnet-required',
        blockCategory: 'compute',
      },
      'internal-lb': {
        id: 'internal-lb',
        schemaResourceType: 'internal_load_balancer',
        label: 'Internal Load Balancer',
        shortLabel: 'IntLB',
        icon: '⚖️',
        category: 'vnet-required',
        blockCategory: 'delivery',
      },
      firewall: {
        id: 'firewall',
        schemaResourceType: 'firewall_security',
        label: 'Firewall',
        shortLabel: 'FW',
        icon: '🛡️',
        category: 'vnet-required',
        blockCategory: 'delivery',
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
        label: 'Bastion',
        shortLabel: 'Bastion',
        icon: '🏰',
        category: 'vnet-required',
        blockCategory: 'security',
      },
      'nat-gateway': {
        id: 'nat-gateway',
        schemaResourceType: 'nat_gateway',
        label: 'NAT Gateway',
        shortLabel: 'NAT',
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
        shortLabel: 'UDR',
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
        label: 'Application Gateway',
        shortLabel: 'AppGW',
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
      'app-service',
      'container-instances',
      'cosmos-db',
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
    expect(resourceTypes).toHaveLength(26);

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
});

describe('useTechTree hook', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
    setArchitectureState(buildArchitecture([], 0));
  });

  it('returns expected state when no plates exist', () => {
    const { result } = renderHook(() => useTechTree());
    const techTreeState: TechTreeState = result.current;

    expect(techTreeState.hasVNet).toBe(false);
    expect(techTreeState.hasSubnet).toBe(false);
    expect(techTreeState.blockCount).toBe(0);
    expect(techTreeState.plateCount).toBe(0);
  });

  it('enables network always, and gates subnet/vm/storage on vnet availability', () => {
    const { result: emptyResult } = renderHook(() => useTechTree());

    expect(emptyResult.current.isEnabled('network')).toBe(true);
    expect(emptyResult.current.isEnabled('subnet')).toBe(false);
    expect(emptyResult.current.isEnabled('vm')).toBe(false);
    expect(emptyResult.current.isEnabled('storage')).toBe(false);

    setArchitectureState(buildArchitecture([NETWORK_PLATE], 2));
    const { result: vnetResult } = renderHook(() => useTechTree());

    expect(vnetResult.current.hasVNet).toBe(true);
    expect(vnetResult.current.hasSubnet).toBe(false);
    expect(vnetResult.current.blockCount).toBe(2);
    expect(vnetResult.current.plateCount).toBe(1);
    expect(vnetResult.current.isEnabled('subnet')).toBe(true);
    expect(vnetResult.current.isEnabled('vm')).toBe(true);
    expect(vnetResult.current.isEnabled('storage')).toBe(true);
  });

  it('returns null disabled reason for enabled resources and custom reason for disabled ones', () => {
    const { result: emptyResult } = renderHook(() => useTechTree());

    expect(emptyResult.current.getDisabledReason('vm')).toBe(
      'Create a Network first. Virtual Machines need a network to connect to.',
    );

    setArchitectureState(buildArchitecture([NETWORK_PLATE], 0));
    const { result: enabledResult } = renderHook(() => useTechTree());

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
      const { result } = renderHook(() => useTechTree());

      expect(result.current.isEnabled('network')).toBe(false);
      expect(result.current.getDisabledReason('network')).toBe(
        'This resource is not available yet.',
      );
    } finally {
      Reflect.set(RESOURCE_DEFINITIONS, 'network', originalNetwork);
    }
  });

  it('returns all creation resources from RESOURCE_DEFINITIONS', () => {
    const { result } = renderHook(() => useTechTree());

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

  it('selects target plate for vm: subnet first, then network, otherwise null', () => {
    const { result: emptyResult } = renderHook(() => useTechTree());
    expect(emptyResult.current.getTargetPlateId('vm')).toBeNull();

    setArchitectureState(buildArchitecture([NETWORK_PLATE], 0));
    const { result: networkOnlyResult } = renderHook(() => useTechTree());
    expect(networkOnlyResult.current.getTargetPlateId('vm')).toBe('net-1');

    setArchitectureState(buildArchitecture([NETWORK_PLATE, SUBNET_PLATE], 0));
    const { result: withSubnetResult } = renderHook(() => useTechTree());
    expect(withSubnetResult.current.getTargetPlateId('vm')).toBe('sub-1');
  });

  it('selects network plate for non-vnet-required resources like storage', () => {
    setArchitectureState(buildArchitecture([NETWORK_PLATE], 0));
    const { result } = renderHook(() => useTechTree());

    expect(result.current.getTargetPlateId('storage')).toBe('net-1');
  });

  it('returns null target plate for non-vnet-required resources when no network exists', () => {
    const { result } = renderHook(() => useTechTree());

    expect(result.current.getTargetPlateId('storage')).toBeNull();
  });
});

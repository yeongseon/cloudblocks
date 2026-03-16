import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { BlockCategory } from '../../shared/types/index';

export type ResourceType =
  | 'network'
  | 'public-subnet'
  | 'private-subnet'
  | 'storage'
  | 'dns'
  | 'cdn'
  | 'front-door'
  | 'sql'
  | 'function'
  | 'queue'
  | 'event'
  | 'timer'
  | 'app-service'
  | 'container-instances'
  | 'cosmos-db'
  | 'key-vault'
  | 'vm'
  | 'aks'
  | 'internal-lb'
  | 'firewall'
  | 'nsg'
  | 'bastion';

export interface ResourceDefinition {
  id: ResourceType;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'plate' | 'always' | 'vnet-optional' | 'vnet-required';
  blockCategory: BlockCategory | null;
  disabledReason?: string;
}

export const RESOURCE_DEFINITIONS: Record<ResourceType, ResourceDefinition> = {
  network: {
    id: 'network',
    label: 'Network (VNet)',
    shortLabel: 'VNet',
    icon: '🌐',
    category: 'plate',
    blockCategory: null,
  },
  'public-subnet': {
    id: 'public-subnet',
    label: 'Public Subnet',
    shortLabel: 'Public',
    icon: '🌍',
    category: 'plate',
    blockCategory: null,
    disabledReason: 'Create a Network first. Subnets live inside a virtual network.',
  },
  'private-subnet': {
    id: 'private-subnet',
    label: 'Private Subnet',
    shortLabel: 'Private',
    icon: '🔒',
    category: 'plate',
    blockCategory: null,
    disabledReason: 'Create a Network first. Subnets live inside a virtual network.',
  },

  // Always enabled (roots)
  storage: {
    id: 'storage',
    label: 'Blob Storage',
    shortLabel: 'Storage',
    icon: '📦',
    category: 'always',
    blockCategory: 'storage',
  },
  dns: {
    id: 'dns',
    label: 'DNS Zone',
    shortLabel: 'DNS',
    icon: '🌐',
    category: 'always',
    blockCategory: 'gateway', // Using gateway category for edge services
  },
  cdn: {
    id: 'cdn',
    label: 'CDN Profile',
    shortLabel: 'CDN',
    icon: '⚡',
    category: 'always',
    blockCategory: 'gateway',
  },
  'front-door': {
    id: 'front-door',
    label: 'Front Door',
    shortLabel: 'FrontDoor',
    icon: '🚪',
    category: 'always',
    blockCategory: 'gateway',
  },

  // VNet optional (public-first, can add private later)
  sql: {
    id: 'sql',
    label: 'Azure SQL',
    shortLabel: 'SQL',
    icon: '🗄️',
    category: 'vnet-optional',
    blockCategory: 'database',
  },
  function: {
    id: 'function',
    label: 'Azure Functions',
    shortLabel: 'Func',
    icon: '⚡',
    category: 'vnet-optional',
    blockCategory: 'function',
  },
  queue: {
    id: 'queue',
    label: 'Queue',
    shortLabel: 'Queue',
    icon: '📨',
    category: 'vnet-optional',
    blockCategory: 'queue',
  },
  event: {
    id: 'event',
    label: 'Event Hub',
    shortLabel: 'Event',
    icon: '🔔',
    category: 'vnet-optional',
    blockCategory: 'event',
  },
  timer: {
    id: 'timer',
    label: 'Timer',
    shortLabel: 'Timer',
    icon: '⏰',
    category: 'vnet-optional',
    blockCategory: 'timer',
  },
  'app-service': {
    id: 'app-service',
    label: 'App Service',
    shortLabel: 'AppSvc',
    icon: '🌐',
    category: 'vnet-optional',
    blockCategory: 'function',
  },
  'container-instances': {
    id: 'container-instances',
    label: 'Container Instances',
    shortLabel: 'ACI',
    icon: '📦',
    category: 'vnet-optional',
    blockCategory: 'compute',
  },
  'cosmos-db': {
    id: 'cosmos-db',
    label: 'Cosmos DB',
    shortLabel: 'Cosmos',
    icon: '🌍',
    category: 'vnet-optional',
    blockCategory: 'database',
  },
  'key-vault': {
    id: 'key-vault',
    label: 'Key Vault',
    shortLabel: 'KeyVault',
    icon: '🔐',
    category: 'vnet-optional',
    blockCategory: 'storage',
  },

  // VNet required
  vm: {
    id: 'vm',
    label: 'Virtual Machine',
    shortLabel: 'VM',
    icon: '🖥️',
    category: 'vnet-required',
    blockCategory: 'compute',
    disabledReason: 'Create a Network first. Virtual Machines need a network to connect to.',
  },
  aks: {
    id: 'aks',
    label: 'Kubernetes (AKS)',
    shortLabel: 'AKS',
    icon: '☸️',
    category: 'vnet-required',
    blockCategory: 'compute',
    disabledReason: 'Create a Network first. Kubernetes clusters run inside a virtual network.',
  },
  'internal-lb': {
    id: 'internal-lb',
    label: 'Internal Load Balancer',
    shortLabel: 'IntLB',
    icon: '⚖️',
    category: 'vnet-required',
    blockCategory: 'gateway',
    disabledReason: 'Create a Network first. Internal load balancers distribute traffic within a network.',
  },
  firewall: {
    id: 'firewall',
    label: 'Azure Firewall',
    shortLabel: 'FW',
    icon: '🛡️',
    category: 'vnet-required',
    blockCategory: 'gateway',
    disabledReason: 'Create a Network first. Firewalls protect traffic entering your network.',
  },
  nsg: {
    id: 'nsg',
    label: 'Network Security Group',
    shortLabel: 'NSG',
    icon: '🔒',
    category: 'vnet-required',
    blockCategory: 'gateway',
    disabledReason: 'Create a Network first. NSGs filter traffic at the network level.',
  },
  bastion: {
    id: 'bastion',
    label: 'Azure Bastion',
    shortLabel: 'Bastion',
    icon: '🏰',
    category: 'vnet-required',
    blockCategory: 'gateway',
    disabledReason: 'Create a Network first. Bastion provides secure VM access through a virtual network.',
  },
};

// ─── Command Card Grid Layout ──────────────────────────────

export type TabId = 'infra' | 'compute' | 'data' | 'edge' | 'messaging';

export interface TabDefinition {
  id: TabId;
  label: string;
  resources: (ResourceType | null)[][];
}

export const CATEGORY_TABS: TabDefinition[] = [
  {
    id: 'infra',
    label: 'Infra',
    resources: [
      ['network', 'public-subnet', 'private-subnet'],
      ['firewall', 'nsg', 'bastion'],
      ['internal-lb', 'dns', null],
    ],
  },
  {
    id: 'compute',
    label: 'Compute',
    resources: [
      ['vm', 'aks', 'container-instances'],
      ['function', 'app-service', null],
      [null, null, null],
    ],
  },
  {
    id: 'data',
    label: 'Data',
    resources: [
      ['sql', 'cosmos-db', 'storage'],
      ['key-vault', null, null],
      [null, null, null],
    ],
  },
  {
    id: 'edge',
    label: 'Edge',
    resources: [
      ['front-door', 'cdn', null],
      [null, null, null],
      [null, null, null],
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    resources: [
      ['queue', 'event', 'timer'],
      [null, null, null],
      [null, null, null],
    ],
  },
];

/**
 * @deprecated Use CATEGORY_TABS for tabbed 3×3 creation layout.
 * Retained for backward compatibility.
 */
export const CREATION_GRID: ResourceType[][] = [
  ['network', 'storage', 'cdn', 'front-door'],
  ['sql', 'function', 'app-service', 'cosmos-db'],
  ['vm', 'aks', 'firewall', 'bastion'],
];

// ─── Action Definitions ────────────────────────────────────

export type ActionType = 'link' | 'edit' | 'delete' | 'copy' | 'config' | 'add-app' | 'move' | 'rename';

export interface ActionDefinition {
  id: ActionType;
  label: string;
  icon: string;
  hotkey?: string;
  /** Whether this action applies to multi-selection */
  multiSelect: boolean;
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  link: { id: 'link', label: 'Link', icon: '🔗', hotkey: 'L', multiSelect: false },
  edit: { id: 'edit', label: 'Edit', icon: '✏️', hotkey: 'E', multiSelect: false },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'Del', multiSelect: true },
  copy: { id: 'copy', label: 'Copy', icon: '📋', hotkey: 'C', multiSelect: true },
  config: { id: 'config', label: 'Config', icon: '⚙️', multiSelect: false },
  'add-app': { id: 'add-app', label: 'Add App', icon: '➕', multiSelect: false },
  move: { id: 'move', label: 'Move', icon: '↔️', hotkey: 'M', multiSelect: true },
  rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'R', multiSelect: false },
};

export const ACTION_GRID: (ActionType | null)[][] = [
  ['link', 'edit', 'config'],
  ['move', 'copy', 'rename'],
  ['add-app', null, 'delete'],
];

export type PlateActionType = 'deploy' | 'config' | 'delete' | 'move' | 'rename';

export interface PlateActionDefinition {
  id: PlateActionType;
  label: string;
  icon: string;
  hotkey?: string;
}

export const PLATE_ACTION_DEFINITIONS: Record<PlateActionType, PlateActionDefinition> = {
  deploy: { id: 'deploy', label: 'Deploy', icon: '🚀', hotkey: 'Q' },
  config: { id: 'config', label: 'Config', icon: '⚙️', hotkey: 'W' },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'E' },
  move: { id: 'move', label: 'Move', icon: '↔️', hotkey: 'A' },
  rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'S' },
};

export const PLATE_ACTION_GRID: (PlateActionType | null)[][] = [
  ['deploy', 'config', 'delete'],
  ['move', 'rename', null],
  [null, null, null],
];

// ─── Hook ──────────────────────────────────────────────────

export interface TechTreeState {
  /** Does a VNet exist in the architecture? */
  hasVNet: boolean;
  /** Does at least one subnet exist? */
  hasSubnet: boolean;
  /** Number of blocks in architecture */
  blockCount: number;
  /** Number of plates in architecture */
  plateCount: number;

  /** Check if a resource type is enabled */
  isEnabled: (type: ResourceType) => boolean;
  /** Get the disabled reason for a resource */
  getDisabledReason: (type: ResourceType) => string | null;

  /** Get all available resources for creation grid */
  getCreationResources: () => Array<{
    resource: ResourceDefinition;
    enabled: boolean;
    disabledReason: string | null;
  }>;

  /** Get target plate ID for placing a new block */
  getTargetPlateId: (type: ResourceType) => string | null;
}

export function useTechTree(): TechTreeState {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  return useMemo(() => {
    const networkPlates = architecture.plates.filter((p) => p.type === 'network');
    const subnetPlates = architecture.plates.filter((p) => p.type === 'subnet');
    const hasVNet = networkPlates.length > 0;
    const hasSubnet = subnetPlates.length > 0;

    const isEnabled = (type: ResourceType): boolean => {
      const def = RESOURCE_DEFINITIONS[type];

      switch (def.category) {
        case 'plate':
          // Network is always enabled
          if (type === 'network') return true;
          // Subnets require VNet
          return hasVNet;

        case 'always':
          // Always enabled (but needs a plate to place on)
          return hasVNet;

        case 'vnet-optional':
          // VNet optional — enabled if we have a network plate
          return hasVNet;

        case 'vnet-required':
          // Requires VNet to exist
          return hasVNet;

        default:
          return false;
      }
    };

    const getDisabledReason = (type: ResourceType): string | null => {
      if (isEnabled(type)) return null;

      const def = RESOURCE_DEFINITIONS[type];
      if (def.disabledReason) return def.disabledReason;

      // Default reason
      if (def.category === 'vnet-required' || def.category === 'vnet-optional') {
        return 'Create a Network first to unlock this resource.';
      }
      if (def.category === 'always') {
        return 'Create a Network first to place resources.';
      }

      return 'This resource is not available yet.';
    };

    const getCreationResources = () => {
      return CATEGORY_TABS.flatMap((tab) => tab.resources.flat())
        .filter((type): type is ResourceType => type !== null)
        .map((type) => ({
        resource: RESOURCE_DEFINITIONS[type],
        enabled: isEnabled(type),
        disabledReason: getDisabledReason(type),
      }));
    };

    const getTargetPlateId = (type: ResourceType): string | null => {
      const def = RESOURCE_DEFINITIONS[type];

      // For VNet-required resources, prefer subnet if available
      if (def.category === 'vnet-required') {
        if (subnetPlates.length > 0) return subnetPlates[0].id;
        if (networkPlates.length > 0) return networkPlates[0].id;
        return null;
      }

      // For other blocks, use network plate
      if (networkPlates.length > 0) return networkPlates[0].id;
      return null;
    };

    return {
      hasVNet,
      hasSubnet,
      blockCount: architecture.blocks.length,
      plateCount: architecture.plates.length,
      isEnabled,
      getDisabledReason,
      getCreationResources,
      getTargetPlateId,
    };
  }, [architecture.plates, architecture.blocks.length]);
}

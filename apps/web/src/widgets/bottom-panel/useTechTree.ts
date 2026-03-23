import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type {
  ProviderType,
  ResourceCategory,
  ResourceType as SchemaResourceType,
} from '@cloudblocks/schema';
import { BLOCK_FRIENDLY_NAMES, BLOCK_ICONS } from '../../shared/types';
import { getBlockColor } from '../../entities/block/blockFaceColors';

export type ResourceType =
  | 'network'
  | 'subnet'
  | 'storage'
  | 'dns'
  | 'cdn'
  | 'front-door'
  | 'sql'
  | 'function'
  | 'queue'
  | 'event'
  | 'app-service'
  | 'container-instances'
  | 'cosmos-db'
  | 'key-vault'
  | 'vm'
  | 'aks'
  | 'internal-lb'
  | 'firewall'
  | 'nsg'
  | 'bastion'
  | 'nat-gateway'
  | 'public-ip'
  | 'route-table'
  | 'private-endpoint'
  | 'app-gateway'
  | 'managed-identity';

export interface ResourceDefinition {
  id: ResourceType;
  schemaResourceType: SchemaResourceType;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'foundation' | 'always' | 'vnet-optional' | 'vnet-required';
  blockCategory: ResourceCategory | null;
  disabledReason?: string;
}

export const RESOURCE_DEFINITIONS: Record<ResourceType, ResourceDefinition> = {
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
    disabledReason: 'Create a Network first. Subnets live inside a virtual network.',
  },

  // Always enabled (roots)
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

  // VNet optional (public-first, can add private later)
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

  // VNet required
  vm: {
    id: 'vm',
    schemaResourceType: 'virtual_machine',
    label: 'Virtual Machine',
    shortLabel: 'VM',
    icon: '🖥️',
    category: 'vnet-required',
    blockCategory: 'compute',
    disabledReason: 'Create a Network first. Virtual Machines need a network to connect to.',
  },
  aks: {
    id: 'aks',
    schemaResourceType: 'kubernetes_cluster',
    label: 'Kubernetes (AKS)',
    shortLabel: 'AKS',
    icon: '☸️',
    category: 'vnet-required',
    blockCategory: 'compute',
    disabledReason: 'Create a Network first. Kubernetes clusters run inside a virtual network.',
  },
  'internal-lb': {
    id: 'internal-lb',
    schemaResourceType: 'internal_load_balancer',
    label: 'Internal Load Balancer',
    shortLabel: 'IntLB',
    icon: '⚖️',
    category: 'vnet-required',
    blockCategory: 'delivery',
    disabledReason:
      'Create a Network first. Internal load balancers distribute traffic within a network.',
  },
  firewall: {
    id: 'firewall',
    schemaResourceType: 'firewall_security',
    label: 'Firewall',
    shortLabel: 'FW',
    icon: '🛡️',
    category: 'vnet-required',
    blockCategory: 'delivery',
    disabledReason: 'Create a Network first. Firewalls protect traffic entering your network.',
  },
  nsg: {
    id: 'nsg',
    schemaResourceType: 'network_security_group',
    label: 'Network Security Group',
    shortLabel: 'NSG',
    icon: '🔒',
    category: 'vnet-required',
    blockCategory: 'security',
    disabledReason: 'Create a Network first. NSGs filter traffic at the network level.',
  },
  bastion: {
    id: 'bastion',
    schemaResourceType: 'bastion_host',
    label: 'Bastion',
    shortLabel: 'Bastion',
    icon: '🏰',
    category: 'vnet-required',
    blockCategory: 'security',
    disabledReason:
      'Create a Network first. Bastion provides secure VM access through a virtual network.',
  },
  'nat-gateway': {
    id: 'nat-gateway',
    schemaResourceType: 'nat_gateway',
    label: 'NAT Gateway',
    shortLabel: 'NAT',
    icon: '🚪',
    category: 'vnet-required',
    blockCategory: 'network',
    disabledReason:
      'Create a Network first. NAT Gateways enable outbound internet access for private subnets.',
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
    disabledReason: 'Create a Network first. Route tables define custom routing within subnets.',
  },
  'private-endpoint': {
    id: 'private-endpoint',
    schemaResourceType: 'private_endpoint',
    label: 'Private Endpoint',
    shortLabel: 'PE',
    icon: '🔒',
    category: 'vnet-required',
    blockCategory: 'network',
    disabledReason:
      'Create a Network first. Private endpoints connect to Azure services via private IP.',
  },
  'app-gateway': {
    id: 'app-gateway',
    schemaResourceType: 'application_gateway',
    label: 'Application Gateway',
    shortLabel: 'AppGW',
    icon: '🚪',
    category: 'vnet-required',
    blockCategory: 'delivery',
    disabledReason: 'Create a Network first. Application Gateways require a dedicated subnet.',
  },
};

// ─── Provider-Specific Labels ─────────────────────────────

interface ProviderLabel {
  label: string;
  shortLabel: string;
}

const PROVIDER_LABELS: Record<ProviderType, Partial<Record<ResourceType, ProviderLabel>>> = {
  azure: {}, // Azure uses RESOURCE_DEFINITIONS defaults
  aws: {
    network: { label: 'VPC', shortLabel: 'VPC' },
    storage: { label: 'S3', shortLabel: 'S3' },
    dns: { label: 'Route 53', shortLabel: 'R53' },
    cdn: { label: 'CloudFront', shortLabel: 'CF' },
    'front-door': { label: 'Global Accelerator', shortLabel: 'GA' },
    sql: { label: 'Amazon RDS', shortLabel: 'RDS' },
    function: { label: 'Lambda', shortLabel: 'Lambda' },
    queue: { label: 'SQS', shortLabel: 'SQS' },
    event: { label: 'EventBridge', shortLabel: 'EvBridge' },
    'app-service': { label: 'Elastic Beanstalk', shortLabel: 'EB' },
    'container-instances': { label: 'ECS Fargate', shortLabel: 'Fargate' },
    'cosmos-db': { label: 'DynamoDB', shortLabel: 'DynamoDB' },
    'key-vault': { label: 'Secrets Manager', shortLabel: 'Secrets' },
    'managed-identity': { label: 'IAM Role', shortLabel: 'IAM' },
    vm: { label: 'EC2', shortLabel: 'EC2' },
    aks: { label: 'EKS', shortLabel: 'EKS' },
    'internal-lb': { label: 'Internal ALB', shortLabel: 'IntALB' },
    firewall: { label: 'Network Firewall', shortLabel: 'NFW' },
    nsg: { label: 'Security Group', shortLabel: 'SG' },
    bastion: { label: 'Session Manager', shortLabel: 'SSM' },
    'nat-gateway': { label: 'NAT Gateway', shortLabel: 'NAT' },
    'public-ip': { label: 'Elastic IP', shortLabel: 'EIP' },
    'route-table': { label: 'Route Table', shortLabel: 'RT' },
    'private-endpoint': { label: 'PrivateLink', shortLabel: 'PL' },
    'app-gateway': { label: 'Application Load Balancer', shortLabel: 'ALB' },
  },
  gcp: {
    network: { label: 'VPC Network', shortLabel: 'VPC' },
    storage: { label: 'Cloud Storage', shortLabel: 'GCS' },
    dns: { label: 'Cloud DNS', shortLabel: 'DNS' },
    cdn: { label: 'Cloud CDN', shortLabel: 'CDN' },
    'front-door': { label: 'Cloud Load Balancing', shortLabel: 'CLB' },
    sql: { label: 'Cloud SQL', shortLabel: 'CloudSQL' },
    function: { label: 'Cloud Functions', shortLabel: 'GCF' },
    queue: { label: 'Cloud Tasks', shortLabel: 'Tasks' },
    event: { label: 'Pub/Sub', shortLabel: 'PubSub' },
    'app-service': { label: 'App Engine', shortLabel: 'GAE' },
    'container-instances': { label: 'Cloud Run', shortLabel: 'Run' },
    'cosmos-db': { label: 'Firestore', shortLabel: 'Firestore' },
    'key-vault': { label: 'Secret Manager', shortLabel: 'SecMgr' },
    'managed-identity': { label: 'Service Account', shortLabel: 'SA' },
    vm: { label: 'Compute Engine', shortLabel: 'GCE' },
    aks: { label: 'GKE', shortLabel: 'GKE' },
    'internal-lb': { label: 'Internal LB', shortLabel: 'IntLB' },
    firewall: { label: 'Cloud Firewall', shortLabel: 'FW' },
    nsg: { label: 'Firewall Rules', shortLabel: 'FWRules' },
    bastion: { label: 'IAP Tunnel', shortLabel: 'IAP' },
    'nat-gateway': { label: 'Cloud NAT', shortLabel: 'CNAT' },
    'public-ip': { label: 'External IP', shortLabel: 'EIP' },
    'route-table': { label: 'VPC Routes', shortLabel: 'Routes' },
    'private-endpoint': { label: 'Private Service Connect', shortLabel: 'PSC' },
    'app-gateway': { label: 'HTTP(S) Load Balancer', shortLabel: 'HTTPS-LB' },
  },
};

/** Get the display label for a resource type, respecting the active provider. */
export function getResourceLabel(type: ResourceType, provider: ProviderType): string {
  return PROVIDER_LABELS[provider]?.[type]?.label ?? RESOURCE_DEFINITIONS[type].label;
}

/** Get the short display label for a resource type, respecting the active provider. */
export function getResourceShortLabel(type: ResourceType, provider: ProviderType): string {
  return PROVIDER_LABELS[provider]?.[type]?.shortLabel ?? RESOURCE_DEFINITIONS[type].shortLabel;
}

// ─── Command Card Grid Layout ──────────────────────────────

// ─── Action Definitions ────────────────────────────────────

export type ActionType = 'link' | 'edit' | 'delete' | 'copy' | 'rename';

export interface ActionDefinition {
  id: ActionType;
  label: string;
  icon: string;
  hotkey?: string;
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  link: { id: 'link', label: 'Link', icon: '🔗', hotkey: 'L' },
  edit: { id: 'edit', label: 'Edit', icon: '✏️', hotkey: 'E' },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'Del' },
  copy: { id: 'copy', label: 'Copy', icon: '📋', hotkey: 'C' },
  rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'R' },
};

export const ACTION_GRID: (ActionType | null)[][] = [
  ['link', 'edit', 'copy'],
  ['rename', null, 'delete'],
  [null, null, null],
];

export type PlateActionType = 'deploy' | 'delete' | 'rename';

export interface PlateActionDefinition {
  id: PlateActionType;
  label: string;
  icon: string;
  hotkey?: string;
}

export const PLATE_ACTION_DEFINITIONS: Record<PlateActionType, PlateActionDefinition> = {
  deploy: { id: 'deploy', label: 'Deploy', icon: '🚀', hotkey: 'Q' },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'E' },
  rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'S' },
};

export const PLATE_ACTION_GRID: (PlateActionType | null)[][] = [
  ['deploy', 'rename', 'delete'],
  [null, null, null],
  [null, null, null],
];

// ─── MVP Resource Allowlist ────────────────────────────────
// Phase 6: Show only core resources in the creation palette.
// Full RESOURCE_DEFINITIONS remain for schema compatibility.
export const MVP_RESOURCE_ALLOWLIST: ReadonlySet<ResourceType> = new Set([
  'network',
  'subnet',
  'vm',
  'sql',
  'storage',
  'key-vault',
  'queue',
  'app-service',
  'app-gateway',
]);

export const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];

export const PROVIDER_RESOURCE_ALLOWLIST: Record<ProviderType, ReadonlySet<ResourceType>> = {
  azure: MVP_RESOURCE_ALLOWLIST,
  aws: MVP_RESOURCE_ALLOWLIST,
  gcp: MVP_RESOURCE_ALLOWLIST,
};

export type CreationGroupId = ResourceCategory | 'foundation';

export const CREATION_GROUP_ORDER: CreationGroupId[] = [
  'foundation',
  'compute',
  'data',
  'delivery',
  'security',
  'identity',
  'messaging',
  'operations',
];

export function getCreationGroupMeta(groupId: CreationGroupId): {
  icon: string;
  label: string;
  color: string;
} {
  if (groupId === 'foundation') {
    return {
      icon: '🧭',
      label: 'Network Foundations',
      color: 'var(--cat-network)',
    };
  }

  return {
    icon: BLOCK_ICONS[groupId],
    label: BLOCK_FRIENDLY_NAMES[groupId],
    color: getBlockColor('azure', undefined, groupId),
  };
}

export function getCreationGroupId(type: ResourceType): CreationGroupId {
  const blockCategory = RESOURCE_DEFINITIONS[type].blockCategory;
  return blockCategory ?? 'foundation';
}

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
    const containers = architecture.nodes.filter((node) => node.kind === 'container');
    const resources = architecture.nodes.filter((node) => node.kind === 'resource');
    const networkPlates = containers.filter((p) => p.layer === 'region');
    const subnetPlates = containers.filter((p) => p.layer === 'subnet');
    const hasVNet = networkPlates.length > 0;
    const hasSubnet = subnetPlates.length > 0;

    const isEnabled = (type: ResourceType): boolean => {
      const def = RESOURCE_DEFINITIONS[type];

      switch (def.category) {
        case 'foundation':
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
      return (Object.keys(RESOURCE_DEFINITIONS) as ResourceType[])
        .filter((type) => MVP_RESOURCE_ALLOWLIST.has(type))
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
      blockCount: resources.length,
      plateCount: containers.length,
      isEnabled,
      getDisabledReason,
      getCreationResources,
      getTargetPlateId,
    };
  }, [architecture.nodes]);
}

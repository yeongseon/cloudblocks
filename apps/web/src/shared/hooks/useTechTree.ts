import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type {
  ProviderType,
  ResourceCategory,
  ResourceType as SchemaResourceType,
} from '@cloudblocks/schema';

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
  /** Azure-specific subtype key used for icon/label/color resolution (e.g. 'functions', 'sql-database'). */
  azureSubtype?: string;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'foundation' | 'always' | 'vnet-optional' | 'vnet-required';
  blockCategory: ResourceCategory | null;
  /** Palette curation tier — starter resources are shown by default, advanced behind a toggle. */
  tier: 'starter' | 'advanced';
  disabledReason?: string;
}

export const RESOURCE_DEFINITIONS: Record<ResourceType, ResourceDefinition> = {
  network: {
    id: 'network',
    schemaResourceType: 'virtual_network',
    azureSubtype: 'vnet',
    label: 'Azure Virtual Network',
    shortLabel: 'VNet',
    icon: '🌐',
    category: 'foundation',
    blockCategory: null,
    tier: 'starter',
  },
  subnet: {
    id: 'subnet',
    schemaResourceType: 'subnet',
    azureSubtype: 'subnet',
    label: 'Subnet',
    shortLabel: 'Subnet',
    icon: '🔲',
    category: 'foundation',
    blockCategory: null,
    tier: 'starter',
    disabledReason: 'Create a Network first. Subnets live inside a virtual network.',
  },

  // Always enabled (roots)
  storage: {
    id: 'storage',
    schemaResourceType: 'blob_storage',
    azureSubtype: 'blob-storage',
    label: 'Storage Account',
    shortLabel: 'Storage',
    icon: '📦',
    category: 'always',
    blockCategory: 'data',
    tier: 'starter',
  },
  dns: {
    id: 'dns',
    schemaResourceType: 'dns_zone',
    azureSubtype: 'azure-dns',
    label: 'Azure DNS',
    shortLabel: 'DNS',
    icon: '🌐',
    category: 'always',
    blockCategory: 'delivery',
    tier: 'advanced',
  },
  cdn: {
    id: 'cdn',
    schemaResourceType: 'cdn_profile',
    azureSubtype: 'cdn-profile',
    label: 'Azure CDN',
    shortLabel: 'CDN',
    icon: '⚡',
    category: 'always',
    blockCategory: 'delivery',
    tier: 'starter',
  },
  'front-door': {
    id: 'front-door',
    schemaResourceType: 'front_door',
    azureSubtype: 'front-door',
    label: 'Azure Front Door',
    shortLabel: 'Front Door',
    icon: '🚪',
    category: 'always',
    blockCategory: 'delivery',
    tier: 'starter',
  },

  // VNet optional (public-first, can add private later)
  sql: {
    id: 'sql',
    schemaResourceType: 'sql_database',
    azureSubtype: 'sql-database',
    label: 'Azure SQL Database',
    shortLabel: 'SQL',
    icon: '🗄️',
    category: 'vnet-optional',
    blockCategory: 'data',
    tier: 'starter',
  },
  function: {
    id: 'function',
    schemaResourceType: 'function_compute',
    azureSubtype: 'functions',
    label: 'Azure Functions',
    shortLabel: 'Functions',
    icon: '⚡',
    category: 'vnet-optional',
    blockCategory: 'compute',
    tier: 'advanced',
  },
  queue: {
    id: 'queue',
    schemaResourceType: 'message_queue',
    azureSubtype: 'service-bus',
    label: 'Azure Service Bus',
    shortLabel: 'Service Bus',
    icon: '📨',
    category: 'vnet-optional',
    blockCategory: 'messaging',
    tier: 'advanced',
  },
  event: {
    id: 'event',
    schemaResourceType: 'event_hub',
    azureSubtype: 'event-hubs',
    label: 'Azure Event Hubs',
    shortLabel: 'Event Hubs',
    icon: '🔔',
    category: 'vnet-optional',
    blockCategory: 'messaging',
    tier: 'advanced',
  },
  'app-service': {
    id: 'app-service',
    schemaResourceType: 'app_service',
    azureSubtype: 'app-service',
    label: 'Azure App Service',
    shortLabel: 'App Service',
    icon: '🌐',
    category: 'vnet-optional',
    blockCategory: 'compute',
    tier: 'starter',
  },
  'container-instances': {
    id: 'container-instances',
    schemaResourceType: 'container_instances',
    azureSubtype: 'container-instances',
    label: 'Azure Container Instances',
    shortLabel: 'ACI',
    icon: '📦',
    category: 'vnet-optional',
    blockCategory: 'compute',
    tier: 'advanced',
  },
  'cosmos-db': {
    id: 'cosmos-db',
    schemaResourceType: 'cosmos_db',
    azureSubtype: 'cosmos-db',
    label: 'Azure Cosmos DB',
    shortLabel: 'Cosmos DB',
    icon: '🌍',
    category: 'vnet-optional',
    blockCategory: 'data',
    tier: 'advanced',
  },
  'key-vault': {
    id: 'key-vault',
    schemaResourceType: 'key_vault',
    azureSubtype: 'key-vault',
    label: 'Azure Key Vault',
    shortLabel: 'Key Vault',
    icon: '🔐',
    category: 'vnet-optional',
    blockCategory: 'security',
    tier: 'starter',
  },
  'managed-identity': {
    id: 'managed-identity',
    schemaResourceType: 'managed_identity',
    azureSubtype: 'managed-identity',
    label: 'Managed Identity',
    shortLabel: 'Managed Identity',
    icon: '🪪',
    category: 'vnet-optional',
    blockCategory: 'identity',
    tier: 'starter',
  },

  // VNet required
  vm: {
    id: 'vm',
    schemaResourceType: 'virtual_machine',
    azureSubtype: 'vm',
    label: 'Virtual Machine',
    shortLabel: 'VM',
    icon: '🖥️',
    category: 'vnet-required',
    blockCategory: 'compute',
    tier: 'advanced',
    disabledReason: 'Create a Network first. Virtual Machines need a network to connect to.',
  },
  aks: {
    id: 'aks',
    schemaResourceType: 'kubernetes_cluster',
    azureSubtype: 'aks',
    label: 'Azure Kubernetes Service',
    shortLabel: 'AKS',
    icon: '☸️',
    category: 'vnet-required',
    blockCategory: 'compute',
    tier: 'advanced',
    disabledReason: 'Create a Network first. Kubernetes clusters run inside a virtual network.',
  },
  'internal-lb': {
    id: 'internal-lb',
    schemaResourceType: 'internal_load_balancer',
    azureSubtype: 'load-balancer',
    label: 'Internal Load Balancer',
    shortLabel: 'ILB',
    icon: '⚖️',
    category: 'vnet-required',
    blockCategory: 'delivery',
    tier: 'advanced',
    disabledReason:
      'Create a Network first. Internal load balancers distribute traffic within a network.',
  },
  firewall: {
    id: 'firewall',
    schemaResourceType: 'firewall_security',
    azureSubtype: 'azure-firewall',
    label: 'Azure Firewall',
    shortLabel: 'Firewall',
    icon: '🛡️',
    category: 'vnet-required',
    blockCategory: 'delivery',
    tier: 'advanced',
    disabledReason: 'Create a Network first. Firewalls protect traffic entering your network.',
  },
  nsg: {
    id: 'nsg',
    schemaResourceType: 'network_security_group',
    azureSubtype: 'nsg',
    label: 'Network Security Group',
    shortLabel: 'NSG',
    icon: '🔒',
    category: 'vnet-required',
    blockCategory: 'security',
    tier: 'advanced',
    disabledReason: 'Create a Network first. NSGs filter traffic at the network level.',
  },
  bastion: {
    id: 'bastion',
    schemaResourceType: 'bastion_host',
    azureSubtype: 'bastion',
    label: 'Azure Bastion',
    shortLabel: 'Bastion',
    icon: '🏰',
    category: 'vnet-required',
    blockCategory: 'security',
    tier: 'advanced',
    disabledReason:
      'Create a Network first. Bastion provides secure VM access through a virtual network.',
  },
  'nat-gateway': {
    id: 'nat-gateway',
    schemaResourceType: 'nat_gateway',
    azureSubtype: 'nat-gateway',
    label: 'Azure NAT Gateway',
    shortLabel: 'NAT GW',
    icon: '🚪',
    category: 'vnet-required',
    blockCategory: 'network',
    tier: 'advanced',
    disabledReason:
      'Create a Network first. NAT Gateways enable outbound internet access for private subnets.',
  },
  'public-ip': {
    id: 'public-ip',
    schemaResourceType: 'public_ip',
    azureSubtype: 'public-ip',
    label: 'Public IP',
    shortLabel: 'PIP',
    icon: '🌐',
    category: 'always',
    blockCategory: 'network',
    tier: 'advanced',
  },
  'route-table': {
    id: 'route-table',
    schemaResourceType: 'route_table',
    azureSubtype: 'route-table',
    label: 'Route Table',
    shortLabel: 'Route Table',
    icon: '🔀',
    category: 'vnet-required',
    blockCategory: 'network',
    tier: 'advanced',
    disabledReason: 'Create a Network first. Route tables define custom routing within subnets.',
  },
  'private-endpoint': {
    id: 'private-endpoint',
    schemaResourceType: 'private_endpoint',
    azureSubtype: 'private-endpoint',
    label: 'Private Endpoint',
    shortLabel: 'PE',
    icon: '🔒',
    category: 'vnet-required',
    blockCategory: 'network',
    tier: 'advanced',
    disabledReason:
      'Create a Network first. Private endpoints connect to Azure services via private IP.',
  },
  'app-gateway': {
    id: 'app-gateway',
    schemaResourceType: 'application_gateway',
    azureSubtype: 'application-gateway',
    label: 'Azure Application Gateway',
    shortLabel: 'AGW',
    icon: '🚪',
    category: 'vnet-required',
    blockCategory: 'delivery',
    tier: 'advanced',
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

export type ContainerBlockActionType = 'deploy' | 'delete' | 'rename';

export interface ContainerBlockActionDefinition {
  id: ContainerBlockActionType;
  label: string;
  icon: string;
  hotkey?: string;
}

export const CONTAINER_BLOCK_ACTION_DEFINITIONS: Record<
  ContainerBlockActionType,
  ContainerBlockActionDefinition
> = {
  deploy: { id: 'deploy', label: 'Deploy', icon: '🚀', hotkey: 'Q' },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', hotkey: 'E' },
  rename: { id: 'rename', label: 'Rename', icon: '📝', hotkey: 'S' },
};

export const CONTAINER_BLOCK_ACTION_GRID: (ContainerBlockActionType | null)[][] = [
  ['deploy', 'rename', 'delete'],
  [null, null, null],
  [null, null, null],
];

export const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];

export type CreationGroupId = 'foundations' | 'networking' | 'compute' | 'data' | 'security';

export const CREATION_GROUP_ORDER: CreationGroupId[] = [
  'foundations',
  'networking',
  'compute',
  'data',
  'security',
];

/** Map schema ResourceCategory → palette display group */
const CATEGORY_TO_GROUP: Record<ResourceCategory, CreationGroupId> = {
  network: 'networking',
  delivery: 'networking',
  compute: 'compute',
  data: 'data',
  messaging: 'data',
  security: 'security',
  identity: 'security',
  operations: 'security',
};

const CREATION_GROUP_META: Record<CreationGroupId, { icon: string; label: string; color: string }> =
  {
    foundations: { icon: '🧭', label: 'Foundations', color: 'var(--cat-network)' },
    networking: { icon: '🌐', label: 'Networking', color: 'var(--cat-network)' },
    compute: { icon: '🖥️', label: 'Compute', color: 'var(--cat-compute)' },
    data: { icon: '🗄️', label: 'Data', color: 'var(--cat-data)' },
    security: { icon: '🔒', label: 'Security', color: 'var(--cat-security)' },
  };

export function getCreationGroupMeta(groupId: CreationGroupId): {
  icon: string;
  label: string;
  color: string;
} {
  return CREATION_GROUP_META[groupId];
}

export function getCreationGroupId(type: ResourceType): CreationGroupId {
  const blockCategory = RESOURCE_DEFINITIONS[type].blockCategory;
  if (!blockCategory) return 'foundations';
  return CATEGORY_TO_GROUP[blockCategory];
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

  /** Get target container ID for placing a new block */
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
          // Always enabled (but needs a container to place on)
          return hasVNet;

        case 'vnet-optional':
          // VNet optional — enabled if we have a network container
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
      return ALL_RESOURCES.map((type) => ({
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

      // For other blocks, use network container
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

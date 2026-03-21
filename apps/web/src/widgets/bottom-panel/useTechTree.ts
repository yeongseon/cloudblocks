import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { BlockCategory, ProviderType } from '@cloudblocks/schema';

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
    blockCategory: 'identity',
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

// ─── Provider-Specific Labels ─────────────────────────────

interface ProviderLabel {
  label: string;
  shortLabel: string;
}

const PROVIDER_LABELS: Record<ProviderType, Partial<Record<ResourceType, ProviderLabel>>> = {
  azure: {}, // Azure uses RESOURCE_DEFINITIONS defaults
  aws: {
    network:              { label: 'VPC',                  shortLabel: 'VPC' },
    storage:              { label: 'S3',                   shortLabel: 'S3' },
    dns:                  { label: 'Route 53',             shortLabel: 'R53' },
    cdn:                  { label: 'CloudFront',           shortLabel: 'CF' },
    'front-door':         { label: 'Global Accelerator',   shortLabel: 'GA' },
    sql:                  { label: 'Amazon RDS',           shortLabel: 'RDS' },
    function:             { label: 'Lambda',               shortLabel: 'Lambda' },
    queue:                { label: 'SQS',                  shortLabel: 'SQS' },
    event:                { label: 'EventBridge',          shortLabel: 'EvBridge' },
    'app-service':        { label: 'Elastic Beanstalk',    shortLabel: 'EB' },
    'container-instances': { label: 'ECS Fargate',         shortLabel: 'Fargate' },
    'cosmos-db':          { label: 'DynamoDB',             shortLabel: 'DynamoDB' },
    'key-vault':          { label: 'Secrets Manager',      shortLabel: 'Secrets' },
    vm:                   { label: 'EC2',                  shortLabel: 'EC2' },
    aks:                  { label: 'EKS',                  shortLabel: 'EKS' },
    'internal-lb':        { label: 'Internal ALB',         shortLabel: 'IntALB' },
    firewall:             { label: 'Network Firewall',     shortLabel: 'NFW' },
    nsg:                  { label: 'Security Group',       shortLabel: 'SG' },
    bastion:              { label: 'Session Manager',      shortLabel: 'SSM' },
  },
  gcp: {
    network:              { label: 'VPC Network',          shortLabel: 'VPC' },
    storage:              { label: 'Cloud Storage',        shortLabel: 'GCS' },
    dns:                  { label: 'Cloud DNS',            shortLabel: 'DNS' },
    cdn:                  { label: 'Cloud CDN',            shortLabel: 'CDN' },
    'front-door':         { label: 'Cloud Load Balancing', shortLabel: 'CLB' },
    sql:                  { label: 'Cloud SQL',            shortLabel: 'CloudSQL' },
    function:             { label: 'Cloud Functions',      shortLabel: 'GCF' },
    queue:                { label: 'Cloud Tasks',          shortLabel: 'Tasks' },
    event:                { label: 'Pub/Sub',              shortLabel: 'PubSub' },
    'app-service':        { label: 'App Engine',           shortLabel: 'GAE' },
    'container-instances': { label: 'Cloud Run',           shortLabel: 'Run' },
    'cosmos-db':          { label: 'Firestore',            shortLabel: 'Firestore' },
    'key-vault':          { label: 'Secret Manager',       shortLabel: 'SecMgr' },
    vm:                   { label: 'Compute Engine',       shortLabel: 'GCE' },
    aks:                  { label: 'GKE',                  shortLabel: 'GKE' },
    'internal-lb':        { label: 'Internal LB',          shortLabel: 'IntLB' },
    firewall:             { label: 'Cloud Firewall',       shortLabel: 'FW' },
    nsg:                  { label: 'Firewall Rules',       shortLabel: 'FWRules' },
    bastion:              { label: 'IAP Tunnel',           shortLabel: 'IAP' },
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
    const networkPlates = architecture.plates.filter((p) => p.type === 'region');
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
      return (Object.keys(RESOURCE_DEFINITIONS) as ResourceType[])
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

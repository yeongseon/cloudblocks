// CloudBlocks Platform - Core Domain Types
// Based on DOMAIN_MODEL.md §12

import type {
  ArchitectureModel,
  BlockRole,
  PlateType,
  ResourceCategory,
  Size,
} from '@cloudblocks/schema';

export type {
  Aggregation,
  AggregationMode,
  ArchitectureModel,
  Block,
  BlockKind,
  BlockCategory,
  BlockRole,
  ContainerBlock,
  Connection,
  ConnectionType,
  Endpoint,
  EndpointDirection,
  EndpointSemantic,
  ExternalActor,
  LegacyConnection,
  ResourceBlock,
  LayerType,
  PlateType,
  Position,
  ProviderType,
  ResourceCategory,
  ResourceNode,
  Size,
} from '@cloudblocks/schema';

export {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForBlock,
  parseEndpointId,
  resolveConnectionNodes,
} from '@cloudblocks/schema';

export { BLOCK_ROLES, CONNECTION_TYPE_LABELS, VALID_PARENTS } from '@cloudblocks/domain';

export type {
  RuleDefinition,
  RuleSeverity,
  RuleType,
  ValidationError,
  ValidationResult,
} from '@cloudblocks/domain';

// ─── Role Model (v2.0 §9) ────────────────────────────────────

export interface RoleVisualIndicator {
  icon: string; // emoji or symbol badge
  label: string; // accessible label
  borderStyle?: string; // CSS border style override
}

export const ROLE_VISUAL_INDICATORS: Record<BlockRole, RoleVisualIndicator> = {
  primary: { icon: '★', label: 'Primary', borderStyle: '2px solid #F59E0B' },
  secondary: { icon: '☆', label: 'Secondary' },
  reader: { icon: '👁', label: 'Reader' },
  writer: { icon: '✏', label: 'Writer' },
  public: { icon: '🌐', label: 'Public' },
  private: { icon: '🔒', label: 'Private' },
  internal: { icon: '⇐', label: 'Internal' },
  external: { icon: '⇒', label: 'External' },
};
// ─── Workspace ─────────────────────────────────────────────

export interface LastPrResult {
  url: string;
  number: number;
  branch: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  architecture: ArchitectureModel;
  createdAt: string;
  updatedAt: string;
  backendWorkspaceId?: string;
  githubRepo?: string;
  lastPrResult?: LastPrResult;
}

// ─── Visual Identity ───────────────────────────────────────

export const CONTAINER_BLOCK_COLORS: Record<PlateType, string> = {
  global: '#B39DDB',
  edge: '#80CBC4',
  region: '#90CAF9',
  zone: '#A5D6A7',
  subnet: '#E0E0E0',
};

// ─── Default Sizes ─────────────────────────────────────────

export const DEFAULT_BLOCK_SIZE: Size = {
  width: 2.4,
  height: 2.4,
  depth: 2.4,
};

// ─── Educational Metadata ──────────────────────────────────

export const BLOCK_FRIENDLY_NAMES: Record<ResourceCategory, string> = {
  network: 'Virtual Network',
  security: 'Security Service',
  delivery: 'Load Balancer',
  compute: 'Compute Instance',
  data: 'Data Store',
  messaging: 'Message Service',
  identity: 'Identity Service',
  operations: 'Monitoring',
};

export const BLOCK_ICONS: Record<ResourceCategory, string> = {
  network: '🌐',
  security: '🔒',
  delivery: '⚖️',
  compute: '🖥️',
  data: '🗄️',
  messaging: '📨',
  identity: '🪪',
  operations: '📡',
};

export const BLOCK_SHORT_NAMES: Record<ResourceCategory, string> = {
  network: 'Virtual Net',
  security: 'Security',
  delivery: 'Delivery',
  compute: 'Compute',
  data: 'Data Store',
  messaging: 'Messaging',
  identity: 'Identity',
  operations: 'Ops Monitor',
};

export const BLOCK_ENCYCLOPEDIA: Record<
  ResourceCategory,
  {
    what: string;
    placement: string;
    connections: string;
  }
> = {
  network: {
    what: 'Virtual networks define isolated private address spaces. All other resources live inside network boundaries.',
    placement: 'Must be placed as the outermost container. Subnets nest inside networks.',
    connections:
      'Network resources rarely have direct connections. They provide the boundary for subnet-level routing.',
  },
  security: {
    what: 'Security services enforce access control, identity verification, and threat protection across your architecture.',
    placement: 'Place inside a subnet alongside protected resources.',
    connections:
      'Connects to compute and data nodes via internal or data connections for policy enforcement.',
  },
  delivery: {
    what: 'Content delivery and traffic distribution services — CDNs, load balancers, and edge caching.',
    placement:
      'Place in a subnet to receive external traffic. Routes to compute nodes in other subnets.',
    connections:
      'Receives HTTP connections from external actors. Sends dataflow connections to compute targets.',
  },
  compute: {
    what: 'Compute instances run application code — virtual machines, containers, or serverless functions.',
    placement: 'Place in any subnet. Use separate subnets for web-facing vs backend services.',
    connections: 'Receives traffic from edge nodes. Connects to data stores via data connections.',
  },
  data: {
    what: 'Data stores persist structured or unstructured information — databases, blob storage, caches.',
    placement:
      'Place in a subnet. Use NSG rules to restrict access rather than relying on subnet type.',
    connections:
      'Receives data connections from compute nodes. May replicate via async connections.',
  },
  messaging: {
    what: 'Message services enable asynchronous communication between decoupled components — queues, topics, event streams.',
    placement: 'Place in a subnet. Acts as a buffer between producer and consumer services.',
    connections:
      'Receives async connections from producers. Sends async connections to consumer compute nodes.',
  },
  identity: {
    what: 'Identity and access management — authentication, authorization, managed identities, and service principals.',
    placement: 'Place inside a subnet alongside resources that need identity-based access control.',
    connections: 'Provides identity tokens to compute and data nodes via internal connections.',
  },
  operations: {
    what: 'Monitoring and observability services collect metrics, logs, and traces from all running resources.',
    placement: 'Place in a subnet. Needs network access to all monitored resources.',
    connections:
      'Receives internal connections from all resources being monitored. Typically read-only telemetry.',
  },
};

export const CONNECTION_ENCYCLOPEDIA: Record<
  string,
  {
    what: string;
    usage: string;
  }
> = {
  dataflow: {
    what: 'General-purpose data movement between resources. Use when data flows in one direction without a specific protocol.',
    usage: 'Load balancer to compute, compute to data store, any producer-consumer pattern.',
  },
  http: {
    what: 'Request-response communication over HTTP/HTTPS. The most common web protocol for APIs and web traffic.',
    usage: 'External actor to delivery, delivery to compute, compute to external APIs.',
  },
  internal: {
    what: 'Private network communication between resources in the same network. No public internet exposure.',
    usage:
      'Compute to security services, monitoring agents to operations, internal microservice calls.',
  },
  data: {
    what: 'Database protocol connections — SQL queries, key-value lookups, document reads/writes.',
    usage: 'Compute to database, compute to cache, any application-to-data-store communication.',
  },
  async: {
    what: 'Asynchronous message-based communication. Sender does not wait for the receiver to process.',
    usage: 'Compute to message queue, event producer to event stream, background job dispatch.',
  },
};

export const PLATE_ENCYCLOPEDIA: Record<
  string,
  {
    what: string;
    rules: string;
  }
> = {
  global: {
    what: 'The outermost boundary representing your entire cloud environment or a multi-region deployment.',
    rules:
      'Can contain edge, region, and zone containers. Cannot be nested inside other containers.',
  },
  edge: {
    what: 'Edge locations for content delivery and low-latency access points close to end users.',
    rules: 'Nests inside a global container. Contains edge and compute nodes for CDN and caching.',
  },
  region: {
    what: 'A geographic region where cloud resources are deployed — e.g., East US, EU West, Asia Pacific.',
    rules:
      'Nests inside a global container. Contains subnet containers which hold the actual resources.',
  },
  zone: {
    what: 'An availability zone within a region for fault isolation and high availability.',
    rules:
      'Nests inside a region container. Contains subnet containers for zone-specific deployments.',
  },
  subnet: {
    what: 'A network segment with its own IP range and access rules. Access control is managed via NSG and route tables.',
    rules:
      'Nests inside a region or zone container. Contains nodes (compute, data, security, etc.).',
  },
};

// ─── ContainerBlock Profile System ──────────────────────────────────

export type NetworkProfileId =
  | 'network-sandbox'
  | 'network-application'
  | 'network-platform'
  | 'network-hub';

export type SubnetProfileId =
  | 'subnet-utility'
  | 'subnet-service'
  | 'subnet-workload'
  | 'subnet-scale';

export type ContainerBlockProfileId = NetworkProfileId | SubnetProfileId;

export interface ContainerBlockProfile {
  id: ContainerBlockProfileId;
  type: PlateType; // LayerType (minus resource)
  displayName: string;
  description: string;
  unitsX: number;
  unitsY: number;
  worldWidth: number; // = unitsX (world units match CU count)
  worldDepth: number; // = unitsY (world units match CU count)
  worldHeight: number; // VNet = 0.7 (thick), Subnet = 0.5 (medium)
  recommendedCapacity: number;
  exampleCidrs: {
    azure: string;
    aws: string;
    gcp: string;
  };
  learningLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export const CONTAINER_BLOCK_PROFILES: Record<ContainerBlockProfileId, ContainerBlockProfile> = {
  'network-sandbox': {
    id: 'network-sandbox',
    type: 'region',
    displayName: 'Sandbox',
    description: 'Dev/test isolated network. Minimal footprint for experimentation.',
    unitsX: 8,
    unitsY: 12,
    worldWidth: 8,
    worldDepth: 12,
    worldHeight: 0.7,
    recommendedCapacity: 2,
    exampleCidrs: { azure: '10.0.0.0/24', aws: '10.0.0.0/24', gcp: '10.0.0.0/24' },
    learningLevel: 'beginner',
  },
  'network-application': {
    id: 'network-application',
    type: 'region',
    displayName: 'Application',
    description:
      'Standard application VNet. Hosts a single workload with public/private separation.',
    unitsX: 12,
    unitsY: 16,
    worldWidth: 12,
    worldDepth: 16,
    worldHeight: 0.7,
    recommendedCapacity: 4,
    exampleCidrs: { azure: '10.1.0.0/20', aws: '10.1.0.0/20', gcp: '10.1.0.0/20' },
    learningLevel: 'intermediate',
  },
  'network-platform': {
    id: 'network-platform',
    type: 'region',
    displayName: 'Platform',
    description: 'Production platform VNet. Multi-tier architecture with several subnet groups.',
    unitsX: 16,
    unitsY: 20,
    worldWidth: 16,
    worldDepth: 20,
    worldHeight: 0.7,
    recommendedCapacity: 6,
    exampleCidrs: { azure: '10.0.0.0/16', aws: '10.0.0.0/16', gcp: '10.0.0.0/16' },
    learningLevel: 'advanced',
  },
  'network-hub': {
    id: 'network-hub',
    type: 'region',
    displayName: 'Hub',
    description: 'Enterprise hub VNet. Central network for shared services and spoke connections.',
    unitsX: 20,
    unitsY: 24,
    worldWidth: 20,
    worldDepth: 24,
    worldHeight: 0.7,
    recommendedCapacity: 8,
    exampleCidrs: { azure: '10.0.0.0/8', aws: '10.0.0.0/8', gcp: '10.0.0.0/8' },
    learningLevel: 'expert',
  },
  'subnet-utility': {
    id: 'subnet-utility',
    type: 'subnet',
    displayName: 'Utility',
    description: 'Small utility subnet. Gateway, bastion, or management services.',
    unitsX: 4,
    unitsY: 6,
    worldWidth: 4,
    worldDepth: 6,
    worldHeight: 0.5,
    recommendedCapacity: 2,
    exampleCidrs: { azure: '10.0.0.0/28', aws: '10.0.0.0/28', gcp: '10.0.0.0/28' },
    learningLevel: 'beginner',
  },
  'subnet-service': {
    id: 'subnet-service',
    type: 'subnet',
    displayName: 'Service',
    description: 'Standard service subnet. Hosts a small group of related resources.',
    unitsX: 6,
    unitsY: 8,
    worldWidth: 6,
    worldDepth: 8,
    worldHeight: 0.5,
    recommendedCapacity: 4,
    exampleCidrs: { azure: '10.0.1.0/26', aws: '10.0.1.0/26', gcp: '10.0.1.0/26' },
    learningLevel: 'intermediate',
  },
  'subnet-workload': {
    id: 'subnet-workload',
    type: 'subnet',
    displayName: 'Workload',
    description: 'Large workload subnet. Multi-service deployments, compute clusters.',
    unitsX: 8,
    unitsY: 10,
    worldWidth: 8,
    worldDepth: 10,
    worldHeight: 0.5,
    recommendedCapacity: 6,
    exampleCidrs: { azure: '10.0.2.0/24', aws: '10.0.2.0/24', gcp: '10.0.2.0/24' },
    learningLevel: 'advanced',
  },
  'subnet-scale': {
    id: 'subnet-scale',
    type: 'subnet',
    displayName: 'Scale',
    description: 'Extra-large scale subnet. AKS/EKS clusters, VMSS, large-scale workloads.',
    unitsX: 10,
    unitsY: 12,
    worldWidth: 10,
    worldDepth: 12,
    worldHeight: 0.5,
    recommendedCapacity: 8,
    exampleCidrs: { azure: '10.0.4.0/22', aws: '10.0.4.0/22', gcp: '10.0.4.0/22' },
    learningLevel: 'expert',
  },
};

export const DEFAULT_CONTAINER_BLOCK_PROFILE: Record<PlateType, ContainerBlockProfileId> = {
  global: 'network-hub',
  edge: 'network-sandbox',
  region: 'network-platform',
  zone: 'network-application',
  subnet: 'subnet-service',
};

// ─── Profile Helper Functions ──────────────────────────────

export function getContainerBlockProfile(
  profileId: ContainerBlockProfileId,
): ContainerBlockProfile {
  return CONTAINER_BLOCK_PROFILES[profileId];
}

export function isContainerBlockProfileId(value: string): value is ContainerBlockProfileId {
  return value in CONTAINER_BLOCK_PROFILES;
}

export function buildContainerBlockSizeFromProfileId(profileId: ContainerBlockProfileId): Size {
  const profile = CONTAINER_BLOCK_PROFILES[profileId];
  return {
    width: profile.worldWidth,
    height: profile.worldHeight,
    depth: profile.worldDepth,
  };
}

interface LegacyContainerBlockShape {
  type: PlateType;
  size: { width: number; depth: number };
}

export function inferLegacyContainerBlockProfileId(
  legacyPlate: LegacyContainerBlockShape,
): ContainerBlockProfileId {
  const { type, size } = legacyPlate;
  const candidates = Object.values(CONTAINER_BLOCK_PROFILES).filter((p) => p.type === type);

  // Find exact match first
  const exact = candidates.find((p) => p.worldWidth === size.width && p.worldDepth === size.depth);
  if (exact) return exact.id;

  // Find closest by area
  const targetArea = size.width * size.depth;
  let closest = candidates[0];
  let closestDiff = Math.abs(closest.worldWidth * closest.worldDepth - targetArea);
  for (const candidate of candidates) {
    const diff = Math.abs(candidate.worldWidth * candidate.worldDepth - targetArea);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }
  return closest.id;
}

export const DEFAULT_CONTAINER_BLOCK_SIZE: Record<PlateType, Size> = {
  global: buildContainerBlockSizeFromProfileId(DEFAULT_CONTAINER_BLOCK_PROFILE.global),
  edge: buildContainerBlockSizeFromProfileId(DEFAULT_CONTAINER_BLOCK_PROFILE.edge),
  region: buildContainerBlockSizeFromProfileId(DEFAULT_CONTAINER_BLOCK_PROFILE.region),
  zone: buildContainerBlockSizeFromProfileId(DEFAULT_CONTAINER_BLOCK_PROFILE.zone),
  subnet: buildContainerBlockSizeFromProfileId(DEFAULT_CONTAINER_BLOCK_PROFILE.subnet),
};

export {
  type BlockVisualProfile,
  type BlockSurface,
  type BlockSilhouette,
  type BlockTier,
  type BlockDimensionsCU,
  BLOCK_VISUAL_PROFILES,
  TIER_DIMENSIONS,
  CATEGORY_TIER_MAP,
  SUBTYPE_SIZE_OVERRIDES,
  getBlockVisualProfile,
  getBlockDimensions,
} from './visualProfile';

// ─── Persona System (M20 §3b) ─────────────────────────────

export type Persona = 'devops' | 'backend' | 'pm' | 'student';
export type ComplexityLevel = 'beginner' | 'standard' | 'advanced';

export const PERSONA_LABELS: Record<Persona, { icon: string; title: string; description: string }> =
  {
    devops: {
      icon: '\u{1F6E0}\u{FE0F}',
      title: 'DevOps Engineer',
      description: 'I deploy and manage infrastructure',
    },
    backend: {
      icon: '\u{1F4BB}',
      title: 'Backend Developer',
      description: 'I design and build applications',
    },
    pm: {
      icon: '\u{1F4CA}',
      title: 'Product Manager',
      description: 'I review and communicate architecture',
    },
    student: {
      icon: '\u{1F393}',
      title: 'Student',
      description: "I'm learning cloud architecture",
    },
  };

export const PERSONA_COMPLEXITY_MAP: Record<Persona, ComplexityLevel> = {
  devops: 'advanced',
  backend: 'standard',
  pm: 'beginner',
  student: 'beginner',
};

export interface PersonaPanelDefaults {
  showBlockPalette: boolean;
  showResourceGuide: boolean;
  showValidation: boolean;
  showCodePreview: boolean;
  showLearningPanel: boolean;
  showTemplateGallery: boolean;
}

export const PERSONA_PANEL_DEFAULTS: Record<Persona, PersonaPanelDefaults> = {
  devops: {
    showBlockPalette: true,
    showResourceGuide: true,
    showValidation: true,
    showCodePreview: true,
    showLearningPanel: false,
    showTemplateGallery: false,
  },
  backend: {
    showBlockPalette: true,
    showResourceGuide: true,
    showValidation: true,
    showCodePreview: true,
    showLearningPanel: false,
    showTemplateGallery: false,
  },
  pm: {
    showBlockPalette: false,
    showResourceGuide: true,
    showValidation: true,
    showCodePreview: false,
    showLearningPanel: false,
    showTemplateGallery: false,
  },
  student: {
    showBlockPalette: true,
    showResourceGuide: true,
    showValidation: true,
    showCodePreview: false,
    showLearningPanel: false,
    showTemplateGallery: false,
  },
};

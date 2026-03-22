// CloudBlocks Platform - Core Domain Types
// Based on DOMAIN_MODEL.md §12

import type {
  ArchitectureModel,
  BlockRole,
  PlateType,
  ResourceCategory,
  Size,
  SubnetAccess,
} from '@cloudblocks/schema';

export type {
  Aggregation,
  AggregationMode,
  ArchitectureModel,
  Block,
  BlockCategory,
  BlockRole,
  ContainerNode,
  Connection,
  ConnectionType,
  ExternalActor,
  LeafNode,
  LayerType,
  NodeKind,
  Plate,
  PlateType,
  Position,
  ProviderType,
  ResourceCategory,
  ResourceNode,
  Size,
  SubnetAccess,
} from '@cloudblocks/schema';

export {
  BLOCK_ROLES,
  CONNECTION_TYPE_LABELS,
  VALID_PARENTS,
} from '@cloudblocks/domain';

export type {
  RuleDefinition,
  RuleSeverity,
  RuleType,
  ValidationError,
  ValidationResult,
} from '@cloudblocks/domain';

// ─── Role Model (v2.0 §9) ────────────────────────────────────

export interface RoleVisualIndicator {
  icon: string;       // emoji or symbol badge
  label: string;      // accessible label
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

export const PLATE_COLORS: Record<PlateType, string> = {
  global: '#B39DDB',
  edge: '#80CBC4',
  region: '#90CAF9',
  zone: '#A5D6A7',
  subnet: '#E0E0E0',
};

export const SUBNET_ACCESS_COLORS: Record<SubnetAccess, string> = {
  public: '#22C55E',     // Bright green
  private: '#DC2626',    // Dark red (restricted access)
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
  edge: 'Load Balancer',
  compute: 'Compute Instance',
  data: 'Data Store',
  messaging: 'Message Service',
  operations: 'Monitoring',
};

export const BLOCK_DESCRIPTIONS: Record<ResourceCategory, string> = {
  network: 'Defines private network boundaries and segmented traffic paths',
  security: 'Enforces identity, access controls, and workload protection',
  edge: 'Handles ingress routing, balancing, and edge delivery',
  compute: 'Executes application workloads and runtime services',
  data: 'Stores and serves persistent structured or unstructured data',
  messaging: 'Connects services through asynchronous event and queue flows',
  operations: 'Observes health, performance, and operational telemetry',
};

export const BLOCK_ICONS: Record<ResourceCategory, string> = {
  network: '🌐',
  security: '🔒',
  edge: '⚖️',
  compute: '🖥️',
  data: '🗄️',
  messaging: '📨',
  operations: '📡',
};

export const BLOCK_SHORT_NAMES: Record<ResourceCategory, string> = {
  network: 'Virtual Net',
  security: 'Security',
  edge: 'Load Bal',
  compute: 'Compute',
  data: 'Data Store',
  messaging: 'Messaging',
  operations: 'Ops Monitor',
};

export const BLOCK_ENCYCLOPEDIA: Record<ResourceCategory, {
  what: string;
  placement: string;
  connections: string;
}> = {
  network: {
    what: 'Virtual networks define isolated private address spaces. All other resources live inside network boundaries.',
    placement: 'Must be placed as the outermost plate. Subnets nest inside networks.',
    connections: 'Network resources rarely have direct connections. They provide the boundary for subnet-level routing.',
  },
  security: {
    what: 'Security services enforce access control, identity verification, and threat protection across your architecture.',
    placement: 'Place inside a subnet. Typically sits in a private subnet alongside protected resources.',
    connections: 'Connects to compute and data blocks via internal or data connections for policy enforcement.',
  },
  edge: {
    what: 'Load balancers and CDNs distribute incoming traffic across backend compute instances for high availability.',
    placement: 'Place in a public subnet to receive external traffic. Routes to compute blocks in private subnets.',
    connections: 'Receives HTTP connections from external actors. Sends dataflow connections to compute targets.',
  },
  compute: {
    what: 'Compute instances run application code — virtual machines, containers, or serverless functions.',
    placement: 'Place in any subnet. Public subnets for web servers, private subnets for backend services.',
    connections: 'Receives traffic from edge blocks. Connects to data stores via data connections.',
  },
  data: {
    what: 'Data stores persist structured or unstructured information — databases, blob storage, caches.',
    placement: 'Place in a private subnet for security. Avoid direct public internet exposure.',
    connections: 'Receives data connections from compute blocks. May replicate via async connections.',
  },
  messaging: {
    what: 'Message services enable asynchronous communication between decoupled components — queues, topics, event streams.',
    placement: 'Place in a private subnet. Acts as a buffer between producer and consumer services.',
    connections: 'Receives async connections from producers. Sends async connections to consumer compute blocks.',
  },
  operations: {
    what: 'Monitoring and observability services collect metrics, logs, and traces from all running resources.',
    placement: 'Place in a private subnet. Needs network access to all monitored resources.',
    connections: 'Receives internal connections from all resources being monitored. Typically read-only telemetry.',
  },
};

export const CONNECTION_ENCYCLOPEDIA: Record<string, {
  what: string;
  usage: string;
}> = {
  dataflow: {
    what: 'General-purpose data movement between resources. Use when data flows in one direction without a specific protocol.',
    usage: 'Load balancer to compute, compute to data store, any producer-consumer pattern.',
  },
  http: {
    what: 'Request-response communication over HTTP/HTTPS. The most common web protocol for APIs and web traffic.',
    usage: 'External actor to edge, edge to compute, compute to external APIs.',
  },
  internal: {
    what: 'Private network communication between resources in the same network. No public internet exposure.',
    usage: 'Compute to security services, monitoring agents to operations, internal microservice calls.',
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

export const PLATE_ENCYCLOPEDIA: Record<string, {
  what: string;
  rules: string;
}> = {
  global: {
    what: 'The outermost boundary representing your entire cloud environment or a multi-region deployment.',
    rules: 'Can contain edge, region, and zone plates. Cannot be nested inside other plates.',
  },
  edge: {
    what: 'Edge locations for content delivery and low-latency access points close to end users.',
    rules: 'Nests inside a global plate. Contains edge and compute blocks for CDN and caching.',
  },
  region: {
    what: 'A geographic region where cloud resources are deployed — e.g., East US, EU West, Asia Pacific.',
    rules: 'Nests inside a global plate. Contains subnet plates which hold the actual resources.',
  },
  zone: {
    what: 'An availability zone within a region for fault isolation and high availability.',
    rules: 'Nests inside a region plate. Contains subnet plates for zone-specific deployments.',
  },
  subnet: {
    what: 'A network segment with its own IP range and access rules. Public subnets face the internet; private subnets are isolated.',
    rules: 'Nests inside a region or zone plate. Contains blocks (compute, data, security, etc.).',
  },
};

// ─── Plate Profile System ──────────────────────────────────

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

export type PlateProfileId = NetworkProfileId | SubnetProfileId;

export interface StudColorSpec {
  main: string;
  shadow: string;
  highlight: string;
}

export interface PlateProfile {
  id: PlateProfileId;
  type: PlateType; // LayerType (minus resource)
  displayName: string;
  description: string;
  studsX: number;
  studsY: number;
  worldWidth: number;  // = studsX (world units match stud count)
  worldDepth: number;  // = studsY
  worldHeight: number; // VNet = 0.7 (thick), Subnet = 0.5 (medium)
  recommendedCapacity: number;
  exampleCidrs: {
    azure: string;
    aws: string;
    gcp: string;
  };
  learningLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  studColors: StudColorSpec;
}

export const NETWORK_STUD_COLORS: StudColorSpec = {
  main: '#42A5F5',
  shadow: '#1565C0',
  highlight: '#90CAF9',
};

export const PUBLIC_SUBNET_STUD_COLORS: StudColorSpec = {
  main: '#66BB6A',
  shadow: '#2E7D32',
  highlight: '#A5D6A7',
};

export const PRIVATE_SUBNET_STUD_COLORS: StudColorSpec = {
  main: '#7986CB',
  shadow: '#3949AB',
  highlight: '#C5CAE9',
};

export const PLATE_PROFILES: Record<PlateProfileId, PlateProfile> = {
  'network-sandbox': {
    id: 'network-sandbox',
    type: 'region',
    displayName: 'Sandbox',
    description: 'Dev/test isolated network. Minimal footprint for experimentation.',
    studsX: 8,
    studsY: 12,
    worldWidth: 8,
    worldDepth: 12,
    worldHeight: 0.7,
    recommendedCapacity: 2,
    exampleCidrs: { azure: '10.0.0.0/24', aws: '10.0.0.0/24', gcp: '10.0.0.0/24' },
    learningLevel: 'beginner',
    studColors: NETWORK_STUD_COLORS,
  },
  'network-application': {
    id: 'network-application',
    type: 'region',
    displayName: 'Application',
    description: 'Standard application VNet. Hosts a single workload with public/private separation.',
    studsX: 12,
    studsY: 16,
    worldWidth: 12,
    worldDepth: 16,
    worldHeight: 0.7,
    recommendedCapacity: 4,
    exampleCidrs: { azure: '10.1.0.0/20', aws: '10.1.0.0/20', gcp: '10.1.0.0/20' },
    learningLevel: 'intermediate',
    studColors: NETWORK_STUD_COLORS,
  },
  'network-platform': {
    id: 'network-platform',
    type: 'region',
    displayName: 'Platform',
    description: 'Production platform VNet. Multi-tier architecture with several subnet groups.',
    studsX: 16,
    studsY: 20,
    worldWidth: 16,
    worldDepth: 20,
    worldHeight: 0.7,
    recommendedCapacity: 6,
    exampleCidrs: { azure: '10.0.0.0/16', aws: '10.0.0.0/16', gcp: '10.0.0.0/16' },
    learningLevel: 'advanced',
    studColors: NETWORK_STUD_COLORS,
  },
  'network-hub': {
    id: 'network-hub',
    type: 'region',
    displayName: 'Hub',
    description: 'Enterprise hub VNet. Central network for shared services and spoke connections.',
    studsX: 20,
    studsY: 24,
    worldWidth: 20,
    worldDepth: 24,
    worldHeight: 0.7,
    recommendedCapacity: 8,
    exampleCidrs: { azure: '10.0.0.0/8', aws: '10.0.0.0/8', gcp: '10.0.0.0/8' },
    learningLevel: 'expert',
    studColors: NETWORK_STUD_COLORS,
  },
  'subnet-utility': {
    id: 'subnet-utility',
    type: 'subnet',
    displayName: 'Utility',
    description: 'Small utility subnet. Gateway, bastion, or management services.',
    studsX: 4,
    studsY: 6,
    worldWidth: 4,
    worldDepth: 6,
    worldHeight: 0.5,
    recommendedCapacity: 2,
    exampleCidrs: { azure: '10.0.0.0/28', aws: '10.0.0.0/28', gcp: '10.0.0.0/28' },
    learningLevel: 'beginner',
    studColors: PUBLIC_SUBNET_STUD_COLORS, // default; overridden by subnetAccess
  },
  'subnet-service': {
    id: 'subnet-service',
    type: 'subnet',
    displayName: 'Service',
    description: 'Standard service subnet. Hosts a small group of related resources.',
    studsX: 6,
    studsY: 8,
    worldWidth: 6,
    worldDepth: 8,
    worldHeight: 0.5,
    recommendedCapacity: 4,
    exampleCidrs: { azure: '10.0.1.0/26', aws: '10.0.1.0/26', gcp: '10.0.1.0/26' },
    learningLevel: 'intermediate',
    studColors: PUBLIC_SUBNET_STUD_COLORS,
  },
  'subnet-workload': {
    id: 'subnet-workload',
    type: 'subnet',
    displayName: 'Workload',
    description: 'Large workload subnet. Multi-service deployments, compute clusters.',
    studsX: 8,
    studsY: 10,
    worldWidth: 8,
    worldDepth: 10,
    worldHeight: 0.5,
    recommendedCapacity: 6,
    exampleCidrs: { azure: '10.0.2.0/24', aws: '10.0.2.0/24', gcp: '10.0.2.0/24' },
    learningLevel: 'advanced',
    studColors: PUBLIC_SUBNET_STUD_COLORS,
  },
  'subnet-scale': {
    id: 'subnet-scale',
    type: 'subnet',
    displayName: 'Scale',
    description: 'Extra-large scale subnet. AKS/EKS clusters, VMSS, large-scale workloads.',
    studsX: 10,
    studsY: 12,
    worldWidth: 10,
    worldDepth: 12,
    worldHeight: 0.5,
    recommendedCapacity: 8,
    exampleCidrs: { azure: '10.0.4.0/22', aws: '10.0.4.0/22', gcp: '10.0.4.0/22' },
    learningLevel: 'expert',
    studColors: PUBLIC_SUBNET_STUD_COLORS,
  },
};

export const DEFAULT_PLATE_PROFILE: Record<PlateType, PlateProfileId> = {
  global: 'network-hub',
  edge: 'network-sandbox',
  region: 'network-platform',
  zone: 'network-application',
  subnet: 'subnet-service',
};

// ─── Profile Helper Functions ──────────────────────────────

export function getPlateProfile(profileId: PlateProfileId): PlateProfile {
  return PLATE_PROFILES[profileId];
}

export function isPlateProfileId(value: string): value is PlateProfileId {
  return value in PLATE_PROFILES;
}

export function buildPlateSizeFromProfileId(profileId: PlateProfileId): Size {
  const profile = PLATE_PROFILES[profileId];
  return {
    width: profile.worldWidth,
    height: profile.worldHeight,
    depth: profile.worldDepth,
  };
}

interface LegacyPlateShape {
  type: PlateType;
  size: { width: number; depth: number };
}

export function inferLegacyPlateProfileId(legacyPlate: LegacyPlateShape): PlateProfileId {
  const { type, size } = legacyPlate;
  const candidates = Object.values(PLATE_PROFILES).filter((p) => p.type === type);

  // Find exact match first
  const exact = candidates.find(
    (p) => p.worldWidth === size.width && p.worldDepth === size.depth
  );
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

export function getPlateStudColors(plate: { type: PlateType; subnetAccess?: SubnetAccess }): StudColorSpec {
  if (plate.type === 'region') return NETWORK_STUD_COLORS;
  if (plate.type === 'global' || plate.type === 'edge' || plate.type === 'zone') return NETWORK_STUD_COLORS;
  if (plate.subnetAccess === 'public') return PUBLIC_SUBNET_STUD_COLORS;
  return PRIVATE_SUBNET_STUD_COLORS;
}

export const DEFAULT_PLATE_SIZE: Record<PlateType, Size> = {
  global: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.global),
  edge: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.edge),
  region: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.region),
  zone: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.zone),
  subnet: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.subnet),
};

export { type BlockVisualProfile, type BrickSurface, type BrickSilhouette, type BlockTier, type BlockDimensionsCU, BLOCK_VISUAL_PROFILES, TIER_DIMENSIONS, CATEGORY_TIER_MAP, SUBTYPE_SIZE_OVERRIDES, getBlockVisualProfile, getBlockDimensions } from './visualProfile';

// ─── Persona System (M20 §3b) ─────────────────────────────

export type Persona = 'devops' | 'backend' | 'pm' | 'student';
export type ComplexityLevel = 'beginner' | 'standard' | 'advanced';

export const PERSONA_LABELS: Record<Persona, { icon: string; title: string; description: string }> = {
  devops:  { icon: '\u{1F6E0}\u{FE0F}', title: 'DevOps Engineer',     description: 'I deploy and manage infrastructure' },
  backend: { icon: '\u{1F4BB}',          title: 'Backend Developer',   description: 'I design and build applications' },
  pm:      { icon: '\u{1F4CA}',          title: 'Product Manager',     description: 'I review and communicate architecture' },
  student: { icon: '\u{1F393}',          title: 'Student',             description: "I'm learning cloud architecture" },
};

export const PERSONA_COMPLEXITY_MAP: Record<Persona, ComplexityLevel> = {
  devops:  'advanced',
  backend: 'standard',
  pm:      'beginner',
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

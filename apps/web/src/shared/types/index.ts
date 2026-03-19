// CloudBlocks Platform - Core Domain Types
// Based on DOMAIN_MODEL.md §12

// ─── Plate Types ───────────────────────────────────────────

// ─── Layer Hierarchy (v2.0) ────────────────────────────────
export type LayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet' | 'resource';

export const LAYER_HIERARCHY: LayerType[] = ['global', 'edge', 'region', 'zone', 'subnet', 'resource'];

export const VALID_PARENTS: Record<LayerType, LayerType[]> = {
  global: [],           // root level
  edge: [],             // root level
  region: ['global'],   // or root
  zone: ['region'],
  subnet: ['zone', 'region'],
  resource: ['subnet', 'zone', 'region', 'edge', 'global'],
};

export type PlateType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';
export type SubnetAccess = 'public' | 'private';

export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  subnetAccess?: SubnetAccess; // only for subnet type
  profileId?: PlateProfileId;
  parentId: string | null; // null for root plate
  children: string[]; // mixed list: child plate IDs + block IDs (intentional for MVP; consider splitting to childPlateIds/childBlockIds in v1.0)
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

// ─── Block Types ───────────────────────────────────────────

export type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway' | 'function' | 'queue' | 'event' | 'analytics' | 'identity' | 'observability';
export type ProviderType = 'azure' | 'aws' | 'gcp';


// ─── Aggregation (v2.0 §8) ──────────────────────────────────

export type AggregationMode = 'single' | 'count';

export interface Aggregation {
  mode: AggregationMode;
  count: number; // must be >= 1
}

// ─── Role Model (v2.0 §9) ────────────────────────────────────

export type BlockRole = 'primary' | 'secondary' | 'reader' | 'writer' | 'public' | 'private' | 'internal' | 'external';

export const BLOCK_ROLES: readonly BlockRole[] = [
  'primary', 'secondary', 'reader', 'writer', 'public', 'private', 'internal', 'external',
] as const;

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
export interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string; // parent plate ID
  position: Position; // relative to parent plate
  metadata: Record<string, unknown>;
  provider?: ProviderType;
  subtype?: string;
  config?: Record<string, unknown>;
  aggregation?: Aggregation; // v2.0 §8 — multiple identical resources
  roles?: BlockRole[];       // v2.0 §9 — visual-only role indicators
}

// ─── Connection ────────────────────────────────────────────

/**
 * Connection direction represents the **initiator** of the request.
 * Arrow points from the entity that starts communication.
 * Response flows implicitly in the reverse direction.
 */
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  dataflow: 'Data Flow',
  http: 'HTTP',
  internal: 'Internal',
  data: 'Data',
  async: 'Async',
};

export interface Connection {
  id: string;
  sourceId: string; // block or external actor ID (initiator)
  targetId: string; // block or external actor ID (receiver)
  type: ConnectionType;
  metadata: Record<string, unknown>;
}

// ─── External Actor ────────────────────────────────────────

export interface ExternalActor {
  id: string;
  name: string; // e.g., "Internet"
  type: 'internet';
  position: Position;
}

// ─── Spatial ───────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Size {
  width: number;
  height: number;
  depth: number;
}

// ─── Architecture Model (root) ─────────────────────────────

export interface ArchitectureModel {
  id: string;
  name: string;
  version: string; // user-facing architecture revision (not schema version; see schema.ts)
  plates: Plate[];
  blocks: Block[];
  connections: Connection[];
  externalActors: ExternalActor[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Workspace ─────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  architecture: ArchitectureModel;
  createdAt: string;
  updatedAt: string;
  // GitHub integration (optional for backward compatibility)
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  lastSyncAt?: string;
  backendWorkspaceId?: string;
}

// ─── Rule Engine Types ─────────────────────────────────────

export type RuleSeverity = 'error' | 'warning';
export type RuleType = 'placement' | 'connection';

export interface RuleDefinition {
  id: string;
  name: string;
  type: RuleType;
  severity: RuleSeverity;
  description: string;
}

export interface ValidationError {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  suggestion?: string;
  targetId: string; // block or connection ID
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ─── Visual Identity ───────────────────────────────────────

export const BLOCK_COLORS: Record<BlockCategory, string> = {
  compute: '#F25022',        // Azure Red/Orange
  database: '#00A4EF',       // Azure Light Blue
  storage: '#7FBA00',        // Azure Green
  gateway: '#0078D4',        // Azure Blue
  function: '#FFB900',       // Azure Yellow
  queue: '#737373',          // Azure Gray
  event: '#D83B01',          // Azure Orange
  analytics: '#693BC5',      // Azure Purple
  identity: '#D6232C',       // Azure Security Red
  observability: '#693BC5',  // Azure Management Purple
};

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

export const BLOCK_FRIENDLY_NAMES: Record<BlockCategory, string> = {
  gateway: 'App Gateway',
  compute: 'Virtual Machine',
  database: 'SQL Database',
  storage: 'Blob Storage',
  function: 'App Service',
  queue: 'Message Queue',
  event: 'Event Hub',
  analytics: 'Data Analytics',
  identity: 'Identity Service',
  observability: 'Monitoring',
};

export const BLOCK_DESCRIPTIONS: Record<BlockCategory, string> = {
  gateway: 'Routes web traffic to your app',
  compute: 'Runs your application code',
  database: 'Stores structured data in tables',
  storage: 'Stores files, images, and media',
  function: 'Hosts web apps and APIs',
  queue: 'Buffers messages between services',
  event: 'Routes events to subscribers',
  analytics: 'Processes and analyzes large datasets',
  identity: 'Manages authentication and authorization',
  observability: 'Monitors and logs system health',
};

export const BLOCK_ICONS: Record<BlockCategory, string> = {
  gateway: '🛡️',
  compute: '🖥️',
  database: '🗄️',
  storage: '📦',
  function: '⚡',
  queue: '📨',
  event: '🔔',
  analytics: '📊',
  identity: '🔑',
  observability: '📡',
};

export const BLOCK_SHORT_NAMES: Record<BlockCategory, string> = {
  gateway: 'App GW',
  compute: 'VM',
  database: 'SQL DB',
  storage: 'Storage',
  function: 'App Svc',
  queue: 'Queue',
  event: 'Event Hub',
  analytics: 'Analytics',
  identity: 'Identity',
  observability: 'Monitor',
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
  displayNameKo: string;
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
    displayNameKo: '샌드박스',
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
    displayNameKo: '애플리케이션',
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
    displayNameKo: '플랫폼',
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
    displayNameKo: '허브',
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
    displayNameKo: '유틸리티',
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
    displayNameKo: '서비스',
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
    displayNameKo: '워크로드',
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
    displayNameKo: '스케일',
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

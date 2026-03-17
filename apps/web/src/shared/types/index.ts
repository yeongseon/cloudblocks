// CloudBlocks Platform - Core Domain Types
// Based on DOMAIN_MODEL.md §12

// ─── Plate Types ───────────────────────────────────────────

export type PlateType = 'network' | 'subnet';
export type SubnetAccess = 'public' | 'private';

export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  subnetAccess?: SubnetAccess; // only for subnet type
  profileId?: PlateProfileId;
  parentId: string | null; // null for root (network plate)
  children: string[]; // mixed list: child plate IDs + block IDs (intentional for MVP; consider splitting to childPlateIds/childBlockIds in v1.0)
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

// ─── Block Types ───────────────────────────────────────────

export type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway' | 'function' | 'queue' | 'event' | 'timer';

export interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string; // parent plate ID
  position: Position; // relative to parent plate
  metadata: Record<string, unknown>;
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
  compute: '#F25022',   // Azure Red/Orange
  database: '#00A4EF',  // Azure Light Blue
  storage: '#7FBA00',   // Azure Green
  gateway: '#0078D4',   // Azure Blue
  function: '#FFB900',  // Azure Yellow
  queue: '#737373',     // Azure Gray
  event: '#D83B01',     // Azure Orange
  timer: '#5C2D91',     // Azure Purple
};

export const PLATE_COLORS: Record<PlateType, string> = {
  network: '#2563EB',    // Deep blue (VPC)
  subnet: '#93C5FD',     // Light blue (default subnet)
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
  timer: 'Timer',
};

export const BLOCK_DESCRIPTIONS: Record<BlockCategory, string> = {
  gateway: 'Routes web traffic to your app',
  compute: 'Runs your application code',
  database: 'Stores structured data in tables',
  storage: 'Stores files, images, and media',
  function: 'Hosts web apps and APIs',
  queue: 'Buffers messages between services',
  event: 'Routes events to subscribers',
  timer: 'Triggers actions on a schedule',
};

export const BLOCK_ICONS: Record<BlockCategory, string> = {
  gateway: '🛡️',
  compute: '🖥️',
  database: '🗄️',
  storage: '📦',
  function: '⚡',
  queue: '📨',
  event: '🔔',
  timer: '⏰',
};

export const BLOCK_SHORT_NAMES: Record<BlockCategory, string> = {
  gateway: 'App GW',
  compute: 'VM',
  database: 'SQL DB',
  storage: 'Storage',
  function: 'App Svc',
  queue: 'Queue',
  event: 'Event Hub',
  timer: 'Timer',
};

// Stud grid layout per category: [columns, rows]
export const STUD_LAYOUTS: Record<BlockCategory, [number, number]> = {
  timer: [1, 2],
  event: [1, 2],
  function: [2, 2],
  gateway: [2, 4],
  queue: [2, 4],
  storage: [2, 4],
  compute: [3, 4],
  database: [4, 6],
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
  type: PlateType; // 'network' | 'subnet'
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
    type: 'network',
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
    type: 'network',
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
    type: 'network',
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
    type: 'network',
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
  network: 'network-platform',
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
  if (plate.type === 'network') return NETWORK_STUD_COLORS;
  if (plate.subnetAccess === 'public') return PUBLIC_SUBNET_STUD_COLORS;
  return PRIVATE_SUBNET_STUD_COLORS;
}

export const DEFAULT_PLATE_SIZE: Record<PlateType, Size> = {
  network: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.network),
  subnet: buildPlateSizeFromProfileId(DEFAULT_PLATE_PROFILE.subnet),
};

export { type BlockVisualProfile, type BrickSizeTier, type BrickSurface, type BrickSilhouette, BLOCK_VISUAL_PROFILES, getBlockVisualProfile } from './visualProfile';

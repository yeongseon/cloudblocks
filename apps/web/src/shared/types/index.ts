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
 *
 * MVP (v0.1): Only DataFlow is supported.
 */
export type ConnectionType = 'dataflow';

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

export const DEFAULT_PLATE_SIZE: Record<PlateType, Size> = {
  network: { width: 16, height: 0.3, depth: 20 },
  subnet: { width: 6, height: 0.3, depth: 8 },
};

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

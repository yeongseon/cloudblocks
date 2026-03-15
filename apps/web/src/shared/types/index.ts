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
  network: '#0078D4',  // Azure Blue
  subnet: '#E6F2FF',   // Light Azure
};

export const SUBNET_ACCESS_COLORS: Record<SubnetAccess, string> = {
  public: '#00A4EF',   // Light Azure Blue
  private: '#5C2D91',  // Azure Purple
};

// ─── Default Sizes ─────────────────────────────────────────

export const DEFAULT_PLATE_SIZE: Record<PlateType, Size> = {
  network: { width: 12, height: 0.5, depth: 10 },
  subnet: { width: 5, height: 0.35, depth: 8 },
};

export const DEFAULT_BLOCK_SIZE: Size = {
  width: 2.4,
  height: 2.0,
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
  gateway: [3, 2],
  compute: [2, 2],
  database: [1, 3],
  storage: [2, 3],
  function: [1, 1],
  queue: [1, 4],
  event: [1, 2],
  timer: [2, 1],
};


// Cloud Lego Platform - Core Domain Types
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
  children: string[]; // child plate/block IDs
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

// ─── Block Types ───────────────────────────────────────────

export type BlockCategory = 'compute' | 'database' | 'storage' | 'gateway';

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
  version: string;
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
  compute: '#4CAF50', // Green
  database: '#FF9800', // Orange
  storage: '#FFEB3B', // Yellow
  gateway: '#9C27B0', // Purple
};

export const PLATE_COLORS: Record<PlateType, string> = {
  network: '#2196F3', // Blue
  subnet: '#64B5F6', // Light Blue
};

export const SUBNET_ACCESS_COLORS: Record<SubnetAccess, string> = {
  public: '#81C784', // Light Green (public)
  private: '#E57373', // Light Red (private)
};

// ─── Default Sizes ─────────────────────────────────────────

export const DEFAULT_PLATE_SIZE: Record<PlateType, Size> = {
  network: { width: 12, height: 0.3, depth: 10 },
  subnet: { width: 5, height: 0.2, depth: 8 },
};

export const DEFAULT_BLOCK_SIZE: Size = {
  width: 1,
  height: 1,
  depth: 1,
};

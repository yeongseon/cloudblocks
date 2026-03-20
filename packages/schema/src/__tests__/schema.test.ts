import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMA_VERSION } from '../index.js';

// All type re-exports — verify they are importable at runtime
import type {
  AggregationMode,
  ArchitectureModel,
  Block,
  BlockCategory,
  BlockRole,
  Connection,
  ConnectionType,
  ExternalActor,
  LayerType,
  Plate,
  PlateType,
  Position,
  ProviderType,
  Size,
  SubnetAccess,
  Aggregation,
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SCHEMA_VERSION', () => {
  it('should be a semver-formatted string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should be 2.0.0', () => {
    expect(SCHEMA_VERSION).toBe('2.0.0');
  });
});

describe('JSON Schema artifact', () => {
  const schemaPath = resolve(__dirname, '../../dist/architecture-model.schema.json');

  let schema: Record<string, unknown>;

  try {
    const raw = readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    schema = {};
  }

  it('should exist and be valid JSON', () => {
    expect(Object.keys(schema).length).toBeGreaterThan(0);
  });

  it('should reference ArchitectureModel as root', () => {
    expect(schema['$ref']).toBe('#/definitions/ArchitectureModel');
  });

  it('should define all core entities', () => {
    const definitions = schema['definitions'] as Record<string, unknown>;
    expect(definitions).toBeDefined();

    const expectedTypes = [
      'ArchitectureModel',
      'Plate',
      'Block',
      'Connection',
      'ExternalActor',
      'Position',
      'Size',
      'Aggregation',
      'PlateType',
      'SubnetAccess',
      'BlockCategory',
      'ProviderType',
      'AggregationMode',
      'BlockRole',
      'ConnectionType',
    ];

    for (const typeName of expectedTypes) {
      expect(definitions[typeName], `Missing definition: ${typeName}`).toBeDefined();
    }
  });

  it('should define ArchitectureModel with all required fields', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const model = definitions['ArchitectureModel'];
    const required = model['required'] as string[];

    expect(required).toContain('id');
    expect(required).toContain('name');
    expect(required).toContain('version');
    expect(required).toContain('plates');
    expect(required).toContain('blocks');
    expect(required).toContain('connections');
    expect(required).toContain('externalActors');
    expect(required).toContain('createdAt');
    expect(required).toContain('updatedAt');
  });

  it('should define BlockCategory with exactly 10 values', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const blockCategory = definitions['BlockCategory'];
    const enumValues = blockCategory['enum'] as string[];

    expect(enumValues).toHaveLength(10);
    expect(enumValues).toContain('compute');
    expect(enumValues).toContain('database');
    expect(enumValues).toContain('storage');
    expect(enumValues).toContain('gateway');
    expect(enumValues).toContain('function');
    expect(enumValues).toContain('queue');
    expect(enumValues).toContain('event');
    expect(enumValues).toContain('analytics');
    expect(enumValues).toContain('identity');
    expect(enumValues).toContain('observability');
  });

  it('should define PlateType with exactly 5 values (no resource)', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const plateType = definitions['PlateType'];
    const enumValues = plateType['enum'] as string[];

    expect(enumValues).toHaveLength(5);
    expect(enumValues).not.toContain('resource');
  });

  it('should define ConnectionType with exactly 5 values', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const connType = definitions['ConnectionType'];
    const enumValues = connType['enum'] as string[];

    expect(enumValues).toHaveLength(5);
    expect(enumValues).toContain('dataflow');
    expect(enumValues).toContain('http');
    expect(enumValues).toContain('internal');
    expect(enumValues).toContain('data');
    expect(enumValues).toContain('async');
  });

  it('should define ProviderType with exactly 3 values', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const providerType = definitions['ProviderType'];
    const enumValues = providerType['enum'] as string[];

    expect(enumValues).toHaveLength(3);
    expect(enumValues).toContain('azure');
    expect(enumValues).toContain('aws');
    expect(enumValues).toContain('gcp');
  });
});

describe('Type compatibility', () => {
  it('should allow creating a valid ArchitectureModel', () => {
    // This test verifies that the types compile correctly
    // by constructing a valid model. The assignment validates
    // structural compatibility at compile time.
    const model: ArchitectureModel = {
      id: 'test-id',
      name: 'Test Architecture',
      version: '1.0.0',
      plates: [],
      blocks: [],
      connections: [],
      externalActors: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(model.id).toBe('test-id');
  });

  it('should allow creating a valid Plate', () => {
    const plate: Plate = {
      id: 'plate-1',
      name: 'Test Plate',
      type: 'region',
      parentId: null,
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 10, height: 1, depth: 10 },
      metadata: {},
    };
    expect(plate.type).toBe('region');
  });

  it('should allow creating a valid Block', () => {
    const block: Block = {
      id: 'block-1',
      name: 'Test Block',
      category: 'compute',
      placementId: 'plate-1',
      position: { x: 1, y: 0, z: 1 },
      metadata: {},
    };
    expect(block.category).toBe('compute');
  });

  it('should allow creating a valid Connection', () => {
    const conn: Connection = {
      id: 'conn-1',
      sourceId: 'block-1',
      targetId: 'block-2',
      type: 'http',
      metadata: {},
    };
    expect(conn.type).toBe('http');
  });

  it('should allow creating a valid ExternalActor', () => {
    const actor: ExternalActor = {
      id: 'actor-1',
      name: 'Internet',
      type: 'internet',
      position: { x: 0, y: 0, z: 10 },
    };
    expect(actor.type).toBe('internet');
  });

  it('should allow all BlockCategory values', () => {
    const categories: BlockCategory[] = [
      'compute', 'database', 'storage', 'gateway', 'function',
      'queue', 'event', 'analytics', 'identity', 'observability',
    ];
    expect(categories).toHaveLength(10);
  });

  it('should allow all LayerType values including resource', () => {
    const layers: LayerType[] = [
      'global', 'edge', 'region', 'zone', 'subnet', 'resource',
    ];
    expect(layers).toHaveLength(6);
  });

  it('should allow all BlockRole values', () => {
    const roles: BlockRole[] = [
      'primary', 'secondary', 'reader', 'writer',
      'public', 'private', 'internal', 'external',
    ];
    expect(roles).toHaveLength(8);
  });

  it('should allow optional Block fields', () => {
    const block: Block = {
      id: 'block-2',
      name: 'Full Block',
      category: 'database',
      placementId: 'plate-1',
      position: { x: 2, y: 0, z: 2 },
      metadata: { tier: 'premium' },
      provider: 'azure',
      subtype: 'sql',
      config: { sku: 'S1' },
      aggregation: { mode: 'count', count: 3 },
      roles: ['primary', 'writer'],
    };
    expect(block.provider).toBe('azure');
    expect(block.aggregation?.count).toBe(3);
  });

  // Suppress unused-variable warnings for type-only imports
  it('should export all enum types', () => {
    // These type annotations verify compile-time availability
    const _am: AggregationMode = 'single';
    const _pt: PlateType = 'region';
    const _sa: SubnetAccess = 'public';
    const _ct: ConnectionType = 'http';
    const _pvt: ProviderType = 'aws';
    const _br: BlockRole = 'primary';
    const _pos: Position = { x: 0, y: 0, z: 0 };
    const _size: Size = { width: 1, height: 1, depth: 1 };
    const _agg: Aggregation = { mode: 'single', count: 1 };

    expect(_am).toBe('single');
    expect(_pt).toBe('region');
    expect(_sa).toBe('public');
    expect(_ct).toBe('http');
    expect(_pvt).toBe('aws');
    expect(_br).toBe('primary');
    expect(_pos.x).toBe(0);
    expect(_size.width).toBe(1);
    expect(_agg.count).toBe(1);
  });
});

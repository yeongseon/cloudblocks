import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMA_VERSION } from '../index.js';
import { RESOURCE_RULES } from '../rules.js';

// All type re-exports — verify they are importable at runtime
import type {
  AggregationMode,
  ArchitectureModel,
  BlockRole,
  Connection,
  ConnectionType,
  ContainerNode,
  ExternalActor,
  LayerType,
  LeafNode,
  NodeKind,
  Position,
  ProviderType,
  ResourceCategory,
  ResourceNode,
  Size,
  Aggregation,
  // Deprecated aliases — verify still importable during migration
  Block,
  BlockCategory,
  Plate,
  PlateType,
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SCHEMA_VERSION', () => {
  it('should be a semver-formatted string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should be 3.0.0', () => {
    expect(SCHEMA_VERSION).toBe('3.0.0');
  });
});

describe('Resource rule coverage', () => {
  it('RESOURCE_RULES covers all known resource types', () => {
    const knownTypes = Object.keys(RESOURCE_RULES);
    expect(knownTypes.length).toBeGreaterThanOrEqual(30);
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
      'ContainerNode',
      'LeafNode',
      'Connection',
      'ExternalActor',
      'Position',
      'Size',
      'Aggregation',
      'ResourceNode',
      'ResourceCategory',
      'ProviderType',
      'AggregationMode',
      'BlockRole',
      'ConnectionType',
      'LayerType',
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
    expect(required).toContain('nodes');
    expect(required).toContain('connections');
    expect(required).toContain('externalActors');
    expect(required).toContain('createdAt');
    expect(required).toContain('updatedAt');
  });

  it('should define ResourceCategory with exactly 7 values', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const category = definitions['ResourceCategory'];
    const enumValues = category['enum'] as string[];

    expect(enumValues).toHaveLength(7);
    expect(enumValues).toContain('network');
    expect(enumValues).toContain('security');
    expect(enumValues).toContain('edge');
    expect(enumValues).toContain('compute');
    expect(enumValues).toContain('data');
    expect(enumValues).toContain('messaging');
    expect(enumValues).toContain('operations');
  });

  it('should define NodeKind via ContainerNode kind const', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const container = definitions['ContainerNode'];
    const props = container['properties'] as Record<string, Record<string, unknown>>;
    // NodeKind is inlined as a const in the kind property
    expect(props['kind']['const'] ?? props['kind']['enum']).toBeDefined();
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
    const model: ArchitectureModel = {
      id: 'test-id',
      name: 'Test Architecture',
      version: '1.0.0',
      nodes: [],
      connections: [],
      externalActors: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(model.id).toBe('test-id');
  });

  it('should allow creating a valid ContainerNode', () => {
    const container: ContainerNode = {
      id: 'container-1',
      name: 'Test VNet',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      size: { width: 10, height: 1, depth: 10 },
      metadata: {},
    };
    expect(container.kind).toBe('container');
    expect(container.category).toBe('network');
  });

  it('should allow creating a valid LeafNode', () => {
    const leaf: LeafNode = {
      id: 'leaf-1',
      name: 'Test VM',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'vm',
      category: 'compute',
      provider: 'azure',
      parentId: 'container-1',
      position: { x: 1, y: 0, z: 1 },
      metadata: {},
    };
    expect(leaf.kind).toBe('resource');
    expect(leaf.category).toBe('compute');
  });

  it('should allow ResourceNode discriminated union', () => {
    const node: ResourceNode = Math.random() > 0.5
      ? {
          id: 'node-1',
          name: 'Test Node',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'sql_database',
          category: 'data',
          provider: 'azure',
          parentId: 'container-1',
          position: { x: 2, y: 0, z: 2 },
          metadata: {},
        }
      : {
          id: 'container-3',
          name: 'Test Container',
          kind: 'container',
          layer: 'subnet',
          resourceType: 'subnet',
          category: 'network',
          provider: 'azure',
          parentId: 'container-1',
          position: { x: 0, y: 0, z: 0 },
          size: { width: 8, height: 1, depth: 8 },
          metadata: {},
        };

    if (node.kind === 'container') {
      expect(node.size).toBeDefined();
    } else {
      expect(node.kind).toBe('resource');
    }
  });

  it('should allow creating a valid Connection', () => {
    const conn: Connection = {
      id: 'conn-1',
      sourceId: 'node-1',
      targetId: 'node-2',
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

  it('should allow all ResourceCategory values', () => {
    const categories: ResourceCategory[] = [
      'network', 'security', 'edge', 'compute',
      'data', 'messaging', 'operations',
    ];
    expect(categories).toHaveLength(7);
  });

  it('should allow all NodeKind values', () => {
    const kinds: NodeKind[] = ['container', 'resource'];
    expect(kinds).toHaveLength(2);
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

  it('should allow optional node fields', () => {
    const node: LeafNode = {
      id: 'node-2',
      name: 'Full Node',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'sql_database',
      category: 'data',
      provider: 'azure',
      parentId: 'container-1',
      position: { x: 2, y: 0, z: 2 },
      metadata: { tier: 'premium' },
      subtype: 'postgresql',
      config: { sku: 'S1' },
      aggregation: { mode: 'count', count: 3 },
      roles: ['primary', 'writer'],
    };
    expect(node.provider).toBe('azure');
    expect(node.aggregation?.count).toBe(3);
  });

  it('should allow container-specific fields', () => {
    const container: ContainerNode = {
      id: 'container-2',
      name: 'Subnet 1',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'vnet-1',
      position: { x: 0, y: 0, z: 0 },
      size: { width: 8, height: 1, depth: 6 },
      metadata: {},
      profileId: 'subnet-public',
    };
    expect(container.profileId).toBe('subnet-public');
  });

  // Suppress unused-variable warnings for type-only imports
  it('should export all enum types', () => {
    const _am: AggregationMode = 'single';
    const _nk: NodeKind = 'container';
    const _rc: ResourceCategory = 'compute';
    const _ct: ConnectionType = 'http';
    const _pvt: ProviderType = 'aws';
    const _br: BlockRole = 'primary';
    const _pos: Position = { x: 0, y: 0, z: 0 };
    const _size: Size = { width: 1, height: 1, depth: 1 };
    const _agg: Aggregation = { mode: 'single', count: 1 };

    expect(_am).toBe('single');
    expect(_nk).toBe('container');
    expect(_rc).toBe('compute');
    expect(_ct).toBe('http');
    expect(_pvt).toBe('aws');
    expect(_br).toBe('primary');
    expect(_pos.x).toBe(0);
    expect(_size.width).toBe(1);
    expect(_agg.count).toBe(1);
  });

  // Verify deprecated aliases still compile
  it('should support deprecated type aliases during migration', () => {
    // BlockCategory is an alias for ResourceCategory
    const _bc: BlockCategory = 'compute';
    expect(_bc).toBe('compute');

    // PlateType still available
    const _pt: PlateType = 'region';
    expect(_pt).toBe('region');

    // Plate is alias for ContainerNode
    const _plate: Plate = {
      id: 'p1',
      name: 'Legacy Plate',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      size: { width: 10, height: 1, depth: 10 },
      metadata: {},
    };
    expect(_plate.kind).toBe('container');

    // Block is alias for LeafNode
    const _block: Block = {
      id: 'b1',
      name: 'Legacy Block',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'vm',
      category: 'compute',
      provider: 'azure',
      parentId: 'p1',
      position: { x: 1, y: 0, z: 1 },
      metadata: {},
    };
    expect(_block.kind).toBe('resource');
  });
});

describe('Catalog consistency', () => {
  it('RESOURCE_RULES should have valid categories', () => {
    const validCategories = ['network', 'security', 'edge', 'compute', 'data', 'messaging', 'operations'];
    for (const [key, rule] of Object.entries(RESOURCE_RULES)) {
      expect(validCategories, `Invalid category '${rule.category}' for resource '${key}'`).toContain(rule.category);
    }
  });

  it('RESOURCE_RULES allowedParents should reference valid resource types or null', () => {
    const knownTypes = Object.keys(RESOURCE_RULES);
    for (const [key, rule] of Object.entries(RESOURCE_RULES)) {
      for (const parent of rule.allowedParents) {
        if (parent !== null) {
          expect(knownTypes, `Resource '${key}' has unknown parent '${parent}'`).toContain(parent);
        }
      }
    }
  });

  it('container-capable types should include virtual_network and subnet', () => {
    expect(RESOURCE_RULES.virtual_network.containerCapable).toBe(true);
    expect(RESOURCE_RULES.subnet.containerCapable).toBe(true);
  });

  it('all non-container resources should not be container capable', () => {
    const nonContainers = Object.entries(RESOURCE_RULES).filter(
      ([key]) => key !== 'virtual_network' && key !== 'subnet'
    );
    for (const [key, rule] of nonContainers) {
      expect(rule.containerCapable, `Resource '${key}' should not be container-capable`).toBe(false);
    }
  });
});

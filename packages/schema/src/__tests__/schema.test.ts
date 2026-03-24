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
  Block,
  BlockKind,
  BlockRole,
  Connection,
  ConnectionType,
  ContainerBlock,
  Endpoint,
  EndpointDirection,
  EndpointSemantic,
  ExternalActor,
  LayerType,
  LegacyConnection,
  Position,
  ProviderType,
  ResourceBlock,
  ResourceCategory,
  Size,
  Aggregation,
  ContainerLayer,
} from '../index.js';

describe('SCHEMA_VERSION', () => {
  it('should be a semver-formatted string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should be 4.0.0', () => {
    expect(SCHEMA_VERSION).toBe('4.0.0');
  });
});

describe('Resource rule coverage', () => {
  it('RESOURCE_RULES covers all known resource types', () => {
    const knownTypes = Object.keys(RESOURCE_RULES);
    expect(knownTypes.length).toBeGreaterThanOrEqual(30);
  });
});

describe('JSON Schema artifact', () => {
  const schemaPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../dist/architecture-model.schema.json',
  );
  const schema: Record<string, unknown> = JSON.parse(readFileSync(schemaPath, 'utf-8'));

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
      'ContainerBlock',
      'ResourceBlock',
      'Connection',
      'ExternalActor',
      'Position',
      'Size',
      'Aggregation',
      'Block',
      'ResourceCategory',
      'ProviderType',
      'AggregationMode',
      'BlockRole',
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
    expect(required).toContain('createdAt');
    expect(required).toContain('updatedAt');
  });

  it('should define ResourceCategory with exactly 8 values', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const category = definitions['ResourceCategory'];
    const enumValues = category['enum'] as string[];

    expect(enumValues).toHaveLength(8);
    expect(enumValues).toContain('network');
    expect(enumValues).toContain('delivery');
    expect(enumValues).toContain('compute');
    expect(enumValues).toContain('data');
    expect(enumValues).toContain('messaging');
    expect(enumValues).toContain('security');
    expect(enumValues).toContain('identity');
    expect(enumValues).toContain('operations');
  });

  it('should define BlockKind via ContainerBlock kind const', () => {
    const definitions = schema['definitions'] as Record<string, Record<string, unknown>>;
    const container = definitions['ContainerBlock'];
    const props = container['properties'] as Record<string, Record<string, unknown>>;
    // BlockKind is inlined as a const in the kind property
    expect(props['kind']['const'] ?? props['kind']['enum']).toBeDefined();
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
      endpoints: [],
      connections: [],
      externalActors: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(model.id).toBe('test-id');
  });

  it('should allow creating a valid ContainerBlock', () => {
    const container: ContainerBlock = {
      id: 'container-1',
      name: 'Test VNet',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 10, height: 1, depth: 10 },
      metadata: {},
    };
    expect(container.kind).toBe('container');
    expect(container.category).toBe('network');
  });

  it('should allow creating a valid ResourceBlock', () => {
    const leaf: ResourceBlock = {
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

  it('should allow Block discriminated union', () => {
    const block: Block =
      Math.random() > 0.5
        ? {
            id: 'block-1',
            name: 'Test Block',
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
            frame: { width: 8, height: 1, depth: 8 },
            metadata: {},
          };

    if (block.kind === 'container') {
      expect(block.frame).toBeDefined();
    } else {
      expect(block.kind).toBe('resource');
    }
  });

  it('should allow creating a valid Connection', () => {
    const conn: Connection = {
      id: 'conn-1',
      from: 'endpoint-block-1-output-http',
      to: 'endpoint-block-2-input-http',
      metadata: {},
    };
    expect(conn.from).toBe('endpoint-block-1-output-http');
  });

  it('should allow creating a valid Endpoint', () => {
    const endpoint: Endpoint = {
      id: 'endpoint-block-1-output-http',
      blockId: 'block-1',
      direction: 'output',
      semantic: 'http',
    };
    expect(endpoint.direction).toBe('output');
  });

  it('should allow creating a valid LegacyConnection', () => {
    const legacy: LegacyConnection = {
      id: 'legacy-conn-1',
      sourceId: 'block-1',
      targetId: 'block-2',
      type: 'dataflow',
      metadata: {},
      sourcePort: 1,
      targetPort: 0,
    };
    expect(legacy.type).toBe('dataflow');
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
      'network',
      'delivery',
      'compute',
      'data',
      'messaging',
      'security',
      'identity',
      'operations',
    ];
    expect(categories).toHaveLength(8);
  });

  it('should allow all BlockKind values', () => {
    const kinds: BlockKind[] = ['container', 'resource'];
    expect(kinds).toHaveLength(2);
  });

  it('should allow all LayerType values including resource', () => {
    const layers: LayerType[] = ['global', 'edge', 'region', 'zone', 'subnet', 'resource'];
    expect(layers).toHaveLength(6);
  });

  it('should allow all BlockRole values', () => {
    const roles: BlockRole[] = [
      'primary',
      'secondary',
      'reader',
      'writer',
      'public',
      'private',
      'internal',
      'external',
    ];
    expect(roles).toHaveLength(8);
  });

  it('should allow optional block fields', () => {
    const block: ResourceBlock = {
      id: 'block-2',
      name: 'Full Block',
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
    expect(block.provider).toBe('azure');
    expect(block.aggregation?.count).toBe(3);
  });

  it('should allow container-specific fields', () => {
    const container: ContainerBlock = {
      id: 'container-2',
      name: 'Subnet 1',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'vnet-1',
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 8, height: 1, depth: 6 },
      metadata: {},
      profileId: 'subnet-public',
    };
    expect(container.profileId).toBe('subnet-public');
  });

  // Suppress unused-variable warnings for type-only imports
  it('should export all enum types', () => {
    const _am: AggregationMode = 'single';
    const _bk: BlockKind = 'container';
    const _rc: ResourceCategory = 'compute';
    const _ct: ConnectionType = 'http';
    const _ed: EndpointDirection = 'input';
    const _es: EndpointSemantic = 'event';
    const _pvt: ProviderType = 'aws';
    const _br: BlockRole = 'primary';
    const _pos: Position = { x: 0, y: 0, z: 0 };
    const _size: Size = { width: 1, height: 1, depth: 1 };
    const _agg: Aggregation = { mode: 'single', count: 1 };

    expect(_am).toBe('single');
    expect(_bk).toBe('container');
    expect(_rc).toBe('compute');
    expect(_ct).toBe('http');
    expect(_ed).toBe('input');
    expect(_es).toBe('event');
    expect(_pvt).toBe('aws');
    expect(_br).toBe('primary');
    expect(_pos.x).toBe(0);
    expect(_size.width).toBe(1);
    expect(_agg.count).toBe(1);
  });

  it('should export ContainerLayer type', () => {
    const _cl: ContainerLayer = 'region';
    expect(_cl).toBe('region');
  });
});

describe('Catalog consistency', () => {
  it('RESOURCE_RULES should have valid categories', () => {
    const validCategories = [
      'network',
      'delivery',
      'compute',
      'data',
      'messaging',
      'security',
      'identity',
      'operations',
    ];
    for (const [key, rule] of Object.entries(RESOURCE_RULES)) {
      expect(
        validCategories,
        `Invalid category '${rule.category}' for resource '${key}'`,
      ).toContain(rule.category);
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
      ([key]) => key !== 'virtual_network' && key !== 'subnet',
    );
    for (const [key, rule] of nonContainers) {
      expect(rule.containerCapable, `Resource '${key}' should not be container-capable`).toBe(
        false,
      );
    }
  });
});

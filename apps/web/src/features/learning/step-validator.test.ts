import { describe, it, expect } from 'vitest';
import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import type { StepValidationRule } from '../../shared/types/learning';
import { evaluateRule, evaluateRules } from './step-validator';
import { endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';

const createTestModel = (): ArchitectureModel => ({
  id: 'arch-test',
  name: 'Test Architecture',
  version: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nodes: [
    {
      id: 'container-vnet',
      name: 'VNet',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'container-public',
      name: 'Subnet 1',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'container-vnet',
      position: { x: -3, y: 0.3, z: 0 },
      frame: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'container-private',
      name: 'Subnet 2',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'container-vnet',
      position: { x: 3, y: 0.3, z: 0 },
      frame: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'block-gw',
      name: 'Gateway',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'load_balancer',
      category: 'delivery',
      provider: 'azure',
      parentId: 'container-public',
      position: { x: -1.5, y: 0.5, z: -2 },
      metadata: {},
    },
    {
      id: 'block-compute',
      name: 'App',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'azure',
      parentId: 'container-public',
      position: { x: 1.5, y: 0.5, z: 1 },
      metadata: {},
    },
    {
      id: 'block-db',
      name: 'DB',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'relational_database',
      category: 'data',
      provider: 'azure',
      parentId: 'container-private',
      position: { x: 0, y: 0.5, z: 0 },
      metadata: {},
    },
  ],
  connections: [
    {
      id: 'conn-inet-gw',
      from: endpointId('ext-internet', 'output', 'data'),
      to: endpointId('block-gw', 'input', 'data'),
      metadata: {},
    },
    {
      id: 'conn-gw-compute',
      from: endpointId('block-gw', 'output', 'data'),
      to: endpointId('block-compute', 'input', 'data'),
      metadata: {},
    },
    {
      id: 'conn-compute-db',
      from: endpointId('block-compute', 'output', 'data'),
      to: endpointId('block-db', 'input', 'data'),
      metadata: {},
    },
  ],
  endpoints: [
    ...generateEndpointsForBlock('container-vnet'),
    ...generateEndpointsForBlock('container-public'),
    ...generateEndpointsForBlock('container-private'),
    ...generateEndpointsForBlock('block-gw'),
    ...generateEndpointsForBlock('block-compute'),
    ...generateEndpointsForBlock('block-db'),
    ...generateEndpointsForBlock('ext-internet'),
  ],
  externalActors: [
    { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
  ],
});

const getContainers = (model: ArchitectureModel): ContainerBlock[] =>
  model.nodes.filter((node): node is ContainerBlock => node.kind === 'container');

const getResources = (model: ArchitectureModel): ResourceBlock[] =>
  model.nodes.filter((node): node is ResourceBlock => node.kind === 'resource');

describe('evaluateRule', () => {
  describe('container-exists', () => {
    it('finds network container', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'container-exists', containerLayer: 'region' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds subnet container', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'container-exists', containerLayer: 'subnet' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when requested container type does not exist in model', () => {
      const model = createTestModel();
      const noNetworkModel: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model).filter((container) => container.layer === 'subnet'),
          ...getResources(model),
        ],
      };
      const rule: StepValidationRule = { type: 'container-exists', containerLayer: 'region' };
      expect(evaluateRule(rule, noNetworkModel)).toBe(false);
    });
  });

  describe('block-exists', () => {
    it('finds gateway block', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'delivery' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds compute block on subnet container', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'compute',
        onContainerLayer: 'subnet',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds database block on subnet', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'data',
        onContainerLayer: 'subnet',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for non-existent block category in model', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'operations' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails for block on wrong container type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'data',
        onContainerLayer: 'region',
      };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when block placement container is missing', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model),
          ...getResources(model).map((block) =>
            block.id === 'block-compute' ? { ...block, parentId: 'missing-container' } : block,
          ),
        ],
      };
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'compute',
        onContainerLayer: 'subnet',
      };
      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });
  });

  describe('connection-exists', () => {
    it('finds internet to gateway connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'internet',
        targetCategory: 'delivery',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds gateway to compute connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'delivery',
        targetCategory: 'compute',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds compute to database connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'compute',
        targetCategory: 'data',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for non-existent connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'data',
        targetCategory: 'delivery',
      };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when connection endpoint cannot be resolved', () => {
      const model = createTestModel();
      const unresolvedEndpointModel: ArchitectureModel = {
        ...model,
        connections: [
          ...model.connections,
          {
            id: 'conn-unknown-compute',
            from: endpointId('unknown-source', 'output', 'data'),
            to: endpointId('block-compute', 'input', 'data'),
            metadata: {},
          },
        ],
      };

      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'internet',
        targetCategory: 'compute',
      };

      expect(evaluateRule(rule, unresolvedEndpointModel)).toBe(false);
    });
  });

  describe('entity-on-container', () => {
    it('finds gateway on subnet container', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-container',
        entityCategory: 'delivery',
        containerLayer: 'subnet',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds database on subnet', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-container',
        entityCategory: 'data',
        containerLayer: 'subnet',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when entity is not on specified container type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-container',
        entityCategory: 'data',
        containerLayer: 'region',
      };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when entity placement container cannot be found', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model),
          ...getResources(model).map((block) =>
            block.id === 'block-db' ? { ...block, parentId: 'missing-container' } : block,
          ),
        ],
      };
      const rule: StepValidationRule = {
        type: 'entity-on-container',
        entityCategory: 'data',
        containerLayer: 'subnet',
      };

      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });
  });

  describe('architecture-valid', () => {
    it('passes for valid architecture', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'architecture-valid' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for architecture with placement errors', () => {
      const model = createTestModel();
      const invalidModel: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model),
          ...getResources(model).map((block) =>
            block.id === 'block-gw' ? { ...block, parentId: 'container-vnet' } : block,
          ),
        ],
      };
      const rule: StepValidationRule = { type: 'architecture-valid' };
      expect(evaluateRule(rule, invalidModel)).toBe(false);
    });
  });

  describe('min-block-count', () => {
    it('passes when count is met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-block-count', category: 'delivery', count: 1 };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when count is not met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-block-count', category: 'delivery', count: 2 };
      expect(evaluateRule(rule, model)).toBe(false);
    });
  });

  describe('min-container-count', () => {
    it('passes when count is met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'min-container-count',
        containerLayer: 'region',
        count: 1,
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when count is not met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'min-container-count',
        containerLayer: 'subnet',
        count: 3,
      };
      expect(evaluateRule(rule, model)).toBe(false);
    });
  });

  it('returns false for unknown rule type at runtime', () => {
    const model = createTestModel();
    const unknownRule = { type: 'unknown-rule' } as unknown as StepValidationRule;

    expect(evaluateRule(unknownRule, model)).toBe(false);
  });
});

describe('evaluateRules', () => {
  it('passes when all rules pass', () => {
    const model = createTestModel();
    const rules: StepValidationRule[] = [
      { type: 'container-exists', containerLayer: 'region' },
      { type: 'block-exists', category: 'delivery' },
      { type: 'connection-exists', sourceCategory: 'compute', targetCategory: 'data' },
      { type: 'architecture-valid' },
    ];

    const result = evaluateRules(rules, model);

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(4);
    expect(result.results.every((entry) => entry.passed)).toBe(true);
  });

  it('fails when some rules fail and keeps result order', () => {
    const model = createTestModel();
    const rules: StepValidationRule[] = [
      { type: 'container-exists', containerLayer: 'region' },
      { type: 'min-block-count', category: 'delivery', count: 2 },
      { type: 'connection-exists', sourceCategory: 'data', targetCategory: 'delivery' },
    ];

    const result = evaluateRules(rules, model);

    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].passed).toBe(true);
    expect(result.results[1].passed).toBe(false);
    expect(result.results[2].passed).toBe(false);
    expect(result.results[0].rule).toEqual(rules[0]);
    expect(result.results[1].rule).toEqual(rules[1]);
    expect(result.results[2].rule).toEqual(rules[2]);
  });

  it('passes for empty rule array', () => {
    const model = createTestModel();
    const result = evaluateRules([], model);

    expect(result.passed).toBe(true);
    expect(result.results).toEqual([]);
  });
});

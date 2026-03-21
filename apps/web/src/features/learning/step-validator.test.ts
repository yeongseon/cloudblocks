import { describe, it, expect } from 'vitest';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import type { StepValidationRule } from '../../shared/types/learning';
import { evaluateRule, evaluateRules } from './step-validator';

const createTestModel = (): ArchitectureModel => ({
  id: 'arch-test',
  name: 'Test Architecture',
  version: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nodes: [
    {
      id: 'plate-vnet',
      name: 'VNet',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-public',
      name: 'Public Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      subnetAccess: 'public',
      parentId: 'plate-vnet',
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'plate-private',
      name: 'Private Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      subnetAccess: 'private',
      parentId: 'plate-vnet',
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'block-gw',
      name: 'Gateway',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'load_balancer',
      category: 'edge',
      provider: 'azure',
      parentId: 'plate-public',
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
      parentId: 'plate-public',
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
      parentId: 'plate-private',
      position: { x: 0, y: 0.5, z: 0 },
      metadata: {},
    },
  ],
  connections: [
    {
      id: 'conn-inet-gw',
      sourceId: 'ext-internet',
      targetId: 'block-gw',
      type: 'dataflow',
      metadata: {},
    },
    {
      id: 'conn-gw-compute',
      sourceId: 'block-gw',
      targetId: 'block-compute',
      type: 'dataflow',
      metadata: {},
    },
    {
      id: 'conn-compute-db',
      sourceId: 'block-compute',
      targetId: 'block-db',
      type: 'dataflow',
      metadata: {},
    },
  ],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
});

const getContainers = (model: ArchitectureModel): ContainerNode[] =>
  model.nodes.filter((node): node is ContainerNode => node.kind === 'container');

const getResources = (model: ArchitectureModel): LeafNode[] =>
  model.nodes.filter((node): node is LeafNode => node.kind === 'resource');

describe('evaluateRule', () => {
  describe('plate-exists', () => {
    it('finds network plate', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'region' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds subnet plate with public subnetAccess', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when requested plate type does not exist in model', () => {
      const model = createTestModel();
      const noNetworkModel: ArchitectureModel = {
        ...model,
        nodes: [...getContainers(model).filter((plate) => plate.layer === 'subnet'), ...getResources(model)],
      };
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'region' };
      expect(evaluateRule(rule, noNetworkModel)).toBe(false);
    });

    it('fails for wrong subnetAccess', () => {
      const model = createTestModel();
      const onlyPublicModel: ArchitectureModel = {
        ...model,
        nodes: [...getContainers(model).filter((plate) => plate.id !== 'plate-private'), ...getResources(model)],
      };
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' };
      expect(evaluateRule(rule, onlyPublicModel)).toBe(false);
    });
  });

  describe('block-exists', () => {
    it('finds gateway block', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'edge' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds compute block on subnet plate', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'compute', onPlateType: 'subnet' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds database block on private subnet', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'data',
        onPlateType: 'subnet',
        onSubnetAccess: 'private',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for non-existent block category in model', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'operations' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails for block on wrong plate type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'data', onPlateType: 'region' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when block placement plate is missing', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model),
          ...getResources(model).map((block) =>
            block.id === 'block-compute' ? { ...block, parentId: 'missing-plate' } : block
          ),
        ],
      };
      const rule: StepValidationRule = { type: 'block-exists', category: 'compute', onPlateType: 'subnet' };
      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });

    it('fails when block is on subnet with different access than required', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'data',
        onPlateType: 'subnet',
        onSubnetAccess: 'public',
      };
      expect(evaluateRule(rule, model)).toBe(false);
    });
  });

  describe('connection-exists', () => {
    it('finds internet to gateway connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'internet',
        targetCategory: 'edge',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds gateway to compute connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'edge',
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
        targetCategory: 'edge',
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
            sourceId: 'unknown-source',
            targetId: 'block-compute',
            type: 'dataflow',
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

  describe('entity-on-plate', () => {
    it('finds gateway on subnet plate', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'entity-on-plate', entityCategory: 'edge', plateType: 'subnet' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds database on private subnet', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'data',
        plateType: 'subnet',
        subnetAccess: 'private',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when entity is not on specified plate type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'entity-on-plate', entityCategory: 'data', plateType: 'region' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when entity placement plate cannot be found', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        nodes: [
          ...getContainers(model),
          ...getResources(model).map((block) =>
            block.id === 'block-db' ? { ...block, parentId: 'missing-plate' } : block
          ),
        ],
      };
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'data',
        plateType: 'subnet',
      };

      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });

    it('fails when entity subnet access does not match requirement', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'data',
        plateType: 'subnet',
        subnetAccess: 'public',
      };

      expect(evaluateRule(rule, model)).toBe(false);
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
            block.id === 'block-gw' ? { ...block, parentId: 'plate-private' } : block
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
      const rule: StepValidationRule = { type: 'min-block-count', category: 'edge', count: 1 };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when count is not met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-block-count', category: 'edge', count: 2 };
      expect(evaluateRule(rule, model)).toBe(false);
    });
  });

  describe('min-plate-count', () => {
    it('passes when count is met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-plate-count', plateType: 'region', count: 1 };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when count is not met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-plate-count', plateType: 'subnet', count: 3 };
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
      { type: 'plate-exists', plateType: 'region' },
      { type: 'block-exists', category: 'edge' },
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
      { type: 'plate-exists', plateType: 'region' },
      { type: 'min-block-count', category: 'edge', count: 2 },
      { type: 'connection-exists', sourceCategory: 'data', targetCategory: 'edge' },
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

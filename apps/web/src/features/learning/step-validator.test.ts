import { describe, it, expect } from 'vitest';
import type { ArchitectureModel } from '../../shared/types/index';
import type { StepValidationRule } from '../../shared/types/learning';
import { evaluateRule, evaluateRules } from './step-validator';

const createTestModel = (): ArchitectureModel => ({
  id: 'arch-test',
  name: 'Test Architecture',
  version: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  plates: [
    {
      id: 'plate-vnet',
      name: 'VNet',
      type: 'network',
      parentId: null,
      children: ['plate-public', 'plate-private'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-public',
      name: 'Public Subnet',
      type: 'subnet',
      subnetAccess: 'public',
      parentId: 'plate-vnet',
      children: ['block-gw', 'block-compute'],
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'plate-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-vnet',
      children: ['block-db'],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [
    {
      id: 'block-gw',
      name: 'Gateway',
      category: 'gateway',
      placementId: 'plate-public',
      position: { x: -1.5, y: 0.5, z: -2 },
      metadata: {},
    },
    {
      id: 'block-compute',
      name: 'App',
      category: 'compute',
      placementId: 'plate-public',
      position: { x: 1.5, y: 0.5, z: 1 },
      metadata: {},
    },
    {
      id: 'block-db',
      name: 'DB',
      category: 'database',
      placementId: 'plate-private',
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

describe('evaluateRule', () => {
  describe('plate-exists', () => {
    it('finds network plate', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'network' };
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
        plates: model.plates.filter((plate) => plate.type === 'subnet'),
      };
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'network' };
      expect(evaluateRule(rule, noNetworkModel)).toBe(false);
    });

    it('fails for wrong subnetAccess', () => {
      const model = createTestModel();
      const onlyPublicModel: ArchitectureModel = {
        ...model,
        plates: model.plates.filter((plate) => plate.id !== 'plate-private'),
      };
      const rule: StepValidationRule = { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' };
      expect(evaluateRule(rule, onlyPublicModel)).toBe(false);
    });
  });

  describe('block-exists', () => {
    it('finds gateway block', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'gateway' };
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
        category: 'database',
        onPlateType: 'subnet',
        onSubnetAccess: 'private',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for non-existent block category in model', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'storage' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails for block on wrong plate type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'block-exists', category: 'database', onPlateType: 'network' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when block placement plate is missing', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        blocks: model.blocks.map((block) =>
          block.id === 'block-compute' ? { ...block, placementId: 'missing-plate' } : block
        ),
      };
      const rule: StepValidationRule = { type: 'block-exists', category: 'compute', onPlateType: 'subnet' };
      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });

    it('fails when block is on subnet with different access than required', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'block-exists',
        category: 'database',
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
        targetCategory: 'gateway',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds gateway to compute connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'gateway',
        targetCategory: 'compute',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds compute to database connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'compute',
        targetCategory: 'database',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails for non-existent connection', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'connection-exists',
        sourceCategory: 'database',
        targetCategory: 'gateway',
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
      const rule: StepValidationRule = { type: 'entity-on-plate', entityCategory: 'gateway', plateType: 'subnet' };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('finds database on private subnet', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'database',
        plateType: 'subnet',
        subnetAccess: 'private',
      };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when entity is not on specified plate type', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'entity-on-plate', entityCategory: 'database', plateType: 'network' };
      expect(evaluateRule(rule, model)).toBe(false);
    });

    it('fails when entity placement plate cannot be found', () => {
      const model = createTestModel();
      const modelWithMissingPlacement: ArchitectureModel = {
        ...model,
        blocks: model.blocks.map((block) =>
          block.id === 'block-db' ? { ...block, placementId: 'missing-plate' } : block
        ),
      };
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'database',
        plateType: 'subnet',
      };

      expect(evaluateRule(rule, modelWithMissingPlacement)).toBe(false);
    });

    it('fails when entity subnet access does not match requirement', () => {
      const model = createTestModel();
      const rule: StepValidationRule = {
        type: 'entity-on-plate',
        entityCategory: 'database',
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
        blocks: model.blocks.map((block) =>
          block.id === 'block-gw' ? { ...block, placementId: 'plate-private' } : block
        ),
      };
      const rule: StepValidationRule = { type: 'architecture-valid' };
      expect(evaluateRule(rule, invalidModel)).toBe(false);
    });
  });

  describe('min-block-count', () => {
    it('passes when count is met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-block-count', category: 'gateway', count: 1 };
      expect(evaluateRule(rule, model)).toBe(true);
    });

    it('fails when count is not met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-block-count', category: 'gateway', count: 2 };
      expect(evaluateRule(rule, model)).toBe(false);
    });
  });

  describe('min-plate-count', () => {
    it('passes when count is met', () => {
      const model = createTestModel();
      const rule: StepValidationRule = { type: 'min-plate-count', plateType: 'network', count: 1 };
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
      { type: 'plate-exists', plateType: 'network' },
      { type: 'block-exists', category: 'gateway' },
      { type: 'connection-exists', sourceCategory: 'compute', targetCategory: 'database' },
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
      { type: 'plate-exists', plateType: 'network' },
      { type: 'min-block-count', category: 'gateway', count: 2 },
      { type: 'connection-exists', sourceCategory: 'database', targetCategory: 'gateway' },
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

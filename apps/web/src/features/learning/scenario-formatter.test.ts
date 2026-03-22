import { describe, it, expect } from 'vitest';
import type { Scenario, ScenarioStep, ArchitectureSnapshot } from '../../shared/types/learning';
import type { ContainerNode } from '@cloudblocks/schema';
import { formatScenarioForProvider } from './scenario-formatter';

// ─── Test Fixtures ───────────────────────────────────────

const createSnapshot = (plateName = 'VNet'): ArchitectureSnapshot => ({
  name: 'Test Architecture',
  version: '1',
  nodes: [
    {
      id: 'plate-vnet',
      name: plateName,
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
      name: 'Subnet 1',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'plate-vnet',
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ] as ContainerNode[],
  connections: [],
  endpoints: [],
  externalActors: [],
});

const createStep = (overrides: Partial<ScenarioStep> = {}): ScenarioStep => ({
  id: 'step-1',
  order: 1,
  title: 'Create a VNet',
  instruction: 'Place a Virtual Network (VNet) plate on the canvas.',
  hints: [
    'Look for the VNet option in the palette.',
    'A VNet provides network isolation for your resources.',
  ],
  validationRules: [{ type: 'plate-exists', plateType: 'region' }],
  ...overrides,
});

const createScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  id: 'test-scenario',
  name: 'Test Scenario',
  description: 'Learn to build a VNet with subnets.',
  difficulty: 'beginner',
  category: 'web-application',
  tags: ['networking'],
  estimatedMinutes: 10,
  steps: [createStep()],
  initialArchitecture: createSnapshot(),
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────

describe('formatScenarioForProvider', () => {
  describe('azure provider (passthrough)', () => {
    it('returns the scenario unchanged', () => {
      const scenario = createScenario();
      const result = formatScenarioForProvider(scenario, 'azure');
      expect(result).toBe(scenario); // reference equality — no cloning
    });
  });

  describe('aws provider', () => {
    it('substitutes VNet → VPC in description', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      expect(result.description).toBe('Learn to build a VPC with subnets.');
    });

    it('substitutes long-form "Virtual Network (VNet)" → "Virtual Private Cloud (VPC)" in instructions', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      expect(result.steps[0].instruction).toBe(
        'Place a Virtual Private Cloud (VPC) plate on the canvas.',
      );
    });

    it('substitutes VNet in step title', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      expect(result.steps[0].title).toBe('Create a VPC');
    });

    it('substitutes VNet in hints', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      expect(result.steps[0].hints[0]).toBe('Look for the VPC option in the palette.');
      expect(result.steps[0].hints[1]).toBe('A VPC provides network isolation for your resources.');
    });

    it('adapts plate names in initialArchitecture snapshot', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      const containers = result.initialArchitecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
      expect(containers[0]?.name).toBe('VPC');
      // Non-VNet plate names should remain unchanged
      expect(containers[1]?.name).toBe('Subnet 1');
    });

    it('adapts plate names in step checkpoint snapshots', () => {
      const scenario = createScenario({
        steps: [createStep({ checkpoint: createSnapshot() })],
      });
      const result = formatScenarioForProvider(scenario, 'aws');
      const checkpointContainers = result.steps[0].checkpoint?.nodes.filter((node): node is ContainerNode => node.kind === 'container');
      expect(checkpointContainers?.[0]?.name).toBe('VPC');
    });

    it('preserves plate IDs (internal identifiers unchanged)', () => {
      const result = formatScenarioForProvider(createScenario(), 'aws');
      const containers = result.initialArchitecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
      expect(containers[0]?.id).toBe('plate-vnet');
    });

    it('does NOT modify validation rules', () => {
      const scenario = createScenario();
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.steps[0].validationRules).toEqual(scenario.steps[0].validationRules);
    });
  });

  describe('gcp provider', () => {
    it('substitutes VNet → VPC in description', () => {
      const result = formatScenarioForProvider(createScenario(), 'gcp');
      expect(result.description).toBe('Learn to build a VPC with subnets.');
    });

    it('substitutes long-form "Virtual Network (VNet)" → "VPC Network" in instructions', () => {
      const result = formatScenarioForProvider(createScenario(), 'gcp');
      expect(result.steps[0].instruction).toBe(
        'Place a VPC Network plate on the canvas.',
      );
    });

    it('substitutes VNet in step title', () => {
      const result = formatScenarioForProvider(createScenario(), 'gcp');
      expect(result.steps[0].title).toBe('Create a VPC');
    });

    it('adapts plate names in initialArchitecture snapshot', () => {
      const result = formatScenarioForProvider(createScenario(), 'gcp');
      const containers = result.initialArchitecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
      expect(containers[0]?.name).toBe('VPC');
    });

    it('does NOT modify validation rules', () => {
      const scenario = createScenario();
      const result = formatScenarioForProvider(scenario, 'gcp');
      expect(result.steps[0].validationRules).toEqual(scenario.steps[0].validationRules);
    });
  });

  describe('edge cases', () => {
    it('handles "a virtual network" (lowercase) substitution for AWS', () => {
      const scenario = createScenario({
        description: 'Deploy resources inside a virtual network.',
      });
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.description).toBe('Deploy resources inside a VPC.');
    });

    it('handles steps without checkpoints', () => {
      const scenario = createScenario({
        steps: [createStep({ checkpoint: undefined })],
      });
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.steps[0].checkpoint).toBeUndefined();
    });

    it('handles multiple VNet references in a single string', () => {
      const scenario = createScenario({
        description: 'Create a VNet, add subnets to the VNet, then verify the VNet.',
      });
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.description).toBe(
        'Create a VPC, add subnets to the VPC, then verify the VPC.',
      );
    });

    it('preserves non-VNet text unchanged', () => {
      const scenario = createScenario({
        description: 'Add a compute block to the subnet.',
      });
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.description).toBe('Add a compute block to the subnet.');
    });

    it('preserves scenario metadata (id, name, difficulty, etc.)', () => {
      const scenario = createScenario();
      const result = formatScenarioForProvider(scenario, 'aws');
      expect(result.id).toBe(scenario.id);
      expect(result.name).toBe(scenario.name);
      expect(result.difficulty).toBe(scenario.difficulty);
      expect(result.category).toBe(scenario.category);
      expect(result.tags).toEqual(scenario.tags);
      expect(result.estimatedMinutes).toBe(scenario.estimatedMinutes);
    });
  });
});

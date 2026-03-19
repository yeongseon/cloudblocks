import { beforeEach, describe, expect, it } from 'vitest';
import type { Scenario } from '../../../shared/types/learning';
import {
  clearScenarioRegistry,
  getScenario,
  listScenarios,
  listScenariosByDifficulty,
  registerScenario,
  searchScenarios,
} from './registry';

const scenarioA: Scenario = {
  id: 'scenario-a',
  name: 'Network Basics',
  description: 'Build a starter network and subnet layout.',
  difficulty: 'beginner',
  category: 'general',
  tags: ['network', 'starter'],
  estimatedMinutes: 5,
  initialArchitecture: {
    name: 'A',
    version: '1',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [],
  },
  steps: [
    {
      id: 'a-step-1',
      order: 1,
      title: 'Add VNet',
      instruction: 'Create one VNet plate',
      hints: ['Use Infra tab'],
      validationRules: [{ type: 'plate-exists', plateType: 'region' }],
    },
  ],
};

const scenarioB: Scenario = {
  id: 'scenario-b',
  name: 'Serverless Flow',
  description: 'Connect HTTP entry to compute.',
  difficulty: 'intermediate',
  category: 'serverless',
  tags: ['api', 'event-driven'],
  estimatedMinutes: 12,
  initialArchitecture: {
    name: 'B',
    version: '1',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [],
  },
  steps: [
    {
      id: 'b-step-1',
      order: 1,
      title: 'Add compute',
      instruction: 'Create compute block',
      hints: ['Use Compute tab'],
      validationRules: [{ type: 'block-exists', category: 'compute' }],
    },
  ],
};

describe('scenario registry', () => {
  beforeEach(() => {
    clearScenarioRegistry();
  });

  it('registers and fetches scenarios by id', () => {
    registerScenario(scenarioA);

    expect(getScenario('scenario-a')).toEqual(scenarioA);
    expect(getScenario('missing')).toBeUndefined();
  });

  it('lists scenarios and filters by difficulty', () => {
    registerScenario(scenarioA);
    registerScenario(scenarioB);

    expect(listScenarios()).toEqual([scenarioA, scenarioB]);
    expect(listScenariosByDifficulty('beginner')).toEqual([scenarioA]);
    expect(listScenariosByDifficulty('intermediate')).toEqual([scenarioB]);
    expect(listScenariosByDifficulty('advanced')).toEqual([]);
  });

  it('searches by name, description, and tags case-insensitively', () => {
    registerScenario(scenarioA);
    registerScenario(scenarioB);

    expect(searchScenarios('network')).toEqual([scenarioA]);
    expect(searchScenarios('HTTP ENTRY')).toEqual([scenarioB]);
    expect(searchScenarios('EVENT')).toEqual([scenarioB]);
    expect(searchScenarios('missing-term')).toEqual([]);
  });
});

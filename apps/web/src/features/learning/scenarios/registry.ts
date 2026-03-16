import type { Scenario, ScenarioDifficulty } from '../../../shared/types/learning';

const scenarioRegistry = new Map<string, Scenario>();

export function registerScenario(scenario: Scenario): void {
  scenarioRegistry.set(scenario.id, scenario);
}

export function getScenario(id: string): Scenario | undefined {
  return scenarioRegistry.get(id);
}

export function listScenarios(): Scenario[] {
  return Array.from(scenarioRegistry.values());
}

export function listScenariosByDifficulty(difficulty: ScenarioDifficulty): Scenario[] {
  return listScenarios().filter((s) => s.difficulty === difficulty);
}

export function searchScenarios(query: string): Scenario[] {
  const q = query.toLowerCase();
  return listScenarios().filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/** Clear registry. Used for testing. */
export function clearScenarioRegistry(): void {
  scenarioRegistry.clear();
}

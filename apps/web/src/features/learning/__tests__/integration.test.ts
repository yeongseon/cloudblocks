import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useLearningStore } from '../../../entities/store/learningStore';
import { useUIStore } from '../../../entities/store/uiStore';
import {
  advanceToNextStep,
  abandonLearning,
  getCurrentStepRules,
  resetCurrentStep,
  startLearningScenario,
  stopValidationSubscription,
} from '../scenario-engine';
import {
  isHintTimerRunning,
  startHintSubscription,
  startHintTimer,
  stopHintSubscription,
} from '../hint-engine';
import { registerBuiltinScenarios } from '../scenarios/builtin';
import { clearScenarioRegistry } from '../scenarios/registry';
import type {
  ArchitectureSnapshot,
  StepValidationRule,
} from '../../../shared/types/learning';
import type { BlockCategory, PlateType, SubnetAccess } from '../../../shared/types';

const EMPTY_ARCHITECTURE: ArchitectureSnapshot = {
  name: 'Empty Test Architecture',
  version: '1',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
};

function resetLearningStore(): void {
  useLearningStore.setState({
    activeScenario: null,
    progress: null,
    currentHintIndex: -1,
    isCurrentStepComplete: false,
  });
}

function resetUIStore(): void {
  useUIStore.setState({
    selectedId: null,
    toolMode: 'select',
    connectionSource: null,
    draggedBlockCategory: null,
    draggedResourceName: null,
    showBlockPalette: true,
    showProperties: true,
    showValidation: false,
    showCodePreview: false,
    showWorkspaceManager: false,
    showTemplateGallery: false,
    showGitHubLogin: false,
    showGitHubRepos: false,
    showGitHubSync: false,
    showGitHubPR: false,
    editorMode: 'build',
    showLearningPanel: false,
    showScenarioGallery: false,
  });
}

function resetArchitectureStore(): void {
  const state = useArchitectureStore.getState();
  state.resetWorkspace();
  useArchitectureStore.setState({ workspaces: [] });
  state.replaceArchitecture(EMPTY_ARCHITECTURE);
}

function resetStores(): void {
  stopValidationSubscription();
  resetLearningStore();
  resetUIStore();
  resetArchitectureStore();
}

function architectureSnapshot(): ArchitectureSnapshot {
  const architecture = useArchitectureStore.getState().workspace.architecture;
  return {
    name: architecture.name,
    version: architecture.version,
    plates: architecture.plates,
    blocks: architecture.blocks,
    connections: architecture.connections,
    externalActors: architecture.externalActors,
  };
}

function replaceArchitectureSnapshot(snapshot: ArchitectureSnapshot): void {
  useArchitectureStore.getState().replaceArchitecture(snapshot);
}

function findNetworkPlateId(snapshot: ArchitectureSnapshot): string | null {
  return snapshot.plates.find((plate) => plate.type === 'network')?.id ?? null;
}

function ensureNetworkPlate(): string {
  const snapshot = architectureSnapshot();
  const existingId = findNetworkPlateId(snapshot);
  if (existingId) {
    return existingId;
  }

  const networkId = 'plate-network-test';
  replaceArchitectureSnapshot({
    ...snapshot,
    plates: [
      ...snapshot.plates,
      {
        id: networkId,
        name: 'Network',
        type: 'network',
        parentId: null,
        children: [],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
    ],
  });

  return networkId;
}

function ensureSubnet(subnetAccess: SubnetAccess): string {
  const snapshot = architectureSnapshot();
  const existing = snapshot.plates.find(
    (plate) => plate.type === 'subnet' && plate.subnetAccess === subnetAccess
  );
  if (existing) {
    return existing.id;
  }

  const networkId = findNetworkPlateId(snapshot) ?? ensureNetworkPlate();
  const refreshed = architectureSnapshot();
  const subnetId = `plate-subnet-${subnetAccess}-test`;

  const updatedPlates = refreshed.plates.map((plate) => {
    if (plate.id !== networkId) {
      return plate;
    }

    return {
      ...plate,
      children: plate.children.includes(subnetId)
        ? plate.children
        : [...plate.children, subnetId],
    };
  });

  updatedPlates.push({
    id: subnetId,
    name: subnetAccess === 'public' ? 'Public Subnet' : 'Private Subnet',
    type: 'subnet',
    subnetAccess,
    parentId: networkId,
    children: [],
    position: { x: subnetAccess === 'public' ? -3 : 3, y: 0.3, z: 0 },
    size: { width: 5, height: 0.2, depth: 8 },
    metadata: {},
  });

  replaceArchitectureSnapshot({
    ...refreshed,
    plates: updatedPlates,
  });

  return subnetId;
}

function getPlacementForCategory(category: BlockCategory): {
  plateType: PlateType;
  subnetAccess?: SubnetAccess;
} {
  if (category === 'gateway') {
    return { plateType: 'subnet', subnetAccess: 'public' };
  }

  if (category === 'database') {
    return { plateType: 'subnet', subnetAccess: 'private' };
  }

  if (category === 'compute' || category === 'storage') {
    return { plateType: 'subnet', subnetAccess: 'public' };
  }

  return { plateType: 'network' };
}

function ensureBlock(
  category: BlockCategory,
  onPlateType?: PlateType,
  onSubnetAccess?: SubnetAccess
): string {
  const snapshot = architectureSnapshot();
  const existing = snapshot.blocks.find((block) => {
    if (block.category !== category) {
      return false;
    }

    if (!onPlateType) {
      return true;
    }

    const plate = snapshot.plates.find((candidate) => candidate.id === block.placementId);
    if (!plate || plate.type !== onPlateType) {
      return false;
    }

    if (onSubnetAccess && plate.subnetAccess !== onSubnetAccess) {
      return false;
    }

    return true;
  });

  if (existing) {
    return existing.id;
  }

  const placement = onPlateType
    ? { plateType: onPlateType, subnetAccess: onSubnetAccess }
    : getPlacementForCategory(category);

  let placementId = '';
  if (placement.plateType === 'network') {
    placementId = ensureNetworkPlate();
  } else {
    placementId = ensureSubnet(placement.subnetAccess ?? 'public');
  }

  const refreshed = architectureSnapshot();
  const blockId = `block-${category}-test`;

  const updatedPlates = refreshed.plates.map((plate) => {
    if (plate.id !== placementId) {
      return plate;
    }

    return {
      ...plate,
      children: plate.children.includes(blockId)
        ? plate.children
        : [...plate.children, blockId],
    };
  });

  replaceArchitectureSnapshot({
    ...refreshed,
    plates: updatedPlates,
    blocks: [
      ...refreshed.blocks,
      {
        id: blockId,
        name: `${category}-test`,
        category,
        placementId,
        position: { x: 0, y: 0.5, z: 0 },
        metadata: {},
      },
    ],
  });

  return blockId;
}

function ensureConnection(sourceCategory: string, targetCategory: string): void {
  const snapshot = architectureSnapshot();

  const sourceId =
    sourceCategory === 'internet'
      ? (snapshot.externalActors.find((actor) => actor.type === 'internet')?.id ?? 'ext-internet')
      : ensureBlock(sourceCategory as BlockCategory);

  const targetId = ensureBlock(targetCategory as BlockCategory);

  const refreshed = architectureSnapshot();
  const hasConnection = refreshed.connections.some(
    (connection) => connection.sourceId === sourceId && connection.targetId === targetId
  );

  if (hasConnection) {
    return;
  }

  const updatedExternalActors =
    sourceCategory === 'internet' &&
    !refreshed.externalActors.some((actor) => actor.id === sourceId)
      ? [...refreshed.externalActors, { id: sourceId, name: 'Internet', type: 'internet' as const }]
      : refreshed.externalActors;

  replaceArchitectureSnapshot({
    ...refreshed,
    externalActors: updatedExternalActors,
    connections: [
      ...refreshed.connections,
      {
        id: `conn-${sourceCategory}-${targetCategory}-${refreshed.connections.length + 1}`,
        sourceId,
        targetId,
        type: 'dataflow',
        metadata: {},
      },
    ],
  });
}

function satisfyRule(rule: StepValidationRule): void {
  switch (rule.type) {
    case 'plate-exists':
      if (rule.plateType === 'network') {
        ensureNetworkPlate();
      } else {
        ensureSubnet(rule.subnetAccess ?? 'public');
      }
      return;

    case 'block-exists':
      ensureBlock(rule.category, rule.onPlateType, rule.onSubnetAccess);
      return;

    case 'connection-exists':
      ensureConnection(rule.sourceCategory, rule.targetCategory);
      return;

    case 'entity-on-plate':
      ensureBlock(rule.entityCategory, rule.plateType, rule.subnetAccess);
      return;

    case 'min-block-count': {
      while (
        architectureSnapshot().blocks.filter((block) => block.category === rule.category).length <
        rule.count
      ) {
        ensureBlock(rule.category);
      }
      return;
    }

    case 'min-plate-count': {
      while (
        architectureSnapshot().plates.filter((plate) => plate.type === rule.plateType).length <
        rule.count
      ) {
        if (rule.plateType === 'network') {
          ensureNetworkPlate();
        } else {
          ensureSubnet('public');
        }
      }
      return;
    }

    case 'architecture-valid':
      return;

    default:
      return;
  }
}

describe('learning integration flow', () => {
  beforeEach(() => {
    registerBuiltinScenarios();
    resetStores();
  });

  afterEach(() => {
    stopValidationSubscription();
    stopHintSubscription();
    clearScenarioRegistry();
    resetStores();
    vi.useRealTimers();
  });

  it('full three-tier scenario can be completed step by step', () => {
    startLearningScenario('scenario-three-tier');

    expect(useUIStore.getState().editorMode).toBe('learn');
    expect(useUIStore.getState().showLearningPanel).toBe(true);

    const steps = useLearningStore.getState().activeScenario?.steps ?? [];

    for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
      const rules = getCurrentStepRules();
      expect(rules.length).toBeGreaterThan(0);

      for (const rule of rules) {
        satisfyRule(rule);
      }

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
      advanceToNextStep();
    }

    expect(useLearningStore.getState().progress?.completedAt).toBeDefined();
  });

  it('starting a scenario resets previous learning state', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'plate-exists', plateType: 'network' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    expect(useLearningStore.getState().progress?.currentStepIndex).toBe(1);

    startLearningScenario('scenario-serverless-api');

    const progress = useLearningStore.getState().progress;
    expect(progress?.currentStepIndex).toBe(0);
    expect(progress?.scenarioId).toBe('scenario-serverless-api');
  });

  it('abandoning learning restores build mode', () => {
    startLearningScenario('scenario-three-tier');

    abandonLearning();

    expect(useUIStore.getState().editorMode).toBe('build');
    expect(useUIStore.getState().showLearningPanel).toBe(false);
    expect(useLearningStore.getState().activeScenario).toBeNull();
  });

  it('hint engine integrates with learning flow', () => {
    vi.useFakeTimers();

    startLearningScenario('scenario-three-tier');
    startHintSubscription();
    startHintTimer();

    vi.advanceTimersByTime(30000);
    expect(useLearningStore.getState().currentHintIndex).toBe(0);

    satisfyRule({ type: 'plate-exists', plateType: 'network' });

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    expect(isHintTimerRunning()).toBe(false);

    vi.useRealTimers();
  });

  it('resetting step restores checkpoint architecture', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'plate-exists', plateType: 'network' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    const checkpoint = useLearningStore.getState().activeScenario?.steps[1]?.checkpoint;
    expect(checkpoint).toBeDefined();

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' });
    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' });
    satisfyRule({ type: 'block-exists', category: 'gateway', onPlateType: 'subnet', onSubnetAccess: 'public' });

    resetCurrentStep();

    expect(architectureSnapshot()).toEqual(checkpoint);
  });

  it('validation subscription auto-evaluates on architecture changes', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'plate-exists', plateType: 'network' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
  });
});

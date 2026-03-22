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
import type { ContainerNode, LayerType, LeafNode, ResourceCategory, SubnetAccess } from '@cloudblocks/schema';

type ContainerLayer = Exclude<LayerType, 'resource'>;

const EMPTY_ARCHITECTURE: ArchitectureSnapshot = {
  name: 'Empty Test Architecture',
  version: '1',
  nodes: [],
  connections: [],
  externalActors: [],
};

const containerResourceTypeByLayer = {
  global: 'global',
  edge: 'edge',
  region: 'virtual_network',
  zone: 'zone',
  subnet: 'subnet',
} as const;

const leafResourceTypeByCategory: Record<ResourceCategory, string> = {
  compute: 'web_compute',
  data: 'relational_database',
  edge: 'load_balancer',
  security: 'firewall_security',
  operations: 'monitoring',
  messaging: 'message_queue',
  network: 'virtual_network',
};

const getContainers = (snapshot: ArchitectureSnapshot): ContainerNode[] =>
  snapshot.nodes.filter((node): node is ContainerNode => node.kind === 'container');

const getResources = (snapshot: ArchitectureSnapshot): LeafNode[] =>
  snapshot.nodes.filter((node): node is LeafNode => node.kind === 'resource');

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
    showResourceGuide: true,
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
    nodes: architecture.nodes,
    connections: architecture.connections,
    externalActors: architecture.externalActors,
  };
}

function replaceArchitectureSnapshot(snapshot: ArchitectureSnapshot): void {
  useArchitectureStore.getState().replaceArchitecture(snapshot);
}

function findNetworkPlateId(snapshot: ArchitectureSnapshot): string | null {
  return getContainers(snapshot).find((plate) => plate.layer === 'region')?.id ?? null;
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
    nodes: [
      ...snapshot.nodes,
      {
        id: networkId,
        name: 'Network',
        kind: 'container',
        layer: 'region',
        resourceType: containerResourceTypeByLayer.region,
        category: 'network',
        provider: 'azure',
        parentId: null,
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
  const existing = getContainers(snapshot).find(
    (plate) => plate.layer === 'subnet' && plate.subnetAccess === subnetAccess
  );
  if (existing) {
    return existing.id;
  }

  const networkId = findNetworkPlateId(snapshot) ?? ensureNetworkPlate();
  const refreshed = architectureSnapshot();
  const subnetId = `plate-subnet-${subnetAccess}-test`;

  replaceArchitectureSnapshot({
    ...refreshed,
    nodes: [
      ...refreshed.nodes,
      {
        id: subnetId,
        name: subnetAccess === 'public' ? 'Public Subnet' : 'Private Subnet',
        kind: 'container',
        layer: 'subnet',
        resourceType: containerResourceTypeByLayer.subnet,
        category: 'network',
        provider: 'azure',
        subnetAccess,
        parentId: networkId,
        position: { x: subnetAccess === 'public' ? -3 : 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
  });

  return subnetId;
}

function getPlacementForCategory(category: ResourceCategory): {
  plateType: ContainerLayer;
  subnetAccess?: SubnetAccess;
} {
  if (category === 'edge') {
    return { plateType: 'subnet', subnetAccess: 'public' };
  }

  if (category === 'data') {
    return { plateType: 'subnet', subnetAccess: 'private' };
  }

  if (category === 'compute' || category === 'security' || category === 'operations') {
    return { plateType: 'subnet', subnetAccess: 'public' };
  }

  return { plateType: 'region' };
}

function ensureBlock(
  category: ResourceCategory,
  onPlateType?: ContainerLayer,
  onSubnetAccess?: SubnetAccess
): string {
  const snapshot = architectureSnapshot();
  const existing = getResources(snapshot).find((block) => {
    if (block.category !== category) {
      return false;
    }

    if (!onPlateType) {
      return true;
    }

    const plate = getContainers(snapshot).find((candidate) => candidate.id === block.parentId);
    if (!plate || plate.layer !== onPlateType) {
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

  const placementId = placement.plateType === 'region'
    ? ensureNetworkPlate()
    : ensureSubnet(placement.subnetAccess ?? 'public');

  const refreshed = architectureSnapshot();
  const blockId = `block-${category}-test`;

  replaceArchitectureSnapshot({
    ...refreshed,
    nodes: [
      ...refreshed.nodes,
      {
        id: blockId,
        name: `${category}-test`,
        kind: 'resource',
        layer: 'resource',
        resourceType: leafResourceTypeByCategory[category],
        category,
        provider: 'azure',
        parentId: placementId,
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
      : ensureBlock(sourceCategory as ResourceCategory);

  const targetId = ensureBlock(targetCategory as ResourceCategory);

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
      ? [...refreshed.externalActors, { id: sourceId, name: 'Internet', type: 'internet' as const , position: { x: -3, y: 0, z: 5 } }]
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
      if (rule.plateType === 'region') {
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
        getResources(architectureSnapshot()).filter((block) => block.category === rule.category).length <
        rule.count
      ) {
        ensureBlock(rule.category);
      }
      return;
    }

    case 'min-plate-count': {
      while (
        getContainers(architectureSnapshot()).filter((plate) => plate.layer === rule.plateType).length <
        rule.count
      ) {
        if (rule.plateType === 'region') {
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

    satisfyRule({ type: 'plate-exists', plateType: 'region' });
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

    satisfyRule({ type: 'plate-exists', plateType: 'region' });

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    expect(isHintTimerRunning()).toBe(false);

    vi.useRealTimers();
  });

  it('resetting step restores checkpoint architecture', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'plate-exists', plateType: 'region' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    const checkpoint = useLearningStore.getState().activeScenario?.steps[1]?.checkpoint;
    expect(checkpoint).toBeDefined();

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' });
    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' });
    satisfyRule({ type: 'block-exists', category: 'edge', onPlateType: 'subnet', onSubnetAccess: 'public' });

    resetCurrentStep();

    expect(architectureSnapshot()).toEqual(checkpoint);
  });

  it('validation subscription auto-evaluates on architecture changes', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'plate-exists', plateType: 'region' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useLearningStore } from '../../../entities/store/learningStore';
import { useUIStore } from '../../../entities/store/uiStore';
import { endpointId, generateEndpointsForBlock, resolveConnectionNodes } from '@cloudblocks/schema';
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
import { clearScenarioRegistry, getScenario, registerScenario } from '../scenarios/registry';
import type { ArchitectureSnapshot, StepValidationRule } from '../../../shared/types/learning';
import type {
  ContainerBlock,
  LayerType,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';

type ContainerLayer = Exclude<LayerType, 'resource'>;

const EMPTY_ARCHITECTURE: ArchitectureSnapshot = {
  name: 'Empty Test Architecture',
  version: '1',
  nodes: [],
  connections: [],
  endpoints: [],
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
  delivery: 'load_balancer',
  security: 'firewall_security',
  operations: 'monitoring',
  messaging: 'message_queue',
  network: 'virtual_network',
  identity: 'managed_identity',
};

const getContainers = (snapshot: ArchitectureSnapshot): ContainerBlock[] =>
  snapshot.nodes.filter((node): node is ContainerBlock => node.kind === 'container');

const getResources = (snapshot: ArchitectureSnapshot): ResourceBlock[] =>
  snapshot.nodes.filter((node): node is ResourceBlock => node.kind === 'resource');

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

    showGitHubLogin: false,
    showGitHubRepos: false,
    showGitHubSync: false,
    showGitHubPR: false,
    editorMode: 'build',
    drawer: { isOpen: false, activePanel: null },
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
    endpoints: architecture.endpoints,
    externalActors: architecture.externalActors,
  };
}

function replaceArchitectureSnapshot(snapshot: ArchitectureSnapshot): void {
  const blockIds = snapshot.nodes.map((n) => n.id);
  const endpoints = blockIds.flatMap((id) => generateEndpointsForBlock(id));
  useArchitectureStore.getState().replaceArchitecture({ ...snapshot, endpoints });
}

function ensureInternetBlock(): string {
  const snapshot = architectureSnapshot();
  const existing = getResources(snapshot).find(
    (block) => block.resourceType === 'internet' && block.parentId === null,
  );
  if (existing) {
    return existing.id;
  }

  const internetId = 'block-internet-test';
  replaceArchitectureSnapshot({
    ...snapshot,
    nodes: [
      ...snapshot.nodes,
      {
        id: internetId,
        name: 'Internet',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'internet',
        category: 'network',
        provider: 'azure',
        parentId: null,
        position: { x: -3, y: 0, z: 5 },
        metadata: {},
        subtype: 'internet',
        roles: ['external'],
      },
    ],
  });

  return internetId;
}

function findNetworkPlateId(snapshot: ArchitectureSnapshot): string | null {
  return getContainers(snapshot).find((container) => container.layer === 'region')?.id ?? null;
}

function ensureNetworkPlate(): string {
  const snapshot = architectureSnapshot();
  const existingId = findNetworkPlateId(snapshot);
  if (existingId) {
    return existingId;
  }

  const networkId = 'container-network-test';
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
        frame: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
    ],
  });

  return networkId;
}

function addSubnet(): string {
  const snapshot = architectureSnapshot();
  const networkId = findNetworkPlateId(snapshot) ?? ensureNetworkPlate();
  const refreshed = architectureSnapshot();
  const subnetCount = getContainers(refreshed).filter((p) => p.layer === 'subnet').length;
  const subnetId = `container-subnet-${subnetCount + 1}-test`;

  replaceArchitectureSnapshot({
    ...refreshed,
    nodes: [
      ...refreshed.nodes,
      {
        id: subnetId,
        name: `Subnet ${subnetCount + 1}`,
        kind: 'container',
        layer: 'subnet',
        resourceType: containerResourceTypeByLayer.subnet,
        category: 'network',
        provider: 'azure',
        parentId: networkId,
        position: { x: subnetCount * 6 - 3, y: 0.3, z: 0 },
        frame: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
  });

  return subnetId;
}

function ensureSubnet(): string {
  const snapshot = architectureSnapshot();
  const existing = getContainers(snapshot).find((container) => container.layer === 'subnet');
  if (existing) {
    return existing.id;
  }

  return addSubnet();
}

function getPlacementForCategory(category: ResourceCategory): {
  containerLayer: ContainerLayer;
} {
  if (category === 'messaging' || category === 'network') {
    return { containerLayer: 'region' };
  }

  return { containerLayer: 'subnet' };
}

function addBlock(category: ResourceCategory, onContainerLayer?: ContainerLayer): string {
  const placement = onContainerLayer
    ? { containerLayer: onContainerLayer }
    : getPlacementForCategory(category);

  const placementId = placement.containerLayer === 'region' ? ensureNetworkPlate() : ensureSubnet();

  const refreshed = architectureSnapshot();
  const existingCount = getResources(refreshed).filter((b) => b.category === category).length;
  const blockId = `block-${category}-${existingCount + 1}-test`;

  replaceArchitectureSnapshot({
    ...refreshed,
    nodes: [
      ...refreshed.nodes,
      {
        id: blockId,
        name: `${category}-test-${existingCount + 1}`,
        kind: 'resource',
        layer: 'resource',
        resourceType: leafResourceTypeByCategory[category],
        category,
        provider: 'azure',
        parentId: placementId,
        position: { x: existingCount * 2, y: 0.5, z: 0 },
        metadata: {},
      },
    ],
  });

  return blockId;
}

function ensureBlock(category: ResourceCategory, onContainerLayer?: ContainerLayer): string {
  const snapshot = architectureSnapshot();
  const existing = getResources(snapshot).find((block) => {
    if (block.category !== category) {
      return false;
    }

    if (!onContainerLayer) {
      return true;
    }

    const container = getContainers(snapshot).find((candidate) => candidate.id === block.parentId);
    if (!container || container.layer !== onContainerLayer) {
      return false;
    }

    return true;
  });

  if (existing) {
    return existing.id;
  }

  const placement = onContainerLayer
    ? { containerLayer: onContainerLayer }
    : getPlacementForCategory(category);

  const placementId = placement.containerLayer === 'region' ? ensureNetworkPlate() : ensureSubnet();

  const refreshed = architectureSnapshot();
  const existingCount = getResources(refreshed).filter((b) => b.category === category).length;
  const blockId = `block-${category}-${existingCount + 1}-test`;

  replaceArchitectureSnapshot({
    ...refreshed,
    nodes: [
      ...refreshed.nodes,
      {
        id: blockId,
        name: `${category}-test`,
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: leafResourceTypeByCategory[category],
        category,
        provider: 'azure' as const,
        parentId: placementId,
        position: { x: 0, y: 0.5, z: 0 },
        metadata: {},
      },
    ],
  });

  return blockId;
}

function ensureConnection(sourceCategory: string, targetCategory: string): void {
  const sourceId =
    sourceCategory === 'internet' || (sourceCategory === 'network' && targetCategory === 'delivery')
      ? ensureInternetBlock()
      : ensureBlock(sourceCategory as ResourceCategory);

  const targetId = ensureBlock(targetCategory as ResourceCategory);

  const refreshed = architectureSnapshot();
  const hasConnection = refreshed.connections.some(
    (connection) =>
      resolveConnectionNodes(connection).sourceId === sourceId &&
      resolveConnectionNodes(connection).targetId === targetId,
  );

  if (hasConnection) {
    return;
  }

  replaceArchitectureSnapshot({
    ...refreshed,
    connections: [
      ...refreshed.connections,
      {
        id: `conn-${sourceCategory}-${targetCategory}-${refreshed.connections.length + 1}`,
        from: endpointId(sourceId, 'output', 'data'),
        to: endpointId(targetId, 'input', 'data'),
        metadata: {},
      },
    ],
  });
}

function satisfyRule(rule: StepValidationRule): void {
  switch (rule.type) {
    case 'container-exists':
      if (rule.containerLayer === 'region') {
        ensureNetworkPlate();
      } else {
        addSubnet();
      }
      return;

    case 'block-exists':
      ensureBlock(rule.category, rule.onContainerLayer);
      return;

    case 'connection-exists':
      ensureConnection(rule.sourceCategory, rule.targetCategory);
      return;

    case 'entity-on-container':
      ensureBlock(rule.entityCategory, rule.containerLayer);
      return;

    case 'min-block-count': {
      while (
        getResources(architectureSnapshot()).filter((block) => block.category === rule.category)
          .length < rule.count
      ) {
        addBlock(rule.category);
      }
      return;
    }

    case 'min-container-count': {
      while (
        getContainers(architectureSnapshot()).filter(
          (container) => container.layer === rule.containerLayer,
        ).length < rule.count
      ) {
        if (rule.containerLayer === 'region') {
          ensureNetworkPlate();
        } else {
          addSubnet();
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

function remapInternetRulesToNetwork(scenarioId: string): void {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return;
  }

  registerScenario({
    ...scenario,
    steps: scenario.steps.map((step) => ({
      ...step,
      validationRules: step.validationRules.map((rule) =>
        rule.type === 'connection-exists' && rule.sourceCategory === 'internet'
          ? { ...rule, sourceCategory: 'network' }
          : rule,
      ),
    })),
  });
}

describe('learning integration flow', () => {
  beforeEach(() => {
    registerBuiltinScenarios();
    remapInternetRulesToNetwork('scenario-three-tier');
    remapInternetRulesToNetwork('scenario-serverless-api');
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
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('learning');

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

    satisfyRule({ type: 'container-exists', containerLayer: 'region' });
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
    expect(useUIStore.getState().drawer.isOpen).toBe(false);
    expect(useLearningStore.getState().activeScenario).toBeNull();
  });

  it('hint engine integrates with learning flow', () => {
    vi.useFakeTimers();

    startLearningScenario('scenario-three-tier');
    startHintSubscription();
    startHintTimer();

    vi.advanceTimersByTime(30000);
    expect(useLearningStore.getState().currentHintIndex).toBe(0);

    satisfyRule({ type: 'container-exists', containerLayer: 'region' });

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    expect(isHintTimerRunning()).toBe(false);

    vi.useRealTimers();
  });

  it('resetting step restores checkpoint architecture', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'container-exists', containerLayer: 'region' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    const checkpoint = useLearningStore.getState().activeScenario?.steps[1]?.checkpoint;
    expect(checkpoint).toBeDefined();

    satisfyRule({ type: 'container-exists', containerLayer: 'subnet' });
    satisfyRule({ type: 'container-exists', containerLayer: 'subnet' });
    satisfyRule({ type: 'block-exists', category: 'delivery', onContainerLayer: 'subnet' });

    resetCurrentStep();

    expect(architectureSnapshot()).toEqual(checkpoint);
  });

  it('validation subscription auto-evaluates on architecture changes', () => {
    startLearningScenario('scenario-three-tier');

    satisfyRule({ type: 'container-exists', containerLayer: 'region' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    advanceToNextStep();

    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'container-exists', containerLayer: 'subnet' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);

    satisfyRule({ type: 'container-exists', containerLayer: 'subnet' });
    expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
  });
});

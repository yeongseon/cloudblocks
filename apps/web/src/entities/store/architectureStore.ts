import { create } from 'zustand';
import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  Endpoint,
  ResourceBlock,
} from '@cloudblocks/schema';
import { createAiSlice } from './slices/aiSlice';
import { createDomainSlice } from './slices/domainSlice';
import { createHistorySlice } from './slices/historySlice';
import { createLearningSlice } from './slices/learningSlice';
import { createPersistenceSlice } from './slices/persistenceSlice';
import { createValidationSlice } from './slices/validationSlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';
import type { ArchitectureState } from './slices/types';

export type { ArchitectureState } from './slices/types';

function buildArchitectureIndexes(
  architecture: ArchitectureModel,
): Pick<
  ArchitectureState,
  'nodeById' | 'connectionById' | 'endpointById' | 'connectionsByEndpoint'
> {
  const nodeById = new Map<string, ResourceBlock | ContainerBlock>();
  for (const node of architecture.nodes) {
    nodeById.set(node.id, node);
  }

  const connectionById = new Map<string, Connection>();
  const connectionsByEndpoint = new Map<string, Connection[]>();
  for (const connection of architecture.connections) {
    connectionById.set(connection.id, connection);

    const fromConnections = connectionsByEndpoint.get(connection.from) ?? [];
    fromConnections.push(connection);
    connectionsByEndpoint.set(connection.from, fromConnections);

    const toConnections = connectionsByEndpoint.get(connection.to) ?? [];
    toConnections.push(connection);
    connectionsByEndpoint.set(connection.to, toConnections);
  }

  const endpointById = new Map<string, Endpoint>();
  for (const endpoint of architecture.endpoints) {
    endpointById.set(endpoint.id, endpoint);
  }

  return {
    nodeById,
    connectionById,
    endpointById,
    connectionsByEndpoint,
  };
}

function withArchitectureIndexes(
  partialState: Partial<ArchitectureState> | ArchitectureState,
): Partial<ArchitectureState> | ArchitectureState {
  const architecture = partialState.workspace?.architecture;
  if (!architecture) {
    return partialState;
  }

  return {
    ...partialState,
    ...buildArchitectureIndexes(architecture),
  };
}

function indexesMatchArchitecture(state: ArchitectureState): boolean {
  const architecture = state.workspace.architecture;

  if (
    state.nodeById.size !== architecture.nodes.length ||
    state.connectionById.size !== architecture.connections.length ||
    state.endpointById.size !== architecture.endpoints.length
  ) {
    return false;
  }

  for (const node of architecture.nodes) {
    if (state.nodeById.get(node.id) !== node) {
      return false;
    }
  }

  for (const connection of architecture.connections) {
    if (state.connectionById.get(connection.id) !== connection) {
      return false;
    }
  }

  for (const endpoint of architecture.endpoints) {
    if (state.endpointById.get(endpoint.id) !== endpoint) {
      return false;
    }
  }

  return true;
}

export const useArchitectureStore = create<ArchitectureState>()((set, get, api) => {
  const setWithIndexes: typeof set = (partial, replace) => {
    if (typeof partial === 'function') {
      if (replace) {
        return set((state) => withArchitectureIndexes(partial(state)) as ArchitectureState, true);
      }

      return set(
        (state) => withArchitectureIndexes(partial(state)) as Partial<ArchitectureState>,
        false,
      );
    }

    if (replace) {
      return set(withArchitectureIndexes(partial) as ArchitectureState, true);
    }

    return set(withArchitectureIndexes(partial) as Partial<ArchitectureState>, false);
  };

  const baseState = {
    ...createWorkspaceSlice(setWithIndexes, get, api),
    ...createValidationSlice(setWithIndexes, get, api),
    ...createHistorySlice(setWithIndexes, get, api),
    ...createDomainSlice(setWithIndexes, get, api),
    ...createPersistenceSlice(setWithIndexes, get, api),
    ...createLearningSlice(setWithIndexes, get, api),
    ...createAiSlice(setWithIndexes, get, api),
  };

  return {
    ...baseState,
    ...buildArchitectureIndexes(baseState.workspace.architecture),
  };
});

let autoValidateTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_VALIDATE_DELAY_MS = 300;

useArchitectureStore.subscribe((state, prevState) => {
  const archChanged = state.workspace.architecture !== prevState.workspace.architecture;

  if (archChanged && !indexesMatchArchitecture(state)) {
    useArchitectureStore.setState(buildArchitectureIndexes(state.workspace.architecture));
  }

  if (archChanged && state.validationResult === null) {
    if (autoValidateTimer) {
      clearTimeout(autoValidateTimer);
    }

    autoValidateTimer = setTimeout(() => {
      useArchitectureStore.getState().validate();
    }, AUTO_VALIDATE_DELAY_MS);
  }
});

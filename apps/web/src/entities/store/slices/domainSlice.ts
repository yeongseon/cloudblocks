import type { ContainerBlockProfileId } from '../../../shared/types/index';
import type {
  Connection,
  ContainerCapableResourceType,
  ContainerBlock,
  ExternalActor,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  buildContainerBlockSizeFromProfileId,
  DEFAULT_BLOCK_SIZE,
} from '../../../shared/types/index';
import {
  CATEGORY_DEFAULT_RESOURCE_TYPE,
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForBlock,
  getPortsForResourceType,
  isExternalResourceType,
  parseEndpointId,
  RESOURCE_RULES,
} from '@cloudblocks/schema';
import { generateId } from '../../../shared/utils/id';
import { metricsService } from '../../../shared/utils/metricsService';
import type {
  AddNodeInput,
  ArchitectureSlice,
  ArchitectureState,
  RemoveNodeOptions,
} from './types';
import { canConnect } from '../../validation/connection';
import type { EndpointType } from '../../validation/connection';
import { validatePlacement } from '../../validation/placement';
import {
  clampWithinParent,
  DEFAULT_PLATE_SIZE,
  findNonOverlappingPosition,
  nextGridPosition,
  resolveMoveDelta,
  withHistory,
} from './helpers';

type DomainSlice = Pick<
  ArchitectureState,
  | 'addNode'
  | 'removeNode'
  | 'renameNode'
  | 'moveNodePosition'
  | 'updateNodeMetadata'
  | 'addPlate'
  | 'removePlate'
  | 'addBlock'
  | 'duplicateBlock'
  | 'removeBlock'
  | 'renameBlock'
  | 'renamePlate'
  | 'moveBlock'
  | 'setPlateProfile'
  | 'movePlatePosition'
  | 'moveBlockPosition'
  | 'moveActorPosition'
  | 'addExternalActor'
  | 'removeExternalActor'
  | 'addExternalBlock'
  | 'addConnection'
  | 'removeConnection'
  | 'updateConnectionType'
>;

const isContainer = (node: ContainerBlock | ResourceBlock): node is ContainerBlock =>
  node.kind === 'container';

const isResource = (node: ContainerBlock | ResourceBlock): node is ResourceBlock =>
  node.kind === 'resource';

type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

const endpointIdPrefix = (nodeId: string): string => `endpoint-${nodeId}-`;

const CONTAINER_RESOURCE_TYPE: Record<PlateLayerType, ContainerCapableResourceType> = {
  global: 'virtual_network',
  edge: 'virtual_network',
  region: 'virtual_network',
  zone: 'virtual_network',
  subnet: 'subnet',
};

/**
 * Temporary shim - maps external resource blocks back to their string-literal
 * EndpointType ('internet' | 'browser') so that canConnect() in connection.ts
 * continues to work correctly until #1537 rewrites it.
 *
 * For all other blocks, returns the block's category.
 */
function getEffectiveEndpointType(block: ResourceBlock): EndpointType {
  if (isExternalResourceType(block.resourceType)) {
    return block.resourceType as EndpointType;
  }
  return block.category;
}

export const createDomainSlice: ArchitectureSlice<DomainSlice> = (set, get) => ({
  // ── Unified Node API ─────────────────────────────────────────────────────

  addNode: (input: AddNodeInput) => {
    if (input.kind === 'container') {
      // Resolve layer -> ContainerLayer for the existing addPlate logic
      const layer = input.layer as PlateLayerType;
      get().addPlate(layer, input.name, input.parentId, input.profileId);
    } else {
      // Derive category from RESOURCE_RULES or fall back to 'compute'
      const rule = (RESOURCE_RULES as Record<string, { category: ResourceCategory }>)[
        input.resourceType
      ];
      const category: ResourceCategory = rule?.category ?? 'compute';
      get().addBlock(
        category,
        input.name,
        input.parentId,
        input.provider,
        input.subtype ?? input.resourceType,
        input.config,
      );
    }
  },

  removeNode: (id: string, options?: RemoveNodeOptions) => {
    const arch = get().workspace.architecture;
    const node = arch.nodes.find((n) => n.id === id);
    if (!node) return;

    const shouldCascade = options?.cascade ?? node.kind === 'container';
    if (shouldCascade && node.kind === 'container') {
      get().removePlate(id);
    } else {
      get().removeBlock(id);
    }
  },

  renameNode: (id: string, newName: string) => {
    const arch = get().workspace.architecture;
    const node = arch.nodes.find((n) => n.id === id);
    if (!node) return;

    if (node.kind === 'container') {
      get().renamePlate(id, newName);
    } else {
      get().renameBlock(id, newName);
    }
  },

  moveNodePosition: (id: string, deltaX: number, deltaZ: number) => {
    const arch = get().workspace.architecture;
    const node = arch.nodes.find((n) => n.id === id);
    if (!node) return;

    if (node.kind === 'container') {
      get().movePlatePosition(id, deltaX, deltaZ);
    } else {
      get().moveBlockPosition(id, deltaX, deltaZ);
    }
  },

  updateNodeMetadata: (id: string, key: string, value: unknown) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const nodeIndex = arch.nodes.findIndex((n) => n.id === id);
      if (nodeIndex === -1) return state;

      const node = arch.nodes[nodeIndex];
      const updatedNode = { ...node, metadata: { ...node.metadata, [key]: value } };
      const updatedNodes = [...arch.nodes];
      updatedNodes[nodeIndex] = updatedNode;

      return {
        workspace: {
          ...state.workspace,
          architecture: { ...arch, nodes: updatedNodes },
        },
      };
    });
  },

  // ── Deprecated wrappers (delegates preserved for backward compat) ────────
  addPlate: (type, name, parentId, profileId?: ContainerBlockProfileId) => {
    const prevCount = get().workspace.architecture.nodes.length;
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const parentPlate = parentId
        ? containers.find((candidate) => candidate.id === parentId)
        : undefined;
      if (parentId && !parentPlate) {
        return state;
      }

      const container: ContainerBlock = {
        id: generateId('container'),
        name,
        kind: 'container',
        layer: type,
        resourceType: CONTAINER_RESOURCE_TYPE[type],
        category: 'network',
        provider: 'azure',
        profileId,
        parentId,
        position: { x: 0, y: 0, z: 0 },
        frame: profileId
          ? buildContainerBlockSizeFromProfileId(profileId)
          : { ...DEFAULT_PLATE_SIZE[type] },
        metadata: {},
      };

      if (type === 'region') {
        container.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const siblingsInParent = containers.filter((candidate) => candidate.parentId === parentId);
        const subnetSpacing = 7.0;
        const offsetX = -3.5 + siblingsInParent.length * subnetSpacing;
        const clampedRelativePosition = parentPlate
          ? clampWithinParent(
              { x: offsetX, z: 0 },
              { width: parentPlate.frame.width, depth: parentPlate.frame.depth },
              { width: container.frame.width, depth: container.frame.depth },
            )
          : { x: offsetX, z: 0 };

        container.position = {
          x: parentPlate
            ? parentPlate.position.x + clampedRelativePosition.x
            : clampedRelativePosition.x,
          y: parentPlate ? parentPlate.position.y + parentPlate.frame.height : 0.3,
          z: parentPlate
            ? parentPlate.position.z + clampedRelativePosition.z
            : clampedRelativePosition.z,
        };
      }

      const sameLevelSiblings = containers
        .filter((candidate) => candidate.parentId === (parentId ?? null))
        .map((candidate) => ({
          id: candidate.id,
          position: { x: candidate.position.x, z: candidate.position.z },
          frame: { width: candidate.frame.width, depth: candidate.frame.depth },
        }));

      const nonOverlapping = findNonOverlappingPosition(
        { x: container.position.x, z: container.position.z },
        { width: container.frame.width, depth: container.frame.depth },
        sameLevelSiblings,
      );
      container.position.x = nonOverlapping.x;
      container.position.z = nonOverlapping.z;

      return withHistory(state, {
        ...arch,
        nodes: [...arch.nodes, container],
        endpoints: [...arch.endpoints, ...generateEndpointsForBlock(container.id)],
      });
    });
    if (get().workspace.architecture.nodes.length > prevCount) {
      metricsService.trackEvent('first_plate_placed', { layer: type });
    }
  },

  removePlate: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const container = containers.find((candidate) => candidate.id === id);

      if (!container) {
        return state;
      }

      const idsToRemove = new Set<string>();
      const collectChildren = (plateId: string) => {
        idsToRemove.add(plateId);
        for (const candidate of containers) {
          if (candidate.parentId === plateId && !idsToRemove.has(candidate.id)) {
            collectChildren(candidate.id);
          }
        }
      };

      collectChildren(id);

      const removedResourceIds = new Set(
        resources
          .filter((resource) => {
            const parentId = resource.parentId;
            return (parentId !== null && idsToRemove.has(parentId)) || idsToRemove.has(resource.id);
          })
          .map((resource) => resource.id),
      );
      const removedNodeIds = new Set<string>([...idsToRemove, ...removedResourceIds]);

      const nodes = arch.nodes.filter((node) => {
        if (idsToRemove.has(node.id)) {
          return false;
        }
        if (node.kind === 'resource' && node.parentId !== null && idsToRemove.has(node.parentId)) {
          return false;
        }
        return true;
      });

      const removedEndpointIds = new Set(
        arch.endpoints
          .filter((endpoint) => removedNodeIds.has(endpoint.blockId))
          .map((endpoint) => endpoint.id),
      );

      const endpoints = arch.endpoints.filter((endpoint) => !removedNodeIds.has(endpoint.blockId));

      const connections = arch.connections.filter(
        (connection) =>
          !removedEndpointIds.has(connection.from) && !removedEndpointIds.has(connection.to),
      );

      return withHistory(state, {
        ...arch,
        nodes,
        endpoints,
        connections,
      });
    });
  },

  addBlock: (category, name, placementId, provider, subtype, config) => {
    const prevCount = get().workspace.architecture.nodes.length;
    set((state) => {
      const arch = state.workspace.architecture;
      const resolvedResourceType = subtype ?? CATEGORY_DEFAULT_RESOURCE_TYPE[category] ?? category;

      if (!placementId) {
        const rootResources = arch.nodes.filter(isResource).filter((b) => b.parentId === null);
        const rootSiblings = rootResources.map((candidate) => ({
          id: candidate.id,
          position: { x: candidate.position.x, z: candidate.position.z },
          frame: { width: DEFAULT_BLOCK_SIZE.width, depth: DEFAULT_BLOCK_SIZE.depth },
        }));
        const nonOverlappingPosition = findNonOverlappingPosition(
          { x: -3, z: -3 },
          { width: DEFAULT_BLOCK_SIZE.width, depth: DEFAULT_BLOCK_SIZE.depth },
          rootSiblings,
        );

        const block: ResourceBlock = {
          id: generateId('block'),
          name,
          kind: 'resource',
          layer: 'resource',
          resourceType: resolvedResourceType,
          category,
          provider: provider ?? 'azure',
          parentId: null,
          position: { x: nonOverlappingPosition.x, y: 0, z: nonOverlappingPosition.z },
          metadata: {},
          roles: isExternalResourceType(resolvedResourceType)
            ? (['external'] as ResourceBlock['roles'])
            : undefined,
          ...(subtype ? { subtype } : {}),
          ...(config ? { config } : {}),
        };

        return withHistory(state, {
          ...arch,
          nodes: [...arch.nodes, block],
          endpoints: [...arch.endpoints, ...generateEndpointsForBlock(block.id)],
        });
      }

      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const container = containers.find((candidate) => candidate.id === placementId);

      if (!container) {
        return state;
      }

      const existingBlocksOnPlate = resources.filter((block) => block.parentId === placementId);

      const block: ResourceBlock = {
        id: generateId('block'),
        name,
        kind: 'resource',
        layer: 'resource',
        resourceType: resolvedResourceType,
        category,
        provider: provider ?? 'azure',
        parentId: placementId,
        position: nextGridPosition(existingBlocksOnPlate, container.frame),
        metadata: {},
        ...(subtype ? { subtype } : {}),
        ...(config ? { config } : {}),
      };

      return withHistory(state, {
        ...arch,
        nodes: [...arch.nodes, block],
        endpoints: [...arch.endpoints, ...generateEndpointsForBlock(block.id)],
      });
    });
    if (get().workspace.architecture.nodes.length > prevCount) {
      metricsService.trackEvent('first_block_placed', { category });
    }
  },

  duplicateBlock: (blockId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const sourceBlock = resources.find((candidate) => candidate.id === blockId);

      if (!sourceBlock) {
        return state;
      }

      const parentPlate = containers.find((candidate) => candidate.id === sourceBlock.parentId);

      if (!parentPlate) {
        return state;
      }

      const siblingsOnPlate = resources.filter(
        (candidate) => candidate.parentId === sourceBlock.parentId,
      );

      const unclampedPosition = nextGridPosition(siblingsOnPlate, {
        width: parentPlate.frame.width,
        depth: parentPlate.frame.depth,
      });

      const clampedXZ = clampWithinParent(
        { x: unclampedPosition.x, z: unclampedPosition.z },
        parentPlate.frame,
        DEFAULT_BLOCK_SIZE,
      );

      const position = {
        x: clampedXZ.x,
        y: unclampedPosition.y,
        z: clampedXZ.z,
      };

      const newBlock: ResourceBlock = {
        ...sourceBlock,
        id: generateId('block'),
        name: `${sourceBlock.name} (copy)`,
        position,
        metadata: { ...sourceBlock.metadata },
        ...(sourceBlock.config ? { config: JSON.parse(JSON.stringify(sourceBlock.config)) } : {}),
        ...(sourceBlock.aggregation ? { aggregation: { ...sourceBlock.aggregation } } : {}),
        ...(sourceBlock.roles ? { roles: [...sourceBlock.roles] } : {}),
      };

      return withHistory(state, {
        ...arch,
        nodes: [...arch.nodes, newBlock],
      });
    });
  },

  removeBlock: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.nodes.filter(isResource).find((candidate) => candidate.id === id);

      if (!block) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        nodes: arch.nodes.filter((candidate) => candidate.id !== id),
        endpoints: arch.endpoints.filter((endpoint) => endpoint.blockId !== id),
        connections: arch.connections.filter(
          (connection) =>
            !connection.from.startsWith(endpointIdPrefix(id)) &&
            !connection.to.startsWith(endpointIdPrefix(id)),
        ),
      });
    });
  },

  renameBlock: (blockId, newName) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.nodes.filter(isResource).find((candidate) => candidate.id === blockId);

      if (!block) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        nodes: arch.nodes.map((candidate) =>
          candidate.id === blockId && candidate.kind === 'resource'
            ? { ...candidate, name: newName }
            : candidate,
        ),
      });
    });
  },

  renamePlate: (plateId, newName) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const container = arch.nodes
        .filter(isContainer)
        .find((candidate) => candidate.id === plateId);

      if (!container) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        nodes: arch.nodes.map((candidate) =>
          candidate.id === plateId && candidate.kind === 'container'
            ? { ...candidate, name: newName }
            : candidate,
        ),
      });
    });
  },

  moveBlock: (blockId, newPlacementId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const block = resources.find((candidate) => candidate.id === blockId);

      if (!block) {
        return state;
      }

      const oldPlacementId = block.parentId;
      if (oldPlacementId === newPlacementId) {
        return state;
      }

      const targetPlate = containers.find((candidate) => candidate.id === newPlacementId);

      if (!targetPlate) {
        return state;
      }

      const placementProbe = { ...block, placementId: newPlacementId };
      const targetProbe = { ...targetPlate, type: targetPlate.layer };
      if (validatePlacement(placementProbe, targetProbe) !== null) {
        return state;
      }

      const blocksOnTarget = resources.filter((candidate) => candidate.parentId === newPlacementId);
      const newPosition = nextGridPosition(blocksOnTarget, targetPlate.frame);

      return withHistory(state, {
        ...arch,
        nodes: arch.nodes.map((candidate) =>
          candidate.id === blockId && candidate.kind === 'resource'
            ? {
                ...candidate,
                parentId: newPlacementId,
                position: newPosition,
              }
            : candidate,
        ),
      });
    });
  },

  setPlateProfile: (plateId, profileId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const container = containers.find((candidate) => candidate.id === plateId);

      if (!container || container.profileId === profileId) {
        return state;
      }

      const nextSize = buildContainerBlockSizeFromProfileId(profileId);
      const resizedPlate: ContainerBlock = {
        ...container,
        profileId,
        frame: nextSize,
      };

      let nodes = arch.nodes.map((candidate) =>
        candidate.id === plateId && candidate.kind === 'container' ? resizedPlate : candidate,
      );

      if (container.parentId) {
        const parentPlate = containers.find((candidate) => candidate.id === container.parentId);
        if (parentPlate) {
          const relativePosition = {
            x: container.position.x - parentPlate.position.x,
            z: container.position.z - parentPlate.position.z,
          };
          const clampedRelativePosition = clampWithinParent(
            relativePosition,
            { width: parentPlate.frame.width, depth: parentPlate.frame.depth },
            { width: nextSize.width, depth: nextSize.depth },
          );

          nodes = nodes.map((candidate) =>
            candidate.id === plateId && candidate.kind === 'container'
              ? {
                  ...candidate,
                  position: {
                    x: parentPlate.position.x + clampedRelativePosition.x,
                    y: candidate.position.y,
                    z: parentPlate.position.z + clampedRelativePosition.z,
                  },
                }
              : candidate,
          );
        }
      }

      const finalPlate = nodes.find(
        (candidate): candidate is ContainerBlock =>
          candidate.kind === 'container' && candidate.id === plateId,
      );

      if (!finalPlate) {
        return state;
      }

      nodes = nodes.map((candidate) => {
        if (candidate.kind !== 'container' || candidate.parentId !== plateId) {
          return candidate;
        }

        const relPos = {
          x: candidate.position.x - finalPlate.position.x,
          z: candidate.position.z - finalPlate.position.z,
        };
        const clamped = clampWithinParent(
          relPos,
          { width: nextSize.width, depth: nextSize.depth },
          { width: candidate.frame.width, depth: candidate.frame.depth },
        );
        return {
          ...candidate,
          position: {
            x: finalPlate.position.x + clamped.x,
            y: candidate.position.y,
            z: finalPlate.position.z + clamped.z,
          },
        };
      });

      nodes = nodes.map((candidate) => {
        if (candidate.kind !== 'resource' || candidate.parentId !== plateId) {
          return candidate;
        }

        const clamped = clampWithinParent(
          { x: candidate.position.x, z: candidate.position.z },
          { width: nextSize.width, depth: nextSize.depth },
          DEFAULT_BLOCK_SIZE,
        );
        return {
          ...candidate,
          position: { x: clamped.x, y: candidate.position.y, z: clamped.z },
        };
      });

      return withHistory(state, { ...arch, nodes });
    });
  },

  movePlatePosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const container = containers.find((candidate) => candidate.id === id);

      if (!container) {
        return state;
      }

      let appliedDeltaX = deltaX;
      let appliedDeltaZ = deltaZ;

      if (container.parentId) {
        const parentPlate = containers.find((candidate) => candidate.id === container.parentId);

        if (parentPlate) {
          const unclampedPosition = {
            x: container.position.x + deltaX,
            z: container.position.z + deltaZ,
          };
          const relativePosition = {
            x: unclampedPosition.x - parentPlate.position.x,
            z: unclampedPosition.z - parentPlate.position.z,
          };
          const clampedRelativePosition = clampWithinParent(
            relativePosition,
            { width: parentPlate.frame.width, depth: parentPlate.frame.depth },
            { width: container.frame.width, depth: container.frame.depth },
          );
          const clampedWorldPosition = {
            x: parentPlate.position.x + clampedRelativePosition.x,
            z: parentPlate.position.z + clampedRelativePosition.z,
          };

          appliedDeltaX = clampedWorldPosition.x - container.position.x;
          appliedDeltaZ = clampedWorldPosition.z - container.position.z;
        }
      }

      const sameLevelSiblings = containers
        .filter(
          (candidate) => candidate.parentId === (container.parentId ?? null) && candidate.id !== id,
        )
        .map((candidate) => ({
          id: candidate.id,
          position: { x: candidate.position.x, z: candidate.position.z },
          frame: { width: candidate.frame.width, depth: candidate.frame.depth },
        }));

      const resolved = resolveMoveDelta(
        {
          id: container.id,
          position: { x: container.position.x, z: container.position.z },
          frame: { width: container.frame.width, depth: container.frame.depth },
        },
        appliedDeltaX,
        appliedDeltaZ,
        sameLevelSiblings,
      );
      appliedDeltaX = resolved.deltaX;
      appliedDeltaZ = resolved.deltaZ;

      const descendantIds = new Set<string>([id]);
      const collectDescendants = (parentId: string) => {
        for (const candidate of containers) {
          if (candidate.parentId === parentId && !descendantIds.has(candidate.id)) {
            descendantIds.add(candidate.id);
            collectDescendants(candidate.id);
          }
        }
      };
      collectDescendants(id);

      const nodes = arch.nodes.map((candidate) => {
        if (candidate.kind === 'container' && descendantIds.has(candidate.id)) {
          return {
            ...candidate,
            position: {
              x: candidate.position.x + appliedDeltaX,
              y: candidate.position.y,
              z: candidate.position.z + appliedDeltaZ,
            },
          };
        }

        return candidate;
      });

      return withHistory(state, { ...arch, nodes });
    });
  },

  moveBlockPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const block = resources.find((candidate) => candidate.id === id);

      if (!block) {
        return state;
      }

      const parentPlate = containers.find((candidate) => candidate.id === block.parentId);

      if (!parentPlate) {
        if (block.parentId === null) {
          const nodes = arch.nodes.map((candidate) => {
            if (candidate.id === id && candidate.kind === 'resource') {
              return {
                ...candidate,
                position: {
                  x: candidate.position.x + deltaX,
                  y: candidate.position.y,
                  z: candidate.position.z + deltaZ,
                },
              };
            }
            return candidate;
          });
          return withHistory(state, { ...arch, nodes });
        }
        return state;
      }

      const unclampedPosition = {
        x: block.position.x + deltaX,
        z: block.position.z + deltaZ,
      };
      const clampedPosition = clampWithinParent(
        unclampedPosition,
        { width: parentPlate.frame.width, depth: parentPlate.frame.depth },
        { width: DEFAULT_BLOCK_SIZE.width, depth: DEFAULT_BLOCK_SIZE.depth },
      );

      const nodes = arch.nodes.map((candidate) => {
        if (candidate.id === id && candidate.kind === 'resource') {
          return {
            ...candidate,
            position: {
              x: clampedPosition.x,
              y: candidate.position.y,
              z: clampedPosition.z,
            },
          };
        }
        return candidate;
      });

      return withHistory(state, { ...arch, nodes });
    });
  },

  addExternalBlock: (type, position) => {
    const prevCount = get().workspace.architecture.nodes.length;
    get().addNode({
      kind: 'resource',
      resourceType: type,
      name: type === 'internet' ? 'Internet' : 'Browser',
      parentId: null,
    });

    // If a specific position was requested, overwrite the auto-assigned one
    if (position) {
      set((state) => {
        const arch = state.workspace.architecture;
        if (arch.nodes.length <= prevCount) return state;
        const lastNode = arch.nodes[arch.nodes.length - 1];
        if (!lastNode || lastNode.kind !== 'resource') return state;
        const updatedNodes = [...arch.nodes];
        updatedNodes[updatedNodes.length - 1] = { ...lastNode, position };
        return {
          workspace: {
            ...state.workspace,
            architecture: { ...arch, nodes: updatedNodes },
          },
        };
      });
    }
  },

  /** @deprecated — will be removed in #1540. Operates on externalActors[] for rendering bridge. */
  moveActorPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const currentActors = arch.externalActors ?? [];
      const actor = currentActors.find((candidate) => candidate.id === id);

      if (!actor) {
        return state;
      }

      const externalActors: ExternalActor[] = currentActors.map((candidate) => {
        if (candidate.id !== id) {
          return candidate;
        }

        return {
          ...candidate,
          position: {
            x: candidate.position.x + deltaX,
            y: candidate.position.y,
            z: candidate.position.z + deltaZ,
          },
        };
      });

      return withHistory(state, { ...arch, externalActors });
    });
  },

  /** @deprecated — will be removed in #1540. Writes to externalActors[] for rendering bridge. */
  addExternalActor: (type, position) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const currentActors = arch.externalActors ?? [];
      const actorSuffix = generateId('ext').slice(4);
      const newActor: ExternalActor = {
        id: `ext-${type}-${actorSuffix}`,
        name: type === 'internet' ? 'Internet' : 'Browser',
        type,
        position: position ?? { x: -3, y: 0, z: -3 },
      };
      return withHistory(state, { ...arch, externalActors: [...currentActors, newActor] });
    });
  },

  /** @deprecated — will be removed in #1540. Operates on externalActors[] for rendering bridge. */
  removeExternalActor: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const currentActors = arch.externalActors ?? [];
      const externalActors = currentActors.filter((actor) => actor.id !== id);
      const connections = arch.connections.filter(
        (connection) =>
          connection.metadata['sourceId'] !== id && connection.metadata['targetId'] !== id,
      );
      return withHistory(state, { ...arch, externalActors, connections });
    });
  },

  addConnection: (from, to) => {
    const arch = get().workspace.architecture;

    // Resolve source and target from nodes[] (new path) or externalActors[] (legacy bridge)
    const resources = arch.nodes.filter(isResource);
    const sourceBlock = resources.find((block) => block.id === from);
    const targetBlock = resources.find((block) => block.id === to);
    const sourceActor = (arch.externalActors ?? []).find((actor) => actor.id === from);
    const targetActor = (arch.externalActors ?? []).find((actor) => actor.id === to);
    const sourceActorType: EndpointType | null =
      sourceActor?.type === 'internet' || sourceActor?.type === 'browser' ? sourceActor.type : null;
    const targetActorType: EndpointType | null =
      targetActor?.type === 'internet' || targetActor?.type === 'browser' ? targetActor.type : null;
    const sourceType: EndpointType | null = sourceBlock
      ? getEffectiveEndpointType(sourceBlock)
      : sourceActorType;
    const targetType: EndpointType | null = targetBlock
      ? getEffectiveEndpointType(targetBlock)
      : targetActorType;

    if (!sourceType || !targetType) {
      return false;
    }

    // Self-connection check
    if (from === to) {
      return false;
    }

    // Category pair check
    if (!canConnect(sourceType, targetType)) {
      return false;
    }

    // Resolve endpoint IDs using default 'data' semantic
    const semantic: import('@cloudblocks/schema').EndpointSemantic = 'data';
    const fromEndpointId = endpointId(from, 'output', semantic);
    const toEndpointId = endpointId(to, 'input', semantic);

    // Check duplicate using endpoint IDs
    const exists = arch.connections.some(
      (connection) => connection.from === fromEndpointId && connection.to === toEndpointId,
    );

    if (exists) {
      return false;
    }

    // Verify endpoints exist (skip for external actors which may not have stored endpoints)
    const sourceEndpoint = arch.endpoints.find((endpoint) => endpoint.id === fromEndpointId);
    const targetEndpoint = arch.endpoints.find((endpoint) => endpoint.id === toEndpointId);

    if (!sourceEndpoint && !sourceActor) {
      return false;
    }
    if (!targetEndpoint && !targetActor) {
      return false;
    }

    // Port capacity check
    const sourceResourceType = sourceBlock?.resourceType;
    const targetResourceType = targetBlock?.resourceType;

    const sourcePorts = sourceResourceType
      ? getPortsForResourceType(sourceResourceType)
      : { inbound: 1, outbound: 1 };
    const targetPorts = targetResourceType
      ? getPortsForResourceType(targetResourceType)
      : { inbound: 1, outbound: 1 };

    const usedOutbound = arch.connections.filter((connection) => {
      const endpoint = arch.endpoints.find((candidate) => candidate.id === connection.from);
      if (endpoint) return endpoint.blockId === from;
      const parsed = parseEndpointId(connection.from);
      return parsed?.blockId === from;
    }).length;
    const usedInbound = arch.connections.filter((connection) => {
      const endpoint = arch.endpoints.find((candidate) => candidate.id === connection.to);
      if (endpoint) return endpoint.blockId === to;
      const parsed = parseEndpointId(connection.to);
      return parsed?.blockId === to;
    }).length;

    if (usedOutbound >= sourcePorts.outbound || usedInbound >= targetPorts.inbound) {
      return false;
    }

    set((state) => {
      const nextArch = state.workspace.architecture;
      const connection: Connection = {
        id: generateId('conn'),
        from: fromEndpointId,
        to: toEndpointId,
        metadata: {
          type: 'dataflow',
          sourceId: from,
          targetId: to,
          sourcePort: usedOutbound,
          targetPort: usedInbound,
        },
      };

      return withHistory(state, {
        ...nextArch,
        connections: [...nextArch.connections, connection],
      });
    });
    metricsService.trackEvent('first_connection_created');
    return true;
  },

  removeConnection: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;

      return withHistory(state, {
        ...arch,
        connections: arch.connections.filter((connection) => connection.id !== id),
      });
    });
  },

  updateConnectionType: (connectionId, type) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const existing = arch.connections.find((c) => c.id === connectionId);
      if (!existing) return state;

      const fromEndpoint = arch.endpoints.find((endpoint) => endpoint.id === existing.from);
      const toEndpoint = arch.endpoints.find((endpoint) => endpoint.id === existing.to);
      if (!fromEndpoint || !toEndpoint) {
        return state;
      }

      const semantic = connectionTypeToSemantic(type);
      const nextFrom = endpointId(fromEndpoint.blockId, 'output', semantic);
      const nextTo = endpointId(toEndpoint.blockId, 'input', semantic);

      return withHistory(state, {
        ...arch,
        connections: arch.connections.map((connection) =>
          connection.id === connectionId
            ? {
                ...connection,
                from: nextFrom,
                to: nextTo,
                metadata: { ...connection.metadata, type },
              }
            : connection,
        ),
      });
    });
  },
});

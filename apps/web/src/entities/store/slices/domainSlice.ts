import type { ContainerBlockProfileId } from '../../../shared/types/index';
import type {
  Connection,
  ContainerCapableResourceType,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  buildContainerBlockSizeFromProfileId,
  DEFAULT_BLOCK_SIZE,
  inferLegacyContainerBlockProfileId,
} from '../../../shared/types/index';
import { getBlockDimensions } from '../../../shared/types/visualProfile';
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
import type { EndpointType } from '../../connection/endpointResolver';
import { getEffectiveEndpointType } from '../../connection/endpointResolver';
import { validatePlacement } from '../../validation/placement';
import {
  clampWithinParent,
  DEFAULT_PLATE_SIZE,
  findNonOverlappingPosition,
  nextGridPosition,
  overlapsAnySiblingResource,
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
  | 'resizePlate'
  | 'movePlatePosition'
  | 'moveBlockPosition'
  | 'moveExternalBlockPosition'
  | 'addExternalBlock'
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
type ResizeEdge = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

const MIN_CONTAINER_SIZE: Record<PlateLayerType, { width: number; depth: number }> = {
  global: { width: 4, depth: 4 },
  edge: { width: 4, depth: 4 },
  region: { width: 4, depth: 4 },
  zone: { width: 4, depth: 4 },
  subnet: { width: 2, depth: 2 },
};

const MAX_CONTAINER_SIZE = { width: 40, depth: 40 };

function clampEven(value: number, min: number, max: number): number {
  const rounded = Math.round(value);
  const even = rounded % 2 === 0 ? rounded : rounded + (rounded > value ? -1 : 1);
  const clamped = Math.max(min, Math.min(max, even));
  if (clamped % 2 === 0) {
    return clamped;
  }
  return clamped <= min ? min : clamped - 1;
}

const endpointIdPrefix = (nodeId: string): string => `endpoint-${nodeId}-`;

const CONTAINER_RESOURCE_TYPE: Record<PlateLayerType, ContainerCapableResourceType> = {
  global: 'virtual_network',
  edge: 'virtual_network',
  region: 'virtual_network',
  zone: 'virtual_network',
  subnet: 'subnet',
};

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

  resizePlate: (plateId, newWidth, newDepth, anchorEdge?: ResizeEdge) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const container = containers.find((candidate) => candidate.id === plateId);

      if (!container) {
        return state;
      }

      const minSize =
        MIN_CONTAINER_SIZE[container.layer as PlateLayerType] ?? MIN_CONTAINER_SIZE.region;
      const snappedWidth = clampEven(newWidth, minSize.width, MAX_CONTAINER_SIZE.width);
      const snappedDepth = clampEven(newDepth, minSize.depth, MAX_CONTAINER_SIZE.depth);

      if (container.frame.width === snappedWidth && container.frame.depth === snappedDepth) {
        return state;
      }

      const edgeSouth = container.position.x - container.frame.width / 2;
      const edgeNorth = container.position.x + container.frame.width / 2;
      const edgeWest = container.position.z - container.frame.depth / 2;
      const edgeEast = container.position.z + container.frame.depth / 2;

      let nextPositionX = container.position.x;
      let nextPositionZ = container.position.z;

      if (anchorEdge?.includes('s')) {
        nextPositionX = edgeSouth + snappedWidth / 2;
      } else if (anchorEdge?.includes('n')) {
        nextPositionX = edgeNorth - snappedWidth / 2;
      }

      if (anchorEdge?.includes('w')) {
        nextPositionZ = edgeWest + snappedDepth / 2;
      } else if (anchorEdge?.includes('e')) {
        nextPositionZ = edgeEast - snappedDepth / 2;
      }

      const nextFrame = {
        width: snappedWidth,
        height: container.frame.height,
        depth: snappedDepth,
      };

      const nextProfileId = inferLegacyContainerBlockProfileId({
        type: container.layer as PlateLayerType,
        size: { width: nextFrame.width, depth: nextFrame.depth },
      });

      const resizedPlate: ContainerBlock = {
        ...container,
        profileId: nextProfileId,
        frame: nextFrame,
        position: {
          x: nextPositionX,
          y: container.position.y,
          z: nextPositionZ,
        },
      };

      let nodes = arch.nodes.map((candidate) =>
        candidate.id === plateId && candidate.kind === 'container' ? resizedPlate : candidate,
      );

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
          { width: nextFrame.width, depth: nextFrame.depth },
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
          { width: nextFrame.width, depth: nextFrame.depth },
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

  // Overlap prevention: drag-time checks below prevent users from creating
  // NEW overlaps. For legacy/imported data that already contains overlaps,
  // `validateNoOverlap()` in placement.ts will surface them as validation
  // errors. NOTE: validateNoOverlap is not yet wired into the validation
  // engine (engine.ts) — that is a separate wiring task.
  moveBlockPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const block = resources.find((candidate) => candidate.id === id);

      if (!block) {
        return state;
      }

      const blockSize = getBlockDimensions(block.category, block.provider, block.subtype);

      const parentPlate = containers.find((candidate) => candidate.id === block.parentId);

      if (!parentPlate) {
        if (block.parentId === null) {
          const candidatePosition = {
            x: block.position.x + deltaX,
            z: block.position.z + deltaZ,
          };
          const rootResources = resources.filter((candidate) => candidate.parentId === null);
          if (
            overlapsAnySiblingResource(
              candidatePosition,
              blockSize,
              rootResources,
              id,
              block.position,
            )
          ) {
            return state;
          }

          const nodes = arch.nodes.map((candidate) => {
            if (candidate.id === id && candidate.kind === 'resource') {
              return {
                ...candidate,
                position: {
                  x: candidatePosition.x,
                  y: candidate.position.y,
                  z: candidatePosition.z,
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
        { width: blockSize.width, depth: blockSize.depth },
      );

      const siblingResources = resources.filter(
        (candidate) => candidate.parentId === block.parentId,
      );
      if (
        overlapsAnySiblingResource(clampedPosition, blockSize, siblingResources, id, block.position)
      ) {
        return state;
      }

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

  moveExternalBlockPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const resources = arch.nodes.filter(isResource);
      const block = resources.find((candidate) => candidate.id === id);

      if (!block || block.parentId !== null) {
        return state;
      }

      const blockSize = getBlockDimensions(block.category, block.provider, block.subtype);
      const candidatePosition = {
        x: block.position.x + deltaX,
        z: block.position.z + deltaZ,
      };
      const rootResources = resources.filter((candidate) => candidate.parentId === null);
      if (
        overlapsAnySiblingResource(candidatePosition, blockSize, rootResources, id, block.position)
      ) {
        return state;
      }

      // Update nodes[]
      const nodes = arch.nodes.map((candidate) => {
        if (candidate.id === id && candidate.kind === 'resource') {
          return {
            ...candidate,
            position: {
              x: candidatePosition.x,
              y: candidate.position.y,
              z: candidatePosition.z,
            },
          };
        }
        return candidate;
      });

      // Sync externalActors[] from the computed node position (single source of truth)
      const updatedNode = nodes.find((n) => n.id === id);
      const externalActors = arch.externalActors?.map((actor) => {
        if (actor.id === id && updatedNode) {
          return {
            ...actor,
            position: { ...updatedNode.position },
          };
        }
        return actor;
      });

      return withHistory(state, { ...arch, nodes, ...(externalActors ? { externalActors } : {}) });
    });
  },

  addExternalBlock: (type, position) => {
    const prevCount = get().workspace.architecture.nodes.length;
    get().addNode({
      kind: 'resource',
      resourceType: type,
      name: type === 'internet' ? 'Internet' : 'Client',
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

  addConnection: (from, to) => {
    const arch = get().workspace.architecture;

    // Resolve source and target from nodes[]
    const resources = arch.nodes.filter(isResource);
    const sourceBlock = resources.find((block) => block.id === from);
    const targetBlock = resources.find((block) => block.id === to);
    const sourceType: EndpointType | null = sourceBlock
      ? getEffectiveEndpointType(sourceBlock)
      : null;
    const targetType: EndpointType | null = targetBlock
      ? getEffectiveEndpointType(targetBlock)
      : null;

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

    // Verify endpoints exist
    const sourceEndpoint = arch.endpoints.find((endpoint) => endpoint.id === fromEndpointId);
    const targetEndpoint = arch.endpoints.find((endpoint) => endpoint.id === toEndpointId);

    if (!sourceEndpoint) {
      return false;
    }
    if (!targetEndpoint) {
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

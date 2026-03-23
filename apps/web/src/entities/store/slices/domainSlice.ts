import type { PlateProfileId } from '../../../shared/types/index';
import type {
  Connection,
  ContainerCapableResourceType,
  ContainerNode,
  ExternalActor,
  LeafNode,
  ResourceCategory,
} from '@cloudblocks/schema';
import { buildPlateSizeFromProfileId, DEFAULT_BLOCK_SIZE } from '../../../shared/types/index';
import {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForNode,
  getPortsForResourceType,
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
  | 'addConnection'
  | 'removeConnection'
  | 'updateConnectionType'
>;

const isContainer = (node: ContainerNode | LeafNode): node is ContainerNode =>
  node.kind === 'container';

const isResource = (node: ContainerNode | LeafNode): node is LeafNode => node.kind === 'resource';

type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

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
      // Resolve layer → PlateType for the existing addPlate logic
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
        input.parentId!,
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

  // ── Deprecated wrappers (delegates preserved for backward compat) ────────
  addPlate: (type, name, parentId, profileId?: PlateProfileId) => {
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

      const plate: ContainerNode = {
        id: generateId('plate'),
        name,
        kind: 'container',
        layer: type,
        resourceType: CONTAINER_RESOURCE_TYPE[type],
        category: 'network',
        provider: 'azure',
        profileId,
        parentId,
        position: { x: 0, y: 0, z: 0 },
        size: profileId ? buildPlateSizeFromProfileId(profileId) : { ...DEFAULT_PLATE_SIZE[type] },
        metadata: {},
      };

      if (type === 'region') {
        plate.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const siblingsInParent = containers.filter((candidate) => candidate.parentId === parentId);
        const subnetSpacing = 7.0;
        const offsetX = -3.5 + siblingsInParent.length * subnetSpacing;
        const clampedRelativePosition = parentPlate
          ? clampWithinParent(
              { x: offsetX, z: 0 },
              { width: parentPlate.size.width, depth: parentPlate.size.depth },
              { width: plate.size.width, depth: plate.size.depth },
            )
          : { x: offsetX, z: 0 };

        plate.position = {
          x: parentPlate
            ? parentPlate.position.x + clampedRelativePosition.x
            : clampedRelativePosition.x,
          y: parentPlate ? parentPlate.position.y + parentPlate.size.height : 0.3,
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
          size: { width: candidate.size.width, depth: candidate.size.depth },
        }));

      const nonOverlapping = findNonOverlappingPosition(
        { x: plate.position.x, z: plate.position.z },
        { width: plate.size.width, depth: plate.size.depth },
        sameLevelSiblings,
      );
      plate.position.x = nonOverlapping.x;
      plate.position.z = nonOverlapping.z;

      return withHistory(state, {
        ...arch,
        nodes: [...arch.nodes, plate],
        endpoints: [...arch.endpoints, ...generateEndpointsForNode(plate.id)],
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
      const plate = containers.find((candidate) => candidate.id === id);

      if (!plate) {
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
          .filter((endpoint) => removedNodeIds.has(endpoint.nodeId))
          .map((endpoint) => endpoint.id),
      );

      const endpoints = arch.endpoints.filter((endpoint) => !removedNodeIds.has(endpoint.nodeId));

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
      const containers = arch.nodes.filter(isContainer);
      const resources = arch.nodes.filter(isResource);
      const plate = containers.find((candidate) => candidate.id === placementId);

      if (!plate) {
        return state;
      }

      const existingBlocksOnPlate = resources.filter((block) => block.parentId === placementId);

      const block: LeafNode = {
        id: generateId('block'),
        name,
        kind: 'resource',
        layer: 'resource',
        resourceType: subtype ?? category,
        category,
        provider: provider ?? 'azure',
        parentId: placementId,
        position: nextGridPosition(existingBlocksOnPlate, plate.size),
        metadata: {},
        ...(subtype ? { subtype } : {}),
        ...(config ? { config } : {}),
      };

      return withHistory(state, {
        ...arch,
        nodes: [...arch.nodes, block],
        endpoints: [...arch.endpoints, ...generateEndpointsForNode(block.id)],
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
        width: parentPlate.size.width,
        depth: parentPlate.size.depth,
      });

      const clampedXZ = clampWithinParent(
        { x: unclampedPosition.x, z: unclampedPosition.z },
        parentPlate.size,
        DEFAULT_BLOCK_SIZE,
      );

      const position = {
        x: clampedXZ.x,
        y: unclampedPosition.y,
        z: clampedXZ.z,
      };

      const newBlock: LeafNode = {
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
        endpoints: arch.endpoints.filter((endpoint) => endpoint.nodeId !== id),
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
      const plate = arch.nodes.filter(isContainer).find((candidate) => candidate.id === plateId);

      if (!plate) {
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
      const newPosition = nextGridPosition(blocksOnTarget, targetPlate.size);

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
      const plate = containers.find((candidate) => candidate.id === plateId);

      if (!plate || plate.profileId === profileId) {
        return state;
      }

      const nextSize = buildPlateSizeFromProfileId(profileId);
      const resizedPlate: ContainerNode = {
        ...plate,
        profileId,
        size: nextSize,
      };

      let nodes = arch.nodes.map((candidate) =>
        candidate.id === plateId && candidate.kind === 'container' ? resizedPlate : candidate,
      );

      if (plate.parentId) {
        const parentPlate = containers.find((candidate) => candidate.id === plate.parentId);
        if (parentPlate) {
          const relativePosition = {
            x: plate.position.x - parentPlate.position.x,
            z: plate.position.z - parentPlate.position.z,
          };
          const clampedRelativePosition = clampWithinParent(
            relativePosition,
            { width: parentPlate.size.width, depth: parentPlate.size.depth },
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
        (candidate): candidate is ContainerNode =>
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
          { width: candidate.size.width, depth: candidate.size.depth },
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
      const plate = containers.find((candidate) => candidate.id === id);

      if (!plate) {
        return state;
      }

      let appliedDeltaX = deltaX;
      let appliedDeltaZ = deltaZ;

      if (plate.parentId) {
        const parentPlate = containers.find((candidate) => candidate.id === plate.parentId);

        if (parentPlate) {
          const unclampedPosition = {
            x: plate.position.x + deltaX,
            z: plate.position.z + deltaZ,
          };
          const relativePosition = {
            x: unclampedPosition.x - parentPlate.position.x,
            z: unclampedPosition.z - parentPlate.position.z,
          };
          const clampedRelativePosition = clampWithinParent(
            relativePosition,
            { width: parentPlate.size.width, depth: parentPlate.size.depth },
            { width: plate.size.width, depth: plate.size.depth },
          );
          const clampedWorldPosition = {
            x: parentPlate.position.x + clampedRelativePosition.x,
            z: parentPlate.position.z + clampedRelativePosition.z,
          };

          appliedDeltaX = clampedWorldPosition.x - plate.position.x;
          appliedDeltaZ = clampedWorldPosition.z - plate.position.z;
        }
      }

      const sameLevelSiblings = containers
        .filter(
          (candidate) => candidate.parentId === (plate.parentId ?? null) && candidate.id !== id,
        )
        .map((candidate) => ({
          id: candidate.id,
          position: { x: candidate.position.x, z: candidate.position.z },
          size: { width: candidate.size.width, depth: candidate.size.depth },
        }));

      const resolved = resolveMoveDelta(
        {
          id: plate.id,
          position: { x: plate.position.x, z: plate.position.z },
          size: { width: plate.size.width, depth: plate.size.depth },
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
        return state;
      }

      const unclampedPosition = {
        x: block.position.x + deltaX,
        z: block.position.z + deltaZ,
      };
      const clampedPosition = clampWithinParent(
        unclampedPosition,
        { width: parentPlate.size.width, depth: parentPlate.size.depth },
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

  addConnection: (from, to) => {
    const arch = get().workspace.architecture;

    // Resolve source and target nodes/actors by node ID
    const resources = arch.nodes.filter(isResource);
    const sourceBlock = resources.find((block) => block.id === from);
    const targetBlock = resources.find((block) => block.id === to);
    const sourceActor = (arch.externalActors ?? []).find((actor) => actor.id === from);
    const targetActor = (arch.externalActors ?? []).find((actor) => actor.id === to);
    const sourceType: EndpointType | null = sourceBlock?.category ?? sourceActor?.type ?? null;
    const targetType: EndpointType | null = targetBlock?.category ?? targetActor?.type ?? null;

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

    // Verify endpoints exist in the model (skip for external actors which may not have stored endpoints)
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
      if (endpoint) return endpoint.nodeId === from;
      const parsed = parseEndpointId(connection.from);
      return parsed?.nodeId === from;
    }).length;
    const usedInbound = arch.connections.filter((connection) => {
      const endpoint = arch.endpoints.find((candidate) => candidate.id === connection.to);
      if (endpoint) return endpoint.nodeId === to;
      const parsed = parseEndpointId(connection.to);
      return parsed?.nodeId === to;
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
          sourceStub: usedOutbound,
          targetStub: usedInbound,
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
      const nextFrom = endpointId(fromEndpoint.nodeId, 'output', semantic);
      const nextTo = endpointId(toEndpoint.nodeId, 'input', semantic);

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

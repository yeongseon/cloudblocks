import type { PlateProfileId } from '../../../shared/types/index';
import type { Block, Connection, ExternalActor, Plate } from '@cloudblocks/schema';
import { buildPlateSizeFromProfileId, DEFAULT_BLOCK_SIZE } from '../../../shared/types/index';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureSlice, ArchitectureState } from './types';
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
>;

export const createDomainSlice: ArchitectureSlice<DomainSlice> = (set, get) => ({
  addPlate: (type, name, parentId, subnetAccess, profileId?: PlateProfileId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const parentPlate = parentId
        ? arch.plates.find((candidate) => candidate.id === parentId)
        : undefined;
      if (parentId && !parentPlate) {
        return state;
      }
      const plate: Plate = {
        id: generateId('plate'),
        name,
        type,
        subnetAccess: type === 'subnet' ? subnetAccess : undefined,
        profileId,
        parentId,
        children: [],
        position: { x: 0, y: 0, z: 0 },
        size: profileId ? buildPlateSizeFromProfileId(profileId) : { ...DEFAULT_PLATE_SIZE[type] },
        metadata: {},
      };

      if (type === 'region') {
        plate.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const siblingsInParent = arch.plates.filter(
          (candidate) => candidate.parentId === parentId
        );
        const subnetSpacing = 7.0;
        const offsetX = -3.5 + siblingsInParent.length * subnetSpacing;
        const clampedRelativePosition = parentPlate
          ? clampWithinParent(
            { x: offsetX, z: 0 },
            { width: parentPlate.size.width, depth: parentPlate.size.depth },
            { width: plate.size.width, depth: plate.size.depth }
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

      const sameLevelSiblings = arch.plates
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

      let plates = [...arch.plates, plate];

      if (parentId) {
        plates = plates.map((candidate) =>
          candidate.id === parentId
            ? { ...candidate, children: [...candidate.children, plate.id] }
            : candidate
        );
      }

      return withHistory(state, { ...arch, plates });
    });
  },

  removePlate: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((candidate) => candidate.id === id);

      if (!plate) {
        return state;
      }

      const idsToRemove = new Set<string>();
      const collectChildren = (plateId: string) => {
        idsToRemove.add(plateId);
        const candidate = arch.plates.find((entry) => entry.id === plateId);

        if (!candidate) {
          return;
        }

        candidate.children.forEach((childId) => {
          if (arch.plates.find((entry) => entry.id === childId)) {
            collectChildren(childId);
          }
        });
      };

      collectChildren(id);

      const newPlates = arch.plates
        .filter((candidate) => !idsToRemove.has(candidate.id))
        .map((candidate) =>
          candidate.id === plate.parentId
            ? {
              ...candidate,
              children: candidate.children.filter((childId) => childId !== id),
            }
            : candidate
        );

      const newBlocks = arch.blocks.filter(
        (block) => !idsToRemove.has(block.placementId)
      );

      const removedBlockIds = new Set(
        arch.blocks
          .filter((block) => idsToRemove.has(block.placementId))
          .map((block) => block.id)
      );

      const newConnections = arch.connections.filter(
        (connection) =>
          !removedBlockIds.has(connection.sourceId) &&
          !removedBlockIds.has(connection.targetId)
      );

      return withHistory(state, {
        ...arch,
        plates: newPlates,
        blocks: newBlocks,
        connections: newConnections,
      });
    });
  },

  addBlock: (category, name, placementId, provider, subtype, config) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((candidate) => candidate.id === placementId);

      if (!plate) {
        return state;
      }

      const existingBlocksOnPlate = arch.blocks.filter(
        (block) => block.placementId === placementId
      );

      const block: Block = {
        id: generateId('block'),
        name,
        category,
        placementId,
        position: nextGridPosition(existingBlocksOnPlate, plate.size),
        metadata: {},
        provider,
        subtype,
        config,
      };

      return withHistory(state, {
        ...arch,
        blocks: [...arch.blocks, block],
        plates: arch.plates.map((candidate) =>
          candidate.id === placementId
            ? { ...candidate, children: [...candidate.children, block.id] }
            : candidate
        ),
      });
    });
  },

  duplicateBlock: (blockId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const sourceBlock = arch.blocks.find((candidate) => candidate.id === blockId);

      if (!sourceBlock) {
        return state;
      }

      const parentPlate = arch.plates.find(
        (candidate) => candidate.id === sourceBlock.placementId
      );

      if (!parentPlate) {
        return state;
      }

      const siblingsOnPlate = arch.blocks.filter(
        (candidate) => candidate.placementId === sourceBlock.placementId
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

      const newBlock: Block = {
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
        blocks: [...arch.blocks, newBlock],
        plates: arch.plates.map((candidate) =>
          candidate.id === sourceBlock.placementId
            ? { ...candidate, children: [...candidate.children, newBlock.id] }
            : candidate
        ),
      });
    });
  },

  removeBlock: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((candidate) => candidate.id === id);

      if (!block) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        blocks: arch.blocks.filter((candidate) => candidate.id !== id),
        plates: arch.plates.map((candidate) =>
          candidate.id === block.placementId
            ? {
              ...candidate,
              children: candidate.children.filter((childId) => childId !== id),
            }
            : candidate
        ),
        connections: arch.connections.filter(
          (connection) => connection.sourceId !== id && connection.targetId !== id
        ),
      });
    });
  },

  renameBlock: (blockId, newName) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((candidate) => candidate.id === blockId);

      if (!block) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        blocks: arch.blocks.map((candidate) =>
          candidate.id === blockId ? { ...candidate, name: newName } : candidate
        ),
      });
    });
  },

  renamePlate: (plateId, newName) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((candidate) => candidate.id === plateId);

      if (!plate) {
        return state;
      }

      return withHistory(state, {
        ...arch,
        plates: arch.plates.map((candidate) =>
          candidate.id === plateId ? { ...candidate, name: newName } : candidate
        ),
      });
    });
  },

  moveBlock: (blockId, newPlacementId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((candidate) => candidate.id === blockId);

      if (!block) {
        return state;
      }

      const oldPlacementId = block.placementId;
      if (oldPlacementId === newPlacementId) {
        return state;
      }

      const targetPlate = arch.plates.find(
        (candidate) => candidate.id === newPlacementId
      );

      if (!targetPlate) {
        return state;
      }

      if (validatePlacement(block, targetPlate) !== null) {
        return state;
      }

      const blocksOnTarget = arch.blocks.filter(
        (candidate) => candidate.placementId === newPlacementId
      );
      const newPosition = nextGridPosition(blocksOnTarget, targetPlate.size);

      return withHistory(state, {
        ...arch,
        blocks: arch.blocks.map((candidate) =>
          candidate.id === blockId
            ? {
              ...candidate,
              placementId: newPlacementId,
              position: newPosition,
            }
            : candidate
        ),
        plates: arch.plates.map((candidate) => {
          if (candidate.id === oldPlacementId) {
            return {
              ...candidate,
              children: candidate.children.filter((childId) => childId !== blockId),
            };
          }

          if (candidate.id === newPlacementId) {
            return {
              ...candidate,
              children: [...candidate.children, blockId],
            };
          }

          return candidate;
        }),
      });
    });
  },

  setPlateProfile: (plateId, profileId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((candidate) => candidate.id === plateId);

      if (!plate || plate.profileId === profileId) {
        return state;
      }

      const nextSize = buildPlateSizeFromProfileId(profileId);
      const resizedPlate = {
        ...plate,
        profileId,
        size: nextSize,
      };

      let plates = arch.plates.map((candidate) =>
        candidate.id === plateId ? resizedPlate : candidate
      );

      if (plate.parentId) {
        const parentPlate = arch.plates.find((candidate) => candidate.id === plate.parentId);
        if (parentPlate) {
          const relativePosition = {
            x: plate.position.x - parentPlate.position.x,
            z: plate.position.z - parentPlate.position.z,
          };
          const clampedRelativePosition = clampWithinParent(
            relativePosition,
            { width: parentPlate.size.width, depth: parentPlate.size.depth },
            { width: nextSize.width, depth: nextSize.depth }
          );

          plates = plates.map((candidate) =>
            candidate.id === plateId
              ? {
                ...candidate,
                position: {
                  x: parentPlate.position.x + clampedRelativePosition.x,
                  y: candidate.position.y,
                  z: parentPlate.position.z + clampedRelativePosition.z,
                },
              }
              : candidate
          );
        }
      }

      const finalPlate = plates.find((candidate) => candidate.id === plateId)!;

      plates = plates.map((candidate) => {
        if (candidate.parentId !== plateId) return candidate;
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

      const blocks = arch.blocks.map((block) => {
        if (block.placementId !== plateId) return block;
        const clamped = clampWithinParent(
          { x: block.position.x, z: block.position.z },
          { width: nextSize.width, depth: nextSize.depth },
          DEFAULT_BLOCK_SIZE,
        );
        return {
          ...block,
          position: { x: clamped.x, y: block.position.y, z: clamped.z },
        };
      });

      return withHistory(state, { ...arch, plates, blocks });
    });
  },

  movePlatePosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((candidate) => candidate.id === id);

      if (!plate) {
        return state;
      }

      let appliedDeltaX = deltaX;
      let appliedDeltaZ = deltaZ;

      if (plate.parentId) {
        const parentPlate = arch.plates.find(
          (candidate) => candidate.id === plate.parentId
        );

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
            { width: plate.size.width, depth: plate.size.depth }
          );
          const clampedWorldPosition = {
            x: parentPlate.position.x + clampedRelativePosition.x,
            z: parentPlate.position.z + clampedRelativePosition.z,
          };

          appliedDeltaX = clampedWorldPosition.x - plate.position.x;
          appliedDeltaZ = clampedWorldPosition.z - plate.position.z;
        }
      }

      const sameLevelSiblings = arch.plates
        .filter((candidate) => candidate.parentId === (plate.parentId ?? null) && candidate.id !== id)
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
        for (const candidate of arch.plates) {
          if (candidate.parentId === parentId && !descendantIds.has(candidate.id)) {
            descendantIds.add(candidate.id);
            collectDescendants(candidate.id);
          }
        }
      };
      collectDescendants(id);

      const plates = arch.plates.map((candidate) => {
        if (descendantIds.has(candidate.id)) {
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

      return withHistory(state, { ...arch, plates });
    });
  },

  moveBlockPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((candidate) => candidate.id === id);

      if (!block) {
        return state;
      }

      const parentPlate = arch.plates.find(
        (candidate) => candidate.id === block.placementId
      );

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
        { width: DEFAULT_BLOCK_SIZE.width, depth: DEFAULT_BLOCK_SIZE.depth }
      );

      const blocks = arch.blocks.map((candidate) => {
        if (candidate.id === id) {
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

      return withHistory(state, { ...arch, blocks });
    });
  },

  moveActorPosition: (id, deltaX, deltaZ) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const actor = arch.externalActors.find((candidate) => candidate.id === id);

      if (!actor) {
        return state;
      }

      const externalActors: ExternalActor[] = arch.externalActors.map((candidate) => {
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

  addConnection: (sourceId, targetId) => {
    const arch = get().workspace.architecture;
    const exists = arch.connections.some(
      (connection) =>
        connection.sourceId === sourceId && connection.targetId === targetId
    );

    if (exists) {
      return false;
    }

    const sourceBlock = arch.blocks.find((block) => block.id === sourceId);
    const sourceActor = arch.externalActors.find((actor) => actor.id === sourceId);
    const sourceType: EndpointType | null = sourceBlock?.category ?? sourceActor?.type ?? null;

    const targetBlock = arch.blocks.find((block) => block.id === targetId);
    const targetActor = arch.externalActors.find((actor) => actor.id === targetId);
    const targetType: EndpointType | null = targetBlock?.category ?? targetActor?.type ?? null;

    if (!sourceType || !targetType) {
      return false;
    }

    if (!canConnect(sourceType, targetType)) {
      return false;
    }

    set((state) => {
      const nextArch = state.workspace.architecture;
      const connection: Connection = {
        id: generateId('conn'),
        sourceId,
        targetId,
        type: 'dataflow',
        metadata: {},
      };

      return withHistory(state, {
        ...nextArch,
        connections: [...nextArch.connections, connection],
      });
    });
    return true;
  },

  removeConnection: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;

      return withHistory(state, {
        ...arch,
        connections: arch.connections.filter(
          (connection) => connection.id !== id
        ),
      });
    });
  },
});

import type { Block, Connection, Plate } from '../../../shared/types/index';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureSlice, ArchitectureState } from './types';
import { DEFAULT_PLATE_SIZE, nextGridPosition, withHistory } from './helpers';

type DomainSlice = Pick<
  ArchitectureState,
  | 'addPlate'
  | 'removePlate'
  | 'addBlock'
  | 'removeBlock'
  | 'moveBlock'
  | 'addConnection'
  | 'removeConnection'
>;

export const createDomainSlice: ArchitectureSlice<DomainSlice> = (set) => ({
  addPlate: (type, name, parentId, subnetAccess) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate: Plate = {
        id: generateId('plate'),
        name,
        type,
        subnetAccess: type === 'subnet' ? subnetAccess : undefined,
        parentId,
        children: [],
        position: { x: 0, y: 0, z: 0 },
        size: { ...DEFAULT_PLATE_SIZE[type] },
        metadata: {},
      };

      if (type === 'network') {
        plate.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const parentPlate = arch.plates.find((candidate) => candidate.id === parentId);
        const siblingsInParent = arch.plates.filter(
          (candidate) => candidate.parentId === parentId
        );
        const subnetSpacing = 5.5;
        const offsetX = -2.75 + siblingsInParent.length * subnetSpacing;
        plate.position = {
          x: parentPlate ? parentPlate.position.x + offsetX : offsetX,
          y: parentPlate ? parentPlate.position.y + parentPlate.size.height : 0.3,
          z: parentPlate ? parentPlate.position.z : 0,
        };
      }

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

  addBlock: (category, name, placementId) => {
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

  addConnection: (sourceId, targetId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const exists = arch.connections.some(
        (connection) =>
          connection.sourceId === sourceId && connection.targetId === targetId
      );

      if (exists) {
        return state;
      }

      const connection: Connection = {
        id: generateId('conn'),
        sourceId,
        targetId,
        type: 'dataflow',
        metadata: {},
      };

      return withHistory(state, {
        ...arch,
        connections: [...arch.connections, connection],
      });
    });
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

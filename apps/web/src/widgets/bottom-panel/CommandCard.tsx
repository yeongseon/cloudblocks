/**
 * Command Card — Resource Creation Grid
 *
 * Shown only when the minifigure (worker) is selected:
 * - Build Order mode: Worker build commands with Tech Tree
 * - Creation mode: Resource creation buttons with Tech Tree
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.5
 */

import { useRef, useCallback, useEffect, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import interact from 'interactjs';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BlockSvg } from '../../entities/block/BlockSvg';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
} from './useTechTree';
import { BLOCK_FRIENDLY_NAMES, BLOCK_ICONS } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockWorldPosition } from '../../shared/utils/position';
import type { BlockCategory, ProviderType } from '@cloudblocks/schema';
import './CommandCard.css';

interface CommandCardProps {
  className?: string;
}

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];
const PROVIDER_RESOURCE_ALLOWLIST: Record<ProviderType, ReadonlySet<ResourceType>> = {
  azure: new Set(ALL_RESOURCES),
  aws: new Set(ALL_RESOURCES),
  gcp: new Set(ALL_RESOURCES),
};

type CreationGroupId = BlockCategory | 'plate';

const CREATION_GROUP_ORDER: CreationGroupId[] = [
  'plate',
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
];

function getCreationGroupMeta(groupId: CreationGroupId): { icon: string; label: string; color: string } {
  if (groupId === 'plate') {
    return {
      icon: '🧭',
      label: 'Network Foundations',
      color: '#2563EB',
    };
  }

  return {
    icon: BLOCK_ICONS[groupId],
    label: BLOCK_FRIENDLY_NAMES[groupId],
    color: getBlockColor('azure', undefined, groupId),
  };
}

function getCreationGroupId(type: ResourceType): CreationGroupId {
  const blockCategory = RESOURCE_DEFINITIONS[type].blockCategory;
  return blockCategory ?? 'plate';
}
export function CommandCard({ className = '' }: CommandCardProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const isWorkerSelected = selectedId === 'worker-default';

  const isBuildOrderOpen = useUIStore((s) => s.isBuildOrderOpen);
  const toggleBuildOrder = useUIStore((s) => s.toggleBuildOrder);

  const headerText = isWorkerSelected ? 'Build Order' : 'Create Resource';
  const modeContent = isWorkerSelected ? <WorkerBuildMode /> : <CreationMode />;

  return (
    <div className={`command-card ${isWorkerSelected ? 'command-card--worker-mode' : ''} ${className}`}>
      <div className="command-card-header">
        <span className="command-card-header-text">
          {headerText}
        </span>
        {isBuildOrderOpen && (
          <button
            type="button"
            className="command-card-collapse-btn"
            onClick={toggleBuildOrder}
            aria-label="Collapse Build Order panel"
            title="Collapse"
          >
            »
          </button>
        )}
      </div>
      <div className="command-card-grid">
        {modeContent}
      </div>
    </div>
  );
}

// ─── Creation Mode ─────────────────────────────────────────

function CreationMode() {
  const techTree = useTechTree();
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startPlacing = useUIStore((s) => s.startPlacing);
  const cancelInteraction = useUIStore((s) => s.cancelInteraction);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback((name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); }, [isSoundMuted]);
  const counterRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((resource) => getCreationGroupId(resource) === groupId)
      .filter((resource) => providerResources.has(resource))
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));

    return { groupId, resources };
  }).filter((group) => group.resources.length > 0);

  useEffect(() => {
    if (!gridRef.current) return;

    const buttons = gridRef.current.querySelectorAll<HTMLButtonElement>(
      '.command-card-btn:not(.disabled):not(.command-card-btn--empty)',
    );
    const interactables = Array.from(buttons).map((button) => interact(button).draggable({
      listeners: {
        start() {
          isDraggingRef.current = false;
        },
        move(event) {
          isDraggingRef.current = true;
          const buttonEl = event.target as HTMLButtonElement;
          buttonEl.classList.add('is-dragging');

          const type = buttonEl.dataset.resourceType as ResourceType | undefined;
          if (!type) return;

          const def = RESOURCE_DEFINITIONS[type];
          if (!def?.blockCategory) return;

          startPlacing(def.blockCategory, getResourceLabel(type, activeProvider));
        },
        end(event) {
          const buttonEl = event.target as HTMLButtonElement;
          buttonEl.classList.remove('is-dragging');
          cancelInteraction();

          if (dragResetTimerRef.current) {
            clearTimeout(dragResetTimerRef.current);
          }
          dragResetTimerRef.current = setTimeout(() => {
            isDraggingRef.current = false;
          }, 50);
        },
      },
      autoScroll: false,
    }));

    return () => {
      if (dragResetTimerRef.current) {
        clearTimeout(dragResetTimerRef.current);
      }
      buttons.forEach((button) => {
        button.classList.remove('is-dragging');
      });
      cancelInteraction();
      interactables.forEach((interactable) => {
        interactable.unset();
      });
    };
  }, [cancelInteraction, startPlacing]);

  const handleCreate = useCallback((type: ResourceType) => {
    if (isDraggingRef.current) return;

    const def = RESOURCE_DEFINITIONS[type];

    // Handle plate creation
    if (def.category === 'plate') {
    if (type === 'network') {
      addPlate('region', 'VNet', null);
        playSound('block-snap');
      } else if (type === 'public-subnet') {
        const targetId = techTree.getTargetPlateId(type);
        if (targetId) {
          addPlate('subnet', 'Public Subnet', targetId, 'public');
          playSound('block-snap');
        }
      } else if (type === 'private-subnet') {
        const targetId = techTree.getTargetPlateId(type);
        if (targetId) {
          addPlate('subnet', 'Private Subnet', targetId, 'private');
          playSound('block-snap');
        }
      }
      return;
    }

    // Handle block creation
    if (def.blockCategory) {
      const targetId = techTree.getTargetPlateId(type);
      if (!targetId) {
        toast.error('Please create a Network first.');
        return;
      }

      counterRef.current += 1;
      const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
      addBlock(def.blockCategory, name, targetId, activeProvider, def.id);
      playSound('block-snap');
    }
  }, [activeProvider, addPlate, addBlock, techTree, playSound]);

  return (
    <div ref={gridRef} className="command-card-creation-groups">
      {groupedResources.map(({ groupId, resources }) => {
        const groupMeta = getCreationGroupMeta(groupId);
        return (
          <section key={groupId} className="command-card-category-group" aria-label={`${groupMeta.label} resource group`}>
            <header className="command-card-category-header" style={{ '--category-color': groupMeta.color } as CSSProperties}>
              <span className="command-card-category-icon" aria-hidden="true">{groupMeta.icon}</span>
              <span className="command-card-category-label">{groupMeta.label}</span>
            </header>

            <div className="command-card-category-grid">
              {resources.map((type) => {
                const def = RESOURCE_DEFINITIONS[type];
                const enabled = techTree.isEnabled(type);
                const disabledReason = techTree.getDisabledReason(type);

                return (
                  <button
                    key={type}
                    type="button"
                    className={`command-card-btn command-card-resource-btn ${enabled ? '' : 'disabled'}`}
                    data-resource-type={type}
                    onClick={() => enabled && handleCreate(type)}
                    disabled={!enabled}
                    title={enabled ? `Create ${getResourceLabel(type, activeProvider)}` : disabledReason ?? undefined}
                  >
                    <span className="command-btn-icon">{def.icon}</span>
                    <span className="command-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
                    {!enabled && disabledReason && <span className="command-btn-requirement">Needs: {disabledReason}</span>}
                    {!enabled && <span className="command-btn-lock">🔒</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WorkerBuildMode() {
  const techTree = useTechTree();
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startBuild = useWorkerStore((s) => s.startBuild);
  const counterRef = useRef(0);
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((resource) => getCreationGroupId(resource) === groupId)
      .filter((resource) => providerResources.has(resource))
      .filter((resource) => Boolean(RESOURCE_DEFINITIONS[resource].blockCategory))
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));

    return { groupId, resources };
  }).filter((group) => group.resources.length > 0);

  const handleBuild = useCallback((type: ResourceType) => {
    const def = RESOURCE_DEFINITIONS[type];
    if (!def.blockCategory) return;

    const targetId = techTree.getTargetPlateId(type);
    if (!targetId) {
      toast.error('Please create a Network first.');
      return;
    }

    const knownBlockIds = new Set(architecture.blocks.map((block) => block.id));
    counterRef.current += 1;
    const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
    addBlock(def.blockCategory, name, targetId, activeProvider);

    const nextBlocks = useArchitectureStore.getState().workspace.architecture.blocks;
    const createdBlock = nextBlocks.find(
      (block) => !knownBlockIds.has(block.id) && block.name === name && block.placementId === targetId,
    );

    if (createdBlock) {
      const nextPlates = useArchitectureStore.getState().workspace.architecture.plates;
      const parentPlate = nextPlates.find((p) => p.id === createdBlock.placementId);
      if (parentPlate) {
        startBuild(createdBlock.id, getBlockWorldPosition(createdBlock, parentPlate));
      }
    }
  }, [activeProvider, addBlock, architecture.blocks, startBuild, techTree]);

  return (
    <div className="command-card-creation-groups">
      {groupedResources.map(({ groupId, resources }) => {
        const groupMeta = getCreationGroupMeta(groupId);
        return (
          <section key={groupId} className="command-card-category-group" aria-label={`${groupMeta.label} resource group`}>
            <header className="command-card-category-header" style={{ '--category-color': groupMeta.color } as CSSProperties}>
              <span className="command-card-category-icon" aria-hidden="true">{groupMeta.icon}</span>
              <span className="command-card-category-label">{groupMeta.label}</span>
            </header>

            <div className="command-card-category-grid">
              {resources.map((type) => {
                const def = RESOURCE_DEFINITIONS[type];
                const enabled = techTree.isEnabled(type);
                const disabledReason = techTree.getDisabledReason(type);

                return (
                  <button
                    key={type}
                    type="button"
                    className={`command-card-btn command-card-resource-btn ${enabled ? '' : 'disabled'}`}
                    data-resource-type={type}
                    onClick={() => enabled && handleBuild(type)}
                    disabled={!enabled}
                    title={enabled ? `Build ${getResourceLabel(type, activeProvider)}` : disabledReason ?? undefined}
                  >
                    <span className="command-btn-icon">
                      {def.blockCategory && <BlockSvg category={def.blockCategory} provider={activeProvider} />}
                    </span>
                    <span className="command-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
                    {!enabled && disabledReason && <span className="command-btn-requirement">Needs: {disabledReason}</span>}
                    {!enabled && <span className="command-btn-lock">🔒</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}


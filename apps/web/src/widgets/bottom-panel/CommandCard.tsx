/**
 * Command Card — Context-Sensitive Action Grid
 *
 * The core interaction mechanism:
 * - Creation mode (nothing selected): Resource creation buttons with Tech Tree
 * - Action mode (resource selected): Action buttons (Link, Edit, Delete, etc.)
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.5
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import interact from 'interactjs';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  useTechTree,
  CATEGORY_TABS,
  ACTION_GRID,
  ACTION_DEFINITIONS,
  PLATE_ACTION_GRID,
  PLATE_ACTION_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  type TabId,
  type ResourceType,
  type ActionType,
  type PlateActionType,
} from './useTechTree';
import type { Plate, ProviderType } from '../../shared/types/index';
import './CommandCard.css';

interface CommandCardProps {
  className?: string;
}

const PLATE_CONTEXT_RESOURCES: Record<'network' | 'subnet-public' | 'subnet-private', ResourceType[]> = {
  network: ['public-subnet', 'private-subnet', 'function', 'queue', 'event', 'timer', 'app-service'],
  'subnet-public': ['storage', 'dns', 'cdn', 'front-door', 'vm', 'aks', 'container-instances', 'firewall', 'nsg', 'bastion'],
  'subnet-private': ['storage', 'sql', 'cosmos-db', 'key-vault', 'vm', 'aks', 'container-instances'],
};

const POSITION_HOTKEYS = [
  ['Q', 'W', 'E'],
  ['A', 'S', 'D'],
  ['Z', 'X', 'C'],
] as const;

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];
const PROVIDER_RESOURCE_ALLOWLIST: Record<ProviderType, ReadonlySet<ResourceType>> = {
  azure: new Set(ALL_RESOURCES),
  aws: new Set(ALL_RESOURCES),
  gcp: new Set(ALL_RESOURCES),
};

function getPositionHotkey(rowIdx: number, colIdx: number): string {
  return POSITION_HOTKEYS[rowIdx]?.[colIdx] ?? '';
}

function chunkResources(resources: ResourceType[], chunkSize = 9): ResourceType[][] {
  const chunks: ResourceType[][] = [];
  for (let i = 0; i < resources.length; i += chunkSize) {
    chunks.push(resources.slice(i, i + chunkSize));
  }
  return chunks;
}

function getPlateHeaderText(plate: Plate): string {
  if (plate.type === 'network') return 'VNet';
  if (plate.subnetAccess === 'public') return 'Public Subnet';
  return 'Private Subnet';
}

export function CommandCard({ className = '' }: CommandCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('infra');
  const [plateSubActionState, setPlateSubActionState] = useState<{ selectedId: string | null; action: 'deploy' | null }>({ selectedId: null, action: null });
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const selectedBlock = selectedId
    ? architecture.blocks.find((b) => b.id === selectedId) ?? null
    : null;
  const selectedPlate = selectedId
    ? architecture.plates.find((p) => p.id === selectedId) ?? null
    : null;

  const plateSubAction = plateSubActionState.selectedId === selectedId ? plateSubActionState.action : null;
  const setPlateSubAction = useCallback((action: 'deploy' | null) => {
    setPlateSubActionState({ selectedId, action });
  }, [selectedId]);

  useEffect(() => {
    if (plateSubAction !== 'deploy') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlateSubAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plateSubAction, setPlateSubAction]);

  const headerText = selectedBlock
    ? 'Actions'
    : selectedPlate
      ? plateSubAction === 'deploy'
        ? `Deploy on ${getPlateHeaderText(selectedPlate)}`
        : `${getPlateHeaderText(selectedPlate)} Actions`
      : 'Create Resource';

  const isCreationMode = !selectedBlock && !selectedPlate;
  const modeContent = selectedBlock
    ? <BlockActionMode />
    : selectedPlate
      ? plateSubAction === 'deploy'
        ? <PlateCreationMode selectedPlate={selectedPlate} />
        : <PlateActionMode selectedPlate={selectedPlate} onDeploy={() => setPlateSubAction('deploy')} />
      : <CreationMode activeTab={activeTab} />;

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header">
        {selectedPlate && plateSubAction === 'deploy' ? (
          <button
            type="button"
            onClick={() => setPlateSubAction(null)}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}
            aria-label={`Back from ${headerText}`}
          >
            {`← ${headerText}`}
          </button>
        ) : (
          headerText
        )}
      </div>
      {isCreationMode && (
        <div className="command-card-tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`command-card-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="command-card-grid">
        {modeContent}
      </div>
    </div>
  );
}

function PlateActionMode({ selectedPlate, onDeploy }: { selectedPlate: Plate; onDeploy: () => void }) {
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback((name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); }, [isSoundMuted]);

  const handleAction = useCallback((action: PlateActionType) => {
    switch (action) {
      case 'deploy':
        onDeploy();
        break;
      case 'delete':
        removePlate(selectedPlate.id);
        setSelectedId(null);
        playSound('delete');
        break;
      case 'move':
      case 'rename':
      case 'config':
        break;
      default:
        break;
    }
  }, [onDeploy, removePlate, selectedPlate.id, setSelectedId, playSound]);

  return (
    <>
      {PLATE_ACTION_GRID.map((row, rowIdx) => {
        const rowKey = row.filter(Boolean).join('-') || `plate-action-row-${rowIdx}`;
        return (
          <div key={rowKey} className="command-card-row">
            {row.map((actionType, colIdx) => {
              const cellKey = actionType ?? `empty-r${rowIdx}c${colIdx}`;
              if (!actionType) {
                return <div key={cellKey} className="command-card-btn command-card-btn--empty" />;
              }

              const action = PLATE_ACTION_DEFINITIONS[actionType];
              const hotkey = getPositionHotkey(rowIdx, colIdx);

              return (
                <button
                  key={cellKey}
                  type="button"
                  className="command-card-btn"
                  onClick={() => handleAction(actionType)}
                  title={hotkey ? `${action.label} (${hotkey})` : action.label}
                >
                  <span className="command-btn-icon">{action.icon}</span>
                  <span className="command-btn-label">{action.label}</span>
                  {hotkey && <span className="command-btn-hotkey">{hotkey}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ─── Creation Mode ─────────────────────────────────────────

function CreationMode({ activeTab }: { activeTab: TabId }) {
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
  const tabDefinition = CATEGORY_TABS.find((tab) => tab.id === activeTab) ?? CATEGORY_TABS[0];
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];

  useEffect(() => {
    if (!gridRef.current) return;
    if (!activeTab) return;

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

          startPlacing(def.blockCategory, def.label);
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
  }, [activeTab, cancelInteraction, startPlacing]);

  const handleCreate = useCallback((type: ResourceType) => {
    if (isDraggingRef.current) return;

    const def = RESOURCE_DEFINITIONS[type];

    // Handle plate creation
    if (def.category === 'plate') {
      if (type === 'network') {
        addPlate('network', 'VNet', null);
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
        alert('Please create a Network first.');
        return;
      }

      counterRef.current += 1;
      const name = `${def.label} ${counterRef.current}`;
      addBlock(def.blockCategory, name, targetId, activeProvider);
      playSound('block-snap');
    }
  }, [activeProvider, addPlate, addBlock, techTree, playSound]);

  return (
    <div ref={gridRef}>
      {tabDefinition.resources.map((row, rowIdx) => (
        <div key={`${tabDefinition.id}-r${rowIdx}`} className="command-card-row">
          {row.map((type, colIdx) => {
            const hotkey = getPositionHotkey(rowIdx, colIdx);
            if (!type) {
              return <div key={`${tabDefinition.id}-empty-r${rowIdx}c${colIdx}`} className="command-card-btn command-card-btn--empty" />;
            }

            const def = RESOURCE_DEFINITIONS[type];
            const enabledByProvider = providerResources.has(type);
            const enabled = enabledByProvider && techTree.isEnabled(type);
            const disabledReason = techTree.getDisabledReason(type);

            return (
              <button
                key={type}
                type="button"
                className={`command-card-btn ${enabled ? '' : 'disabled'}`}
                data-resource-type={type}
                onClick={() => enabled && handleCreate(type)}
                disabled={!enabled}
                title={enabled ? `Create ${def.label} (${hotkey})` : enabledByProvider ? disabledReason ?? undefined : `Not available for ${activeProvider.toUpperCase()}`}
              >
                <span className="command-btn-icon">{def.icon}</span>
                <span className="command-btn-label">{def.shortLabel}</span>
                {hotkey && <span className="command-btn-hotkey">{hotkey}</span>}
                {!enabled && <span className="command-btn-lock">🔒</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PlateCreationMode({ selectedPlate }: { selectedPlate: Plate }) {
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

  const contextResources = selectedPlate.type === 'network'
    ? PLATE_CONTEXT_RESOURCES.network
    : selectedPlate.subnetAccess === 'public'
      ? PLATE_CONTEXT_RESOURCES['subnet-public']
      : PLATE_CONTEXT_RESOURCES['subnet-private'];
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const filteredContextResources = contextResources.filter((resource) => providerResources.has(resource));

  useEffect(() => {
    if (!gridRef.current) return;
    if (filteredContextResources.length === 0) return;

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

          startPlacing(def.blockCategory, def.label);
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
  }, [cancelInteraction, filteredContextResources, startPlacing]);

  const handleCreate = useCallback((type: ResourceType) => {
    if (isDraggingRef.current) return;

    const def = RESOURCE_DEFINITIONS[type];

    if (def.category === 'plate') {
      if (selectedPlate.type !== 'network') return;

      if (type === 'public-subnet') {
        addPlate('subnet', 'Public Subnet', selectedPlate.id, 'public');
        playSound('block-snap');
      } else if (type === 'private-subnet') {
        addPlate('subnet', 'Private Subnet', selectedPlate.id, 'private');
        playSound('block-snap');
      }

      return;
    }

    if (!def.blockCategory) {
      return;
    }

    counterRef.current += 1;
    const name = `${def.label} ${counterRef.current}`;
    addBlock(def.blockCategory, name, selectedPlate.id, activeProvider);
    playSound('block-snap');
  }, [activeProvider, addPlate, addBlock, selectedPlate.id, selectedPlate.type, playSound]);

  const resourcePages = chunkResources(filteredContextResources, 9).map((page) => {
    const normalizedPage: (ResourceType | null)[] = [...page];
    while (normalizedPage.length < 9) {
      normalizedPage.push(null);
    }

    return [
      normalizedPage.slice(0, 3),
      normalizedPage.slice(3, 6),
      normalizedPage.slice(6, 9),
    ];
  });

  return (
    <div ref={gridRef}>
      {resourcePages.map((page) => {
        const pageKey = page.flat().map((item) => item ?? 'empty').join('-');
        return page.map((row, rowIdx) => {
          const rowKey = `${pageKey}-${row.map((item) => item ?? 'empty').join('-')}-${getPositionHotkey(rowIdx, 0)}`;
          return (
          <div key={rowKey} className="command-card-row">
            {row.map((type, colIdx) => {
              const hotkey = getPositionHotkey(rowIdx, colIdx);
              if (!type) {
                return <div key={`${rowKey}-empty-${hotkey}`} className="command-card-btn command-card-btn--empty" />;
              }

              const def = RESOURCE_DEFINITIONS[type];
              const enabled = techTree.isEnabled(type);
              const disabledReason = techTree.getDisabledReason(type);

              return (
                <button
                  key={`${rowKey}-${type}-${hotkey}`}
                  type="button"
                  className={`command-card-btn ${enabled ? '' : 'disabled'}`}
                  data-resource-type={type}
                  onClick={() => enabled && handleCreate(type)}
                  disabled={!enabled}
                  title={enabled ? `Create ${def.label} (${hotkey})` : disabledReason ?? undefined}
                >
                  <span className="command-btn-icon">{def.icon}</span>
                  <span className="command-btn-label">{def.shortLabel}</span>
                  {hotkey && <span className="command-btn-hotkey">{hotkey}</span>}
                  {!enabled && <span className="command-btn-lock">🔒</span>}
                </button>
              );
            })}
          </div>
        );
        });
      })}
    </div>
  );
}

// ─── Action Mode ───────────────────────────────────────────

function BlockActionMode() {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const setToolMode = useUIStore((s) => s.setToolMode);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback((name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); }, [isSoundMuted]);

  const handleAction = useCallback((action: ActionType) => {
    if (!selectedId) return;

    switch (action) {
      case 'link':
        setToolMode('connect');
        break;

      case 'delete': {
        const isBlock = architecture.blocks.some((b) => b.id === selectedId);
        const isPlate = architecture.plates.some((p) => p.id === selectedId);

        if (isBlock) {
          removeBlock(selectedId);
        } else if (isPlate) {
          removePlate(selectedId);
        }
        setSelectedId(null);
        playSound('delete');
        break;
      }

      case 'edit':
      case 'copy':
      case 'config':
      case 'add-app':
      case 'move':
      case 'rename':
        break;

      default:
        break;
    }
  }, [selectedId, setSelectedId, setToolMode, removeBlock, removePlate, architecture, playSound]);

  return (
    <>
      {ACTION_GRID.map((row, rowIdx) => {
        const rowKey = row.filter(Boolean).join('-') || `action-row-${rowIdx}`;
        return (
          <div key={rowKey} className="command-card-row">
            {row.map((actionType, colIdx) => {
              const cellKey = actionType ?? `empty-r${rowIdx}c${colIdx}`;
              if (!actionType) {
                return <div key={cellKey} className="command-card-btn command-card-btn--empty" />;
              }

                const action = ACTION_DEFINITIONS[actionType];
                const hotkey = getPositionHotkey(rowIdx, colIdx);

                return (
                  <button
                  key={cellKey}
                    type="button"
                    className="command-card-btn"
                    onClick={() => handleAction(actionType)}
                    title={hotkey ? `${action.label} (${hotkey})` : action.label}
                  >
                    <span className="command-btn-icon">{action.icon}</span>
                    <span className="command-btn-label">{action.label}</span>
                    {hotkey && <span className="command-btn-hotkey">{hotkey}</span>}
                  </button>
                );
              })}
          </div>
        );
      })}
    </>
  );
}

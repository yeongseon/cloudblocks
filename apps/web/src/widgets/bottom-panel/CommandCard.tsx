import { useRef, useCallback, useEffect, useState } from 'react';
import interact from 'interactjs';
import type { ContainerNode, LeafNode } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  PROVIDER_RESOURCE_ALLOWLIST,
  type ResourceType,
} from './useTechTree';
import './CommandCard.css';

interface CommandCardProps {
  className?: string;
}

const PLATE_CONTEXT_RESOURCES: Record<'network' | 'subnet-public' | 'subnet-private', ResourceType[]> = {
  network: ['public-subnet', 'private-subnet'],
  'subnet-public': ['storage', 'vm', 'key-vault'],
  'subnet-private': ['storage', 'sql', 'key-vault', 'vm'],
};

const POSITION_HOTKEYS = [
  ['Q', 'W', 'E'],
  ['A', 'S', 'D'],
  ['Z', 'X', 'C'],
] as const;

type ContainerLayer = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

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

function getPlateHeaderText(plate: ContainerNode): string {
  const plateType: ContainerLayer = plate.layer === 'resource' ? 'region' : plate.layer;
  if (plateType === 'subnet') {
    return plate.subnetAccess === 'public' ? 'Public Subnet' : 'Private Subnet';
  }
  return plateType === 'region' ? 'VNet' : plateType.charAt(0).toUpperCase() + plateType.slice(1);
}

export function CommandCard({ className = '' }: CommandCardProps) {
  const [plateSubActionState, setPlateSubActionState] = useState<{ selectedId: string | null; action: 'deploy' | null }>({
    selectedId: null,
    action: null,
  });

  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const resources = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');
  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');

  const selectedBlock = selectedId ? resources.find((b) => b.id === selectedId) ?? null : null;
  const selectedPlate = selectedId ? containers.find((p) => p.id === selectedId) ?? null : null;
  const selectedConnection = selectedId
    ? architecture.connections.find((c) => c.id === selectedId) ?? null
    : null;

  const plateSubAction = plateSubActionState.selectedId === selectedId ? plateSubActionState.action : null;
  const setPlateSubAction = useCallback(
    (action: 'deploy' | null) => {
      setPlateSubActionState({ selectedId, action });
    },
    [selectedId],
  );

  useEffect(() => {
    if (plateSubAction !== 'deploy') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlateSubAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plateSubAction, setPlateSubAction]);

  const headerText = selectedPlate && plateSubAction === 'deploy'
    ? `Deploy on ${getPlateHeaderText(selectedPlate)}`
    : !selectedId
      ? 'Create Resource'
      : selectedPlate
        ? `${getPlateHeaderText(selectedPlate)} Selected`
        : selectedBlock
          ? 'Selection'
          : selectedConnection
            ? 'Connection Selected'
            : 'Selection';

  const modeContent = selectedPlate && plateSubAction === 'deploy'
    ? <PlateCreationMode selectedPlate={selectedPlate} />
    : !selectedId
      ? <CreationMode />
      : (
          <SelectedSummaryMode
            selectedBlock={selectedBlock}
            selectedPlate={selectedPlate}
            selectedConnection={selectedConnection}
            onDeploy={selectedPlate ? () => setPlateSubAction('deploy') : null}
          />
        );

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header">
        <span className="command-card-header-text">
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
        </span>
      </div>
      <div className="command-card-grid">{modeContent}</div>
    </div>
  );
}

function CreationMode() {
  const sidebarOpen = useUIStore((s) => s.sidebar.isOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <div className="command-card-creation-hint">
      <p>Use the sidebar palette to create and drag resources onto the canvas.</p>
      {!sidebarOpen && (
        <button type="button" onClick={() => setSidebarOpen(true)} className="command-card-btn">
          <span className="command-btn-icon">📂</span>
          <span className="command-btn-label">Open Sidebar</span>
        </button>
      )}
    </div>
  );
}

function SelectedSummaryMode({
  selectedBlock,
  selectedPlate,
  selectedConnection,
  onDeploy,
}: {
  selectedBlock: LeafNode | null;
  selectedPlate: ContainerNode | null;
  selectedConnection: { id: string } | null;
  onDeploy: (() => void) | null;
}) {
  const selectedName = selectedBlock?.name
    ?? selectedPlate?.name
    ?? (selectedConnection ? `Connection ${selectedConnection.id}` : null);

  return (
    <div className="command-card-creation-hint">
      <p>{selectedName ? `Selected: ${selectedName}` : 'Selection active.'}</p>
      <p>See Inspector for details and actions.</p>
      {onDeploy && (
        <button type="button" className="command-card-btn command-card-btn--apply" onClick={onDeploy}>
          <span className="command-btn-label">Deploy on Plate</span>
        </button>
      )}
    </div>
  );
}

function PlateCreationMode({ selectedPlate }: { selectedPlate: ContainerNode }) {
  const techTree = useTechTree();
  const addNode = useArchitectureStore((s) => s.addNode);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startPlacing = useUIStore((s) => s.startPlacing);
  const cancelInteraction = useUIStore((s) => s.cancelInteraction);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback((name: SoundName) => {
    if (!isSoundMuted) {
      audioService.playSound(name);
    }
  }, [isSoundMuted]);

  const counterRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const contextResources = selectedPlate.layer !== 'subnet'
    ? PLATE_CONTEXT_RESOURCES.network
    : selectedPlate.subnetAccess === 'public'
      ? PLATE_CONTEXT_RESOURCES['subnet-public']
      : PLATE_CONTEXT_RESOURCES['subnet-private'];
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const filteredContextResources = contextResources.filter((resource) => providerResources.has(resource));

  useEffect(() => {
    if (!gridRef.current || filteredContextResources.length === 0) {
      return;
    }

    const buttons = gridRef.current.querySelectorAll<HTMLButtonElement>(
      '.command-card-btn:not(.disabled):not(.command-card-btn--empty)',
    );
    const interactables = Array.from(buttons).map((button) =>
      interact(button).draggable({
        listeners: {
          start() {
            isDraggingRef.current = false;
          },
          move(event) {
            isDraggingRef.current = true;
            const buttonEl = event.target as HTMLButtonElement;
            buttonEl.classList.add('is-dragging');

            const type = buttonEl.dataset.resourceType as ResourceType | undefined;
            if (!type) {
              return;
            }

            const def = RESOURCE_DEFINITIONS[type];
            if (!def?.blockCategory) {
              return;
            }

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
      }),
    );

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
  }, [activeProvider, cancelInteraction, filteredContextResources, startPlacing]);

  const handleCreate = useCallback((type: ResourceType) => {
    if (isDraggingRef.current) {
      return;
    }

    const def = RESOURCE_DEFINITIONS[type];
    if (def.category === 'foundation') {
      if (selectedPlate.layer !== 'region') {
        return;
      }

      if (type === 'public-subnet') {
        addNode({
          kind: 'container',
          resourceType: 'subnet',
          name: 'Public Subnet',
          parentId: selectedPlate.id,
          layer: 'subnet',
          access: 'public',
        });
        playSound('block-snap');
      } else if (type === 'private-subnet') {
        addNode({
          kind: 'container',
          resourceType: 'subnet',
          name: 'Private Subnet',
          parentId: selectedPlate.id,
          layer: 'subnet',
          access: 'private',
        });
        playSound('block-snap');
      }
      return;
    }

    if (!def.blockCategory) {
      return;
    }

    counterRef.current += 1;
    const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
    addNode({
      kind: 'resource',
      resourceType: def.schemaResourceType ?? def.blockCategory,
      name,
      parentId: selectedPlate.id,
      provider: activeProvider,
      subtype: def.schemaResourceType,
    });
    playSound('block-snap');
  }, [activeProvider, addNode, playSound, selectedPlate.id, selectedPlate.layer]);

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
                    title={enabled ? `Create ${getResourceLabel(type, activeProvider)} (${hotkey})` : disabledReason ?? undefined}
                  >
                    <span className="command-btn-icon">{def.icon}</span>
                    <span className="command-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
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

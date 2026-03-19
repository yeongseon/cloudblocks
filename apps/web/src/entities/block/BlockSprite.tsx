import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import { toast } from 'react-hot-toast';
import type { Block, Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { useWorkerStore } from '../store/workerStore';
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { screenDeltaToWorld, snapToGrid } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canConnect } from '../validation/connection';
import { validatePlacement } from '../validation/placement';
import { BlockSvg } from './BlockSvg';
import './BlockSprite.css';

const BLOCK_SCREEN_SIZES: Record<string, { width: number; height: number }> = {
  timer:    { width: 72, height: 82 },
  event:    { width: 72, height: 82 },
  function: { width: 95, height: 86 },
  gateway:  { width: 120, height: 110 },
  queue:    { width: 120, height: 110 },
  storage:  { width: 120, height: 110 },
  compute:  { width: 140, height: 128 },
  database: { width: 160, height: 136 },
};

const PROVIDER_BADGES = {
  azure: { label: 'AZ', color: '#0078D4' },
  aws: { label: 'AWS', color: '#FF9900' },
  gcp: { label: 'GCP', color: '#4285F4' },
} as const;

interface BlockSpriteProps {
  block: Block;
  parentPlate: Plate;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const BlockSprite = memo(function BlockSprite({
  block,
  parentPlate,
  screenX,
  screenY,
  zIndex,
}: BlockSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const startConnecting = useUIStore((s) => s.startConnecting);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const moveBlockPosition = useArchitectureStore((s) => s.moveBlockPosition);
  const blocks = useArchitectureStore((s) => s.workspace.architecture.blocks);
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors);
  const connections = useArchitectureStore((s) => s.workspace.architecture.connections);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const activeBuild = useWorkerStore((s) => s.activeBuild);
  const blockRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  const isSelected = selectedId === block.id;
  const isConnectionSource = connectionSource === block.id;
  const isDeleteMode = toolMode === 'delete';

  // Connect-mode visual states
  const isConnectMode = toolMode === 'connect';
  const sourceBlock = isConnectMode && connectionSource
    ? blocks.find((b) => b.id === connectionSource)
    : null;
  const sourceActor = isConnectMode && connectionSource
    ? externalActors.find((actor) => actor.id === connectionSource)
    : null;
  const sourceType = sourceBlock?.category ?? sourceActor?.type ?? null;
  const isValidConnectTarget = sourceType !== null
    && block.id !== connectionSource
    && canConnect(sourceType, block.category);
  const isInvalidConnectTarget = isConnectMode && connectionSource !== null
    && block.id !== connectionSource
    && !isValidConnectTarget;
  const isAlreadyConnected = connections.some(
    (c) => (c.sourceId === block.id || c.targetId === block.id)
  );

  const hasValidationWarning = validatePlacement(block, parentPlate) !== null;
  const diffState = diffMode && diffDelta ? getDiffState(block.id, diffDelta) : 'unchanged';
  const isBeingBuilt = activeBuild?.blockId === block.id;
  const buildProgress = isBeingBuilt ? (activeBuild?.progress ?? 0) : 1;

  useEffect(() => {
    const el = blockRef.current;
    if (toolMode === 'delete' || toolMode === 'connect' || !el) {
      return;
    }

    const interactable = interact(el).draggable({
      listeners: {
        start(event) {
          isDragging.current = false;

          dragZoomRef.current = 1;
          const sceneWorld = event.target.closest('.scene-world') as HTMLElement | null;
          if (sceneWorld) {
            const transform = sceneWorld.style.transform;
            const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
            if (scaleMatch?.[1]) {
              const parsedZoom = Number.parseFloat(scaleMatch[1]);
              if (Number.isFinite(parsedZoom) && parsedZoom > 0) {
                dragZoomRef.current = parsedZoom;
              }
            }
          }
        },
        move(event) {
          isDragging.current = true;

          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          moveBlockPosition(block.id, dWorldX, dWorldZ);
        },
        end() {
          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.remove('is-dragging');

          if (isDragging.current) {
            const droppingEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
            if (droppingEl) {
              droppingEl.classList.add('is-dropping');
              const handleAnimEnd = () => {
                droppingEl.classList.remove('is-dropping');
                droppingEl.removeEventListener('animationend', handleAnimEnd);
              };
              droppingEl.addEventListener('animationend', handleAnimEnd);
            }
          }

          if (isDragging.current) {
            const currentBlock = useArchitectureStore
              .getState()
              .workspace
              .architecture
              .blocks
              .find((candidate) => candidate.id === block.id);

            if (currentBlock) {
              const snappedPosition = snapToGrid(currentBlock.position.x, currentBlock.position.z);
              const deltaX = snappedPosition.x - currentBlock.position.x;
              const deltaZ = snappedPosition.z - currentBlock.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                moveBlockPosition(block.id, deltaX, deltaZ);

                const { isSoundMuted } = useUIStore.getState();
                if (!isSoundMuted) {
                  audioService.playSound('block-snap');
                }
              }
            }
          }

          if (dragResetTimerRef.current) {
            clearTimeout(dragResetTimerRef.current);
          }
          dragResetTimerRef.current = setTimeout(() => {
            isDragging.current = false;
          }, 50);
        },
      },
      autoScroll: false,
    });

    return () => {
      if (dragResetTimerRef.current) {
        clearTimeout(dragResetTimerRef.current);
      }
      el.querySelector('.block-img')?.classList.remove('is-dragging');
      el.querySelector('.block-img')?.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [block.id, moveBlockPosition, toolMode]);

  const handleClick = (e: React.MouseEvent) => {
    if (diffMode && diffState === 'removed') return;
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();

    if (toolMode === 'delete') {
      removeBlock(block.id);
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        startConnecting(block.id);
      } else if (connectionSource !== block.id) {
        const success = addConnection(connectionSource, block.id);
        if (!success) {
          toast.error('Invalid connection: check allowed connection rules');
        }
        completeInteraction();
      }
      return;
    }

    setSelectedId(block.id);
  };

  const blockSize = BLOCK_SCREEN_SIZES[block.category] || BLOCK_SCREEN_SIZES.compute;

  const className = [
    'block-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
    isValidConnectTarget && 'is-valid-target',
    isInvalidConnectTarget && 'is-invalid-target',
    isAlreadyConnected && isConnectMode && 'is-connected',
    hasValidationWarning && !isSelected && !isConnectMode && !isDeleteMode && 'is-warning',
    diffState === 'added' && 'diff-added',
    diffState === 'modified' && 'diff-modified',
    diffState === 'removed' && 'diff-removed',
    isBeingBuilt && 'is-building',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={blockRef}
      className={className}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
        '--build-progress': buildProgress,
      } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={handleClick}
        className="block-button"
        style={{
          width: `${blockSize.width}px`,
          height: `${blockSize.height}px`,
          left: `-${blockSize.width / 2}px`,
          top: `-${blockSize.height / 2}px`,
        }}
        aria-label={`Block: ${block.name}`}
      >
        <div className="block-img" draggable={false}>
          <BlockSvg category={block.category} provider={block.provider} />
        </div>
        {block.provider && (
          <span
            className="block-provider-badge"
            style={{ borderColor: PROVIDER_BADGES[block.provider].color, color: PROVIDER_BADGES[block.provider].color }}
            title={`Provider: ${block.provider.toUpperCase()}`}
          >
            {PROVIDER_BADGES[block.provider].label}
          </span>
        )}
      </button>
    </div>
  );
});

import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import type { Block, Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { screenDeltaToWorld } from '../../shared/utils/isometric';
import { canConnect } from '../validation/connection';
import { validatePlacement } from '../validation/placement';
import { BlockSvg } from './BlockSvg';
import './BlockSprite.css';

const BLOCK_SCREEN_SIZES: Record<string, { width: number; height: number }> = {
  timer:    { width: 72, height: 72 },
  event:    { width: 72, height: 72 },
  function: { width: 95, height: 76 },
  gateway:  { width: 120, height: 100 },
  queue:    { width: 120, height: 100 },
  storage:  { width: 120, height: 100 },
  compute:  { width: 140, height: 118 },
  database: { width: 160, height: 126 },
};

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
  const setConnectionSource = useUIStore((s) => s.setConnectionSource);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const moveBlockPosition = useArchitectureStore((s) => s.moveBlockPosition);
  const blocks = useArchitectureStore((s) => s.workspace.architecture.blocks);
  const connections = useArchitectureStore((s) => s.workspace.architecture.connections);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const blockRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSelected = selectedId === block.id;
  const isConnectionSource = connectionSource === block.id;
  const isDeleteMode = toolMode === 'delete';

  // Connect-mode visual states
  const isConnectMode = toolMode === 'connect';
  const sourceBlock = isConnectMode && connectionSource
    ? blocks.find((b) => b.id === connectionSource)
    : null;
  const isValidConnectTarget = sourceBlock !== null && sourceBlock !== undefined
    && block.id !== connectionSource
    && canConnect(sourceBlock.category, block.category);
  const isInvalidConnectTarget = isConnectMode && connectionSource !== null
    && block.id !== connectionSource
    && !isValidConnectTarget;
  const isAlreadyConnected = connections.some(
    (c) => (c.sourceId === block.id || c.targetId === block.id)
  );

  const hasValidationWarning = validatePlacement(block, parentPlate) !== null;
  const diffState = diffMode && diffDelta ? getDiffState(block.id, diffDelta) : 'unchanged';

  useEffect(() => {
    if (toolMode === 'delete' || toolMode === 'connect' || !blockRef.current) {
      return;
    }

    const interactable = interact(blockRef.current).draggable({
      listeners: {
        start() {
          isDragging.current = false;
        },
        move(event) {
          isDragging.current = true;

          const sceneWorld = event.target.closest('.scene-world') as HTMLElement | null;
          let zoom = 1;
          if (sceneWorld) {
            const transform = sceneWorld.style.transform;
            const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
            if (scaleMatch?.[1]) {
              zoom = Number.parseFloat(scaleMatch[1]);
            }
          }

          const dxScreen = event.dx / zoom;
          const dyScreen = event.dy / zoom;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          moveBlockPosition(block.id, dWorldX, dWorldZ);
        },
        end() {
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
        setConnectionSource(block.id);
      } else if (connectionSource !== block.id) {
        addConnection(connectionSource, block.id);
        setConnectionSource(null);
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
      }}
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
          <BlockSvg category={block.category} />
        </div>
      </button>
    </div>
  );
});

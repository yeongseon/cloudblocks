import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import type { Block, Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { screenDeltaToWorld } from '../../shared/utils/isometric';
import { canConnect } from '../validation/connection';
import './BlockSprite.css';

// Import pre-made sprites
import gatewaySvg from '../../shared/assets/block-sprites/gateway.svg';
import computeSvg from '../../shared/assets/block-sprites/compute.svg';
import databaseSvg from '../../shared/assets/block-sprites/database.svg';
import storageSvg from '../../shared/assets/block-sprites/storage.svg';
import functionSvg from '../../shared/assets/block-sprites/function.svg';
import queueSvg from '../../shared/assets/block-sprites/queue.svg';
import eventSvg from '../../shared/assets/block-sprites/event.svg';
import timerSvg from '../../shared/assets/block-sprites/timer.svg';

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

const BLOCK_SPRITES: Record<string, string> = {
  gateway: gatewaySvg,
  compute: computeSvg,
  database: databaseSvg,
  storage: storageSvg,
  function: functionSvg,
  queue: queueSvg,
  event: eventSvg,
  timer: timerSvg,
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

  const spriteSrc = BLOCK_SPRITES[block.category] || computeSvg;
  const blockSize = BLOCK_SCREEN_SIZES[block.category] || BLOCK_SCREEN_SIZES.compute;

  const className = [
    'block-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
    isValidConnectTarget && 'is-valid-target',
    isInvalidConnectTarget && 'is-invalid-target',
    isAlreadyConnected && isConnectMode && 'is-connected',
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
        <img
          src={spriteSrc}
          alt={block.name}
          className="block-img"
          draggable={false}
        />
      </button>
    </div>
  );
});

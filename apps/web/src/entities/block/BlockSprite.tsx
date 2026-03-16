import { memo } from 'react';
import type { Block, Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
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

  const isSelected = selectedId === block.id;
  const isConnectionSource = connectionSource === block.id;
  const isDeleteMode = toolMode === 'delete';

  const handleClick = (e: React.MouseEvent) => {
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

  const className = [
    'block-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
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

import { memo } from 'react';
import type { CloudProvider } from './minifigureFaceColors';
import { MinifigureSvg } from './MinifigureSvg';
import { useUIStore } from '../store/uiStore';
import { useWorkerStore } from '../store/workerStore';
import './MinifigureSprite.css';

interface MinifigureSpriteProps {
  provider: CloudProvider;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const MinifigureSprite = memo(function MinifigureSprite({
  provider, screenX, screenY, zIndex,
}: MinifigureSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  // Read workerState from workerStore
  const workerState = useWorkerStore((s) => s.workerState);
  
  const workerId = 'worker-default';
  const isSelected = selectedId === workerId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toolMode === 'delete') return;
    if (toolMode === 'connect') return; // minifigure is not connectable
    setSelectedId(workerId);
  };

  const className = [
    'minifigure-sprite',
    isSelected && 'is-selected',
    `is-${workerState}`, // 'is-idle', 'is-moving', 'is-building'
  ].filter(Boolean).join(' ');

  return (
    <div className={className} onClick={handleClick}
      style={{ left: screenX, top: screenY, zIndex }}>
      <MinifigureSvg provider={provider} />
    </div>
  );
});

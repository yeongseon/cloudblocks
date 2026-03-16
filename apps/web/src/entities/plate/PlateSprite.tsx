import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import type { Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { screenDeltaToWorld, worldSizeToScreen } from '../../shared/utils/isometric';
import { canPlaceBlock } from '../validation/placement';
import './PlateSprite.css';

// Import pre-made plate sprites
import networkSvg from '../../shared/assets/plate-sprites/network.svg';
import publicSubnetSvg from '../../shared/assets/plate-sprites/public-subnet.svg';
import privateSubnetSvg from '../../shared/assets/plate-sprites/private-subnet.svg';

const PLATE_SPRITES: Record<string, string> = {
  network: networkSvg,
  'public-subnet': publicSubnetSvg,
  'private-subnet': privateSubnetSvg,
};

function getPlateSprite(plate: Plate): string {
  if (plate.type === 'network') {
    return PLATE_SPRITES['network'];
  }
  if (plate.type === 'subnet') {
    return plate.subnetAccess === 'public'
      ? PLATE_SPRITES['public-subnet']
      : PLATE_SPRITES['private-subnet'];
  }
  return PLATE_SPRITES['network'];
}

interface PlateSpriteProps {
  plate: Plate;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const PlateSprite = memo(function PlateSprite({
  plate,
  screenX,
  screenY,
  zIndex,
}: PlateSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const movePlatePosition = useArchitectureStore((s) => s.movePlatePosition);
  const isSelected = selectedId === plate.id;
  const isDragActive = draggedBlockCategory !== null;
  const isValidDropTarget = isDragActive && canPlaceBlock(draggedBlockCategory, plate);
  const isInvalidDropTarget = isDragActive && !canPlaceBlock(draggedBlockCategory, plate);
  const plateRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!plateRef.current) {
      return;
    }

    const interactable = interact(plateRef.current).draggable({
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

          movePlatePosition(plate.id, dWorldX, dWorldZ);
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
  }, [plate.id, movePlatePosition]);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();
    setSelectedId(plate.id);
  };

  const spriteSrc = getPlateSprite(plate);

  const sizeClass = plate.type === 'network' ? 'plate-network' : 'plate-subnet';

  const { screenWidth, screenHeight } = worldSizeToScreen(plate.size.width, plate.size.height, plate.size.depth);

  const className = [
    'plate-sprite',
    sizeClass,
    isSelected && 'is-selected',
    isValidDropTarget && 'is-drop-target',
    isInvalidDropTarget && 'is-drop-target-invalid',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={plateRef}
      className={className}
      data-plate-id={plate.id}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        className="plate-button"
        aria-label={`Plate: ${plate.name}`}
        style={{
          left: `${-screenWidth / 2}px`,
          top: `${-screenHeight / 2}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
        }}
      >
        <img
          src={spriteSrc}
          alt={plate.name}
          className="plate-img"
          draggable={false}
        />
      </button>
    </div>
  );
});

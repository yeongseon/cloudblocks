import { memo } from 'react';
import type { Plate } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
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
  const isSelected = selectedId === plate.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(plate.id);
  };

  const spriteSrc = getPlateSprite(plate);

  const className = [
    'plate-sprite',
    isSelected && 'is-selected',
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
        className="plate-button"
        aria-label={`Plate: ${plate.name}`}
      >
        <img
          src={spriteSrc}
          alt={plate.name}
          className="plate-img"
          draggable={false}
        />
      </button>
      <div className="plate-label">
        <span className="plate-label-icon">
          {plate.type === 'network' ? '🌐' : '🔒'}
        </span>
        <span className="plate-label-text">{plate.name}</span>
      </div>
    </div>
  );
});

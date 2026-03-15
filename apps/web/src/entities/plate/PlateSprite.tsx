import { memo, useMemo, useState, type ReactNode } from 'react';
import type { Plate } from '../../shared/types/index';
import { PLATE_COLORS, SUBNET_ACCESS_COLORS } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { worldToScreen } from '../../shared/utils/isometric';
import './PlateSprite.css';

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
  const [hovered, setHovered] = useState(false);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const isSelected = selectedId === plate.id;

  const baseColor =
    plate.type === 'subnet' && plate.subnetAccess
      ? SUBNET_ACCESS_COLORS[plate.subnetAccess]
      : PLATE_COLORS[plate.type];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(plate.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      setSelectedId(plate.id);
    }
  };

  const { points, bounds, studs, labelPos } = useMemo(() => {
    const half_w = plate.size.width / 2;
    const half_d = plate.size.depth / 2;
    const h = plate.size.height;

    const bl = worldToScreen(-half_w, 0, half_d);
    const br = worldToScreen(half_w, 0, half_d);
    const fr = worldToScreen(half_w, 0, -half_d);
    const fl = worldToScreen(-half_w, 0, -half_d);

    const tbl = worldToScreen(-half_w, h, half_d);
    const tbr = worldToScreen(half_w, h, half_d);
    const tfr = worldToScreen(half_w, h, -half_d);
    const tfl = worldToScreen(-half_w, h, -half_d);

    const allPts = [bl, br, fr, fl, tbl, tbr, tfr, tfl];
    const minX = Math.min(...allPts.map((p) => p.x));
    const maxX = Math.max(...allPts.map((p) => p.x));
    const minY = Math.min(...allPts.map((p) => p.y));
    const maxY = Math.max(...allPts.map((p) => p.y));

    const studNodes: ReactNode[] = [];
    const spacing = 0.75;
    const countX = Math.floor(plate.size.width / spacing);
    const countZ = Math.floor(plate.size.depth / spacing);

    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        const x = -plate.size.width / 2 + spacing / 2 + ix * spacing;
        const z = -plate.size.depth / 2 + spacing / 2 + iz * spacing;
        
        const pt = worldToScreen(x, h, z);
        
        const rx = 6;
        const ry = 3;
        const studH = 3;

        studNodes.push(
          <g key={`stud-${ix}-${iz}`}>
            <path
              className="plate-stud-side"
              fill={baseColor}
              d={`
                M ${pt.x - rx} ${pt.y}
                L ${pt.x - rx} ${pt.y + studH}
                A ${rx} ${ry} 0 0 0 ${pt.x + rx} ${pt.y + studH}
                L ${pt.x + rx} ${pt.y}
                A ${rx} ${ry} 0 0 1 ${pt.x - rx} ${pt.y}
              `}
            />
            <ellipse
              className="plate-stud"
              cx={pt.x}
              cy={pt.y - 0.5}
              rx={rx}
              ry={ry}
              fill={baseColor}
            />
          </g>
        );
      }
    }

    const labelPos = worldToScreen(half_w, 0, half_d);
    labelPos.y += 15;


    return {
      points: { bl, br, fr, fl, tbl, tbr, tfr, tfl },
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      studs: studNodes,
      labelPos,
    };
  }, [plate.size.width, plate.size.depth, plate.size.height, baseColor]);

  const { bl, br, fr, fl, tbl, tbr, tfr, tfl } = points;
  const padding = 6;
  const viewBox = `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`;

  return (
    <div
      className={`plate-sprite-container ${isSelected ? 'is-selected' : ''}`}
      style={{
        left: screenX,
        top: screenY,
        zIndex,
      }}
    >
      <button
        type="button"
        className="plate-button"
        aria-label={`Plate: ${plate.name}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          left: bounds.x - padding,
          top: bounds.y - padding,
          width: bounds.width + padding * 2,
          height: bounds.height + padding * 2,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          outline: 'none',
        }}
      >
        <svg
          className="plate-svg"
          style={{ width: '100%', height: '100%' }}
          viewBox={viewBox}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="top-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="black" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <g opacity={hovered ? 0.9 : 1}>
            <polygon
              className="plate-face plate-face-left"
              points={`${tfl.x},${tfl.y} ${tbl.x},${tbl.y} ${bl.x},${bl.y} ${fl.x},${fl.y}`}
              fill={baseColor}
            />
            <polygon
              className="plate-face plate-face-right"
              points={`${tbr.x},${tbr.y} ${tfr.x},${tfr.y} ${fr.x},${fr.y} ${br.x},${br.y}`}
              fill={baseColor}
            />
            <polygon
              className="plate-face plate-face-top"
              points={`${tfl.x},${tfl.y} ${tfr.x},${tfr.y} ${tbr.x},${tbr.y} ${tbl.x},${tbl.y}`}
              fill={baseColor}
            />
            <polygon
              className="plate-face-highlight"
              points={`${tfl.x},${tfl.y} ${tfr.x},${tfr.y} ${tbr.x},${tbr.y} ${tbl.x},${tbl.y}`}
              fill="url(#top-highlight)"
              style={{ pointerEvents: 'none' }}
            />
            {studs}
          </g>
        </svg>
      </button>
      
      <div 
        className="plate-label-container"
        style={{
          left: labelPos.x,
          top: labelPos.y,
        }}
      >
        <div 
          className="plate-label"
          style={{
            maxWidth: `${Math.max(120, Math.min(plate.size.width * 42, 220))}px`,
          }}
        >
          <span className="plate-label-icon">
            {plate.type === 'network' ? '🌐' : '🔒'}
          </span>
          <span className="plate-label-text">{plate.name}</span>
        </div>
      </div>
    </div>
  );
});

import { memo } from 'react';
import type { Block, Plate } from '../../shared/types/index';
import {
  BLOCK_COLORS,
  BLOCK_SHORT_NAMES,
  STUD_LAYOUTS,
  DEFAULT_BLOCK_SIZE,
} from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { worldToScreen } from '../../shared/utils/isometric';
import './BlockSprite.css';

interface BlockSpriteProps {
  block: Block;
  parentPlate: Plate;
  screenX: number;
  screenY: number;
  zIndex: number;
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) - Math.round(255 * amount)));
  const g = Math.max(
    0,
    Math.min(255, ((num >> 8) & 0xff) - Math.round(255 * amount))
  );
  const b = Math.max(0, Math.min(255, (num & 0xff) - Math.round(255 * amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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

  const baseColor = BLOCK_COLORS[block.category] || '#999999';
  const leftColor = darken(baseColor, 0.15);
  const rightColor = darken(baseColor, 0.25);
  const studHighlight = darken(baseColor, -0.1);

  const hw = DEFAULT_BLOCK_SIZE.width / 2;
  const hd = DEFAULT_BLOCK_SIZE.depth / 2;
  const h = DEFAULT_BLOCK_SIZE.height;

  const BL = worldToScreen(-hw, 0, hd);
  const BR = worldToScreen(hw, 0, hd);
  const FR = worldToScreen(hw, 0, -hd);
  const FL = worldToScreen(-hw, 0, -hd);

  const TBL = worldToScreen(-hw, h, hd);
  const TBR = worldToScreen(hw, h, hd);
  const TFR = worldToScreen(hw, h, -hd);
  const TFL = worldToScreen(-hw, h, -hd);

  const allX = [BL.x, BR.x, FR.x, FL.x, TBL.x, TBR.x, TFR.x, TFL.x];
  const allY = [BL.y, BR.y, FR.y, FL.y, TBL.y, TBR.y, TFR.y, TFL.y];

  const pad = 20;
  const minX = Math.min(...allX) - pad;
  const maxX = Math.max(...allX) + pad;
  const minY = Math.min(...allY) - pad;
  const maxY = Math.max(...allY) + pad;
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  const [cols, rows] = STUD_LAYOUTS[block.category] || [1, 1];
  const studs = [];

  const stepX = DEFAULT_BLOCK_SIZE.width / (cols + 1);
  const stepZ = DEFAULT_BLOCK_SIZE.depth / (rows + 1);

  for (let c = 1; c <= cols; c++) {
    for (let r = 1; r <= rows; r++) {
      const studWorldX = -hw + c * stepX;
      const studWorldZ = hd - r * stepZ;
      const studPos = worldToScreen(studWorldX, h, studWorldZ);

      studs.push(
        <g key={`${c}-${r}`} transform={`translate(${studPos.x}, ${studPos.y})`}>
          <ellipse cx="0" cy="0" rx="10" ry="5" fill={baseColor} />
          <path
            d="M -10 0 L -10 -6 A 10 5 0 0 1 10 -6 L 10 0 A 10 5 0 0 1 -10 0 Z"
            fill={leftColor}
          />
          <ellipse cx="0" cy="-6" rx="10" ry="5" fill={studHighlight} />
        </g>
      );
    }
  }

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

  const cx = (TBR.x + BR.x + FR.x + TFR.x) / 4;
  const cy = (TBR.y + BR.y + FR.y + TFR.y) / 4;
  const labelText = BLOCK_SHORT_NAMES[block.category] || block.category;

  const className = [
    'block-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
      }}
    >
      <svg
        width={vbWidth}
        height={vbHeight}
        viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
        style={{ display: 'block' }}
      >
        <title>{block.name}</title>
        <g className="block-sprite-faces">
          <polygon
            points={`${TBL.x},${TBL.y} ${BL.x},${BL.y} ${BR.x},${BR.y} ${TBR.x},${TBR.y}`}
            fill={leftColor}
            stroke={leftColor}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <polygon
            points={`${TBR.x},${TBR.y} ${BR.x},${BR.y} ${FR.x},${FR.y} ${TFR.x},${TFR.y}`}
            fill={rightColor}
            stroke={rightColor}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <polygon
            points={`${TFL.x},${TFL.y} ${TBL.x},${TBL.y} ${TBR.x},${TBR.y} ${TFR.x},${TFR.y}`}
            fill={baseColor}
            stroke={baseColor}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {studs}
          <text
            x={cx}
            y={cy}
            className="block-sprite-label"
            style={{
              transform: `skewY(26.565deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {labelText}
          </text>
        </g>
      </svg>
    </button>
  );
});

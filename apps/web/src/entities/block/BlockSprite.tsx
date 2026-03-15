import { memo } from 'react';
import type { Block, Plate } from '../../shared/types/index';
import {
  BLOCK_COLORS,
  BLOCK_SHORT_NAMES,
  BLOCK_ICONS,
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

  const pad = 30;
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
          <ellipse cx="0" cy="0" rx="12" ry="6" fill={baseColor} />
          <path
            d="M -12 0 L -12 -8 A 12 6 0 0 1 12 -8 L 12 0 A 12 6 0 0 1 -12 0 Z"
            fill={leftColor}
          />
          <ellipse cx="0" cy="-8" rx="12" ry="6" fill={`url(#stud-grad-${block.id})`} />
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
  const iconText = BLOCK_ICONS[block.category] || '';

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
        style={{
          position: 'absolute',
          left: minX - pad,
          top: minY - pad,
          width: vbWidth + pad * 2,
          height: vbHeight + pad * 2,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          outline: 'none',
        }}
      >
        <svg
          className="block-svg"
          style={{ width: '100%', height: '100%' }}
          viewBox={`${minX - pad} ${minY - pad} ${vbWidth + pad * 2} ${vbHeight + pad * 2}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`stud-grad-${block.id}`} cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={darken(baseColor, -0.3)} />
              <stop offset="100%" stopColor={studHighlight} />
            </radialGradient>
          </defs>
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
            <g
              style={{
                transform: `skewY(26.565deg)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            >
              <text
                x={cx}
                y={cy - 10}
                className="block-sprite-label"
                style={{
                  fontSize: '20px',
                  textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {iconText}
              </text>
              <text
                x={cx}
                y={cy + 12}
                className="block-sprite-label"
                style={{
                  textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {labelText}
              </text>
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
});

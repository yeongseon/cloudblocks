import { memo, useId, useMemo } from 'react';
import type { BlockCategory } from '../../shared/types/index';
import { STUD_LAYOUTS, BLOCK_SHORT_NAMES, BLOCK_ICONS } from '../../shared/types/index';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import { getBlockFaceColors, getBlockStudColors } from './blockFaceColors';

interface BlockSvgProps {
  category: BlockCategory;
}

export const BlockSvg = memo(function BlockSvg({ category }: BlockSvgProps) {
  const [studsX, studsY] = STUD_LAYOUTS[category];
  const faceColors = getBlockFaceColors(category);
  const studColors = getBlockStudColors(category);
  const shortName = BLOCK_SHORT_NAMES[category];
  const icon = BLOCK_ICONS[category];

  const TILE_W = 64;
  const TILE_H = 32;
  const TILE_Z = 32;
  const margin = 10;
  const padding = 10;

  const worldHeight = 0.5;

  const screenWidth = (studsX + studsY) * TILE_W / 2;
  const diamondHeight = (studsX + studsY) * TILE_H / 2;
  const sideWallPx = Math.round(worldHeight * TILE_Z);
  const svgHeight = diamondHeight + sideWallPx + padding;

  const cx = screenWidth / 2;
  const topY = padding;
  const midY = diamondHeight / 2 + padding;
  const bottomY = diamondHeight + padding;
  const leftX = margin;
  const rightX = screenWidth - margin;

  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;
  const leftSidePoints = `${leftX},${midY} ${cx},${bottomY} ${cx},${bottomY + sideWallPx} ${leftX},${midY + sideWallPx}`;
  const rightSidePoints = `${cx},${bottomY} ${rightX},${midY} ${rightX},${midY + sideWallPx} ${cx},${bottomY + sideWallPx}`;

  const studs = useMemo(() => {
    const positions: Array<{ x: number; y: number; key: string }> = [];
    const halfW = screenWidth / 2 - margin;
    const halfH = diamondHeight / 2;

    const stepXx = halfW / studsX;
    const stepXy = halfH / studsX;
    const stepZx = -halfW / studsY;
    const stepZy = halfH / studsY;

    const startX = cx + stepXx * 0.5 + stepZx * 0.5;
    const startY = topY + stepXy * 0.5 + stepZy * 0.5;

    for (let gz = 0; gz < studsY; gz += 1) {
      for (let gx = 0; gx < studsX; gx += 1) {
        const x = startX + gx * stepXx + gz * stepZx;
        const y = startY + gx * stepXy + gz * stepZy;
        positions.push({
          key: `${gx}-${gz}`,
          x,
          y,
        });
      }
    }

    return positions;
  }, [cx, diamondHeight, screenWidth, studsX, studsY]);

  const studId = useId().replace(/:/g, '_');

  const leftLabelX = (leftX + cx) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  const minDim = Math.min(studsX, studsY);
  const labelFontSize = minDim <= 1 ? 8 : minDim <= 2 ? 10 : 13;

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <StudDefs studId={studId} studColors={studColors} />

      <polygon points={topFacePoints} fill={faceColors.topFaceColor} stroke={faceColors.topFaceStroke} strokeWidth="1" strokeOpacity="0.6" />
      <polygon points={leftSidePoints} fill={faceColors.leftSideColor} />
      <polygon points={rightSidePoints} fill={faceColors.rightSideColor} />
      <line x1={leftX} y1={midY} x2={cx} y2={topY} stroke="#ffffff" strokeWidth="2" strokeOpacity="0.3" />

      <StudGrid studId={studId} studs={studs} />

      <text
        transform={`matrix(0.8975,0.4410,0,1,${leftLabelX},${wallCenterY})`}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize={labelFontSize}
        fontWeight="600"
        fill="#ffffff"
        fillOpacity="0.9"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {`${icon} ${shortName}`}
      </text>
    </svg>
  );
});

import { memo, useId, useMemo } from 'react';

interface PlateSurfaceGridProps {
  cx: number;
  topY: number;
  midY: number;
  leftX: number;
  rightX: number;
  bottomY: number;
  unitsX: number;
  unitsY: number;
  screenWidth: number;
}

interface GridLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const ContainerBlockSurfaceGrid = memo(function PlateSurfaceGrid({
  cx,
  topY,
  midY,
  leftX,
  rightX,
  bottomY,
  unitsX,
  unitsY,
  screenWidth,
}: PlateSurfaceGridProps) {
  const clipPathId = `${useId().replace(/:/g, '_')}_w${Math.round(screenWidth)}`;
  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;

  const lines = useMemo(() => {
    const safeUnitsX = Math.max(unitsX, 1);
    const safeUnitsY = Math.max(unitsY, 1);

    const stepXx = (rightX - cx) / safeUnitsX;
    const stepXy = (midY - topY) / safeUnitsX;
    const stepZx = (leftX - cx) / safeUnitsY;
    const stepZy = (midY - topY) / safeUnitsY;

    const nextLines: GridLine[] = [];

    for (let gx = 0; gx <= safeUnitsX; gx += 1) {
      const x1 = cx + gx * stepXx;
      const y1 = topY + gx * stepXy;
      const x2 = x1 + safeUnitsY * stepZx;
      const y2 = y1 + safeUnitsY * stepZy;
      nextLines.push({ key: `x-${gx}`, x1, y1, x2, y2 });
    }

    for (let gz = 0; gz <= safeUnitsY; gz += 1) {
      const x1 = cx + gz * stepZx;
      const y1 = topY + gz * stepZy;
      const x2 = x1 + safeUnitsX * stepXx;
      const y2 = y1 + safeUnitsX * stepXy;
      nextLines.push({ key: `z-${gz}`, x1, y1, x2, y2 });
    }

    return nextLines;
  }, [cx, leftX, midY, rightX, unitsX, unitsY, topY]);

  return (
    <>
      <defs>
        <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
          <polygon points={topFacePoints} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        {lines.map((line) => (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={0.5}
            fill="none"
          />
        ))}
      </g>
    </>
  );
});

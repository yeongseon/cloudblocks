import { memo, useId, useMemo } from 'react';

interface PlateSurfaceGridProps {
  cx: number;
  topY: number;
  midY: number;
  leftX: number;
  rightX: number;
  bottomY: number;
  studsX: number;
  studsY: number;
  screenWidth: number;
}

interface GridLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const PlateSurfaceGrid = memo(function PlateSurfaceGrid({
  cx,
  topY,
  midY,
  leftX,
  rightX,
  bottomY,
  studsX,
  studsY,
  screenWidth,
}: PlateSurfaceGridProps) {
  const clipPathId = `${useId().replace(/:/g, '_')}_w${Math.round(screenWidth)}`;
  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;

  const lines = useMemo(() => {
    const safeStudsX = Math.max(studsX, 1);
    const safeStudsY = Math.max(studsY, 1);

    const stepXx = (rightX - cx) / safeStudsX;
    const stepXy = (midY - topY) / safeStudsX;
    const stepZx = (leftX - cx) / safeStudsY;
    const stepZy = (midY - topY) / safeStudsY;

    const nextLines: GridLine[] = [];

    for (let gx = 0; gx <= safeStudsX; gx += 1) {
      const x1 = cx + gx * stepXx;
      const y1 = topY + gx * stepXy;
      const x2 = x1 + safeStudsY * stepZx;
      const y2 = y1 + safeStudsY * stepZy;
      nextLines.push({ key: `x-${gx}`, x1, y1, x2, y2 });
    }

    for (let gz = 0; gz <= safeStudsY; gz += 1) {
      const x1 = cx + gz * stepZx;
      const y1 = topY + gz * stepZy;
      const x2 = x1 + safeStudsX * stepXx;
      const y2 = y1 + safeStudsX * stepXy;
      nextLines.push({ key: `z-${gz}`, x1, y1, x2, y2 });
    }

    return nextLines;
  }, [bottomY, cx, leftX, midY, rightX, studsX, studsY, topY]);

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
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            fill="none"
          />
        ))}
      </g>
    </>
  );
});

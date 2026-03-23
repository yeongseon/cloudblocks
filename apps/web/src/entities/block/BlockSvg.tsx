import { memo, useId, useMemo } from 'react';
import type { BlockRole, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import { BLOCK_SHORT_NAMES, ROLE_VISUAL_INDICATORS } from '../../shared/types/index';
import { getBlockIconUrl } from '../../shared/utils/iconResolver';
import { getBlockDimensions, getBlockVisualProfile } from '../../shared/types/visualProfile';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  EDGE_HIGHLIGHT_COLOR,
  EDGE_HIGHLIGHT_OPACITY,
  EDGE_HIGHLIGHT_STROKE_WIDTH,
  TOP_FACE_STROKE_OPACITY,
  TOP_FACE_STROKE_WIDTH,
  STUB_DOT_RX,
  STUB_DOT_RY,
  STUB_DOT_STROKE_WIDTH,
  STUB_DOT_OPACITY,
  STUB_DOT_ACTIVE_OPACITY,
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors, getBlockStudColors } from './blockFaceColors';
import { cuToSilhouetteDimensions, getSilhouetteFromCU } from './silhouettes';
import { getBlockSvgStubPoints } from './blockGeometry';

interface BlockSvgProps {
  category: ResourceCategory;
  provider?: ProviderType;
  subtype?: string;
  name?: string; // user-given resource name (overrides shortName on left wall)
  aggregationCount?: number; // v2.0 §8 — show ×N badge when > 1
  roles?: BlockRole[]; // v2.0 §9 — visual-only role indicators
  /** When true, stub dots are emphasized (connect mode active). */
  showStubs?: boolean;
}

export const BlockSvg = memo(function BlockSvg({
  category,
  provider,
  subtype,
  name,
  aggregationCount,
  roles,
  showStubs,
}: BlockSvgProps) {
  // ─── v2.0: CU-based dimension resolution ───────────────────
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  const profile = getBlockVisualProfile(category);

  const { screenWidth, diamondHeight, sideWallPx, cx, leftX, rightX, topY, midY, bottomY } = dims;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const faceColors = getBlockFaceColors(category, provider ?? 'azure', subtype);
  const studColors = getBlockStudColors(category, provider ?? 'azure', subtype);
  const shortName = BLOCK_SHORT_NAMES[category];
  const iconUrl = getBlockIconUrl(provider ?? 'azure', category, subtype);

  // ─── v2.0: silhouette from CU dimensions ───────────────────
  const silhouetteResult = getSilhouetteFromCU(profile.silhouette, cu);

  // ─── v2.0: stud grid = width × depth (1 stud per CU cell) ──
  const studsX = cu.width;
  const studsY = cu.depth;

  const studs = useMemo(() => {
    const positions: Array<{ x: number; y: number; key: string }> = [];
    const halfW = screenWidth / 2 - BLOCK_MARGIN;
    const halfH = diamondHeight / 2;

    const stepXx = halfW / studsX;
    const stepXy = halfH / studsX;
    const stepZx = -halfW / studsY;
    const stepZy = halfH / studsY;

    const startX = cx + stepXx * 0.5 + stepZx * 0.5;
    const startY = BLOCK_PADDING + stepXy * 0.5 + stepZy * 0.5;

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
  const rightLabelX = (cx + rightX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  const minDim = Math.min(studsX, studsY);
  const labelFontSize = minDim <= 1 ? 8 : minDim <= 2 ? 10 : 13;
  const iconSize = minDim <= 1 ? 12 : minDim <= 2 ? 16 : 20;

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <StudDefs studId={studId} studColors={studColors} />

      {silhouetteResult.renderMode === 'polygon' ? (
        <>
          <polygon
            points={silhouetteResult.topFacePoints}
            fill={faceColors.topFaceColor}
            stroke={faceColors.topFaceStroke}
            strokeWidth={TOP_FACE_STROKE_WIDTH}
            strokeOpacity={TOP_FACE_STROKE_OPACITY}
          />
          <polygon points={silhouetteResult.leftSidePoints} fill={faceColors.leftSideColor} />
          <polygon points={silhouetteResult.rightSidePoints} fill={faceColors.rightSideColor} />
        </>
      ) : (
        <>
          <rect
            x={silhouetteResult.bodyRect!.x}
            y={silhouetteResult.bodyRect!.y}
            width={silhouetteResult.bodyRect!.width}
            height={silhouetteResult.bodyRect!.height}
            fill={faceColors.leftSideColor}
          />
          <path d={silhouetteResult.bottomArcPath!} fill={faceColors.rightSideColor} />
          <ellipse
            cx={silhouetteResult.ellipseCenter!.cx}
            cy={silhouetteResult.ellipseCenter!.cy}
            rx={silhouetteResult.ellipseRadii!.rx}
            ry={silhouetteResult.ellipseRadii!.ry}
            fill={faceColors.topFaceColor}
            stroke={faceColors.topFaceStroke}
            strokeWidth={TOP_FACE_STROKE_WIDTH}
            strokeOpacity={TOP_FACE_STROKE_OPACITY}
          />
        </>
      )}
      <line
        x1={leftX}
        y1={midY}
        x2={cx}
        y2={topY}
        stroke={EDGE_HIGHLIGHT_COLOR}
        strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH}
        strokeOpacity={EDGE_HIGHLIGHT_OPACITY}
      />

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
        {name ?? shortName}
      </text>

      <image
        href={iconUrl}
        width={iconSize}
        height={iconSize}
        x={-iconSize / 2}
        y={-iconSize / 2}
        transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
      />

      {aggregationCount != null && aggregationCount > 1 && (
        <g data-testid="aggregation-badge">
          <rect
            x={screenWidth - 28}
            y={0}
            width={26}
            height={16}
            rx={4}
            fill="#1e293b"
            fillOpacity={0.85}
          />
          <text
            x={screenWidth - 15}
            y={12}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={10}
            fontWeight="700"
            fill="#ffffff"
            textAnchor="middle"
          >
            {`×${aggregationCount}`}
          </text>
        </g>
      )}

      {roles != null && roles.length > 0 && (
        <g data-testid="role-badges">
          {roles.map((role, i) => {
            const indicator = ROLE_VISUAL_INDICATORS[role];
            const badgeX = 2 + i * 18;
            return (
              <g key={role} data-testid={`role-badge-${role}`}>
                <rect
                  x={badgeX}
                  y={0}
                  width={16}
                  height={16}
                  rx={3}
                  fill="#334155"
                  fillOpacity={0.85}
                />
                <text
                  x={badgeX + 8}
                  y={12}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {indicator.icon}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* ─── Stub dots (connection anchor points on side walls) ─── */}
      <g data-testid="stub-dots" opacity={showStubs ? STUB_DOT_ACTIVE_OPACITY : STUB_DOT_OPACITY}>
        {(() => {
          const ports = CATEGORY_PORTS[category];
          const stubPoints = getBlockSvgStubPoints(cu, ports.inbound, ports.outbound);
          return (
            <>
              {stubPoints.inbound.map((pt, i) => (
                <g key={`stub-in-${i}`}>
                  <polygon
                    points={`${pt.x},${pt.y - STUB_DOT_RY} ${pt.x + STUB_DOT_RX},${pt.y} ${pt.x},${pt.y + STUB_DOT_RY} ${pt.x - STUB_DOT_RX},${pt.y}`}
                    fill={showStubs ? '#60a5fa' : '#94a3b8'}
                    stroke="#ffffff"
                    strokeWidth={STUB_DOT_STROKE_WIDTH}
                    strokeOpacity={0.6}
                  />
                </g>
              ))}
              {stubPoints.outbound.map((pt, i) => (
                <g key={`stub-out-${i}`}>
                  <polygon
                    points={`${pt.x},${pt.y - STUB_DOT_RY} ${pt.x + STUB_DOT_RX},${pt.y} ${pt.x},${pt.y + STUB_DOT_RY} ${pt.x - STUB_DOT_RX},${pt.y}`}
                    fill={showStubs ? '#34d399' : '#94a3b8'}
                    stroke="#ffffff"
                    strokeWidth={STUB_DOT_STROKE_WIDTH}
                    strokeOpacity={0.6}
                  />
                </g>
              ))}
            </>
          );
        })()}
      </g>
    </svg>
  );
});

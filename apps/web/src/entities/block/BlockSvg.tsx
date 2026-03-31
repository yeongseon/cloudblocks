import { memo, useId } from 'react';
import type { BlockRole, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import { ROLE_VISUAL_INDICATORS } from '../../shared/types/index';
import { getBlockIconUrl, getSubtypeShortLabel } from '../../shared/utils/iconResolver';
import { getBlockDimensions, getBlockVisualProfile } from '../../shared/types/visualProfile';
import {
  BLOCK_PADDING,
  EDGE_HIGHLIGHT_COLOR,
  EDGE_HIGHLIGHT_OPACITY,
  EDGE_HIGHLIGHT_STROKE_WIDTH,
  TOP_FACE_STROKE_OPACITY,
  TOP_FACE_STROKE_WIDTH,
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors } from './blockFaceColors';
import { cuToSilhouetteDimensions, getSilhouetteFromCU } from './silhouettes';

interface BlockSvgProps {
  category: ResourceCategory;
  provider?: ProviderType;
  subtype?: string;
  resourceType?: string;
  name?: string;
  aggregationCount?: number;
  roles?: BlockRole[];
}

export const BlockSvg = memo(function BlockSvg({
  category,
  provider,
  subtype,
  resourceType,
  name: _name,
  aggregationCount,
  roles,
}: BlockSvgProps) {
  // ─── v2.0: CU-based dimension resolution ───────────────────
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  const profile = getBlockVisualProfile(category);

  const { screenWidth, diamondHeight, sideWallPx, cx, leftX, rightX, topY, midY, bottomY } = dims;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const faceColors = getBlockFaceColors(category, provider ?? 'azure', subtype);
  const iconUrl = getBlockIconUrl(provider ?? 'azure', category, subtype, resourceType);

  // ─── v2.0: silhouette from CU dimensions ───────────────────
  const silhouetteResult = getSilhouetteFromCU(profile.silhouette, cu);

  const connectorId = useId().replace(/:/g, '_');

  const rightLabelX = (cx + rightX) / 2;
  const leftLabelX = (cx + leftX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  // Icon on right (front) face — fill ~70% of wall height
  const iconSize = Math.max(16, Math.round(sideWallPx * 0.7));
  const shortLabel = getSubtypeShortLabel(provider ?? 'azure', subtype);

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {silhouetteResult.renderMode === 'polygon' ? (
        <>
          <polygon
            points={silhouetteResult.topFacePoints}
            fill={faceColors.topFaceColor}
            stroke={faceColors.topFaceStroke}
            strokeWidth={TOP_FACE_STROKE_WIDTH}
            strokeOpacity={TOP_FACE_STROKE_OPACITY}
          />
          {/* ─── Block top face grid pattern ─── */}
          {(() => {
            const gridDivisions = Math.max(cu.width, cu.depth) <= 1 ? 2 : 3;
            const topFaceClipId = `block-grid-clip-${connectorId}`;
            const stepXx = (rightX - cx) / gridDivisions;
            const stepXy = (midY - topY) / gridDivisions;
            const stepZx = (leftX - cx) / gridDivisions;
            const stepZy = (midY - topY) / gridDivisions;
            const gridLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
            for (let gx = 1; gx < gridDivisions; gx++) {
              const x1 = cx + gx * stepXx;
              const y1 = topY + gx * stepXy;
              gridLines.push({
                key: `gx-${gx}`,
                x1,
                y1,
                x2: x1 + gridDivisions * stepZx,
                y2: y1 + gridDivisions * stepZy,
              });
            }
            for (let gz = 1; gz < gridDivisions; gz++) {
              const x1 = cx + gz * stepZx;
              const y1 = topY + gz * stepZy;
              gridLines.push({
                key: `gz-${gz}`,
                x1,
                y1,
                x2: x1 + gridDivisions * stepXx,
                y2: y1 + gridDivisions * stepXy,
              });
            }
            return (
              <>
                <defs>
                  <clipPath id={topFaceClipId} clipPathUnits="userSpaceOnUse">
                    <polygon points={silhouetteResult.topFacePoints} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${topFaceClipId})`} data-testid="block-top-grid">
                  {gridLines.map((line) => (
                    <line
                      key={line.key}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={0.5}
                      fill="none"
                    />
                  ))}
                </g>
              </>
            );
          })()}
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

      {/* ─── Left wall: large provider icon ─── */}
      {iconUrl && (
        <image
          href={iconUrl}
          width={iconSize}
          height={iconSize}
          x={-iconSize / 2}
          y={-iconSize / 2}
          transform={`matrix(0.8975,0.4410,0,1,${leftLabelX},${wallCenterY})`}
          data-testid="block-face-icon"
        />
      )}

      {/* ─── Right wall: short label ─── */}
      {shortLabel && (
        <text
          x={0}
          y={0}
          transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={Math.max(8, Math.round(sideWallPx * 0.28))}
          fontWeight="700"
          fill="rgba(255,255,255,0.85)"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
          data-testid="block-face-label"
        >
          {shortLabel}
        </text>
      )}

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
    </svg>
  );
});

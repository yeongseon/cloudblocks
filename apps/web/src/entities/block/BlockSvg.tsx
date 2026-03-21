import { memo, useId, useMemo } from 'react';
import type { BlockCategory, BlockRole, ProviderType } from '@cloudblocks/schema';
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
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors, getBlockStudColors } from './blockFaceColors';
import { cuToSilhouetteDimensions, getSilhouetteFromCU } from './silhouettes';

interface BlockSvgProps {
  category: BlockCategory;
  provider?: ProviderType;
  subtype?: string;
  name?: string;              // user-given resource name (overrides shortName on left wall)
  aggregationCount?: number; // v2.0 §8 — show ×N badge when > 1
  roles?: BlockRole[];        // v2.0 §9 — visual-only role indicators
}

const PROVIDER_BADGE_LABELS: Record<string, string> = {
  azure: 'Az',
  aws: 'AW',
  gcp: 'GC',
};

const PROVIDER_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  azure: { bg: '#0078D4', text: '#FFFFFF' },
  aws: { bg: '#FF9900', text: '#000000' },
  gcp: { bg: '#4285F4', text: '#FFFFFF' },
};

export const BlockSvg = memo(function BlockSvg({ category, provider, subtype, name, aggregationCount, roles }: BlockSvgProps) {
  // ─── v2.0: CU-based dimension resolution ───────────────────
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  const profile = getBlockVisualProfile(category);

  const { screenWidth, diamondHeight, sideWallPx } = dims;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const faceColors = getBlockFaceColors(category, provider ?? 'azure', subtype);
  const studColors = getBlockStudColors(category, provider ?? 'azure', subtype);
  const shortName = BLOCK_SHORT_NAMES[category];
  const iconUrl = getBlockIconUrl(provider ?? 'azure', category, subtype);

  // ─── v2.0: silhouette from CU dimensions ───────────────────
  const { topFacePoints, leftSidePoints, rightSidePoints } = getSilhouetteFromCU(
    profile.silhouette,
    cu,
  );

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

    const startX = dims.cx + stepXx * 0.5 + stepZx * 0.5;
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
  }, [dims.cx, diamondHeight, screenWidth, studsX, studsY]);

  const studId = useId().replace(/:/g, '_');

  const leftLabelX = (dims.leftX + dims.cx) / 2;
  const rightLabelX = (dims.cx + dims.rightX) / 2;
  const wallCenterY = (dims.midY + dims.bottomY + sideWallPx) / 2;

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

      <polygon points={topFacePoints} fill={faceColors.topFaceColor} stroke={faceColors.topFaceStroke} strokeWidth={TOP_FACE_STROKE_WIDTH} strokeOpacity={TOP_FACE_STROKE_OPACITY} />
      <polygon points={leftSidePoints} fill={faceColors.leftSideColor} />
      <polygon points={rightSidePoints} fill={faceColors.rightSideColor} />
      <line x1={dims.leftX} y1={dims.midY} x2={dims.cx} y2={dims.topY} stroke={EDGE_HIGHLIGHT_COLOR} strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH} strokeOpacity={EDGE_HIGHLIGHT_OPACITY} />

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

      {provider && (
        <g data-testid="provider-badge">
          <rect
            x={screenWidth - 22}
            y={svgHeight - 16}
            width={20}
            height={14}
            rx={3}
            fill={PROVIDER_BADGE_COLORS[provider]?.bg ?? '#666'}
            fillOpacity={0.9}
          />
          <text
            x={screenWidth - 12}
            y={svgHeight - 5}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={8}
            fontWeight="700"
            fill={PROVIDER_BADGE_COLORS[provider]?.text ?? '#FFF'}
            textAnchor="middle"
          >
            {PROVIDER_BADGE_LABELS[provider] ?? '??'}
          </text>
        </g>
      )}

    </svg>
  );
});

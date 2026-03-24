import { memo, useId } from 'react';
import type {
  BlockRole,
  EndpointSemantic,
  ProviderType,
  ResourceCategory,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import { BLOCK_SHORT_NAMES, ROLE_VISUAL_INDICATORS } from '../../shared/types/index';
import { getBlockIconUrl, getSubtypeShortLabel } from '../../shared/utils/iconResolver';
import { getBlockDimensions, getBlockVisualProfile } from '../../shared/types/visualProfile';
import {
  BLOCK_PADDING,
  EDGE_HIGHLIGHT_COLOR,
  EDGE_HIGHLIGHT_OPACITY,
  EDGE_HIGHLIGHT_STROKE_WIDTH,
  TOP_FACE_STROKE_OPACITY,
  TOP_FACE_STROKE_WIDTH,
  PORT_DOT_RX,
  PORT_DOT_RY,
  PORT_DOT_STROKE_WIDTH,
  PORT_DOT_OPACITY,
  PORT_DOT_ACTIVE_OPACITY,
  PORT_COLOR_HTTP,
  PORT_COLOR_EVENT,
  PORT_COLOR_DATA,
  PORT_COLOR_OCCUPIED,
  PORT_GLOW_RADIUS,
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors } from './blockFaceColors';
import { cuToSilhouetteDimensions, getSilhouetteFromCU } from './silhouettes';
import { getBlockSvgPortPoints, portIndexToSemantic } from './blockGeometry';

/** Port interaction event detail passed to callbacks. */
export interface PortInteraction {
  side: 'inbound' | 'outbound';
  index: number;
  semantic: EndpointSemantic;
}

interface BlockSvgProps {
  category: ResourceCategory;
  provider?: ProviderType;
  subtype?: string;
  name?: string; // user-given resource name (displayed in detail panel, not on block face)
  aggregationCount?: number; // v2.0 §8 — show ×N badge when > 1
  roles?: BlockRole[]; // v2.0 §9 — visual-only role indicators
  /** When true, port dots are emphasized (connect mode active). */
  showPorts?: boolean;
  /** Set of endpoint semantics that are already connected (shown dimmed). */
  occupiedEndpointSemantics?: ReadonlySet<string>;
  /** Called when pointer goes down on a port dot (drag-to-connect). */
  onPortPointerDown?: (port: PortInteraction, event: React.PointerEvent) => void;
  /** Called when pointer enters a port dot (hover glow). */
  onPortPointerEnter?: (port: PortInteraction) => void;
  /** Called when pointer leaves a port dot (hover glow). */
  onPortPointerLeave?: (port: PortInteraction) => void;
  /** Currently hovered port key (e.g. "out-0") for glow rendering. */
  hoveredPort?: string | null;
}

/** Semantic color map for port fills. */
const SEMANTIC_COLOR_MAP: Record<string, string> = {
  http: PORT_COLOR_HTTP,
  event: PORT_COLOR_EVENT,
  data: PORT_COLOR_DATA,
};

/** Resolve the fill color for a port dot. */
function getPortFill(
  showPorts: boolean | undefined,
  semantic: EndpointSemantic,
  isOccupied: boolean | undefined,
): string {
  if (!showPorts) return '#94a3b8'; // default muted
  if (isOccupied) return PORT_COLOR_OCCUPIED;
  return SEMANTIC_COLOR_MAP[semantic] ?? '#94a3b8';
}

export const BlockSvg = memo(function BlockSvg({
  category,
  provider,
  subtype,
  name: _name,
  aggregationCount,
  roles,
  showPorts,
  occupiedEndpointSemantics,
  onPortPointerDown,
  onPortPointerEnter,
  onPortPointerLeave,
  hoveredPort,
}: BlockSvgProps) {
  // ─── v2.0: CU-based dimension resolution ───────────────────
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  const profile = getBlockVisualProfile(category);

  const { screenWidth, diamondHeight, sideWallPx, cx, leftX, rightX, topY, midY, bottomY } = dims;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const faceColors = getBlockFaceColors(category, provider ?? 'azure', subtype);
  const shortName = BLOCK_SHORT_NAMES[category];
  const subtypeLabel = getSubtypeShortLabel(provider ?? 'azure', subtype);
  const iconUrl = getBlockIconUrl(provider ?? 'azure', category, subtype);

  // ─── v2.0: silhouette from CU dimensions ───────────────────
  const silhouetteResult = getSilhouetteFromCU(profile.silhouette, cu);

  const connectorId = useId().replace(/:/g, '_');

  const leftLabelX = (leftX + cx) / 2;
  const rightLabelX = (cx + rightX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  const minDim = Math.min(cu.width, cu.depth);
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
                      stroke="rgba(255,255,255,0.10)"
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

      {/* ─── Resource type label (left wall — flush) ─── */}
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
        {subtypeLabel ?? shortName}
      </text>

      {iconUrl && (
        <image
          href={iconUrl}
          width={iconSize}
          height={iconSize}
          x={-iconSize / 2}
          y={-iconSize / 2}
          transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
        />
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

      {/* ─── Port glow filter (connect mode or hover) ─── */}
      <defs>
        <filter id={`port-glow-${connectorId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={PORT_GLOW_RADIUS} />
        </filter>
      </defs>

      {/* ─── Port dots (connection anchor points on side walls) ─── */}
      <g data-testid="port-dots" opacity={showPorts ? PORT_DOT_ACTIVE_OPACITY : PORT_DOT_OPACITY}>
        {(() => {
          const ports = CATEGORY_PORTS[category];
          const portPoints = getBlockSvgPortPoints(cu, ports.inbound, ports.outbound);
          return (
            <>
              {portPoints.inbound.map((pt, i) => {
                const semantic = portIndexToSemantic(i);
                const isOccupied = occupiedEndpointSemantics?.has(`input-${semantic}`);
                const fillColor = getPortFill(showPorts, semantic, isOccupied);
                const portKey = `in-${i}`;
                const isHovered = hoveredPort === portKey;
                const scale = isHovered ? 1.5 : 1;
                const rx = PORT_DOT_RX * scale;
                const ry = PORT_DOT_RY * scale;
                return (
                  <g key={`port-in-${pt.x}-${pt.y}-${semantic}`}>
                    {(showPorts || isHovered) && !isOccupied && (
                      <polygon
                        points={`${pt.x},${pt.y - ry} ${pt.x + rx},${pt.y} ${pt.x},${pt.y + ry} ${pt.x - rx},${pt.y}`}
                        fill={fillColor}
                        filter={`url(#port-glow-${connectorId})`}
                        opacity={isHovered ? 0.8 : 0.5}
                        data-testid={`port-glow-in-${i}`}
                      />
                    )}
                    <polygon
                      points={`${pt.x},${pt.y - ry} ${pt.x + rx},${pt.y} ${pt.x},${pt.y + ry} ${pt.x - rx},${pt.y}`}
                      fill={fillColor}
                      stroke={isHovered ? '#ffffff' : '#ffffff'}
                      strokeWidth={isHovered ? PORT_DOT_STROKE_WIDTH + 0.5 : PORT_DOT_STROKE_WIDTH}
                      strokeOpacity={isHovered ? 0.9 : 0.6}
                      style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                      data-testid={`port-dot-in-${i}`}
                      data-semantic={semantic}
                      data-occupied={isOccupied ? 'true' : 'false'}
                      onPointerDown={
                        onPortPointerDown
                          ? (e) => {
                              e.stopPropagation();
                              onPortPointerDown({ side: 'inbound', index: i, semantic }, e);
                            }
                          : undefined
                      }
                      onPointerEnter={
                        onPortPointerEnter
                          ? () => onPortPointerEnter({ side: 'inbound', index: i, semantic })
                          : undefined
                      }
                      onPointerLeave={
                        onPortPointerLeave
                          ? () => onPortPointerLeave({ side: 'inbound', index: i, semantic })
                          : undefined
                      }
                    />
                  </g>
                );
              })}
              {portPoints.outbound.map((pt, i) => {
                const semantic = portIndexToSemantic(i);
                const isOccupied = occupiedEndpointSemantics?.has(`output-${semantic}`);
                const fillColor = getPortFill(showPorts, semantic, isOccupied);
                const portKey = `out-${i}`;
                const isHovered = hoveredPort === portKey;
                const scale = isHovered ? 1.5 : 1;
                const rx = PORT_DOT_RX * scale;
                const ry = PORT_DOT_RY * scale;
                return (
                  <g key={`port-out-${pt.x}-${pt.y}-${semantic}`}>
                    {(showPorts || isHovered) && !isOccupied && (
                      <polygon
                        points={`${pt.x},${pt.y - ry} ${pt.x + rx},${pt.y} ${pt.x},${pt.y + ry} ${pt.x - rx},${pt.y}`}
                        fill={fillColor}
                        filter={`url(#port-glow-${connectorId})`}
                        opacity={isHovered ? 0.8 : 0.5}
                        data-testid={`port-glow-out-${i}`}
                      />
                    )}
                    <polygon
                      points={`${pt.x},${pt.y - ry} ${pt.x + rx},${pt.y} ${pt.x},${pt.y + ry} ${pt.x - rx},${pt.y}`}
                      fill={fillColor}
                      stroke={isHovered ? '#ffffff' : '#ffffff'}
                      strokeWidth={isHovered ? PORT_DOT_STROKE_WIDTH + 0.5 : PORT_DOT_STROKE_WIDTH}
                      strokeOpacity={isHovered ? 0.9 : 0.6}
                      style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                      data-testid={`port-dot-out-${i}`}
                      data-semantic={semantic}
                      data-occupied={isOccupied ? 'true' : 'false'}
                      onPointerDown={
                        onPortPointerDown
                          ? (e) => {
                              e.stopPropagation();
                              onPortPointerDown({ side: 'outbound', index: i, semantic }, e);
                            }
                          : undefined
                      }
                      onPointerEnter={
                        onPortPointerEnter
                          ? () => onPortPointerEnter({ side: 'outbound', index: i, semantic })
                          : undefined
                      }
                      onPointerLeave={
                        onPortPointerLeave
                          ? () => onPortPointerLeave({ side: 'outbound', index: i, semantic })
                          : undefined
                      }
                    />
                  </g>
                );
              })}
            </>
          );
        })()}
      </g>
    </svg>
  );
});

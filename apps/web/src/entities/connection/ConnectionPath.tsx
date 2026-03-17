import { memo } from 'react';
import type { Connection, Block, Plate, ExternalActor } from '../../shared/types/index';
import { getDiffState } from '../../features/diff/engine';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';

interface ConnectionPathProps {
  connection: Connection;
  blocks: Block[];
  plates: Plate[];
  externalActors: ExternalActor[];
  originX: number;
  originY: number;
}

export const ConnectionPath = memo(function ConnectionPath({
  connection,
  blocks,
  plates,
  externalActors,
  originX,
  originY,
}: ConnectionPathProps) {
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const src = getEndpointWorldPosition(connection.sourceId, blocks, plates, externalActors);
  const tgt = getEndpointWorldPosition(connection.targetId, blocks, plates, externalActors);

  if (!src || !tgt) return null;

  const srcScreen = worldToScreen(src[0], src[1], src[2], originX, originY);
  const tgtScreen = worldToScreen(tgt[0], tgt[1], tgt[2], originX, originY);

  const midX = (srcScreen.x + tgtScreen.x) / 2;
  const midY = Math.min(srcScreen.y, tgtScreen.y) - 40;

  const pathD = `M ${srcScreen.x} ${srcScreen.y} Q ${midX} ${midY} ${tgtScreen.x} ${tgtScreen.y}`;
  const arrowId = `arrow-${connection.id}`;
  const diffState = diffMode && diffDelta ? getDiffState(connection.id, diffDelta) : 'unchanged';

  const bgStroke = diffState === 'added' ? '#166534'
    : diffState === 'removed' ? '#991b1b'
      : diffState === 'modified' ? '#854d0e'
        : '#1e293b';
  const fgStroke = diffState === 'added' ? '#22c55e'
    : diffState === 'removed' ? '#ef4444'
      : diffState === 'modified' ? '#eab308'
        : '#64748b';
  const arrowFillBg = bgStroke;
  const arrowFillFg = fgStroke;
  const fgStrokeWidth = connection.type === 'http' ? 3 : 2;
  const fgStrokeDasharray = connection.type === 'internal'
    ? '4 4'
    : connection.type === 'data'
      ? '8 4'
      : connection.type === 'async'
        ? '8 4 2 4'
        : undefined;

  return (
    <g opacity={diffState === 'removed' ? 0.4 : 1}>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" floodColor="#000000" />
        </filter>
        <marker
          id={`${arrowId}-bg`}
          markerWidth="12"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          refX="10"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 12 5, 0 10" fill={arrowFillBg} />
        </marker>
        <marker
          id={arrowId}
          markerWidth="10"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          refX="8"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 10 4, 0 8" fill={arrowFillFg} />
        </marker>
      </defs>
      <path
        d={pathD}
        stroke={bgStroke}
        strokeWidth={4}
        fill="none"
        markerEnd={`url(#${arrowId}-bg)`}
      />
      <path
        d={pathD}
        stroke={fgStroke}
        strokeWidth={fgStrokeWidth}
        strokeDasharray={fgStrokeDasharray}
        fill="none"
        filter="url(#glow)"
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
});

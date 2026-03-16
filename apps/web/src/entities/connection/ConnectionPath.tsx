import { memo } from 'react';
import type { Connection, Block, Plate, ExternalActor } from '../../shared/types/index';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';

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
  const src = getEndpointWorldPosition(connection.sourceId, blocks, plates, externalActors);
  const tgt = getEndpointWorldPosition(connection.targetId, blocks, plates, externalActors);

  if (!src || !tgt) return null;

  const srcScreen = worldToScreen(src[0], src[1], src[2], originX, originY);
  const tgtScreen = worldToScreen(tgt[0], tgt[1], tgt[2], originX, originY);

  const midX = (srcScreen.x + tgtScreen.x) / 2;
  const midY = Math.min(srcScreen.y, tgtScreen.y) - 40;

  const pathD = `M ${srcScreen.x} ${srcScreen.y} Q ${midX} ${midY} ${tgtScreen.x} ${tgtScreen.y}`;
  const arrowId = `arrow-${connection.id}`;

  return (
    <g>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" floodColor="#000000" />
        </filter>
        <marker
          id={`${arrowId}-bg`}
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#1e293b" />
        </marker>
        <marker
          id={arrowId}
          markerWidth="6"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>
      <path
        d={pathD}
        stroke="#1e293b"
        strokeWidth={3}
        fill="none"
        markerEnd={`url(#${arrowId}-bg)`}
      />
      <path
        d={pathD}
        stroke="#94a3b8"
        strokeWidth={1.5}
        fill="none"
        filter="url(#glow)"
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
});

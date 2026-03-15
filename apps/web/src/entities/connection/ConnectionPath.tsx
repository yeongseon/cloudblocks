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
  const midY = Math.min(srcScreen.y, tgtScreen.y) - 60;

  const pathD = `M ${srcScreen.x} ${srcScreen.y} Q ${midX} ${midY} ${tgtScreen.x} ${tgtScreen.y}`;
  const arrowId = `arrow-${connection.id}`;

  return (
    <g>
      <defs>
        <marker
          id={arrowId}
          markerWidth="12"
          markerHeight="12"
          refX="8"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#ff6b6b" />
        </marker>
      </defs>
      <path
        d={pathD}
        stroke="#ff6b6b"
        strokeWidth={2.5}
        fill="none"
        strokeDasharray="4 2"
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
});

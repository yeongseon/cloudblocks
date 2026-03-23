import { memo, useState } from 'react';
import type {
  Connection,
  EndpointSemantic,
  ContainerNode,
  ExternalActor,
  LeafNode,
} from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
import { worldToScreen } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { CONNECTION_VISUAL_STYLES } from '../validation/connection';
import { getConnectionEndpointWorldAnchors } from './endpointAnchors';

interface ConnectionPathProps {
  connection: Connection;
  blocks: LeafNode[];
  plates: ContainerNode[];
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
  const [isHovered, setIsHovered] = useState(false);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const endpoints = useArchitectureStore((s) => s.workspace.architecture.endpoints);
  const fromEndpoint = endpoints.find((endpoint) => endpoint.id === connection.from);
  const semantic: EndpointSemantic = fromEndpoint?.semantic ?? 'data';
  const anchors = getConnectionEndpointWorldAnchors(
    connection,
    blocks,
    plates,
    endpoints,
    externalActors,
  );

  if (!anchors) return null;

  const srcScreen = worldToScreen(anchors.src[0], anchors.src[1], anchors.src[2], originX, originY);
  const tgtScreen = worldToScreen(anchors.tgt[0], anchors.tgt[1], anchors.tgt[2], originX, originY);

  const midX = (srcScreen.x + tgtScreen.x) / 2;
  const midY = Math.min(srcScreen.y, tgtScreen.y) - 40;

  const pathD = `M ${srcScreen.x} ${srcScreen.y} Q ${midX} ${midY} ${tgtScreen.x} ${tgtScreen.y}`;
  const arrowId = `arrow-${connection.id}`;
  const diffState = diffMode && diffDelta ? getDiffState(connection.id, diffDelta) : 'unchanged';

  const semanticFgColor =
    semantic === 'http' ? '#4C78A8' : semantic === 'event' ? '#6B86B4' : '#5C97A3';
  const semanticBgColor =
    semantic === 'http' ? '#2C4A6E' : semantic === 'event' ? '#3E506E' : '#3A6670';

  const bgStroke =
    diffState === 'added'
      ? '#166534'
      : diffState === 'removed'
        ? '#991b1b'
        : diffState === 'modified'
          ? '#854d0e'
          : semanticBgColor;
  const fgStroke =
    diffState === 'added'
      ? '#22c55e'
      : diffState === 'removed'
        ? '#ef4444'
        : diffState === 'modified'
          ? '#eab308'
          : semanticFgColor;
  const arrowFillBg = bgStroke;
  const arrowFillFg = fgStroke;
  const connStyle =
    CONNECTION_VISUAL_STYLES[
      semantic === 'http' ? 'http' : semantic === 'event' ? 'async' : 'data'
    ];
  const fgStrokeWidth = connStyle.strokeWidth;
  const isSelected = selectedId === connection.id;
  const isHighlighted = isHovered || isSelected;
  const bgStrokeWidth = isHighlighted ? 6 : 4;
  const effectiveFgStrokeWidth = isHighlighted ? fgStrokeWidth + 2 : fgStrokeWidth;
  const fgStrokeDasharray = connStyle.strokeDasharray;

  const handleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();

    if (toolMode === 'delete') {
      removeConnection(connection.id);
      return;
    }

    setSelectedId(connection.id);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <g
      opacity={diffState === 'removed' ? 0.4 : 1}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
    >
      <defs>
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
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        pointerEvents="stroke"
        data-testid="connection-hit-area"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <path
        d={pathD}
        stroke={bgStroke}
        strokeWidth={bgStrokeWidth}
        fill="none"
        pointerEvents="none"
        markerEnd={`url(#${arrowId}-bg)`}
      />
      <path
        d={pathD}
        stroke={fgStroke}
        strokeWidth={effectiveFgStrokeWidth}
        strokeDasharray={fgStrokeDasharray}
        fill="none"
        pointerEvents="none"
        markerEnd={`url(#${arrowId})`}
      />
    </g>
  );
});

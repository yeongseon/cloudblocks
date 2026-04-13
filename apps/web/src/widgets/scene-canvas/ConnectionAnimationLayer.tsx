import { memo } from 'react';
import type { Connection } from '@cloudblocks/schema';
import { useAnimationClock } from '../../shared/hooks/useAnimationClock';
import { ConnectionRenderer } from '../../entities/connection/ConnectionRenderer';
import { useUIStore } from '../../entities/store/uiStore';

interface ConnectionAnimationLayerProps {
  connections: readonly Connection[];
  originX: number;
  originY: number;
  overlapOffsets: ReadonlyMap<string, number>;
}

export const ConnectionAnimationLayer = memo(function ConnectionAnimationLayer({
  connections,
  originX,
  originY,
  overlapOffsets,
}: ConnectionAnimationLayerProps) {
  const hasAnyActiveConnection = connections.length > 0;
  const { elapsed, reducedMotion } = useAnimationClock(hasAnyActiveConnection);
  const flowFocusMode = useUIStore((s) => s.flowFocusMode);

  return (
    <svg
      className={`connection-layer${flowFocusMode ? ' flow-focus-active' : ''}`}
      style={{ width: 1, height: 1 }}
    >
      <title>Connections</title>
      {connections.map((conn) => (
        <ConnectionRenderer
          key={conn.id}
          connectionId={conn.id}
          connection={conn}
          originX={originX}
          originY={originY}
          overlapOffset={overlapOffsets.get(conn.id) ?? 0}
          elapsed={elapsed}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  );
});

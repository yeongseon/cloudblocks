import { memo } from 'react';
import type { Connection } from '@cloudblocks/schema';
import { ConnectionRenderer } from '../../entities/connection/ConnectionRenderer';

interface ConnectionAnimationLayerProps {
  connections: readonly Connection[];
  originX: number;
  originY: number;
  overlapOffsets: ReadonlyMap<string, number>;
  elapsed: number;
  reducedMotion: boolean;
  selectedConnectionIds?: ReadonlySet<string>;
  className?: string;
  pointerEvents?: 'auto' | 'none';
  overlayMode?: 'normal' | 'visual-only' | 'hit-only';
}

export const ConnectionAnimationLayer = memo(function ConnectionAnimationLayer({
  connections,
  originX,
  originY,
  overlapOffsets,
  elapsed,
  reducedMotion,
  selectedConnectionIds,
  className = 'connection-layer',
  pointerEvents = 'auto',
  overlayMode = 'normal',
}: ConnectionAnimationLayerProps) {
  return (
    <svg
      className={className}
      style={{ width: 1, height: 1, pointerEvents }}
      {...(overlayMode === 'visual-only' ? { 'aria-hidden': true } : {})}
    >
      {overlayMode !== 'visual-only' && <title>Connections</title>}
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
          overlayMode={
            overlayMode === 'normal' && selectedConnectionIds?.has(conn.id)
              ? 'hit-only'
              : overlayMode
          }
        />
      ))}
    </svg>
  );
});

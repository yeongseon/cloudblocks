import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import {
  BLOCK_COLORS,
  BLOCK_FRIENDLY_NAMES,
  BLOCK_ICONS,
} from '../../shared/types/index';
import type { Block, Connection, ExternalActor } from '../../shared/types/index';
import './FlowDiagram.css';

function buildFlowChain(
  connections: Connection[]
): string[] {
  // Build adjacency list
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const allIds = new Set<string>();

  for (const conn of connections) {
    allIds.add(conn.sourceId);
    allIds.add(conn.targetId);
    if (!adj.has(conn.sourceId)) adj.set(conn.sourceId, []);
    adj.get(conn.sourceId)!.push(conn.targetId);
    inDegree.set(conn.targetId, (inDegree.get(conn.targetId) ?? 0) + 1);
    if (!inDegree.has(conn.sourceId)) inDegree.set(conn.sourceId, 0);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const id of allIds) {
    if ((inDegree.get(id) ?? 0) === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const next of (adj.get(node) ?? [])) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return sorted;
}

export function FlowDiagram() {
  const { blocks, connections, externalActors } = useArchitectureStore(
    (s) => s.workspace.architecture
  );

  const flowChain = useMemo(() => {
    if (!connections || connections.length === 0) return [];
    return buildFlowChain(connections);
  }, [connections]);

  if (flowChain.length === 0) {
    return null;
  }

  const blockMap = new Map<string, Block>(blocks.map((b) => [b.id, b]));
  const actorMap = new Map<string, ExternalActor>(
    externalActors.map((a) => [a.id, a])
  );

  return (
    <div className="flow-diagram">
      {flowChain.map((id, index) => {
        const block = blockMap.get(id);
        const actor = actorMap.get(id);

        let content;
        if (actor) {
          content = (
            <div className="flow-node flow-node-external">
              <span className="flow-icon">☁</span>
              Internet
            </div>
          );
        } else if (block) {
          const color = BLOCK_COLORS[block.category] || '#607D8B';
          const icon = BLOCK_ICONS[block.category] || '■';
          const name = BLOCK_FRIENDLY_NAMES[block.category] || block.category;
          
          content = (
            <div className="flow-node" style={{ backgroundColor: color }}>
              <span className="flow-icon">{icon}</span>
              {name}
            </div>
          );
        } else {
          // Unknown node ID (could happen if connections reference non-existent blocks)
          return null;
        }

        return (
          <div key={`flow-wrap-${id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {content}
            {index < flowChain.length - 1 && (
              <span className="flow-arrow">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
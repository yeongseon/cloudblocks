import type { Endpoint } from './model.js';
import type { EndpointDirection, EndpointSemantic } from './enums.js';

const DIRECTIONS: readonly EndpointDirection[] = ['input', 'output'] as const;
const SEMANTICS: readonly EndpointSemantic[] = ['http', 'event', 'data'] as const;

/**
 * Generate deterministic endpoint ID.
 * Format: endpoint-{blockId}-{direction}-{semantic}
 */
export function endpointId(
  blockId: string,
  direction: EndpointDirection,
  semantic: EndpointSemantic,
): string {
  return `endpoint-${blockId}-${direction}-${semantic}`;
}

/**
 * Generate all 6 endpoints for a block (3 semantics × 2 directions).
 * IDs are deterministic to prevent diff churn.
 */
export function generateEndpointsForBlock(blockId: string): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const direction of DIRECTIONS) {
    for (const semantic of SEMANTICS) {
      endpoints.push({
        id: endpointId(blockId, direction, semantic),
        blockId,
        direction,
        semantic,
      });
    }
  }
  return endpoints;
}

/**
 * Map legacy ConnectionType to EndpointSemantic.
 * Used during v3→v4 migration.
 */
export function connectionTypeToSemantic(type: string): EndpointSemantic {
  switch (type) {
    case 'http':
      return 'http';
    case 'async':
      return 'event';
    case 'data':
    case 'dataflow':
    case 'internal':
    default:
      return 'data';
  }
}

/**
 * Parse a deterministic endpoint ID to extract blockId, direction, and semantic.
 * Returns null if the ID doesn't match the expected format.
 */
export function parseEndpointId(
  epId: string,
): { blockId: string; direction: EndpointDirection; semantic: EndpointSemantic } | null {
  const prefix = 'endpoint-';
  if (!epId.startsWith(prefix)) return null;
  const rest = epId.slice(prefix.length);
  // Find direction-semantic suffix
  for (const dir of DIRECTIONS) {
    for (const sem of SEMANTICS) {
      const suffix = `-${dir}-${sem}`;
      if (rest.endsWith(suffix)) {
        const blockId = rest.slice(0, -suffix.length);
        if (blockId.length > 0) {
          return { blockId, direction: dir, semantic: sem };
        }
      }
    }
  }
  return null;
}

/**
 * Map EndpointSemantic back to legacy ConnectionType string.
 * Used by resolveConnectionNodes for backward compatibility.
 */
const SEMANTIC_TO_TYPE: Record<string, string> = {
  http: 'http',
  event: 'async',
  data: 'dataflow',
};

/**
 * Resolve a v4 Connection's `from`/`to` endpoint IDs to source/target block IDs
 * and connection type (mapped from endpoint semantic for UI compatibility).
 * Uses deterministic endpoint ID parsing — no endpoint array lookup needed.
 */
export function resolveConnectionNodes(conn: { from: string; to: string }): {
  sourceId: string;
  targetId: string;
  type: string;
} {
  const fromParsed = parseEndpointId(conn.from);
  const toParsed = parseEndpointId(conn.to);
  return {
    sourceId: fromParsed?.blockId ?? conn.from,
    targetId: toParsed?.blockId ?? conn.to,
    type: SEMANTIC_TO_TYPE[fromParsed?.semantic ?? 'data'] ?? 'dataflow',
  };
}

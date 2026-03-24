import type {
  Connection,
  ConnectionType,
  Endpoint,
  EndpointSemantic,
  ExternalActor,
  ResourceCategory,
  Block,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS, parseEndpointId } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

/**
 * Connection Rules (from DOMAIN_MODEL.md §6):
 *
 * Connection direction = initiator direction.
 * Connections are initiator/client → receiver/server.
 * Responses are implied and do not require a reverse connection.
 *
 * Allowed connections:
 *   Internet  → Edge                  ✔  (external traffic enters through edge)
 *   Edge      → Compute               ✔  (edge forwards to compute)
 *   Compute   → Data                  ✔  (app queries/writes data resources)
 *   Compute   → Operations            ✔  (app emits metrics/logs/traces)
 *   Compute   → Security              ✔  (app uses identity/security services)
 *   Compute   → Messaging             ✔  (app publishes messages/events)
 *   Messaging → Compute               ✔  (message/event trigger)
 *
 * Data, Security, Operations, and Network are receiver-only — they never initiate connections.
 */

type ConnectionCategory = ResourceCategory;
export type EndpointType = ResourceCategory | 'internet' | 'browser';

/** Map of allowed category pairs to endpoint semantics. */
const ALLOWED_CONNECTIONS: Record<string, EndpointSemantic[]> = {
  'browser->internet': ['http', 'data'],
  'browser->delivery': ['http', 'data'],
  'internet->delivery': ['http', 'data'],
  'delivery->delivery': ['http', 'data'],
  'delivery->compute': ['http', 'data'],
  'compute->data': ['data'],
  'compute->operations': ['event', 'data'],
  'compute->security': ['data'],
  'compute->identity': ['data'],
  'compute->messaging': ['event', 'data'],
  'messaging->compute': ['event', 'data'],
};

/** Ordered semantic list for endpoint index mapping. */
const SEMANTIC_ORDER: EndpointSemantic[] = ['http', 'event', 'data'];

// ─── Visual Style Constants (v2.0) ──────────────────────────

/**
 * Visual style for each connection type.
 * Used by ConnectionPath.tsx for rendering differentiation.
 *
 * Spec §11.1:
 *   dataflow → solid line (default)
 *   http    → thicker solid line
 *   internal → short dash
 *   data    → long dash
 *   async   → dot-dash
 */
export interface ConnectionVisualStyle {
  strokeWidth: number;
  strokeDasharray?: string;
}

export const CONNECTION_VISUAL_STYLES: Record<ConnectionType, ConnectionVisualStyle> = {
  dataflow: { strokeWidth: 2 },
  http: { strokeWidth: 3 },
  internal: { strokeWidth: 2, strokeDasharray: '4 4' },
  data: { strokeWidth: 2, strokeDasharray: '8 4' },
  async: { strokeWidth: 2, strokeDasharray: '8 4 2 4' },
};

export function validateConnection(
  connection: Connection,
  endpoints: Endpoint[],
  nodes: Block[],
  externalActors: ExternalActor[] = [],
): ValidationError | null {
  const fromEndpoint = endpoints.find((endpoint) => endpoint.id === connection.from);
  if (!fromEndpoint) {
    const parsed = parseEndpointId(connection.from);
    const sourceLabel = parsed?.blockId ?? connection.from;
    return {
      ruleId: 'rule-conn-source',
      severity: 'error',
      message: `Connection source "${sourceLabel}" not found`,
      suggestion: 'Remove this connection or update the source',
      targetId: connection.id,
    };
  }

  const toEndpoint = endpoints.find((endpoint) => endpoint.id === connection.to);
  if (!toEndpoint) {
    const parsed = parseEndpointId(connection.to);
    const targetLabel = parsed?.blockId ?? connection.to;
    return {
      ruleId: 'rule-conn-target',
      severity: 'error',
      message: `Connection target "${targetLabel}" not found`,
      suggestion: 'Remove this connection or update the target',
      targetId: connection.id,
    };
  }

  if (fromEndpoint.blockId === toEndpoint.blockId) {
    return {
      ruleId: 'rule-conn-self',
      severity: 'error',
      message: 'A node cannot connect to itself',
      suggestion: 'Connect to a different node',
      targetId: connection.id,
    };
  }

  // Resolve types from nodes or external actors
  const fromNode = nodes.find((node) => node.id === fromEndpoint.blockId);
  const toNode = nodes.find((node) => node.id === toEndpoint.blockId);
  const fromActor = externalActors.find((actor) => actor.id === fromEndpoint.blockId);
  const toActor = externalActors.find((actor) => actor.id === toEndpoint.blockId);

  const fromType: EndpointType | null = fromNode?.category ?? fromActor?.type ?? null;
  const toType: EndpointType | null = toNode?.category ?? toActor?.type ?? null;

  if (!fromType || !toType) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: 'Connection endpoints must belong to existing nodes',
      suggestion: 'Remove this connection or update the endpoints',
      targetId: connection.id,
    };
  }

  // Direction check
  if (fromEndpoint.direction !== 'output') {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: 'Source endpoint must have output direction',
      suggestion: 'Use an output endpoint as the connection source',
      targetId: connection.id,
    };
  }

  if (toEndpoint.direction !== 'input') {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: 'Target endpoint must have input direction',
      suggestion: 'Use an input endpoint as the connection target',
      targetId: connection.id,
    };
  }

  // Semantic match check
  if (fromEndpoint.semantic !== toEndpoint.semantic) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: 'Source and target endpoints must have matching semantics',
      suggestion: 'Use endpoints with the same semantic type',
      targetId: connection.id,
    };
  }

  // Category pair check
  const ruleKey = `${fromType}->${toType}`;
  const allowedSemantics = ALLOWED_CONNECTIONS[ruleKey];

  if (!allowedSemantics) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: `Invalid connection: ${fromType} \u2192 ${toType}`,
      suggestion: `${fromType} cannot initiate a request to ${toType}`,
      targetId: connection.id,
    };
  }

  if (!allowedSemantics.includes(fromEndpoint.semantic)) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: `Invalid semantic for ${fromType} \u2192 ${toType}: ${fromEndpoint.semantic}`,
      suggestion: `Use a valid semantic for ${fromType} \u2192 ${toType}`,
      targetId: connection.id,
    };
  }

  return null;
}

export function validateStubIndices(
  connection: Connection,
  nodes: Block[],
): ValidationError | null {
  const fromParsed = parseEndpointId(connection.from);
  const toParsed = parseEndpointId(connection.to);
  if (!fromParsed || !toParsed) return null;

  const fromNode = nodes.find((n) => n.id === fromParsed.blockId);
  const toNode = nodes.find((n) => n.id === toParsed.blockId);

  // Check source port: only for resource nodes (not external actors)
  if (fromNode) {
    const outbound = CATEGORY_PORTS[fromNode.category]?.outbound ?? 1;
    const semanticIndex = SEMANTIC_ORDER.indexOf(fromParsed.semantic);
    if (semanticIndex >= 0 && semanticIndex > outbound) {
      return {
        ruleId: 'rule-conn-endpoint-source',
        severity: 'error',
        message: `Source endpoint index ${semanticIndex} exceeds outbound capacity ${outbound} for ${fromNode.category}`,
        suggestion: 'Use a semantic that fits the source category port capacity',
        targetId: connection.id,
      };
    }
  }

  // Check target port: only for resource nodes (not external actors)
  if (toNode) {
    const inbound = CATEGORY_PORTS[toNode.category]?.inbound ?? 1;
    const semanticIndex = SEMANTIC_ORDER.indexOf(toParsed.semantic);
    if (semanticIndex >= 0 && semanticIndex > inbound) {
      return {
        ruleId: 'rule-conn-endpoint-target',
        severity: 'error',
        message: `Target endpoint index ${semanticIndex} exceeds inbound capacity ${inbound} for ${toNode.category}`,
        suggestion: 'Use a semantic that fits the target category port capacity',
        targetId: connection.id,
      };
    }
  }

  return null;
}

/**
 * Check if a connection from sourceCategory to targetCategory is allowed.
 * Used for visual feedback during connect mode.
 */
export function canConnect(sourceType: EndpointType, targetType: EndpointType): boolean;
export function canConnect(
  fromEndpoint: Endpoint,
  toEndpoint: Endpoint,
  fromNode: Block | undefined,
  toNode: Block | undefined,
): { valid: boolean; reason?: string };
export function canConnect(
  source: EndpointType | Endpoint,
  target: EndpointType | Endpoint,
  fromNode?: Block,
  toNode?: Block,
): boolean | { valid: boolean; reason?: string } {
  if (typeof source === 'string' && typeof target === 'string') {
    if (source === 'internet') {
      return target === 'delivery';
    }
    if (source === 'browser') {
      return target === 'internet' || target === 'delivery';
    }
    if (target === 'internet' || target === 'browser') {
      return false;
    }

    const key = `${source}->${target}`;
    return key in ALLOWED_CONNECTIONS;
  }

  if (typeof source === 'string' || typeof target === 'string') {
    return false;
  }

  const fromEndpoint = source;
  const toEndpoint = target;
  if (!fromNode || !toNode) {
    return { valid: false, reason: 'Connection endpoints must belong to existing nodes' };
  }

  if (fromEndpoint.direction !== 'output') {
    return { valid: false, reason: 'Source endpoint must have output direction' };
  }

  if (toEndpoint.direction !== 'input') {
    return { valid: false, reason: 'Target endpoint must have input direction' };
  }

  if (fromEndpoint.semantic !== toEndpoint.semantic) {
    return { valid: false, reason: 'Source and target endpoints must have matching semantics' };
  }

  const fromCategory = fromNode.category as ConnectionCategory;
  const toCategory = toNode.category as ConnectionCategory;
  const ruleKey = `${fromCategory}->${toCategory}`;
  const allowedSemantics = ALLOWED_CONNECTIONS[ruleKey];

  if (!allowedSemantics) {
    return { valid: false, reason: `Invalid connection: ${fromCategory} \u2192 ${toCategory}` };
  }

  if (!allowedSemantics.includes(fromEndpoint.semantic)) {
    return {
      valid: false,
      reason: `Invalid semantic for ${fromCategory} \u2192 ${toCategory}: ${fromEndpoint.semantic}`,
    };
  }

  return { valid: true };
}

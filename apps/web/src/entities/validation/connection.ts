import type {
  Connection,
  Endpoint,
  EndpointSemantic,
  Block,
  ResourceBlock,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS, parseEndpointId } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { getEffectiveEndpointType, resolveEndpointSource } from '../connection/endpointResolver';
import type { EndpointType } from '../connection/endpointResolver';
export type { EndpointType } from '../connection/endpointResolver';

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
// Re-exported from shared tokens — single source of truth.
// See shared/tokens/connectionVisualTokens.ts for definitions.
export type { ConnectionVisualStyle } from '../../shared/tokens/connectionVisualTokens';
export { CONNECTION_VISUAL_STYLES } from '../../shared/tokens/connectionVisualTokens';

export function validateConnection(
  connection: Connection,
  endpoints: Endpoint[],
  nodes: Block[],
): ValidationError | null {
  const fromEndpoint = endpoints.find((endpoint) => endpoint.id === connection.from);
  if (!fromEndpoint) {
    const parsed = parseEndpointId(connection.from);
    const sourceLabel = parsed?.blockId ?? connection.from;
    return {
      ruleId: 'rule-conn-source',
      severity: 'error',
      message: `Connection source "${sourceLabel}" is missing.`,
      suggestion:
        'The source block may have been deleted. Remove this connection or reconnect it to an existing block.',
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
      message: `Connection target "${targetLabel}" is missing.`,
      suggestion:
        'The target block may have been deleted. Remove this connection or reconnect it to an existing block.',
      targetId: connection.id,
    };
  }

  if (fromEndpoint.blockId === toEndpoint.blockId) {
    return {
      ruleId: 'rule-conn-self',
      severity: 'error',
      message: "A block can't connect to itself.",
      suggestion:
        'Connect it to a different block. Connections represent data flow between separate components.',
      targetId: connection.id,
    };
  }

  const resourceNodes = nodes.filter((node): node is ResourceBlock => node.kind === 'resource');
  const fromSource = resolveEndpointSource(fromEndpoint.blockId, resourceNodes);
  const toSource = resolveEndpointSource(toEndpoint.blockId, resourceNodes);
  const fromType: EndpointType | null = fromSource ? getEffectiveEndpointType(fromSource) : null;
  const toType: EndpointType | null = toSource ? getEffectiveEndpointType(toSource) : null;

  if (!fromType || !toType) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: 'Connection endpoints are invalid.',
      suggestion:
        'Both endpoints must belong to existing blocks. Remove this connection and create a new one.',
      targetId: connection.id,
    };
  }

  // Direction check
  if (fromEndpoint.direction !== 'output') {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: "The source endpoint isn't an output port.",
      suggestion:
        'Connections flow from output ports to input ports. Use an output port as the starting point.',
      targetId: connection.id,
    };
  }

  if (toEndpoint.direction !== 'input') {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: "The target endpoint isn't an input port.",
      suggestion:
        'Connections flow from output ports to input ports. Use an input port as the destination.',
      targetId: connection.id,
    };
  }

  // Semantic match check
  if (fromEndpoint.semantic !== toEndpoint.semantic) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: "Port types don't match.",
      suggestion:
        'Both ports must use the same protocol (e.g., both HTTP or both Data). Match the port types to create a valid connection.',
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
      message: `${fromType} can't connect to ${toType}.`,
      suggestion:
        "This connection direction isn't supported. Check the allowed connection patterns: e.g., Edge → Compute, Compute → Data.",
      targetId: connection.id,
    };
  }

  if (!allowedSemantics.includes(fromEndpoint.semantic)) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: `Wrong protocol for ${fromType} → ${toType}: "${fromEndpoint.semantic}".`,
      suggestion: `This connection type doesn't support the "${fromEndpoint.semantic}" protocol. Use a supported protocol for this connection pair.`,
      targetId: connection.id,
    };
  }

  return null;
}

export function validatePortIndices(
  connection: Connection,
  nodes: Block[],
): ValidationError | null {
  const fromParsed = parseEndpointId(connection.from);
  const toParsed = parseEndpointId(connection.to);
  if (!fromParsed || !toParsed) return null;

  const resourceNodes = nodes.filter((node): node is ResourceBlock => node.kind === 'resource');
  const fromSource = resolveEndpointSource(fromParsed.blockId, resourceNodes);
  const toSource = resolveEndpointSource(toParsed.blockId, resourceNodes);

  if (fromSource) {
    const fromType = getEffectiveEndpointType(fromSource);
    const fromPorts = CATEGORY_PORTS[fromType as keyof typeof CATEGORY_PORTS];
    if (fromPorts) {
      const semanticIndex = SEMANTIC_ORDER.indexOf(fromParsed.semantic);
      if (semanticIndex >= 0 && semanticIndex > fromPorts.outbound) {
        return {
          ruleId: 'rule-conn-endpoint-source',
          severity: 'error',
          message: `Source port exceeds ${fromType}'s outbound capacity.`,
          suggestion: `${fromType} blocks support up to ${fromPorts.outbound} outbound connection types. Use a different protocol or connection path.`,
          targetId: connection.id,
        };
      }
    }
  }

  if (toSource) {
    const toType = getEffectiveEndpointType(toSource);
    const toPorts = CATEGORY_PORTS[toType as keyof typeof CATEGORY_PORTS];
    if (toPorts) {
      const semanticIndex = SEMANTIC_ORDER.indexOf(toParsed.semantic);
      if (semanticIndex >= 0 && semanticIndex > toPorts.inbound) {
        return {
          ruleId: 'rule-conn-endpoint-target',
          severity: 'error',
          message: `Target port exceeds ${toType}'s inbound capacity.`,
          suggestion: `${toType} blocks support up to ${toPorts.inbound} inbound connection types. Use a different protocol or connection path.`,
          targetId: connection.id,
        };
      }
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
    const key = `${source}->${target}`;
    return key in ALLOWED_CONNECTIONS;
  }

  if (typeof source === 'string' || typeof target === 'string') {
    return false;
  }

  const fromEndpoint = source;
  const toEndpoint = target;
  if (!fromNode || !toNode) {
    return { valid: false, reason: 'Both endpoints must belong to existing blocks.' };
  }

  if (fromEndpoint.direction !== 'output') {
    return {
      valid: false,
      reason:
        'Connections flow from output ports to input ports. Use an output port as the starting point.',
    };
  }

  if (toEndpoint.direction !== 'input') {
    return {
      valid: false,
      reason:
        'Connections flow from output ports to input ports. Use an input port as the destination.',
    };
  }

  if (fromEndpoint.semantic !== toEndpoint.semantic) {
    return {
      valid: false,
      reason: 'Both ports must use the same protocol (e.g., both HTTP or both Data).',
    };
  }

  const fromType = getEffectiveEndpointType(fromNode);
  const toType = getEffectiveEndpointType(toNode);
  const ruleKey = `${fromType}->${toType}`;
  const allowedSemantics = ALLOWED_CONNECTIONS[ruleKey];

  if (!allowedSemantics) {
    return { valid: false, reason: `${fromType} can't connect to ${toType}.` };
  }

  if (!allowedSemantics.includes(fromEndpoint.semantic)) {
    return {
      valid: false,
      reason: `Wrong protocol for ${fromType} → ${toType}: "${fromEndpoint.semantic}".`,
    };
  }

  return { valid: true };
}

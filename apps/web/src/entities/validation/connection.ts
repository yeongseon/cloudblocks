import type { LeafNode, Connection, ConnectionType, ExternalActor, ResourceCategory } from '@cloudblocks/schema';
import { getPortsForResourceType } from '@cloudblocks/schema';
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

export type EndpointType = ResourceCategory | 'internet';

/** Map of allowed connections: source (initiator) → Set<target (receiver)> */
const ALLOWED_CONNECTIONS: Record<string, Set<string>> = {
  internet: new Set(['edge']),
  edge: new Set(['compute']),
  compute: new Set(['data', 'operations', 'security', 'messaging']),
  messaging: new Set(['compute']),
  // data, security, operations, and network are receiver-only — not listed as sources
};

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

function getEndpointType(
  id: string,
  resources: LeafNode[],
  externalActors: ExternalActor[]
): EndpointType | null {
  const resource = resources.find((r) => r.id === id);
  if (resource) return resource.category;

  const actor = externalActors.find((a) => a.id === id);
  if (actor) return actor.type;

  return null;
}

export function validateConnection(
  connection: Connection,
  resources: LeafNode[],
  externalActors: ExternalActor[]
): ValidationError | null {
  const sourceType = getEndpointType(
    connection.sourceId,
    resources,
    externalActors
  );
  const targetType = getEndpointType(
    connection.targetId,
    resources,
    externalActors
  );

  if (!sourceType) {
    return {
      ruleId: 'rule-conn-source',
      severity: 'error',
      message: `Connection source "${connection.sourceId}" not found`,
      suggestion: 'Remove this connection or update the source',
      targetId: connection.id,
    };
  }

  if (!targetType) {
    return {
      ruleId: 'rule-conn-target',
      severity: 'error',
      message: `Connection target "${connection.targetId}" not found`,
      suggestion: 'Remove this connection or update the target',
      targetId: connection.id,
    };
  }

  if (connection.sourceId === connection.targetId) {
    return {
      ruleId: 'rule-conn-self',
      severity: 'error',
      message: 'A block cannot connect to itself',
      suggestion: 'Connect to a different block',
      targetId: connection.id,
    };
  }

  const allowed = ALLOWED_CONNECTIONS[sourceType];
  if (!allowed || !allowed.has(targetType)) {
    return {
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      message: `Invalid connection: ${sourceType} → ${targetType}`,
      suggestion: `${sourceType} cannot initiate a request to ${targetType}`,
      targetId: connection.id,
    };
  }

  const stubError = validateStubIndices(connection, resources);
  if (stubError) {
    return stubError;
  }

  return null;
}

export function validateStubIndices(
  connection: Connection,
  resources: LeafNode[],
): ValidationError | null {
  const source = resources.find((resource) => resource.id === connection.sourceId);
  const target = resources.find((resource) => resource.id === connection.targetId);

  if (connection.sourceStub !== undefined && source) {
    const ports = getPortsForResourceType(source.resourceType);
    if (connection.sourceStub < 0 || connection.sourceStub >= ports.outbound) {
      return {
        ruleId: 'rule-conn-stub-source',
        severity: 'error',
        message: `Invalid source stub index ${connection.sourceStub}`,
        suggestion: 'Source stub index out of range',
        targetId: connection.id,
      };
    }
  }

  if (connection.targetStub !== undefined && target) {
    const ports = getPortsForResourceType(target.resourceType);
    if (connection.targetStub < 0 || connection.targetStub >= ports.inbound) {
      return {
        ruleId: 'rule-conn-stub-target',
        severity: 'error',
        message: `Invalid target stub index ${connection.targetStub}`,
        suggestion: 'Target stub index out of range',
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
export function canConnect(sourceCategory: EndpointType, targetCategory: EndpointType): boolean {
  const allowed = ALLOWED_CONNECTIONS[sourceCategory];
  return allowed !== undefined && allowed.has(targetCategory);
}

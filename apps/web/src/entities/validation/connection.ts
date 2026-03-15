import type {
  Block,
  Connection,
  ExternalActor,
  BlockCategory,
  ValidationError,
} from '../../shared/types/index';

/**
 * Connection Rules (from DOMAIN_MODEL.md §6):
 *
 * Connection direction = initiator direction.
 * Connections are initiator/client → receiver/server.
 * Responses are implied and do not require a reverse connection.
 *
 * Allowed connections:
 *   Internet  → Gateway               ✔  (external traffic enters through gateway)
 *   Gateway   → Compute               ✔  (gateway forwards to compute)
 *   Gateway   → Function              ✔  (HTTP trigger, v1.0)
 *   Compute   → Database              ✔  (app queries database)
 *   Compute   → Storage               ✔  (app reads/writes storage)
 *   Function  → Storage               ✔  (function accesses storage, v1.0)
 *   Function  → Database              ✔  (function accesses database, v1.0)
 *   Function  → Queue                 ✔  (function enqueues messages, v1.0)
 *   Queue     → Function              ✔  (queue trigger, v1.0)
 *   Timer     → Function              ✔  (timer trigger, v1.0)
 *   Event     → Function              ✔  (event trigger, v1.0)
 *
 * Database and Storage are receiver-only — they never initiate connections.
 * Queue, Timer, and Event can only connect to Function.
 */

type EndpointType = BlockCategory | 'internet';

/** Map of allowed connections: source (initiator) → Set<target (receiver)> */
const ALLOWED_CONNECTIONS: Record<string, Set<string>> = {
  internet: new Set(['gateway']),
  gateway: new Set(['compute', 'function']),
  compute: new Set(['database', 'storage']),
  function: new Set(['storage', 'database', 'queue']),
  queue: new Set(['function']),
  timer: new Set(['function']),
  event: new Set(['function']),
  // database and storage are receiver-only — not listed as sources
};

function getEndpointType(
  id: string,
  blocks: Block[],
  externalActors: ExternalActor[]
): EndpointType | null {
  const block = blocks.find((b) => b.id === id);
  if (block) return block.category;

  const actor = externalActors.find((a) => a.id === id);
  if (actor) return actor.type;

  return null;
}

export function validateConnection(
  connection: Connection,
  blocks: Block[],
  externalActors: ExternalActor[]
): ValidationError | null {
  const sourceType = getEndpointType(
    connection.sourceId,
    blocks,
    externalActors
  );
  const targetType = getEndpointType(
    connection.targetId,
    blocks,
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

  return null;
}

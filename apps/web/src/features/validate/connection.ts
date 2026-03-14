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
 *
 * Allowed connections:
 *   Internet → Gateway    ✔
 *   Gateway  → Compute    ✔
 *   Compute  → Database   ✔
 *   Compute  → Storage    ✔
 *
 * Forbidden connections:
 *   Database → Gateway    ❌
 *   Database → Internet   ❌
 *   Storage  → Gateway    ❌
 *   Storage  → Internet   ❌
 */

type EndpointType = BlockCategory | 'internet';

/** Map of allowed connections: source → Set<target> */
const ALLOWED_CONNECTIONS: Record<string, Set<string>> = {
  internet: new Set(['gateway']),
  gateway: new Set(['compute']),
  compute: new Set(['database', 'storage']),
  database: new Set(['compute']), // DB can respond but not initiate to gateway/internet
  storage: new Set(['compute']),
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

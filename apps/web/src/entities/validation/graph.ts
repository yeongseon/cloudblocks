import type { ArchitectureModel, Block, ContainerBlock, Endpoint } from '@cloudblocks/schema';
import { endpointId, getPortsForResourceType, parseEndpointId } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { validateBlockIntegrity } from '@cloudblocks/domain';

/**
 * Graph invariants — structural rules the ID-based editor and the store
 * indexes depend on.
 *
 * `buildArchitectureIndexes` keys `Map`s by id, so duplicate ids silently
 * collapse and the array and the index end up describing different
 * architectures. Nothing above this layer can detect that, so these checks
 * must run before a model is trusted.
 */

const UNIQUE_ID_FIX = 'Ids must be unique — editing, deleting and connecting all resolve by id.';
const STRUCTURE_FIX = 'Containers must form a tree of existing container blocks.';
const GEOMETRY_FIX = 'Sizes and positions must be positive, finite numbers.';
const ENDPOINT_FIX = 'Endpoints are derived from the block they belong to. Regenerate them.';
const PORT_FIX = 'Remove connections until the block fits its port budget.';

function issue(
  ruleId: string,
  targetId: string,
  message: string,
  suggestion: string,
  severity: ValidationError['severity'] = 'error',
): ValidationError {
  return { ruleId, severity, message, suggestion, targetId };
}

function findDuplicates<T>(items: readonly T[], keyOf: (item: T) => string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }

  return [...duplicates];
}

function validateUniqueIds(model: ArchitectureModel): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const id of findDuplicates(model.nodes, (node) => node.id)) {
    errors.push(
      issue(
        'rule-graph-duplicate-node-id',
        id,
        `Two or more blocks share the id "${id}".`,
        UNIQUE_ID_FIX,
      ),
    );
  }

  for (const id of findDuplicates(model.endpoints, (endpoint) => endpoint.id)) {
    errors.push(
      issue(
        'rule-graph-duplicate-endpoint-id',
        id,
        `Two or more endpoints share the id "${id}".`,
        UNIQUE_ID_FIX,
      ),
    );
  }

  for (const id of findDuplicates(model.connections, (connection) => connection.id)) {
    errors.push(
      issue(
        'rule-graph-duplicate-connection-id',
        id,
        `Two or more connections share the id "${id}".`,
        UNIQUE_ID_FIX,
      ),
    );
  }

  return errors;
}

function validateParentLinks(model: ArchitectureModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const byId = new Map<string, Block>();
  for (const node of model.nodes) {
    if (!byId.has(node.id)) {
      byId.set(node.id, node);
    }
  }

  for (const node of model.nodes) {
    if (node.parentId === null || node.parentId === undefined) {
      continue;
    }

    if (node.parentId === node.id) {
      errors.push(
        issue(
          'rule-graph-self-parent',
          node.id,
          `"${node.name}" is its own parent.`,
          STRUCTURE_FIX,
        ),
      );
      continue;
    }

    const parent = byId.get(node.parentId);
    if (!parent) {
      errors.push(
        issue(
          'rule-graph-missing-parent',
          node.id,
          `"${node.name}" references a parent "${node.parentId}" that does not exist.`,
          STRUCTURE_FIX,
        ),
      );
      continue;
    }

    if (parent.kind !== 'container') {
      errors.push(
        issue(
          'rule-graph-parent-not-container',
          node.id,
          `"${node.name}" is inside "${parent.name}", which is not a container.`,
          STRUCTURE_FIX,
        ),
      );
    }
  }

  errors.push(...findParentCycles(model.nodes, byId));
  return errors;
}

function findParentCycles(
  nodes: readonly Block[],
  byId: ReadonlyMap<string, Block>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const reported = new Set<string>();

  for (const node of nodes) {
    const path = new Set<string>([node.id]);
    let current = node.parentId ? byId.get(node.parentId) : undefined;

    while (current) {
      if (path.has(current.id)) {
        if (!reported.has(node.id)) {
          reported.add(node.id);
          errors.push(
            issue(
              'rule-graph-parent-cycle',
              node.id,
              `"${node.name}" is part of a containment cycle.`,
              STRUCTURE_FIX,
            ),
          );
        }
        break;
      }

      path.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }

  return errors;
}

function isPositiveFinite(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validateDimensions(model: ArchitectureModel): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of model.nodes) {
    const { x, y, z } = node.position ?? {};
    if (![x, y, z].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      errors.push(
        issue(
          'rule-graph-position',
          node.id,
          `"${node.name}" has a position that is not a finite coordinate.`,
          GEOMETRY_FIX,
        ),
      );
    }

    if (node.kind !== 'container') {
      continue;
    }

    const frame = (node as ContainerBlock).frame;
    if (
      !frame ||
      !isPositiveFinite(frame.width) ||
      !isPositiveFinite(frame.height) ||
      !isPositiveFinite(frame.depth)
    ) {
      errors.push(
        issue(
          'rule-graph-container-frame',
          node.id,
          `"${node.name}" has a container size that is not positive.`,
          GEOMETRY_FIX,
        ),
      );
    }
  }

  return errors;
}

function validateEndpointOwnership(model: ArchitectureModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(model.nodes.map((node) => node.id));

  for (const endpoint of model.endpoints) {
    if (!nodeIds.has(endpoint.blockId)) {
      errors.push(
        issue(
          'rule-graph-endpoint-owner',
          endpoint.id,
          `Endpoint "${endpoint.id}" belongs to block "${endpoint.blockId}", which does not exist.`,
          ENDPOINT_FIX,
        ),
      );
      continue;
    }

    if (endpoint.id !== endpointId(endpoint.blockId, endpoint.direction, endpoint.semantic)) {
      errors.push(
        issue(
          'rule-graph-endpoint-id',
          endpoint.id,
          `Endpoint "${endpoint.id}" does not match its own block, direction and protocol.`,
          ENDPOINT_FIX,
        ),
      );
    }
  }

  return errors;
}

function blockIdOf(
  endpointRef: string,
  endpointsById: ReadonlyMap<string, Endpoint>,
): string | null {
  return endpointsById.get(endpointRef)?.blockId ?? parseEndpointId(endpointRef)?.blockId ?? null;
}

/**
 * Architecture-wide port capacity.
 *
 * `addConnection` enforces this per block as connections are drawn, but nothing
 * re-checks it for a model that arrived whole — an import, an undo/restore, a
 * template or an AI result can exceed the policy without ever passing through
 * that guard.
 *
 * Reported as a warning, not an error: an over-connected block is still
 * well-formed and renderable, and failing it closed would make an already-saved
 * workspace unopenable.
 */
function validatePortCapacity(model: ArchitectureModel): ValidationError[] {
  const errors: ValidationError[] = [];
  const endpointsById = new Map(model.endpoints.map((endpoint) => [endpoint.id, endpoint]));
  const outbound = new Map<string, number>();
  const inbound = new Map<string, number>();

  for (const connection of model.connections) {
    const fromBlockId = blockIdOf(connection.from, endpointsById);
    const toBlockId = blockIdOf(connection.to, endpointsById);

    if (fromBlockId) {
      outbound.set(fromBlockId, (outbound.get(fromBlockId) ?? 0) + 1);
    }
    if (toBlockId) {
      inbound.set(toBlockId, (inbound.get(toBlockId) ?? 0) + 1);
    }
  }

  for (const node of model.nodes) {
    if (node.kind !== 'resource') {
      continue;
    }

    const ports = getPortsForResourceType(node.resourceType);
    const used = {
      outbound: outbound.get(node.id) ?? 0,
      inbound: inbound.get(node.id) ?? 0,
    };

    if (used.outbound > ports.outbound) {
      errors.push(
        issue(
          'rule-graph-port-capacity',
          node.id,
          `"${node.name}" has ${used.outbound} outgoing connections but only ${ports.outbound} outbound ports.`,
          PORT_FIX,
          'warning',
        ),
      );
    }

    if (used.inbound > ports.inbound) {
      errors.push(
        issue(
          'rule-graph-port-capacity',
          node.id,
          `"${node.name}" has ${used.inbound} incoming connections but only ${ports.inbound} inbound ports.`,
          PORT_FIX,
          'warning',
        ),
      );
    }
  }

  return errors;
}

function validateKindIntegrity(model: ArchitectureModel): ValidationError[] {
  return model.nodes.flatMap((node) =>
    validateBlockIntegrity(node).map((integrityError) =>
      issue(
        'rule-graph-block-integrity',
        integrityError.blockId,
        `"${node.name}" has an invalid ${integrityError.field}: ${integrityError.reason}`,
        'Recreate the block from the palette so its kind matches its resource type.',
      ),
    ),
  );
}

export function validateGraphInvariants(model: ArchitectureModel): ValidationError[] {
  return [
    ...validateUniqueIds(model),
    ...validateParentLinks(model),
    ...validateDimensions(model),
    ...validateEndpointOwnership(model),
    ...validateKindIntegrity(model),
    ...validatePortCapacity(model),
  ];
}

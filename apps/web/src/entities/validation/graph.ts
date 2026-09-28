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

function error(
  ruleId: string,
  targetId: string,
  message: string,
  suggestion: string,
): ValidationError {
  return { ruleId, severity: 'error', message, suggestion, targetId };
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
      error(
        'rule-graph-duplicate-node-id',
        id,
        `Two or more blocks share the id "${id}".`,
        'Block ids must be unique — editing, deleting and connecting all resolve blocks by id.',
      ),
    );
  }

  for (const id of findDuplicates(model.endpoints, (endpoint) => endpoint.id)) {
    errors.push(
      error(
        'rule-graph-duplicate-endpoint-id',
        id,
        `Two or more endpoints share the id "${id}".`,
        'Endpoint ids must be unique so connections resolve to exactly one port.',
      ),
    );
  }

  for (const id of findDuplicates(model.connections, (connection) => connection.id)) {
    errors.push(
      error(
        'rule-graph-duplicate-connection-id',
        id,
        `Two or more connections share the id "${id}".`,
        'Connection ids must be unique so selection and deletion affect one connection.',
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
        error(
          'rule-graph-self-parent',
          node.id,
          `"${node.name}" is its own parent.`,
          'A block cannot contain itself. Move it to a different container or to the root.',
        ),
      );
      continue;
    }

    const parent = byId.get(node.parentId);
    if (!parent) {
      errors.push(
        error(
          'rule-graph-missing-parent',
          node.id,
          `"${node.name}" references a parent "${node.parentId}" that does not exist.`,
          'Move the block to an existing container or to the root.',
        ),
      );
      continue;
    }

    if (parent.kind !== 'container') {
      errors.push(
        error(
          'rule-graph-parent-not-container',
          node.id,
          `"${node.name}" is inside "${parent.name}", which is not a container.`,
          'Only container blocks can hold children. Move this block into a Network or Subnet.',
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
            error(
              'rule-graph-parent-cycle',
              node.id,
              `"${node.name}" is part of a containment cycle.`,
              'Containers must form a tree. Break the loop by re-parenting one of the blocks.',
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
        error(
          'rule-graph-position',
          node.id,
          `"${node.name}" has a position that is not a finite coordinate.`,
          'Positions must be finite numbers. Re-place the block on the canvas.',
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
        error(
          'rule-graph-container-frame',
          node.id,
          `"${node.name}" has a container size that is not positive.`,
          'Container width, height and depth must all be positive numbers.',
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
        error(
          'rule-graph-endpoint-owner',
          endpoint.id,
          `Endpoint "${endpoint.id}" belongs to block "${endpoint.blockId}", which does not exist.`,
          'Remove the orphaned endpoint, or restore the block it belongs to.',
        ),
      );
      continue;
    }

    if (endpoint.id !== endpointId(endpoint.blockId, endpoint.direction, endpoint.semantic)) {
      errors.push(
        error(
          'rule-graph-endpoint-id',
          endpoint.id,
          `Endpoint "${endpoint.id}" does not match its own block, direction and protocol.`,
          'Endpoint ids are derived from the block they belong to. Regenerate the block endpoints.',
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
        error(
          'rule-graph-port-capacity',
          node.id,
          `"${node.name}" has ${used.outbound} outgoing connections but only ${ports.outbound} outbound ports.`,
          'Remove connections until the block fits its port budget, or route traffic through another block.',
        ),
      );
    }

    if (used.inbound > ports.inbound) {
      errors.push(
        error(
          'rule-graph-port-capacity',
          node.id,
          `"${node.name}" has ${used.inbound} incoming connections but only ${ports.inbound} inbound ports.`,
          'Remove connections until the block fits its port budget, or route traffic through another block.',
        ),
      );
    }
  }

  return errors;
}

function validateKindIntegrity(model: ArchitectureModel): ValidationError[] {
  return model.nodes.flatMap((node) =>
    validateBlockIntegrity(node).map((integrityError) =>
      error(
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

/**
 * ELK Graph Adapter
 *
 * Pure functions to convert between CloudBlocks ArchitectureModel and ELK JSON graph format.
 * No store dependencies — all inputs/outputs are plain data.
 *
 * Coordinate mapping:
 *   CloudBlocks world (x, z) in CU → ELK (x, y) in CU
 *   CloudBlocks positions are absolute world coordinates.
 *   ELK positions are relative to the parent node.
 *   All CU values are used directly (no pixel conversion needed).
 */

import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type { ArchitectureModel, Block, ContainerBlock, Connection } from '@cloudblocks/schema';
import { resolveConnectionNodes } from '@cloudblocks/schema';
import type { BlockDimensionsCU } from '../../shared/types/visualProfile';
import { getBlockDimensions } from '../../shared/types/visualProfile';

/* ── Constants ────────────────────────────────────────────────────── */

/** Internal padding (CU) inside ELK compound nodes for container blocks */
const CONTAINER_PADDING_CU = 2;

/** Spacing between sibling nodes (CU) */
const NODE_SPACING_CU = 3;

/** Spacing between layers (CU) */
const LAYER_SPACING_CU = 4;

/* ── Types ────────────────────────────────────────────────────────── */

/** Position patch entry produced by readElkPositions */
export interface LayoutPatchEntry {
  id: string;
  position: { x: number; y: number; z: number };
  frame?: { width: number; height: number; depth: number };
}

/** Result of converting architecture model to ELK graph */
export interface ElkConversionResult {
  graph: ElkNode;
  /** Original node data keyed by id, for reverse mapping */
  nodeMap: Map<string, Block>;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function isContainer(node: Block): node is ContainerBlock {
  return node.kind === 'container';
}

/**
 * Get CU dimensions for a block (resource or container).
 * For containers, uses frame. For resources, uses getBlockDimensions.
 */
function getNodeDimensions(node: Block): BlockDimensionsCU {
  if (isContainer(node)) {
    return {
      width: node.frame.width,
      depth: node.frame.depth,
      height: node.frame.height,
    };
  }
  return getBlockDimensions(node.category, node.provider, node.subtype);
}

/* ── Model → ELK ─────────────────────────────────────────────────── */

/**
 * Convert a CloudBlocks ArchitectureModel to an ELK JSON graph.
 *
 * Strategy:
 * - Root-level containers become children of the ELK root node.
 * - Nested containers and resource blocks become children of their parent ELK node.
 * - ELK uses top-left coordinate convention; we convert from CloudBlocks center-based.
 * - All dimensions are in CU (composition units), used directly.
 * - Containers let ELK determine size (Option B) to produce optimal layouts.
 */
export function architectureToElkGraph(model: ArchitectureModel): ElkConversionResult {
  const nodeMap = new Map<string, Block>();
  for (const node of model.nodes) {
    nodeMap.set(node.id, node);
  }

  // Build parent→children index
  const childrenByParent = new Map<string | null, Block[]>();
  for (const node of model.nodes) {
    const parentKey = node.parentId ?? null;
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(node);
    childrenByParent.set(parentKey, siblings);
  }

  // Recursively build ELK nodes
  function buildElkNode(node: Block): ElkNode {
    const dims = getNodeDimensions(node);
    const children = childrenByParent.get(node.id) ?? [];
    // Convert center-based position to top-left for ELK
    const topLeftX = node.position.x - dims.width / 2;
    const topLeftZ = node.position.z - dims.depth / 2;

    const elkNode: ElkNode = {
      id: node.id,
      x: topLeftX,
      y: topLeftZ, // ELK y = CloudBlocks z-axis
      width: dims.width,
      height: dims.depth, // ELK height = CloudBlocks depth (z-axis)
    };

    if (isContainer(node) && children.length > 0) {
      // Compound node: add children and padding
      elkNode.children = children.map(buildElkNode);
      elkNode.layoutOptions = {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.padding': `[top=${CONTAINER_PADDING_CU},left=${CONTAINER_PADDING_CU},bottom=${CONTAINER_PADDING_CU},right=${CONTAINER_PADDING_CU}]`,
        'elk.spacing.nodeNode': String(NODE_SPACING_CU),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_SPACING_CU),
      };
    }

    return elkNode;
  }

  // Build root-level children
  const rootChildren = childrenByParent.get(null) ?? [];
  const elkChildren = rootChildren.map(buildElkNode);

  // Build edges from connections
  const edges = connectionsToElkEdges(model.connections, nodeMap);

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': String(NODE_SPACING_CU),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_SPACING_CU),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children: elkChildren,
    edges,
  };

  return { graph, nodeMap };
}

/**
 * Convert connections to ELK extended edges.
 * Only includes edges where both source and target blocks exist in the model.
 */
function connectionsToElkEdges(
  connections: Connection[],
  nodeMap: Map<string, Block>,
): ElkExtendedEdge[] {
  const edges: ElkExtendedEdge[] = [];

  for (const conn of connections) {
    const { sourceId, targetId } = resolveConnectionNodes(conn);
    // Only include edges where both endpoints exist
    if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
      edges.push({
        id: conn.id,
        sources: [sourceId],
        targets: [targetId],
      });
    }
  }

  return edges;
}

/* ── ELK → Model (position extraction) ───────────────────────────── */

/**
 * Extract laid-out positions from an ELK result and convert back to
 * absolute CloudBlocks world coordinates (CU, snapped to integers).
 *
 * ELK returns positions relative to the parent node's top-left corner.
 * We convert to absolute by accumulating parent offsets.
 */
export function readElkPositions(
  elkRoot: ElkNode,
  nodeMap: Map<string, Block>,
): LayoutPatchEntry[] {
  const patches: LayoutPatchEntry[] = [];

  function traverse(elkNode: ElkNode, parentAbsX: number, parentAbsZ: number): void {
    // Skip the root synthetic node
    if (elkNode.id === 'root') {
      for (const child of elkNode.children ?? []) {
        traverse(child, 0, 0);
      }
      return;
    }

    const original = nodeMap.get(elkNode.id);
    if (!original) return;

    // ELK x,y → CloudBlocks x,z (absolute)
    const elkTopLeftX = parentAbsX + (elkNode.x ?? 0);
    const elkTopLeftZ = parentAbsZ + (elkNode.y ?? 0);

    // Convert ELK top-left back to CloudBlocks center-based
    const dims = getNodeDimensions(original);
    const centerX = elkTopLeftX + dims.width / 2;
    const centerZ = elkTopLeftZ + dims.depth / 2;

    // Snap to CU grid (round to nearest integer)
    const snappedX = Math.round(centerX);
    const snappedZ = Math.round(centerZ);

    const patch: LayoutPatchEntry = {
      id: elkNode.id,
      position: {
        x: snappedX,
        y: original.position.y, // preserve elevation
        z: snappedZ,
      },
    };

    // For containers, also update frame if ELK resized
    if (isContainer(original) && elkNode.width != null && elkNode.height != null) {
      const newWidth = Math.max(Math.round(elkNode.width), original.frame.width);
      const newDepth = Math.max(Math.round(elkNode.height), original.frame.depth);
      patch.frame = {
        width: newWidth,
        height: original.frame.height, // preserve vertical height
        depth: newDepth,
      };
    }

    patches.push(patch);

    // Recurse into children with accumulated absolute offset
    for (const child of elkNode.children ?? []) {
      traverse(child, elkTopLeftX, elkTopLeftZ);
    }
  }

  traverse(elkRoot, 0, 0);
  return patches;
}

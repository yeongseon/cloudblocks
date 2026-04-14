/**
 * ELK Graph Adapter
 *
 * Pure functions to convert between CloudBlocks ArchitectureModel and ELK JSON graph format.
 * No store dependencies — all inputs/outputs are plain data.
 *
 * Coordinate mapping:
 *   CloudBlocks uses (x, z) in CU; ELK uses (x, y) in CU.
 *   Container positions are always absolute world coordinates.
 *   Resource positions with parentId are relative to the parent container center.
 *   Root-level resources (no parentId) use absolute world coordinates.
 *   ELK child node positions are relative to the parent node's top-left corner.
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
 * - Root-level containers become children of the ELK root node (absolute coords).
 * - Nested containers and resource blocks become children of their parent ELK node.
 * - ELK child coordinates are relative to parent's top-left corner.
 * - Container positions are absolute; resource positions are parent-center-relative.
 * - We convert both to ELK parent-relative top-left coordinates.
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

  /**
   * Build an ELK node for a CloudBlocks block.
   *
   * @param node - The CloudBlocks block
   * @param parentBlock - The parent container block (null for root-level nodes)
   */
  function buildElkNode(node: Block, parentBlock: Block | null): ElkNode {
    const dims = getNodeDimensions(node);
    const children = childrenByParent.get(node.id) ?? [];

    // Compute ELK position (parent-relative top-left)
    let elkX: number;
    let elkY: number;

    if (!parentBlock) {
      // Root-level node: position is absolute world center → absolute top-left
      elkX = node.position.x - dims.width / 2;
      elkY = node.position.z - dims.depth / 2;
    } else if (isContainer(node)) {
      // Nested container: position is absolute world center
      // Parent's top-left = parentPos - parentDims/2
      const parentDims = getNodeDimensions(parentBlock);
      const parentTopLeftX = parentBlock.position.x - parentDims.width / 2;
      const parentTopLeftZ = parentBlock.position.z - parentDims.depth / 2;
      // Node's absolute top-left
      const absTopLeftX = node.position.x - dims.width / 2;
      const absTopLeftZ = node.position.z - dims.depth / 2;
      // Parent-relative top-left
      elkX = absTopLeftX - parentTopLeftX;
      elkY = absTopLeftZ - parentTopLeftZ;
    } else {
      // Resource with parent: position is center-relative to parent center
      // Parent center = (0, 0) in relative coords
      // node.position is offset from parent center → top-left = position - dims/2
      elkX = node.position.x - dims.width / 2;
      elkY = node.position.z - dims.depth / 2;
      // But ELK coordinates are relative to parent's top-left, not parent center.
      // Offset: parent center = parent dims / 2 from top-left
      const parentDims = getNodeDimensions(parentBlock);
      elkX += parentDims.width / 2;
      elkY += parentDims.depth / 2;
    }

    const elkNode: ElkNode = {
      id: node.id,
      x: elkX,
      y: elkY,
      width: dims.width,
      height: dims.depth, // ELK height = CloudBlocks depth (z-axis)
    };

    if (isContainer(node) && children.length > 0) {
      // Compound node: add children and padding
      elkNode.children = children.map((child) => buildElkNode(child, node));
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
  const elkChildren = rootChildren.map((node) => buildElkNode(node, null));

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
 * CloudBlocks coordinates:
 * - Container positions → absolute world center coordinates.
 * - Resource positions with parentId → center-relative to parent container center.
 * - Root-level resources → absolute world center coordinates.
 *
 * ELK returns positions relative to the parent node's top-left corner.
 * We convert accordingly based on the node type and parent context.
 */
export function readElkPositions(
  elkRoot: ElkNode,
  nodeMap: Map<string, Block>,
): LayoutPatchEntry[] {
  const patches: LayoutPatchEntry[] = [];

  /**
   * @param elkNode - Current ELK node
   * @param parentAbsX - Parent's absolute top-left X in world coords
   * @param parentAbsZ - Parent's absolute top-left Z in world coords
   * @param parentBlock - The parent CloudBlocks block (null for root children)
   */
  function traverse(
    elkNode: ElkNode,
    parentAbsX: number,
    parentAbsZ: number,
    parentBlock: Block | null,
  ): void {
    // Skip the root synthetic node
    if (elkNode.id === 'root') {
      for (const child of elkNode.children ?? []) {
        traverse(child, 0, 0, null);
      }
      return;
    }

    const original = nodeMap.get(elkNode.id);
    if (!original) return;

    // ELK position is relative to parent top-left
    const elkRelX = elkNode.x ?? 0;
    const elkRelZ = elkNode.y ?? 0;

    // Compute absolute top-left position
    const absTopLeftX = parentAbsX + elkRelX;
    const absTopLeftZ = parentAbsZ + elkRelZ;

    // Use post-layout dimensions for center calculation
    const dims = getNodeDimensions(original);
    const layoutWidth = isContainer(original) && elkNode.width != null ? elkNode.width : dims.width;
    const layoutDepth =
      isContainer(original) && elkNode.height != null ? elkNode.height : dims.depth;

    // Compute the position in CloudBlocks coordinate convention
    let patchX: number;
    let patchZ: number;

    if (isContainer(original) || !parentBlock) {
      // Containers always use absolute world center
      // Root-level resources also use absolute world center
      patchX = Math.round(absTopLeftX + layoutWidth / 2);
      patchZ = Math.round(absTopLeftZ + layoutDepth / 2);
    } else {
      // Resource with parent: convert to parent-center-relative
      // ELK gives position relative to parent's top-left
      // CloudBlocks wants position relative to parent center
      const parentDims = getNodeDimensions(parentBlock);
      // Parent center in parent-local coords = (parentDims.width/2, parentDims.depth/2)
      // Node center in parent-local coords = (elkRelX + dims.width/2, elkRelZ + dims.depth/2)
      patchX = Math.round(elkRelX + dims.width / 2 - parentDims.width / 2);
      patchZ = Math.round(elkRelZ + dims.depth / 2 - parentDims.depth / 2);
    }

    const patch: LayoutPatchEntry = {
      id: elkNode.id,
      position: {
        x: patchX,
        y: original.position.y, // preserve elevation
        z: patchZ,
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

    // Recurse into children with this node's absolute top-left
    for (const child of elkNode.children ?? []) {
      traverse(child, absTopLeftX, absTopLeftZ, original);
    }
  }

  traverse(elkRoot, 0, 0, null);
  return patches;
}

/**
 * Template Overlap Validator — Quality Gate
 *
 * Validates that no resource blocks in a template overlap each other
 * when computed in global (world) coordinates. This catches:
 *
 * 1. Cross-container overlaps (blocks in different containers/subnets)
 * 2. External actor overlaps (parentId === null blocks)
 * 3. Same-container overlaps (redundant with placement.ts but included for completeness)
 *
 * Position convention: CENTER-BASED. All positions are center-of-object offsets
 * relative to the parent container's center. Bounding boxes are computed as
 * [center - size/2, center + size/2] on the X-Z plane.
 *
 * All resource blocks are 2×2×2 CU (medium tier).
 *
 * NOTE: This validator only inspects `architecture.nodes`. External actors
 * are expected to be migrated/mirrored into the nodes array. If that assumption
 * changes, this validator must be extended to also cover `architecture.externalActors`.
 *
 * @see helpers.ts clampWithinParent — center-based child clamping
 * @see placement.ts validateNoOverlap — same-parent-only overlap check
 * @see CLOUDBLOCKS_SPEC_V2.md §5.2 — tier dimensions
 */

import type { ArchitectureTemplate } from '../../shared/types/template';
import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import type { Position } from '@cloudblocks/schema';
import { CATEGORY_TIER_MAP, TIER_DIMENSIONS } from '../../shared/types/visualProfile';

// ─── Types ───────────────────────────────────────────────────

export interface OverlapViolation {
  /** First block involved in the overlap */
  blockA: { id: string; name: string };
  /** Second block involved in the overlap */
  blockB: { id: string; name: string };
  /** Overlap area in CU² (width × depth on X-Z plane) */
  overlapArea: number;
  /** Human-readable description */
  message: string;
}

export interface BoundsViolation {
  /** The child block/container that falls outside its ancestor */
  child: { id: string; name: string };
  /** The ancestor container whose frame the child exceeds */
  ancestor: { id: string; name: string };
  /** Human-readable description */
  message: string;
}

export interface GlobalBlock {
  id: string;
  name: string;
  /** Global position (world coordinates) */
  globalPosition: Position;
  /** Block width in CU */
  width: number;
  /** Block depth in CU */
  depth: number;
}

// ─── Core Logic ──────────────────────────────────────────────

/**
 * Compute the global (world) position of a resource block.
 *
 * Matches runtime semantics from position.ts getBlockWorldPosition():
 * - parentId === null → global = block.position (external actors)
 * - has parent → global = immediateParent.position + block.position
 *
 * Container positions in templates are ABSOLUTE (world coordinates).
 * Resource block positions are RELATIVE to their immediate parent container center.
 * We only add the immediate parent's absolute position — no hierarchy walk needed.
 */
export function computeGlobalPosition(
  resource: ResourceBlock,
  containers: ContainerBlock[],
): Position {
  if (!resource.parentId) {
    return { ...resource.position };
  }

  // Find immediate parent container (its position is absolute/world coords)
  const parent = containers.find((c) => c.id === resource.parentId);
  if (!parent) {
    // Orphan block — fall back to block position as-is
    return { ...resource.position };
  }

  // Runtime formula: parent.absolutePosition + block.relativePosition
  return {
    x: parent.position.x + resource.position.x,
    y: parent.position.y + resource.position.y,
    z: parent.position.z + resource.position.z,
  };
}

/**
 * Check if two axis-aligned bounding boxes overlap on the X-Z plane.
 * Uses strict overlap (not edge-touching): overlap exists when
 * both X and Z ranges have non-zero intersection.
 *
 * Position convention: CENTER-BASED. Each GlobalBlock.globalPosition is the
 * center of the block in world coordinates. Bounding box is computed as
 * [center - size/2, center + size/2].
 *
 * @returns overlap area in CU², or 0 if no overlap
 */
export function computeOverlapArea(a: GlobalBlock, b: GlobalBlock): number {
  const ax1 = a.globalPosition.x - a.width / 2;
  const az1 = a.globalPosition.z - a.depth / 2;
  const ax2 = a.globalPosition.x + a.width / 2;
  const az2 = a.globalPosition.z + a.depth / 2;

  const bx1 = b.globalPosition.x - b.width / 2;
  const bz1 = b.globalPosition.z - b.depth / 2;
  const bx2 = b.globalPosition.x + b.width / 2;
  const bz2 = b.globalPosition.z + b.depth / 2;

  const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const overlapZ = Math.max(0, Math.min(az2, bz2) - Math.max(az1, bz1));

  return overlapX * overlapZ;
}

/**
 * Resolve all resource blocks in a template to their global positions
 * with block dimensions.
 */
export function resolveGlobalBlocks(nodes: readonly Block[]): GlobalBlock[] {
  const containers = nodes.filter((n): n is ContainerBlock => n.kind === 'container');
  const resources = nodes.filter((n): n is ResourceBlock => n.kind === 'resource');

  return resources.map((resource) => {
    const tier = CATEGORY_TIER_MAP[resource.category] ?? 'medium';
    const dims = TIER_DIMENSIONS[tier];

    return {
      id: resource.id,
      name: resource.name,
      globalPosition: computeGlobalPosition(resource, containers),
      width: dims.width,
      depth: dims.depth,
    };
  });
}

/**
 * Validate that no resource blocks in a template overlap each other
 * when computed in global (world) coordinates.
 *
 * This is the quality gate function — run it against every builtin template
 * to prevent coordinate overlap bugs from shipping.
 *
 * @param template - The architecture template to validate
 * @param options - Optional configuration
 * @param options.minGap - Minimum gap between blocks in CU (default: 0, i.e. only check strict overlap)
 * @returns Array of overlap violations (empty = no overlaps = pass)
 */
export function validateTemplateOverlaps(
  template: ArchitectureTemplate,
  options?: { minGap?: number },
): OverlapViolation[] {
  const minGap = options?.minGap ?? 0;
  const violations: OverlapViolation[] = [];

  const globalBlocks = resolveGlobalBlocks(template.architecture.nodes);

  // Check all pairs
  for (let i = 0; i < globalBlocks.length; i++) {
    for (let j = i + 1; j < globalBlocks.length; j++) {
      const a = globalBlocks[i];
      const b = globalBlocks[j];

      // If minGap > 0, expand bounding boxes by minGap/2 on each side.
      // Center-based: just increase width/depth by minGap (expands equally from center).
      const effectiveA: GlobalBlock =
        minGap > 0
          ? {
              ...a,
              width: a.width + minGap,
              depth: a.depth + minGap,
            }
          : a;
      const effectiveB: GlobalBlock =
        minGap > 0
          ? {
              ...b,
              width: b.width + minGap,
              depth: b.depth + minGap,
            }
          : b;

      const area = computeOverlapArea(effectiveA, effectiveB);

      if (area > 0) {
        violations.push({
          blockA: { id: a.id, name: a.name },
          blockB: { id: b.id, name: b.name },
          overlapArea: area,
          message:
            `"${a.name}" (${a.id}) overlaps "${b.name}" (${b.id}) ` +
            `by ${area.toFixed(2)} CU² at global positions ` +
            `(${a.globalPosition.x}, ${a.globalPosition.z}) and ` +
            `(${b.globalPosition.x}, ${b.globalPosition.z})`,
        });
      }
    }
  }

  return violations;
}

// ─── Container Bounds Validation ─────────────────────────────

/**
 * Validate that all descendant blocks and containers fall within
 * their ancestor container's frame bounds on the X-Z plane.
 *
 * Position convention: CENTER-BASED. All positions are center offsets
 * relative to parent center. A child at position (cx, cz) relative to
 * parent center is within bounds when:
 *   |cx| <= parentFrame.width/2 - childSize.width/2
 *   |cz| <= parentFrame.depth/2 - childSize.depth/2
 *
 * This mirrors the clampWithinParent() logic in helpers.ts.
 *
 * @param template - The architecture template to validate
 * @returns Array of bounds violations (empty = all within bounds = pass)
 */
export function validateContainerBounds(template: ArchitectureTemplate): BoundsViolation[] {
  const violations: BoundsViolation[] = [];
  const nodes = template.architecture.nodes;
  const containers = nodes.filter((n): n is ContainerBlock => n.kind === 'container');
  const resources = nodes.filter((n): n is ResourceBlock => n.kind === 'resource');

  // Check child containers fit within parent containers (center-based).
  // Container positions are absolute in the template, so the relative offset
  // must be computed as child.position - parent.position.
  for (const child of containers) {
    if (!child.parentId || !child.frame) continue;
    const parent = containers.find((c) => c.id === child.parentId);
    if (!parent?.frame) continue;

    // Compute relative offset: child absolute - parent absolute
    const relX = child.position.x - parent.position.x;
    const relZ = child.position.z - parent.position.z;

    // Allowed range: ±(parentFrame/2 - childFrame/2)
    const allowedHalfX = parent.frame.width / 2 - child.frame.width / 2;
    const allowedHalfZ = parent.frame.depth / 2 - child.frame.depth / 2;

    if (
      relX < -allowedHalfX ||
      relX > allowedHalfX ||
      relZ < -allowedHalfZ ||
      relZ > allowedHalfZ
    ) {
      violations.push({
        child: { id: child.id, name: child.name },
        ancestor: { id: parent.id, name: parent.name },
        message:
          `Container "${child.name}" (${child.id}) relative offset ` +
          `(${relX}, ${relZ}) exceeds allowed range ` +
          `[${-allowedHalfX}, ${allowedHalfX}] × [${-allowedHalfZ}, ${allowedHalfZ}] ` +
          `in parent "${parent.name}" (${parent.id})`,
      });
    }
  }

  // Check resource blocks fit within their direct parent container (center-based)
  for (const resource of resources) {
    if (!resource.parentId) continue; // external actors have no container

    const parent = containers.find((c) => c.id === resource.parentId);
    if (!parent?.frame) continue;

    const tier = CATEGORY_TIER_MAP[resource.category] ?? 'medium';
    const dims = TIER_DIMENSIONS[tier];

    // Resource position is center-offset relative to parent center.
    // Allowed range: ±(parentFrame/2 - blockSize/2)
    const allowedHalfX = parent.frame.width / 2 - dims.width / 2;
    const allowedHalfZ = parent.frame.depth / 2 - dims.depth / 2;
    const relX = resource.position.x;
    const relZ = resource.position.z;

    if (
      relX < -allowedHalfX ||
      relX > allowedHalfX ||
      relZ < -allowedHalfZ ||
      relZ > allowedHalfZ
    ) {
      violations.push({
        child: { id: resource.id, name: resource.name },
        ancestor: { id: parent.id, name: parent.name },
        message:
          `Block "${resource.name}" (${resource.id}) center offset ` +
          `(${relX}, ${relZ}) exceeds allowed range ` +
          `[${-allowedHalfX}, ${allowedHalfX}] × [${-allowedHalfZ}, ${allowedHalfZ}] ` +
          `in container "${parent.name}" (${parent.id})`,
      });
    }
  }

  return violations;
}

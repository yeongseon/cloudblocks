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
 * Position convention: top-left corner (consistent with validateNoOverlap in placement.ts).
 * All resource blocks are 2×2×2 CU (medium tier).
 *
 * NOTE: This validator only inspects `architecture.nodes`. External actors
 * are expected to be migrated/mirrored into the nodes array. If that assumption
 * changes, this validator must be extended to also cover `architecture.externalActors`.
 *
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
 * Compute the global (world) position of a resource block by walking
 * up the container hierarchy and summing positions.
 *
 * - parentId === null → global = block.position
 * - parent is container → global = parent.globalPosition + block.position
 * - parent is subnet in VNet → global = VNet.position + subnet.position + block.position
 */
export function computeGlobalPosition(
  resource: ResourceBlock,
  containers: ContainerBlock[],
): Position {
  if (!resource.parentId) {
    return { ...resource.position };
  }

  // Walk up the container hierarchy, summing positions
  let globalX = resource.position.x;
  let globalY = resource.position.y;
  let globalZ = resource.position.z;

  let currentParentId: string | null = resource.parentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      // Cyclic parent chain detected — stop walking to avoid infinite loop
      break;
    }
    visited.add(currentParentId);

    const parent = containers.find((c) => c.id === currentParentId);
    if (!parent) break;

    globalX += parent.position.x;
    globalY += parent.position.y;
    globalZ += parent.position.z;

    currentParentId = parent.parentId;
  }

  return { x: globalX, y: globalY, z: globalZ };
}

/**
 * Check if two axis-aligned bounding boxes overlap on the X-Z plane.
 * Uses strict overlap (not edge-touching): overlap exists when
 * both X and Z ranges have non-zero intersection.
 *
 * Position convention: top-left corner (position.x, position.z is the min corner).
 * Bounding box: [x, x+width] × [z, z+depth]
 *
 * @returns overlap area in CU², or 0 if no overlap
 */
export function computeOverlapArea(a: GlobalBlock, b: GlobalBlock): number {
  const ax1 = a.globalPosition.x;
  const az1 = a.globalPosition.z;
  const ax2 = ax1 + a.width;
  const az2 = az1 + a.depth;

  const bx1 = b.globalPosition.x;
  const bz1 = b.globalPosition.z;
  const bx2 = bx1 + b.width;
  const bz2 = bz1 + b.depth;

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

      // If minGap > 0, expand bounding boxes by minGap/2 on each side
      const effectiveA: GlobalBlock =
        minGap > 0
          ? {
              ...a,
              globalPosition: {
                x: a.globalPosition.x - minGap / 2,
                y: a.globalPosition.y,
                z: a.globalPosition.z - minGap / 2,
              },
              width: a.width + minGap,
              depth: a.depth + minGap,
            }
          : a;
      const effectiveB: GlobalBlock =
        minGap > 0
          ? {
              ...b,
              globalPosition: {
                x: b.globalPosition.x - minGap / 2,
                y: b.globalPosition.y,
                z: b.globalPosition.z - minGap / 2,
              },
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

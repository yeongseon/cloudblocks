/**
 * Auto Layout Orchestrator
 *
 * Coordinates the ELK layout computation and applies results to the architecture store.
 * Uses dynamic import() for elkjs to keep it out of the main bundle.
 */

import type { ELK } from 'elkjs/lib/elk-api';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { withHistory } from '../../entities/store/slices/helpers';
import { architectureToElkGraph, readElkPositions, type LayoutPatchEntry } from './elkAdapter';

/* ── ELK instance cache ──────────────────────────────────────────── */

let elkPromise: Promise<ELK> | null = null;

/**
 * Lazy-load the ELK layout engine.
 * Uses dynamic import() to keep elkjs out of the initial bundle.
 * Caches the instance for subsequent calls.
 */
async function getElkInstance(): Promise<ELK> {
  if (!elkPromise) {
    elkPromise = import('elkjs/lib/elk.bundled')
      .then((mod) => new mod.default())
      .catch((err: unknown) => {
        // Reset so next call retries instead of caching the rejection
        elkPromise = null;
        throw err;
      });
  }
  return elkPromise;
}

/* ── Layout patch application ────────────────────────────────────── */

/**
 * Apply a set of position/frame patches to the architecture model.
 * Returns a new ArchitectureModel with updated node positions.
 */
export function applyLayoutPatch(
  model: ArchitectureModel,
  patches: LayoutPatchEntry[],
): ArchitectureModel {
  const patchMap = new Map(patches.map((p) => [p.id, p]));

  const updatedNodes = model.nodes.map((node) => {
    const patch = patchMap.get(node.id);
    if (!patch) return node;

    const updatedNode = {
      ...node,
      position: { ...patch.position },
    };

    // Update container frame if patch includes it
    if (patch.frame && node.kind === 'container') {
      return {
        ...updatedNode,
        frame: { ...patch.frame },
      };
    }

    return updatedNode;
  });

  return {
    ...model,
    nodes: updatedNodes,
  };
}

/* ── Public API ───────────────────────────────────────────────────── */

/**
 * Run ELK auto-layout on the current architecture and apply the results.
 *
 * Flow:
 * 1. Read current architecture model from store
 * 2. Convert to ELK graph format
 * 3. Run ELK layout computation (async)
 * 4. Extract computed positions, snap to CU grid
 * 5. Apply all position changes as a single undo step
 *
 * @returns true if layout was applied, false if no nodes to layout
 * @throws if ELK layout computation fails
 */
export async function runAutoLayout(): Promise<boolean> {
  const state = useArchitectureStore.getState();
  const architecture = state.workspace.architecture;

  // Nothing to layout if no nodes
  if (architecture.nodes.length === 0) {
    return false;
  }

  // 1. Convert to ELK graph
  const { graph, nodeMap } = architectureToElkGraph(architecture);

  // 2. Run ELK layout
  const elk = await getElkInstance();
  const layoutResult = await elk.layout(graph);

  // 3. Extract positions
  const patches = readElkPositions(layoutResult, nodeMap);

  // Nothing changed
  if (patches.length === 0) {
    return false;
  }

  // 4. Apply as single undo step against latest state to avoid race conditions
  useArchitectureStore.setState((currentState) => {
    const freshArch = currentState.workspace.architecture;
    const newArch = applyLayoutPatch(freshArch, patches);
    return withHistory(currentState, newArch);
  });

  return true;
}

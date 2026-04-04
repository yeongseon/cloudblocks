import { useCallback, useRef } from 'react';
import { TILE_H, TILE_W, TILE_Z } from '../../shared/tokens/designTokens';
import type { ResizeEdge } from '../../shared/utils/isometric';
import { screenDeltaToWorld } from '../../shared/utils/isometric';
import { useArchitectureStore } from '../store/architectureStore';

interface ResizeHandlesProps {
  containerId: string;
  frameWidth: number;
  frameDepth: number;
  frameHeight: number;
  containerLayer: string;
}

/** Minimum sizes per container layer (even CU). */
const MIN_SIZE: Record<string, { width: number; depth: number }> = {
  global: { width: 4, depth: 4 },
  edge: { width: 4, depth: 4 },
  region: { width: 4, depth: 4 },
  zone: { width: 4, depth: 4 },
  subnet: { width: 2, depth: 2 },
};
const MAX_SIZE = { width: 40, depth: 40 };

/** Round to nearest even integer, then clamp within [min, max]. */
function snapEven(value: number, min: number, max: number): number {
  const rounded = Math.round(value / 2) * 2;
  return Math.max(min, Math.min(max, rounded));
}

type HandleDef = {
  edge: ResizeEdge;
  /** Screen X offset relative to container sprite anchor */
  sx: number;
  /** Screen Y offset relative to container sprite anchor */
  sy: number;
};

/**
 * Compute screen positions for the 4 cardinal vertex handles on the diamond top face.
 *
 * Vertex positions in world space (relative to container center at top-face height):
 *   N: (+w/2, h, 0)  → screen: (w*TILE_W/4,  w*TILE_H/4 - h*TILE_Z)
 *   S: (-w/2, h, 0)  → screen: (-w*TILE_W/4, -w*TILE_H/4 - h*TILE_Z)
 *   E: (0, h, +d/2)  → screen: (-d*TILE_W/4,  d*TILE_H/4 - h*TILE_Z)
 *   W: (0, h, -d/2)  → screen: (d*TILE_W/4, -d*TILE_H/4 - h*TILE_Z)
 */
function computeHandles(w: number, h: number, d: number): HandleDef[] {
  const halfTW = TILE_W / 2;
  const halfTH = TILE_H / 2;
  const hOff = h * TILE_Z;

  return [
    { edge: 'n', sx: (w / 2) * halfTW, sy: (w / 2) * halfTH - hOff },
    { edge: 's', sx: (-w / 2) * halfTW, sy: (-w / 2) * halfTH - hOff },
    { edge: 'e', sx: (-d / 2) * halfTW, sy: (d / 2) * halfTH - hOff },
    { edge: 'w', sx: (d / 2) * halfTW, sy: (-d / 2) * halfTH - hOff },
  ];
}

/**
 * Overlay handles for resizing a container via edge dragging.
 *
 * Renders 4 vertex handles (N/E/S/W) on the isometric diamond top face.
 * Uses native pointer events with pointer capture for reliable drag tracking.
 * The "accumulate from start" pattern avoids drift: total screen delta from
 * drag-start is projected to world space and applied against the snapshot.
 */
export function ResizeHandles({
  containerId,
  frameWidth,
  frameDepth,
  frameHeight,
  containerLayer,
}: ResizeHandlesProps) {
  const resizePlate = useArchitectureStore((s) => s.resizePlate);

  // Drag state refs — mutable, no re-renders during drag
  const dragRef = useRef<{
    edge: ResizeEdge;
    startWidth: number;
    startDepth: number;
    startPosX: number;
    startPosZ: number;
    anchorXMin: number; // fixed S edge (for N drag)
    anchorXMax: number; // fixed N edge (for S drag)
    anchorZMin: number; // fixed W edge (for E drag)
    anchorZMax: number; // fixed E edge (for W drag)
    accumDx: number;
    accumDy: number;
    zoom: number;
  } | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  const getZoom = useCallback((): number => {
    const sceneWorld = document.querySelector('.scene-world') as HTMLElement | null;
    if (!sceneWorld) return 1;
    const m = sceneWorld.style.transform.match(/scale\(([\d.]+)\)/);
    return m?.[1] ? Number.parseFloat(m[1]) || 1 : 1;
  }, []);

  const handlePointerDown = useCallback(
    (edge: ResizeEdge, e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.setPointerCapture) target.setPointerCapture(e.pointerId);

      // Snapshot current state
      const state = useArchitectureStore.getState();
      const container = state.workspace.architecture.nodes.find(
        (n) => n.kind === 'container' && n.id === containerId,
      );
      if (!container || container.kind !== 'container' || !container.frame) return;

      const w = container.frame.width;
      const d = container.frame.depth;
      const px = container.position.x;
      const pz = container.position.z;

      dragRef.current = {
        edge,
        startWidth: w,
        startDepth: d,
        startPosX: px,
        startPosZ: pz,
        anchorXMin: px - w / 2, // S edge position
        anchorXMax: px + w / 2, // N edge position
        anchorZMin: pz - d / 2, // W edge position
        anchorZMax: pz + d / 2, // E edge position
        accumDx: 0,
        accumDy: 0,
        zoom: getZoom(),
      };
      // Mark the active handle via DOM class (avoids ref access during render)
      const handleEl = overlayRef.current?.querySelector(`[data-edge="${edge}"]`);
      if (handleEl) handleEl.classList.add('is-resizing');
    },
    [containerId, getZoom],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.stopPropagation();

      // Accumulate total screen delta (zoom-adjusted)
      drag.accumDx += e.movementX / drag.zoom;
      drag.accumDy += e.movementY / drag.zoom;

      const { dWorldX, dWorldZ } = screenDeltaToWorld(drag.accumDx, drag.accumDy);

      const mins = MIN_SIZE[containerLayer] ?? MIN_SIZE.region;

      let newWidth = drag.startWidth;
      let newDepth = drag.startDepth;

      const edgeStr = drag.edge;

      // Width (world X axis) — N and S edges
      if (edgeStr.includes('n')) {
        // Dragging N edge: S edge (anchorXMin) fixed, N moves with +dWorldX
        const rawWidth = drag.startWidth + dWorldX;
        newWidth = snapEven(rawWidth, mins.width, MAX_SIZE.width);
      } else if (edgeStr.includes('s')) {
        // Dragging S edge: N edge (anchorXMax) fixed, S moves with +dWorldX (but shrinks)
        const rawWidth = drag.startWidth - dWorldX;
        newWidth = snapEven(rawWidth, mins.width, MAX_SIZE.width);
      }

      // Depth (world Z axis) — E and W edges
      if (edgeStr.includes('e')) {
        // Dragging E edge: W edge (anchorZMin) fixed, E moves with +dWorldZ
        const rawDepth = drag.startDepth + dWorldZ;
        newDepth = snapEven(rawDepth, mins.depth, MAX_SIZE.depth);
      } else if (edgeStr.includes('w')) {
        // Dragging W edge: E edge (anchorZMax) fixed, W moves with -dWorldZ
        const rawDepth = drag.startDepth - dWorldZ;
        newDepth = snapEven(rawDepth, mins.depth, MAX_SIZE.depth);
      }

      // Map edge to anchor direction for store action
      // When dragging N: anchor is S (opposite), so pass 'n' to tell store "N is moving"
      // The store uses anchorEdge to determine which edge is FIXED:
      //   'n' means N is dragged, so S is anchored → anchorEdge includes 's' in opposite
      // Actually the store expects: anchorEdge?.includes('s') → fix S, shift center toward N
      // So when dragging N, we pass anchorEdge = 's' (the fixed edge)
      let anchorEdge: ResizeEdge;
      if (edgeStr === 'n') anchorEdge = 's';
      else if (edgeStr === 's') anchorEdge = 'n';
      else if (edgeStr === 'e') anchorEdge = 'w';
      else if (edgeStr === 'w') anchorEdge = 'e';
      else if (edgeStr === 'ne') anchorEdge = 'sw';
      else if (edgeStr === 'nw') anchorEdge = 'se';
      else if (edgeStr === 'se') anchorEdge = 'nw';
      else anchorEdge = 'ne'; // sw → ne

      resizePlate(containerId, newWidth, newDepth, anchorEdge);
    },
    [containerId, containerLayer, resizePlate],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.releasePointerCapture) target.releasePointerCapture(e.pointerId);
    // Remove the is-resizing class from the active handle
    const edge = dragRef.current.edge;
    const handleEl = overlayRef.current?.querySelector(`[data-edge="${edge}"]`);
    if (handleEl) handleEl.classList.remove('is-resizing');
    dragRef.current = null;
  }, []);

  const handles = computeHandles(frameWidth, frameHeight, frameDepth);

  return (
    <div ref={overlayRef} className="container-resize-overlay" data-testid="resize-handles">
      {handles.map(({ edge, sx, sy }) => (
        <div
          key={edge}
          className="container-resize-handle"
          data-edge={edge}
          data-testid={`resize-handle-${edge}`}
          style={{
            left: `${sx}px`,
            top: `${sy}px`,
          }}
          onPointerDown={(e) => handlePointerDown(edge, e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      ))}
    </div>
  );
}

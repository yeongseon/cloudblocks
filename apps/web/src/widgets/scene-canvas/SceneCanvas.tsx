import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { canPlaceBlock, ROOT_ALLOWED_RESOURCE_TYPES } from '../../entities/validation/placement';
import { worldToScreen, depthKey } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';

import { ContainerBlockSprite } from '../../entities/container-block/ContainerBlockSprite';
import { BlockSprite } from '../../entities/block/BlockSprite';
import { ConnectionRenderer } from '../../entities/connection/ConnectionRenderer';
import { computeOverlapOffsets } from '../../entities/connection/overlapOffset';
import { DragGhost } from './DragGhost';
import { ConnectionPreview } from './ConnectionPreview';
import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { isExternalResourceType } from '@cloudblocks/schema';
import { OVERLAP_OFFSET_PX } from '../../shared/tokens/connectionVisualTokens';
import { computeOccupiedCellsByContainer } from './utils/placementUtils';
import { createLassoRect, getLassoSelectionIds } from './utils/selectionUtils';
import {
  computeExternalLaneBounds,
  computeFitToContentTransform,
  computeViewportOrigin,
  computeWheelViewportTransform,
} from './utils/viewportUtils';
import './SceneCanvas.css';

export function SceneCanvas() {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const plates = architecture.nodes.filter(
    (node): node is ContainerBlock => node.kind === 'container',
  );
  const blocks = architecture.nodes.filter(
    (node): node is ResourceBlock => node.kind === 'resource',
  );
  // Split blocks: those parented to containers vs root external blocks
  const containerBlocks = blocks.filter((b) => b.parentId !== null);
  const rootExternalBlocks = blocks.filter(
    (b) =>
      b.parentId === null &&
      (Boolean(b.roles?.includes('external')) || isExternalResourceType(b.resourceType)),
  );
  const overlapOffsets = useMemo(
    () => computeOverlapOffsets(architecture.connections, OVERLAP_OFFSET_PX),
    [architecture.connections],
  );
  const occupiedCellsByContainer = useMemo(
    () => computeOccupiedCellsByContainer(architecture.nodes),
    [architecture.nodes],
  );
  const addNode = useArchitectureStore((s) => s.addNode);
  const moveExternalBlockPosition = useArchitectureStore((s) => s.moveExternalBlockPosition);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const setSelectedIds = useUIStore((s) => s.setSelectedIds);
  const interactionState = useUIStore((s) => s.interactionState);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const draggedResourceName = useUIStore((s) => s.draggedResourceName);
  const draggedResourceType = useUIStore((s) => s.draggedResourceType);
  const draggedSubtype = useUIStore((s) => s.draggedSubtype);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const setCanvasZoom = useUIStore((s) => s.setCanvasZoom);
  const fitToContentRequested = useUIStore((s) => s.fitToContentRequested);
  const clearFitToContentRequest = useUIStore((s) => s.clearFitToContentRequest);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const gridStyle = useUIStore((s) => s.gridStyle);
  const playSound = (name: SoundName) => {
    if (!isSoundMuted) audioService.playSound(name);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const containerById = useMemo(
    () => new Map(plates.map((container) => [container.id, container])),
    [plates],
  );
  const sortedPlates = useMemo(
    () =>
      [...plates].sort((a, b) => {
        const levelA = a.parentId ? 1 : 0;
        const levelB = b.parentId ? 1 : 0;
        if (levelA !== levelB) return levelA - levelB;
        const depthA = depthKey(a.position.x, a.position.z, a.position.y, 0);
        const depthB = depthKey(b.position.x, b.position.z, b.position.y, 0);
        return depthA - depthB;
      }),
    [plates],
  );

  const externalLaneBounds = useMemo(() => {
    return computeExternalLaneBounds(
      architecture.nodes.filter(
        (node): node is ResourceBlock =>
          node.kind === 'resource' &&
          node.parentId === null &&
          (Boolean(node.roles?.includes('external')) || isExternalResourceType(node.resourceType)),
      ),
      origin,
    );
  }, [architecture.nodes, origin]);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Lasso / marquee selection state
  const lassoStartRef = useRef<{ x: number; y: number } | null>(null);
  const [lassoRect, setLassoRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateOriginFromRect = (width: number, height: number) => {
      setOrigin(computeViewportOrigin(width, height));
    };

    const rect = el.getBoundingClientRect();
    updateOriginFromRect(rect.width, rect.height);

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          updateOriginFromRect(width, height);
        }
      });
      resizeObserver.observe(el);
    } else if (typeof window !== 'undefined') {
      // Fallback for environments without ResizeObserver
      const handleWindowResize = () => {
        const r = el.getBoundingClientRect();
        updateOriginFromRect(r.width, r.height);
      };
      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      lastMouse.current = { x: e.clientX, y: e.clientY };

      // Shift+drag on empty canvas starts lasso selection
      if (e.shiftKey && interactionState !== 'placing' && interactionState !== 'connecting') {
        lassoStartRef.current = { x: e.clientX, y: e.clientY };
        isDragging.current = false;
        return;
      }

      // Normal drag = pan + clear selection
      isDragging.current = true;
      clearSelection();
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Lasso mode: track rectangle in viewport coordinates
    if (lassoStartRef.current) {
      const startX = lassoStartRef.current.x;
      const startY = lassoStartRef.current.y;
      const curX = e.clientX;
      const curY = e.clientY;

      // Only activate lasso after passing threshold (prevents accidental lasso on shift-click)
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const nextLassoRect = createLassoRect(
          { x: startX, y: startY },
          { x: curX, y: curY },
          { left: rect.left, top: rect.top },
          pan,
          zoom,
        );

        if (nextLassoRect) {
          setLassoRect(nextLassoRect);
        }
      }
      return;
    }

    // Normal pan mode
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Handle lasso completion
    if (lassoStartRef.current) {
      if (lassoRect) {
        const hitIds = getLassoSelectionIds(architecture.nodes, containerById, origin, lassoRect);

        if (hitIds.length > 0) {
          setSelectedIds(hitIds);
        } else {
          clearSelection();
        }
      } else {
        // Shift-click on empty canvas without drag = just clear
        clearSelection();
      }

      lassoStartRef.current = null;
      setLassoRect(null);

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    isDragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    // Cancel in-progress connection when releasing on empty canvas
    if (interactionState === 'connecting') {
      completeInteraction();
      return;
    }

    if (interactionState === 'placing' && draggedBlockCategory && draggedResourceName) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const plateEl = elements.find((el) => el.closest('[data-container-id]'));
      const plateContainer = plateEl?.closest('[data-container-id]');
      const plateId = plateContainer?.getAttribute('data-container-id');

      if (plateId) {
        const container = containerById.get(plateId);
        if (
          container &&
          canPlaceBlock(draggedBlockCategory, container, draggedResourceType ?? undefined)
        ) {
          addNode({
            kind: 'resource',
            resourceType: draggedResourceType ?? draggedBlockCategory,
            name: draggedResourceName,
            parentId: plateId,
            provider: activeProvider,
            subtype: draggedSubtype ?? undefined,
          });
          playSound('block-snap');
        }
      } else {
        // Canvas-level drop: allow root placement for resource types with allowedParents: [null]
        const effectiveResourceType = draggedResourceType ?? draggedBlockCategory;
        if (ROOT_ALLOWED_RESOURCE_TYPES.has(effectiveResourceType)) {
          addNode({
            kind: 'resource',
            resourceType: effectiveResourceType,
            name: draggedResourceName,
            parentId: null,
            provider: activeProvider,
            subtype: draggedSubtype ?? undefined,
          });
          playSound('block-snap');
        }
      }
      completeInteraction();
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      let nextTransform: ReturnType<typeof computeWheelViewportTransform> | null = null;

      setPan((prevPan) => {
        const transform = computeWheelViewportTransform(
          prevPan,
          prevZoom,
          mouseX,
          mouseY,
          e.deltaY,
        );
        nextTransform = transform;
        return transform.pan;
      });

      return nextTransform?.zoom ?? prevZoom;
    });
  }, []);

  useEffect(() => {
    setCanvasZoom(zoom);
  }, [setCanvasZoom, zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (!fitToContentRequested || !containerRef.current) {
      return;
    }

    // Wait for origin to be initialized by ResizeObserver (non-zero means it's set)
    if (origin.x === 0 && origin.y === 0) {
      return;
    }

    if (architecture.nodes.length === 0) {
      clearFitToContentRequest();
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const nextTransform = computeFitToContentTransform(
      architecture.nodes,
      containerById,
      { width: rect.width, height: rect.height },
      origin,
    );

    if (!nextTransform) {
      clearFitToContentRequest();
      return;
    }

    setPan(nextTransform.pan);
    setZoom(nextTransform.zoom);
    clearFitToContentRequest();
  }, [architecture.nodes, clearFitToContentRequest, containerById, fitToContentRequested, origin]);

  return (
    <div
      className={`scene-viewport grid-${gridStyle}`}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="scene-world"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        }}
      >
        <div className="container-layer">
          {sortedPlates.map((container) => {
            const screenPos = worldToScreen(
              container.position.x,
              container.position.y,
              container.position.z,
              origin.x,
              origin.y,
            );
            const hierarchyBonus = container.parentId ? 500_000 : 0;
            const zIndex =
              depthKey(container.position.x, container.position.z, container.position.y, 0) +
              hierarchyBonus;
            return (
              <ContainerBlockSprite
                key={container.id}
                container={container}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
                occupiedCells={occupiedCellsByContainer.get(container.id)}
              />
            );
          })}
        </div>

        <svg className="connection-layer" style={{ width: 1, height: 1 }}>
          <title>Connections</title>
          {architecture.connections.map((conn) => (
            <ConnectionRenderer
              key={conn.id}
              connection={conn}
              blocks={blocks}
              plates={plates}
              originX={origin.x}
              originY={origin.y}
              overlapOffset={overlapOffsets.get(conn.id) ?? 0}
            />
          ))}
        </svg>

        <svg className="interaction-overlay" style={{ width: 1, height: 1 }}>
          <title>Interaction Overlay</title>
          <ConnectionPreview originX={origin.x} originY={origin.y} />
          <g className="drag-ghost-layer">
            <DragGhost
              containerRef={containerRef}
              originX={origin.x}
              originY={origin.y}
              panX={pan.x}
              panY={pan.y}
              zoom={zoom}
            />
          </g>
        </svg>

        {lassoRect && (
          <div
            className="lasso-rect"
            style={{
              left: lassoRect.x,
              top: lassoRect.y,
              width: lassoRect.width,
              height: lassoRect.height,
            }}
            data-testid="lasso-rect"
          />
        )}

        {externalLaneBounds && (
          <div
            className="external-lane-zone"
            style={{
              left: externalLaneBounds.x,
              top: externalLaneBounds.y,
              width: externalLaneBounds.width,
              height: externalLaneBounds.height,
            }}
            data-testid="external-lane-zone"
          >
            <span className="external-lane-label">External</span>
          </div>
        )}

        <div className="block-layer">
          {containerBlocks.map((block) => {
            const parentContainer = block.parentId ? containerById.get(block.parentId) : undefined;
            if (!parentContainer?.frame) return null;
            const worldX = parentContainer.position.x + block.position.x;
            const worldY = parentContainer.position.y + parentContainer.frame.height;
            const worldZ = parentContainer.position.z + block.position.z;
            const screenPos = worldToScreen(worldX, worldY, worldZ, origin.x, origin.y);
            const zIndex = depthKey(worldX, worldZ, worldY, 2);
            return (
              <BlockSprite
                key={block.id}
                block={block}
                parentContainer={parentContainer}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
              />
            );
          })}
          {rootExternalBlocks.map((block) => {
            const screenPos = worldToScreen(
              block.position.x,
              block.position.y,
              block.position.z,
              origin.x,
              origin.y,
            );
            const zIndex = depthKey(block.position.x, block.position.z, block.position.y, 2);
            return (
              <BlockSprite
                key={block.id}
                block={block}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
                onMove={moveExternalBlockPosition}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

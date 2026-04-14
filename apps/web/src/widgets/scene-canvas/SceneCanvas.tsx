import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { canPlaceBlock, ROOT_ALLOWED_RESOURCE_TYPES } from '../../entities/validation/placement';
import { worldToScreen, depthKey } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';

import { ContainerBlockSprite } from '../../entities/container-block/ContainerBlockSprite';
import { BlockSprite } from '../../entities/block/BlockSprite';
import { computeOverlapOffsets } from '../../entities/connection/overlapOffset';
import { ConnectionAnimationLayer } from './ConnectionAnimationLayer';
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
import { ZoomControls } from './ZoomControls';
import { MiniMap } from './MiniMap';
import './SceneCanvas.css';
import { useAnimationClock } from '../../shared/hooks/useAnimationClock';

const EMPTY_OCCUPIED_CELLS = new Set<string>();

export function SceneCanvas() {
  const { architecture, nodeById, addNode, moveExternalBlockPosition } = useArchitectureStore(
    useShallow((state) => ({
      architecture: state.workspace.architecture,
      nodeById: state.nodeById,
      addNode: state.addNode,
      moveExternalBlockPosition: state.moveExternalBlockPosition,
    })),
  );
  const nodes = architecture.nodes;
  const connections = architecture.connections;
  const indexedNodeById = useMemo(
    () => nodeById ?? new Map(nodes.map((node) => [node.id, node])),
    [nodeById, nodes],
  );
  const containerIds = useMemo(
    () =>
      nodes
        .filter((node): node is ContainerBlock => node.kind === 'container')
        .map((container) => container.id),
    [nodes],
  );
  const containerById = useMemo(
    () =>
      new Map(
        containerIds
          .map((containerId) => indexedNodeById.get(containerId))
          .filter((node): node is ContainerBlock => node?.kind === 'container')
          .map((container) => [container.id, container]),
      ),
    [containerIds, indexedNodeById],
  );
  const blockIds = useMemo(
    () =>
      nodes
        .filter((node): node is ResourceBlock => node.kind === 'resource')
        .map((block) => block.id),
    [nodes],
  );
  const containerBlockIds = useMemo(
    () =>
      blockIds.filter((blockId) => {
        const block = indexedNodeById.get(blockId);
        return block?.kind === 'resource' && block.parentId !== null;
      }),
    [blockIds, indexedNodeById],
  );
  const rootExternalBlockIds = useMemo(
    () =>
      blockIds.filter((blockId) => {
        const block = indexedNodeById.get(blockId);
        return (
          block?.kind === 'resource' &&
          block.parentId === null &&
          (Boolean(block.roles?.includes('external')) || isExternalResourceType(block.resourceType))
        );
      }),
    [blockIds, indexedNodeById],
  );
  const overlapOffsets = useMemo(
    () => computeOverlapOffsets(connections, OVERLAP_OFFSET_PX),
    [connections],
  );
  const occupiedCellsByContainer = useMemo(
    () => computeOccupiedCellsByContainer(architecture.nodes),
    [architecture],
  );
  const {
    selectedIds,
    clearSelection,
    setSelectedIds,
    interactionState,
    draggedBlockCategory,
    draggedResourceName,
    draggedResourceType,
    draggedSubtype,
    activeProvider,
    completeInteraction,
    setCanvasZoom,
    fitToContentRequested,
    clearFitToContentRequest,
    isSoundMuted,
    gridStyle,
    flowFocusMode,
    showMiniMap,
  } = useUIStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      clearSelection: state.clearSelection,
      setSelectedIds: state.setSelectedIds,
      interactionState: state.interactionState,
      draggedBlockCategory: state.draggedBlockCategory,
      draggedResourceName: state.draggedResourceName,
      draggedResourceType: state.draggedResourceType,
      draggedSubtype: state.draggedSubtype,
      activeProvider: state.activeProvider,
      completeInteraction: state.completeInteraction,
      setCanvasZoom: state.setCanvasZoom,
      fitToContentRequested: state.fitToContentRequested,
      clearFitToContentRequest: state.clearFitToContentRequest,
      isSoundMuted: state.isSoundMuted,
      gridStyle: state.gridStyle,
      flowFocusMode: state.flowFocusMode,
      showMiniMap: state.showMiniMap,
    })),
  );
  const selectedConnectionIds = useMemo(() => {
    const connectionIds = new Set(connections.map((connection) => connection.id));
    return new Set([...selectedIds].filter((id) => connectionIds.has(id)));
  }, [connections, selectedIds]);
  const selectedConnections = useMemo(
    () => connections.filter((connection) => selectedConnectionIds.has(connection.id)),
    [connections, selectedConnectionIds],
  );
  const hasAnyConnection = connections.length > 0;
  const { elapsed: animElapsed, reducedMotion: animReducedMotion } =
    useAnimationClock(hasAnyConnection);
  const playSound = (name: SoundName) => {
    if (!isSoundMuted) audioService.playSound(name);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3.0, prev * 1.1));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.3, prev / 1.1));
  }, []);
  const requestFitToContent = useUIStore((s) => s.requestFitToContent);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const sortedContainerIds = useMemo(
    () =>
      [...containerIds].sort((a, b) => {
        const containerA = containerById.get(a);
        const containerB = containerById.get(b);
        if (!containerA || !containerB) return 0;
        const levelA = containerA.parentId ? 1 : 0;
        const levelB = containerB.parentId ? 1 : 0;
        if (levelA !== levelB) return levelA - levelB;
        const depthA = depthKey(
          containerA.position.x,
          containerA.position.z,
          containerA.position.y,
          0,
        );
        const depthB = depthKey(
          containerB.position.x,
          containerB.position.z,
          containerB.position.y,
          0,
        );
        return depthA - depthB;
      }),
    [containerById, containerIds],
  );

  const externalLaneBounds = useMemo(() => {
    const externalBlocks = rootExternalBlockIds
      .map((blockId) => indexedNodeById.get(blockId))
      .filter((node): node is ResourceBlock => node?.kind === 'resource');
    return computeExternalLaneBounds(externalBlocks, origin);
  }, [indexedNodeById, origin, rootExternalBlockIds]);

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
      setContainerSize({ width, height });
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
        const hitIds = getLassoSelectionIds(nodes, containerById, origin, lassoRect);

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
    // Only zoom when Ctrl/Meta is held (standard desktop convention).
    // Trackpad pinch gestures are reported as ctrlKey by browsers, so
    // pinch-to-zoom continues to work transparently.
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      let nextZoom = prevZoom;

      setPan((prevPan) => {
        const transform = computeWheelViewportTransform(
          prevPan,
          prevZoom,
          mouseX,
          mouseY,
          e.deltaY,
        );
        nextZoom = transform.zoom;
        return transform.pan;
      });

      return nextZoom;
    });
  }, []);

  const handleMiniMapCenter = useCallback((panX: number, panY: number) => {
    setPan({ x: panX, y: panY });
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

  // ── Keyboard zoom events (from BuilderView shortcuts) ──
  useEffect(() => {
    const handleZoomInEvt = () => zoomIn();
    const handleZoomOutEvt = () => zoomOut();
    window.addEventListener('cloudblocks:zoom-in', handleZoomInEvt);
    window.addEventListener('cloudblocks:zoom-out', handleZoomOutEvt);
    return () => {
      window.removeEventListener('cloudblocks:zoom-in', handleZoomInEvt);
      window.removeEventListener('cloudblocks:zoom-out', handleZoomOutEvt);
    };
  }, [zoomIn, zoomOut]);

  // ── Pinch-to-zoom (touch devices) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastDistance = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (lastDistance > 0) {
          const scale = distance / lastDistance;
          setZoom((prev) => Math.max(0.3, Math.min(3.0, prev * scale)));
        }
        lastDistance = distance;
      }
    };

    const handleTouchEnd = () => {
      lastDistance = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (!fitToContentRequested || !containerRef.current) {
      return;
    }

    // Wait for origin to be initialized by ResizeObserver (non-zero means it's set)
    if (origin.x === 0 && origin.y === 0) {
      return;
    }

    if (nodes.length === 0) {
      clearFitToContentRequest();
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const nextTransform = computeFitToContentTransform(
      nodes,
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
  }, [clearFitToContentRequest, containerById, fitToContentRequested, nodes, origin]);

  return (
    <div
      id="architecture-canvas"
      role="application"
      aria-roledescription="visual architecture canvas"
      aria-label="Architecture canvas"
      className={`scene-viewport grid-${gridStyle}`}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={`scene-world${flowFocusMode ? ' flow-focus-active' : ''}`}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        }}
      >
        <div className="container-layer">
          {sortedContainerIds.map((containerId) => {
            const container = containerById.get(containerId);
            if (!container) return null;
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
                containerId={container.id}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
                occupiedCells={occupiedCellsByContainer.get(container.id) ?? EMPTY_OCCUPIED_CELLS}
              />
            );
          })}
        </div>

        <ConnectionAnimationLayer
          connections={connections}
          originX={origin.x}
          originY={origin.y}
          overlapOffsets={overlapOffsets}
          elapsed={animElapsed}
          reducedMotion={animReducedMotion}
          selectedConnectionIds={selectedConnectionIds}
        />

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
          {containerBlockIds.map((blockId) => {
            const block = indexedNodeById.get(blockId);
            if (block?.kind !== 'resource') return null;
            const parentContainer = block.parentId ? containerById.get(block.parentId) : null;
            if (!parentContainer?.frame) return null;
            const worldX = parentContainer.position.x + block.position.x;
            const worldY = parentContainer.position.y + parentContainer.frame.height;
            const worldZ = parentContainer.position.z + block.position.z;
            const screenPos = worldToScreen(worldX, worldY, worldZ, origin.x, origin.y);
            const zIndex = depthKey(worldX, worldZ, worldY, 2);
            return (
              <BlockSprite
                key={block.id}
                blockId={block.id}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
              />
            );
          })}
          {rootExternalBlockIds.map((blockId) => {
            const block = indexedNodeById.get(blockId);
            if (block?.kind !== 'resource') return null;
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
                blockId={block.id}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
                onMove={moveExternalBlockPosition}
              />
            );
          })}
        </div>

        {selectedConnections.length > 0 && (
          <ConnectionAnimationLayer
            connections={selectedConnections}
            originX={origin.x}
            originY={origin.y}
            overlapOffsets={overlapOffsets}
            elapsed={animElapsed}
            reducedMotion={animReducedMotion}
            className="selected-connection-layer"
            pointerEvents="none"
            overlayMode="visual-only"
          />
        )}

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
      </div>

      <ZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToContent={requestFitToContent}
      />
      {showMiniMap && (
        <MiniMap
          pan={pan}
          zoom={zoom}
          origin={origin}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          onRequestCenter={handleMiniMapCenter}
        />
      )}
      {/* Live regions for screen reader announcements */}
      <div aria-live="polite" role="status" className="sr-only" data-testid="a11y-status" />
      <div aria-live="assertive" role="alert" className="sr-only" data-testid="a11y-alert" />
    </div>
  );
}

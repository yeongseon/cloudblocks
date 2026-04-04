import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { canPlaceBlock, ROOT_ALLOWED_RESOURCE_TYPES } from '../../entities/validation/placement';
import { worldToScreen, worldSizeToScreen, depthKey } from '../../shared/utils/isometric';
import { getBlockDimensions } from '../../shared/types/visualProfile';
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
  const occupiedCellsByContainer = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of architecture.nodes) {
      if (node.kind !== 'resource' || node.parentId === null) {
        continue;
      }
      const block = node;
      const parentId = block.parentId;
      if (parentId === null) {
        continue;
      }
      const dims = getBlockDimensions(block.category, block.provider, block.subtype);
      const set = map.get(parentId) ?? new Set<string>();
      for (let dx = 0; dx < dims.width; dx++) {
        for (let dz = 0; dz < dims.depth; dz++) {
          set.add(`${block.position.x + dx}:${block.position.z + dz}`);
        }
      }
      map.set(parentId, set);
    }
    return map;
  }, [architecture.nodes]);
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

  const externalLaneBounds = useMemo(() => {
    const externalBlocks = architecture.nodes.filter(
      (node): node is ResourceBlock =>
        node.kind === 'resource' &&
        node.parentId === null &&
        (Boolean(node.roles?.includes('external')) || isExternalResourceType(node.resourceType)),
    );
    if (externalBlocks.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const block of externalBlocks) {
      const sp = worldToScreen(
        block.position.x,
        block.position.y,
        block.position.z,
        origin.x,
        origin.y,
      );
      minX = Math.min(minX, sp.x);
      minY = Math.min(minY, sp.y);
      maxX = Math.max(maxX, sp.x);
      maxY = Math.max(maxY, sp.y);
    }

    const PAD_X = 48;
    const PAD_Y = 36;
    const BLOCK_W = 72;
    const BLOCK_H = 96;

    return {
      left: minX - PAD_X,
      top: minY - PAD_Y,
      width: maxX - minX + BLOCK_W + PAD_X * 2,
      height: maxY - minY + BLOCK_H + PAD_Y * 2,
    };
  }, [architecture.nodes, origin.x, origin.y]);

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
  const LASSO_THRESHOLD = 5; // min drag distance before lasso activates

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateOriginFromRect = (width: number, height: number) => {
      setOrigin({ x: width / 2, y: height * 0.4 });
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
      const dx = curX - startX;
      const dy = curY - startY;

      // Only activate lasso after passing threshold (prevents accidental lasso on shift-click)
      if (Math.abs(dx) >= LASSO_THRESHOLD || Math.abs(dy) >= LASSO_THRESHOLD) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          // Convert viewport coords to scene-world coords (account for pan & zoom)
          const toWorld = (vx: number, vy: number) => ({
            x: (vx - rect.left - pan.x) / zoom,
            y: (vy - rect.top - pan.y) / zoom,
          });
          const wStart = toWorld(startX, startY);
          const wCur = toWorld(curX, curY);
          setLassoRect({
            x: Math.min(wStart.x, wCur.x),
            y: Math.min(wStart.y, wCur.y),
            width: Math.abs(wCur.x - wStart.x),
            height: Math.abs(wCur.y - wStart.y),
          });
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
        // Find blocks/containers whose screen positions fall inside the lasso rect
        const hitIds: string[] = [];
        const allNodes = architecture.nodes;

        for (const node of allNodes) {
          let sx: number;
          let sy: number;

          if (node.kind === 'resource' && node.parentId !== null) {
            const parentContainer = plates.find((p) => p.id === node.parentId);
            if (!parentContainer?.frame) continue;
            const worldX = parentContainer.position.x + node.position.x;
            const worldY = parentContainer.position.y + parentContainer.frame.height;
            const worldZ = parentContainer.position.z + node.position.z;
            const sp = worldToScreen(worldX, worldY, worldZ, origin.x, origin.y);
            sx = sp.x;
            sy = sp.y;
          } else {
            const sp = worldToScreen(
              node.position.x,
              node.position.y,
              node.position.z,
              origin.x,
              origin.y,
            );
            sx = sp.x;
            sy = sp.y;
          }

          if (
            sx >= lassoRect.x &&
            sx <= lassoRect.x + lassoRect.width &&
            sy >= lassoRect.y &&
            sy <= lassoRect.y + lassoRect.height
          ) {
            hitIds.push(node.id);
          }
        }

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
        const container = plates.find((p) => p.id === plateId);
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

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.3, Math.min(3.0, prevZoom * zoomDelta));
      const scaleChange = newZoom / prevZoom;

      setPan((p) => ({
        x: mouseX - (mouseX - p.x) * scaleChange,
        y: mouseY - (mouseY - p.y) * scaleChange,
      }));

      return newZoom;
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

    const allNodes = architecture.nodes;
    if (allNodes.length === 0) {
      clearFitToContentRequest();
      return;
    }

    const parentContainers = new Map(
      allNodes
        .filter((node): node is ContainerBlock => node.kind === 'container')
        .map((node) => [node.id, node]),
    );

    let minSX = Infinity;
    let maxSX = -Infinity;
    let minSY = Infinity;
    let maxSY = -Infinity;

    for (const node of allNodes) {
      if (node.kind === 'container') {
        const sp = worldToScreen(node.position.x, node.position.y, node.position.z, 0, 0);

        if (node.frame) {
          const { screenWidth, screenHeight } = worldSizeToScreen(
            node.frame.width,
            node.frame.height,
            node.frame.depth,
          );
          minSX = Math.min(minSX, sp.x - screenWidth / 2);
          maxSX = Math.max(maxSX, sp.x + screenWidth / 2);
          // Isometric diamond half-height = screenWidth/4 (since TILE_H/TILE_W = 0.5)
          // Top = back of diamond minus elevation walls; bottom = front of diamond
          const diamondHalfH = screenWidth / 4;
          minSY = Math.min(minSY, sp.y - diamondHalfH - (screenHeight - 2 * diamondHalfH));
          maxSY = Math.max(maxSY, sp.y + diamondHalfH);
        } else {
          minSX = Math.min(minSX, sp.x);
          maxSX = Math.max(maxSX, sp.x);
          minSY = Math.min(minSY, sp.y);
          maxSY = Math.max(maxSY, sp.y);
        }
        continue;
      }

      let worldX = node.position.x;
      let worldY = node.position.y;
      let worldZ = node.position.z;

      if (node.parentId) {
        const parent = parentContainers.get(node.parentId);
        if (parent) {
          worldX = parent.position.x + node.position.x;
          worldY = parent.position.y + (parent.frame?.height ?? 0);
          worldZ = parent.position.z + node.position.z;
        }
      }

      const sp = worldToScreen(worldX, worldY, worldZ, 0, 0);
      const BLOCK_HALF_W = 36;
      const BLOCK_H = 96;
      minSX = Math.min(minSX, sp.x - BLOCK_HALF_W);
      maxSX = Math.max(maxSX, sp.x + BLOCK_HALF_W);
      minSY = Math.min(minSY, sp.y - BLOCK_H);
      maxSY = Math.max(maxSY, sp.y);
    }

    if (!isFinite(minSX) || !isFinite(minSY) || !isFinite(maxSX) || !isFinite(maxSY)) {
      clearFitToContentRequest();
      return;
    }

    const contentWidth = Math.max(1, maxSX - minSX);
    const contentHeight = Math.max(1, maxSY - minSY);
    const contentCenterX = (minSX + maxSX) / 2;
    const contentCenterY = (minSY + maxSY) / 2;

    const rect = containerRef.current.getBoundingClientRect();
    const viewportW = rect.width;
    const viewportH = rect.height;
    const PADDING = 80;
    const fitWidth = Math.max(1, viewportW - PADDING * 2);
    const fitHeight = Math.max(1, viewportH - PADDING * 2);

    const zoomX = fitWidth / contentWidth;
    const zoomY = fitHeight / contentHeight;
    const newZoom = Math.max(0.3, Math.min(1.2, Math.min(zoomX, zoomY)));

    const newPanX = viewportW / 2 - (origin.x + contentCenterX) * newZoom;
    const newPanY = viewportH / 2 - (origin.y + contentCenterY) * newZoom;

    setPan({ x: newPanX, y: newPanY });
    setZoom(newZoom);
    clearFitToContentRequest();
  }, [architecture.nodes, clearFitToContentRequest, fitToContentRequested, origin.x, origin.y]);

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
          {[...plates]
            .sort((a, b) => {
              const levelA = a.parentId ? 1 : 0;
              const levelB = b.parentId ? 1 : 0;
              if (levelA !== levelB) return levelA - levelB;
              const depthA = depthKey(a.position.x, a.position.z, a.position.y, 0);
              const depthB = depthKey(b.position.x, b.position.z, b.position.y, 0);
              return depthA - depthB;
            })
            .map((container) => {
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
              left: externalLaneBounds.left,
              top: externalLaneBounds.top,
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
            const parentContainer = plates.find((p) => p.id === block.parentId);
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

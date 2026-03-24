import { useState, useRef, useEffect, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { canPlaceBlock } from '../../entities/validation/placement';
import { worldToScreen, depthKey } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';

import { ContainerBlockSprite } from '../../entities/container-block/ContainerBlockSprite';
import { BlockSprite } from '../../entities/block/BlockSprite';
import { ConnectionRenderer } from '../../entities/connection/ConnectionRenderer';
import { ExternalActorSprite } from '../../entities/connection/ExternalActorSprite';
import { DragGhost } from './DragGhost';
import { ConnectionPreview } from './ConnectionPreview';
import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import './SceneCanvas.css';

export function SceneCanvas() {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const plates = architecture.nodes.filter(
    (node): node is ContainerBlock => node.kind === 'container',
  );
  const blocks = architecture.nodes.filter(
    (node): node is ResourceBlock => node.kind === 'resource',
  );
  const externalActors = architecture.externalActors ?? [];
  const addNode = useArchitectureStore((s) => s.addNode);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const interactionState = useUIStore((s) => s.interactionState);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const draggedResourceName = useUIStore((s) => s.draggedResourceName);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const showGrid = useUIStore((s) => s.showGrid);
  const playSound = (name: SoundName) => {
    if (!isSoundMuted) audioService.playSound(name);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

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
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedId(null);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
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
        if (container && canPlaceBlock(draggedBlockCategory, container)) {
          addNode({
            kind: 'resource',
            resourceType: draggedBlockCategory,
            name: draggedResourceName,
            parentId: plateId,
            provider: activeProvider,
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
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  return (
    <div
      className={showGrid ? 'scene-viewport' : 'scene-viewport no-grid'}
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
              externalActors={externalActors}
              originX={origin.x}
              originY={origin.y}
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

        <div className="actor-layer">
          {externalActors.map((actor) => {
            const { x, y, z } = actor.position;
            const screenPos = worldToScreen(x, y, z, origin.x, origin.y);
            const zIndex = depthKey(x, z, y, 1);
            return (
              <ExternalActorSprite
                key={actor.id}
                actor={actor}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
              />
            );
          })}
        </div>

        <div className="block-layer">
          {blocks.map((block) => {
            const parentPlate = plates.find((p) => p.id === block.parentId);
            if (!parentPlate) return null;
            const worldX = parentPlate.position.x + block.position.x;
            const worldY = parentPlate.position.y + parentPlate.frame.height;
            const worldZ = parentPlate.position.z + block.position.z;
            const screenPos = worldToScreen(worldX, worldY, worldZ, origin.x, origin.y);
            const zIndex = depthKey(worldX, worldZ, worldY, 2);
            return (
              <BlockSprite
                key={block.id}
                block={block}
                parentPlate={parentPlate}
                screenX={screenPos.x}
                screenY={screenPos.y}
                zIndex={zIndex}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

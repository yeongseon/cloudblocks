import { useState, useRef, useEffect, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { worldToScreen, depthKey } from '../../shared/utils/isometric';
import { EXTERNAL_ACTOR_POSITION } from '../../shared/utils/position';

import { PlateSprite } from '../../entities/plate/PlateSprite';
import { BlockSprite } from '../../entities/block/BlockSprite';
import { ConnectionPath } from '../../entities/connection/ConnectionPath';
import { ExternalActorSprite } from '../../entities/connection/ExternalActorSprite';
import './SceneCanvas.css';

export function SceneCanvas() {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOrigin({ x: rect.width / 2, y: rect.height * 0.4 });
      setPan({ x: 0, y: 0 });
    }
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
    e.currentTarget.releasePointerCapture(e.pointerId);
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
      className="scene-viewport" 
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
        <div className="plate-layer">
          {[...architecture.plates]
            .sort((a, b) => {
              const levelA = a.parentId ? 1 : 0;
              const levelB = b.parentId ? 1 : 0;
              if (levelA !== levelB) return levelA - levelB;
              const depthA = depthKey(a.position.x, a.position.z, a.position.y, 0);
              const depthB = depthKey(b.position.x, b.position.z, b.position.y, 0);
              return depthA - depthB;
            })
            .map((plate) => {
              const screenPos = worldToScreen(plate.position.x, plate.position.y, plate.position.z, origin.x, origin.y);
              const hierarchyBonus = plate.parentId ? 500_000 : 0;
              const zIndex = depthKey(plate.position.x, plate.position.z, plate.position.y, 0) + hierarchyBonus;
              return (
                <PlateSprite 
                  key={plate.id} 
                  plate={plate} 
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
            <ConnectionPath
              key={conn.id}
              connection={conn}
              blocks={architecture.blocks}
              plates={architecture.plates}
              externalActors={architecture.externalActors}
              originX={origin.x}
              originY={origin.y}
            />
          ))}
        </svg>

        <div className="actor-layer">
          {architecture.externalActors.map((actor) => {
            const [x, y, z] = EXTERNAL_ACTOR_POSITION;
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
          {architecture.blocks.map((block) => {
            const parentPlate = architecture.plates.find((p) => p.id === block.placementId);
            if (!parentPlate) return null;
            const worldX = parentPlate.position.x + block.position.x;
            const worldY = parentPlate.position.y + parentPlate.size.height;
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

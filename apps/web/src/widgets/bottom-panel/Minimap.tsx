/**
 * Minimap Panel — Architecture Overview
 *
 * Shows bird's-eye view of the entire architecture with:
 * - Resources as colored dots
 * - Connections as thin lines
 * - Viewport indicator (dashed rectangle)
 * - Click-to-navigate functionality
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.2
 */

import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { PLATE_COLORS } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import type { ContainerNode, LeafNode } from '@cloudblocks/schema';
import './Minimap.css';

interface MinimapProps {
  className?: string;
}

export function Minimap({ className = '' }: MinimapProps) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  // Calculate bounds and scale
  const viewData = useMemo(() => {
    const plates = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
    const blocks = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');
    const { connections } = architecture;

    if (plates.length === 0) {
      return { plates: [], blocks: [], connections: [], scale: 1, offsetX: 0, offsetY: 0 };
    }

    // Find bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const plate of plates) {
      minX = Math.min(minX, plate.position.x);
      minY = Math.min(minY, plate.position.z);
      maxX = Math.max(maxX, plate.position.x + plate.size.width);
      maxY = Math.max(maxY, plate.position.z + plate.size.depth);
    }

    // Add padding
    const padding = 2;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Scale to fit minimap (160px × 120px inner area)
    const mapWidth = 160;
    const mapHeight = 120;
    const scale = Math.min(mapWidth / width, mapHeight / height);

    const offsetX = (mapWidth - width * scale) / 2 - minX * scale;
    const offsetY = (mapHeight - height * scale) / 2 - minY * scale;

    // Transform plates
    const transformedPlates = plates.map((plate) => ({
      layer: plate.layer === 'resource' ? 'region' : plate.layer,
      id: plate.id,
      x: plate.position.x * scale + offsetX,
      y: plate.position.z * scale + offsetY,
      width: plate.size.width * scale,
      height: plate.size.depth * scale,
      color: PLATE_COLORS[(plate.layer === 'resource' ? 'region' : plate.layer)],
      isNetwork: plate.layer !== 'subnet',
    }));

    // Transform blocks
    const transformedBlocks = blocks.map((block) => {
      const parentPlate = plates.find((p) => p.id === block.parentId);
      const baseX = parentPlate ? parentPlate.position.x : 0;
      const baseY = parentPlate ? parentPlate.position.z : 0;

      return {
        id: block.id,
        x: (baseX + block.position.x + 1) * scale + offsetX,
        y: (baseY + block.position.z + 1) * scale + offsetY,
        color: getBlockColor(block.provider ?? 'azure', block.subtype, block.category),
      };
    });

    // Transform connections
    const transformedConnections = connections.map((conn) => {
      const sourceBlock = blocks.find((b) => b.id === conn.sourceId);
      const targetBlock = blocks.find((b) => b.id === conn.targetId);

      if (!sourceBlock || !targetBlock) return null;

      const sourcePlate = plates.find((p) => p.id === sourceBlock.parentId);
      const targetPlate = plates.find((p) => p.id === targetBlock.parentId);

      const sx = ((sourcePlate?.position.x ?? 0) + sourceBlock.position.x + 1) * scale + offsetX;
      const sy = ((sourcePlate?.position.z ?? 0) + sourceBlock.position.z + 1) * scale + offsetY;
      const tx = ((targetPlate?.position.x ?? 0) + targetBlock.position.x + 1) * scale + offsetX;
      const ty = ((targetPlate?.position.z ?? 0) + targetBlock.position.z + 1) * scale + offsetY;

      return { id: conn.id, x1: sx, y1: sy, x2: tx, y2: ty };
    }).filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;

    return {
      plates: transformedPlates,
      blocks: transformedBlocks,
      connections: transformedConnections,
      scale,
      offsetX,
      offsetY,
    };
  }, [architecture]);

  const handleClick = (id: string) => {
    setSelectedId(id);
  };

  const isEmpty = architecture.nodes.length === 0;

  return (
    <div className={`minimap-panel ${className}`}>
      <div className="minimap-container">
        {isEmpty ? (
          <div className="minimap-empty">
            <span className="minimap-empty-icon">🗺️</span>
            <span className="minimap-empty-text">Empty</span>
          </div>
        ) : (
          <svg className="minimap-svg" viewBox="0 0 160 120" role="img" aria-label="Architecture minimap">
            <title>Architecture Overview</title>
            {viewData.plates.map((plate) => (
              <rect
                key={plate.id}
                x={plate.x}
                y={plate.y}
                width={plate.width}
                height={plate.height}
                fill={plate.color}
                fillOpacity={plate.isNetwork ? 0.3 : 0.5}
                stroke={plate.color}
                strokeWidth={plate.isNetwork ? 1.5 : 1}
                strokeDasharray={plate.isNetwork ? undefined : '2,1'}
                rx={2}
                className={`minimap-plate ${selectedId === plate.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onPointerDown={() => handleClick(plate.id)}
              />
            ))}

            {viewData.connections.map((conn) => (
              <line
                key={conn.id}
                x1={conn.x1}
                y1={conn.y1}
                x2={conn.x2}
                y2={conn.y2}
                stroke="#B0BEC5"
                strokeWidth={1}
                className={`minimap-connection ${selectedId === conn.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onPointerDown={() => handleClick(conn.id)}
              />
            ))}

            {viewData.blocks.map((block) => (
              <circle
                key={block.id}
                cx={block.x}
                cy={block.y}
                r={4}
                fill={block.color}
                stroke={selectedId === block.id ? '#FFFFFF' : 'none'}
                strokeWidth={2}
                className={`minimap-block ${selectedId === block.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onPointerDown={() => handleClick(block.id)}
              />
            ))}
          </svg>
        )}
      </div>
      <div className="minimap-footer">
        <span className="minimap-zoom">🔍 100%</span>
      </div>
    </div>
  );
}

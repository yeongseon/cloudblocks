import { useRef, useState, memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Block, Plate } from '../../shared/types/index';
import { BLOCK_COLORS, DEFAULT_BLOCK_SIZE } from '../../shared/types/index';
import { getBlockWorldPosition } from '../../shared/utils/position';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';

interface BlockModelProps {
  block: Block;
  parentPlate: Plate;
}

const BLOCK_SHAPES: Record<string, 'box' | 'cylinder' | 'cone'> = {
  compute: 'box',
  database: 'cylinder',
  storage: 'box',
  gateway: 'cone',
};

export const BlockModel = memo(function BlockModel({ block, parentPlate }: BlockModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const setConnectionSource = useUIStore((s) => s.setConnectionSource);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);

  const isSelected = selectedId === block.id;
  const color = BLOCK_COLORS[block.category];
  const shape = BLOCK_SHAPES[block.category] ?? 'box';

  // Calculate absolute position from shared utility
  const worldPosition = getBlockWorldPosition(block, parentPlate);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (toolMode === 'delete') {
      removeBlock(block.id);
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        setConnectionSource(block.id);
      } else if (connectionSource !== block.id) {
        addConnection(connectionSource, block.id);
        setConnectionSource(null);
      }
      return;
    }

    setSelectedId(block.id);
  };

  return (
    <group position={worldPosition}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = toolMode === 'delete' ? 'not-allowed' : 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        castShadow
        receiveShadow
      >
        {shape === 'box' && (
          <boxGeometry
            args={[
              DEFAULT_BLOCK_SIZE.width,
              DEFAULT_BLOCK_SIZE.height,
              DEFAULT_BLOCK_SIZE.depth,
            ]}
          />
        )}
        {shape === 'cylinder' && (
          <cylinderGeometry
            args={[
              DEFAULT_BLOCK_SIZE.width / 2,
              DEFAULT_BLOCK_SIZE.width / 2,
              DEFAULT_BLOCK_SIZE.height,
              16,
            ]}
          />
        )}
        {shape === 'cone' && (
          <coneGeometry
            args={[DEFAULT_BLOCK_SIZE.width / 2, DEFAULT_BLOCK_SIZE.height, 4]}
          />
        )}
        <meshStandardMaterial
          color={color}
          emissive={
            isSelected
              ? '#ffffff'
              : connectionSource === block.id
                ? '#00ff00'
                : '#000000'
          }
          emissiveIntensity={
            isSelected ? 0.3 : connectionSource === block.id ? 0.4 : 0
          }
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Lego stud on top */}
      <mesh
        position={[0, DEFAULT_BLOCK_SIZE.height / 2 + 0.05, 0]}
      >
        <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, -DEFAULT_BLOCK_SIZE.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : '#aaaaaa'}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <Html
        position={[0, DEFAULT_BLOCK_SIZE.height / 2 + 0.3, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            color: '#e0e0e0',
            fontSize: '10px',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontWeight: 500,
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '1px 5px',
            borderRadius: '2px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {block.name}
        </div>
      </Html>
    </group>
  );
});

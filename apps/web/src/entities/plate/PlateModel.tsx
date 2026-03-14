import { useRef, useState, type ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Plate } from '../../shared/types/index';
import { PLATE_COLORS, SUBNET_ACCESS_COLORS } from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';

interface PlateModelProps {
  plate: Plate;
}

export function PlateModel({ plate }: PlateModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const isSelected = selectedId === plate.id;

  const baseColor =
    plate.type === 'subnet' && plate.subnetAccess
      ? SUBNET_ACCESS_COLORS[plate.subnetAccess]
      : PLATE_COLORS[plate.type];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedId(plate.id);
  };

  const worldPosition: [number, number, number] = [
    plate.position.x,
    plate.position.y,
    plate.position.z,
  ];

  return (
    <group position={worldPosition}>
      {/* Main plate body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        receiveShadow
      >
        <boxGeometry
          args={[plate.size.width, plate.size.height, plate.size.depth]}
        />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={hovered ? 0.85 : 0.7}
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* Plate border outline */}
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(
              plate.size.width,
              plate.size.height,
              plate.size.depth
            ),
          ]}
        />
        <lineBasicMaterial
          color={isSelected ? '#ffffff' : '#333333'}
          linewidth={1}
        />
      </lineSegments>

      {/* Lego studs on top surface */}
      {generateStuds(plate.size.width, plate.size.depth, plate.size.height, baseColor)}

      {/* Label */}
      <PlateLabel
        name={plate.name}
        width={plate.size.width}
        height={plate.size.height}
      />
    </group>
  );
}

function generateStuds(
  width: number,
  depth: number,
  height: number,
  color: string
): ReactNode {
  const studs: ReactNode[] = [];
  const studRadius = 0.15;
  const studHeight = 0.1;
  const spacing = 1.5;

  const countX = Math.floor(width / spacing);
  const countZ = Math.floor(depth / spacing);

  for (let ix = 0; ix < countX; ix++) {
    for (let iz = 0; iz < countZ; iz++) {
      const x = -width / 2 + spacing / 2 + ix * spacing;
      const z = -depth / 2 + spacing / 2 + iz * spacing;
      studs.push(
        <mesh
          key={`stud-${ix}-${iz}`}
          position={[x, height / 2 + studHeight / 2, z]}
        >
          <cylinderGeometry args={[studRadius, studRadius, studHeight, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    }
  }

  return <>{studs}</>;
}

function PlateLabel({
  name,
  width,
  height,
}: {
  name: string;
  width: number;
  height: number;
}) {
  return (
    <Html
      position={[0, height / 2 + 0.15, 0]}
      center
      distanceFactor={10}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: '13px',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontWeight: 600,
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '2px 8px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          maxWidth: `${Math.max(80, Math.min(width * 42, 220))}px`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </div>
    </Html>
  );
}

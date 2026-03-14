import { useRef, useState, type ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Plate } from '../models/types';
import { PLATE_COLORS, SUBNET_ACCESS_COLORS } from '../models/types';
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
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <mesh position={[0, height / 2 + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[Math.min(width * 0.8, 4), 0.4]} />
      <meshBasicMaterial color="#333333" transparent opacity={0.8} />
    </mesh>
  );
}

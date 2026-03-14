import { useMemo } from 'react';
import * as THREE from 'three';
import type { Block, Connection, ExternalActor, Plate } from '../../shared/types/index';
import { DEFAULT_BLOCK_SIZE } from '../../shared/types/index';

interface ConnectionLineProps {
  connection: Connection;
  blocks: Block[];
  plates: Plate[];
  externalActors: ExternalActor[];
}

function getEndpointPosition(
  id: string,
  blocks: Block[],
  plates: Plate[],
  externalActors: ExternalActor[]
): THREE.Vector3 | null {
  // Check blocks
  const block = blocks.find((b) => b.id === id);
  if (block) {
    const plate = plates.find((p) => p.id === block.placementId);
    if (plate) {
      return new THREE.Vector3(
        plate.position.x + block.position.x,
        plate.position.y +
          plate.size.height / 2 +
          DEFAULT_BLOCK_SIZE.height / 2 +
          block.position.y,
        plate.position.z + block.position.z
      );
    }
  }

  // Check external actors (position above the scene)
  const actor = externalActors.find((a) => a.id === id);
  if (actor) {
    return new THREE.Vector3(0, 5, -6);
  }

  return null;
}

export function ConnectionLine({
  connection,
  blocks,
  plates,
  externalActors,
}: ConnectionLineProps) {
  const { sourcePos, targetPos, midPos } = useMemo(() => {
    const src = getEndpointPosition(
      connection.sourceId,
      blocks,
      plates,
      externalActors
    );
    const tgt = getEndpointPosition(
      connection.targetId,
      blocks,
      plates,
      externalActors
    );

    if (!src || !tgt) return { sourcePos: null, targetPos: null, midPos: null };

    // Create a curved midpoint for the arc
    const mid = new THREE.Vector3()
      .addVectors(src, tgt)
      .multiplyScalar(0.5);
    mid.y += 1.5; // Arc height

    return { sourcePos: src, targetPos: tgt, midPos: mid };
  }, [connection, blocks, plates, externalActors]);

  const curvePoints = useMemo(() => {
    if (!sourcePos || !targetPos || !midPos) return null;

    const curve = new THREE.QuadraticBezierCurve3(sourcePos, midPos, targetPos);
    return curve.getPoints(30);
  }, [sourcePos, targetPos, midPos]);

  if (!curvePoints) return null;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    return geo;
  }, [curvePoints]);

  return (
    <group>
      {/* Connection line */}
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ff6b6b' }))} />

      {/* Arrow head at target */}
      {targetPos && (
        <mesh position={targetPos}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      )}
    </group>
  );
}

/**
 * Render the Internet external actor as a floating globe icon.
 */
export function ExternalActorModel(_props: {
  actor: ExternalActor;
}) {
  return (
    <group position={[0, 5, -6]}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#90CAF9"
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#1565C0" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

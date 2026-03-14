import { useMemo, memo } from 'react';
import * as THREE from 'three';
import type { Block, Connection, ExternalActor, Plate } from '../../shared/types/index';
import {
  getEndpointWorldPosition,
  EXTERNAL_ACTOR_POSITION,
} from '../../shared/utils/position';

interface ConnectionLineProps {
  connection: Connection;
  blocks: Block[];
  plates: Plate[];
  externalActors: ExternalActor[];
}

export const ConnectionLine = memo(function ConnectionLine({
  connection,
  blocks,
  plates,
  externalActors,
}: ConnectionLineProps) {
  const { sourcePos, targetPos, midPos } = useMemo(() => {
    const src = getEndpointWorldPosition(
      connection.sourceId,
      blocks,
      plates,
      externalActors
    );
    const tgt = getEndpointWorldPosition(
      connection.targetId,
      blocks,
      plates,
      externalActors
    );

    if (!src || !tgt) return { sourcePos: null, targetPos: null, midPos: null };

    const srcVec = new THREE.Vector3(...src);
    const tgtVec = new THREE.Vector3(...tgt);

    // Create a curved midpoint for the arc
    const mid = new THREE.Vector3()
      .addVectors(srcVec, tgtVec)
      .multiplyScalar(0.5);
    mid.y += 1.5; // Arc height

    return { sourcePos: srcVec, targetPos: tgtVec, midPos: mid };
  }, [connection, blocks, plates, externalActors]);

  const curvePoints = useMemo(() => {
    if (!sourcePos || !targetPos || !midPos) return null;

    const curve = new THREE.QuadraticBezierCurve3(sourcePos, midPos, targetPos);
    return curve.getPoints(30);
  }, [sourcePos, targetPos, midPos]);

  const geometry = useMemo(() => {
    if (!curvePoints) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    return geo;
  }, [curvePoints]);

  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#ff6b6b' }),
    []
  );

  const lineObject = useMemo(() => {
    if (!geometry) return null;
    return new THREE.Line(geometry, lineMaterial);
  }, [geometry, lineMaterial]);

  if (!lineObject) return null;

  return (
    <group>
      {/* Connection line */}
      <primitive object={lineObject} />

      {/* Arrow head at target */}
      {targetPos && (
        <mesh position={targetPos}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      )}
    </group>
  );
});

/**
 * Render the Internet external actor as a floating globe icon.
 */
export const ExternalActorModel = memo(function ExternalActorModel(_props: {
  actor: ExternalActor;
}) {
  return (
    <group position={EXTERNAL_ACTOR_POSITION}>
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
});

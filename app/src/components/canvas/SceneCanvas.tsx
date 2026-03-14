import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import { useArchitectureStore } from '../../store/architectureStore';
import { useUIStore } from '../../store/uiStore';
import { PlateModel } from '../../three/PlateModel';
import { BlockModel } from '../../three/BlockModel';
import { ConnectionLine, ExternalActorModel } from '../../three/ConnectionLine';

export function SceneCanvas() {
  const architecture = useArchitectureStore(
    (s) => s.workspace.architecture
  );
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 50 }}
      shadows
      style={{ background: '#1a1a2e' }}
      onPointerMissed={() => setSelectedId(null)}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />

      {/* Ground grid */}
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        cellColor="#333366"
        sectionColor="#666699"
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* Plates */}
      {architecture.plates.map((plate) => (
        <PlateModel key={plate.id} plate={plate} />
      ))}

      {/* Blocks */}
      {architecture.blocks.map((block) => {
        const parentPlate = architecture.plates.find(
          (p) => p.id === block.placementId
        );
        if (!parentPlate) return null;
        return (
          <BlockModel
            key={block.id}
            block={block}
            parentPlate={parentPlate}
          />
        );
      })}

      {/* Connections */}
      {architecture.connections.map((conn) => (
        <ConnectionLine
          key={conn.id}
          connection={conn}
          blocks={architecture.blocks}
          plates={architecture.plates}
          externalActors={architecture.externalActors}
        />
      ))}

      {/* External Actors */}
      {architecture.externalActors.map((actor) => (
        <group key={actor.id}>
          <ExternalActorModel actor={actor} />
          <Html position={[0, 6, -6]} center>
            <div
              style={{
                color: '#90CAF9',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              🌐 {actor.name}
            </div>
          </Html>
        </group>
      ))}
    </Canvas>
  );
}

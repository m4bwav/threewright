import { useRef } from 'react';
import type { Mesh } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';

// threewright's page contract: tw check, shot and video wait for
// window.__tw.ready, when the page sets it, before they inspect or capture.
declare global {
  interface Window {
    __tw?: { ready?: Promise<void> };
  }
}

function Knot() {
  const ref = useRef<Mesh>(null!);
  // Drive motion from elapsed time, never from a per-frame increment, so any
  // frame rate and frame-by-frame video capture look the same.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.set(t * 0.4, t * 0.6, 0);
  });
  return (
    <mesh ref={ref} name="knot" position-y={0.9} castShadow>
      <torusKnotGeometry args={[0.5, 0.16, 160, 24]} />
      <meshStandardMaterial color="#3fa7ff" metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

// Sets window.__tw.ready during its first frame, which finishes drawing before
// anything else can read the flag. Canvas children share one Suspense boundary,
// so when a sibling loads a model this mounts only after the model is in: keep
// it in the same boundary as your assets. It is set on a frame rather than
// pending from page load because tw video only steps its virtual clock after
// ready settles, so a pending promise would stall it.
function Ready() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    (window.__tw ??= {}).ready = Promise.resolve();
  });
  return null;
}

export function App() {
  // shadows="percentage" selects PCFShadowMap. A bare `shadows` asks for
  // PCFSoftShadowMap, deprecated in r186: WebGLRenderer warns, then uses PCF.
  return (
    <Canvas dpr={[1, 2]} shadows="percentage" camera={{ position: [3, 2.2, 4], fov: 45, near: 0.1, far: 100 }}>
      <color attach="background" args={['#1b1d22']} />
      <directionalLight position={[4, 6, 3]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
      <Knot />
      <mesh name="ground" rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial color="#3a3d45" roughness={0.9} />
      </mesh>
      {/* Image-based light rendered once from a dim backdrop (soft fill from
          every side) and glowing panels (highlights), with nothing to download.
          <Environment preset="..."> fetches HDR files from a CDN at run time,
          which fails offline, in sandboxes and under tw check. */}
      <Environment resolution={256}>
        <color attach="background" args={['#2a2d33']} />
        <Lightformer intensity={3} position={[0, 5, 0]} scale={[8, 8, 1]} />
        <Lightformer intensity={1.5} position={[-5, 2, 3]} scale={[6, 3, 1]} />
        <Lightformer intensity={1.5} position={[5, 2, -3]} scale={[6, 3, 1]} />
      </Environment>
      <OrbitControls makeDefault target={[0, 0.5, 0]} />
      <Ready />
    </Canvas>
  );
}

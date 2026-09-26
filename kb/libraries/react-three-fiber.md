---
title: React Three Fiber (R3F)
slug: react-three-fiber
kind: library
summary: React renderer for three.js; v9.8 is the stable line for React 19.3, v10 is an alpha with WebGPU-first hooks; when to use it, how to set it up, and what trips agents.
tags: [react, r3f, fiber, jsx, drei, webgpu, declarative, components]
applies_to: ">=r156"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/react-three-fiber, https://www.npmjs.com/package/@react-three/fiber, https://r3f.docs.pmnd.rs/, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [import-maps-and-builds, current-vs-legacy]
template: r3f
package: "@react-three/fiber"
version_checked: "9.8.1"
---

# React Three Fiber (R3F)

## Use it for

- three.js inside a React app: the scene is JSX, state lives in React or zustand, and components are reused like any other React component.
- Teams that already use React and want the pmndrs ecosystem: drei helpers (controls, loaders, `Html`, `Text`, `ScrollControls`), @react-three/rapier, @react-three/postprocessing, @react-three/xr, uikit.
- Scene-graph unit tests without a GPU through @react-three/test-renderer 9.1.1.

## Avoid it when

- The page is not a React app: plain three.js with an import map is smaller and has no reconciler between you and the scene graph.
- You need v10-only WebGPU hooks in production: v10 is alpha (10.0.0-alpha.5, 2026-09-08), and it and drei 11 alpha cap React below 19.3 while React 19.3.0 is current, so they give peer conflicts.
- Hot paths would run through React state: per-frame updates belong in `useFrame` on refs, not in `setState`.

## Setup

Versions checked 2026-09-26: `@react-three/fiber` 9.8.1 (peer `three >=0.156`, `react >=19 <19.4`), `@react-three/drei` 10.7.9, `react` 19.3.0, `three` 0.186.1, `@types/three` 0.186.0. R3F 9.8.0 added React 19.3 support.

```sh
npm install three@0.186.1 @react-three/fiber@9.8.1 @react-three/drei@10.7.9 react@19.3.0 react-dom@19.3.0
npm install -D @types/three@0.186.0 @types/react@19.3.0 @types/react-dom@19.3.0
```

```jsx
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';

function Knot() {
  const ref = useRef();
  // Per-frame work on refs, scaled by delta so speed does not depend on frame rate.
  useFrame((state, delta) => { ref.current.rotation.y += delta * 0.5; });
  return (
    <mesh ref={ref} castShadow>
      <torusKnotGeometry args={[0.5, 0.16, 160, 24]} />
      <meshStandardMaterial color="#3fa7ff" roughness={0.35} />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas dpr={[1, 2]} shadows camera={{ position: [3, 2.2, 4], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 3]} intensity={2} castShadow />
      <Knot />
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
```

WebGPURenderer with v9: pass an initialized renderer through the async `gl` factory.

```jsx
import * as THREE from 'three/webgpu';

<Canvas gl={async (props) => { const renderer = new THREE.WebGPURenderer(props); await renderer.init(); return renderer; }}>
```

## Pitfalls

- drei `<Environment preset="...">` downloads HDR files from a CDN at runtime; offline, sandboxed or CI pages fail. Use lights, a `<Environment>` built from `<Lightformer>`s, or RoomEnvironment through PMREM.
- drei 10 depends on three-stdlib, three-mesh-bvh 0.8, stats-gl 2 and troika; installing three-mesh-bvh 0.9 yourself gives two copies. Prefer `three/addons/...` over three-stdlib in your own imports.
- @react-three/postprocessing wraps pmndrs postprocessing, which is WebGL only; with WebGPURenderer use three's `RenderPipeline` and TSL nodes.
- @react-three/rapier 2.2.0 pins Rapier 0.19.2 while Rapier is at 0.21.0; use Rapier directly if you need 0.20+ features.
- Two copies of three (a CDN copy and the bundled one, or mismatched versions) break `instanceof` checks and log `Multiple instances of Three.js being imported`.
- v10 renames `state.gl` to `state.renderer`; code written for one line does not run on the other.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries). Versions and peer ranges from npm on that date. Whether R3F 9.8.1 still uses the deprecated `THREE.Clock` for `state.clock` (and so logs a deprecation warning) is checked by the r3f template run.

---
title: React Three Rapier
slug: react-three-rapier
kind: library
summary: Rapier physics for React Three Fiber through <Physics> and <RigidBody>; pinned to Rapier 0.19.2 while Rapier itself is at 0.21.0, so new Rapier features need the raw package.
tags: [rapier, physics, r3f, react, rigidbody, colliders, character controller]
applies_to: ">=r159"
status: current
renderer: none
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/react-three-rapier, https://www.npmjs.com/package/@react-three/rapier, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-games.md]
related: [rapier, react-three-fiber, games]
template: r3f
package: "@react-three/rapier"
version_checked: "2.2.0"
---

# React Three Rapier

## Use it for

- Physics in an R3F scene: drop `<Physics>` around the scene and `<RigidBody>` around a mesh instead of wiring up the Rapier world by hand.
- Prototyping colliders, joints and character bodies quickly with declarative props (`colliders="hull"`, `type="kinematicPosition"`).
- Visual debugging: `<Physics debug>` draws every collider as a wireframe.

## Avoid it when

- The project needs Rapier 0.20 or 0.21 features (soft bodies, the changed `PhysicsPipeline.step` and `ColliderSet.remove` signatures): 2.2.0 pins `@dimforge/rapier3d-compat` to exactly 0.19.2. Use `@dimforge/rapier3d-compat` directly and drive it from `useFrame`.
- The game is not React: use `@dimforge/rapier3d-compat` with plain three.js (the `games` scenario's fixed-timestep loop).
- Per-frame physics results need to flow into React state: read positions on refs inside `useFrame`, never through `setState`, or the render loop stalls.

## Setup

Versions checked 2026-09-26: `@react-three/rapier` 2.2.0 (2025-11-03), peer `three >=0.159.0`, `@react-three/fiber ^9.0.4`, `react ^19`. It has had no release in almost 11 months, while `@dimforge/rapier3d-compat` reached 0.21.0 on 2026-09-25 (soft bodies, changed method signatures).

```sh
npm install @react-three/rapier@2.2.0 @react-three/fiber@9.8.1 three@0.186.1
```

```jsx
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';

export default function Scene() {
  return (
    <Canvas camera={{ position: [4, 3, 6] }}>
      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <mesh receiveShadow><boxGeometry args={[10, 0.2, 10]} /><meshStandardMaterial /></mesh>
        </RigidBody>
        <RigidBody colliders="ball" restitution={0.6} position={[0, 4, 0]}>
          <mesh castShadow><sphereGeometry args={[0.5, 32, 32]} /><meshStandardMaterial /></mesh>
        </RigidBody>
      </Physics>
    </Canvas>
  );
}
```

## Pitfalls

- The 0.19.2 pin means snapshots and worlds are not interchangeable with a project that installs Rapier 0.20 or 0.21 elsewhere; two copies of the WASM module can end up in one bundle. Check `npm ls @dimforge/rapier3d-compat` when physics behaves oddly.
- `<Physics>` steps at a fixed rate internally but `useFrame` still runs at render rate; read body transforms with refs (`rigidBodyRef.current.translation()`), not by re-rendering React each frame.
- Colliders auto-generated from `colliders="hull"` on a complex mesh are expensive; author simplified collision meshes for level geometry instead of colliding against the render mesh (see the `games` scenario).
- `ecctrl` (character and vehicle controllers built on this package) requires `@react-three/rapier >=2.2.0`, `drei >=10.7`, `react >=19.2.7`; check all four before adding it.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, games). @react-three/rapier's lag behind Rapier itself is the main thing to flag to a user picking this package.

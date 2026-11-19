---
title: drei
slug: drei
kind: library
summary: Helper library for React Three Fiber; controls, loaders, Environment, Text, ScrollControls; v10 is stable on WebGL, v11 alpha is the WebGPU line.
tags: [drei, r3f, react, helpers, environment, scroll-controls, html, webgpu]
applies_to: ">=r159"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://github.com/pmndrs/drei, https://www.npmjs.com/package/@react-three/drei, ai-docs/research/2026-09-26-ecosystem-libraries.md]
related: [react-three-fiber, three-mesh-bvh, stats-gl, troika-three-text]
template: r3f
package: "@react-three/drei"
version_checked: "10.7.9"
---

# drei

## Use it for

- Any React Three Fiber scene that needs a common helper instead of hand-rolled code: `OrbitControls`, `Environment`, `ContactShadows`, `Stage`, `Bounds`, `Html`, `Text`, `ScrollControls`, `useGLTF`, `useTexture`, `StatsGl`.
- Product viewers and scroll heroes where `Stage`, `Environment` and `ScrollControls` cover most of the setup (3d-chart-in-docs, scroll-storytelling scenarios).
- Debug helpers (`Grid`, `Helper`, `Perf` alternatives) during development.

## Avoid it when

- The project targets `@react-three/fiber` v10 in production: drei 11 is alpha (`11.0.0-alpha.7`, 2026-09-05) and both cap React below 19.3, so they conflict with the current React 19.3.0. Stay on drei 10 with R3F 9.
- A WebGPU-only path is required today: drei 10's materials and render-target helpers (`Fbo`, `RenderTexture`, `CubeCamera`) are WebGL only, and drei 11's `/webgpu` entry is still being built (its own migration guide warns "implemented" only means a file exists).
- Vanilla three.js with no React: drei is an R3F package and has no vanilla build.

## Setup

Versions checked 2026-09-26: `@react-three/drei` 10.7.9 (2026-09-25), peer `three >=0.159`, `@react-three/fiber ^9.0.0`, `react ^19`.

```sh
npm install @react-three/drei@10.7.9 @react-three/fiber@9.8.1 three@0.186.1 react@19.3.0 react-dom@19.3.0
```

```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Bounds } from '@react-three/drei';

export default function Viewer({ children }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [3, 2, 4], fov: 45 }}>
      <Bounds fit clip observe margin={1.2}>{children}</Bounds>
      <ContactShadows position={[0, -0.5, 0]} opacity={0.5} blur={2} />
      <Environment preset="studio" />
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
```

Offline or sandboxed pages (Claude artifacts, CI, no CDN egress): build the environment from `Lightformer` panels instead of `preset`.

```jsx
import { Environment, Lightformer } from '@react-three/drei';

<Environment resolution={256}>
  <Lightformer intensity={2} position={[0, 4, 0]} scale={10} form="ring" />
  <Lightformer intensity={0.5} position={[-4, 1, -4]} scale={6} />
</Environment>
```

## Pitfalls

- `<Environment preset="...">` downloads HDR files from a CDN at request time; it fails on offline, sandboxed or CI pages. Use lights, `Lightformer` panels, or `RoomEnvironment` through PMREM instead.
- drei 10 depends on `three-stdlib`, `three-mesh-bvh ^0.8.3`, `stats-gl ^2.2.8`, `troika-three-text ^0.52.4`, `meshline`, `maath`, `detect-gpu`, `camera-controls`. Installing `three-mesh-bvh` 0.9.x or `stats-gl` 4.x directly gives two copies; prefer the version drei already pulls unless the project needs the newer one everywhere.
- `three-stdlib` re-exports old-style addons. Import `three/addons/...` yourself where you can, since drei 11 drops `three-stdlib` entirely.
- `Text` (troika-backed) has no WebGPU path; on `WebGPURenderer` it errors or silently falls back depending on the drei version. Use `Html` or wait for drei's MSDF text.
- `Stars` and other GLSL-material helpers are WebGL only in drei 11's `/legacy` split; the root import in v11 covers renderer-agnostic helpers only.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries). Versions and peer ranges from npm on that date.

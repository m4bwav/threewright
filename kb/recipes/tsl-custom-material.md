---
title: TSL custom material
slug: tsl-custom-material
kind: recipe
summary: A node material with colorNode and emissiveNode computed from position, UV and the renderer's own clock, with no GLSL or WGSL written by hand.
tags: [tsl, colorNode, emissiveNode, nodematerial, meshstandardnodematerial]
applies_to: ">=r171"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [tsl, materials, bloom-webgpu]
template: html-webgpu
---

# TSL custom material

## Goal

Custom appearance on `WebGPURenderer` without writing a `ShaderMaterial` at all: a `MeshStandardNodeMaterial` whose `colorNode` mixes two colors by a vertical banding pattern that scrolls over time, and whose `emissiveNode` adds a fresnel-style rim glow, entirely from TSL function composition. The same node graph compiles to WGSL or GLSL depending on backend.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TSL custom material</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0b0d12; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.tsl.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three/webgpu';
    import { color, mix, oscSine, positionLocal, time, uniform, uv, vec3 } from 'three/tsl';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    const renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
    await renderer.init();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.5, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // A node material: colour and a pulsing rim glow computed on the GPU from
    // the vertex position, the UV and the renderer's own clock, with no GLSL
    // or WGSL written by hand. This runs on the WebGPU backend and on
    // WebGPURenderer's WebGL 2 fallback from the same TSL source.
    const speed = uniform(0.6); // a uniform, so it can be tweaked at runtime without recompiling
    const bands = oscSine(positionLocal.y.mul(4).add(time.mul(speed)));
    const rim = uv().y.oneMinus().pow(3);

    const material = new THREE.MeshStandardNodeMaterial({ metalness: 0.2, roughness: 0.35 });
    material.colorNode = mix(color(0x142033), color(0x3fa7ff), bands);
    material.emissiveNode = vec3(1.0, 0.7, 0.25).mul(rim).mul(1.5);

    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.2, 160, 24), material);
    knot.position.y = 0.6;
    scene.add(knot);

    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
  </script>
</body>
</html>
```

`speed` is a TSL `uniform()`, so it can be changed live (`speed.value = 1.2`) without rebuilding the material or recompiling the shader; a plain JS number baked into the node graph would need a new material. Never write `ShaderMaterial` or `.onBeforeCompile` in a file that also builds `WebGPURenderer`; see `materials` and `tsl` for why that fails rather than just underperforms.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/tsl-custom-material`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`. As with `bloom-webgpu`, the WebGPU backend itself fails on Chromium 141 in this container (see `ai-docs/HANDOFF.md` Gotchas), so this was checked on the automatic WebGL 2 fallback (no `--webgpu` flag): `result: OK`, `renderer: WebGPURenderer (WebGL2 fallback)`, `draw calls 2`, no `NodeBuilder` compatibility errors in the console. Re-check with `--webgpu` on a current Chrome to confirm the real WebGPU backend compiles the same graph.
- `tw check <page>` with no console errors is the key signal here: an invented TSL function name or a bad node composition surfaces as a console error naming the pipeline stage, not a silently wrong render.
- `tw lint <dir>` flags any renamed TSL import (`PI2`, `transformedNormalView`, and so on) this page might pick up from a copy-pasted older snippet.

## Notes

- 2026-09-26: written from the direction research (sections 2.2, 3.1-3.3) and the core r160-r186 research (sections 5, 6), checked with `tw check` against this recipe's own page on the WebGL 2 fallback per the HANDOFF gotcha; the real WebGPU backend path is unverified in this container.

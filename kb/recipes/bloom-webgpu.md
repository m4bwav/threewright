---
title: Bloom (WebGPU)
slug: bloom-webgpu
kind: recipe
summary: Selective bloom on WebGPURenderer with RenderPipeline, an MRT emissive channel and the TSL bloom() display node.
tags: [bloom, renderpipeline, tsl, mrt, webgpu, post-processing]
applies_to: ">=r186"
status: current
renderer: webgpu
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-direction.md]
related: [post-processing, tsl, bloom-webgl]
template: html-webgpu
---

# Bloom (WebGPU)

## Goal

The same selective glow as `bloom-webgl`, built on the WebGPU pipeline instead: `RenderPipeline` with a multi-render-target (MRT) pass that outputs both the normal color and an `emissive` channel, and the TSL `bloom()` display node reading only the emissive channel, so only objects that actually set `emissiveNode` bloom; never a brightness-threshold guess across the whole image.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>bloom (WebGPU, RenderPipeline)</title>
  <style>
    html, body { margin: 0; height: 100%; background: #05060a; }
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
    import { pass, mrt, output, emissive, color } from 'three/tsl';
    import { bloom } from 'three/addons/tsl/display/BloomNode.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    const renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
    await renderer.init(); // sync render() throws before init since r181

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(3, 2, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;

    // Bloom reads from an MRT emissive channel, so the bright knot's own
    // emissiveNode drives what blooms rather than a brightness threshold pass.
    const glowMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x201200 });
    glowMaterial.emissiveNode = color(0xffaa33).mul(1.1);

    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.2, 160, 24), glowMaterial);
    knot.name = 'glow-knot';
    knot.position.y = 0.8;
    scene.add(knot);

    const dim = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 16),
      new THREE.MeshStandardNodeMaterial({ color: 0x223344 })
    );
    dim.name = 'dim-sphere';
    dim.position.set(1.4, 0.8, -0.6);
    scene.add(dim);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 2);
    scene.add(sun);

    const scenePass = pass(scene, camera);
    scenePass.setMRT(mrt({ output, emissive }));

    const renderPipeline = new THREE.RenderPipeline(renderer);
    const bloomPass = bloom(scenePass.getTextureNode('emissive'), 0.6, 0.3, 0.15);
    renderPipeline.outputNode = scenePass.getTextureNode('output').add(bloomPass);

    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    renderer.setAnimationLoop(() => {
      controls.update();
      knot.rotation.y += 0.01;
      renderPipeline.render();
    });
  </script>
</body>
</html>
```

`output` and `emissive` are TSL property nodes imported from `three/tsl` (not functions to call); they name which channel of the MRT pass to write and read. Never use `EffectComposer` or `UnrealBloomPass` here; they are WebGL-only and fail on `WebGPURenderer` (see `post-processing`).

## Verify

- Checked 2026-09-26 on the real WebGPU backend (Windows 11, Chrome 153 headless, NVIDIA RTX 5060 Ti): `node scripts/tw.mjs check <page> --webgpu` against this exact page gives `result: OK`, `renderer: WebGPURenderer (WebGPU)`, `draw calls 15`, tone mapping `ACESFilmic`; a `tw shot` was looked at (knot glows, the dim sphere does not). The same page forced to the WebGL 2 fallback renders the same image (mean luma within 0.01), and it also passed on the fallback in the Linux container (Chromium 141).
- The first version used emissive x3 and bloom strength 1.2 with ambient light only; the shot showed the whole frame orange and the knot as a flat white blob on both backends. Emissive x1.1, strength 0.6, radius 0.3 and one directional light fixed it. Look at a shot before trusting a bloom setting: `result: OK` cannot tell a glow from a blowout.
- `tw check <page>` prints the backend on its renderer line: `WebGPURenderer (WebGPU)` or `WebGPURenderer (WebGL2 fallback)`. Do not report "WebGPU bloom works" from a run that says fallback. `--eval "renderer.backend.isWebGPUBackend"` gives the same answer as `true` or `false`.
- `tw lint <dir>` flags `EffectComposer` or `ShaderMaterial` if either ever gets added next to `WebGPURenderer` on this page (`effectcomposer-on-webgpu`, `shadermaterial-on-webgpu`).

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 5, 6) and the direction research (section 3.2), checked with `tw check` against this recipe's own page on the WebGL 2 fallback per the HANDOFF gotcha; the real WebGPU backend path is unverified in this container.
- 2026-09-26: verified on the real WebGPU backend on Windows with an RTX 5060 Ti; bloom values lowered after the shot showed a blowout.

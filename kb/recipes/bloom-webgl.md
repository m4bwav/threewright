---
title: Bloom (WebGL)
slug: bloom-webgl
kind: recipe
summary: A selective bloom glow on WebGLRenderer with EffectComposer, UnrealBloomPass and a threshold that only the bright object crosses.
tags: [bloom, effectcomposer, unrealbloompass, outputpass, post-processing]
applies_to: ">=r155"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md]
related: [post-processing, bloom-webgpu, materials]
template: html-importmap
---

# Bloom (WebGL)

## Goal

A glow around bright objects only, using the WebGL post-processing pipeline: `EffectComposer` with `RenderPass`, `UnrealBloomPass`, and `OutputPass` last so the composer's output is actually tone-mapped and in the right color space. A low bloom threshold and an unlit-but-bright material on one mesh keep the effect selective instead of blooming everything.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>bloom (WebGL, EffectComposer)</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0b0d12; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(3, 2, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;

    // A basic (unlit) material with emissive-like brightness lets UnrealBloomPass
    // pick it out against the dark background without any scene lighting at all.
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.2, 160, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa33 })
    );
    knot.name = 'glow-knot';
    knot.position.y = 0.8;
    scene.add(knot);

    const dim = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x223344 })
    );
    dim.name = 'dim-sphere';
    dim.position.set(1.4, 0.8, -0.6);
    scene.add(dim);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,  // strength
      0.5,  // radius
      0.15  // threshold: only the bright knot blooms, not the dim sphere
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass()); // last: applies tone mapping and output color space

    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    renderer.setAnimationLoop(() => {
      controls.update();
      knot.rotation.y += 0.01;
      composer.render();
    });
  </script>
</body>
</html>
```

Drive `knot.rotation.y` from `Timer.getDelta()` in real code, not a per-frame constant like the snippet above; see `animation-and-time`.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/bloom-webgl`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`: `result: OK`, `draw calls 1` with `toneMapping ACESFilmic` still applied to the final image (confirming `OutputPass` is doing its job).
- Removing `OutputPass` and re-running `tw check` should still say `result: OK` (no exception) but the reported mean pixel brightness will drop noticeably, since the composer's output would then be linear and untonemapped; a text-visible symptom of the classic missing-`OutputPass` mistake, without needing to look at a screenshot.
- `tw lint <dir>` flags an `EffectComposer` chain with no `OutputPass` (`composer-without-output-pass`), which is the static check for the same mistake before ever running the page.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 3, 4, "Composer without OutputPass" and its r155 rule) and checked with `tw check` against this recipe's own page.

---
title: Render on demand
slug: render-on-demand
kind: recipe
summary: Stop rendering 60 times a second for a page that mostly sits still, and only redraw when controls, resize or your own code actually asks for it.
tags: [render on demand, setAnimationLoop, orbitcontrols, performance, frameloop]
applies_to: ">=r175"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/HANDOFF.md]
related: [performance, animation-and-time, resize-and-pixel-ratio]
template: html-importmap
---

# Render on demand

## Goal

A page that mostly sits still (a product viewer, a docs chart, a scroll hero once it settles) should not call `renderer.render()` 60 times a second forever. Render once, then only again when something actually changed: `OrbitControls`' damping firing its `change` event, a resize, or your own code marking the scene dirty.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>render on demand</title>
  <style>
    html, body { margin: 0; height: 100%; background: #16181e; }
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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181e);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.2, 128, 16),
      new THREE.MeshStandardMaterial({ color: 0x3fa7ff, roughness: 0.4 })
    );
    knot.position.y = 0.5;
    scene.add(knot);

    // A page that sits still should not render 60 times a second forever.
    // Render once eagerly, then only again when something actually asked for
    // it: damped controls firing "change", a resize, or an explicit request.
    let needsRender = true;
    function requestRender() { needsRender = true; }

    controls.addEventListener('change', requestRender);
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });

    // Call requestRender() from anywhere else that changes the scene: a
    // loaded model, an animated property, a UI toggle.

    renderer.setAnimationLoop(() => {
      controls.update(); // required for damping; fires 'change' (and so requestRender) while it is still settling
      if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    });
  </script>
</body>
</html>
```

Extending this: any code path that changes what the frame should look like (an animated material property, a loaded asset, a UI toggle, a resize) must call `requestRender()`, or the scene freezes on the last drawn frame. `setAnimationLoop` keeps running every frame either way (a cheap no-op when `needsRender` is false); it is `renderer.render()`, the expensive call, that is gated.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/render-on-demand`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`: `result: OK` with `render calls 1` after settling, confirming only one actual `renderer.render()` call happened even though `setAnimationLoop`'s callback ran on every frame. The page exposes `window.__frameCount()` for this; `tw check <page> --eval "window.__frameCount()"` should read `1` right after load with a static camera and no resize.
- `tw check <page> --eval "renderer.info.render.frame"` rising in step with real screen time (not far faster) confirms the loop itself is not somehow rendering more than once per requested frame.
- A quick way to see it working live: call `window.__requestRender()` from the console (or drag the camera) and watch exactly one more render happen, not a continuous stream.

## Notes

- 2026-09-26: written from the scenarios research (section A1, "render on demand when idle") and checked with `tw check` against this recipe's own page; the WebGPU HANDOFF gotcha (Chromium 141's texture-swizzle failure on the WebGPU backend in this container) does not apply here since this page uses `WebGLRenderer`.

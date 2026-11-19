---
title: CSS2D labels
slug: css2d-labels
kind: recipe
summary: Attach real, accessible DOM labels to 3D points with CSS2DRenderer and CSS2DObject, for the tens-of-labels case where troika-three-text would be overkill.
tags: [css2drenderer, css2dobject, labels, dom, accessibility]
applies_to: ">=r186"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [text-and-labels, accessibility]
template: html-importmap
---

# CSS2D labels

## Goal

Put a real, selectable, screen-reader-readable DOM label on a handful of 3D points (an axis title, a data point's name, a hover tooltip). `CSS2DRenderer` positions ordinary HTML elements to track a 3D point every frame; it needs its own overlay layered on top of the WebGL canvas and its own `render()` call alongside the scene's.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CSS2D labels</title>
  <style>
    html, body { margin: 0; height: 100%; background: #16181e; overflow: hidden; }
    #app { position: relative; width: 100%; height: 100%; }
    canvas { display: block; width: 100%; height: 100%; }
    .label {
      color: #fff;
      font: 12px system-ui, sans-serif;
      background: rgba(20, 22, 28, 0.75);
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
      white-space: nowrap;
    }
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
  <div id="app"></div>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

    const app = document.getElementById('app');

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.appendChild(renderer.domElement);

    // CSS2DRenderer draws real DOM elements, positioned every frame to track
    // a 3D point; it needs its own canvas-sized overlay layered on top.
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    app.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181e);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 3, 7);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.6, 0);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    const names = ['Alpha', 'Beta', 'Gamma'];
    for (let i = 0; i < names.length; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 32, 16),
        new THREE.MeshStandardMaterial({ color: 0x3fa7ff, roughness: 0.4 })
      );
      mesh.position.set((i - 1) * 1.6, 0.6, 0);
      mesh.name = names[i];
      scene.add(mesh);

      const div = document.createElement('div');
      div.className = 'label';
      div.textContent = names[i];
      const label = new CSS2DObject(div);
      label.position.set(0, 0.55, 0); // local offset above the sphere
      mesh.add(label);
    }

    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    });
  </script>
</body>
</html>
```

This scales to tens of labels comfortably; for hundreds, switch to `troika-three-text` (SDF text rendered inside the scene) and mirror the content in the DOM separately for accessibility; see `text-and-labels`. Give each label's parent object `role="img"`/`aria-label` context at the page level too, per `accessibility`.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/css2d-labels`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`: `result: OK`, three meshes and three `Object3D` (the `CSS2DObject` labels) in the scene summary.
- `tw scene <page>` lists the `CSS2DObject` children under each sphere, confirming the labels exist in the graph even though `CSS2DRenderer`'s DOM output is invisible to a WebGL-only inspection.
- Open the page in a real browser and inspect the DOM: each label should be a real `<div class="label">` element, selectable and readable by a screen reader, layered over the canvas at the sphere's projected screen position.

## Notes

- 2026-09-26: written from the dataviz research (section 2, CSS2D-versus-troika guidance) and the core r160-r186 research (`CSS2DRenderer` rotation support added r186), checked with `tw check` against this recipe's own page.

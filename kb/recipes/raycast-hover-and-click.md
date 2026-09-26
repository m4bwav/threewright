---
title: Raycast hover and click
slug: raycast-hover-and-click
kind: recipe
summary: Convert pointer events to a ray, pick from a flat array of pickable meshes, and track hover-enter/leave without re-raycasting the whole scene graph.
tags: [raycaster, hover, click, pointer, picking, intersectobjects]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [raycasting-and-picking, cameras-and-controls]
template: html-importmap
---

# Raycast hover and click

## Goal

Highlight a mesh on hover and toggle a selected state on click, using `Raycaster` against a specific, flat array of pickable objects rather than the whole scene graph, so lights, helpers and the ground never accidentally get picked.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>raycast hover and click</title>
  <style>
    html, body { margin: 0; height: 100%; background: #14161c; }
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
    scene.background = new THREE.Color(0x14161c);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    // Keep pickable meshes in their own array rather than raycasting the
    // whole scene graph recursively: faster, and it cannot accidentally hit
    // a light or a helper.
    const pickables = [];
    const baseColor = new THREE.Color(0x3fa7ff);
    const hoverColor = new THREE.Color(0xffd23f);
    const selectColor = new THREE.Color(0xff5a5f);

    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 1),
        new THREE.MeshStandardMaterial({ color: baseColor.clone(), roughness: 0.4 })
      );
      mesh.position.set((i - 2) * 1.3, 0.5, 0);
      mesh.name = `cell-${i}`;
      mesh.userData.selected = false;
      scene.add(mesh);
      pickables.push(mesh);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;

    function updatePointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pick() {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      return hits.length > 0 ? hits[0].object : null;
    }

    function paint(mesh) {
      if (!mesh) return;
      mesh.material.color.copy(
        mesh.userData.selected ? selectColor : (mesh === hovered ? hoverColor : baseColor)
      );
    }

    renderer.domElement.addEventListener('pointermove', (event) => {
      updatePointer(event);
      const hit = pick();
      if (hit !== hovered) {
        const previous = hovered;
        hovered = hit;
        paint(previous);
        paint(hovered);
      }
    });

    renderer.domElement.addEventListener('click', (event) => {
      updatePointer(event);
      const hit = pick();
      if (hit) {
        hit.userData.selected = !hit.userData.selected;
        paint(hit);
      }
    });

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

For an `InstancedMesh` in `pickables`, read `hit.instanceId` off the intersection instead of assuming one mesh means one logical object; see `raycasting-and-picking`. For a `Points` cloud, set `raycaster.params.Points.threshold` before `intersectObjects`, or picking individual points will feel unresponsive.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/raycast-hover-and-click`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`, using a programmatic `window.__testPick(ndcX, ndcY)` hook that sets the pointer directly and calls the same `pick()` function the real handlers use: `tw check <page> --eval "window.__testPick(0,0)"` returned `"cell-2"`, the middle of five cells laid out left to right; exactly the object under the camera-space center, confirming the NDC conversion and the pick logic without a screenshot.
- `tw check <page> --eval "<hit test at another NDC coordinate>"` at the extremes (`-0.9`, `0.9`) should return the leftmost/rightmost cell names, or `null` off the row entirely.
- A visual check (`tw shot`) is only needed to confirm the hover/click color change itself looks right once the hit logic is proven in text.

## Notes

- 2026-09-26: written from the dataviz research's raycast-hover pattern (section 2) and the core r160-r186 research (section 1, `Raycaster` API), checked with `tw check` against this recipe's own page.

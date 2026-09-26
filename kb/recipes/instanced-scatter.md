---
title: Instanced scatter
slug: instanced-scatter
kind: recipe
summary: Scatter thousands of objects with one geometry, one material and one draw call using InstancedMesh, placed with a seeded PRNG so the layout is reproducible.
tags: [instancedmesh, scatter, performance, draw calls, seeded randomness]
applies_to: ">=r162"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-games.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [performance, seeded-randomness, memory-and-disposal]
template: html-importmap
---

# Instanced scatter

## Goal

Place thousands of copies of one shape (rocks, bolts, grass, crowd stand-ins) without paying one draw call per copy. `InstancedMesh` renders every instance in a single draw call from one shared geometry and material; per-instance transform and color come from small buffers you fill once.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>instanced scatter</title>
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
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    const COUNT = 2000;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14161c);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 30, 45);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // One geometry, one material, one draw call for every instance: the
    // whole point of InstancedMesh over COUNT separate Mesh objects.
    const geometry = new THREE.IcosahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
    const field = new THREE.InstancedMesh(geometry, material, COUNT);
    field.name = 'scatter';

    // Deterministic placement: a seeded PRNG (mulberry32), never Math.random(),
    // so the layout is reproducible for a screenshot diff or a rebuild.
    // See the seeded-randomness recipe for the full pattern.
    function mulberry32(seed) {
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(1);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const radius = 20 * Math.sqrt(rand()); // sqrt for a uniform disc, not a center-heavy one
      const angle = rand() * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, rand() * 2, Math.sin(angle) * radius);
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      dummy.scale.setScalar(0.4 + rand() * 1.2);
      dummy.updateMatrix();
      field.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.55 + rand() * 0.15, 0.5, 0.35 + rand() * 0.3);
      field.setColorAt(i, color);
    }
    field.instanceMatrix.needsUpdate = true;
    field.instanceColor.needsUpdate = true;
    scene.add(field);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(15, 25, 10);
    scene.add(sun);

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

If the instances need per-instance change later (a hit reacting, one bolt highlighted), keep updating just that row: `field.setColorAt(i, newColor); field.instanceColor.needsUpdate = true;` rather than rebuilding the whole buffer. For instances with different geometry (not just different transforms), use `BatchedMesh` instead; see `performance`.

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/instanced-scatter`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`: `result: OK`, `draw calls 1`, `instances 2000` in the scene summary; one draw call for all 2000 icosahedra.
- `tw check <page> --eval "renderer.info.render.calls"` should read a small number (1 for this page) regardless of `COUNT`; if it scales with the instance count, something regressed to one mesh per instance.
- `tw scene <page>` shows the single `InstancedMesh` node with its instance count rather than thousands of `Mesh` entries.

## Notes

- 2026-09-26: written from the games research (section 3.2, InstancedMesh guidance) and checked with `tw check` against this recipe's own page.

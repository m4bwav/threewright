---
title: Fit camera to object
slug: fit-camera-to-object
kind: recipe
summary: Frame any camera to any object's world-space bounding box, so a loaded model of unknown size always lands nicely in view.
tags: [box3, camera, fit, framing, bounding box, orbitcontrols]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [cameras-and-controls, load-gltf-with-decoders]
template: html-importmap
---

# Fit camera to object

## Goal

Frame a camera to whatever an object's actual size and position turn out to be, from a computed world-space bounding box, instead of a hand-picked distance that only happens to work for one model. Works the same for a hand-built group and for a just-loaded glTF of unknown scale.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>fit camera to object</title>
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
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181e);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Frame any camera to any object's world-space bounding box: works for a
    // loaded glTF just as well as for a hand-built group, since it reads
    // geometry, not assumptions about the model's own scale or origin.
    function fitCameraToObject(camera, object, controls, { offset = 1.25 } = {}) {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxSize = Math.max(size.x, size.y, size.z);
      const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

      const direction = new THREE.Vector3(1, 0.6, 1).normalize();
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.near = distance / 100;
      camera.far = distance * 100;
      camera.updateProjectionMatrix();

      if (controls) {
        controls.target.copy(center);
        controls.update();
      } else {
        camera.lookAt(center);
      }
    }

    // A group with an off-center, oddly-scaled child, standing in for a loaded
    // model whose exact size and origin the camera code should not need to know.
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.6, 2.4, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x3fa7ff, roughness: 0.4 })
    );
    body.position.set(3, 5, -1);
    body.rotation.z = Math.PI / 2;
    group.add(body);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xff7a3f, roughness: 0.5 })
    );
    cap.position.set(5.4, 5, -1);
    cap.rotation.z = -Math.PI / 2;
    group.add(cap);
    group.name = 'target';
    scene.add(group);

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(4, 6, 3);
    scene.add(sun);

    fitCameraToObject(camera, group, controls);

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

For a `GLTFLoader` result, call `fitCameraToObject(camera, gltf.scene, controls)` inside the loader's success callback, after adding the scene to your own scene graph (`Box3.setFromObject` needs world matrices, so call it after the object has a parent, not before).

## Verify

- Checked 2026-09-26 with `node scripts/tw.mjs check` against this exact page (served from `/tmp/claude-0/kbcheck/fit-camera-to-object`), pinned to `three@0.186.1` on jsDelivr with CDN files served from `node_modules`: `result: OK`, and the reported `bounds:` (`center 3.6,5,-1 size 4.8,1.8,1.8`) matches the deliberately off-center, oddly-scaled group, with the camera ending up well outside it and pointed at its center rather than the origin.
- `tw check <page> --eval "camera.position.distanceTo(controls.target)"` gives the actual fit distance; compare it against the object's bounding-box diagonal to sanity-check the `offset` multiplier.
- `tw sheet <page>` (front, right, top and current views) is the fastest visual confirmation that the object is centered and not clipped by `near`/`far` from any angle.

## Notes

- 2026-09-26: written from general `Box3`/`PerspectiveCamera` API in the installed three 0.186.1 and checked with `tw check` against this recipe's own page.

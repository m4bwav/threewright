---
title: TSL loom warp (far landmarks loom at full height)
slug: tsl-loom-warp
kind: recipe
summary: A positionNode that compresses horizontal distance past a radius around the player but keeps height, so far landmarks loom; shadows, physics and picking see the unwarped world.
tags: [tsl, positionNode, vertex-displacement, world-bending, landmarks, art-direction]
applies_to: ">=r171"
status: current
renderer: webgpu
last_verified: 2026-11-10
sources: [https://www.reddit.com/r/aigamedev/comments/1wqawdv/]
related: [tsl, tsl-custom-material, materials]
template: html-webgpu
---

# TSL loom warp

## Goal

Make distant landmarks read as big without moving them. Past a radius `R` around the player, every vertex keeps its height and its direction from the player, but its horizontal distance `r` becomes `R + k * ln(1 + (r - R) / k)`. The curve has slope 1 at `R`, so nothing kinks at the boundary, and it grows slowly after it, so a 50 m tower 400 m away is drawn as if it stood much closer. The warp depends only on the player's position, so turning the camera does not change it. Idea from u/yaosio's demo on r/aigamedev (2026-09); the demo had no licence, so this formula and code are threewright's own.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TSL loom warp</title>
  <style>
    html, body { margin: 0; height: 100%; background: #9fb8cf; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.tsl.js"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three/webgpu';
    import { Fn, float, length, log, max, modelWorldMatrix, modelWorldMatrixInverse, positionLocal, uniform, vec2, vec3, vec4 } from 'three/tsl';

    const renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    await renderer.init();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fb8cf);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 1.7, 0);
    camera.lookAt(0, 6, -100);
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x445533, 2.5));

    // Loom warp: past radius R from the player, horizontal distance r becomes R + k*ln(1 + (r - R)/k).
    // Slope 1 at R (no kink), so far things come closer while their height is kept: they loom.
    const player = uniform(new THREE.Vector2(0, 0));
    const R = uniform(40), k = uniform(60); // k = 1e6 is effectively off
    const loom = Fn(() => {
      const world = modelWorldMatrix.mul(vec4(positionLocal, 1)).xyz;
      const d = world.xz.sub(player);
      const r = max(length(d), 1e-4);
      const past = max(r.sub(R), 0);
      const r2 = R.add(k.mul(log(float(1).add(past.div(k))))).min(r);
      const xz = player.add(d.mul(r2.div(r)));
      return modelWorldMatrixInverse.mul(vec4(xz.x, world.y, xz.y, 1)).xyz;
    });
    const warped = (hex) => { const m = new THREE.MeshStandardNodeMaterial({ color: hex }); m.positionNode = loom(); return m; };

    // The ground needs vertices to bend: a dense plane, not a 1x1 quad.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200, 240, 240).rotateX(-Math.PI / 2), warped(0x6f8a4f));
    scene.add(ground);
    const towerGeo = new THREE.BoxGeometry(6, 50, 6).translate(0, 25, 0);
    for (const [x, z] of [[0, -400], [-60, -200], [70, -120], [-25, -60]]) {
      const t = new THREE.Mesh(towerGeo, warped(0xb8743f));
      t.position.set(x, 0, z);
      t.frustumCulled = false; // its bounds are unwarped; culling would test the wrong place
      scene.add(t);
    }
    window.loom = { player, R, k }; // tw check --eval "loom.k.value = 1e6" shows the unwarped view

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    renderer.setAnimationLoop(() => {
      player.value.set(camera.position.x, camera.position.z);
      renderer.render(scene, camera);
    });
  </script>
</body>
</html>
```

Every material that should bend needs the same `positionNode`; a mesh left on a plain material stays put and will float or sink against the warped ground. Ground needs vertex density (here 5 m quads) or it cannot curve.

## Verify

- Checked 2026-11-10 on the real WebGPU backend (Windows 11, Chrome headless, RTX 5060 Ti): `node scripts/tw.mjs check <page> --webgpu` gives `result: OK`, `renderer: WebGPURenderer (WebGPU)`, 6 draw calls; `tw lint` 0 errors. Two `tw shot`s were looked at, warp on and `--eval "loom.k.value = 1e6"` (off): the 400 m tower is about 2.5 times taller on screen with the warp, the nearer ones grow less, and every tower keeps its horizontal screen position (same direction from the player).
- Unverified: a 360 degree yaw sweep and a moving player. Both should hold because the warp is radial around `player`, but they were not measured.

## Notes

- Caveats. Shadow maps, raycasting, physics and audio all use the unwarped positions: a click ray hits where the tower really is, not where it is drawn. Pick against warped geometry by warping the ray instead (or accept the mismatch for far, non-interactive scenery). Shadows are drawn by the warped material only if the shadow pass uses the same `positionNode`; check with `tw shot`.
- Bounds and culling use the unwarped geometry, so a warped mesh can be culled while visible: set `frustumCulled = false` on warped landmarks or enlarge their bounding sphere, and keep `camera.far` beyond the unwarped distance.
- Pick `R` beyond where the player interacts (here 40 m) so nothing the player touches is warped. A smaller `k` compresses harder.
- 2026-11-10: added from the technique harvest (post 1wqawdv); WebGL 2 fallback not checked.

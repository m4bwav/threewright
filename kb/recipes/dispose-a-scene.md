---
title: Dispose a scene
slug: dispose-a-scene
kind: recipe
summary: Walk a scene graph and dispose every geometry, material and texture, then confirm renderer.info.memory returns to baseline across repeated swaps.
tags: [dispose, memory, leak, traverse, renderer.info]
applies_to: r186
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [memory-and-disposal, loaders-and-assets]
template: html-importmap
---

# Dispose a scene

## Goal

Free every GPU resource a scene (or a subtree, such as a swapped-out model) held, not just remove it from the graph. `scene.remove()` alone leaves geometries, materials and textures allocated; this walks the subtree and disposes each one exactly once, then proves the cleanup worked by watching `renderer.info.memory` return to baseline.

## Code

```js
import * as THREE from 'three';

function disposeObject(root) {
  const disposedTextures = new Set();
  const disposedMaterials = new Set();

  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material || disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);

      for (const key in material) {
        const value = material[key];
        if (value && value.isTexture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      }
      material.dispose();
    }

    // r186: Object3D.dispose() fires a 'dispose' event (WebGPURenderer drops its
    // render objects on it); InstancedMesh and BatchedMesh override it to free
    // their own buffers. It never disposes geometry, material or textures.
    if (typeof node.dispose === 'function') node.dispose();
  });

  root.removeFromParent();
}

// Usage: swap out an old model for a new one without leaking the old one's GPU memory.
function swapModel(newRoot) {
  const old = scene.getObjectByName('model');
  if (old) disposeObject(old);
  newRoot.name = 'model';
  scene.add(newRoot);
}
```

Share resources (an environment texture, a material reused across many meshes) through one variable and dispose that variable once at teardown, not once per mesh that referenced it; `disposeObject` above already guards against double-disposing the same material or texture within one call, but two separate calls on two objects that share a texture will each try to dispose it; track shared resources outside this helper if that applies.

## Verify

- Take the baseline after the first render of a lit material, not before it. In r186 `WebGLRenderer` creates one shared DFG lookup texture for physically based materials the first time it renders one (`getDFGLUT()` in `WebGLRenderer.js`) and keeps it, so `renderer.info.memory.textures` reads 1 with an empty scene from then on. That texture is not a leak.
- `tw check <page> --eval "cycle(5)"`, where the page's `cycle(n)` disposes the current model, reads `renderer.info.memory`, swaps in a new model n times with `swapModel()`, then calls `disposeObject()` on the last one: `geometries` and `textures` must return to the baseline and stay flat across the swaps. A number that stays high after disposal means a reference (a texture still assigned, a resource shared with something still in the scene) keeps it alive.
- `tw scene <page>` after a swap should show one `Group "model"` with the same children as before, so nothing extra survived into the graph.
- Verified 2026-09-26 on Windows 11, Chrome 153 headless, RTX 5060 Ti (WebGL), three 0.186.1 from node_modules. Harness: the recipe code unchanged plus a model of three boxes, each with its own `MeshStandardMaterial` and a 2x2 `DataTexture` used as `map` and `roughnessMap`. `tw check --eval "cycle(5)"` printed `before: geo 3 tex 4 | baseline: geo 0 tex 1 | added 0..4: geo 3 tex 4 | after dispose: geo 0 tex 1` and `result: OK`. `tw lint` found 0 errors and 0 warnings. The `tw shot` showed the three textured boxes.

## Notes

- 2026-09-26: written from the core r160-r186 research (section 6, `Object3D.dispose()` new in r186) and the scenarios research (section B5, the `renderer.info.memory` leak-detection pattern), checked against `node_modules/three/src/core/Object3D.js` in the installed 0.186.1.
- 2026-09-26: ran it (see Verify). Memory returned to baseline across five swaps. Added the DFG lookup texture caveat, since a baseline read before the first PBR render is off by one texture. Corrected the `Object3D.dispose()` comment: in r186 the base method only fires the `dispose` event; InstancedMesh and BatchedMesh override it.

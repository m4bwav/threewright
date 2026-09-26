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

    // r186: disposes the object's own GPU resources too, and fires a 'dispose'
    // event. It does not reach into geometry/material/texture disposal itself.
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

- `tw check <page> --eval "JSON.stringify(renderer.info.memory)"` before adding a model, right after adding it, and right after `disposeObject()` removes it: the third reading should match the first (baseline), confirming nothing leaked. A number that stays elevated after disposal means some reference (a still-assigned texture, a resource shared with something still in the scene) is keeping it alive.
- Repeat the add/dispose cycle several times in one `--eval` call and confirm `info.memory.geometries`/`textures` stay flat across cycles rather than climbing; this is the actual leak-detection test, not a single before/after snapshot.
- `tw scene <page>` after a swap-and-dispose cycle should show the same shape and counts as before the cycle started, confirming nothing extra survived into the visible graph either.

## Notes

- 2026-09-26: written from the core r160-r186 research (section 6, `Object3D.dispose()` new in r186) and the scenarios research (section B5, the `renderer.info.memory` leak-detection pattern), checked against `node_modules/three/src/core/Object3D.js` in the installed 0.186.1.

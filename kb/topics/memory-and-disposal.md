---
title: Memory and disposal
slug: memory-and-disposal
kind: topic
summary: What needs dispose() when you remove it, the new Object3D.dispose() in r186, and how to catch a leak in text before it shows up as a crash.
tags: [dispose, memory, leak, geometry, texture, render target, renderer.info]
applies_to: ">=r186"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-games.md]
related: [dispose-a-scene, performance, loaders-and-assets]
template: html-importmap
---

# Memory and disposal

## Essentials

- Three.js does not garbage-collect GPU resources for you. Removing a mesh from the scene graph frees the JS object but not the geometry, material, textures or render targets it referenced; each of those needs its own `.dispose()` call when you are done with it.
- What needs disposal, on teardown or whenever you stop using it: `BufferGeometry.dispose()`, `Material.dispose()` (each material, if a mesh has an array of them), every `Texture.dispose()` a material references (`map`, `normalMap`, `envMap`, ...), `WebGLRenderTarget.dispose()` (or the WebGPU render target equivalent), and the renderer itself (`renderer.dispose()`) if the whole app is tearing down. Shared resources (an environment texture, a material reused across many meshes) should be disposed once, not once per mesh that used them.
- `Object3D.dispose()` is new in r186: it disposes the object's own GPU resources and fires a `dispose` event, but it does not reach into geometry, material or texture disposal for you — those still need their own calls. A custom `Object3D` subclass that overrides `dispose()` must call `super.dispose()` or its own `dispose` event never fires.
- Reuse over dispose-and-recreate where you can: share one material across many meshes, share one geometry across an `InstancedMesh`, cache a loaded texture instead of reloading it. Fewer unique resources means less to dispose and less GPU memory pressure in the first place.
- Measure instead of guessing: `renderer.info.memory.geometries` and `renderer.info.memory.textures` (WebGLRenderer) report live counts. A number that keeps climbing across scene swaps that should return to the same baseline is a leak; a number that returns to baseline after disposal confirms the cleanup worked.

## Pitfalls

- Removing a mesh (`scene.remove(mesh)`) and assuming that is disposal: it is not. The geometry, material and any textures stay allocated on the GPU until you call `.dispose()` on each of them, which is why `renderer.info.memory` keeps rising across repeated add/remove cycles that never call dispose.
- Disposing a shared resource once per mesh instead of once overall: harmless the first time (dispose is idempotent-ish per instance) but wasted work, and a sign the resource should have been shared through one variable rather than re-created per mesh.
- Forgetting render targets: post-processing chains, PMREM generators, and reflection/portal setups all allocate `WebGLRenderTarget`s that need `.dispose()` on teardown just like geometries and textures do.
- Subclassing `Object3D` and overriding `dispose()` without calling `super.dispose()`: the object's own `dispose` event (new r186) silently never fires, which breaks any code that listens for it to do its own cleanup.
- Disposing a texture that is still assigned as a material's `map` and then rendering again: the texture is gone from the GPU but the material still references it, producing a black or missing texture rather than a clear error. Null out the reference or dispose the material's textures as part of disposing the material.

## Verify

- `tw check <page> --eval "JSON.stringify(renderer.info.memory)"` across repeated scene swaps: a number that returns to the same baseline after cleanup means disposal worked; one that keeps rising means something is not being disposed. This is the recipe in `dispose-a-scene`.
- `tw scene <page>` after a swap-and-return cycle should show the same shape and counts as before the cycle if nothing leaked into the visible graph.
- `tw lint <dir>` cannot see a missing `.dispose()` call statically (it is a runtime behavior, not a stale API), so the `renderer.info` check above is the primary verification for this topic.

## Notes

- 2026-09-26: written from the core r160-r186 research (section 6, `Object3D.dispose()`) and the scenarios research (section B5, `renderer.info` fields and the leak-detection pattern), checked against `node_modules/three/src/core/Object3D.js` in the installed 0.186.1.

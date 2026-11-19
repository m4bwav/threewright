---
title: Architecture, BIM and CAD
slug: architecture-bim-cad
kind: scenario
summary: Convert IFC to Fragments offline, never in the browser; instance and merge by material, and rebase coordinates for georeferenced models.
tags: [bim, ifc, cad, architecture, digital twin, that open, fragments, walkthrough]
applies_to: ">=r167"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [three-mesh-bvh, performance, renderer-choice, memory-and-disposal]
template: html-importmap
---

# Architecture, BIM and CAD

## When

- A BIM model (IFC) needs to render in a browser walkthrough, viewer, or digital twin, with clipping planes, measurement and property lookup.
- A real-estate walkthrough or photoreal interior needs baked lighting or a Gaussian-splat capture, rather than a fully real-time-lit CAD scene.
- A CAD model (STEP or similar) needs to reach the web; that conversion happens offline, not in three.js itself.

## Stack

- That Open Engine is the current BIM stack on three.js: `web-ifc` (WASM IFC read and write), `@thatopen/components` (BIM toolkit built on three.js), `@thatopen/fragments` (Fragments 2, a FlatBuffers-based format). That Open's own claim: a 2 GB IFC becomes about 80 MB of Fragments and loads over 10x faster, with worker-based loading (vendor claim, unverified independently).
- Real estate and photoreal interiors: baked lighting in Blender exported as a GLB with lightmaps, or a Gaussian-splat capture of the space (see the `splat-scenes` scenario).
- CAD (STEP and similar): convert to glTF offline, for example with an OpenCascade-based tool (`occt-import-js` is a common WASM option, unverified maturity). Never parse a CAD-native format in the browser.
- Digital twins: stream sensor data over WebSocket and update per-instance colors on an `InstancedMesh`, not swap materials per update.
- `WebGLRenderer` is the default renderer: BIM models have many unique meshes and materials, and `WebGPURenderer`'s material and pipeline initialization is measured 16x to 36x slower in that situation (an open three.js issue). Clipping and precise picking are also more mature on the WebGL path today.

## Build

- No dedicated template exists for this scenario. Start from `tw new html-importmap <dir>` and add `web-ifc`/`@thatopen/components` for BIM, or a plain `GLTFLoader` pipeline for a pre-converted CAD or architectural model.
- Convert IFC to Fragments ahead of time on a server or in a build step; do not parse a multi-hundred-MB IFC file in the user's browser.
- Instance and merge by material: BIM models have huge repeated element counts (bolts, panels, fixtures), so `InstancedMesh` or merged geometry per material is the difference between a usable and an unusable frame rate.
- Add clipping planes, a section box, a measurement tool, and property lookup by expressID as the BIM-specific interaction layer on top of the loaded Fragments.
- Walkthrough navigation: pointer lock or click-to-teleport, with collision against a simplified proxy mesh via `three-mesh-bvh` rather than the full render geometry.

## Pitfalls

- Float precision far from the origin, especially with georeferenced BIM models tied to real-world coordinates: rebase to a local origin the same way the geospatial scenario does.
- Memory blowups from per-element meshes: a naive "one mesh per IFC element" load can produce tens of thousands of draw calls; merge or instance by material before shipping a viewer.
- IFC files with broken or non-manifold geometry are common in the wild; validate and, where possible, repair during the offline conversion step rather than debugging it live in the browser.
- Parsing a large IFC or CAD file directly in the browser (skipping the offline conversion step) is the single most common way this scenario becomes unusably slow or crashes the tab.

## Verify

- `tw check <page>` is `result: OK`; watch the draw-call and triangle counts in its scene summary specifically, since BIM models are the scenario most likely to blow past a sane budget from unmerged per-element meshes.
- `tw glb <model>` (or the Fragments-equivalent inspection tool) before shipping a converted asset, to confirm the offline conversion actually reduced size and draw calls as expected.
- `tw shot <page> --size 960x540` for a framing check after adding clipping planes or a section box; confirm the clip actually hides the intended geometry rather than clipping the whole scene.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A3). That Open's compression and load-time claims are vendor-stated and were not independently re-verified; `occt-import-js`'s maturity is unverified.

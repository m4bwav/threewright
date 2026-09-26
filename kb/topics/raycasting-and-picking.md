---
title: Raycasting and picking
slug: raycasting-and-picking
kind: topic
summary: Screen-to-ray conversion, hover and click picking, and the InstancedMesh and Points cases that need extra care.
tags: [raycaster, picking, hover, click, intersectobjects, instancedmesh]
applies_to: ">=r162"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [raycast-hover-and-click, cameras-and-controls, instanced-scatter]
template: html-importmap
---

# Raycasting and picking

## Essentials

- `Raycaster.setFromCamera(ndcCoords, camera)` builds a ray from a `PerspectiveCamera` or `OrthographicCamera` through a point in normalized device coordinates (`-1..1` on both axes, not pixels), then `raycaster.intersectObjects(objects, recursive)` returns hits sorted nearest-first, each with `distance`, `point`, `face`, `object` and, for indexed geometry, `faceIndex`.
- Convert a pointer/mouse event to NDC yourself: `x = (event.clientX / rect.width) * 2 - 1`, `y = -(event.clientY / rect.height) * 2 + 1`, using the canvas's own bounding rect, not `window.innerWidth`/`innerHeight`, so picking still lines up when the canvas is not full-viewport.
- Pass a specific array of pickable objects to `intersectObjects`, not `scene.children` with `recursive: true` over the whole graph, when the scene has helpers, lights or UI meshes you never want to pick; keeping a flat `pickables` array is both faster and avoids picking a light's helper mesh by accident.
- `InstancedMesh` raycasting hits work and return `intersection.instanceId`, the index of the specific instance hit, in addition to the usual fields; use it to know which instance to highlight or act on, not just that the `InstancedMesh` as a whole was hit.
- `Points` raycasting needs `raycaster.params.Points.threshold` set to a sensible screen-space-ish distance (default is small); without it, picking individual points in a scatter is unreliable because the default threshold assumes tightly packed points.
- Hover state needs its own bookkeeping: raycast every pointer move (or on a throttled interval), compare the top hit's `object` (or `instanceId`) against the previously hovered one, and only fire enter/leave logic on a change, the same pattern as DOM `mouseenter`/`mouseleave`.

## Pitfalls

- Using client pixel coordinates directly instead of converting to NDC: every pick lands in the wrong place, usually clustered toward one corner.
- Raycasting the whole scene graph recursively when only a handful of meshes should be pickable: unnecessary intersection tests against lights, helpers, ground planes and UI overlays, and a wrong hit if one of those overlaps the real target.
- Forgetting `raycaster.params.Points.threshold` for a `Points` cloud: hover and click feel unresponsive because the ray almost never actually crosses a point-sized target at default settings.
- Picking an `InstancedMesh` and using `intersection.object` alone to decide what was hit: that is always the one `InstancedMesh`; the specific instance is `intersection.instanceId`.
- Raycasting every frame in `setAnimationLoop` instead of only on pointer events: wasted CPU on a scene that otherwise renders on demand (see `render-on-demand`), and a reason to gate the raycast to `pointermove`/`click` handlers instead.

## Verify

- `tw check <page> --eval "<js that raycasts and returns the hit>"` lets you confirm a specific pick resolves to the expected object or `instanceId` without a screenshot.
- `tw scene <page>` confirms which meshes actually exist in the array you intersect, catching a stale `pickables` list that still references a removed object.
- A visual check (`tw shot`) is only needed to confirm the hover/click highlight itself looks right once the hit logic is proven in text.

## Notes

- 2026-09-26: written from the core r160-r186 research (section 1, `Raycaster.setFromXRController()` added r162) checked against `node_modules/three/src/core/Raycaster.js` in the installed 0.186.1, and the dataviz research's raycast-tooltip guidance for scatter and network views.

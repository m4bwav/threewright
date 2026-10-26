---
title: Transparency and blending
slug: transparency-and-blending
kind: topic
summary: Pick the transparency by its cause (coverage, transmission, glow) before touching transparent: alphaTest, alphaHash, alphaToCoverage, transmission, additive blending, and the sorting traps.
tags: [transparency, alpha, alphatest, alphahash, alphatocoverage, transmission, blending, sorting, depthwrite, foliage, glass, particles]
applies_to: ">=r162"
status: current
renderer: both
last_verified: 2026-10-25
sources: [ai-docs/research/2026-10-25-books-graphics.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/src/materials/Material.js]
related: [materials, post-processing, models-for-the-web, performance]
---

# Transparency and blending

## Essentials

- Name the cause before choosing a setting. Three different things look "see-through" and each has its own tool:
  - **Coverage**: the surface is solid where it exists and absent elsewhere (leaf cards, grass, fences, lace, hair cards, decals with a cut-out shape). Use `alphaTest` (for example `0.5`), which discards pixels below the threshold and needs no sorting. With `antialias: true` on `WebGLRenderer`, add `alphaToCoverage = true` to smooth the cut edges (the material docs say it only works on an MSAA context). `alphaHash = true` discards against a random threshold instead: soft fades without sorting, at the cost of grain (TAA hides it).
  - **Transmission**: light passes through a volume (glass, water, gems, thick plastic). Use `MeshPhysicalMaterial` with `transmission` (keep `opacity` at 1, as the docs ask), `thickness`, and for tinted glass `attenuationColor` with `attenuationDistance`: white light becomes `attenuationColor` after travelling `attenuationDistance` world units, so thicker parts come out deeper and more saturated, thin edges paler. Transmission renders through its own pass and needs no `transparent` flag.
  - **Glow**: light is added, nothing is hidden (sparks, fire, beams, magic). Use `blending: THREE.AdditiveBlending` with `depthWrite: false`; order no longer matters because addition is commutative. Bloom belongs only on the brightest pixels, not on every glowing card.
- Only real partial cover (smoke, a fading object, a tinted window pane drawn as a flat card) needs `transparent: true` with `opacity` or an alpha map. That path is the one with sorting problems below.
- On `WebGPURenderer`, r186 has order-independent transparency as a pass (`oitPass` from `three/addons/tsl/display/OITPassNode.js`, see `post-processing`), which removes most sorting faults at a cost per frame.

## Pitfalls

- three sorts transparent objects per object, by `renderOrder` and then by the depth of each object's centre (`reversePainterSortStable` in `WebGLRenderLists.js`, r186), never per triangle. Two transparent meshes that cross, or one concave transparent mesh (a glass bowl, a hollow sphere), draw in the wrong order from some angles. Split the mesh, set `renderOrder`, use coverage or transmission instead, or the WebGPU OIT pass.
- Blended leaf, grass and fence cards: they flicker and swap order as the camera moves. They are coverage, so `alphaTest` (plus `alphaToCoverage` with MSAA) fixes them and drops the sorting cost. `tw glb` warns on glTF materials that are both `BLEND` and double-sided for this reason.
- Particles or smoke cards with `depthWrite` left on hide each other in square blocks. Set `depthWrite: false` on soft transparent cards and keep `depthTest` on so walls still hide them.
- Dark or light fringes round soft-edged PNG cut-outs come from colour bleeding in from the transparent pixels when the texture is filtered. Paint the transparent pixels with the edge colour (dilate) or use premultiplied alpha (`material.premultipliedAlpha = true` with a premultiplied texture).
- Soft cards that cut straight lines where they meet a floor or a wall look cheap; fade the card's alpha near the geometry behind it (soft particles: compare the card's depth with the scene depth in the shader) or keep cards away from surfaces.
- `alphaToCoverage` on a renderer created without `antialias: true`, or inside an `EffectComposer` chain whose targets have no samples, does nothing visible.

## Verify

- `tw glb model.glb` reports `alphaModes` and warns on materials that are `BLEND` and double-sided.
- `tw sheet <page> --sweep` (or several `tw shot --eval` camera positions) shows sorting faults: they appear only from some angles, so one shot proves nothing.
- `tw lint <dir>` flags an `EffectComposer` without MSAA or an AA pass (`composer-without-aa`), which also turns `alphaToCoverage` off in effect.

## Notes

- 2026-10-25: written from Computer Graphics: Principles and Practice 3e (§14.10 on transparency and transmission, §17.4 on compositing and premultiplied alpha, §14.7.3 on sorting) through the round 2 books track; every API name checked in the installed three 0.186.1 source (`Material.js` alphaHash, alphaToCoverage, premultipliedAlpha; `MeshPhysicalMaterial.js` transmission, thickness, attenuationColor, attenuationDistance; `WebGLRenderLists.js` sort). Not run in a page yet.

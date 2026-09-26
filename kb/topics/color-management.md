---
title: Color management
slug: color-management
kind: topic
summary: Color space tags for renderer output and textures, tone mapping, and the light-intensity change that makes old scenes look wrong.
tags: [color space, srgb, tone mapping, colorManagement, texture, encoding, gltf]
applies_to: ">=r152"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/color-management.html]
related: [lighting-and-shadows, materials, environment-lighting]
template: html-importmap
---

# Color management

## Essentials

- `ColorManagement.enabled` defaults to `true` since r152: hex and CSS colors you write in JS (`0xff0000`, `'red'`) are treated as sRGB and converted to the internal linear working color space automatically. You do not manage this yourself.
- `renderer.outputColorSpace` defaults to `SRGBColorSpace`, which is almost always correct for a screen. It replaced `outputEncoding` (removed r162; the constant `sRGBEncoding` no longer exists).
- Textures need a color space tag on the object, not the renderer: set `texture.colorSpace = THREE.SRGBColorSpace` on any color texture you load by hand (`map`, `emissiveMap`). Leave data textures untagged (`NoColorSpace`, the default): normal maps, roughness, metalness, AO. `GLTFLoader` tags base color and emissive maps as `SRGBColorSpace` itself; `CubeTextureLoader` returns sRGB since r153; `HDRLoader` and `EXRLoader` return `LinearSRGBColorSpace` (HDR/EXR data is already linear).
- Tone mapping (`renderer.toneMapping`) is separate from color space: `NoToneMapping` (default, `exposure` 1), `LinearToneMapping`, `ReinhardToneMapping`, `CineonToneMapping`, `ACESFilmicToneMapping`, `AgXToneMapping` (r160), `NeutralToneMapping` (Khronos PBR Neutral, r162 WebGL / r166 WebGPU). Since r155, inline tone mapping only applies when rendering to the screen, not to render targets, so an `EffectComposer` chain is linear and untonemapped unless `OutputPass` is the last pass.
- Physical light units only: `physicallyCorrectLights` was removed in r160 and `useLegacyLights` in r165. `PointLight`/`SpotLight` intensity is candela and `decay` defaults to 2 (inverse-square, since r147). A scene tuned for the pre-r155 legacy mode renders about pi times darker; multiply ambient, hemisphere, directional, point and spot intensities by `Math.PI` when porting one forward (point and spot lights often need much larger values again because of the decay change).

## Pitfalls

- Loading a JPEG or PNG color map with plain `TextureLoader` and never setting `colorSpace`: since r152 textures default to `NoColorSpace`, so the image looks washed out and flat, not just "a bit off". `tw lint` flags a `map`/`emissiveMap` assignment from `TextureLoader` with no `SRGBColorSpace` nearby.
- Double-correcting: code that still does its own gamma correction (a leftover `pow(color, 1/2.2)` in a shader, or a lingering `gammaFactor` assignment) on top of the renderer's own sRGB output looks washed out in the other direction. `gammaFactor`, `gammaOutput` and `gammaInput` were removed in r112/r136 and have no effect if somehow still present; delete them.
- `EffectComposer` without `OutputPass`: the composer output stays in the linear working space with no tone mapping applied, so colors look dim and the tone-mapping curve you set is invisible. Add `new OutputPass()` as the last pass.
- Porting an old scene's light intensities unchanged: they will look about 3x too dim (the PI factor) and light falloff will be much faster (decay 2 instead of 1), which reads as "the room looks unlit" rather than "the lights are the wrong brightness". See `recipes/upgrade-an-old-project`.
- `CanvasTexture` used for color content (a canvas-drawn label or UI element used as `map`) needs `colorSpace = THREE.SRGBColorSpace` too, the same as any other color texture; it is easy to forget because it is not loaded through `TextureLoader`.

## Verify

- `tw check <page>` reports a `pixels:` line with mean brightness; a scene with `pixels: ... almost black` alongside the runtime warning `lit materials but no lights and no scene.environment` points at a lighting problem, not a color-space one (see `lighting-and-shadows`).
- `tw lint <dir>` runs the `composer-without-output-pass` rule from `kb/rules/lint-rules.json`, which fires on the second mistake. No lint rule catches a colour texture left without `SRGBColorSpace` (it is a runtime property); `tw scene <page>` shows it instead: each material's map prints as `map:<kind>/<colorSpace>`, so a colour map reading `NoColorSpace` or `srgb-linear` is the bug.
- `tw check <page> --eval "renderer.outputColorSpace"` should print `"srgb"` unless you deliberately changed it.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 1, 3, 4) verified against `node_modules/three/src/math/ColorManagement.js`, `Texture.js`, `WebGLLights.js` and `WebGLRenderer.js` at the installed 0.186.1, and the r186 manual's color-management page.
- 2026-09-26: Verify named a lint rule texture-loader-without-srgb that never existed (found by the threewright-curate eval run); corrected to point at tw scene's map:<kind>/<colorSpace> label.

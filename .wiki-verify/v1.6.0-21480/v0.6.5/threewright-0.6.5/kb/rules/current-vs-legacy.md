---
title: Teach current three.js; keep legacy for old projects
slug: current-vs-legacy
kind: rule
summary: What counts as current in r186, what is the WebGL path (current, feature-light), what is legacy, and the release each old pattern changed in, for porting and for reading old code.
tags: [legacy, deprecated, removed, migration, upgrade, old tutorial, r186, webgpu, webgl]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md, kb/rules/lint-rules.json]
related: [import-maps-and-builds, verification-ladder]
---

# Teach current three.js; keep legacy for old projects

## Rule

- **Current** means it works in r186 with no deprecation warning. Generate only current code for new work, and say which path it is on: `both`, the WebGL path or the WebGPU path.
- **WebGL path** (current, feature-light): WebGLRenderer, EffectComposer with `OutputPass` last, `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile`, the `CSM` addon. Teach them for WebGL pages without calling them legacy, and say that new features land on the WebGPU path (TSL node materials, `RenderPipeline`, compute).
- **Legacy** means removed or deprecated. Show it only when reading or porting an old project, inside a fence marked `legacy`, with the release numbers. Never generate it for new code.
- Before editing an old project, find its release (`package.json`, the pinned CDN URL, or `THREE.REVISION` in the console) and run `tw lint <dir> --target r186` to list what breaks on upgrade, with the fix for each.
- A tutorial, answer or snippet older than about a year is a legacy source until checked: search the knowledge base (`tw kb search`) or `node_modules/three` before trusting an API name.

## Why

- Models trained on years of three.js code keep writing APIs that were removed long ago (the global `THREE` script, `Geometry`, `outputEncoding`); the three.js project's own llms.txt lists them as the most common mistakes. Labelling each pattern by release is what lets an agent help an r150 project without teaching r150 to an r186 one.
- New features land on WebGPURenderer and TSL, but the manual still recommends WebGLRenderer for plain WebGL 2 applications and calls WebGPURenderer experimental (direction research, sections 2 and 6), so the WebGL path is not legacy.

The map of old patterns (release changed, last release where it was the normal way). `tw lint` carries the machine-checked version with a rule per row.

| legacy pattern | replacement | changed | last recommended |
|---|---|---|---|
| `Geometry`, `Face3` | `BufferGeometry` | removed r125 | r124 |
| `examples/js` global addons, `new THREE.OrbitControls()` | `three/addons/...` ES modules | removed r148 | r147 |
| `build/three.js`, `build/three.min.js`, the `THREE` global | ES modules | deprecated r150, removed r161 (tarballs checked) | r149 |
| `physicallyCorrectLights` | physical light units (the default since r155) | deprecated r150, removed r160 (tarballs checked) | r149 |
| `useLegacyLights` | physical light units only | default off r155, removed r165 (tarballs checked) | r154 |
| `mergeBufferGeometries()` | `mergeGeometries()` | r151 | r150 |
| `outputEncoding`, `texture.encoding`, `sRGBEncoding`, `LinearEncoding` | `outputColorSpace`, `texture.colorSpace`, `SRGBColorSpace`, `LinearSRGBColorSpace` | replaced r152, removed r162 | r151 |
| WebGL 1, `WebGL1Renderer` | WebGLRenderer (WebGL 2) or WebGPURenderer | deprecated r153, removed r163 | r152 |
| `USDZLoader` | `USDLoader` | deprecated r179 | r178 |
| `RGBELoader` | `HDRLoader` | deprecated r180 | r179 |
| `renderAsync()`, `clearAsync()`, `hasFeatureAsync()`, `initTextureAsync()`, PMREM `from*Async()`, `KTX2Loader.detectSupportAsync()` | `await renderer.init()` once, then the sync call (`compileAsync`, `computeAsync`, `readRenderTargetPixelsAsync` stay) | deprecated r181 | r180 |
| `waitForGPU()`; TSL `PI2`; TSL `cache()` | removed; `TWO_PI`; `isolate()` | r181 | r180 |
| `getColorBufferType()` | `getOutputBufferType()` | r182 | r181 |
| `Clock` | `Timer` | deprecated r183 | r182 |
| `PostProcessing` | `RenderPipeline` | renamed r183 | r182 |
| TSL `directionToColor()`, `colorToDirection()`, `directionToFaceDirection()` | `packNormalToRGB()`, `unpackRGBToNormal()`, `negateOnBackSide()` | r185 | r184 |
| `require('three')` | `import * as THREE from 'three'` | deprecated r186 | r185 |
| `three.module.min.js` and the other `.min.js` builds | the plain builds (CDNs and bundlers compress) | removed r186 (tarballs checked) | r185 |
| `Source` | `TextureSource` | renamed r186 | r185 |
| `PCFSoftShadowMap` | `PCFShadowMap` (soft since r182) | deprecated r186 | r185 |

EffectComposer, `ShaderMaterial` and `onBeforeCompile` were never supported by WebGPURenderer: they are current on the WebGL path and wrong on the WebGPU path.

## Notes

- 2026-09-26: written from the direction research (section 6, corrected: `computeAsync` is not deprecated in r186) and the lint rules checked against the installed three 0.186.1 and the npm tarballs.

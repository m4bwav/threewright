---
title: Bundle size
slug: bundle-size
kind: topic
summary: Measured gzip sizes for each entry point and build file in r186, and why WebGPU costs about 1.6x WebGL for a minimal scene.
tags: [bundle size, gzip, tree shaking, import map, webgpu, webgl]
applies_to: r186
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [renderer-choice, import-maps-and-builds]
---

# Bundle size

## Essentials

- Whole build files as served by an import map, three 0.186.1, measured 2026-09-26 (gzip -9):

| File | Raw bytes | gzip |
|---|---|---|
| `three.core.js` (shared core) | 1,458,113 | 286,358 |
| `three.module.js` (`three`, WebGLRenderer) | 662,772 | 130,745 |
| `three.webgpu.js` (`three/webgpu`) | 2,284,850 | 443,788 |
| `three.tsl.js` (`three/tsl`) | 36,854 | 7,679 |
| WebGL total (core + module) | 2,120,885 | 417,103 |
| WebGPU total (core + webgpu + tsl) | 3,779,817 | 737,825 |

`three.module.js` and `three.webgpu.js` both import the shared `three.core.js`, so classes like `Vector3` or `Scene` are the same object whichever entry a given file uses; a self-hosted copy needs `three.core.js` sitting next to whichever entry file you serve.
- Tree-shaken minimal scene (a box, `MeshStandardMaterial`, two lights, a render loop), minified ESM, gzip -9, measured with esbuild 0.25.12 and Rollup 4.63.5 + terser:

| Bundle | esbuild gzip | Rollup+terser gzip |
|---|---|---|
| `WebGLRenderer` from `three` | 133,107 | 125,654 |
| `WebGPURenderer` from `three/webgpu`, classic material | 214,792 | 205,497 |
| `WebGPURenderer` plus a TSL material, TSL from `three/tsl` | 245,207 | 234,833 |

WebGPU costs about 1.6x the gzip size of WebGL for a small scene, and importing TSL through `three/tsl` adds roughly 30 KB gzip on top of that in both bundlers, because `three.tsl.js` re-exports each function from a `TSL` namespace object in a way that likely blocks tree shaking. Importing straight from `three/src/...` avoids the 30 KB but mixes source and build copies of three if anything else in the bundle imports `three/webgpu`; do not do that just to save the 30 KB, budget for it instead.
- No minified builds ship in the npm package as of r186 (0.185.1 shipped `three.module.min.js` and friends; 0.186.0 removed all of them). A bundler minifies your own bundle; jsDelivr and similar CDNs minify on the fly when served unminified files are requested with a query that asks for it, so an import-map page can still stay small without shipping its own minifier.
- Real CDN delivery is usually smaller than the gzip numbers above, since most CDNs serve brotli by default, which compresses three's source further than gzip.

## Pitfalls

- Choosing `WebGPURenderer` for a bundle-sensitive page (a marketing hero, a docs chart meant to load fast) without weighing the roughly 80 KB gzip difference against the feature actually needed: see `renderer-choice` for when that trade is worth it.
- Importing `three/tsl` "just in case" on a page that never uses a TSL material: it pulls in the full `three/webgpu` build as a dependency and adds the TSL namespace overhead, for zero visual benefit.
- Assuming a `.min.js` CDN URL still resolves on r186: `three.module.min.js` and its siblings are gone from the npm package since 0.186.0, so a link built from an old tutorial 404s. Use the unminified path and let jsDelivr or your bundler minify.
- Bundling `three/webgpu` and `three` from two different import-map entries by mistake (one pointing at `three.module.js`, the other at `three.webgpu.js`): this loads two full copies of three and roughly doubles the numbers above, on top of the `Multiple instances of Three.js being imported` runtime warning it triggers.

## Verify

- `tw lint <dir>` flags a `.min.js` URL (removed r186) and a mixed-version or duplicate-copy import map, both of which inflate bundle size unexpectedly.
- Compare a page's actual transferred bytes for the three.js files (browser devtools network tab, or `curl -sI` against the CDN URL for `content-length`) against the table above as a sanity check that you are loading roughly what you expect.
- There is no `tw` command that measures your own project's final bundle; use your bundler's own size-analysis output (esbuild's metafile, Rollup's `--sourcemap` plugin ecosystem, or a simple `gzip -c dist/bundle.js | wc -c`) for anything beyond the raw three.js files.

## Notes

- 2026-09-26: written from the direction research (section 3.6), which measured every number above directly against the installed three 0.186.1 with esbuild 0.25.12 and Rollup 4.63.5 + terser on 2026-09-26.

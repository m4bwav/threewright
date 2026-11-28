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
- A no-engine reference point, measured 2026-11-28: a complete 3D fighting game with its own WebGL2 renderer and no asset files is 333,734 bytes minified, 119,259 gzip, 102,190 brotli. That is under the minimal three.js scene above before any game code, so a hard size limit (a 100 kB jam) rules three.js out; nothing else here does.
- Do not build a self-extracting packer (script deflated, stored as text, inflated at load with `DecompressionStream`). Measured on that game: the packed file is 150,068 bytes on disk against 333,734 plain, but over a compressing server it is 121,758 gzip and 121,233 brotli against 119,259 and 102,190 for the plain minified script, so 16% worse with brotli, because packed text cannot be compressed again. Whole-program renaming bought 10% raw but 3.6% after gzip. Packing pays only where raw file size counts: a size-limited jam, a file opened from disk, a host that does not compress. `tw size` warns when it sees such a payload.
- Single-file HTML for a jam or an itch.io upload: `esbuild --bundle --minify` with `--alias:three=<vendored path>` gives one script that runs with no CDN, from the same source the import map runs unbundled (idea from robinduckett/boo-mas, 2026-11-18; not measured here).

## Pitfalls

- Choosing `WebGPURenderer` for a bundle-sensitive page (a marketing hero, a docs chart meant to load fast) without weighing the roughly 80 KB gzip difference against the feature actually needed: see `renderer-choice` for when that trade is worth it.
- Importing `three/tsl` "just in case" on a page that never uses a TSL material: it pulls in the full `three/webgpu` build as a dependency and adds the TSL namespace overhead, for zero visual benefit.
- Assuming a `.min.js` CDN URL still resolves on r186: `three.module.min.js` and its siblings are gone from the npm package since 0.186.0, so a link built from an old tutorial 404s. Use the unminified path and let jsDelivr or your bundler minify.
- Bundling `three/webgpu` and `three` from two different import-map entries by mistake (one pointing at `three.module.js`, the other at `three.webgpu.js`): this loads two full copies of three and roughly doubles the numbers above, on top of the `Multiple instances of Three.js being imported` runtime warning it triggers.

## Verify

- `tw lint <dir>` flags a `.min.js` URL (removed r186) and a mixed-version or duplicate-copy import map, both of which inflate bundle size unexpectedly.
- Compare a page's actual transferred bytes for the three.js files (browser devtools network tab, or `curl -sI` against the CDN URL for `content-length`) against the table above as a sanity check that you are loading roughly what you expect.
- `tw size dist --budget 300` (added 1.17.0) prints raw, gzip 9 and brotli 11 bytes per file and in total, plus the inline script and style bytes of each HTML file, and exits 1 when the total is at or over the budget (kB of 1000 bytes; gzip unless `--by raw|brotli`). Source maps are not counted. It warns `packed payload: brotli saves under 2%` on a text file over 20 kB that is already compressed inside. Checked on a held-out packed game file: 164,805 raw, 134,209 gzip, 133,582 brotli and the warning; the game-starter `dist` gets none. Your bundler's own analysis (esbuild's metafile) still answers which module is heavy.

## Notes

- 2026-09-26: written from the direction research (section 3.6), which measured every number above directly against the installed three 0.186.1 with esbuild 0.25.12 and Rollup 4.63.5 + terser on 2026-09-26.
- 2026-11-28: `tw size`, the no-engine reference and the packer result, measured by rebuilding a public single-file game's pipeline step by step (kevintngo/voidlight and its sibling fighter; no licence, numbers only). <!-- harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28 -->

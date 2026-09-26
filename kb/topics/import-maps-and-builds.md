---
title: Import maps, entry points and builds
slug: import-maps-and-builds
kind: topic
summary: How to load three r186 without a bundler (pinned import map) or with one, which build files exist, and the entry points three, three/addons, three/webgpu and three/tsl.
tags: [import map, cdn, jsdelivr, esm, bundler, vite, addons, webgpu, tsl, builds]
applies_to: ">=r161"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://threejs.org/manual/#en/installation, https://www.npmjs.com/package/three, https://github.com/mrdoob/three.js/wiki/Migration-Guide, https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/webgpu_postprocessing_bloom.html]
related: [verification-ladder]
template: html-importmap
---

# Import maps, entry points and builds

## Essentials

- three is ES modules only in practice. Since r161 there is no `build/three.js` or `build/three.min.js` to drop in a script tag (deprecated in r150), and since r186 there are no minified builds at all (0.185.1 shipped `*.min.js`, 0.186.1 does not). CDNs and bundlers compress the files.
- Entry points of the npm package (r186 `package.json` exports):

| specifier | file | use |
|---|---|---|
| `three` | `build/three.module.js` | core plus WebGLRenderer |
| `three/webgpu` | `build/three.webgpu.js` | core plus WebGPURenderer, node materials, `RenderPipeline` |
| `three/tsl` | `build/three.tsl.js` | TSL functions (`color`, `uniform`, `pass`, `time`, ...); it imports `three/webgpu` |
| `three/addons/...` | `examples/jsm/...` | controls, loaders, exporters, post-processing, TSL display nodes |

- `three.module.js` (663 KB, 131 KB gzip) and `three.webgpu.js` (2.3 MB, 447 KB gzip) both import the shared `three.core.js`, so classes such as `Vector3` or `Scene` are the same objects whichever entry you use. `three.webgpu.nodes.js` is an alternative WebGPURenderer that accepts node materials only.
- Without a bundler, pin the exact version in an import map and serve the page over http (module imports do not load from `file://`):

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
</script>
```

- For WebGPURenderer, map `three` to the WebGPU build too, as the official examples do, so addons that import `three` get the same file and the page does not download the WebGL renderer as well:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
    "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.tsl.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
```

- With a bundler (Vite and friends) install `three` and import the same specifiers. TypeScript types come from `@types/three`, versioned to match (0.186.0 for r186 on 2026-09-26).
- `require('three')` still works in r186 through a stub that re-exports the ES module (Node's `require(esm)`) and emits a `THREE_CJS_DEPRECATED` warning; the stub will be removed.
- Addons are never on the `THREE` namespace. `new THREE.OrbitControls()` is a leftover of the global-script era (examples/js, removed in r148).

## Pitfalls

- An unpinned CDN URL (`three@latest`, or no version) changes under a finished page on the next release. Pin `three@0.186.1` and use the same version for `three/addons/`.
- A bare `import 'three'` with no import map fails with `Failed to resolve module specifier "three"`. Addons import bare `three`, so the map needs the entry even when your own code uses a full URL.
- Mixing a CDN copy with a bundled copy, or two versions, loads three twice: three logs `Multiple instances of Three.js being imported` and `instanceof` checks fail across the copies.
- `three/tsl` imports `three/webgpu` by bare name, so a page that uses TSL must map `three/webgpu`.
- Opening the HTML file directly (`file://`) blocks module scripts; use any static server (tw serves the folder itself).
- esm.sh and skypack rewrite packages; jsDelivr's `/npm/` path serves the published files unchanged, which is what the pinned examples here assume.

## Legacy

- Before r161: `<script src=".../build/three.min.js">` gave a global `THREE`, and addons came from `examples/js` (removed in r148). Such pages must be ported to modules; `tw lint` flags them (`umd-build`, `examples-js`, `global-three-addon`).

```html legacy
<script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.150.0/examples/js/controls/OrbitControls.js"></script>
```

## Verify

- `tw check <page>` prints `three: r186` on its second line; `not detected` means three did not load (read FAILED REQUESTS and the fix hints).
- The `warnings` block must not contain `Multiple instances of Three.js being imported`.
- `tw lint <folder>` reports `unpinned-cdn`, `minified-builds`, `umd-build`, `commonjs-require` and `global-three-addon` with the fix.
- Where the CDN is unreachable (CI, sandboxes), `tw check` serves pinned jsDelivr and unpkg files from `node_modules` or the npm cache and says so on its `cdn:` line; a bad version still fails.

## Notes

- 2026-09-26: written from the installed three 0.186.1 (package.json exports, build/ listing, three.cjs stub, file sizes measured) and the r186 webgpu_postprocessing_bloom example; minified builds confirmed absent by comparing the 0.185.1 and 0.186.1 tarballs; the UMD builds are in 0.160.1 and gone in 0.161.0.

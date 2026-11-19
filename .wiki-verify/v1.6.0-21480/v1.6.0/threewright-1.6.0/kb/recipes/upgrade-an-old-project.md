---
title: Upgrade an old project
slug: upgrade-an-old-project
kind: recipe
summary: Find a project's current three.js release, lint what breaks moving to r186, and fix the light-intensity and color-space changes a clean lint pass does not catch.
tags: [upgrade, migration, tw lint, legacy, light intensity]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-direction.md, kb/rules/current-vs-legacy.md]
related: [current-vs-legacy, color-management, lighting-and-shadows]
---

# Upgrade an old project

## Goal

Move an existing three.js project forward to r186 (or just find out what would break if you did), without guessing which of its patterns are still fine and which are gone. Find the installed version, lint against the target release, and fix the two changes that survive a clean lint pass but still make the scene look wrong: light units and texture color space.

## Code

Find the current version first:

```sh
# From node_modules, the most reliable source:
node -p "JSON.parse(require('node:fs').readFileSync('node_modules/three/package.json')).version"
# Or grep a pinned CDN URL in an import map / script tag:
grep -on 'three@[0-9.]*' index.html
# Or, in a running page:
```
```js
console.log(THREE.REVISION); // e.g. "160"; the release number, not the full semver
// THREE is a global only on UMD pages; in a module page log it from the module
// that imports three. `tw check <page>` prints it either way on its `three: rNNN` line.
```

Lint against the current release (find what is already wrong) and against the target (find what an upgrade would break):

```sh
node scripts/tw.mjs lint <dir>                    # against the project's own pinned version
node scripts/tw.mjs lint <dir> --target r186       # what breaks moving to r186
```

Fix in this order, since each layer hides the next one's symptoms otherwise:

1. **Module system**: script-tag/UMD builds, `THREE.OrbitControls` off the global namespace, `examples/js` paths; port to ES modules and `three/addons/` first, or nothing else is testable in a real r186 environment at all.
2. **Renamed/removed API**: run `tw lint` and fix every error-level hit (`outputEncoding`, `sRGBEncoding`, `WebGL1Renderer`, `*BufferGeometry` aliases, and the rest of `current-vs-legacy`'s legacy table) mechanically, one rule at a time.
3. **Light units**: a scene tuned for the pre-r155 legacy mode will pass the lint above yet still render about 3x too dark, because `physicallyCorrectLights`/`useLegacyLights` leave no trace once removed; they simply changed a runtime scale factor. Multiply old ambient/hemisphere/directional/point/spot intensities by `Math.PI` as a starting correction, then retune point and spot lights further, since their falloff also changed (`decay` defaulted to 1 before r147, 2 since).
4. **Texture color space**: color textures loaded before r152 relied on `texture.encoding = THREE.sRGBEncoding`; after the rename and removal, set `texture.colorSpace = THREE.SRGBColorSpace` on the same textures (`map`, `emissiveMap`) instead. `GLTFLoader` has always tagged this itself, so glTF-loaded scenes usually need no change here; hand-loaded textures do.
5. **Everything else**: re-run `tw lint` until it is clean, then `tw check` the running page for the runtime warnings that only show up live (a black scene from step 3 not yet fixed, a missing `OutputPass`, a camera off the new bounds if geometry changed shape from a shading fix in step 3/4).

## Verify

- `node scripts/tw.mjs lint <dir> --target r186` reporting zero errors is the release-facing definition of done for this recipe. Warnings for code deliberately kept on an older, documented pattern are acceptable.
- `tw check <page>` on the upgraded page: `result: OK`, and the `pixels:` mean luma in the same rough range as before once light intensities are retuned. A much darker reading with a clean lint pass is the signature of an un-retuned legacy-light scene (step 3).
- `tw diff before.png after.png --threshold 0.1` on a matched camera angle, before and after, measures how much the image changed. Treat a difference as information, not automatically a bug.
- Verified 2026-09-26 on Windows 11 (Git Bash, Node 24) with Chrome 153 headless and an RTX 5060 Ti, against a copy of `tests/fixtures/lint/stale.html` plus a stub `node_modules/three/package.json` at 0.150.0. The `node -p` line printed `0.150.0`; the grep printed `3:three@0.150.0` and `4:three@0.150.0`; `tw check --eval "THREE.REVISION"` on the UMD page printed `"150"`. `tw lint <dir>` detected `three r150 (pinned URL)` and gave 2 errors and 3 warnings (examples-js, global-three-addon; umd-build, physically-correct-lights, buffer-geometry-aliases). `tw lint <dir> --target r186` gave 7 errors and 1 warning (adds encoding-api twice and clock; umd-build, physically-correct-lights and the aliases become errors). The sample rewritten by steps 1, 2, 3 and 5 (import map, `BoxGeometry`, `Timer`, intensities times `Math.PI`) gave `0 error(s), 0 warning(s)` with `--target r186` and `result: OK` in `tw check`; the `tw shot` showed a lit box. The before and after brightness comparison was not run, since the r150 sample never rendered.
- Release numbers in step 3 checked in npm tarballs on 2026-09-26: `PointLight` `decay` defaults to 1 in 0.146.0 and 2 in 0.147.0; `WebGLRenderer.useLegacyLights` is `true` in 0.154.0 and `false` in 0.155.0.

## Notes

- 2026-09-26: written from the core r160-r186 research (sections 3, 4) and the direction research (section 6, the current-versus-legacy table), matching the order and fixes already recorded in `kb/rules/current-vs-legacy.md`.
- 2026-09-26: ran the commands against a copy of the stale lint fixture (see Verify). They do what the recipe says. Added that `THREE.REVISION` only works as a global on UMD pages: in a module page `tw check --eval "THREE.REVISION"` fails with `THREE is not defined`.

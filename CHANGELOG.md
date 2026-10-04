# Changelog

Plugin versions. Skill-level changes are in each `skills/*/CHANGELOG.md`; the session record is `ai-docs/log.md`.

## 0.6.4 · 2026-10-04

Nothing to install with the plugin.
- `package.json` and `package-lock.json` moved from the plugin root to `dev/`. The Claude directory held 0.6.3 for content policy review because Claude Code would install from a root lockfile when a user installs the plugin; the only dependency was the dev dependency three, used by the tests. Run `npm install` and `npm test` in `dev/`.
- `tw` (CDN serving, `tw new` asset generation, `tw deprecations`), the browser tests and `evals/headless/run.py` find three in `dev/node_modules` as well as `node_modules`, and still fall back to the tw cache or `npm pack`.

## 0.6.3 · 2026-10-03

Prepared for the Claude plugin directory, which takes no binary files except images and no files over 256 KiB.
- The product-viewer model.glb and the splats scene.splat are no longer in the repository. `tw new` writes them in the new folder from the template's own script (make-model.mjs, make-splat.mjs), listed under `generate` in template.json; the model's three 0.186.1 comes from node_modules, the tw cache or `npm pack`. Both come out byte for byte the same as the files they replace. The browser tests and `evals/headless/make-inputs.mjs` generate them the same way.
- Every `npx` and `npm create` command in the knowledge base names an exact version: `@gltf-transform/cli@4.5.1`, `gltfpack@1.3.0`, `@iwsdk/cli@1.0.1`, `npm create @iwsdk@1.0.1`. The globe-gl texture URL names three-globe 2.45.3.
- plugin.json gains homepage, documentationUrl, supportUrl and privacyPolicyUrl; the README gains a Privacy section listing every network route.

## 0.6.2 · 2026-09-26

Less to run, one trigger gap closed.
- Outcome cases the no-plugin baseline also passes are marked `redundant` in evals.json (8 of 10 skills; games and curate keep theirs). `evals/headless/run.py` skips them unless `--all`, so a full pass is 37 runs instead of 69.
- threewright-r3f's description covers checking that an R3F app builds and runs; the case that missed now fires the skill 3 of 3.
- XR is dropped from the plan.

## 0.6.1 · 2026-09-26

The eval pass is complete, with a harness in the repo so the next one is one command.
- `evals/headless/`: `run.py` runs every action and outcome case through `claude -p --plugin-dir` in fresh workspaces (3 runs each plus a no-plugin baseline, resumable), and `grade.py` grades them on the trace and the disk into evals/results/headless-latest.md. `make-inputs.mjs` regenerates the input models and CSV.
- Result (69 runs, $39): every skill's action and outcome cases pass 3 of 3 through the Skill tool, except r3f outcome-1, where run 3 fired no skill. Baselines without the plugin also pass most outcome cases, so the plugin's measurable difference is the verified `tw` step (action cases).
- threewright-curate edits the knowledge base of a git checkout, never the installed plugin copy (which Claude Code refuses to edit and an update would overwrite).
- Outcome cases no longer grade the reply's wording (quotes, alt text, driver names): only files, exit codes and trace calls.

## 0.6.0 · 2026-09-26

product-viewer ships with no CDN requests, the decoder advice agrees with r186 everywhere, and a partial eval pass through the Skill tool.
- `tw vendor` also copies the files a vendored module fetches by `new URL('<relative>', import.meta.url)`. That is how r186's DRACOLoader and KTX2Loader find their WASM decoders, so vendoring them brings `libs/draco/` and `libs/basis/` along. These files are copied, not scanned for imports.
- product-viewer is marked `"vendor": true`, so `tw new` vendors it (21 files, 4.3 MB). It no longer sets a CDN transcoder path; both decoders load from next to their loaders. A Draco model and a KTX2 model check OK under `tw check --cdn offline`, and no CDN URL is left in the page.
- `tw glb` needs lines and `tw check` fix hints no longer tell you to call `setDecoderPath(...)` or `setTranscoderPath(...)`. The load-gltf-with-decoders recipe comments the transcoder path out, and loaders-and-assets no longer says KTX2 "still needs" one.
- Knowledge base: the games, video-and-turntables and generative-art scenarios no longer call game-starter, video-turntable or html-webgpu's WebGPU backend unverified, since their template.json records verified runs. video-and-turntables now points `template:` at video-turntable.
- Evals: 28 of a planned 70 headless runs through `claude -p --plugin-dir`. The Skill tool fired in all 25 with-plugin runs. Stopped on a harness fault and a classifier refusal; details and follow-ups in evals/results/2026-09-26-headless.md.

## 0.5.0 · 2026-09-26

The scroll-hero gaps from the eval runs, and the bounds warnings that misfired on landscapes.
- `tw vendor <dir|page.html> [--offline] [--dry-run]`: copies the pinned jsDelivr and unpkg modules a page imports, and their own relative and mapped imports, into `vendor/<name>@<version>/`, then points the import map at the copies. Only reached files are copied (scroll-hero: 9 files, 2.4 MB). Bytes come from node_modules, the tw cache or `npm pack`, never the CDN.
- `tw new` vendors templates marked `"vendor": true` in template.json (scroll-hero); `--no-vendor` keeps the CDN import map.
- scroll-hero follows threewright-web's Step 2: a `<picture>` poster (wide and tall, start and final view, 33 to 48 KB each) paints first, WebGL starts after first paint and the canvas fades in once a frame is drawn; with reduced motion the view holds the final keyframe while the text scrolls (0 pixels change between top and bottom, checked with `tw diff`).
- `tw shot --out x.jpg|x.webp [--quality 82]` writes JPEG or WebP (for posters); pixel stats stay PNG-only.
- `tw check` leaves backdrop objects out of the scene bounds: built-in materials with `fog: false` in a fogged scene, and objects beyond a third of `camera.far` or spanning half of it. The bounds line says how many were left out. "The camera is inside the scene bounds" no longer fires for wide, flat bounds (a landscape or floor the viewer stands on). New fixture `tests/fixtures/pages/landscape`; the campfire demo now checks clean.

## 0.4.1 · 2026-09-26

First full run of every skill's eval suite (61 cases, all passed; `evals/` at the plugin root), and the fixes it turned up.
- Evals: trigger and decoy cases through `claude plugin eval` 2.1.281 (3 runs per arm, no-plugin baseline), action and outcome cases through the evergreen tester with a no-skill baseline for each action case. Results in `evals/results/`; each skill's TESTS.md has the entry.
- Fixed: `tw video` MP4s lost the BT.709 primaries and transfer tags with ffmpeg 9.0.1; they are now written into the H.264 stream (`h264_metadata`). WebM output is now tagged BT.709 too (VP9 carries the matrix only).
- Fixed: a Git Bash path with a query string (`tw check "/c/.../page/?model=x.glb"`) was not found, because Git Bash skips its path conversion for arguments holding a `?`; tw maps `/c/...` itself on Windows.
- product-viewer wires `KTX2Loader`, so models from `gltf-transform etc1s` or `uastc` load (checked with a KTX2 model: texture shows, `tw scene` reads `map:CompressedTexture/srgb`).
- color-management: Verify named a lint rule that never existed; it now points at `tw scene`'s map colour-space label.

## 0.4.0 · 2026-09-26

The last items of the tools research list, and the KTX2 texture steps checked with KTX-Software installed.
- `tw sheet --sweep "<expr>=a,b,c"` (also `check --sheet f --sweep ...`): one tile per value from the current view, labelled, with the old value put back afterwards.
- `tw video` steps a page through `window.advanceTime(ms)` when it defines one and no `__tw.renderFrame`; the driver prints as `page advanceTime()`.
- tw shares an existing `__THREE_DEVTOOLS__` hook (the three.js DevTools extension) instead of replacing it.
- KTX-Software 4.4.2 installed on the Windows test machine; `gltf-transform etc1s` and `uastc` ran against a generated textured model and `validate` found no errors.

## 0.3.0 · 2026-09-26

tw learns to drive a page and to find leaks and shader errors; six tw bugs from the 0.2.0 handoff are fixed.
- `--actions "key KeyW 500; click 480,270; drag ...; wheel ...; type ...; wait ..."` on check, shot, sheet and video: trusted CDP keyboard, mouse, pointer and wheel input before measuring (virtual-clock waits in video).
- `tw check --cycles N [--cycle "<js>"]`: runs `window.__tw.cycle()` or the js N times and fails on steady growth of geometries, textures or programs.
- `tw shaders <page> [--dump dir]`: WebGL programs with their materials and link status, a failing shader's error lines with source context, sources written to files.
- `--labels` on shot and sheet: name tags at projected object centres (duplicates as xN, overlapping tags pushed apart), with the legend printed as text.
- `tw check --shot a.png --sheet b.png --tree`: several outputs from one browser launch.
- `tw check` prints `render_game_to_text()` output as `game:`; game-starter now defines it.
- `--color-scheme light|dark` emulates `prefers-color-scheme`; the light palettes of surface and globe are now shot and verified.
- Local paths take a query string or hash (`tw check "page/?model=x.glb"`).
- Fixed: `tw glb` bounds for `KHR_mesh_quantization` models (normalized accessor min and max are raw integers).
- Fixed: the aspect check reads the projection matrix, so a missing `updateProjectionMatrix()` is caught.
- Fixed: `tw scene` names a map's texture kind and `NoColorSpace` instead of `map:(none)`.
- Fixed: `tw video --capture canvas` recorded blank frames on render-on-demand pages; the last frame's screen passes are replayed when a step drew nothing.
- Fixed: a flat-shaded object on a plain background (two colours with real coverage) was reported as a blank canvas.

## 0.2.0 · 2026-09-26

Second release: every planned template is built, every recipe has been run, and WebGPU has been verified on a real GPU.
- New templates, all verified on Windows 11, Chrome 153 and an RTX 5060 Ti: surface, globe, product-viewer (with a generated `model.glb` and its `make-model.mjs`), scroll-hero (GSAP 3.15.0, Lenis 1.3.26) and splats.
- All ten recipes that had never been run now have been. Six needed fixes: environment-lighting leaked one geometry and one texture per swap; optimize-gltf's `--slots` values matched nothing in @gltf-transform/cli 4.5.0; dispose-a-scene, resize-and-pixel-ratio, keyboard-orbit-and-reduced-motion and upgrade-an-old-project needed corrections or missing steps.
- `tw perf`: frame-time percentiles, draw calls per frame, memory growth, `--cpu-throttle`.
- `tw check --save` and `--against`: a text diff between two runs.
- `tw shot` and `tw sheet` take `--eval` to set a state before capture.
- `tw check` pixel stats and `shot --canvas` measure the right area on a scrolled page.
- RoomEnvironment is disposed after baking in html-importmap, html-webgpu and vite-ts.
- `tw check --eval` binds `renderer`, `scene` and `camera` to the ones tw observed, so `--eval "renderer.info.render.calls"` works on pages that keep them module scoped (most do). The page's own globals still win.
- `tw check` fails on three's own deprecation warnings (`THREE.X ... deprecated`), shown under their own heading; `--strict` also fails on any other console warning. Warnings from other libraries still only print by default.
- `tw check` ignores a 404 for `/favicon.ico` (browsers request it on their own).
- `tw check` bounds for `GaussianSplat` use the splat cloud, not its quad geometry.
- npm is spawned without the Node 24 DEP0190 warning on Windows (`scripts/lib/proc.mjs`).
- Browser tests build vite-ts, r3f and game-starter and check their `dist` when the template's `node_modules` exists.
- `tw kb validate` warns on an em dash outside code fences (house style); `--strict` fails on it.
- WebGPU verified on the real backend (Windows, Chrome 153, RTX 5060 Ti): the html-webgpu template and the bloom-webgpu, tsl-custom-material and webgpu-backend-check recipes.
- bloom-webgpu: lower emissive and bloom strength and add a directional light; the old values blew the whole frame out on both backends.

## 0.1.0 · 2026-09-26

First release.
- CLI `scripts/tw.mjs` (Node 22+, no dependencies):
  - verification: `check` (with pixel evidence and `--eval`), `scene`, `shot`, `sheet`, `video` and `diff`
  - static tools: `lint`, `deprecations`, `glb`, `kb`, `templates`, `new`, `versions` and `doctor`
  - runs in containers and offline: `--cdn`, Playwright Chromium, `--no-sandbox` as root
- Knowledge base: 89 entries (23 topics, 13 scenarios, 30 libraries, 20 recipes, 3 rules) with release ranges and a current or legacy status. Nine one-page recipes were run through `tw check`. 67 stale-API lint rules, with release numbers confirmed against npm tarballs; every r186 `@deprecated` marker is covered or skipped on purpose.
- Templates, all verified with `tw check`: html-importmap, html-webgpu (WebGL 2 fallback only), vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter.
- Ten skills with evergreen files and eval suites. The suites are written but not yet run.
- Research notes for ten tracks in `ai-docs/research/`.

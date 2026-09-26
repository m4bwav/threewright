# Changelog

Plugin versions. Skill-level changes are in each `skills/*/CHANGELOG.md`; the session record is `ai-docs/log.md`.

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

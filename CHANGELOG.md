# Changelog

Plugin versions. Skill-level changes are in each `skills/*/CHANGELOG.md`; the session record is `ai-docs/log.md`.

## Unreleased

- `tw check --eval` binds `renderer`, `scene` and `camera` to the ones tw observed, so `--eval "renderer.info.render.calls"` works on pages that keep them module scoped (most do). The page's own globals still win.
- `tw check` fails on three's own deprecation warnings (`THREE.X ... deprecated`), shown under their own heading; `--strict` also fails on any other console warning. Warnings from other libraries still only print by default.
- `tw check` ignores a 404 for `/favicon.ico` (browsers request it on their own).
- `tw check` bounds for `GaussianSplat` use the splat cloud, not its quad geometry.
- npm is spawned without the Node 24 DEP0190 warning on Windows (`scripts/lib/proc.mjs`).
- Browser tests build vite-ts, r3f and game-starter and check their `dist` when the template's `node_modules` exists.
- New template: splats (r186 native `GaussianSplat`, generated sample scene), verified on WebGPU and on the WebGL 2 fallback.
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

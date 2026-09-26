# Changelog

Plugin versions. Skill-level changes are in each `skills/*/CHANGELOG.md`; the session record is `ai-docs/log.md`.

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

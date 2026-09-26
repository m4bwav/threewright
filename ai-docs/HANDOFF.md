# HANDOFF

Updated 2026-09-26 (second session). Read this first, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (Ai/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## Done

- `scripts/tw.mjs` zero-dependency Node 22+ CLI driving system Chrome over CDP. Working and verified on Windows with r186: `check` (errors, failed requests, renderer and scene summary, runtime warnings such as black-mesh, washed-out textures, camera off-scene, aspect mismatch), `scene` (compact tree), `shot` (prints image token cost), `sheet` (4 angles in one image), `doctor` (headless WebGL on the RTX GPU and WebGPU adapter both work; SwiftShader has WebGL but no WebGPU adapter). `video` is written (virtual clock or page `__tw.renderFrame`, ffmpeg piping) but UNTESTED.
- Scene capture works through three's `__THREE_DEVTOOLS__` hook (still in r186), no page changes needed; the main scene is the one rendered to screen most often.
- `templates/html-importmap/` verified clean by `tw check`.
- Research notes in `ai-docs/research/` (the files present are finished; tracks still missing when this was written: see below).

## Done in the second session (cloud container, Linux, Chromium SwiftShader)

- Research tracks written: ai-skills-and-tools, core-r160-r186-and-direction, ecosystem-and-assets, video-and-games (all in `ai-docs/research/`).
- CLI modules: `lint.mjs` (rules in `kb/rules/stale-api.json`, `--fix` for mechanical renames), `deprecations` (66 of 68 r186 markers covered), `glb.mjs`, `kb.mjs`, `templates.mjs`, `versions.mjs`, `cdn.mjs` (`--cdn local` serves jsdelivr/unpkg imports from node_modules). Chrome lookup finds Playwright's Chromium; `--no-sandbox` is added when running as root on Linux.
- `video` verified (mp4, gif, webm, PNG frames) with a full ffmpeg (the imageio-ffmpeg wheel; Playwright's bundled ffmpeg only has VP8).
- Image token formula verified: ceil(w/28)*ceil(h/28) after downscale to the tier caps (high: 2576 px edge, 4784 tokens).
- Tests: `npm test` (unit, no browser) and `tests/browser.test.mjs` (every template through `tw check --cdn local`, shot, sheet, video).

## Not done (in order)

1. Research tracks that had not returned: AI skills/rules/docs, MCP and AI tools, core r160-r186, ecosystem libraries, video, games, direction. Rerun any whose file is missing in `ai-docs/research/` (prompts: one per topic, write to `ai-docs/research/2026-09-26-<topic>.md` with sources).
2. Missing CLI modules referenced by tw.mjs: `scripts/lib/lint.mjs` (stale-API rules; generate pending ones from `// @deprecated rNNN` comments in node_modules/three/src, e.g. Clock deprecated r183 -> Timer, PostProcessing -> RenderPipeline r183, *Async render methods r181, Source -> TextureSource r186), `glb.mjs`, `kb.mjs` (index, validate, search, show), `templates.mjs`, `versions.mjs`. Then `tests/` with `node --test`.
3. Verify the image token formula (research claims Claude docs now use ceil(w/28)*ceil(h/28)); update `imageTokens` in `scripts/lib/page.mjs`.
4. Templates: html-webgpu (import map maps "three" to three.webgpu.js; TSL material; `RenderPipeline` + `bloom` from three/addons/tsl/display/BloomNode.js), vite-ts, r3f, chart-3d-scatter, surface, globe, video-turntable, game-starter (Rapier), product-viewer, scroll-hero, splats (r186 built-in). Verify each with `tw check` and `tw sheet`.
5. KB `kb/{topics,scenarios,libraries,recipes,rules}/` with frontmatter incl. `applies_to` (release range) and `status: current|legacy`.
6. Skills (evergreen units, chartwright style): threewright (hub), -docs, -video, -games, -web, -assets, -shaders, -r3f, -debug, -curate. Each with SKILL.md, RESEARCH/CHANGELOG/LEARNINGS/TESTS, evergreen.json, evals/evals.json.
7. README, AGENTS.md, CLAUDE.md (`@AGENTS.md` first line), .github/copilot-instructions.md, .claude-plugin/plugin.json + marketplace.json, LICENSE MIT, release v0.1.0.

## Gotchas

- Chrome blocks module imports from file://; tw serves the folder over localhost (also needed for navigator.gpu, which requires a secure context).
- ANGLE D3D "warning X4122" shader notes are filtered as noise.

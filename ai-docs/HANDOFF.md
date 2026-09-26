# HANDOFF

Updated 2026-09-26 (fourth session). Read this first, then `ai-docs/log.md`, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (m4bwav/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## State (2026-09-26, after the fourth session; v0.2.0)

Everything is on `main`, with no side branches. Tags `v0.1.0` and `v0.2.0` are pushed.

Done and verified:
- CLI: see README. `npm test` passes 43/43 on Windows 11 with Chrome 153 and an RTX 5060 Ti. Browser tests build vite-ts, r3f and game-starter when their `node_modules` exists (`npm ci` in the template folder).
- Knowledge base: 89 entries, `tw kb validate --strict` clean (now includes an em-dash check), index generated. All 20 recipes have been executed.
- WebGPU verified on a real GPU: html-webgpu, splats, bloom-webgpu, tsl-custom-material, webgpu-backend-check.
- Templates (12, all verified): html-importmap, html-webgpu, vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter, surface, globe, product-viewer, scroll-hero, splats.
- Lint: 67 rules; `tw deprecations` 0 pending for r186.

## Not done (in order)

1. Publish GitHub Releases for `v0.1.0` and `v0.2.0` (both tags are pushed). The agent's permission rules blocked `gh release create` here. Run: `gh release create v0.1.0 --title "threewright 0.1.0" --notes-file <0.1.0 section of CHANGELOG.md>`, then the same for v0.2.0.
2. Run each skill's evals from a fresh session after installing the plugin (a plugin installed mid-session is invisible to that session's Skill tool). Fill in the baselines and record the results in TESTS.md and evergreen.json.
3. tw bugs found this session:
   - `tw glb` bounds are wrong for `KHR_mesh_quantization` files: it reported 68,490 units across a model that is 4.9 across.
   - The aspect warning compares only `camera.aspect`, so a stale projection matrix (a missing `updateProjectionMatrix()`) passes. Compare the projection matrix instead.
   - `tw scene` shows `map:(none)` for a DataTexture map.
   - There is no flag to emulate `prefers-color-scheme: light`; headless reports dark, so the light palettes of surface and globe were never shot.
   - `tw video --capture canvas` records blank frames on render-on-demand pages (surface, globe). The default page capture is fine.
   - tw does not accept a query string on a folder path; use `--eval` or a served URL.
4. tw features still open from the tools research (`ai-docs/research/2026-09-26-mcp-and-ai-tools.md`, section "tw features to add"): leak cycles (`--cycles N` with `__tw.cycle()`), `--actions` input bursts, `--labels` on shot and sheet, `tw shaders`, and several outputs per launch.
5. The optimize-gltf etc1s and uastc steps need KTX-Software (`ktx` 4.4.2). It was unpacked into the session scratchpad only, not installed; say so in threewright-assets if users hit it.

## Gotchas

- Chrome blocks module imports from `file://`; tw serves the folder over localhost (also needed for `navigator.gpu`).
- On this Windows machine headless Chrome picks the real WebGPU adapter by default; `--gl swiftshader` forces the WebGL 2 fallback (SwiftShader has no WebGPU adapter). On the Linux cloud container, Chromium 141 has an adapter but three r186's WebGPU backend throws there (`swizzle: 'rgba'`).
- WebGPURenderer's `info.render.calls` counts `render()` calls since start; the per-frame number is `info.render.drawCalls`.
- `result: OK` does not mean it looks right (bloom-webgpu passed while blown out). Look at one shot.
- Headless Chrome ran at a 60 fps vsync cap here, so `tw perf` fps is uninformative; read p95, p99 and max.
- Release numbers from memory and from research notes were wrong several times: check npm tarballs (`npm pack three@<v> --dry-run --json`) or the installed source.
- Bash heredocs on this machine turn `\\` into `\` even when quoted; write files with the Write tool or Edit when they contain backslashes.
- Never stop a test server with `taskkill /IM python.exe`; kill it by PID.
- No AI attribution anywhere: commits and files carry none.

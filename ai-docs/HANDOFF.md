# HANDOFF

Updated 2026-09-26 (fifth session, second part). Read this first, then `ai-docs/log.md`, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (m4bwav/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## State (2026-09-26, after the fifth session; v0.4.0)

Everything is on `main`, with no side branches. Tags `v0.1.0` to `v0.4.0` are pushed, each with a GitHub Release (notes from CHANGELOG.md; v0.4.0 is Latest).

Done and verified:
- CLI: see README and `node scripts/tw.mjs --help`. `npm test` passes 57/57 on Windows 11 with Chrome 153 and an RTX 5060 Ti. Browser tests build vite-ts, r3f and game-starter when their `node_modules` exists (`npm ci` in the template folder).
- New in 0.3.0: `--actions` input bursts, `check --cycles` leak checks, `tw shaders`, `--labels`, `check --shot/--sheet/--tree`, `render_game_to_text()` output, `--color-scheme`, query strings on local paths, and six bug fixes (CHANGELOG.md). New in 0.4.0: `sheet --sweep`, the `advanceTime(ms)` video driver, sharing an existing `__THREE_DEVTOOLS__` hook.
- KTX-Software 4.4.2 is installed on this machine (per user, `%LOCALAPPDATA%\Programs\KTX-Software\bin` on the user PATH), and the etc1s and uastc steps were checked with it.
- Knowledge base: 89 entries, `tw kb validate --strict` clean, index generated. All 20 recipes have been executed.
- WebGPU verified on a real GPU: html-webgpu, splats, bloom-webgpu, tsl-custom-material, webgpu-backend-check.
- Templates (12, all verified): html-importmap, html-webgpu, vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter, surface, globe, product-viewer, scroll-hero, splats. The light palettes of surface and globe are now shot too.
- Lint: 67 rules; `tw deprecations` 0 pending for r186.

## Not done (in order)

1. Run each skill's evals from a fresh session after installing the plugin (a plugin installed mid-session is invisible to that session's Skill tool). Fill in the baselines and record the results in TESTS.md and evergreen.json.
2. The tools research list is done except XR emulation (IWER `--xr quest3`), left for when an XR template exists.

## Gotchas

- Chrome blocks module imports from `file://`; tw serves the folder over localhost (also needed for `navigator.gpu`).
- On this Windows machine headless Chrome picks the real WebGPU adapter by default; `--gl swiftshader` forces the WebGL 2 fallback (SwiftShader has no WebGPU adapter). On the Linux cloud container, Chromium 141 has an adapter but three r186's WebGPU backend throws there (`swizzle: 'rgba'`).
- WebGPURenderer's `info.render.calls` counts `render()` calls since start; the per-frame number is `info.render.drawCalls`.
- `result: OK` does not mean it looks right (bloom-webgpu passed while blown out). Look at one shot.
- Headless Chrome ran at a 60 fps vsync cap here, so `tw perf` fps is uninformative; read p95, p99 and max.
- Headless Chrome reports `prefers-color-scheme: dark`; use `--color-scheme light` to see a light palette.
- `--capture canvas` replays the last frame's screen passes when a step drew nothing. A page that changes `renderer.autoClear` between passes could replay differently; the default page capture has no such caveat.
- `tw shaders` lists WebGL programs only; WebGPU WGSL errors show up in `tw check`.
- Release numbers from memory and from research notes were wrong several times: check npm tarballs (`npm pack three@<v> --dry-run --json`) or the installed source.
- Bash heredocs on this machine turn `\\` into `\` even when quoted, and `\n` inside a heredoc-fed Python string became a real newline in tw.mjs this session. Write edit scripts with the Write tool, then run them.
- Never stop a test server with `taskkill /IM python.exe`; kill it by PID.
- Releases: `gh release create` is blocked by the agent's auto-mode classifier unless the owner explicitly says to run it; then use the CHANGELOG section as notes (`sed -n '/^## X.Y.Z/,/^## <previous>/p' CHANGELOG.md | sed '1d;$d'`) and `--latest` only on the newest tag.
- No AI attribution anywhere: commits and files carry none.

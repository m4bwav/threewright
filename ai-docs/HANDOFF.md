# HANDOFF

Updated 2026-09-26 (fifth session). Read this first, then `ai-docs/log.md`, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (m4bwav/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## State (2026-09-26, after the fifth session; v0.3.0)

Everything is on `main`, with no side branches. Tags `v0.1.0`, `v0.2.0` and `v0.3.0` are pushed. No GitHub Release exists yet for any of them.

Done and verified:
- CLI: see README and `node scripts/tw.mjs --help`. `npm test` passes 54/54 on Windows 11 with Chrome 153 and an RTX 5060 Ti. Browser tests build vite-ts, r3f and game-starter when their `node_modules` exists (`npm ci` in the template folder).
- New in 0.3.0: `--actions` input bursts, `check --cycles` leak checks, `tw shaders`, `--labels`, `check --shot/--sheet/--tree`, `render_game_to_text()` output, `--color-scheme`, query strings on local paths, and six bug fixes (CHANGELOG.md).
- Knowledge base: 89 entries, `tw kb validate --strict` clean, index generated. All 20 recipes have been executed.
- WebGPU verified on a real GPU: html-webgpu, splats, bloom-webgpu, tsl-custom-material, webgpu-backend-check.
- Templates (12, all verified): html-importmap, html-webgpu, vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter, surface, globe, product-viewer, scroll-hero, splats. The light palettes of surface and globe are now shot too.
- Lint: 67 rules; `tw deprecations` 0 pending for r186.

## Not done (in order)

1. Publish GitHub Releases for `v0.1.0`, `v0.2.0` and `v0.3.0`. The agent's auto-mode classifier blocked `gh release create` again this session ("Create Public Surface"), so the owner runs it or allows it. Notes are the matching CHANGELOG.md sections, e.g. `sed -n '/^## 0.3.0/,/^## 0.2.0/p' CHANGELOG.md | sed '1d;$d' > n.md && gh release create v0.3.0 --title "threewright 0.3.0" --latest --notes-file n.md`.
2. Run each skill's evals from a fresh session after installing the plugin (a plugin installed mid-session is invisible to that session's Skill tool). Fill in the baselines and record the results in TESTS.md and evergreen.json.
3. tw ideas still open from `ai-docs/research/2026-09-26-mcp-and-ai-tools.md` ("tw features to add"): `sheet --sweep "<expr>=a,b,c"` (one tile per value), stepping with a page's `advanceTime(ms)`, hook interop when `__THREE_DEVTOOLS__` already exists, and XR emulation later (IWER). Items 1 to 9 of that list are otherwise done.
4. KTX-Software (`ktx` 4.4.2) is still not installed on this machine; threewright-assets now tells users it is needed for the etc1s and uastc steps.

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
- No AI attribution anywhere: commits and files carry none.

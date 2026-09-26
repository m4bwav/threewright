# HANDOFF

Updated 2026-09-26 (sixth session). Read this first, then `ai-docs/log.md`, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (m4bwav/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## State (2026-09-26, after the sixth session; v0.5.0)

Everything is on `main`, with no side branches. Tags `v0.1.0` to `v0.5.0` are pushed. v0.1.0 to v0.4.0 have GitHub Releases; v0.4.1 and v0.5.0 have none yet (need the owner's go-ahead).

Done and verified:
- CLI: see README and `node scripts/tw.mjs --help`. `npm test` passes 60/60; every skill's eval suite passed on 2026-09-26 (61 cases, `evals/`, TESTS.md T-20260926-2) on Windows 11 with Chrome 153 and an RTX 5060 Ti. Browser tests build vite-ts, r3f and game-starter when their `node_modules` exists (`npm ci` in the template folder).
- New in 0.3.0: `--actions` input bursts, `check --cycles` leak checks, `tw shaders`, `--labels`, `check --shot/--sheet/--tree`, `render_game_to_text()` output, `--color-scheme`, query strings on local paths, and six bug fixes (CHANGELOG.md). New in 0.4.0: `sheet --sweep`, the `advanceTime(ms)` video driver, sharing an existing `__THREE_DEVTOOLS__` hook.
- KTX-Software 4.4.2 is installed on this machine (per user, `%LOCALAPPDATA%\Programs\KTX-Software\bin` on the user PATH), and the etc1s and uastc steps were checked with it.
- Knowledge base: 89 entries, `tw kb validate --strict` clean, index generated. All 20 recipes have been executed.
- WebGPU verified on a real GPU: html-webgpu, splats, bloom-webgpu, tsl-custom-material, webgpu-backend-check.
- New in 0.5.0: `tw vendor` (pinned CDN modules into vendor/, import map rewritten; `tw new` does it for templates with `"vendor": true`), JPEG/WebP shots for posters, backdrop objects left out of the bounds checks. scroll-hero now meets threewright-web Step 2 (poster first, vendored libraries, final view held under reduced motion).
- Templates (12, all verified): html-importmap, html-webgpu, vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter, surface, globe, product-viewer, scroll-hero, splats. The light palettes of surface and globe are now shot too.
- Lint: 67 rules; `tw deprecations` 0 pending for r186.

## Not done (in order)

1. Evals, remaining protocol gaps: action and outcome cases ran once per skill instead of three times, the outcome cases have no no-skill baseline, and the tester read SKILL.md in place of the Skill tool (the plugin was not installed). For a stricter pass: install the plugin (`claude plugin install` from this folder or the marketplace), then rerun `evals/run-triggers.sh` and the tester cases. How the run was built: evals/results/action-outcome.md and the T-20260926-2 entries.
2. Optional: product-viewer is also a site template; mark it `"vendor": true` too once its decoders (Draco, meshopt, KTX2 transcoder paths) are vendored as well. `tw vendor` copies modules only, not decoder WASM files loaded by path.
3. Parked by the owner (2026-09-26, no headset): XR work, i.e. a webxr-starter template and `tw --xr` through IWER 2.5.0 (its `build/iwer.min.js` is a UMD bundle exposing `IWER.XRDevice` and `metaQuest3`, injectable before page scripts). Do not start it unless asked. A phone AR version was also floated and set aside.

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
- `claude plugin eval` refuses Bash on Windows, so tw-based action cases run through the evergreen tester; evals/<skill>/ holds the exported case folders, evals/run-triggers.sh the trigger and decoy loop (about $16 for all ten skills).
- Bash heredocs on this machine turn `\\` into `\` even when quoted, and `\n` inside a heredoc-fed Python string became a real newline in tw.mjs this session. Write edit scripts with the Write tool, then run them.
- `tw shot/check --eval` takes one expression: join steps with commas, `"(__tw.setProgress(1), hide())"`; a `;` is a syntax error.
- Git Bash does not convert `/tmp/...?query` paths; pass a `C:/...` path when a local page carries a query string outside `/c/`.
- Never stop a test server with `taskkill /IM python.exe`; kill it by PID.
- Releases: `gh release create` is blocked by the agent's auto-mode classifier unless the owner explicitly says to run it; then use the CHANGELOG section as notes (`sed -n '/^## X.Y.Z/,/^## <previous>/p' CHANGELOG.md | sed '1d;$d'`) and `--latest` only on the newest tag.
- No AI attribution anywhere: commits and files carry none.

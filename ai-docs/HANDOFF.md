# HANDOFF

Updated 2026-09-26 (third session). Read this first, then `ai-docs/log.md`, then `ai-docs/research/`.

## Goal (from the owner)

An expansive evergreen three.js plugin: skills plus a knowledge base plus token-saving scripts and tests, for everything from 3D charts in docs to videos to games. Research and use the latest, most popular three.js AI skills, tools and docs. Teach the latest three.js (r186, 0.186.1, 2026-09-24) and where it is heading (WebGPU, TSL); stale material is only for old versions. Public repo m4bwav/threewright. Follow the chartwright plugin layout (m4bwav/chartwright) and the evergreen protocol (m4bwav/evergreen-protocol). No AI attribution anywhere.

## State (2026-09-26, after the third session; v0.1.0)

Everything lives on `main`. There are no side branches to use: the two old `claude/*` branches are fully merged; delete them on GitHub if they still show.

Done and verified:
- CLI: see README. `npm test` passes 25/25 (17 unit, 8 browser) in the Linux container.
- Knowledge base: 89 entries, `tw kb validate --strict` clean, index generated. Nine one-page recipes were run through `tw check`. Recipes written but not executed: load-gltf-with-decoders, environment-lighting, resize-and-pixel-ratio, fixed-timestep-loop, dispose-a-scene, keyboard-orbit-and-reduced-motion, optimize-gltf (its gltf-transform flags are unverified), export-glb, seeded-randomness, upgrade-an-old-project.
- Lint: 67 rules, no `verify` flags, `tw deprecations` shows 0 pending for r186.
- Templates (7, all `tw check` clean): html-importmap, html-webgpu (WebGL 2 fallback only), vite-ts, r3f, chart-3d-scatter, video-turntable, game-starter.
- Research: ten notes in `ai-docs/research/`, including the video track.
- Packaging: README, AGENTS.md, CLAUDE.md, `.github/copilot-instructions.md`, `.claude-plugin/plugin.json` and `marketplace.json`, CHANGELOG.md. Version 0.1.0 in plugin.json and package.json; the tag could not be pushed from the cloud container (its git proxy drops tag and branch-delete pushes).

## Not done (in order)

1. Tag `v0.1.0` on the head of main and publish a GitHub Release for it (notes: the 0.1.0 section of CHANGELOG.md): `git tag -a v0.1.0 -m "threewright 0.1.0" && git push origin v0.1.0`, then `gh release create v0.1.0`.
2. Run each skill's evals from a fresh session after installing the plugin (a plugin installed mid-session is invisible to that session's Skill tool). Fill in the baselines and record the results in TESTS.md and evergreen.json.
3. Templates not started: surface, globe, product-viewer (with a generated CC0 `model.glb`), scroll-hero (GSAP 3.15.0, Lenis 1.3.26, `?progress=` jump), splats. Splats need the WebGPU backend: r186 GaussianSplat uses storage buffers and a compute sort. Verify it on a machine with a current Chrome, not the cloud container. Each must pass `tw check`, `tw check --reduced-motion`, `tw lint` and a looked-at `tw shot`.
4. Run the unexecuted recipes (listed above) as scratch pages or scripts and record the result in each Verify section.
5. Verify WebGPU for real on a current Chrome with a GPU: html-webgpu, bloom-webgpu, tsl-custom-material, and webgpu-backend-check.
6. tw follow-ups:
   - `check` ignores console warnings; decide whether deprecation warnings should fail it.
   - A `/favicon.ico` 404 from an external dev server counts as a failed request.
   - The browser tests skip templates with a package.json; add build-then-check when `node_modules` exists. game-starter was checked by hand.
   - Features ranked by the tools research: perf percentiles, leak cycles, `--actions` input bursts, labels, a shaders listing, `--save`/`--against`.
7. Consider an em-dash check in `tw kb validate --strict` (house style; the third session removed them by hand).

## Gotchas

- Chrome blocks module imports from `file://`; tw serves the folder over localhost (also needed for `navigator.gpu`).
- ANGLE D3D "warning X4122" shader notes are filtered as noise.
- The cloud container: Chromium 141 (Playwright build) has a WebGPU adapter through SwiftShader, but three r186's WebGPU backend throws there (`swizzle: 'rgba'` is not a `GPUTextureComponentSwizzle`), so WebGPU pages are verified on the WebGL 2 fallback only; newer Chrome builds cannot be downloaded there. curl reaches registry.npmjs.org and raw.githubusercontent.com only (jsDelivr, unpkg, threejs.org and github.com are blocked); WebFetch and WebSearch work. Playwright's bundled ffmpeg encodes VP8 only; a full static ffmpeg and ffprobe come from npm `@ffmpeg-installer/linux-x64` and `@ffprobe-installer/linux-x64` (chmod +x).
- Release numbers from memory and even from research notes were wrong several times (UMD builds went in r161, `physicallyCorrectLights` in r160, `computeAsync` is not deprecated): check npm tarballs (`npm pack three@<v> --dry-run --json`) or the installed source.
- `node --test tests/` does not expand a folder on Node 22; use `node --test tests/*.test.mjs` (`npm test`).
- No AI attribution anywhere: commits and files carry none.

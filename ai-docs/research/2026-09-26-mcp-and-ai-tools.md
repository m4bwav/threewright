# MCP servers and AI tools for three.js work

Date: 2026-09-26
Track: MCP servers and AI tools for three.js work (research for threewright: skills, knowledge base, verification CLI `tw`, tests)
Status: first pass. Claims marked "unverified" were not confirmed against a primary source. npm download counts could not be read (api.npmjs.org is blocked here), so "real use" is ranked by GitHub stars, release cadence and registry presence. Tool counts and schema sizes marked "measured" come from running each server's `tools/list` over stdio on 2026-09-26.

## Summary

- General browser MCPs carry almost all real use. Chrome DevTools MCP has 52.6k stars (npm 1.10.1, 2026-09-23). Playwright MCP has 37.6k stars (0.0.82, 2026-09-18). Neither knows about a three.js scene. Playwright's accessibility snapshot is empty for a canvas, so canvas input needs coordinate clicks behind `--caps=vision`.
- The most complete three.js-aware agent tooling is XR specific. Meta IWSDK 1.0.0 (npm, 2026-09-24) exposes 55 MCP tools (measured from its contract; the sibling note said 45 at 0.5.3). It returns screenshot paths, not bytes, and has a headless "agent" mode. It only works inside IWSDK apps.
- The general three.js MCP, threejs-devtools-mcp, has 60 live tools (README says 59), 109 stars and no commit since 2026-03-23. Its tool list costs 41.4 KB of schema (about 10k tokens, measured). Screenshots come back inline at full canvas size (2,691 tokens for a 1920x1080 canvas).
- The official three.js DevTools extension now lives in the three.js repo (`devtools/`, v1.18 in r186, merged 2026-08-29). It uses the same `__THREE_DEVTOOLS__` hook as tw and has no agent interface. The old `threejs/three-devtools` repo is archived. There is no `mrdoob/three-devtools` repo (404).
- Vendors converge on "files, not bytes". Chrome DevTools MCP's design principles say "Reference over Value". IWSDK 1.0 returns `screenshotPath`. Playwright recommends its CLI plus skills over MCP for coding agents. IWSDK's own guidance says MCP for one-off calls and CLI for loops. This supports tw staying a zero-dependency CLI.
- On the asset side, Blender MCP (29.4k stars, renamed `mcp-for-blender` 2.1.0 on PyPI, 2026-09-25) is the most used 3D MCP. Meshy ships an official MCP (24 tools) and CLI. Tripo ships an official CLI and SDK but no official MCP. An official Blender Lab MCP exists (v1.0.3, 2026-09-11, unverified).
- glTF Transform CLI 4.5.0 (2026-09-01) is still the inspect, validate and optimize workhorse. Its `validate` wraps the Khronos validator npm build 2.0.0-dev.3.10 from 2024-10-22, which lags the validator repo (KHR_node_visibility checks added 2025-12-30).
- Licenses matter for generated assets. TRELLIS.2 and TripoSG are MIT. Hunyuan3D 2.1 weights exclude the EU, UK and South Korea. SF3D and SPAR3D use the Stability Community License. SAM 3D Objects uses the SAM License. Epic sold Sketchfab and ArtStation to KitBash (announced 2026-08-10).
- The official MCP registry holds few real three.js servers. Its search is a name substring match full of noise ("$THREE" crypto tokens, freight "3D" packing). Blender MCP, Meshy MCP, IWSDK, Needle and the Spector MCP are not in it.
- tw already covers errors, failed requests, renderer and scene summaries, compact trees, multi-view sheets, token-priced screenshots and deterministic video, at 767 bytes for a full `check` on the starter template. The best gaps to close, all as compact text: numeric pixel checks, run-to-run diffs, frame-time percentiles, leak checks and input bursts.

---

## 1. Scene inspection and debugging tools for agents

### 1.1 Identity, maintenance and real use (ordered by stars)

Status legend: active = release or commit within 60 days (after 2026-07-28); quiet = 60 to 180 days; dormant or stale = over 180 days.

| # | Tool | Maker | License | Latest release (npm unless noted) | Stars | Last commit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Chrome DevTools MCP | Google (ChromeDevTools) | Apache-2.0 | chrome-devtools-mcp 1.10.1 (2026-09-23), 64 versions | 52.6k | 2026-09-25 | active |
| 2 | Playwright MCP | Microsoft | Apache-2.0 | @playwright/mcp 0.0.82 (2026-09-18) | 37.6k | 2026-09-25 | active |
| 3 | Playwright CLI | Microsoft | Apache-2.0 | @playwright/cli 0.1.21 (2026-09-18), first 2026-01-26 | 13.6k (repo predates the CLI, unverified) | unverified | active |
| 4 | Spector.js and its MCP | BabylonJS | MIT | spectorjs 0.9.33 (2026-09-14); MCP only in repo (`mcp/`, name `@spectorjs/mcp` 1.0.0, not on npm) | 1.6k | 2026-09-25 | active |
| 5 | r3f-perf | utsuboco | MIT | 7.2.3 (2024-11-08) | 781 | 2024-11-08 | stale |
| 6 | Meta IWSDK MCP runtime | Meta | MIT | @iwsdk/cli 1.0.0 on dist-tag `next` (2026-09-24); `latest` still 1.0.0-rc.2 (2026-09-24); 0.5.3 was 2026-08-11 | 358 | 2026-09-25 | active |
| 7 | stats-gl | Renaud Rohlinger | MIT | 4.2.3 (2026-07-10) | 280 | 2026-07-10 | quiet |
| 8 | threejs-devtools-mcp | DmitriyGolub | MIT | 0.4.1 (2026-03-23); registry entry still 0.2.1 | 109 | 2026-03-23 | dormant |
| 9 | three.js DevTools extension | mrdoob/three.js | MIT | v1.18 in r186 (PR #34399 merged 2026-08-29) | part of three.js | 2026-08-29 | active |
| 10 | Needle Inspector and Needle MCP | Needle Tools | extension free; MCP and AI editing in Pro (paid) | needle-cloud 2.6.0 (2026-09-23) hosts the MCP | n/a | n/a | active (user count unverified) |

### 1.2 What each returns, how big it is, how to install it

Schema sizes are the JSON of `tools/list`, measured 2026-09-26. Token estimates use 4 characters per token (rough). Clients that defer MCP schemas pay less up front. Image costs use Claude's patch formula `ceil(w/28) * ceil(h/28)` (see the sibling note on token budgets).

| Tool | Tools (default / all) | three.js awareness | Returns | Schema (measured) | Default screenshot | Install |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome DevTools MCP | 30 / 59; `--slim` 3 | none (DOM, console, network, perf traces, heap) | text summaries; screenshot inline unless `filePath`; traces and heap snapshots to files | 26.4 KB (about 6.6k tokens); slim 0.95 KB (about 240) | viewport, inline (1280x720 is 1,196 tokens) | `npx -y chrome-devtools-mcp@latest` (`--headless`, `--slim`); experimental CLI `chrome-devtools` with a background daemon |
| Playwright MCP | 25 / 70 (opt-in `--caps`) | none; accessibility snapshot empty for canvas | accessibility text; screenshots inline by default (`--image-responses omit` drops them); snapshot can go to a `filename` | 20.1 KB (about 5.0k) | viewport, inline | `npx @playwright/mcp@latest` |
| Playwright CLI | shell commands (80+ per repo page, unverified) | none | files on disk and short text | none; `--help` read on demand | file path | `npm i -g @playwright/cli@latest`, then `playwright-cli install --skills` |
| Spector MCP | 13 | WebGL call level: draw calls, GL state, shader source, textures; no WebGPU | JSON summaries; canvas screenshot | not measured | canvas | clone Spector.js, `npm run mcp:install && npm run mcp:build`; Playwright headless Chromium |
| r3f-perf | in-page component | R3F only | on-page panel; `PerfHeadless` plus `usePerf` for numbers | n/a | n/a | `npm i -D r3f-perf`, `<Perf />` |
| IWSDK MCP | 55 (xr 16, ecs 11, browser 6, runtime 5, scene 13, ui 3, asset 1); the contract names 94 operations, the rest CLI only | ECS, three.js runtime hierarchy, XR session and input emulation | JSON envelopes; screenshots as `screenshotPath`; image region metrics as numbers | 83.5 KB for the 55 runtime tools (about 21k) | bounded to 800x800 (841 tokens if read) | `npm create @iwsdk@latest`; `@iwsdk/vite-plugin-dev` with `ai: { mode: 'agent' }` or `'collaborate'`; `npx @iwsdk/cli adapter sync` writes configs for Claude Code, Cursor, Copilot, Codex, OpenCode |
| stats-gl | in-page panel | renderer (WebGL and WebGPU): FPS, CPU, GPU via timestamp queries | panel; `getData()` returns `{ fps, cpu, gpu, gpuCompute }`; `StatsProfiler` for workers | n/a | n/a | `npm i stats-gl`, `stats.init(renderer)` |
| threejs-devtools-mcp | 60 live (README 59) | scene, objects, materials, shaders, textures, animation, perf, memory, post-processing | compact text tree (about 2 KB by its docs), JSON details; images inline plus a copy in `screenshots/` | 41.4 KB (about 10.3k) | full canvas size, inline (1920x1080 is 2,691; a DPR 2 canvas hits the 4,784 cap) | `claude mcp add threejs-devtools-mcp -- npx threejs-devtools-mcp`; runs a proxy on port 9222 in front of the dev server |
| three.js DevTools | none (human panel) | scenes, objects, renderers | UI only | n/a | n/a | load unpacked from the three.js repo `devtools/` folder |
| Needle Inspector | unverified | hierarchy, properties, performance; edits pulled back with `get_edits` | JSON (unverified) | not measured | unverified | Chrome extension (free); MCP through `npx needle-cloud start` (Pro) |

For comparison, tw: `node scripts/tw.mjs --help` is 1,855 bytes (about 460 tokens) and is read only when needed. `tw check` on `templates/html-importmap` printed 767 bytes (about 190 tokens). `tw scene` printed 226 bytes. `tw shot` writes a 960x540 PNG to disk and prints its cost (700 tokens if the model opens it).

### 1.3 Notes per tool

**threejs-devtools-mcp.** Correction to the sibling note: it is not a CDP bridge. It proxies the dev server on port 9222 (port auto-detected from `package.json`) and injects a WebSocket bridge into the HTML. The bridge catches Scene and Renderer through `__THREE_DEVTOOLS__`. The tab must stay open. `HEADLESS=true` switches to headless Puppeteer for CI. R3F animation control needs manual `window.__THREE_ANIMATION_MIXERS__` wiring. Ideas worth copying: `dispose_check` (renderer.info.memory counts minus unique in-scene geometries and textures, plus hidden meshes that still hold geometry), `perf_monitor` (FPS and frame time p50, p95, p99 with spike detection), `annotated_screenshot` (type-tagged labels, duplicates grouped as xN), `scene_diff` (snapshot then diff), `find_objects` (filter by type, material, name regex). Its token guide says the compact tree is about 2 KB against 60 KB of JSON.

**Meta IWSDK MCP runtime.** Modes: `collaborate` (visible Playwright browser, DevUI on) and `agent` (headless Playwright, fixed viewport, no DevUI). `screenshotSize` defaults to 800x800. Device emulation through IWER (npm `iwer` 2.5.0, 2026-09-24, MIT) for Quest 2, 3, Pro, Quest 1 and Meta VR Glasses, with synthetic AR rooms. Its agent guide says "MCP and CLI are one surface" and to use MCP for one-off calls and the CLI to loop, script or filter large responses. Useful ideas: `scene_measure_image_regions` (linear-sRGB luma percentiles, mean OKLab color, highlight and shadow footprints, "never a universal similarity pass"), `asset_render_preview` (labeled multi-view contact sheet with an optional clay pass, the same idea as `tw sheet`), `browser_profile` (explicitly "uncalibrated desktop" numbers), `ecs_snapshot` and `ecs_diff`. Physical headsets pair over adb, but screenshots and profiling stay host only.

**Needle Inspector.** The extension is free and covers WebGL, WebGPU, R3F and Needle Engine. Pro adds live property editing on dev servers, memory and leak tools, AI editing through MCP, and export. Pro is a one-time purchase and is included with Needle Engine Pro (from 49 EUR per user per month, unverified). The MCP server runs inside `needle-cloud start` (the CLI changelog adds an MCP server in 1.6.0, MCP stdio proxy tools in 1.10.3 on 2026-05-06, and hardening in 2.3.0 on 2026-06-09). Edits can be saved as JSON and pulled by an agent with `get_edits`. Needle docs hosts were blocked, so tool names beyond `get_edits` are unverified.

**Official three.js DevTools.** PR #30870 ("Added new DevTools") merged 2026-04-07 and shipped in r184 as v1.15. Later: 1.16 (2026-06-08), 1.17 (2026-08-27), 1.18 (2026-08-29, r186). Features: collapsible scene tree, object details with a preview render using the page's own three.js, a box highlight on hover, renderer stats and memory for WebGLRenderer and WebGPURenderer. How it hooks in: when `window.__THREE_DEVTOOLS__` exists, three.js dispatches `register` (revision) and `observe` (Scene, renderers, AnimationMixer, Loader). Confirmed in r186 source: `Scene.js`, `WebGLRenderer.js`, `WebGPURenderer.js`, `AnimationMixer.js`, `Loader.js`, `Three.Core.js`. The folder is not in the npm `three` package. A Chrome Web Store item named "Three.js DevTools" exists (id `jechbjkglifdaldbdbigibihfaclnkbo`); whether it tracks the in-repo build is unverified. The commits of PR #34399 carry a co-author trailer for an AI coding agent (Claude), so the three.js maintainer builds this tool with an agent.

**Chrome DevTools MCP.** Flags add memory debugging (heap snapshot compare, retainers, dominators), extensions, PWA, screencast, coordinate clicks, "third-party developer tools" and WebMCP. `--slim` keeps 3 tools (navigate, evaluate, screenshot). Usage statistics are on by default (off with `--no-usage-statistics` or when `CI` is set). Performance tools may send trace URLs to CrUX (`--no-performance-crux`). Third-party tools let a page expose its own tools: the page listens for a `devtoolstooldiscovery` event and calls `event.respondWith({ name, tools: [{ name, description, inputSchema, execute }] })`; the agent calls `execute_3p_developer_tool` (flag `--categoryExperimentalThirdParty`). tw's page helpers could register this way.

**Playwright MCP and CLI.** Default 25 tools (24 core plus tabs). Opt-in capability groups: config 1, network 4, storage 17, devtools 13, vision 6, pdf 1, testing 3. Playwright MCP collects tools that a page registers through WebMCP by default (`--no-webmcp` turns it off). The CLI keeps sessions, installs skills, and writes everything to disk. A per-task benchmark of about 114k tokens (MCP) against 27k (CLI) is widely quoted as the Playwright team's number (secondary sources, unverified). One 2026 blog says MCP 0.0.78 closed the gap by writing snapshots to files (unverified).

**Spector.js.** WebGL and WebGL2 only. Programmatic API (`captureCanvas`, `onCapture` JSON) and a worker bundle for headless capture. MCP tools: `load_url`, `load_playground`, `take_screenshot`, `list_canvases`, `select_canvas`, `capture_frame`, `get_draw_calls`, `get_command_details`, `get_shaders`, `get_textures`, `get_webgl_state`, `get_context_info`, `get_console_logs`.

**stats-gl and r3f-perf.** stats-gl is the maintained in-page monitor with GPU timing for WebGL and WebGPU. r3f-perf has not changed since 2024-11-08 (peer range `@react-three/fiber >=8.0`; WebGPU support not documented).

### 1.4 Other agent browser tools seen

| Tool | What matters for 3D | Version, date | Stars |
| --- | --- | --- | --- |
| vercel-labs/agent-browser (Rust CLI plus MCP) | `screenshot --if-changed` skips identical images "to save tokens"; `diff screenshot --baseline` pixel diff; `--annotate` numbered labels; `batch` many commands in one call | 0.38.1 (2026-09-16), Apache-2.0 | 43.2k |
| Cursor built-in browser (Cursor 2.0 and 3) | agent sees screenshots as images, reads console and network logs | Cursor docs, 2026 (unverified details) | n/a |
| OpenAI Codex skills `develop-web-game` and `playwright-interactive` | page exposes `window.render_game_to_text()` (concise JSON state) and `window.advanceTime(ms)`; Playwright client sends input bursts and captures screenshots and console errors; screenshots normalized to CSS pixels to cut tokens | openai/skills repo (27.6k stars); `develop-web-game` read from a mirror, upstream path moved (unverified) | n/a |

---

## 2. Asset creation and sourcing tools usable by agents

### 2.1 Pipeline tools (validate, inspect, optimize)

| Tool | Version, date | License | Agent use | Notes |
| --- | --- | --- | --- | --- |
| glTF Transform CLI (`@gltf-transform/cli`) | 4.5.0 (2026-09-01) | MIT | `inspect <file> --format pretty\|csv\|md`; `validate <file> --format ... --ignore CODES --limit N`; `optimize` with `--compress`, `--texture-compress`, `--texture-size`, `--simplify`, `--join`, `--instance`, `--palette`, `--flatten`, `--prune` | depends on `gltf-validator ~2.0.0-dev.3.10` and `meshoptimizer ~1.2.0`; 1,976 stars |
| gltfpack and meshoptimizer | 1.3.0 (2026-09-25) | MIT | `gltfpack -i in.glb -o out.glb -cc -tc -si 0.5` (KTX2 via `-tc`, WebP via `-tw`, simplify `-si`, quantization flags) | 8.4k stars; fastest optimizer |
| Khronos glTF-Validator (npm `gltf-validator`) | 2.0.0-dev.3.10 (2024-10-22) | Apache-2.0 | library only, JSON report | repo commits to 2025-12-30 (KHR_node_visibility checks) not published to npm |
| @dcl/gltf-validator-ts (Decentraland) | 1.0.19 (2026-03-19) | MIT | TypeScript validator "compatible with the official Khronos validator" | possible pure-JS option; parity unverified |
| @khronosgroup/gltf-asset-auditor | 1.0.6 (2026-07-27) | Apache-2.0 | PASS or FAIL against a 3D Commerce use-case schema | for product viewers |
| gltf-mcp (elixr-games) | 0.2.0 (2026-02-10), one release | MIT | `get_gltf_info`, `render_gltf` | dormant |
| GLBForge MCP (`@glbforge/mcp`) | 0.8.0 (2026-09-11), first 2026-08-20 | MIT | tools include `inspect_geometry`, `inspect_materials`, `analyze_performance`, `render_preview`, `compare_glb`, `optimize_glb`, `export_usdz`, plus Meshy generation (exact count unverified) | new, small |
| meshcheck-mcp | 0.1.1 (2026-07-20) | MIT | validate, render, inspect via a hosted meshcheck API | depends on a third-party API |
| rupa3d | 1.6.2 (2026-09-15) | MIT | checks a GLB against a spec and embeds a measured certificate | new |
| vrm-toolkit-mcp | 0.1.1 (2026-08-05) | MIT | inspect, validate, preview VRM and VRMA | niche, useful for avatars |
| Needle Cloud CLI `optimize` | needle-cloud 2.6.0 (2026-09-23) | proprietary service | cloud optimization of glTF, GLB, VRM, FBX, USD with Draco, KTX2, progressive loading | account needed |

### 2.2 Blender bridges

| Tool | Version, date | License | Tools | Notes |
| --- | --- | --- | --- | --- |
| MCP for Blender (ahujasid; repo renamed `mcp-for-blender`) | PyPI `mcp-for-blender` 2.1.0 (2026-09-25); `blender-mcp` 2.0.0 (2026-09-16) is now a rename shim; first release 2025-03-08 | MIT | 36 (scene and object info, `execute_blender_code`, `export_scene` to GLB or FBX, `get_viewport_screenshot`, node and bpy API lookup, Poly Haven, Sketchfab, Poly Pizza, Hyper3D Rodin, Hunyuan3D, Tripo) | 29.4k stars; viewport screenshot returned inline, default `max_size` 1000 (756 tokens at 16:9); `BLENDER_MCP_SAFE_MODE=1` screens scripts; minimal anonymous usage record by default, `DISABLE_TELEMETRY=true` stops it; several tools ask the agent to pass the user's words verbatim in `user_prompt`; "premium" mode generates via Hunyuan3D, Tripo and Rodin without your own keys |
| Official Blender Lab MCP (`lab/blender_mcp`) | v1.0.0 (2026-04-27, Dalai Felinto), v1.0.3 (2026-09-11, fixes screenshot capture) | unverified | Python API access, blend-file inventories, missing-file reports, viewport screenshots, search over the Python API reference and manual | distributed as a Blender Extension; all details from search snippets (blender.org blocked), unverified |
| blend-ai (HoldMyBeer-gg) | active (repo updated 2026-09-25) | unverified | 175 tools | 147 stars |
| blender-open-mcp | active | unverified | Ollama-focused | 120 stars |

### 2.3 Text-to-3D and image-to-3D

| Service or model | Current version (2026) | License or terms | Outputs | Pricing notes | Agent access |
| --- | --- | --- | --- | --- | --- |
| Meshy | Meshy 6 and Meshy 7 (unverified) | paid plans own outputs; free tier assets public (secondary source) | GLB, FBX, OBJ, STL and more (secondary source) | 20 credits per text or image to 3D; Pro 20 USD per month for 1,000 credits; Studio 60 USD for 4,000; API needs Pro (secondary sources) | official MCP `@meshy-ai/meshy-mcp-server` 0.5.2 (2026-09-22, MIT, 24 tools, 49 stars); official CLI `meshy-cli` and `@meshy-ai/cli` 0.4.0 (2026-09-23, JSON output for agents) |
| Tripo (VAST) | H3.1 and v3.0 models on the v3 API | commercial terms per plan (unverified) | GLB by default (`tripo-cli`); GLTF, FBX, OBJ, STL, USDZ, 3MF through convert (per a third-party MCP README) | 1 credit = 0.01 USD, per-task pricing (Tripo docs via search, unverified) | official `tripo-cli` 0.5.1 (2026-09-18, MIT; `tripo make "prompt"` writes `model.glb`, `preview.png`, `task.json`); official `@vastai/tripo-sdk` 0.3.0; third-party `tripo-ai-mcp-server` 1.1.0 (2026-04-27, ISC); inside Blender MCP premium |
| Hyper3D Rodin (Deemos) | Gen-2 and Gen-2.5 API | per plan (unverified) | GLB, USDZ, FBX plus PNG textures | direct credits 1.5 USD each; Creator 30 USD per month; Business 120 USD with API (secondary) | inside Blender MCP; fal.ai endpoint |
| Hunyuan3D (Tencent) | 3.0 (Sep 2025) and 3.1 (Jan 2026) hosted only; open weights up to 2.1 | 2.1 weights: Tencent Hunyuan 3D 2.1 Community License, does not apply in the EU, UK and South Korea (read in LICENSE) | GLB with PBR | Tencent Cloud credits; Replicate hosts 3.1 | inside Blender MCP (official API mode); 3D AI Studio MCP (PyPI `mcp-server-3daistudio` 1.0.1, 2026-03-14) |
| TRELLIS.2 (Microsoft) | 4B model, released December 2025 | MIT (read in LICENSE) | textured mesh with PBR | self-host on a large GPU | 3D AI Studio; three.ws MCP (crypto-payment stack) |
| TripoSG (VAST) | open model | MIT (read in LICENSE) | mesh | self-host | none official |
| Stability SF3D and SPAR3D | open models | Stability AI Community License (free under 1M USD annual revenue) | GLB | self-host or API | none official |
| SAM 3D Objects (Meta) | Nov 2025 | SAM License (2025-11-19, read in LICENSE) | object mesh with texture, pose, layout | self-host | none |
| Seed3D 1.0 (ByteDance), Sparc3D and Hi3D (Math Magic) | Oct 2025 paper; hosted Hi3D | unverified | simulation-ready meshes; watertight high-resolution geometry | unverified | none found |
| Nova3D (RareSense) | PyPI 0.4.0 (2026-07-01) | unverified | part-aware GLB with named parts plus a Blender script | unverified | MCP in the official registry |
| Luma Genie | sunset since 2026-01-01 (secondary source, unverified) | n/a | n/a | n/a | none |

Agent verdict: the official CLIs (Meshy, Tripo) fit tw's CLI-first stance better than MCP servers. Every generated model should go through `tw glb` and `gltf-transform validate` before use.

### 2.4 Asset libraries and licenses

| Source | License | Access | MCP | Notes |
| --- | --- | --- | --- | --- |
| Poly Haven (HDRIs, textures, models; about 2,400 assets) | CC0 | free public API at api.polyhaven.com | inside Blender MCP; threenative-asset-mcp | API terms: send a unique Referer or User-Agent; live-API use inside a product needs a visible "Powered by Poly Haven" style credit; downloaded assets need no credit |
| ambientCG (2,000+ PBR materials, HDRIs) | CC0 | API v1 and v2 still work; v3 added for downloads | threenative-asset-mcp | exact v3 endpoints unverified |
| Kenney (about 60,000 assets, 4,812 glTF models in 49 kits per a mirror) | CC0 | direct download | 3dassets-mcp lists CC0 packs (unverified overlap) | counts from a third-party mirror, unverified |
| Quaternius (stylized low poly, rigged, animated) | CC0 | direct download | none | good for game characters |
| Poly Pizza (about 10,600 low-poly models incl. rescued Google Poly) | about 69% CC-BY, rest CC0 | free API key | inside Blender MCP | CC-BY needs credit; CDN blocks datacenter IPs |
| Sketchfab (1M+ downloadable models) | CC BY, BY-SA, BY-ND, BY-NC, CC0 per model; store items moved to Fab | Download API needs the end user's Sketchfab login; temporary glTF and USDZ URLs expire (300 s in examples) | inside Blender MCP; old `sketchfab-mcp-server` (2025-03) | KitBash bought Sketchfab and ArtStation from Epic (announced 2026-08-10), "no immediate changes" |
| Fab, Smithsonian 3D | per item | web | threenative-asset-mcp 0.9.5 (2026-09-26, UNLICENSED) | read licenses per item |
| 3dassets.dev | CC0 | web and MCP | `3dassets-mcp` 1.0.0 (2026-09-07), 20 tools, in the official registry | new |
| Mixamo (Adobe) | royalty-free with an Adobe account | web only | none | still online in Sep 2026 but unmaintained, outages in 2025 (secondary source) |

### 2.5 World and splat generators

- World Labs Marble: World API launched 2026-01-21; Marble 1.1 and 1.1 Plus on 2026-04-02. Exports SPZ or PLY splats (about 2M or 500k splats), a GLB collider mesh (100k to 200k triangles) and a high-quality GLB mesh (about 600k triangles). Plans 20, 35 and 95 USD per month; about 1.20 USD per Marble 1.1 world through the API. All from secondary sources (World Labs hosts blocked), unverified. Only community MCP servers exist (jkoets, sandraschi). Web delivery is Spark or the r186 native splat loader (see the sibling note).
- Tencent HY-World 2.0 (open) outputs 3DGS, meshes and point clouds (license unverified). WorldSplat is an open-source text-to-splat tool (maturity unverified).

### 2.6 AI texture tools

Scenario, 3D AI Studio, CraftPBR and the retexture endpoints of Meshy and Tripo generate tileable PBR sets from text or images. Needle Cloud has a `generate-material` command. Only Scenario has an agent-facing MCP plus skills (scenario-labs/skills, 566 stars, created 2026-08-12). Quality and licenses are unverified; treat them as note-only.

---

## 3. Registry scan

### 3.1 Method

The official registry was queried with curl on 2026-09-26: `https://registry.modelcontextprotocol.io/v0/servers?search=<term>&limit=100` for three, threejs, 3d (3 pages), blender, gltf, glb, webgl, webgpu, mesh, splat, gaussian, usd, fbx, vrm, render, cad, scene, asset, game, avatar, spatial, voxel and vendor names. `search` matches a substring of the server name, so "three" returns "$THREE" crypto tools and "3d" returns freight packing and 3D printing. Glama, PulseMCP and Smithery pages and APIs were blocked; their listings come from search results only.

### 3.2 Official MCP registry: three.js and 3D related entries

| Server (registry name) | Purpose | Last update | Flag |
| --- | --- | --- | --- |
| io.github.DmitriyGolub/threejs-devtools | inspect and edit live three.js scenes | registry 0.2.1 (2026-03-16); npm 0.4.1 (2026-03-23) | dormant; registry entry stale |
| io.github.Evozim/threejs-weaver | "mesh generator and WebGL scene builder" over SSE | 2026-05-28 | no source repo; same publisher lists many "premium agentic endpoints"; untrusted |
| io.github.nirholas/three.ws, threews-3d-studio(-free), threews-avatar, scene-mcp, 3d-agent-mcp | avatars, glTF tools, text to 3D (TRELLIS), dioramas | 2026-06-12 to 2026-08-21 | active; bundled with x402 USDC payments and Solana token tools; note only |
| app.3dstreet/3dstreet | drive an open 3DStreet tab (A-Frame on three.js); relay for clients without WebMCP | npm 0.2.3 (2026-09-03) | active; AGPL-3.0 |
| dev.3dassets/catalogue | search and download CC0 GLB models and packs | 2026-09-07 | new |
| dev.glbforge/glbforge | validate, inspect, render, optimize GLB and USDZ; budgets | 2026-09-12 | new |
| io.github.brac/meshcheck-mcp | GLB validation and rendering through a hosted API | 2026-07-20 | quiet |
| io.github.tiranyx/rupa3d | GLB spec checks, OCCT CAD, embedded proof | 2026-09-15 | new |
| io.github.dwarehouse1/vrm-toolkit-mcp | VRM and VRMA inspect, validate, preview | 2026-08-05 | new |
| io.github.kleinicke/3d-visualizer | point clouds, meshes, depth data with inline previews | 2026-09-08 | active |
| io.github.RareSense/Nova3D | part-aware 3D generation | 2026-07-01 | quiet |
| io.github.whale-professor/mcp-server-3daistudio | Hunyuan and TRELLIS through 3D AI Studio | 2026-03-14 | dormant |
| io.github.ellmos-ai/ellmos-blender-use-mcp | headless Blender asset QA, FBX reimport checks | 2026-07-24 | quiet, alpha |
| online.sceneplane/sceneplane | cloud Blender: scenes, renders, MP4, STL, GLB | 2026-08-20 | hosted; source unverified |
| io.github.pascalorg/editor | Pascal architectural editor (R3F, WebGPU) hosted MCP | 0.6.1 (2026-09-09) | active; repo 24.3k stars, MIT |
| org.r3js/r3 | build interactive 3D web apps from components (hosted) | 1.2.0 (2026-08-29) | stack unverified |
| ai.ludo/game-assets | AI game assets incl. 3D models and animations | 2026-01-30 | dormant |
| com.cinevva/game-creator | drive a Cinevva game session, import CC0 assets | 2026-08-01 | active |
| ai.origozero/zeromind | build 3D games in the Zero engine | 2026-09-20 | active |
| io.github.huruki-geo/voxeldraft | voxel models with previews | 2026-09-14 | active |
| dev.spatialpack/mcp | test assets in Apple Quick Look and Safari `<model>` | 2026-07-28 | quiet; relevant to USDZ viewers |
| io.github.SceneView/mcp | SceneView SDK docs and codegen (Android, iOS, Web; not three.js) | 2026-03-25 | dormant |
| io.github.pzfreo/build123d-mcp, io.github.fboldo/openscad-mcp-server, dev.bitbybit/cad, com.kernelcad/kernelcad, io.github.KittyCAD/zoo-mcp | parametric CAD, STL and STEP export | 2026-05-11 to 2026-09-25 | mixed (zoo-mcp quiet, the rest active); CAD, note only |
| io.github.ChromeDevTools/chrome-devtools-mcp | browser debugging | registry 1.9.0; npm 1.10.1 | active |
| io.github.microsoft/playwright-mcp | browser automation | 0.0.82 | active |
| io.github.RodRomer/render-mcp | hosted browser screenshots and console | 2026-09-03 | hosted |

Not in the official registry: MCP for Blender, Meshy MCP, IWSDK (project local), Needle, Spector MCP, `@modelcontextprotocol/server-threejs`, Three.js Resources MCP, Mint MCP.

### 3.3 Notable servers found outside the registry

| Server | Purpose | Version, date | Flag |
| --- | --- | --- | --- |
| @modelcontextprotocol/server-threejs (ext-apps example) | MCP Apps demo: `show_threejs_scene` renders agent-written three.js code inline in chat; `learn_threejs` returns docs | 2.0.3 (2026-09-25), MIT; pins `three ^0.181.0` | active; MCP Apps spec 2026-01-26; hosts listed: ChatGPT, Claude, VS Code, Goose |
| Three.js Resources MCP (threejsresources.com) | remote, read-only: version-verified guides, GLSL to TSL converter on the official transpiler, tools directory | remote, dates unverified | useful docs source; unverified |
| Mint MCP (mcp.mint.gg) plus mintdotgg/mint-threejs-skills | 3D asset generation plus three.js app skills | skills repo 114 stars (2026-07) | vendor |
| locchung/three-js-mcp | WebSocket control of a three.js scene, "only basic function" | 29 stars, created 2025-03 | toy |
| baryhuang/mcp-threejs | find downloadable models for three.js scenes | 5 stars | toy |
| CharlieKerfoot/threejs-mcp, dev261004/web3d-mcp-server, mithun-tagde/Three.js-MCP, creativedswork/threejs-editor-mcp (MCP App editor) | scene generation or control | 0 to 2 stars | toys |
| propersloth/parallax-threejs (Claude Code plugin) | bundles chrome-devtools-mcp, threejs-devtools-mcp, playwright-mcp and Spector; `/checkpoint` and `/diff` (pixel, console, scene graph, memory deltas), `/sweep` contact sheets, `/replay`, `/memcheck` | created 2026-08-01, 0 stars, MIT | idea source; needs `window.scene` exposed; vanilla three.js only |

### 3.4 Glama, PulseMCP, Smithery (from search results; pages blocked)

Glama lists threejs-mcp (CharlieKerfoot), threejs-devtools-mcp, web3d-mcp-server (three.js, A-Frame, Babylon.js), Three.js MCP Triangle and a three.ws connector. PulseMCP lists locchung three-js, threejs-devtools (with a stale "47 tools" count) and three.ws. No Smithery-specific three.js entries were confirmed. All unverified.

---

## 4. Agent workflows for 3D in practice

### 4.1 What people build and report

- Show HN, "Mario Galaxy game with Claude Code and Three.js in 53 days": 76K lines of TypeScript, about 735 commits, about 95% of the code written by Claude Code (Opus); the author set architecture and constraints and reviewed little (HN item 47600002, from search snippets; the thread itself was blocked).
- Show HN, "3D web-based multiplayer game with Claude Code" (item 46639408, snippets only).
- "Claude of Duty": a single-prompt three.js FPS by Matt Shumer; the repo reached 1,547 stars in three days (Enterprise DNA, 2026-07-28, secondary).
- three.js forum: "Three.js and AI Agents: A New Workflow" (2025-11-21, with a video), a "Claude code visualizer" showcase (`npx agent-world-viewer`), and skeptical threads ("AI is a big fat lie!", "Is AI taking over the visual/portfolio side of Three.js?"). Thread bodies were blocked; content unverified.
- img2threejs (16.9k stars, created 2026-07-15, Apache-2.0) is the breakout 2026 agent project for three.js: a skill that rebuilds an object from one reference image as procedural three.js code, with geometric gates before any render and one reference-versus-render comparison sheet per review pass.
- The three.js maintainer uses a coding agent for the DevTools extension (co-author trailers on PR #34399).

### 4.2 Verification loops seen

| Loop | Who uses it | Evidence | Weakness |
| --- | --- | --- | --- |
| Screenshot, look, fix | most agent users; Cursor browser; Playwright MCP; Codex skills | Cursor docs; OpenAI `develop-web-game` ("You must actually open and visually inspect the latest screenshots") | a black or empty frame has many causes; parallax's README: "a black object could be an unlit material, a missing texture, a broken shader, or the camera clipping through it" |
| Screenshot plus console errors | Codex `develop-web-game`, Chrome DevTools MCP, IWSDK | skill text; tool lists | still needs the image to judge the scene |
| Text state dump | Codex `develop-web-game` (`render_game_to_text`), threejs-devtools `scene_tree`, IWSDK `ecs_snapshot`, tw `scene` | skill text; tool docs | needs page cooperation or a hook |
| Deterministic stepping | Codex (`advanceTime(ms)`), IWSDK `ecs_step`, tw `video` virtual clock | skill text; contract | page contract differs per tool |
| One comparison sheet per review | img2threejs, IWSDK `asset_render_preview`, tw `sheet` | README, contract | cost scales with cycles |
| Pixel and scene diffs | parallax `/diff`, agent-browser `diff screenshot`, threejs-devtools `scene_diff` | READMEs | none mainstream yet |
| Numeric image measures | IWSDK `scene_measure_image_regions`, three.js e2e pixel thresholds | contract; sibling note | rare in agent tools |

Known traps: headless WebGL canvases screenshot black when the context or drawing buffer is not ready (the Codex skill says to rerun headed; tw captures through the compositor with `Page.captureScreenshot`, or reads the canvas right after its own render call). Canvas apps have an empty accessibility tree, so DOM-first tools cannot click into the scene without coordinates.

### 4.3 Token cost evidence

| Item | Cost | Source |
| --- | --- | --- |
| MCP tool schemas loaded per session | threejs-devtools-mcp 41.4 KB (about 10.3k tokens); Chrome DevTools MCP 26.4 KB (about 6.6k), slim 0.95 KB; Playwright MCP 20.1 KB (about 5.0k); IWSDK runtime 83.5 KB (about 21k) | measured 2026-09-26 |
| tw equivalent | help 1.9 KB (about 460 tokens) on demand; `check` 767 bytes; `scene` 226 bytes on the starter | measured 2026-09-26 |
| Default screenshots | tw 960x540 file: 700 tokens if opened; IWSDK 800x800 file: 841; Blender MCP 1000 px inline: 756; CDP or Playwright 1280x720 inline: 1,196; threejs-devtools 1920x1080 canvas inline: 2,691 (DPR 2 hits 4,784) | patch formula |
| Render-review cycle | about 5k to 12k tokens per cycle; 80k to 180k per object; characters 150k to 350k | img2threejs TOKEN_COST.md (engineering estimates, not measured) |
| Browser automation task | about 114k (MCP) against 27k (CLI) | secondary sources, unverified |

### 4.4 Lessons for tw

1. Keep images as files and print their token cost (tw already does).
2. Give the agent numbers before pictures: pixel stats, diffs and timings answer most "is it broken" questions.
3. Support the page contracts agents already know: `advanceTime(ms)` and `render_game_to_text()` from the Codex skill, next to tw's `__tw.renderFrame` and `__tw.ready`.
4. Offer input bursts, because games cannot be verified from the first frame.
5. Stay a CLI. Loops and filtering are cheaper in a shell, as IWSDK and Playwright both say.

---

## 5. Gaps: what these tools do that tw does not

### 5.1 Where tw already covers the job

| Job | tw today | Comparable tools |
| --- | --- | --- |
| Console errors, exceptions, failed requests, deduped | `check` (with fix hints from `hints.mjs`) | CDM console and network tools; threejs-devtools `console_capture`; IWSDK `browser_get_console_logs`; Spector `get_console_logs` |
| Renderer and scene summary with runtime warnings (black meshes, sRGB, camera off scene, aspect, near/far) | `check` | threejs-devtools `renderer_info`; IWSDK `scene_get_render_stats`; three.js DevTools renderer panel |
| Compact scene tree with duplicate runs collapsed | `scene` | threejs-devtools `scene_tree` (compact); IWSDK `scene_get_runtime_hierarchy` |
| Multi-angle contact sheet | `sheet` | IWSDK `asset_render_preview`; parallax `/sweep` |
| Screenshot to a file with its token cost | `shot` | IWSDK `browser_screenshot` (path); CDM with `filePath`; Playwright CLI |
| Deterministic video from a virtual clock | `video` | CDM screencast (flag), Playwright video (real time) |
| Scene capture with no page changes, including R3F mixers | `__THREE_DEVTOOLS__` hook | threejs-devtools needs manual mixer exposure in R3F; parallax needs `window.scene` |
| Offline CDN serving, environment doctor | `--cdn`, `doctor` | none |

### 5.2 Gaps and whether to close them

| Capability | Who has it | tw today | Add? | Compact form |
| --- | --- | --- | --- | --- |
| Numeric pixel checks (blank, black, clipped, coverage, bounding box, mean color) | IWSDK `scene_measure_image_regions`; agent-browser thresholds | none | yes, P1 | a `pixels:` line in `check` and `shot` |
| Run-to-run diff of scene, renderer, memory and pixels | threejs-devtools `scene_diff`; parallax `/checkpoint` `/diff`; agent-browser `diff screenshot`; IWSDK `ecs_diff` | none | yes, P2 | `--save run.json`, `--against run.json`; `tw diff a.png b.png` |
| Frame-time percentiles, long frames, GPU time, CPU throttling | threejs-devtools `perf_monitor`; stats-gl; CDM `emulate` and traces; IWSDK `browser_profile` | one-frame draw calls only | yes, P3 | `tw perf <page> --seconds 5 --cpu-throttle 4` |
| Leak detection | threejs-devtools `dispose_check`; parallax `/memcheck`; CDM heap tools; Needle Pro | memory counts, no comparison | yes, P4 | orphan warning in `check`; `--cycles N` |
| Input and interaction | IWSDK `browser_interact`; Playwright; Codex input bursts; parallax `/replay` | none | yes, P5 | `--actions "key Space 200; click 480,270; wait 500"` |
| Live edits and code evaluation | threejs-devtools `set_*` and `run_js`; Needle Pro; IWSDK `ecs_set_component`; CDM `evaluate_script` | none | yes, P6, as one-shot eval | `--eval "<js>"`; `sheet --sweep path=a,b,c` |
| Labeled screenshots grouping duplicates | threejs-devtools `annotated_screenshot`; agent-browser `--annotate` | views labeled only | yes, P7 | `shot --labels`, legend printed as text |
| Shader source and compile status | threejs-devtools `shader_list` and `shader_source`; Spector `get_shaders` | program count; compile errors reach the console | maybe, P8 | `tw shaders <page> [--dump dir]` |
| Many outputs per browser launch | Playwright CLI sessions; CDM CLI daemon; agent-browser `batch` | one Chrome per command | maybe, P9 | `check --shot a.png --sheet b.png --tree` |
| Page tools callable from other agents | CDM third-party tools; WebMCP (origin trial) | none | later, P10 | opt-in module registering `tw.summary` and `tw.tree` |
| XR emulation | IWSDK with IWER; Immersive Web Emulator | none | later, P11 | `--xr quest3` injecting IWER; point to IWSDK meanwhile |
| Performance traces, Core Web Vitals, Lighthouse, heap snapshots | CDM; parallax `/ship-check` | none | no, point to CDM | kb recipe |
| GL call capture and GL state | Spector | none | no, point to Spector | kb recipe |
| Scene export to GLB | threejs-devtools `scene_export` | none | no | note |
| glTF validation | glTF Transform; GLBForge; meshcheck; gltf-mcp | `glb` planned, `glb.mjs` not written yet | yes (already planned) | zero-dependency GLB parse plus optional `--deep` via glTF Transform |

---

## Implications for threewright

### Adopt, point or note, per tool

| Tool | Decision | Why and how |
| --- | --- | --- |
| glTF Transform CLI 4.5.0 (`inspect`, `validate`, `optimize`) | adopt | recipes in kb; optional `tw glb --deep` shells out to `npx @gltf-transform/cli inspect --format csv` and `validate --format csv` and summarizes |
| gltfpack 1.3.0 | adopt | optimization recipe (KTX2, meshopt, simplify) |
| Khronos glTF-Validator (through glTF Transform) | adopt indirectly | note the 2024-10-22 npm build lag |
| Poly Haven API, ambientCG, Kenney, Quaternius | adopt as default sources | CC0; record source URL and license next to each asset; live Poly Haven API use needs a visible credit |
| Page contract `advanceTime(ms)`, `render_game_to_text()` | adopt (pattern) | honor them in tw next to `__tw.renderFrame` |
| Numeric image measures, orphan heuristic, perf percentiles, grouped labels, checkpoint diffs | adopt (patterns) | as tw features below |
| Chrome DevTools MCP | point | best general browser MCP; use for perf traces and heap work; recommend `--slim` or its CLI to save tokens; mention usage statistics opt-out |
| Playwright CLI and MCP | point | DOM UIs around the canvas and scripted flows; canvas needs `--caps=vision`; set `--image-responses omit` |
| IWSDK MCP runtime | point | the tool for IWSDK and WebXR projects; kb `webxr` scenario |
| threejs-devtools-mcp | point, flagged dormant | only for live interactive editing sessions; budget about 10k schema tokens; screenshots are inline and large |
| Spector.js and its MCP | point | WebGL call-level shader and state debugging (no WebGPU) |
| three.js DevTools extension | point (humans) | same hook as tw; tw should chain to an existing hook |
| stats-gl | point | in-page HUD and GPU timing for humans |
| MCP for Blender; official Blender Lab MCP | point | asset authoring before three.js; export GLB, then `tw glb`; mention `BLENDER_MCP_SAFE_MODE` and telemetry settings |
| Meshy MCP and CLI; Tripo CLI and SDK | point | generation; prefer the CLIs; list license and region notes |
| TRELLIS.2, TripoSG | point | open MIT models for self-hosting |
| @modelcontextprotocol/server-threejs | point | "3D inside a chat answer" through MCP Apps for the docs scenario; note it pins three 0.181 |
| Three.js Resources MCP | point, unverified | docs lookups and GLSL to TSL conversion |
| World Labs Marble | point | splat worlds for backdrops; render with Spark or r186 |
| Needle Inspector MCP | note | paid Pro; human-in-the-loop editing then `get_edits` |
| r3f-perf | note, stale | prefer stats-gl or `tw perf` |
| agent-browser, parallax-threejs, img2threejs, Pascal editor, Mint MCP, Scenario skills | note | idea sources and neighbors |
| Registry small servers (gltf-mcp, GLBForge, meshcheck, rupa3d, vrm-toolkit-mcp, 3dassets-mcp, threenative-asset-mcp, 3dstreet, three.ws family, threejs-weaver) | note | young or single-maintainer; some tied to payments or hosted APIs |
| Rodin, Hunyuan3D, SF3D, SPAR3D, SAM 3D Objects, Seed3D, Sparc3D, HY-World | note | license and region caveats in the kb table |
| Sketchfab (KitBash), Mixamo, Poly Pizza | note | license per model; Mixamo unmaintained |
| AI texture tools | note | unverified quality |

### tw features to add, in priority order

All print compact text, with `--json` for machines. None needs a dependency.

1. **Pixel stats in `check` and `shot`.** After the settle render, read the canvas in the same task, downsample to about 96x54, and print one line: `pixels: bg 61% · near-black 3% · clipped 0% · mean luma 0.38 · content bbox 214,96 to 748,470`. Warn on a one-color canvas, an almost black frame, blown highlights, or content under 2% of the frame. This catches the most common agent failure without spending image tokens.
2. **Save and compare runs.** `tw check <page> --save before.json`, then `--against before.json` prints deltas: object and mesh counts, draw calls, triangles, programs, geometries, textures, new warnings, and the percent of changed pixels with a changed-region box (compared on the stored luma grid). Add `tw diff a.png b.png` with a zero-dependency PNG decode (zlib) for full images.
3. **`tw perf`.** Record 3 to 10 seconds of real frames: fps, frame time p50, p95, p99 and max, frames over 33 ms, draw calls and triangles per frame (min and max), memory growth, and GPU time when timer queries are available (WebGL `EXT_disjoint_timer_query_webgl2`; WebGPU timestamps, API unverified). `--cpu-throttle N` through `Emulation.setCPUThrottlingRate`. Label the numbers "headless, uncalibrated", as IWSDK does.
4. **Leak checks.** Add the orphan heuristic to `check` (renderer memory counts above the unique in-scene geometries and textures). `--cycles N` repeats a page hook (`__tw.cycle()`) or a reload and prints growth per cycle; flag steady growth.
5. **Input bursts and game hooks.** `--actions "key KeyW 500; click 480,270; drag 100,100 300,120; wait 1000"` on `check`, `shot`, `sheet` and `video`, sent through CDP `Input.dispatchKeyEvent` and `Input.dispatchMouseEvent`. When a page defines `advanceTime(ms)`, step with it; when it defines `render_game_to_text()`, print its output in `check`.
6. **One-shot eval and sweeps.** `--eval "<js>"` runs after settle with `scene`, `camera`, `renderer` and a `find(name)` helper in scope and prints the JSON result; it can also mutate before a capture. `sheet --sweep "find('knot').material.roughness=0,0.5,1"` renders one tile per value.
7. **Labels.** `shot --labels` and `sheet --labels` draw name tags at projected object centers, group duplicates as xN, skip off-screen and tiny objects, and print the legend as text so the model can match names to positions.
8. **`tw shaders`.** List programs with their owning materials and compile or link status; print the failing line with context; `--dump dir` writes sources to files and prints paths.
9. **Several outputs per launch.** `check --shot a.png --sheet b.png --tree` saves a Chrome start per extra command.
10. **Hook interop.** If `__THREE_DEVTOOLS__` already exists, add listeners instead of replacing it. Optionally register `tw.summary` and `tw.tree` as Chrome DevTools MCP third-party tools, and as WebMCP tools once that leaves the origin trial.
11. **XR later.** `--xr quest3` could inject IWER 2.5.0 and enter an emulated session; until then, point XR users to IWSDK.

Not planned: Chrome traces, Lighthouse and heap snapshots (point to Chrome DevTools MCP), GL call capture (point to Spector), long-lived live-edit sessions (point to threejs-devtools-mcp or Needle), and a tw MCP server. A thin optional MCP wrapper with three or four tools could come later for hosts without a shell.

### kb and skill entries

- `kb/agents/tooling.md`: decision table from section 1 with install snippets, measured schema sizes, image costs and the "files not bytes" rule.
- `kb/agents/token-budget.md` (proposed by the sibling note): add the measured schema sizes and default screenshot costs from section 4.3.
- `kb/assets/sources.md`: the license table from section 2.4, including the Poly Haven API credit rule and Sketchfab license filtering.
- `kb/assets/generation.md`: the table from section 2.3 with license and region caveats; always run `tw glb` and `gltf-transform validate` on generated models.
- `kb/assets/gltf-pipeline.md`: glTF Transform and gltfpack recipes with exact flags.
- `kb/assets/blender.md`: MCP for Blender and the Blender Lab MCP; safe mode; telemetry; export settings.
- Skill rule for `threewright-debug`: `tw check` first, then `tw scene`, then pixel stats and diffs, then one small `tw shot` only for visual questions; reach for MCPs only for live editing, traces or GL capture.

## Claims likely to change

- Tool counts: threejs-devtools-mcp 60 live (README 59); IWSDK runtime MCP 55 in 1.0.0 (45 in 0.5.x per Meta docs of 2026-09-04); Chrome DevTools MCP 30 default of 59; Playwright MCP 25 default of 70 (README truncated at 65,536 characters on npm).
- IWSDK dist-tags: 1.0.0 sits on `next` while `latest` is 1.0.0-rc.2; this will flip.
- threejs-devtools-mcp maintenance (dormant since 2026-03-23) and its stale registry entry (0.2.1).
- three.js DevTools version (1.18) and whether the Chrome Web Store item tracks it.
- WebMCP: origin trial in Chrome 149 to 156, ending 2026-11-16; API moved from `navigator.modelContext` to `document.modelContext` (secondary sources).
- Chrome DevTools MCP third-party tools protocol (experimental flag) and its default usage statistics.
- Playwright CLI versus MCP token gap (reported 4x, later reported closed; both unverified).
- glTF-Validator npm release (repo has KHR_node_visibility checks since 2025-12-30); glTF Transform's bundled meshoptimizer (1.2 versus 1.3).
- Blender MCP naming (`mcp-for-blender`), premium features and telemetry; Blender Lab MCP versions.
- Meshy model generation (6 or 7) and credit prices; Tripo H3.x models and pricing; Rodin Gen-2.5 pricing.
- Hunyuan3D 3.x weights (hosted only so far) and license territory.
- Sketchfab API terms under KitBash; Mixamo availability; Luma Genie status.
- Needle Inspector Pro price and MCP tool list.
- World Labs Marble plans and World API prices.
- MCP Apps host support and the pinned three version in `@modelcontextprotocol/server-threejs`.
- Claude image token formula and limits.

## Search plan for next refresh

1. `npm view <pkg> version time --json` for: threejs-devtools-mcp, chrome-devtools-mcp, @playwright/mcp, @playwright/cli, spectorjs, stats-gl, r3f-perf, @iwsdk/cli, @iwsdk/vite-plugin-dev, iwer, needle-cloud, @gltf-transform/cli, gltfpack, meshoptimizer, gltf-validator, @meshy-ai/meshy-mcp-server, meshy-cli, tripo-cli, @vastai/tripo-sdk, @modelcontextprotocol/server-threejs, @glbforge/mcp, 3dassets-mcp, agent-browser.
2. PyPI JSON: `https://pypi.org/pypi/mcp-for-blender/json`, `nova3d-mcp`, `mcp-server-3daistudio`.
3. Re-run the `tools/list` probe (stdio, `initialize` then `tools/list`) for each npm server and record tool count and bytes.
4. Official registry: `https://registry.modelcontextprotocol.io/v0/servers?search=` with three, threejs, 3d (all pages), blender, gltf, glb, splat, vrm, usd, webgpu, scene, asset, avatar, voxel, meshy, tripo, needle, iwsdk, spector.
5. Raw GitHub: three.js `devtools/manifest.json` and `devtools/README.md`; IWSDK `@iwsdk/cli` `dist/contract.js` (`RUNTIME_MCP_TOOLS`); chrome-devtools-mcp `docs/tool-reference.md` and `docs/design-principles.md`; Spector `mcp/README.md`; threejs-devtools-mcp `docs/tools.md`; blender-mcp `src/blender_mcp/server.py`; img2threejs `docs/TOKEN_COST.md`.
6. GitHub search: `threejs mcp`, `three.js mcp stars:>20`, `blender mcp stars:>100`, `gaussian splat mcp`, `webgpu mcp`, `develop-web-game filename:SKILL.md`.
7. Commit pages for last-commit dates of each tool in section 1.1.
8. License files: TRELLIS.2, TripoSG, Hunyuan3D (any 3.x weights), SF3D, SPAR3D, SAM 3D Objects, HY-World 2.0, Seed3D.
9. Vendor pricing pages (Meshy, Tripo, Hyper3D, World Labs, Needle) when reachable; otherwise mark unverified.
10. Poly Haven Public-API ToS; ambientCG API docs (v3); Sketchfab Download API guidelines after the KitBash deal.
11. Hacker News (hn.algolia.com API) and the three.js forum for "Claude Code three.js", "Cursor three.js", "Codex three.js", "MCP three.js" posts newer than 2026-09-26.
12. WebMCP status in Chrome release notes after 2026-11-16.

## Sources (URL plus date)

Read directly on 2026-09-26 unless marked "search result" (host blocked; content taken from search snippets, unverified).

1. threejs-devtools-mcp npm metadata and README, https://registry.npmjs.org/threejs-devtools-mcp (0.4.1, 2026-03-23)
2. threejs-devtools-mcp repo, https://github.com/DmitriyGolub/threejs-devtools-mcp (109 stars, 38 commits)
3. threejs-devtools-mcp commits, https://github.com/DmitriyGolub/threejs-devtools-mcp/commits/main (last 2026-03-23)
4. threejs-devtools-mcp tools reference, https://raw.githubusercontent.com/DmitriyGolub/threejs-devtools-mcp/main/docs/tools.md
5. threejs-devtools-mcp token-efficient workflow, https://raw.githubusercontent.com/DmitriyGolub/threejs-devtools-mcp/main/docs/workflow.md
6. threejs-devtools-mcp advanced setup, https://raw.githubusercontent.com/DmitriyGolub/threejs-devtools-mcp/main/docs/advanced.md
7. threejs-devtools-mcp 0.4.1 package source (`dist/index.js`, `dist/inject.global.js`), https://registry.npmjs.org/threejs-devtools-mcp/-/threejs-devtools-mcp-0.4.1.tgz
8. @iwsdk/cli npm metadata, https://registry.npmjs.org/@iwsdk%2fcli (1.0.0 on `next`, 1.0.0-rc.2 on `latest`, 2026-09-24)
9. @iwsdk/cli 1.0.0 package (`README.md`, `guidance/AGENTS.md`, `dist/contract.js`), https://registry.npmjs.org/@iwsdk/cli/-/cli-1.0.0.tgz
10. @iwsdk/vite-plugin-dev 1.0.0 README, https://registry.npmjs.org/@iwsdk/vite-plugin-dev/-/vite-plugin-dev-1.0.0.tgz
11. facebook/immersive-web-sdk repo and commits, https://github.com/facebook/immersive-web-sdk (358 stars; last commit 2026-09-25)
12. IWER npm, https://www.npmjs.com/package/iwer (2.5.0, 2026-09-24)
13. Meta IWSDK AI tooling docs, https://beta.developers.meta.com/horizon/documentation/web/iwsdk-ai-assisted-dev-tooling/ (cited by the sibling note, updated 2026-09-04; blocked here)
14. Needle Inspector docs, https://engine.needle.tools/docs/three/needle-devtools-for-threejs-chrome-extension.html (search result)
15. Needle MCP server docs, https://engine.needle.tools/docs/ai/needle-mcp-server.html (search result)
16. needle-cloud npm package, README and CHANGELOG, https://www.npmjs.com/package/needle-cloud (2.6.0, 2026-09-23)
17. three.js DevTools README, https://raw.githubusercontent.com/mrdoob/three.js/dev/devtools/README.md
18. three.js DevTools manifest, https://raw.githubusercontent.com/mrdoob/three.js/dev/devtools/manifest.json (v1.18; r184 tag shows v1.15)
19. three.js PR #30870 "Added new DevTools", https://github.com/mrdoob/three.js/pull/30870 (merged 2026-04-07)
20. three.js PR #34399 "DevTools: Object details, box highlight and 1.18", https://github.com/mrdoob/three.js/pull/34399 (merged 2026-08-29)
21. three.js devtools folder history, https://github.com/mrdoob/three.js/commits/dev/devtools
22. Legacy threejs/three-devtools (archived), https://github.com/threejs/three-devtools
23. three r186 source hooks, `node_modules/three/src` in this repo (three 0.186.1)
24. Chrome DevTools MCP npm README, https://www.npmjs.com/package/chrome-devtools-mcp (1.10.1, 2026-09-23)
25. Chrome DevTools MCP tool reference, https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/docs/tool-reference.md
26. Chrome DevTools MCP design principles, https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/docs/design-principles.md
27. Chrome DevTools MCP CLI, https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/main/docs/cli.md
28. Chrome DevTools MCP repo and commits, https://github.com/ChromeDevTools/chrome-devtools-mcp (52.6k stars; last commit 2026-09-25)
29. Chrome DevTools MCP 1.10.1 package source (`build/src/McpPage.js`, `build/src/tools/thirdPartyDeveloper.js`)
30. Playwright MCP repo and npm README, https://github.com/microsoft/playwright-mcp (37.6k stars; 0.0.82, 2026-09-18)
31. Playwright CLI repo and npm README, https://github.com/microsoft/playwright-cli (13.6k stars; 0.1.21, 2026-09-18)
32. TestCollab, Playwright CLI token comparison, https://testcollab.com/blog/playwright-cli (search result, 2026)
33. Playwright MCP versus CLI token cost, https://playwright.aims-ai.com/blog/playwright-cli-vs-mcp-server-token-cost (search result, 2026)
34. Spector.js README, https://raw.githubusercontent.com/BabylonJS/Spector.js/master/readme.md
35. Spector.js MCP README and package.json, https://raw.githubusercontent.com/BabylonJS/Spector.js/master/mcp/README.md
36. Spector.js commits, https://github.com/BabylonJS/Spector.js/commits/master (last 2026-09-25); npm spectorjs 0.9.33 (2026-09-14)
37. stats-gl repo and commits, https://github.com/RenaudRohlinger/stats-gl (280 stars; 4.2.3, 2026-07-10)
38. r3f-perf repo and commits, https://github.com/utsuboco/r3f-perf (781 stars; 7.2.3, 2024-11-08)
39. agent-browser README, https://raw.githubusercontent.com/vercel-labs/agent-browser/main/README.md (0.38.1, 2026-09-16)
40. Cursor browser tool docs, https://cursor.com/docs/agent/tools/browser (search result)
41. OpenAI playwright-interactive skill, https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md
42. OpenAI develop-web-game skill (mirror), https://github.com/lingxling/awesome-skills-cn/blob/main/openai-skills/skills/.curated/develop-web-game/SKILL.md
43. WebMCP origin trial status, https://github.com/assistant-ui/assistant-ui/issues/7652 and https://www.spronta.com/blog/state-of-webmcp-july-2026/ (search results, 2026)
44. Official MCP registry API, https://registry.modelcontextprotocol.io/v0/servers (queried 2026-09-26)
45. Glama three.js listing, https://glama.ai/mcp/servers?query=Three.js (search result)
46. PulseMCP threejs-devtools listing, https://www.pulsemcp.com/servers/gh-dmitriygolub-threejs-devtools (search result)
47. MCP for Blender README and server source, https://github.com/ahujasid/blender-mcp (29.4k stars; last commit 2026-09-25)
48. PyPI mcp-for-blender and blender-mcp, https://pypi.org/pypi/mcp-for-blender/json and https://pypi.org/pypi/blender-mcp/json (2.1.0, 2026-09-25; 2.0.0, 2026-09-16)
49. Blender Lab MCP, https://projects.blender.org/lab/blender_mcp and https://www.blender.org/lab/mcp-server/ (search results)
50. blend-ai, https://github.com/HoldMyBeer-gg/blend-ai
51. glTF Transform CLI help output (4.5.0) and docs, https://gltf-transform.dev/cli; npm @gltf-transform/cli (2026-09-01)
52. gltfpack help output (1.3.0) and npm, https://www.npmjs.com/package/gltfpack (2026-09-25); meshoptimizer repo, https://github.com/zeux/meshoptimizer
53. Khronos glTF-Validator repo and commits, https://github.com/KhronosGroup/glTF-Validator (last commit 2025-12-30); npm gltf-validator 2.0.0-dev.3.10 (2024-10-22)
54. Khronos gltf-asset-auditor, https://www.npmjs.com/package/@khronosgroup/gltf-asset-auditor (1.0.6, 2026-07-27)
55. Decentraland gltf-validator-ts, https://www.npmjs.com/package/@dcl/gltf-validator-ts (1.0.19, 2026-03-19)
56. @modelcontextprotocol/server-threejs npm README, https://www.npmjs.com/package/@modelcontextprotocol/server-threejs (2.0.3, 2026-09-25)
57. MCP Apps (ext-apps) README, https://github.com/modelcontextprotocol/ext-apps (spec 2026-01-26)
58. Meshy MCP server, https://github.com/meshy-dev/meshy-mcp-server (0.5.2, 2026-09-22; 49 stars)
59. Meshy CLI, https://www.npmjs.com/package/meshy-cli (0.4.0, 2026-09-23)
60. Meshy pricing, https://www.meshy.ai/pricing and https://docs.meshy.ai/en/webapp/pricing (search results)
61. tripo-cli, https://www.npmjs.com/package/tripo-cli (0.5.1, 2026-09-18); @vastai/tripo-sdk (0.3.0, 2026-09-18); tripo-ai-mcp-server (1.1.0, 2026-04-27)
62. Tripo pricing and H3.1, https://developers.tripo3d.ai/en/pricing and https://developers.tripo3d.ai/en/models/v3-1 (search results)
63. Hyper3D pricing and Gen-2 API, https://hyper3d.ai/pricing and https://developer.hyper3d.ai/api-specification/rodin-generation-gen2 (search results)
64. Hunyuan3D 2.1 license, https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE
65. Tencent HY 3D 3.1 announcement, https://x.com/TencentHunyuan/status/2016449283428659599 (search result)
66. TRELLIS.2 license, https://github.com/microsoft/TRELLIS.2 (MIT; release 2025-12-16 per search results)
67. TripoSG license, https://github.com/VAST-AI-Research/TripoSG
68. Stable Fast 3D and SPAR3D licenses, https://github.com/Stability-AI/stable-fast-3d and https://github.com/Stability-AI/stable-point-aware-3d
69. SAM 3D Objects license, https://github.com/facebookresearch/sam-3d-objects (SAM License, 2025-11-19)
70. Seed3D 1.0 paper, https://arxiv.org/pdf/2510.19944 (search result)
71. Luma Genie review noting the sunset, https://omr.com/en/reviews/product/luma-ai-genie (search result)
72. Poly Haven API terms and README, https://github.com/Poly-Haven/Public-API/blob/master/ToS.md
73. ambientCG API docs, https://docs.ambientcg.com/api/ (search result)
74. Sketchfab Download API, https://sketchfab.com/developers/download-api (search result)
75. KitBash acquires ArtStation and Sketchfab, https://www.epicgames.com/site/news/kitbash-acquires-artstation-and-sketchfab (search result; announced 2026-08-10)
76. Kenney assets and mirror counts, https://kenney.nl/assets and https://github.com/shorepine/kenney (search results)
77. Mixamo status 2026, https://app.cinevva.com/guides/free-character-animations-rigging (search result, vendor blog)
78. World Labs World API, https://www.worldlabs.ai/blog/announcing-the-world-api (search result; 2026-01-21)
79. World Labs Marble export docs, https://docs.worldlabs.ai/marble/export/gaussian-splat/index (search result)
80. HY-World 2.0, https://github.com/Tencent-Hunyuan/HY-World-2.0 (search result)
81. Scenario skills and MCP, https://github.com/scenario-labs/skills (566 stars)
82. AI texture generator roundup, https://www.3daistudio.com/blog/best-ai-texture-and-pbr-generators-2026 (search result, vendor blog)
83. threenative-asset-mcp, https://www.npmjs.com/package/threenative-asset-mcp (0.9.5, 2026-09-26)
84. 3dassets-mcp, https://www.npmjs.com/package/3dassets-mcp (1.0.0, 2026-09-07)
85. GLBForge MCP, https://www.npmjs.com/package/@glbforge/mcp (0.8.0, 2026-09-11)
86. gltf-mcp, https://www.npmjs.com/package/gltf-mcp (0.2.0, 2026-02-10)
87. meshcheck-mcp, rupa3d, vrm-toolkit-mcp, 3dstreet-mcp npm entries (2026-07-20, 2026-09-15, 2026-08-05, 2026-09-03)
88. img2threejs README, architecture and token cost, https://github.com/img2threejs/img2threejs (16.9k stars; created 2026-07-15)
89. parallax-threejs README, https://github.com/propersloth/parallax-threejs (created 2026-08-01)
90. Pascal editor README, https://github.com/pascalorg/editor (24.3k stars)
91. Mint three.js skills, https://github.com/mintdotgg/mint-threejs-skills (114 stars)
92. Three.js Resources MCP, https://threejsresources.com/mcp (search result)
93. Show HN Mario Galaxy with Claude Code and Three.js, https://news.ycombinator.com/item?id=47600002 (search result)
94. Show HN 3D multiplayer game with Claude Code, https://news.ycombinator.com/item?id=46639408 (search result)
95. Enterprise DNA on "Claude of Duty", https://enterprisedna.co/resources/ai-pulse/ai-pulse-2026-07-28-matt-shumer-s-single-prompt-three-js-fps-claude-of-duty-trig/ (2026-07-28, search result)
96. three.js forum, "Three.js and AI Agents: A New Workflow", https://discourse.threejs.org/t/three-js-and-ai-agents-a-new-workflow/88250 (2025-11-21, search result)
97. three.js forum threads 91054 (Claude code visualizer), 91159, 89864, https://discourse.threejs.org/ (search results)
98. Playwright WebGL black screenshot note, https://www.nanmesh.ai/posts/playwright-screenshots-of-threejs-webgl-canvas-come-back-bla-9c088b (search result)
99. Anthropic vision docs (image token formula), https://platform.claude.com/docs/en/build-with-claude/vision (via the sibling note and `scripts/lib/page.mjs`)
100. Sibling note, `ai-docs/research/2026-09-26-scenarios-xr-and-testing.md` (2026-09-26)

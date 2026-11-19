# AI skills, rules and docs for three.js

Date: 2026-09-26
Track: AI skills, rules and docs for three.js (research for threewright: what already teaches agents three.js, and which mistakes models really make)
Status: first pass. Claims marked "unverified" were not confirmed against a primary source. threejs.org, skills.sh, context7.com, cursor.directory, arxiv.org, discourse.threejs.org, snyk.io, threejsroadmap.com and simonwillison.net were blocked from this environment. For those, this file relies on search result summaries and says so. GitHub pages, raw.githubusercontent.com (including the three.js wiki), the npm registry and the installed three 0.186.1 were read directly. Source numbers in square brackets point to the list at the end.

## Summary

- **The official llms.txt gives four rules and one "wrong" example.** `docs/llms.txt` (5,404 bytes, about 1.4k to 1.8k tokens) says: use import maps, not old CDN script tags; WebGLRenderer is the "default, mature" choice and WebGPURenderer is for TSL, compute and node materials (with `await renderer.init()`); use TSL instead of GLSL on WebGPURenderer; use the NodeMaterial classes. The only outdated pattern it shows is the cdnjs `r128/three.min.js` script tag. It does not mention Geometry, outputEncoding, sRGBEncoding, WebGL1Renderer, Clock, PostProcessing, the `*Async` methods or RGBELoader. This corrects the scenarios note of the same date, which says llms.txt flags those names [1][4].
- **llms-full.txt nearly tripled in r186.** It went from 127,680 bytes (r183) to 363,106 bytes (r186), about 96k to 109k tokens. The growth is the new TSL guide, written partly "to help LLMs understand TSL" (PR 34085). Agents should never load it whole. Its useful part is a list of 828 per-page Markdown docs at `https://threejs.org/docs/pages/<Name>.html.md`, and each deprecated page says "Deprecated: since rNNN" [2][13][19].
- **The official files have defects.** The llms-full.txt WebGPU example import map has no `three/webgpu` entry, but the first statement of `build/three.tsl.js` is `import { TSL } from 'three/webgpu'` (every release since r171). By import map rules the example cannot resolve (not run in a browser here). The official r186 examples and manual both map `three/webgpu`. The files pin 0.186.0 while npm latest is 0.186.1. The "Essential API" links use legacy `#api/en/...` hashes that a fetch tool cannot follow [2][16][17][18].
- **The most installed skill pack is stale, and its text has spread.** CloudAI-X/threejs-skills (3.4k stars, about 98.2K skills.sh installs per a search summary) has had no commit since 2026-01-19. Its code teaches `RGBELoader`, `new THREE.Clock()`, `PCFSoftShadowMap`, `new THREE.PostProcessing()` and an import path removed in r167. A community "Update skills for Three.js r183" PR from 2026-03-28 is unmerged. Across GitHub, 1,356 SKILL.md files mention RGBELoader against 11 for HDRLoader, and 418 contain the dead `addons/nodes/Nodes.js` path [29][30][58].
- **The best packs verify their own content, but none lints the user's project.** EnzeD/r3f-skills type-checks every code fence and renders its examples in Chromium in CI. linegel uses claim-scoped PASS/FAIL/INSUFFICIENT_EVIDENCE verdicts with fixtures as oracles. majidmanzarpour prints pixel metrics as JSON and runs seeded bot playtests. pmndrs/react-three-examples runs smoke, frozen-scene and screenshot tiers. No pack checked targets r186 yet, and none ships a stale-API linter for user code. That is threewright's gap [27][31][33][55].
- **Evidence on failures points past syntax.** WorldCoder-Bench (arXiv 2606.01869, June 2026) asked nine frontier models for single-page three.js worlds; the best scored 19.9%, failures were state and interaction bugs, and screenshot plus VLM judges did not reproduce the ranking (search summary). pmndrs found 17 of its own examples frozen on the first frame. Reproduced Claude.ai system prompts (unofficial, dated 2025-09-29 and 2026-04-16) pin artifacts to three.js r128 from cdnjs, which keeps r128 habits alive (unverified) [55][59][62].
- **pmndrs already has the right token shape.** `https://docs.pmnd.rs/api/mcp` and `npx @pmndrs/docs search` (4.1.2, 2026-08-20) read an index first, then fetch one page, and mark large examples with a token cost [53].
- **Anthropic ships nothing for 3D.** anthropics/skills (19 skills) and claude-plugins-official (39 plugins plus 14 external) have no three.js, WebGL or 3D entry; Context7 is listed there as an external plugin. awesome-cursorrules has no three.js entry. GitHub's awesome-copilot game-engine skill still points at three.js r79 [46][47][48][50].
- **Verified stale APIs** (release that deprecated or renamed, release that removed): UMD `three.js`/`three.min.js` r150/r161; `examples/js` removed r148; `Geometry` out of core r125, deleted r141; `*BufferGeometry` aliases r145/r154; `outputEncoding`/`sRGBEncoding`/`LinearEncoding` r152/r162; WebGL 1 and `WebGL1Renderer` r153/r163; `physicallyCorrectLights` r150/r160; `useLegacyLights` r155/r165; `applyMatrix` r113/r141; `ImageUtils.loadTexture` stub removed r141; `mergeBufferGeometries` r151/r161; pre-r167 WebGPU addon paths removed r167; `Timer` addon path removed r179 (Timer in core); `RGBELoader` r180; `*Async` renderer methods r181; `render()` before `init()` throws since r181; `PCFSoftShadowMap` r182 (WebGL), removed for WebGPU r186; `Clock` r183; `PostProcessing` renamed `RenderPipeline` r183; `Source` renamed `TextureSource` r186; `require('three')` deprecated r186; minified builds gone from npm r186 [21][22][23].

---

## 1. threejs.org llms.txt and llms-full.txt

### 1.1 The files

| File (repo path) | Served at | Bytes (r186) | Tokens (o200k / legacy Claude tokenizer) |
| --- | --- | --- | --- |
| `llms.txt` (repo root) | `https://threejs.org/llms.txt` (unverified) | 274 | 68 / 79 |
| `docs/llms.txt` | `https://threejs.org/docs/llms.txt` | 5,404 | 1,440 / 1,755 |
| `docs/llms-full.txt` | `https://threejs.org/docs/llms-full.txt` | 363,106 | 96,306 / 109,358 |
| `docs/pages/<Name>.html.md` (828 linked) | `https://threejs.org/docs/pages/<Name>.html.md` | 2 to 24 KB each (WebGLRenderer 24,293; Object3D 21,099; Timer 2,372) | about bytes/4 |

Token counts use gpt-tokenizer (o200k_base) and @anthropic-ai/tokenizer (the older Claude tokenizer) [78]. Current Claude tokenizers differ, so treat both as estimates. The root `llms.txt` only points to the two docs files. The dev and master branch copies were byte-identical on 2026-09-26 [1][5]. threejs.org itself was not reachable here, so the served copies were not compared (unverified).

### 1.2 The rules they give agents

`docs/llms.txt` has one section of instructions, "Instructions for Large Language Models", with four numbered rules [1]:

1. **"Use Import Maps (Not Old CDN Patterns)".** WRONG: `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`. CORRECT: an import map that maps `three` to `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js` and `three/addons/` to `.../examples/jsm/`, then `import * as THREE from 'three'` and `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`. The heading line says "always use latest version".
2. **"Choosing Between WebGLRenderer and WebGPURenderer".** "Use WebGLRenderer (default, mature)" for "Maximum browser compatibility" because "Most examples and tutorials use this". "Use WebGPURenderer when you need: Custom shaders/materials using TSL, Compute shaders, Advanced node-based materials", with `import * as THREE from 'three/webgpu'; const renderer = new THREE.WebGPURenderer(); await renderer.init();`.
3. **"TSL (Three.js Shading Language)".** "When using WebGPURenderer, use TSL instead of raw GLSL for custom materials", with `material.colorNode = texture( myTexture ).mul( color( 0xff0000 ) )`. Listed benefits: works on both backends, "No string manipulation or onBeforeCompile hacks", composable nodes.
4. **"NodeMaterial Classes (for WebGPU/TSL)".** MeshBasicNodeMaterial, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial, LineBasicNodeMaterial, SpriteNodeMaterial.

The rest of `llms.txt` is links: getting started, the WebGPURenderer manual page, the TSL guide and reference, core manual topics, and an "Essential API" list of about 35 classes.

`llms-full.txt` repeats the four rules, then adds two complete HTML pages (WebGLRenderer, and WebGPURenderer with TSL), a GLTFLoader snippet, the whole TSL guide (read from `tsl/content/Guide.md`), and "Available Documentation": 828 per-page Markdown links grouped as Core, Cameras, Lights, Materials, Geometries, Textures, Loaders, Controls, Helpers, Animation, Audio, Math, Curves, Effects, Post-Processing, Nodes (TSL), WebXR and Shader Modules [2]. It embeds one note aimed at models: "> AI: `label()` was previously used for this purpose and is deprecated in favor of `setName()`."

What the files do not cover: removed APIs other than the r128 script tag; the r181 to r186 renames and deprecations; that ShaderMaterial, onBeforeCompile and EffectComposer do not run on WebGPURenderer (rule 3 implies it); color management; physical light units; disposal; verification. So the line in `2026-09-26-scenarios-xr-and-testing.md` (section B5) that says llms.txt flags `three.min.js`, `Geometry`, `outputEncoding`, `sRGBEncoding` and `WebGL1Renderer` as the most common LLM mistakes is wrong for the r183 to r186 files: only the `three.min.js` example is there.

### 1.3 History and maintenance

- Issue 31933, "Providing a `llms.txt` file for better AI support.", opened 2025-09-24 by harshpreet931, label Suggestion, milestone r183, closed 2026-02-09 [9].
- PR 32660 by marwie, "Generate `.md` files for docs HTML pages", 2026-01-02 to 2026-01-06 (closed) [11]. PR 32673 by mrdoob, "Added llms.txt, llms-full.txt and llms/build.js script.", opened 2026-01-06, merged 2026-02-09; it references issue 31933 and PR 32660 [10]. The files first shipped in r183 (npm 0.183.0, 2026-02-18); the r182 tag has no `docs/llms.txt` [4][22].
- Commits to `docs/llms.txt`: 2026-02-09 (added), 2026-02-18 ("r183"), 2026-02-20 ("r183 (bis)"), 2026-04-16, 2026-06-24 and 2026-09-08 ("Updated docs."), all by mrdoob [12].
- Generator: `utils/llms/build.js` (18,644 bytes). `npm run build-docs` runs JSDoc and then `npm run build-llms` [7][8]. The rules are a hard-coded template literal in the script. The CDN version is `package.json` `version` at build time. The TSL section is `tsl/content/Guide.md`. The per-page Markdown is JSDoc HTML converted with turndown.
- r183 to r186 changes: the version pin, manual links lost `#en/`, "TSL Specification" became "TSL Guide" plus "TSL Reference". llms-full.txt went from 127,680 bytes and 768 page links (r183) to 132,070 and 796 (r185) to 363,106 and 828 (r186) [2][4]. The r186 jump is PR 34085, "Tour of TSL" (sunag, merged 2026-08-28, milestone r186), whose Tour.md was "designed both to simplify maintenance and to help LLMs understand TSL"; PR 34457 later renamed it "TSL Guide" [13].
- Patch releases are not reflected: master's `package.json` says 0.186.1, but both branches' llms files still pin 0.186.0 [5][8].
- Related: PR 33181, "AI-generated `changelog`" (sunag, opened 2026-03-15, still open) [15]. The repo has no AGENTS.md, CLAUDE.md, `.cursorrules` or `.github/copilot-instructions.md`, and CONTRIBUTING.md says nothing about AI (checked 2026-09-26).

### 1.4 Defects in the official AI docs

1. **The WebGPU import map in llms-full.txt misses `three/webgpu`.** It maps only `three` (to `three.webgpu.js`), `three/tsl` and `three/addons/` [2]. `build/three.tsl.js` imports `{ TSL } from 'three/webgpu'`, checked in every npm release from 0.171.0 to 0.186.1, and addons such as `examples/jsm/tsl/display/BloomNode.js` import from both `three/webgpu` and `three/tsl` [22][23]. A bare specifier resolves only through an exact key or a key ending in `/`, so `three/webgpu` has nowhere to go. The r186 example `webgpu_postprocessing_bloom.html` and the manual page `manual/pages/webgpurenderer.html` both add `"three/webgpu": ".../three.webgpu.js"` [16][17]. The gap has existed since r183. Not run in a browser here, so the exact error text is unverified. No matching issue turned up in a three.js issue search on 2026-09-26.
2. **Legacy hash links.** "Essential API" links look like `https://threejs.org/docs/#api/en/core/Object3D`. Since the r181 JSDoc docs, `docs/index.html` maps `#api/` and `#examples/` hashes to pages in client-side JavaScript [18][21]. A fetch tool never sends the hash, so it receives the docs index. The fetchable form is `https://threejs.org/docs/pages/Object3D.html.md`.
3. **Version lag.** "Always use latest version" next to a 0.186.0 pin while 0.186.1 is current. Harmless, but agents copy it.
4. **Manual install page.** r186 `manual/pages/installation.html` asks readers to replace `<version>` "with an actual version of three.js, like "v0.149.0"" [17]. Whether jsDelivr accepts the `v` prefix is unverified.

### 1.5 The per-page Markdown docs (the part worth adopting)

- The same files live in the repo at `docs/pages/<Name>.html.md`, so a tag-pinned copy is reachable without threejs.org: `https://raw.githubusercontent.com/mrdoob/three.js/r186/docs/pages/Timer.html.md` returned HTTP 200 on 2026-09-26, as did HDRLoader and RenderPipeline [19].
- Deprecations are stated per page: PostProcessing "Deprecated: since r183. Use RenderPipeline instead."; Source "Deprecated: since r186. Use TextureSource instead."; Clock "Deprecated: since r183." [19].
- Pages also carry facts models get wrong, for example LineBasicMaterial `.linewidth`: "WebGL and WebGPU ignore this setting and always render line primitives with a width of one pixel." [19].

---

## 2. Existing agent skills, rule packs and doc services

### 2.1 The landscape in numbers

GitHub code search on 2026-09-26 [58]. Counts are approximate and include copies and forks.

| Query | Files |
| --- | --- |
| `filename:SKILL.md threejs` | 13,712 |
| `filename:SKILL.md "react-three-fiber"` | 1,596 |
| `filename:SKILL.md "WebGPURenderer"` | 896 |
| `filename:SKILL.md RGBELoader` / `HDRLoader` | 1,356 / 11 |
| `filename:SKILL.md "new THREE.Clock"` / `"THREE.Timer"` | 1,006 / 516 |
| `filename:SKILL.md "THREE.PostProcessing"` / `"RenderPipeline" three` | 331 / 226 |
| `filename:SKILL.md PCFSoftShadowMap` | 1,248 |
| `filename:SKILL.md "addons/nodes/Nodes.js"` (removed r167) | 418 |
| `filename:SKILL.md "r128/three.min.js"` | 167 |
| `filename:SKILL.md sRGBEncoding` | 140 |
| `filename:SKILL.md "renderer.renderAsync"` | 48 |
| `filename:SKILL.md "import * as THREE from 'three/webgpu'"` / `"three.webgpu.js"` | 149 / 25 |
| `extension:mdc "three.js" path:.cursor` | 495 |
| `filename:copilot-instructions.md "three.js"` | 1,034 |
| `filename:AGENTS.md "three.js" "WebGPURenderer"` | 51 |
| Files containing both `"r128/three.min.js"` and `"CapsuleGeometry"` (copies of Claude.ai prompts) | 1,972 |

Stale names outnumber current names in the files agents load. For a peer comparison, PixiJS ships 26 first-party skills inside its own repo (`skills/pixijs-*`); three.js ships llms.txt only [57].

### 2.2 Assessment

The 90-day gate means a commit on or after 2026-06-28 and visible replies to issues. "Updated" dates on GitHub search count stars, so commit dates come from each commit page.

| Resource | Author | Last commit | Targets | Structure | Evals or tests | Gate | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| three.js `docs/llms.txt`, `llms-full.txt`, `docs/pages/*.html.md` [1][2] | mrdoob / three.js | 2026-09-08 | r186 (pins 0.186.0) | rules plus index; full TSL guide; 828 page files | none for the AI files | pass | adopt the rules and page files; never load llms-full whole |
| three.js Migration Guide wiki [21] | three.js maintainers | has a "186 to 187" section | r187 dev | one bullet list per release | n/a | pass | adopt as the lint source |
| CloudAI-X/threejs-skills [29][30] | CloudAI-X | 2026-01-19 (all 6 commits that day) | "r160+" | 10 SKILL.md, 11.5 to 16.3 KB, about 575 lines and 3.6k tokens each | none | fail: 8 open PRs incl. r183 update (2026-03-28) and "Fix two import paths that do not exist in three.js" (2026-07-31), none merged | note: widely installed, stale, do not recommend |
| majidmanzarpour/threejs-game-skills [31][32] | Majid Manzarpour | 2026-09-05 | not stated | 9 skills with a director router, references, scripts, Vite + TS scaffold | canvas inspector metrics JSON, Playwright baselines, seeded bot playtests, evidence manifests | pass on commits; 2 issues from 2026-07-11 with no visible reply (unverified) | point (games); copy QA ideas |
| linegel/threejs-complete-set-of-skill, threejs-skills.com [27][28] | linegel | 2026-09-24 (795 commits) | r185 WebGPU/TSL | 27 skills per README (repo description says 25); SKILL.md, agents/openai.yaml, references, scripts, examples, assets, fixtures | `npm run skills:check`; fixtures as "oracles that distinguish correct and incorrect output"; validation protocol | pass (9 stars) | point (advanced WebGPU/TSL graphics); copy the validation protocol |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills [38] | scottstts | 2026-09-22 (npm 0.11.0) | not stated in the files read | 24 skills: a router plus 23 graphics skills (including visual validation); entrypoints 317 to 1,612 tokens | example gallery; installer test (depth unverified) | pass (855 stars) | point (graphics quality) |
| EnzeD/r3f-skills [33] | EnzeD | 2026-08-31 | three 0.185.1, fiber 9.7.0, drei 10.7.8, React 19.2.8 | 11 skills, about 80 lines each, references on demand | CI type-checks 18 fenced examples and renders 11 in Chromium; release check; 6 trap evals | pass | point for R3F; adopt its validation pattern |
| emalorenzo/three-agent-skills [34] | emalorenzo | 2026-01-28 (4 commits) | "0.182.0+" | 2 skills plus two rule files of about 10k to 11k tokens | none | fail | note: labels `new THREE.Clock()` as GOOD, recommends `PCFSoftShadowMap` for R3F |
| dgreenheck/webgpu-claude-skill (Three.js Roadmap) [35][36][37] | Dan Greenheck | 2026-04-01 (15 commits) | r171+, updated for r183 | 804-token SKILL.md, REFERENCE.md, docs/, examples, templates, `.cursor/rules` that `@file` the same docs | none | fail (178 days) | point with caveats (release drift, see 2.3) |
| mintdotgg/mint-threejs-skills [39] | Mint (tamg) | 2026-08-01 | not stated | skills built around Mint MCP asset generation | release verification text (unverified) | pass (114 stars) | note: vendor tied |
| img2threejs/img2threejs [40] | img2threejs | active, v2.0.0 | not stated | image to procedural three.js model pipeline; stdlib Python scripts | strict quality gates, one comparison sheet per review | pass (16,879 stars) | point (image to model); copy its token design |
| pmndrs/react-three-examples [55] | pmndrs | active (131 commits; spec amended 2026-09-03) | three 0.185.1, fiber 10.0.0-alpha.4, drei 11.0.0-alpha.7 | project AGENTS.md (66,767 bytes, about 17k tokens), SPEC, manifest | smoke, frozen-scene diff, screenshot tiers | pass (2 stars) | point (R3F v10 WebGPU reference); copy the test tiers |
| pmndrs docs MCP, CLI and llms.txt [53][54] | pmndrs (abernier) | @pmndrs/docs 4.1.2, 2026-08-20 | per library | llms.txt index plus MCP config; llms-full; MCP resources and tools; CLI | n/a | pass | adopt for R3F, drei, postprocessing, xr, uikit lookups |
| Context7: mrdoob/three.js, llmstxt/threejs_llms-full_txt [52] | Upstash | "last updated 2 days ago" (search summary) | unknown | 2,650,446 tokens, 21,304 snippets, trust score 8.5 (search summary, unverified) | n/a | unverified | note: fallback only, version choice unclear |
| anthropics/skills [46] | Anthropic | n/a | none | 19 skills; none on 3D (algorithmic-art uses p5.js) | n/a | n/a | note |
| anthropics/claude-plugins-official [47] | Anthropic | n/a | none | 39 plugins, 14 external (context7, playwright, others); none on 3D | n/a | n/a | note |
| PatrickJS/awesome-cursorrules [48] | community | n/a | none | 40.8k stars; no three.js or R3F entry | n/a | n/a | note |
| cursor.directory "React Three Fiber Rules" (Erik Hulmák, search summary) and mindrally/skills `three-js` [43][49] | community | unknown | no version | persona prompt: "You are an expert in React, Vite, Tailwind CSS, Three.js, React Three Fiber, and Next UI." | none | unknown | note: generic |
| github/awesome-copilot `skills/game-engine` [50] | community | unknown | three.js r79 from cdnjs | SKILL.md plus references | none | n/a | note: stale copy of old MDN text; MDN now uses 0.185.0 and `three.webgpu.js` [51] |
| sickn33/agentic-awesome-skills [42] | sickn33 | active (46,947 stars) | copies | 39 three.js SKILL.md files; its `threejs-lighting` repeats CloudAI-X | none | n/a | note: spreads stale text |
| vercel-labs/json-render `react-three-fiber` [44] | Vercel Labs | unknown | json-render | product-specific | n/a | n/a | note |
| chongdashu/vibejam-starter-pack [41] | chongdashu | active (148 stars) | not stated | 4 starter games plus 8 skills for jams | none found | pass | note |
| Nice-Wolf-Studio/claude-skills-threejs-ecs-ts [45] | Nice Wolf Studio | not checked | not checked | 14 skills per a search summary (unverified) | not checked | not checked | note |

Install counts from skills.sh (search summaries, weekly numbers not available because skills.sh was blocked): CloudAI-X about 98.2K total, threejs-fundamentals about 14.5K, threejs-loaders about 8.2K; majidmanzarpour about 18.5K; dgreenheck about 1.1K, first seen 2026-01-24 [30][32][36]. All unverified.

### 2.3 Notes on the main packs

**CloudAI-X.** Linting only its code fences found RGBELoader 19 times, PCFSoftShadowMap 4, `new THREE.Clock()` 3, removed WebGPU addon paths 2, `new THREE.PostProcessing()` 1, `scene.add(transformControls)` 1, and a `three@0.160.0` CDN pin 1. Its "WebGPU Post-Processing (Three.js r150+)" section imports `postProcessing` and `pass` from `three/addons/nodes/Nodes.js` (gone since r167) and calls `new THREE.PostProcessing(renderer)` (renamed r183) [29]. Open community PRs: #6 "Update skills for Three.js r183" (Jonohobs, 2026-03-28), #13 WebGPU/TSL and R3F skills (2026-07-29), #14 import path fixes (2026-07-31), #15 (2026-08-23). None merged, no visible maintainer comment [29].

**majidmanzarpour.** Nine skills: director, gameplay-systems, aaa-graphics-builder, game-ui-designer, debug-profiler, qa-release, 3d-generator (Tripo), image-generator (Gemini), audio-generator (ElevenLabs). The QA pass: build and typecheck; console, page and network errors; "non-blank, visually varied canvas pixels"; active play on desktop and mobile; exercise inputs; a seeded bot playtest with metrics JSON; and "Screenshots alone do not cover gameplay changes." Its canvas inspector prints color entropy, edge density, luminance contrast, dominant-color share and a render budget as JSON. A 2026-07-16 commit fixed "headless Playwright rendering on SwiftShader instead of the GPU" [31].

**linegel.** The visual-validation skill makes every claim falsifiable: declare the class, invariant, observable, metric and gate first; freeze the three revision, renderer and initialized backend, seed, time step, viewport and DPR; check `renderer.backend.isWebGPUBackend`; return PASS, FAIL or INSUFFICIENT_EVIDENCE per claim. It notes "`renderer.computeAsync()` submits work; it is not proof of GPU completion." [27]. `isWebGPUBackend` and `isWebGLBackend` exist in r186, and `forceWebGL` selects the WebGL 2 backend [23].

**EnzeD.** The maintenance doc is the best model found. Review loop: run `check:releases` monthly, read upstream notes, classify guidance as keep, correct, remove or move, update fixtures, and "record the completed review date and compatibility table only after reviewing results". Context budget: "Aim below 200 lines per entrypoint". It documents upstream noise: "Fiber 9 creates Three.js Clock instances although r185 deprecates Clock" [33]. R3F 9.8.1 (2026-09-24) still does `clock: new THREE.Clock()` in its store, and `<Canvas shadows>` still sets `PCFSoftShadowMap`, so R3F apps on three r183+ log the Clock warning and on r182+ the shadow warning; `shadows="percentage"` avoids the second [56]. Its six evals each embed one trap (typed shader material, glTF AO map, selective bloom, cloning a GLB, Rapier force accumulation, demand frameloop) against a no-skill baseline [33].

**dgreenheck.** Current through r183 (uses `RenderPipeline`), but several release numbers disagree with the Migration Guide: it says `computeAsync()` is deprecated since r181, while r181 to r186 source never deprecates it and r186 `compute()` before init recommends it; it dates the DOF rewrite to r181 (guide: 179 to 180), the Gaussian blur sigma change to r177 (guide: 178 to 179) and `PI2` to "r178+" (guide and source: r181) [21][23][35]. The Three.js Roadmap post claims the reference "eliminates about 90% of AI-generated errors"; no eval is published (search summary, unverified) [37].

**pmndrs/react-three-examples.** 268 R3F v10 ports of three.js examples in 17 categories. Definition of done includes "renders on WebGPU (real `webgpu` canvas context, console clean)". Test tiers: smoke (readiness signal fires, context is really `webgpu`, canvas non-black, console clean); a two-frame pixel diff "because smoke's non-black check cannot see a FROZEN scene", which found 17 frozen examples; screenshot regression on changed examples; nightly full corpus. Their finding: WebGPU initializes on SwiftShader, but headless Chrome on Linux never presents the WebGPU canvas, so they run headed Chromium under Xvfb and never mix GPU and software goldens (their claim, unverified here) [55].

**pmndrs docs.** Every pmndrs docs site publishes `/llms.txt` and `/llms-full.txt`, linked with `<link rel="alternate">`. The llms.txt is a generated page index plus MCP client config, with no rules. `https://docs.pmnd.rs/api/mcp` (streamable HTTP) exposes `docs://pmndrs/manifest`, `docs://{lib}/index`, `get_page_content`, `examples://index` (167 demos) and `get_example`; index lines carry a token cost such as `~23k` on the 8 large demos. The CLI `npx @pmndrs/docs search <query>` prints `{lib} {path} - {title}` lines and exits 1 on no result, reading each library's llms-full.txt with a one-hour cache. Libraries: React Three Fiber, Drei, React Postprocessing, uikit, xr, leva, a11y, Zustand and others [53].

### 2.4 Platform priors: why r128 keeps coming back

- Reproduced Claude.ai system prompts (jujumilk3/leaked-system-prompts, files dated 2025-09-29 for Sonnet 4.5 and 2026-04-16 for Opus 4.7) contain: "Three.js (r128): import * as THREE from 'three'", "example imports like THREE.OrbitControls won't work as they aren't hosted on the Cloudflare CDN", "The correct script URL is https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" and "IMPORTANT: Do NOT use THREE.CapsuleGeometry as it was introduced in r142." [59]. These are unofficial copies, so this is unverified. Simon Willison's 2025-05-25 write-up of the Claude 4 prompt reported the same text (search summary) [60].
- cdnjs autoupdates three from npm and lists 0.186.1, but older versions sit in `rNNN` folders and newer ones in `0.x.y` folders [61]. That r128 is the last `r`-named folder, and that this explains its popularity, is an inference (unverified). The official llms.txt uses exactly this URL as its WRONG example.
- Consequence: models see r128 both in old answers and in a live product prompt. In Claude Code the agent controls the page and can use r186. In a host that pins an old version, rewriting to r186 would break the page.

---

## 3. How LLMs fail at three.js

### 3.1 Evidence

- **WorldCoder-Bench** (Shuo Lu et al., arXiv 2606.01869, June 2026): 2,026 tasks (the rebuttal repo README says 2,004) where the model returns one self-contained HTML page using three.js; hidden behavioral contracts checked by execution; nine frontier models; best 19.9% on WorldCoder-Robust; failures "lie in executable behavior rather than visual presence, especially state-schema drift, broken interaction chains, and runtime state synchronization"; "DOM, Screenshot+VLM, and agent-based evaluators fail to reproduce the contract-based ranking" (search summary of the abstract; paper not readable here) [62].
- **Web-Bench** (ByteDance, arXiv 2505.07473): 50 projects of 20 sequential tasks; best model Claude 3.7 Sonnet at 25.1% Pass@1 overall. Its three.js project is a 3D Snake game with portals on `three ^0.170.0`, tested with Playwright 1.57.0 (repo read; per-project score not found) [64].
- **P3D-Bench** (arXiv 2606.11152): parametric 3D generation where three.js is one of four output formats, executed, rendered and scored on geometry, topology, MLLM judgment and part structure (search summary) [63].
- **Arenas.** Design Arena runs a 3D board for scenes generated as code (three.js, WebGL, shaders), judged by human votes with Elo; 148 ranked rows as of 2026-09-02 per a modelgrep.com summary (unverified) [65]. LLM Stats ran a three.js "3D Arena" and is sunsetting new arena submissions (search summary, unverified) [66]. WebDev Arena was not checked.
- **Game jams.** 2025 Vibe Coding Game Jam (levelsio): deadline 2025-03-25, at least 80% AI-written code, playable on the web without login, three.js recommended, over 1,000 games, judges included mrdoob and Andrej Karpathy (search summaries, unverified) [67]. The 2026 Cursor Vibe Coding Game Jam closed 2026-05-01 13:37 UTC with a $20,000 first prize, sponsored by Bolt and Cursor (search summary, unverified) [68]. fly.pieter.com is often cited as the reference AI-built three.js game; not examined in this pass.
- **Forum.** "Proposal: optional tag for AI-generated or AI-assisted code" (thread 91068) says a growing share of posts are fully LLM-generated code that does not work, or code broken after ChatGPT or Cursor edits (search summary; wording unverified) [69]. "Three.js and AI Agents: A New Workflow" (88250, 2025-11-21) [70]. "THREE.OrbitControls is not a constructor" (22549) is the classic symptom of UMD-era code in a module world [71].
- **Practitioner write-ups** (search summaries): models "mix API eras (deprecated geometry classes, old lighting units)" and "rarely instance or dispose properly" [75]; TSL output has "deprecated imports, phantom functions that don't exist, and compute shaders that compile but render nothing" [37]; ShaderMaterial, RawShaderMaterial and onBeforeCompile do not run on WebGPURenderer, nor do EffectComposer and pmndrs/postprocessing [74]. The same checklist says `render()` before init throws "in r186"; the source shows the throw since r181 (r180 warned and fell back to `renderAsync`) [23].
- **Skill content.** The counts in 2.1 and the lint results in 3.6.
- **Upstream noise.** R3F 9.8.1 triggers the Clock and PCFSoftShadowMap warnings by itself (2.3), so a model that "fixes every warning" edits the wrong code.

### 3.2 Recurring mistake classes

Ordered by how often the evidence above shows them (a judgment, not a measurement):

1. Era mixing: script-tag builds, `THREE.OrbitControls`, `examples/js`, r128 CDN URLs, renamed classes and constants.
2. Module resolution: missing import map keys (`three/addons/`, `three/webgpu`), extensionless addon paths, unpinned or mixed CDN versions, loading modules from `file://`.
3. WebGPU path errors: GLSL ShaderMaterial, onBeforeCompile or EffectComposer on WebGPURenderer; WebGPU classes imported from `'three'`; render before init; deprecated `*Async` calls; pre-r167 paths.
4. Silent visual failures: dark scenes from pre-r155 light values, missing OutputPass, wrong texture color space, ignored `linewidth`, ignored TextGeometry `height`, animation that never advances.
5. State and interaction bugs in games (WorldCoder-Bench).
6. Resource hygiene: no dispose, no instancing.
7. Invented TSL functions.

### 3.3 Stale-API table

Basis for release numbers: MG = Migration Guide [21]; npm = diff of npm tarballs 0.88.0 to 0.186.1 [22]; src = installed 0.186.1 source [23]. Inside this table `\|` is the Markdown escape for `|`; copy exact patterns from the code block in 3.5.

| Mistake | What the model writes | Correct in r186 | Release that changed it | Regex a linter could use |
| --- | --- | --- | --- | --- |
| UMD script build | `<script src=".../three.js/r128/three.min.js">`, `build/three.js` | ES modules through an import map (`three.module.js` or `three.webgpu.js`) | deprecated r150, removed r161 (MG "r160 to r161"; npm 0.160.0 still shipped both files with a warning, 0.161.0 did not; issue 27763 closed not planned) | `<script[^>]+src=["'][^"']*\/three(\.min)?\.js["']` |
| examples/js and namespace addons | `examples/js/controls/OrbitControls.js`; `new THREE.OrbitControls(...)` | `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` | examples/js removed r148 (MG; npm: 270 files in 0.147.0, none in 0.148.0) | `['"][^'"]*examples\/js\/[^'"]*['"]`; `\bnew\s+THREE\.(OrbitControls\|GLTFLoader\|...)\s*\(` |
| Geometry and Face3 | `new THREE.Geometry()`, `new THREE.Face3(0,1,2)` | `BufferGeometry` with `setAttribute('position', ...)` | out of core r125 (Face3 r126), deleted r141 (MG; npm) | `\bnew\s+(THREE\.)?(Geometry\|Face3)\s*\(` |
| `*BufferGeometry` aliases | `new THREE.BoxBufferGeometry(1,1,1)` | `BoxGeometry` | deprecated r145, removed r154 (MG; npm: still in Three.Legacy.js at r153) | `\b(Box\|Sphere\|Plane\|...)BufferGeometry\b` |
| Encoding API | `renderer.outputEncoding = THREE.sRGBEncoding`; `texture.encoding = ...` | `outputColorSpace = THREE.SRGBColorSpace` (default); `texture.colorSpace = THREE.SRGBColorSpace` for color maps | replaced r152, removed r162 (MG; npm: present 0.161.0, gone 0.162.0) | `\b(outputEncoding\|sRGBEncoding\|LinearEncoding\|GammaEncoding)\b` |
| WebGL1Renderer | `new THREE.WebGL1Renderer()` | `WebGLRenderer` (WebGL 2 only) | WebGL 1 deprecated r153, removed r163 (MG; npm; r162 warning "WebGL 1 support was deprecated in r153 and will be removed in r163") | `\bWebGL1Renderer\b` |
| Legacy light flags | `renderer.physicallyCorrectLights = true`; `renderer.useLegacyLights = false` | delete the line; physical units are the only mode | physicallyCorrectLights replaced r150, removed r160; useLegacyLights default false and deprecated r155, removed r165 (MG; npm) | `\b(physicallyCorrectLights\|useLegacyLights)\b` |
| applyMatrix | `mesh.applyMatrix(m)` | `mesh.applyMatrix4(m)` | renamed r113, alias removed r141 (MG; npm) | `\.applyMatrix\s*\(` |
| ImageUtils.loadTexture | `THREE.ImageUtils.loadTexture(url)` | `new THREE.TextureLoader().load(url)` (`ImageUtils` still exists for `getDataURL` and `sRGBToLinear`) | warning stub in Three.Legacy.js until r140, removed r141 (npm); MG says "r88 to r89: ImageUtils has been removed" | `\bImageUtils\.loadTexture(Cube)?\s*\(` |
| Clock | `const clock = new THREE.Clock(); clock.getDelta()` | `const timer = new THREE.Timer(); timer.connect(document);` then `timer.update()` once per frame and `timer.getDelta()` | Timer addon r160, in core r179, Clock deprecated r183 (MG; src warns in the constructor) | `\bnew\s+(THREE\.)?Clock\s*\(` |
| Timer addon path | `import { Timer } from 'three/addons/misc/Timer.js'` | `THREE.Timer` from core | file removed r179 (npm) | `(addons\|examples\/jsm)\/misc\/Timer(\.js)?['"]` |
| PostProcessing class | `new THREE.PostProcessing(renderer)` | `new THREE.RenderPipeline(renderer)`, then `outputNode` and `render()` | renamed r183; the wrapper warns (MG; src) | `\bnew\s+(THREE\.)?PostProcessing\s*\(` |
| `*Async` renderer methods | `await renderer.renderAsync(scene, camera)`; `clearAsync`, `hasFeatureAsync`, `initTextureAsync`, `pmrem.fromSceneAsync`, `ktx2.detectSupportAsync` | `await renderer.init()` once (or render inside `setAnimationLoop`), then sync `render()`, `clear()`, `hasFeature()`, `initTexture()`, `fromScene()`, `detectSupport()`. Keep `compileAsync`, `computeAsync`, `getArrayBufferAsync`, `loadAsync` | deprecated r181 (MG; src). MG also lists `computeAsync`, but no r181 to r186 source deprecates it and r186 recommends it | `\.(renderAsync\|clearAsync\|clearColorAsync\|clearDepthAsync\|clearStencilAsync\|hasFeatureAsync\|initTextureAsync\|fromSceneAsync\|fromEquirectangularAsync\|fromCubemapAsync\|detectSupportAsync)\s*\(` |
| WebGPU render before init | `const r = new THREE.WebGPURenderer(); r.render(scene, camera)` in setup code | `await r.init()` first, or render only inside `setAnimationLoop` | r180 warned and fell back; throws since r181 (src) | context: `new WebGPURenderer(` and `.render(` with no `setAnimationLoop(` and no `await x.init()` |
| Source class | `new THREE.Source(data)`; `if (x.isSource)` | `THREE.TextureSource`; `isTextureSource`. `texture.source` keeps its name, but ordinary instances no longer have `isSource` | renamed r186 (MG; src) | `\bnew\s+(THREE\.)?Source\s*\(\|\.isSource\b` |
| PCFSoftShadowMap | `renderer.shadowMap.type = THREE.PCFSoftShadowMap`; R3F `<Canvas shadows>` | `THREE.PCFShadowMap` (soft since r182); R3F `<Canvas shadows="percentage">` | WebGL deprecated r182 with fallback; WebGPU removed r186; r186 WebGL says "has been removed. Using PCFShadowMap instead." (MG; src; R3F 9.8.1 source) | `\bPCFSoftShadowMap\b`; R3F: `<Canvas\b[^>]*\bshadows(?:\s*=\s*(?:\{\s*true\s*\}\|["']soft["']))?(?=[\s\/>])` |
| RGBELoader | `new RGBELoader().load('env.hdr', ...)` | `HDRLoader` from `three/addons/loaders/HDRLoader.js` | renamed r180; the wrapper warns (MG; src) | `\bRGBELoader\b` |
| USDZLoader | `new USDZLoader()` | `USDLoader` | deprecated r179 (MG; src) | `\bUSDZLoader\b` |
| TextGeometry height | `new TextGeometry(text, { font, size: 1, height: 0.2 })` | `depth: 0.2` | renamed r163; the shim was removed r173, so `height` is ignored and depth defaults to 50 (npm; src) | `\bnew\s+(THREE\.)?TextGeometry\s*\([^)]*?\bheight\s*:` (dotAll) |
| TransformControls | `scene.add(transformControls)` | `scene.add(transformControls.getHelper())` | r169 (MG); r186 logs "Object3D.add: object not an instance of THREE.Object3D." (src) | two steps: `(\w+)\s*=\s*new\s+(?:THREE\.)?TransformControls\s*\(` then `\.add\(\s*NAME\s*\)` |
| Pre-r167 WebGPU paths | `from 'three/addons/renderers/webgpu/WebGPURenderer.js'`; `from 'three/addons/nodes/Nodes.js'` | `import * as THREE from 'three/webgpu'`; TSL from `'three/tsl'` | removed r167 (npm: present 0.166.0, gone 0.167.0; MG "166 to r167"); entry points settled r171 | `(examples\/jsm\|addons)\/(nodes\/Nodes\|renderers\/webgpu\/WebGPURenderer\|renderers\/common\/[A-Za-z]+)\.js` |
| WebGPU classes from `'three'` | `import * as THREE from 'three'; new THREE.WebGPURenderer()` | `import * as THREE from 'three/webgpu'` (or map `three` to `three.webgpu.js`) | never exported from `three` (src: undefined in Node for WebGPURenderer, MeshStandardNodeMaterial, RenderPipeline) | context: `from 'three'`, no `three/webgpu` import or map, and `THREE\.(WebGPURenderer\|\w+NodeMaterial\|RenderPipeline\|PostProcessing)\b` |
| CommonJS | `const THREE = require('three')` | `import * as THREE from 'three'` | deprecated r186; `build/three.cjs` re-exports the ES module via require(esm) and emits DeprecationWarning `THREE_CJS_DEPRECATED` (npm 0.186.0) | `\brequire\(\s*['"]three(\/[^'"]*)?['"]\s*\)` |
| Minified builds | `.../three@0.186.1/build/three.module.min.js` | `three.module.js`, or bundle and minify | `*.min.js` absent from the npm package from 0.186.0 (present in 0.185.0) (npm). jsDelivr may generate `.min.js` on request (unverified) | `build\/three\.(module\|core\|webgpu\|webgpu\.nodes\|tsl)\.min\.js` |
| Unpinned CDN | `https://unpkg.com/three/build/three.module.js`; `three@latest` | one exact version on every entry, e.g. `three@0.186.1` | practice; the official examples and manual pin a version | `(cdn\.jsdelivr\.net\/npm\/\|unpkg\.com\/\|esm\.sh\/)three(@(latest\|next\|[\^~][^\/'"]*))?(\/\|['"])` |
| Mixed or duplicate copies | `three@0.186.1` for `three` but `three@0.160.0` for `three/addons/`; esm.sh plus jsDelivr; two npm copies | one version, one host. Since r171 `three` and `three/webgpu` share `three.core.js`, and `Mesh` from both is the same class (checked in Node), so importing both from one copy is not a duplicate | r171 split (npm: `three.core.js` first in 0.171.0); r186 warns "WARNING: Multiple instances of Three.js being imported." (src) | context: more than one distinct `three@(\d+\.\d+\.\d+)` in a file; runtime warning |
| Import map without `three/webgpu` | the llms-full.txt WebGPU map (`three`, `three/tsl`, `three/addons/` only) | add `"three/webgpu": ".../build/three.webgpu.js"` as the r186 manual and examples do | `three.tsl.js` imports `'three/webgpu'` since r171 (npm) | context: an importmap that uses `three/tsl`, `addons/tsl/` or `three.webgpu.js` with no `"three/webgpu":` or `"three/":` key |
| ShaderMaterial on WebGPURenderer | `new THREE.ShaderMaterial({ vertexShader, fragmentShader })` or `material.onBeforeCompile = ...` with WebGPURenderer | a NodeMaterial with TSL (`colorNode`, `positionNode`), `glslFn`/`wgslFn` for snippets, or stay on WebGLRenderer | WebGLNodeBuilder removed r164 (MG). r186 has no node class for ShaderMaterial and logs "NodeBuilder: Material "ShaderMaterial" is not compatible.", then renders a default NodeMaterial (src). onBeforeCompile is not used on the node path (src search; not run) | context: WebGPU marker and `\bnew\s+(THREE\.)?(Raw)?ShaderMaterial\s*\(\|\.onBeforeCompile\s*=` |
| EffectComposer on WebGPURenderer | `new EffectComposer(webgpuRenderer)` with `UnrealBloomPass` | `const rp = new THREE.RenderPipeline(renderer); const s = pass(scene, camera); rp.outputNode = s.add(bloom(s));` with `bloom` from `three/addons/tsl/display/BloomNode.js` | RenderPipeline name since r183 (MG). EffectComposer uses WebGLRenderTarget and ShaderMaterial passes (src), so its passes hit the NodeBuilder error (derived, not run) | context: WebGPU marker and `\bEffectComposer\b` |
| WebGLCubeRenderTarget on WebGPURenderer | `new THREE.WebGLCubeRenderTarget(256)` | `CubeRenderTarget` | r183 (MG) | context: WebGPU marker and `\bWebGLCubeRenderTarget\b` |
| THREE.Math | `THREE.Math.degToRad(45)` | `THREE.MathUtils.degToRad(45)` | renamed r113 (MG); alias removal release not checked | `\bTHREE\.Math\.` |
| mergeBufferGeometries | `BufferGeometryUtils.mergeBufferGeometries(list)` | `mergeGeometries(list)` | renamed r151, alias removed r161 (MG; npm) | `\bmergeBufferGeometries\s*\(` |
| Gamma flags | `renderer.gammaOutput = true`; `gammaFactor = 2.2` | `outputColorSpace` (sRGB is the default) | gammaOutput removed r112, gammaFactor r136, warning stubs until r140 (MG; npm) | `\b(gammaOutput\|gammaFactor\|gammaInput)\b` |
| Extensionless addon import | `from 'three/examples/jsm/controls/OrbitControls'` | `from 'three/addons/controls/OrbitControls.js'` | exports map `./addons/*` passes the path through; MG 136 to 137 extension note | `from\s+['"]three\/(examples\/jsm\|addons)\/[^'"]+(?<!\.js)['"]` |

### 3.4 TSL renames and behavioural mistakes

TSL renames (MG and src; flag only in files that import `three/tsl` or `three/webgpu`): `viewportTopLeft` to `viewportUV` and `viewportBottomLeft` removed (r168), `uniforms()` to `uniformArray()` (r168), `TextureNode.uv()` to `.sample()` (r172), `varying()` to `toVarying()` and `vertexStage()` to `toVertexStage()` (r173), `transformedNormalView`/`transformedNormalWorld` to `normalView`/`normalWorld` (src says since r178), `label()` to `setName()` (r179), `PI2` to `TWO_PI`, `cache()` to `isolate()` and `PassNode.setResolution()` to `setResolutionScale()` (r181), `directionToColor()` to `packNormalToRGB()`, `colorToDirection()` to `unpackRGBToNormal()`, `directionToFaceDirection()` to `negateOnBackSide()` and `Line2NodeMaterial.lineColorNode` to `colorNode` (r185). Regex: `\b(PI2|transformedNormalView|transformedNormalWorld|transformedClearcoatNormalView|directionToColor|colorToDirection|directionToFaceDirection|viewportTopLeft|viewportBottomLeft)\b`.

| Mistake | What the model writes | Correct | Since | Detection |
| --- | --- | --- | --- | --- |
| Dark scene from legacy light values | `new THREE.PointLight(0xffffff, 1, 100)` | intensity is in candela and `decay` defaults to 2 (src), so raise intensity or add an environment map | r155 | runtime (tw black-mesh and luminance checks) beats regex |
| Composer without OutputPass | `new EffectComposer(renderer)` with passes but no `OutputPass` | end the chain with `new OutputPass()`; inline tone mapping only applies when rendering to screen | OutputPass r153, rule r155 (MG) | context: `\bnew\s+(THREE\.)?EffectComposer\s*\(` and no `OutputPass` |
| Thick lines | `new THREE.LineBasicMaterial({ linewidth: 3 })` | `Line2` with `LineMaterial`, or `Line2NodeMaterial` on WebGPU | r186 docs: WebGL and WebGPU "always render line primitives with a width of one pixel" | `\bnew\s+(THREE\.)?LineBasicMaterial\s*\(\s*\{[^}]*\blinewidth\s*:\s*(?:[2-9]\|\d{2,}\|1\.\d*[1-9])` |
| Color map without color space | `new TextureLoader().load('albedo.jpg')` used as `map` | `tex.colorSpace = THREE.SRGBColorSpace` for color maps only (GLTFLoader sets it) | r152 | runtime (tw washed-out check) |
| Frozen animation | motion without delta, loop never started, `frameloop="demand"` without `invalidate()` | Timer delta; `setAnimationLoop`; invalidate on change | always | two-frame pixel diff |
| State bugs in games | UI and hidden state drift apart | expose state hooks and test them | always | state hooks plus scripted input |

### 3.5 Rules as code and runtime strings

Every rule below was tested against positive samples (what models write) and negative samples (correct r186 code): 31 single-pattern rules and 9 context rules, 0 failures. Run over r186's own `src/` and `examples/jsm/` (without `libs/`), the only hits are the deprecated definitions and wrappers themselves. Earlier drafts matched warning strings such as `'THREE.DRACOLoader: ...'`, Line2's valid `linewidth: 5` and NRRDLoader's `.encoding =`; the patterns below avoid them. Apply the rules only to files that import or map three.

```js
// Stale three.js API rules, verified against three 0.186.1 (r186) on 2026-09-26.
// warn = first release that deprecates or renames; breaks = first release where the code fails or silently misbehaves.
export const rules = [
  { id: 'umd-script', warn: 150, breaks: 161, re: /<script[^>]+src=["'][^"']*\/three(\.min)?\.js["']/ },
  { id: 'examples-js', breaks: 148, re: /['"][^'"]*examples\/js\/[^'"]*['"]/ },
  { id: 'three-namespace-addon', breaks: 148, re: /\bnew\s+THREE\.(OrbitControls|MapControls|TrackballControls|FlyControls|PointerLockControls|TransformControls|DragControls|GLTFLoader|DRACOLoader|KTX2Loader|OBJLoader|MTLLoader|FBXLoader|RGBELoader|HDRLoader|EXRLoader|FontLoader|TextGeometry|EffectComposer|RenderPass|ShaderPass|UnrealBloomPass|OutputPass|CSS2DRenderer|CSS3DRenderer)\s*\(/ },
  { id: 'geometry-class', breaks: 125, re: /\bnew\s+(THREE\.)?(Geometry|Face3)\s*\(/ },
  { id: 'buffergeometry-alias', warn: 145, breaks: 154, re: /\b(Box|Sphere|Plane|Cylinder|Cone|Torus|TorusKnot|Circle|Ring|Icosahedron|Octahedron|Tetrahedron|Dodecahedron|Lathe|Extrude|Shape|Tube|Capsule|Polyhedron|Edges|Wireframe|Text|Parametric)BufferGeometry\b/ },
  { id: 'encoding-api', warn: 152, breaks: 162, re: /\b(outputEncoding|sRGBEncoding|LinearEncoding|GammaEncoding)\b/ },
  { id: 'webgl1-renderer', warn: 153, breaks: 163, re: /\bWebGL1Renderer\b/ },
  { id: 'physically-correct-lights', warn: 150, breaks: 160, re: /\bphysicallyCorrectLights\b/ },
  { id: 'use-legacy-lights', warn: 155, breaks: 165, re: /\buseLegacyLights\b/ },
  { id: 'gamma-flags', warn: 112, breaks: 141, re: /\b(gammaOutput|gammaFactor|gammaInput)\b/ },
  { id: 'apply-matrix', warn: 113, breaks: 141, re: /\.applyMatrix\s*\(/ },
  { id: 'imageutils-loadtexture', breaks: 141, re: /\bImageUtils\.loadTexture(Cube)?\s*\(/ },
  { id: 'three-math', warn: 113, re: /\bTHREE\.Math\./ },
  { id: 'merge-buffer-geometries', warn: 151, breaks: 161, re: /\bmergeBufferGeometries\s*\(/ },
  { id: 'clock', warn: 183, re: /\bnew\s+(THREE\.)?Clock\s*\(/ },
  { id: 'timer-addon-path', breaks: 179, re: /(addons|examples\/jsm)\/misc\/Timer(\.js)?['"]/ },
  { id: 'postprocessing-class', warn: 183, re: /\bnew\s+(THREE\.)?PostProcessing\s*\(/ },
  { id: 'async-deprecated', warn: 181, re: /\.(renderAsync|clearAsync|clearColorAsync|clearDepthAsync|clearStencilAsync|hasFeatureAsync|initTextureAsync|fromSceneAsync|fromEquirectangularAsync|fromCubemapAsync|detectSupportAsync)\s*\(/ },
  { id: 'source-class', warn: 186, re: /\bnew\s+(THREE\.)?Source\s*\(|\.isSource\b/ },
  { id: 'pcf-soft-shadow', warn: 182, re: /\bPCFSoftShadowMap\b/ },
  { id: 'r3f-canvas-shadows-soft', warn: 182, re: /<Canvas\b[^>]*\bshadows(?:\s*=\s*(?:\{\s*true\s*\}|["']soft["']))?(?=[\s\/>])/ },
  { id: 'rgbe-loader', warn: 180, re: /\bRGBELoader\b/ },
  { id: 'usdz-loader', warn: 179, re: /\bUSDZLoader\b/ },
  { id: 'textgeometry-height', warn: 163, breaks: 173, re: /\bnew\s+(THREE\.)?TextGeometry\s*\([^)]*?\bheight\s*:/s },
  { id: 'webgpu-old-paths', breaks: 167, re: /(examples\/jsm|addons)\/(nodes\/Nodes|renderers\/webgpu\/WebGPURenderer|renderers\/common\/[A-Za-z]+)\.js/ },
  { id: 'cjs-require', warn: 186, re: /\brequire\(\s*['"]three(\/[^'"]*)?['"]\s*\)/ },
  { id: 'min-build', breaks: 186, re: /build\/three\.(module|core|webgpu|webgpu\.nodes|tsl)\.min\.js/ },
  { id: 'cdn-unpinned', re: /(cdn\.jsdelivr\.net\/npm\/|unpkg\.com\/|esm\.sh\/)three(@(latest|next|[\^~][^\/'"]*))?(\/|['"])/ },
  { id: 'extensionless-addon', re: /from\s+['"]three\/(examples\/jsm|addons)\/[^'"]+(?<!\.js)['"]/ },
  { id: 'linewidth-basic', re: /\bnew\s+(THREE\.)?LineBasicMaterial\s*\(\s*\{[^}]*\blinewidth\s*:\s*(?:[2-9]|\d{2,}|1\.\d*[1-9])/ },
  { id: 'tsl-renamed', warn: 168, re: /\b(PI2|transformedNormalView|transformedNormalWorld|transformedClearcoatNormalView|directionToColor|colorToDirection|directionToFaceDirection|viewportTopLeft|viewportBottomLeft)\b/ },
];

const usesWebGPU = t => /\bWebGPURenderer\b|from\s+['"]three\/webgpu['"]|three\.webgpu(\.nodes)?\.js/.test(t);
export const contextRules = [
  { id: 'shadermaterial-on-webgpu', test: t => usesWebGPU(t) && /\bnew\s+(THREE\.)?(Raw)?ShaderMaterial\s*\(|\.onBeforeCompile\s*=/.test(t) },
  { id: 'effectcomposer-on-webgpu', test: t => usesWebGPU(t) && /\bEffectComposer\b/.test(t) },
  { id: 'webglcubert-on-webgpu', test: t => usesWebGPU(t) && /\bWebGLCubeRenderTarget\b/.test(t) },
  { id: 'webgpu-render-without-init', test: t => /\bnew\s+(THREE\.)?WebGPURenderer\s*\(/.test(t) && /\.render\s*\(/.test(t) && !/\.setAnimationLoop\s*\(/.test(t) && !/await\s+\w+\.init\s*\(\s*\)/.test(t) },
  { id: 'importmap-missing-three-webgpu', test: t => /type=["']importmap["']/.test(t) && /["']three\/tsl["']|addons\/tsl\/|three\.webgpu\.js/.test(t) && !/["']three\/webgpu["']\s*:/.test(t) && !/["']three\/["']\s*:/.test(t) },
  { id: 'webgpu-class-from-three', test: t => /from\s+['"]three['"]/.test(t) && !/from\s+['"]three\/webgpu['"]/.test(t) && !/["']three["']\s*:\s*["'][^"']*three\.webgpu(\.nodes)?\.js["']/.test(t) && /\bTHREE\.(WebGPURenderer|\w+NodeMaterial|RenderPipeline|PostProcessing)\b/.test(t) },
  { id: 'cdn-version-mix', test: t => new Set([...t.matchAll(/three@(\d+\.\d+\.\d+)/g)].map(m => m[1])).size > 1 },
  { id: 'transformcontrols-scene-add', test: t => [...t.matchAll(/(\w+)\s*=\s*new\s+(?:THREE\.)?TransformControls\s*\(/g)].some(m => new RegExp(`\\.add\\(\\s*${m[1]}\\s*\\)`).test(t)) },
  { id: 'composer-without-outputpass', test: t => /\bnew\s+(THREE\.)?EffectComposer\s*\(/.test(t) && !/\bOutputPass\b/.test(t) },
];
```

Runtime strings in r186, for mapping console output to rule ids. Core code logs through `warn()`, `warnOnce()` and `error()` in `src/utils.js`, which prefix "THREE."; some addons call `console.warn` directly. `THREE.setConsoleFunction(fn)` (public since r181) receives `(type, message, ...params)` for the core messages [23].

| Rule | Console text (r186) |
| --- | --- |
| clock | `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` |
| postprocessing-class | `THREE.PostProcessing: "PostProcessing" has been renamed to "RenderPipeline". Please update your code to use "THREE.RenderPipeline" instead.` |
| async-deprecated | `THREE.Renderer: "renderAsync()" has been deprecated. Use "render()" and "await renderer.init();" when creating the renderer.` (same shape for the other methods) |
| webgpu-render-without-init | thrown `Error`: `THREE.Renderer: .render() called before the backend is initialized. Use "await renderer.init();" before rendering.` |
| compute before init (not a mistake to lint) | `THREE.Renderer: ".compute()" called before the backend is initialized. Try using ".computeAsync()" instead.` |
| source-class | `THREE.Source: "Source" has been renamed to "TextureSource". Please update your code to use "THREE.TextureSource" instead.` |
| pcf-soft-shadow | `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` and `THREE.WebGPURenderer: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` |
| rgbe-loader | `RGBELoader has been deprecated. Please use HDRLoader instead.` |
| usdz-loader | `USDZLoader has been deprecated. Please use USDLoader instead.` |
| shadermaterial-on-webgpu | `THREE.NodeBuilder: Material "ShaderMaterial" is not compatible.` |
| cdn-version-mix | `THREE.WARNING: Multiple instances of Three.js being imported.` |
| transformcontrols-scene-add | `THREE.Object3D.add: object not an instance of THREE.Object3D.` |
| cjs-require | Node `DeprecationWarning` with code `THREE_CJS_DEPRECATED` |
| TSL renames (tsl-renamed and methods such as `label()`) | e.g. `THREE.TSL: "label()" has been deprecated. Use "setName()" instead.` |
| WGSL compile errors (r185+) | `THREE.WebGPURenderer [<pipeline>/fragment error] at line L:C: ...`, also delivered to `renderer.onError` (PR 33418) [14] |

### 3.6 Lint results on the skill packs

Code fences only; fences within three lines after "WRONG", "BAD", "DO NOT", "outdated" or "deprecated" were skipped.

| Pack (files) | Hits |
| --- | --- |
| CloudAI-X (10) | rgbe-loader 19, pcf-soft-shadow 4, clock 3, webgpu-old-paths 2, postprocessing-class 1, transformcontrols 1, CDN pin 0.160.0 1 |
| sickn33 copies (4) | rgbe-loader 3, pcf-soft-shadow 3, clock 1 |
| emalorenzo (2 SKILL.md plus 2 rule files and README, AGENTS.md) | clock 1 (labelled GOOD), pcf-soft-shadow 1 (R3F), geometry-class 1 (a BAD example marked only by a comment inside the fence) |
| awesome-copilot game-engine (3) | umd-script 1 (three.js r79) |
| three.js llms-full.txt | umd-script 1 (its labelled WRONG example); importmap-missing-three-webgpu fires on its WebGPU example |
| dgreenheck (8), linegel (6), majidmanzarpour (5), EnzeD (5), scottstts (5), mindrally (1), vercel json-render (1), pmndrs examples AGENTS.md (1) | clean |

EnzeD mentions PCFSoftShadowMap twice, both as correct prose warnings ("On Three.js r182+, use `shadows="percentage"`"). That is why the lint should read code, not prose, and why anti-pattern examples need an explicit marker.

---

## 4. What to copy, and what they get wrong

### 4.1 Copy

Structure:
- Small entrypoints with references loaded on demand. dgreenheck's SKILL.md is 804 tokens; EnzeD averages about 80 lines and warns above 200; majidmanzarpour and scottstts average about 60 lines. CloudAI-X averages 575 lines and about 3.6k tokens per skill [29][33][35].
- A router skill that picks specialists: majidmanzarpour `threejs-game-director`, scottstts `threejs-skill-router`, linegel `threejs-choose-skills` [27][31][38].
- "Tells the agent to inspect the consuming project's versions before choosing APIs" (EnzeD) [33].
- One source of truth across tools: dgreenheck's `.cursor/rules` point at the same docs; pmndrs examples' CLAUDE.md is `@AGENTS.md` [35][55].
- Spend tokens on what models get wrong, not on API catalogs: scottstts says it "is NOT a three.js API cheat sheet"; EnzeD prefers "deleting generic tutorials and exhaustive API catalogs" [33][38].

Verification:
- Extract and type-check every code fence against pinned versions, render the main examples in Chromium in CI, and compare pins with npm dist-tags on a schedule; record the review date only after checks pass (EnzeD) [33].
- Claim-scoped verdicts with a frozen run and recorded backend truth (linegel) [27].
- Tiered page checks: readiness signal, real context type, non-black canvas, clean console; a two-frame diff for frozen scenes; screenshot regression only on changed items; never mix GPU and software goldens (pmndrs examples) [55].
- Check behavior, not only pixels: state hooks, seeded bot playtests, metrics as JSON (majidmanzarpour), which WorldCoder-Bench supports [31][62].
- Fixtures as oracles (linegel) and eval prompts that each hide one trap, run against a no-skill baseline (EnzeD) [27][33].

Token discipline:
- Index first, then one page: pmndrs MCP and CLI, three.js per-page Markdown. One result per line; exit non-zero when nothing matches [53].
- Put a token cost on anything large (pmndrs `~23k`) [53].
- "Scripts enforce, the model judges"; one comparison sheet per review; a quality gate before code generation (img2threejs) [40].
- Numbers instead of images when they answer the question (majidmanzarpour pixel metrics) [31].

### 4.2 What they get wrong or leave out

1. No update loop. The most installed pack froze on 2026-01-19, community fixes wait, and aggregators copy it forward [29][42][58].
2. Release numbers drift, even in good packs (dgreenheck) and in the Migration Guide itself (`computeAsync`) [21][35].
3. Nothing targets r186 yet. The r186 changes (Source renamed, PCFSoftShadowMap removed on WebGPU, CJS deprecated, minified builds gone, `Object3D.dispose()` added) appear in none of the packs read.
4. No linter for the user's project. EnzeD checks its own examples; linegel and majidmanzarpour validate outputs; nobody scans user code for stale APIs.
5. No shared renderer policy. The official llms.txt defaults to WebGLRenderer; linegel treats WebGPU as canonical; dgreenheck and scottstts lean WebGPU; CloudAI-X is WebGL-only. None ties the choice to the scenario.
6. Screenshot-first checking, which WorldCoder-Bench shows misses the main failures [62].
7. Token cost is rarely measured: emalorenzo's rule files are about 10k to 11k tokens each, the pmndrs examples AGENTS.md about 17k, llms-full.txt about 96k to 109k.
8. Upstream warning noise is undocumented except by EnzeD (R3F Clock and shadows).
9. Anti-pattern examples are not machine-marked, so linters flag them.
10. The official AI docs have the defects in 1.4.

---

## Implications for threewright

**kb entries** (each with `applies_to`, `status` and a last-verified date):
- `kb/rules/stale-apis.md`: generated from the rule list in 3.5, one row per rule with release numbers, the correct pattern, the regex, the runtime string and the source.
- `kb/topics/import-maps.md`: the WebGL map (`three`, `three/addons/`) and the WebGPU map (`three` and `three/webgpu` to `three.webgpu.js`, `three/tsl`, `three/addons/`), one exact version on every entry, no `.min.js` on r186, the version-mix trap, the llms-full.txt defect, `file://` note.
- `kb/topics/webgpu-renderer.md`: when to choose it (official default is WebGLRenderer); `setAnimationLoop` initializes; `render()` before `init()` throws since r181; the deprecated `*Async` list and the async methods that remain valid; `renderer.backend.isWebGPUBackend` and `forceWebGL`; ShaderMaterial, onBeforeCompile and EffectComposer incompatibility with TSL replacements; RenderPipeline; `renderer.onError` and WGSL diagnostics (r185); CubeRenderTarget.
- `kb/topics/lighting-and-color.md`: physical units since r155 (candela, decay 2), OutputPass since r153 and needed since r155, PCFShadowMap soft since r182, texture color spaces.
- `kb/topics/timing.md`: Timer in core since r179 (`connect(document)`, `update()`), Clock deprecated r183, R3F still creates a Clock.
- `kb/libraries/r3f.md`: R3F 9.8.1 (2026-09-24) and 10.0.0-alpha.5, drei 10.7.9 and 11 alpha, `shadows="percentage"`, the known upstream warnings, pmndrs docs MCP and CLI, EnzeD skills.
- `kb/agents/docs-access.md`: the fetch ladder with costs (per-page `.html.md` at the matching tag, llms.txt about 1.5k tokens, never llms-full whole, pmndrs MCP for R3F, Context7 as a last resort).
- `kb/agents/llm-failure-modes.md`: the evidence in 3.1, platform priors (r128), benchmark lessons.
- `kb/sources/ai-skills-registry.md`: the table in 2.2 with verdicts and gate dates, refreshed by the curate skill.

**Lint rules** (`scripts/lib/lint.mjs`):
- Ship the 31 pattern rules and 9 context rules in 3.5 as written. Errors for code that fails or silently misbehaves on the target release (for example `umd-script`, `examples-js`, `geometry-class`, `encoding-api`, `webgpu-old-paths`, `timer-addon-path`, `webgpu-class-from-three`, `importmap-missing-three-webgpu`, `shadermaterial-on-webgpu`, `webgpu-render-without-init`, `textgeometry-height`); warnings for deprecated but working code (`clock`, `postprocessing-class`, `async-deprecated`, `source-class`, `pcf-soft-shadow`, `rgbe-loader`, `usdz-loader`, `cjs-require`, `cdn-unpinned`).
- Make rules version-aware: read the project's three version (package.json, lockfile, import map URL or `REVISION`) and skip rules whose `warn`/`breaks` release is newer than the target.
- Lint only files that import or map three. Lint Markdown by code fence only, and honour a marker such as `<!-- tw-lint-ignore -->` before a fence and `// tw-lint-ignore-line`.
- Generate pending rules after each upgrade from the 83 `@deprecated` lines in `node_modules/three/src` (both `@deprecated since rNNN` JSDoc and `// @deprecated, rNNN` comments) and their `warn`/`warnOnce` strings, and diff the Migration Guide from `https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md` (reachable by curl) for renames with no rule yet.
- Keep a self-test: the positive and negative samples used here, plus a false-positive scan of three's own `src/` and `examples/jsm/`.
- In `tw check`, map console text to rule ids (table in 3.5). When the page exposes THREE, install `THREE.setConsoleFunction` to capture core messages with their type; keep plain console capture for addons. Classify "THREE.Clock: This module has been deprecated" and "PCFSoftShadowMap has been removed" as upstream noise when `@react-three/fiber` 9.x is present.

**Skill rules** (for SKILL.md text):
1. Read the project's three version first. If there is none, use `three@0.186.1` from jsDelivr, the same version on every entry.
2. Default to WebGLRenderer, as the official llms.txt does, unless the task needs TSL, compute or node materials, or the project already uses WebGPURenderer. With WebGPURenderer: import from `three/webgpu`, map `three/webgpu` in import maps, render inside `setAnimationLoop` or after `await renderer.init()`, and report `renderer.backend.isWebGPUBackend`.
3. Never write: script-tag builds, `examples/js`, `THREE.OrbitControls`, `Clock`, `PostProcessing`, deprecated `*Async` calls, `RGBELoader`, `PCFSoftShadowMap`, or ShaderMaterial and EffectComposer on WebGPURenderer.
4. Fetch docs one page at a time (`https://threejs.org/docs/pages/<Name>.html.md`, or the raw GitHub path at the matching tag). Never load llms-full.txt whole. For R3F and drei use the pmndrs MCP or `npx @pmndrs/docs search`.
5. Verification ladder: `tw lint`, then `tw check` (console mapped to rules, renderer.info, scene), then state hooks for interactive work, then a two-frame frozen-scene check, then one small screenshot only for visual questions.
6. If the host pins an old three (claude.ai artifacts reportedly r128, unverified), write for that version and say so instead of "fixing" it.

**Adopt, point or note:**
- Adopt: the official llms.txt rules, with threewright's corrections; per-page `.html.md` docs as the docs path; the Migration Guide raw wiki as a lint source; EnzeD's validation pattern (extract fences, type-check, render, release check, review date); the pmndrs index-then-fetch shape for `tw kb`; linegel's verdict vocabulary; majidmanzarpour's pixel metrics as JSON and state hooks.
- Point: majidmanzarpour/threejs-game-skills (games), linegel (advanced WebGPU/TSL effects), scottstts (graphics quality), EnzeD/r3f-skills (R3F), pmndrs docs MCP and CLI, pmndrs/react-three-examples (R3F v10 WebGPU), img2threejs (image to procedural model), dgreenheck (TSL reference, with the release caveats).
- Note: CloudAI-X and its copies (widely installed, stale), emalorenzo (stale), Context7 (large, freshness unverified), cursor.directory and mindrally rules (generic), awesome-copilot game-engine (r79), mintdotgg (vendor), vercel json-render (product), chongdashu starter pack, Nice-Wolf-Studio, Anthropic's repos (nothing for 3D), awesome-cursorrules (nothing), PixiJS first-party skills (a model three.js lacks).
- Possible upstream contributions, as notes only: add `three/webgpu` to the llms-full.txt WebGPU import map; point llms.txt API links at `docs/pages/*.html.md`; add a short "removed APIs" list to llms.txt.

## Claims likely to change

- llms.txt and llms-full.txt content, size and version pin (rebuilt with each docs build; the 0.186.1 patch is not reflected), and the `three/webgpu` gap.
- r187, already in the Migration Guide: PMREMs on cube render targets and `CubeUVReflectionMapping` removed; renderers use WeakRef and FinalizationRegistry; the XR camera follows the first sub camera; `WebGLRenderer.setViewport()` and `setScissor()` no longer scale by pixel ratio with a render target bound; `pixelationPass()` takes a number for `pixelSize`.
- Removal of deprecated wrappers. The guide says "deprecation warnings last for 10 releases", which suggests `*Async` around r191, Clock and PostProcessing around r193 and Source around r196 (inference, unverified). `DRACOLoader.setDecoderConfig` "will be removed in r194" (source).
- Removal of the CJS entry ("will be removed in a future release").
- R3F 10 release and whether it moves to Timer and PCFShadowMap; drei 11.
- Pack maintenance, stars and skills.sh installs (CloudAI-X PRs, linegel and scottstts pace).
- Context7 index statistics.
- WorldCoder-Bench, Web-Bench, P3D-Bench and arena results.
- The three.js version in Claude.ai artifacts.
- The `computeAsync` status (guide and source disagree).

## Search plan for next refresh

1. curl `docs/llms.txt` and `docs/llms-full.txt` at the new tag; diff; count tokens; run the context rules on its examples.
2. curl the raw Migration Guide; diff the new sections; add rules.
3. After `npm i three@latest`: grep `@deprecated` and warn strings in `src/` and `examples/jsm/`; regenerate pending rules; rerun the regex self-test and the false-positive scan.
4. Repeat the GitHub code search counts in 2.1 to track stale against current names.
5. GitHub repository search "threejs skills" sorted by stars; check commit dates and open PRs of the top ten; read skills.sh counts from a network that reaches it.
6. pmndrs/docs CHANGELOG and the docs.pmnd.rs MCP tool list; R3F and drei dist-tags; R3F source for Clock and shadow defaults.
7. EnzeD `validation/baseline.json` review date; linegel and scottstts releases; dgreenheck activity.
8. three.js issues and PRs mentioning llms, AI or agents (issue and PR search).
9. arXiv and GitHub for WorldCoder-Bench, P3D-Bench and Web-Bench three.js results; Design Arena 3D; WebDev Arena.
10. discourse.threejs.org AI threads, including the outcome of thread 91068; Vibe Jam 2026 results and fly.pieter.com.
11. Official statements on the libraries available in Claude.ai artifacts.
12. Search terms: "three.js SKILL.md", "threejs agent skill", "three.js llms.txt", "three.js docs MCP", "TSL AI mistakes", "vibe coding three.js".

## Sources (URL plus date)

1. three.js `docs/llms.txt` (dev), https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/llms.txt (accessed 2026-09-26)
2. three.js `docs/llms-full.txt` (dev), https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/llms-full.txt (accessed 2026-09-26)
3. three.js root `llms.txt`, https://raw.githubusercontent.com/mrdoob/three.js/dev/llms.txt (accessed 2026-09-26)
4. three.js r183 and r185 copies, https://raw.githubusercontent.com/mrdoob/three.js/r183/docs/llms.txt, https://raw.githubusercontent.com/mrdoob/three.js/r183/docs/llms-full.txt, https://raw.githubusercontent.com/mrdoob/three.js/r185/docs/llms-full.txt (accessed 2026-09-26)
5. three.js master copies, https://raw.githubusercontent.com/mrdoob/three.js/master/docs/llms.txt and https://raw.githubusercontent.com/mrdoob/three.js/master/package.json (accessed 2026-09-26)
6. Served copies, https://threejs.org/docs/llms.txt, https://threejs.org/docs/llms-full.txt, https://threejs.org/llms.txt (not reachable from this environment, 2026-09-26)
7. llms generator, https://raw.githubusercontent.com/mrdoob/three.js/dev/utils/llms/build.js (accessed 2026-09-26)
8. three.js package.json (dev), https://raw.githubusercontent.com/mrdoob/three.js/dev/package.json (accessed 2026-09-26)
9. Issue 31933, https://github.com/mrdoob/three.js/issues/31933 (opened 2025-09-24, closed 2026-02-09; accessed 2026-09-26)
10. PR 32673, https://github.com/mrdoob/three.js/pull/32673 (opened 2026-01-06, merged 2026-02-09; accessed 2026-09-26)
11. PR 32660, https://github.com/mrdoob/three.js/pull/32660 (2026-01-02 to 2026-01-06; accessed 2026-09-26)
12. Commit history of docs/llms.txt, https://github.com/mrdoob/three.js/commits/dev/docs/llms.txt (accessed 2026-09-26)
13. PR 34085 "Tour of TSL", https://github.com/mrdoob/three.js/pull/34085 (merged 2026-08-28; accessed 2026-09-26)
14. PR 33418 GPU errors and WGSL diagnostics, https://github.com/mrdoob/three.js/pull/33418 (merged 2026-04-29; accessed 2026-09-26)
15. PR 33181 "AI-generated changelog", https://github.com/mrdoob/three.js/pull/33181 (opened 2026-03-15; accessed 2026-09-26)
16. r186 WebGPU example, https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/webgpu_postprocessing_bloom.html (accessed 2026-09-26)
17. r186 manual pages, https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/webgpurenderer.html and https://raw.githubusercontent.com/mrdoob/three.js/r186/manual/pages/installation.html (accessed 2026-09-26)
18. Docs index with hash mapping, https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/index.html (accessed 2026-09-26)
19. Per-page Markdown docs, https://raw.githubusercontent.com/mrdoob/three.js/r186/docs/pages/Timer.html.md (also Clock, PostProcessing, Source, RenderPipeline, HDRLoader, LineBasicMaterial, WebGLRenderer, Object3D, WebGPURenderer, TextureSource) (accessed 2026-09-26)
20. TSL guide source, https://raw.githubusercontent.com/mrdoob/three.js/r186/tsl/content/Guide.md (accessed 2026-09-26)
21. three.js Migration Guide, https://github.com/mrdoob/three.js/wiki/Migration-Guide, raw at https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md (89,028 bytes; accessed 2026-09-26)
22. npm `three` tarballs 0.88.0 to 0.186.1 and publish dates, https://registry.npmjs.org/three and https://registry.npmjs.org/three/-/three-0.186.0.tgz (pattern for all versions) (accessed 2026-09-26; 0.186.0 published 2026-09-08, 0.186.1 published 2026-09-24)
23. Installed three 0.186.1 source (`src/`, `examples/jsm/`, `build/`) in the threewright repo (read 2026-09-26)
24. Issue 27763 "Please add three.js/three.min.js back", https://github.com/mrdoob/three.js/issues/27763 (opened 2024-02-18, closed not planned; accessed 2026-09-26)
25. Issue 31102 "Vite: Duplicate imports when mixing three/tsl and three/webgpu", https://github.com/mrdoob/three.js/issues/31102 (opened 2025-05-14; accessed 2026-09-26)
26. Release r186, https://github.com/mrdoob/three.js/releases/tag/r186 (accessed 2026-09-26)
27. linegel/threejs-complete-set-of-skill, https://github.com/linegel/threejs-complete-set-of-skill and https://github.com/linegel/threejs-complete-set-of-skill/commits/main (accessed 2026-09-26)
28. threejs-skills.com, https://threejs-skills.com/ (not fetched in this pass)
29. CloudAI-X/threejs-skills, https://github.com/CloudAI-X/threejs-skills, https://github.com/CloudAI-X/threejs-skills/commits/main, https://github.com/CloudAI-X/threejs-skills/pulls (accessed 2026-09-26)
30. skills.sh CloudAI-X page, https://www.skills.sh/cloudai-x/threejs-skills (search summary, 2026-09-26)
31. majidmanzarpour/threejs-game-skills, https://github.com/majidmanzarpour/threejs-game-skills, /commits/main, /issues (accessed 2026-09-26)
32. skills.sh majidmanzarpour page, https://www.skills.sh/majidmanzarpour/threejs-game-skills (search summary, 2026-09-26)
33. EnzeD/r3f-skills, https://github.com/EnzeD/r3f-skills, /commits/main, README, docs/maintenance.md, evals/evals.json, .github/workflows/validate.yml (accessed 2026-09-26; reviewed 2026-08-31)
34. emalorenzo/three-agent-skills, https://github.com/emalorenzo/three-agent-skills and /commits/main (accessed 2026-09-26)
35. dgreenheck/webgpu-claude-skill, https://github.com/dgreenheck/webgpu-claude-skill (accessed 2026-09-26; last updated 2026-04-01)
36. skills.sh dgreenheck page, https://www.skills.sh/dgreenheck/webgpu-claude-skill (search summary, 2026-09-26)
37. Three.js Roadmap posts, https://threejsroadmap.com/blog/getting-ai-to-write-tsl-that-works and https://threejsroadmap.com/blog/claude-code-skill-for-threejs-webgpu-and-tsl-development (search summaries, 2026-09-26)
38. scottstts/Threejs-Awesome-Graphics-Agent-Skills, https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills and /commits/main; npm `threejs-awesome-graphics-agent-skills` 0.11.0 (accessed 2026-09-26)
39. mintdotgg/mint-threejs-skills, https://github.com/mintdotgg/mint-threejs-skills and /commits/main (accessed 2026-09-26)
40. img2threejs/img2threejs, https://github.com/img2threejs/img2threejs (README, accessed 2026-09-26)
41. chongdashu/vibejam-starter-pack, https://github.com/chongdashu/vibejam-starter-pack (accessed 2026-09-26)
42. sickn33/agentic-awesome-skills, https://github.com/sickn33/agentic-awesome-skills (accessed 2026-09-26)
43. mindrally/skills `three-js`, https://github.com/mindrally/skills/blob/main/three-js/SKILL.md (accessed 2026-09-26)
44. vercel-labs/json-render `react-three-fiber` skill, https://github.com/vercel-labs/json-render/blob/main/skills/react-three-fiber/SKILL.md (accessed 2026-09-26)
45. Nice-Wolf-Studio/claude-skills-threejs-ecs-ts, https://github.com/Nice-Wolf-Studio/claude-skills-threejs-ecs-ts (repository search result, 2026-09-26)
46. anthropics/skills, https://github.com/anthropics/skills/tree/main/skills (accessed 2026-09-26)
47. anthropics/claude-plugins-official, https://github.com/anthropics/claude-plugins-official/tree/main/plugins and /tree/main/external_plugins (accessed 2026-09-26)
48. PatrickJS/awesome-cursorrules, https://github.com/PatrickJS/awesome-cursorrules (accessed 2026-09-26)
49. cursor.directory React Three Fiber rule, https://cursor.directory/react-native-r3f (search summary, 2026-09-26)
50. github/awesome-copilot game-engine skill, https://github.com/github/awesome-copilot/blob/main/skills/game-engine/references/3d-web-games.md (accessed 2026-09-26)
51. MDN three.js game tutorial source, https://raw.githubusercontent.com/mdn/content/main/files/en-us/games/techniques/3d_on_the_web/building_up_a_basic_demo_with_three.js/index.md (accessed 2026-09-26)
52. Context7 three.js entries, https://context7.com/mrdoob/three.js and https://context7.com/llmstxt/threejs_llms-full_txt (search summaries, 2026-09-26)
53. pmndrs/docs, https://github.com/pmndrs/docs (docs/agents/introduction.mdx, README.md, CHANGELOG.md, src/app/llms.txt/route.ts, src/libs.ts); npm `@pmndrs/docs` 4.1.2 (published 2026-08-20) (accessed 2026-09-26)
54. R3F docs llms files, https://r3f.docs.pmnd.rs/llms.txt and https://r3f.docs.pmnd.rs/llms-full.txt (search results; not reachable, 2026-09-26)
55. pmndrs/react-three-examples, https://github.com/pmndrs/react-three-examples (AGENTS.md, CLAUDE.md, README.md, docs/SPEC.md; spec final 2026-07-26, amended 2026-09-03) (accessed 2026-09-26)
56. npm `@react-three/fiber` 9.8.1 (published 2026-09-24) source and `@react-three/drei` dist-tags, https://registry.npmjs.org/@react-three/fiber and https://registry.npmjs.org/@react-three/drei (accessed 2026-09-26)
57. PixiJS skills, https://github.com/pixijs/pixijs/tree/dev/skills (accessed 2026-09-26)
58. GitHub code and repository search, https://github.com/search (queries in 2.1; accessed 2026-09-26)
59. Reproduced Claude.ai system prompts (unofficial), https://github.com/jujumilk3/leaked-system-prompts/blob/main/anthropic-claude-sonnet-4.5-full_20250929.md and https://github.com/jujumilk3/leaked-system-prompts/blob/main/anthropic-claude-opus-4.7_20260416.md (accessed 2026-09-26)
60. Simon Willison, "Highlights from the Claude 4 system prompt", https://simonwillison.net/2025/May/25/claude-4-system-prompt/ (published 2025-05-25; search summary)
61. cdnjs three.js package config, https://raw.githubusercontent.com/cdnjs/packages/master/packages/t/three.js.json (accessed 2026-09-26); cdnjs library page, https://cdnjs.com/libraries/three.js/ (search summary)
62. WorldCoder-Bench, https://arxiv.org/abs/2606.01869 (June 2026; search summary) and https://github.com/shuolucs/WorldCoder-Bench (accessed 2026-09-26)
63. P3D-Bench, https://arxiv.org/abs/2606.11152 (June 2026; search summary)
64. Web-Bench, https://arxiv.org/abs/2505.07473 and https://github.com/bytedance/web-bench (projects/threejs) (accessed 2026-09-26)
65. Design Arena 3D, https://www.designarena.ai/leaderboard/3d-design and https://modelgrep.com/best/3d (search summaries, 2026-09-26)
66. LLM Stats 3D Arena, https://llm-stats.com/arenas/coding-arena/threejs (search summary, 2026-09-26)
67. 2025 Vibe Coding Game Jam, https://levels.io/winners-of-the-2025-vibe-code-game-jam, https://jam.pieter.com/, https://x.com/levelsio/status/1901660771505021314 (search summaries, 2026-09-26)
68. 2026 Cursor Vibe Coding Game Jam, https://x.com/levelsio/status/2039777677435908421 and https://vibejam.com/2026/press (search summaries, 2026-09-26)
69. Forum, "Proposal: optional tag for AI-generated or AI-assisted code", https://discourse.threejs.org/t/proposal-optional-tag-for-ai-generated-or-ai-assisted-code/91068 (search summary, 2026-09-26)
70. Forum, "Three.js and AI Agents: A New Workflow", https://discourse.threejs.org/t/three-js-and-ai-agents-a-new-workflow/88250 (2025-11-21)
71. Forum, "THREE.OrbitControls is not a constructor", https://discourse.threejs.org/t/three-orbitcontrols-is-not-a-constructor/22549 (search result, 2026-09-26)
72. Forum, "import from 'three/tsl', WARNING: Multiple instances of Three.js being imported", https://discourse.threejs.org/t/import-from-three-tsl-warning-multiple-instances-of-three-js-being-imported/70303 (search result, 2026-09-26)
73. R3F issue 3601, "Vite: Multiple instances of Three.js being imported", https://github.com/pmndrs/react-three-fiber/issues/3601 (search result, 2026-09-26)
74. Utsubo, "Migrate Three.js to WebGPU (2026): The Complete Checklist", https://www.utsubo.com/blog/webgpu-threejs-migration-guide (search summary, 2026-09-26)
75. Three.js Resources, "Vibe Coding Three.js", https://threejsresources.com/ai/vibe-coding (search summary, 2026-09-26)
76. Forum, "Updates to lighting in three.js r155", https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733 (linked from the Migration Guide)
77. Snyk, "Top 8 Claude Skills for 3D Modeling, Game Dev, and Shader Programming", https://snyk.io/articles/top-claude-skills-3d-modeling-game-dev-shader-programming/ (search summary, 2026-09-26)
78. Tokenizers used for counts: npm `gpt-tokenizer` (o200k_base) and `@anthropic-ai/tokenizer` (accessed 2026-09-26)

# Research: threewright-shaders

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: TSL, node materials, compute and node post-processing in three.js, the WebGL shader path, and shader tooling. Tier `fast`. Last refresh 2026-09-26; next due 2026-10-10.

## Current understanding

- TSL is the forward shader path: node materials compile to WGSL or GLSL and run on WebGPURenderer and its WebGL 2 backend; RenderPipeline with pass() and display nodes is the WebGPU post-processing path (direction research). Settled.
- GLSL ShaderMaterial, onBeforeCompile and EffectComposer are current on the WebGL path and unsupported on WebGPURenderer; r184 added a limited bridge for node materials in WebGLRenderer. Settled.
- Renames to lint: PostProcessing to RenderPipeline (r183), label() to setName() (r179), cache() to isolate() (r181), PI2 to TWO_PI (r181), directionToColor and friends (r185). Settled.
- The TSL Guide (threejs.org/tsl/) arrived just before r186; three ships a Transpiler (GLSLDecoder, ShaderToyDecoder, TSLEncoder, WGSLEncoder). Moving.

## Open questions

- Performance of node material setup on WebGPU (issues report 16x to 36x slower initialization).
- Which pmndrs libraries gain TSL support.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `three.js TSL <year>`, the TSL Guide changelog, `webgpu_*` examples added since the last check
- `three.js RenderPipeline node post-processing <year>`

Tooling:

- `path:SKILL.md three.js` and `path:SKILL.md threejs` on GitHub code search, sorted by recently updated; skills.sh weekly installs for "three.js" and "threejs" (never all-time; exclude meta and installer skills)
- `https://registry.modelcontextprotocol.io/v0/servers?search=three` and `search=3d`; `anthropics/claude-plugins-official` and `claude-plugins-community` searched for three.js (record the tier)
- Supersession sweep: `"three.js" skill deprecated OR superseded OR archived <year>`; the archive flag on every tool already listed here

Practice:

- `"three.js" "claude code" OR codex OR cursor workflow <year>`; hn.algolia.com `three.js agent` sorted by date
- discourse.threejs.org threads on AI agents (search "AI", "LLM", "agent") since the last check

Testing:

- `path:SKILL.md three.js evals OR benchmark` on GitHub; `"three.js" LLM benchmark OR "WebDev Arena" <year>`
- `site:arxiv.org LLM 3D web generation evaluation <year>`; promptfoo or Inspect assertion types for browser output

Best sources: threejs.org/tsl and docs pages, the three.js webgpu examples source, the installed three source, Maxime Heckel and Codrops TSL articles, the direction research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20261011-1 · 2026-10-11 · Subject and testing: DirectRenderPipeline has no MSAA on WebGL 2; three.js tests TSL by numbers; `range()` changes in r187
- Summary: three.js #34947 (r186, Chrome 155): DirectRenderPipeline on the WebGL 2 fallback gives aliased edges even with `antialias: true`; closed as not planned, documented for r187 (PR #34954), and called a pipeline for special cases, mainly XR. PR #34331 (shipped in r186) adds `gpuTest` and `gpuFuzzTest`: assertions write actual and expected values to storage buffers, read them back and compare on the CPU with tolerances, on WebGPU and the WebGL 2 fallback under headless Puppeteer, skipping a backend that fails to start; a way to check TSL math by its numbers rather than an image (point; an eval asserting compute output read back with `getArrayBufferAsync` is a candidate). Dev (r187): RangeNode now uses `hash()` (#34897, #34920), so scenes using TSL `range()` will look different after the upgrade and a before/after diff will show it. The Linux headless WebGPU flag fix (threewright R-20261011-1) applies to Step 3's backend check. Tooling: the dgreenheck TSL skill stalled; no TSL MCP server.
- Track: subject, testing, tooling
- Sources: https://github.com/mrdoob/three.js/issues/34947, https://github.com/mrdoob/three.js/pull/34954, https://github.com/mrdoob/three.js/pull/34331, https://github.com/mrdoob/three.js/commits/dev
- Magnitude: 0.3
- Applied: threewright:C-20261011-1 (kb/topics/post-processing.md)

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: TSL direction, post-processing split, renames. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

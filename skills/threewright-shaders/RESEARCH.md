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

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: TSL direction, post-processing split, renames. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-direction.md, ai-docs/research/2026-09-26-core-r160-r186.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

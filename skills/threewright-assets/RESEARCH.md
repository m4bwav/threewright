# Research: threewright-assets

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: glTF tooling and compression, CC0 asset sources and licences, 3D asset generation tools and MCP servers, splat formats. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- glTF or GLB is the web format; glTF Transform 4.5.0 (inspect, validate, optimize) and gltfpack 1.3.0 cover compression (meshopt, Draco, KTX2, WebP) (tools research). Settled.
- CC0 sources: Poly Haven (HDRIs, textures, models; its API asks for a visible credit), ambientCG, Kenney, Quaternius. Mixamo is unmaintained. Settled.
- Generation: Meshy (official MCP and CLI), Tripo (CLI), open models (TRELLIS.2, TripoSG); Blender through MCP bridges; all outputs need tw glb and validation. Moving fast.
- tw glb reports size, draw calls, texture pixels, extensions and the decoders they need, bounds and budget warnings without reading binaries into context. Verified on five sample models 2026-09-26.

## Open questions

- Licence terms of AI generators for commercial use in 2027.
- KHR_gaussian_splatting compression companions.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `gltf-transform releases`, `gltfpack release`, `KTX-Software release`
- `text to 3D API <year>` license, `Poly Haven API` terms

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

Best sources: glTF Transform docs, meshoptimizer repo, Khronos glTF extensions and validator, Poly Haven and ambientCG sites, the tools research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: asset tools, sources, generation, registry scan. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: tooling
- Sources: ai-docs/research/2026-09-26-mcp-and-ai-tools.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

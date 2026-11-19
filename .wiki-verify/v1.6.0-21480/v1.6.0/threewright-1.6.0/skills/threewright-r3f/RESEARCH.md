# Research: threewright-r3f

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: React Three Fiber, drei and the pmndrs ecosystem, their versions, WebGPU support and pitfalls. Tier `fast`. Last refresh 2026-09-26; next due 2026-10-10.

## Current understanding

- Stable line on 2026-09-26: @react-three/fiber 9.8.1 (React 19.3 support since 9.8.0) with drei 10.7.9; v10 alpha and drei 11 alpha cap React below 19.3 (ecosystem research). Moving.
- WebGPU in v9 goes through an initialized WebGPURenderer from the async gl factory; @react-three/postprocessing is WebGL only. Settled for v9.
- @react-three/rapier 2.2.0 pins Rapier 0.19.2; drei 10 pulls three-stdlib, three-mesh-bvh 0.8 and stats-gl 2. Settled.
- Per-frame work belongs in useFrame on refs; drei Environment presets download HDRs at runtime. Settled.

## Open questions

- When R3F 10 leaves alpha and whether it lifts the React 19.3 cap.
- Whether R3F 9 moves state.clock off the deprecated THREE.Clock.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `@react-three/fiber releases`, `@react-three/drei releases`, pmndrs blog
- `react three fiber webgpu <year>`

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

Best sources: pmndrs GitHub releases, r3f.docs.pmnd.rs, drei docs, the pmndrs docs MCP, the ecosystem research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20261011-1 · 2026-10-11 · Quiet: no R3F or drei release; v10 docs at /next
- Summary: no release since the last check. npm dist-tags: fiber 9.8.1 (alpha 10.0.0-alpha.5), drei 10.7.9 (alpha 11.0.0-alpha.7, which converts BlurPass to TSL and adds a WebGPU Inspector), react 19.3.0, rapier 2.2.0, test-renderer 9.1.1, postprocessing 3.2.0. Master has unreleased fixes (a frame request on remove with `frameloop="demand"`, pointer capture across instance reconstruction, intrinsic-element types limited to three constructors); the v10 docs moved under /next. Tooling: EnzeD/r3f-skills unchanged since 2026-08-31; openai/plugins `react-three-fiber-game` (about 32 installs, no versions or WebGPU guidance). Testing: nothing R3F-specific; the Linux headless WebGPU flag fix in threewright R-20261011-1 applies to WebGPU canvases here too. Practice: nothing new.
- Track: subject, tooling, testing, practice
- Sources: https://github.com/pmndrs/react-three-fiber/commits/master, https://registry.npmjs.org/-/package/@react-three/fiber/dist-tags, https://github.com/EnzeD/r3f-skills/commits/main
- Magnitude: 0.1
- Applied: none (RESEARCH.md only)

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: versions, peer ranges, WebGPU status of the pmndrs stack. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: tooling
- Sources: ai-docs/research/2026-09-26-ecosystem-libraries.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

# Research: threewright-web

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: three.js on websites: product viewers, scroll storytelling, web performance and accessibility for WebGL, the libraries used for them. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- Scroll storytelling: one fixed canvas, GSAP 3.15 ScrollTrigger (free for all uses) with Lenis 1.3, one animation loop driven by GSAP's ticker, a poster image for the first paint, reduced motion shows the final state. Settled.
- Product viewers: <model-viewer> 4.3.1 when no custom UI is needed (AR included); three.js with KHR_materials_variants, environment lighting and AgX or Neutral tone mapping otherwise. Settled.
- Budgets for phones: about 100 draw calls, under 100k vertices, DPR at most 2, textures at most 2048 px, a hero model of a few MB with meshopt or Draco plus KTX2 (scenarios research, A1 and A2). Moving slowly.
- WebGLRenderer is the default for web pages in 2026: WebGPU reaches about 86 to 89 percent of users and older iOS lacks it (direction research). Moving.

## Open questions

- Cross-document view transitions in Safari and what they mean for multi-page WebGL sites.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `gsap scrolltrigger lenis three.js <year>`, `model-viewer releases`
- `WebGL landing page performance LCP <year>`

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

Best sources: GSAP and Lenis docs, model-viewer releases, Codrops tutorials, web.dev performance guides, the scenarios research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: scroll storytelling, product viewers, geospatial, performance budgets. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-ecosystem-libraries.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

# Research: threewright-docs

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: 3D data visualization evidence and which document platforms render 3D, GLB or scripts. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- 3D is justified for data with three real axes or real geometry, shown rotatable, paired with an exact-value view; decorative 3D bars and pies cost time or accuracy (Cleveland and McGill 1984; Siegrist 1996; Zacks et al. 1998; Munzner 2014). Settled.
- Rotation reveals point-cloud structure that stills and scatterplot matrices hide (Structure Perception in 3D Point Clouds 2021); 2D is often enough for dimension-reduced data (Sedlmair et al. 2013). Settled.
- Platforms on 2026-09-26: GitHub renders STL only and strips scripts; Office inserts GLB (FBX off since 2024-01-09); Google Docs shows no 3D; Jupyter uses Plotly or anywidget; published Claude artifacts load three from jsDelivr. Moving.
- Libraries before hand-rolling: Plotly 3D traces, echarts-gl, globe.gl, 3d-force-graph, deck.gl (ecosystem research). Settled.

## Open questions

- Whether GitHub adds a glTF or GLB viewer (would change the README route).
- Chat artifact library limits in 2027.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `site:docs.github.com non-code files 3D OR glb OR stl`, GitHub changelog for 3D
- `IEEE VIS <year> 3D scatterplot OR immersive analytics depth perception`

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

Best sources: GitHub docs and changelog, Microsoft Support 3D models pages, Plotly and globe.gl docs, IEEE VIS and TVCG papers, the dataviz research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: 3D chart evidence, genuinely 3D chart types, platform support, headless stills and turntables, accessibility. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-3d-dataviz-and-docs.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

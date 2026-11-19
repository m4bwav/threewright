# Research: threewright

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: current three.js APIs and releases, WebGPU and TSL status, the verification tooling and how agents build and check three.js work. Tier `fast`. Last refresh 2026-09-26; next due 2026-10-10.

## Current understanding

- three.js is at r186 (npm three 0.186.1, 2026-09-24). Releases slowed to about one every two months in 2026. r186 deprecated the CommonJS build, removed every minified build, renamed Source to TextureSource and added a native Gaussian splat renderer and SunLight with cascaded shadows. Settled for this refresh (direction and core research).
- The manual still calls WebGPURenderer experimental and llms.txt tells agents to default to WebGLRenderer; new features land on WebGPURenderer and TSL. threewright defaults WebGL for docs, product, scroll, video, XR, CAD and maps, and WebGPU for games, generative art and compute (direction research, section 5). Moving.
- Models keep writing removed APIs (the global THREE script, Geometry, outputEncoding, Clock); lint rules with release numbers, checked against npm tarballs, catch them (ai-skills research, section 3.5). Settled.
- Text evidence (console, scene numbers, pixel statistics) proves a page works far cheaper than screenshots; Claude image cost is ceil(w/28) * ceil(h/28) tokens (vision docs, 2026-09-26). Settled.
- Existing three.js skill packs teach stale APIs (RGBELoader in 1,356 SKILL.md files against 11 for HDRLoader) and none lints user code or targets r186 (ai-skills research). The gap threewright fills.

## Open questions

- When WebGPURenderer stops being called experimental in the manual, and whether r187 or later changes the default renderer advice.
- Whether headless Chrome in CI gains a WebGPU adapter by default (SwiftShader has one on Linux with Vulkan; Chromium 141 fails r186 on texture view swizzle).

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `three.js r<next> release notes`, the Migration Guide section for the new release, `npm view three time --json`
- `site:threejs.org/manual webgpurenderer`, the TSL Guide, and llms.txt for changed agent rules

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

Best sources: the mrdoob/three.js releases and Migration Guide, the installed package source, threejs.org docs pages and manual, npm registry metadata, the threewright research notes. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: nine research notes (dataviz and docs, scenarios and testing, AI skills and docs, MCP and AI tools, core r160 to r186, ecosystem libraries, video, games, direction). Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/
- Magnitude: n/a (initial)
- Applied: C-20260926-1

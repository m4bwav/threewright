# Research: threewright-debug

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: failure modes of three.js pages, their console messages and fixes, browser and GPU quirks, debugging tools for agents. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- Most failures show up in text: module resolution errors, 404s, shader compile errors, lit materials with no light, untagged colour textures, cameras off the scene. tw check reports them with fix hints and pixel statistics (verified 2026-09-26).
- Headless machines often have no WebGPU adapter; WebGPURenderer falls back to WebGL 2 by itself; Chromium 141 fails r186's WebGPU backend on a texture view swizzle type. Moving.
- General browser MCPs (Chrome DevTools MCP, Playwright) do not see a three.js scene; three-aware MCPs are XR-only (IWSDK) or dormant (threejs-devtools-mcp) (tools research). Moving.

## Open questions

- A standard way to get GPU timing headless across WebGL and WebGPU.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- three.js forum and issues: new console messages since the last release
- `WebGL black screen three.js <year>` for new failure modes

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

Best sources: the installed three source (grep warn and error strings), three.js issues, the tools research note, the ai-skills research runtime string table. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: tools, runtime strings, failure modes. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: testing
- Sources: ai-docs/research/2026-09-26-mcp-and-ai-tools.md, ai-docs/research/2026-09-26-ai-skills-and-docs.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

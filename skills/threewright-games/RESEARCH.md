# Research: threewright-games

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: three.js game development: physics engines, loop and input patterns, performance budgets, portals, automated game testing, AI-built games. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- Starter stack on 2026-09-26: three 0.186.1 (WebGLRenderer), @dimforge/rapier3d-compat 0.21.0 loaded lazily, Vite 8.3.1, TypeScript 7.0.2 with @types/three 0.186.0; no ECS, no Howler, no three physics addons (games research).
- Fixed 1/60 s ticks with at most 4 steps per frame and interpolation; THREE.Timer, never Clock; input through an action map; seeded randomness; Rapier kinematic character controller. Settled.
- Games are testable headless through window hooks (state, step, input injection, hash); key-press replays were reproducible only with the clock paused before load (games research). Settled for tw's virtual clock.
- Portals: Poki wants under about 8 MB initial download, CrazyGames 50 MB (20 MB mobile homepage), Discord Activities allow WebSockets only; about half of 1,000+ 2025 Vibe Jam entries were cut, many because they did not load. Moving.

## Open questions

- Rapier 0.21.0 was one day old at the research; watch for regressions and snapshot format changes.
- A 2026 Vibe Jam edition and its rules.

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `@dimforge/rapier3d releases`, `three.js character controller <year>`, the official examples source for games
- portal requirements: Poki, CrazyGames, itch.io, Discord Activities

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

Best sources: dimforge Rapier docs and changelog, the three.js games and physics examples, portal developer docs, the games research note. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: stack choices, loop and input, performance, assets, multiplayer, vibe-coded games, distribution, automated testing. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-games.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

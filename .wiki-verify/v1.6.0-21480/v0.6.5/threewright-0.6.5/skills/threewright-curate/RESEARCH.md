# Research: threewright-curate

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: sources for three.js releases, migration notes and ecosystem versions used to keep the knowledge base, lint rules and templates current. Tier `moderate`. Last refresh 2026-09-26; next due 2026-10-26.

## Current understanding

- The knowledge base is data with a schema (kb/SCHEMA.md): kinds topic, scenario, library, recipe, rule; applies_to and status keep current and legacy apart; tw kb validate lints code fences against r186.
- Release numbers for stale APIs come from npm tarballs and the installed source, not memory: several were wrong in memory and in one research note (UMD builds went in r161, physicallyCorrectLights in r160, computeAsync is not deprecated). Settled.
- tw deprecations lists @deprecated markers in an installed three that no rule covers; all 59 in r186 are covered or skipped with a reason. tw versions compares pins with npm dist-tags, stable over prerelease.

## Open questions

- How often library entries go stale in practice (tune the tier after two refreshes).

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `npm view three time --json` and the release notes of each new release
- the Migration Guide section for the new release

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

Best sources: npm registry, mrdoob/three.js releases and Migration Guide, the installed package, the threewright research notes. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: the schema and the verification sources used to build the first knowledge base. Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/2026-09-26-core-r160-r186.md, ai-docs/research/2026-09-26-ai-skills-and-docs.md
- Magnitude: n/a (initial)
- Applied: C-20260926-1

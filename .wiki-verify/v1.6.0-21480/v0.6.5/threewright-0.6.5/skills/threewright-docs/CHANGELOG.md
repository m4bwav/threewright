# Changelog: threewright-docs

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-3 · 2026-09-26 · Light palette check in Step 4
- because: ai-docs/HANDOFF.md (tw bugs: no way to emulate prefers-color-scheme: light)
- files: SKILL.md (Step 4)
- tw gained `--color-scheme light|dark`; Step 4 now asks for one light shot when the page has a light palette.

### C-20260926-2 · 2026-09-26 · Templates surface and globe built and verified
- because: ai-docs/HANDOFF.md steps 3 and 4
- files: kb/scenarios/3d-chart-in-docs.md (Build); templates/surface, templates/globe
- `tw new chart-3d-scatter|surface|globe` now all resolve. The scenario no longer claims all three have axes (the globe has none).

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

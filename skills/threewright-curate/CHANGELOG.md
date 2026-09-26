# Changelog: threewright-curate

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-2 · 2026-09-26 · Scenario entries agree with the templates' verified records
- because: a knowledge base audit (procedure F) run during the 2026-09-26 headless eval pass (evals/results/2026-09-26-headless.md)
- files: kb/scenarios/games.md, video-and-turntables.md, generative-art.md (Essentials, Pitfalls, Notes; frontmatter `template:` in video-and-turntables)
- Four lines still called game-starter, video-turntable and html-webgpu's WebGPU backend unverified, or pointed at the removed templates-wip folder. They now cite the verified runs in each template.json.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json, references/
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

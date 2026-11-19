# Changelog: threewright-debug

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-3 · 2026-09-26 · sheet --sweep in Step 2
- because: ai-docs/research/2026-09-26-mcp-and-ai-tools.md (tw features to add, item 6)
- files: SKILL.md (Step 2)
- Names `sheet --sweep` for comparing values of one setting.

### C-20260926-2 · 2026-09-26 · New tw tools in Step 2
- because: ai-docs/research/2026-09-26-mcp-and-ai-tools.md (tw features to add, items 4, 5, 7, 8, 9)
- files: SKILL.md (Step 2)
- Step 2 now names `tw shaders`, `check --cycles`, `--actions`, `--labels`, and extra outputs from one check launch.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json, references/
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

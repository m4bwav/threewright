# Changelog: threewright

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260929-1 · 2026-09-29 · Lessons from the vapor3d buggy and highway: opt-in scenes, draw-call counting, shared meshes, coplanar lines, timed shots
- because: L-20260929-1, L-20260929-2, L-20260929-3, L-20260929-4 (user request: record learnings that pay off)
- files: LEARNINGS.md (Active), SKILL.md (verification step 2)
- Four lessons added; step 2 now says to click an opt-in scene before checking it, and points to the draw-call eval and to timing shots from a seeded plan.

### C-20260926-2 · 2026-09-26 · All recipes executed; tw check, perf, save and against
- because: ai-docs/HANDOFF.md steps 3 and 4
- files: kb/recipes/*.md (Verify, Notes), kb/topics/performance.md (Verify)
- Ten unexecuted recipes were run, and six were fixed (see the root CHANGELOG 0.2.0). `tw perf`, `check --save/--against` and `shot --eval` are documented in the performance topic.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json, references/
- Initial version. Tier `fast`, interval 14 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

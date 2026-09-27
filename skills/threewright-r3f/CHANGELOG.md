# Changelog: threewright-r3f

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-2 · 2026-09-26 · Description covers "does this R3F app build and run"
- because: T-20260926-3 (outcome-1 run 3, "out/r3f builds and runs clean", fired no skill)
- files: SKILL.md (description)
- The description now names checking whether an app with @react-three/fiber in its package.json builds and runs. The rerun fired the skill in 3 of 3 (T-20260926-4).

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `fast`, interval 14 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

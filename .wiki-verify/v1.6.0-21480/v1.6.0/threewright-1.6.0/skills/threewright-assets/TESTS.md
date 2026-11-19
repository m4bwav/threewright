# Tests: threewright-assets

Test runs for [SKILL.md](SKILL.md). Cases live in `evals/evals.json`. A failure that taught something is a lesson in [LEARNINGS.md](LEARNINGS.md); a fix it caused is logged in [CHANGELOG.md](CHANGELOG.md) with `because: T-...`; research it triggered is in [RESEARCH.md](RESEARCH.md); counts and the failing list are in `evergreen.json` under `tests`. Rules: the evergreen plugin's protocol/TESTING.md.

A test passes on evidence (a tool call in the trace, a file, a marker, a log line), never on the transcript's claim that something was done.

Entry shape: `### T-YYYYMMDD-n · date · harness · env · passed/total`, then one line per failing case (`id · kind · class · what the evidence showed`), then `led to:` (L-, C-, R- ids or none). Newest first. Budget 150 lines; archive older runs to `TESTS-ARCHIVE.md`.

## Runs

### T-20260926-3 · 2026-09-26 · claude -p --plugin-dir (evals/headless) · owner-pc Windows 11, Chrome 153, RTX 5060 Ti · 7/7
- action-1 and outcome-1 3/3 each through the Skill tool, graded on disk and trace by evals/headless/grade.py. Triggers and decoys: T-20260926-2.
- baseline: the no-plugin baseline passed outcome-1 too, so that case is redundant: the plugin shows in action-1 (the tw call) rather than in the end state.
- Results: evals/results/headless-latest.md at the plugin root. Headless runs inherit the user's home, so baselines are not blind to threewright.
- led to: none

### T-20260926-2 · 2026-09-26 · claude plugin eval 2.1.281 (trigger, decoy) + evergreen-tester (action, outcome) · owner-pc Windows 11, Chrome 153, RTX 5060 Ti · 6/6
- trigger (trigger-1, trigger-2): fired 3/3 with the plugin, 0/3 without it. decoy (decoy-1, decoy-2): quiet 3/3 in both arms. Results: evals/results/assets-trigger.json and assets-decoy.json at the plugin root.
- action-1 and outcome-1: one run each (not three, to hold cost), graded on disk by the caller (trace commands, files, rerun checks). The tester read SKILL.md in place of the Skill tool, since the plugin was not installed in the session: a proxy for the main loop. Details: evals/results/action-outcome.md.
  - threewright-assets action-1 · with · PASS · trace: `node scripts/tw.mjs glb models/duck.glb`; reply gives counts, bounds, no decoders needed.
  - threewright-assets outcome-1 · with · PASS · grader: models/big.opt.glb 661 KB vs 5.3 MB input, `tw glb` shows no budget warning, and the reply names MeshoptDecoder and KTX2Loader. Side findings: the product-viewer template wires Draco and meshopt but not KTX2Loader; and `tw check "/c/...?query"` failed because Git Bash skips its path conversion for arguments with a `?` (fixed in tw).
  - threewright-assets action-1 · base · evidence absent · parsed the GLB with inline Python; accurate counts, no decoder or budget advice.
- redundant: none (every action baseline lacked the evidence; several reached a working result by hand, at more cost)
- led to: product-viewer gained KTX2Loader; tw maps Git Bash /c/ paths that carry a query string (threewright CHANGELOG 0.4.1)

### T-20260926-1 · 2026-09-26 · not yet run · skill · 0/0
- Suite written (6 cases: triggers, decoys, one action case with evidence, one outcome case). Not run in the creating session: a plugin installed mid-session is invisible to that session's Skill tool (chartwright:L-20260918-1), so trigger results there would be inconclusive. Run from a fresh session after install (`evergreen-test`).
- led to: none

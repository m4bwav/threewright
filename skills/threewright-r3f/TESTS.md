# Tests: threewright-r3f

Test runs for [SKILL.md](SKILL.md). Cases live in `evals/evals.json`. A failure that taught something is a lesson in [LEARNINGS.md](LEARNINGS.md); a fix it caused is logged in [CHANGELOG.md](CHANGELOG.md) with `because: T-...`; research it triggered is in [RESEARCH.md](RESEARCH.md); counts and the failing list are in `evergreen.json` under `tests`. Rules: the evergreen plugin's protocol/TESTING.md.

A test passes on evidence (a tool call in the trace, a file, a marker, a log line), never on the transcript's claim that something was done.

Entry shape: `### T-YYYYMMDD-n · date · harness · env · passed/total`, then one line per failing case (`id · kind · class · what the evidence showed`), then `led to:` (L-, C-, R- ids or none). Newest first. Budget 150 lines; archive older runs to `TESTS-ARCHIVE.md`.

## Runs

### T-20260926-2 · 2026-09-26 · claude plugin eval 2.1.281 (trigger, decoy) + evergreen-tester (action, outcome) · owner-pc Windows 11, Chrome 153, RTX 5060 Ti · 6/6
- trigger (trigger-1, trigger-2): fired 3/3 with the plugin, 0/3 without it. decoy (decoy-1, decoy-2): quiet 3/3 in both arms. Results: evals/results/r3f-trigger.json and r3f-decoy.json at the plugin root.
- action-1 and outcome-1: one run each (not three, to hold cost), graded on disk by the caller (trace commands, files, rerun checks). The tester read SKILL.md in place of the Skill tool, since the plugin was not installed in the session: a proxy for the main loop. Details: evals/results/action-outcome.md.
  - threewright-r3f action-1 · with · PASS · trace: `tw.mjs new r3f out/r3f`; out/r3f/package.json and dist exist; build OK, tw check OK, lint 0/0.
  - threewright-r3f outcome-1 · with · PASS · grader: `npm run build` exit 0 and `tw check out/r3f/dist` exit 0 (rerun by the grader).
  - threewright-r3f action-1 · base · evidence absent (no tw) · found and copied templates/r3f (the template helps without the skill), npm ci and build passed, vite preview 200; no render check. Its first kill left a vite child listening until it was stopped by PID.
- redundant: none (every action baseline lacked the evidence; several reached a working result by hand, at more cost)
- led to: none

### T-20260926-1 · 2026-09-26 · not yet run · skill · 0/0
- Suite written (6 cases: triggers, decoys, one action case with evidence, one outcome case). Not run in the creating session: a plugin installed mid-session is invisible to that session's Skill tool (chartwright:L-20260918-1), so trigger results there would be inconclusive. Run from a fresh session after install (`evergreen-test`).
- led to: none

# Learnings: threewright-curate

Procedural lessons for [SKILL.md](SKILL.md). Research findings live in [RESEARCH.md](RESEARCH.md); every change is logged in [CHANGELOG.md](CHANGELOG.md); test runs in [TESTS.md](TESTS.md); state in `evergreen.json`. Format and write-time gate: the evergreen plugin's protocol/LEARNINGS-FORMAT.md. Retired entries go to LEARNINGS-ARCHIVE.md with a reason.

Write an entry the moment a real signal happens: a user correction, the same error twice, a discovered workaround, an environment fact, a stated preference, a failed test or a failure in use. Check existing entries first (add / update / retire / none). Trigger and Hypothesis are required. Promote after three confirmations; retire when harmful > helpful.

## Active

<!-- Entry shape:
### L-YYYYMMDD-n · date · One-line lesson in plain words
- Trigger: what happened, with dates or counts
- Hypothesis: why
- Rule: the shortest instruction that prevents the trigger
- Evidence: C-..., T-..., confirmed date
- Scope: skill | repo:<slug> | env:<name> | global
- Status: active · helpful 1 · harmful 0 · last_confirmed date
-->

### L-20261025-1 · 2026-10-25 · A new lint rule runs over the knowledge base's own code first; a verified recipe can still carry the fault
- Trigger: 2026-10-25, the new `composer-without-aa` note fired on kb/recipes/bloom-webgl.md during `kb validate`. The recipe had passed `tw check` in 2026-09 because a lost MSAA throws nothing and `result: OK` says nothing about edges.
- Hypothesis: `tw check` proves the page runs, not that each setting reaches the screen; quality settings that silently stop working (antialias inside a composer) need a lint rule or a measured shot.
- Rule: after adding a lint rule, read every hit `kb validate` reports in the knowledge base, fix the entry (not the rule) when the hit is real, and prove the fix with a before-and-after `tw shot` measured on an edge.
- Evidence: C-20261025-1; edge pixel step 32 before, an in-between value after.
- Scope: repo:threewright
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-10-25

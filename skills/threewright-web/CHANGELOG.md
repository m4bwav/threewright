# Changelog: threewright-web

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-2 · 2026-09-26 · Templates product-viewer, scroll-hero and globe built and verified
- because: ai-docs/HANDOFF.md steps 3 and 4
- files: kb/scenarios/product-viewer.md, kb/scenarios/scroll-storytelling.md, kb/scenarios/geospatial-and-globes.md (Build); templates/product-viewer, templates/scroll-hero, templates/globe
- The routing table already named these templates; they now exist and pass `tw check`, `--reduced-motion` and `tw lint`, with shots looked at. scroll-hero states are shot with `tw shot <dir> --eval "__tw.setProgress(p)"`.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

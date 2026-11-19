# Changelog: threewright-shaders

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-2 · 2026-09-26 · WebGPU recipes verified on a real GPU; bloom values fixed
- because: ai-docs/HANDOFF.md step 5
- files: kb/recipes/bloom-webgpu.md (Code, Verify, Notes), kb/recipes/tsl-custom-material.md (Verify, Notes), kb/recipes/webgpu-backend-check.md (Verify, Notes)
- All three pass `tw check --webgpu` on Chrome 153 with an RTX 5060 Ti. A look at the bloom shot showed a blowout on both backends, so emissive went from x3 to x1.1 and strength from 1.2 to 0.6, with one directional light added. The backend check's Verify section named a `--webgl` flag tw does not have.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `fast`, interval 14 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

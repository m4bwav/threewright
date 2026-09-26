# Changelog: threewright-assets

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20260926-3 · 2026-09-26 · KTX-Software prerequisite in Step 3; quantized bounds fixed
- because: ai-docs/HANDOFF.md (Not done, items 3 and 5)
- files: SKILL.md (Step 3); kb/recipes/optimize-gltf.md (Verify, Notes)
- Step 3 names the KTX-Software tools the etc1s and uastc steps need. `tw glb` bounds are right for quantized models now, so the recipe no longer says to ignore them.

### C-20260926-2 · 2026-09-26 · Asset recipes run; splats template added
- because: ai-docs/HANDOFF.md steps 3 and 4
- files: kb/recipes/optimize-gltf.md, load-gltf-with-decoders.md, export-glb.md (Code, Verify); kb/topics/gaussian-splats.md; templates/splats
- optimize-gltf's `--slots` values matched no texture slots in @gltf-transform/cli 4.5.0 and were fixed. The decoder and export recipes ran unchanged. The splats template loads a generated `.splat` file with `SPLATLoader`.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

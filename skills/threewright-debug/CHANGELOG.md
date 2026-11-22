# Changelog: threewright-debug

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

### C-20261121-1 · 2026-11-21 · view stamp on shots
- because: technique harvest, r/ClaudeGameDev 1y26mw1 (location line on every screenshot, reproduce at the exact view)
- files: SKILL.md Step 3; scripts/tw.mjs; tests/browser.test.mjs

Entry shape: `### C-20261110-1 · 2026-11-10 · tw look in Step 3
- because: user request (technique harvest, post 1wvv7p9)
- files: SKILL.md Step 3; scripts/lib/look.mjs

Step 3 names `TW look` for matching a reference mood by OKLab colour statistics, with `--fit` for a LUT.

### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20261120-1 · 2026-11-20 · Three symptom rows from Ray Tracing Gems
- because: book distillation (Ray Tracing Gems ch. 6, ch. 12), threewright-shaders R-20261120-1
- files: references/symptoms.md

Rows for shadow acne in a custom ray tracer, a hard terminator on strongly bumped surfaces, and jitter far from the world origin, each pointing to the threewright-shaders references that fix it.

### C-20261119-1 · 2026-11-19 · Two symptom rows from Real-Time Rendering
- because: user request (round 6 books track 54, RTR 4e §9.13 and §5.4)
- files: references/symptoms.md
- Rows for sparkling highlights (specular aliasing) and trails behind moving objects (TRAA history not rejected; `maxVelocityLength`, `depthThreshold` checked in three 0.186.1 `TRAANode.js`).

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

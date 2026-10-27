# Changelog: threewright-curate

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20261026-1 · 2026-10-26 · Align the glTF Transform CLI pin
- because: the 0.6.6 wiki found 4.5.0 in the library entry while recipes and CHANGELOG 0.6.3 already pinned 4.5.1
- files: kb/libraries/gltf-transform.md (frontmatter, Setup, Notes)
- npm registry metadata confirms CLI 4.5.1 and its tarball. The entry now pins that release and keeps its older source/API findings scoped to the reviewed 4.5.0 bundle; extension support in 4.5.1 is not claimed.

### C-20261025-1 · 2026-10-25 · Rendering books: transparency topic, LOD, filtering, composer MSAA, glb warnings
- because: R-20261025-1 (ai-docs/research/2026-10-25-books-graphics.md), L-20261025-1
- files: kb/topics/transparency-and-blending.md (new); Pitfalls in kb/topics/performance.md, models-for-the-web.md, post-processing.md, cameras-and-controls.md, lighting-and-shadows.md; kb/recipes/bloom-webgl.md (Code, Verify); kb/rules/lint-rules.json (`composer-without-aa`); scripts/lib/glb.mjs (two warnings) and tests/unit.test.mjs
- Every three.js name was checked in the installed 0.186.1 source before it was written. The new lint note fired on the bloom-webgl recipe, which lost its MSAA in the composer; the recipe now passes a multisampled target, checked with `tw shot` before and after.

### C-20260926-3 · 2026-09-26 · Edit a checkout of the knowledge base, never the installed plugin
- because: T-20260926-3 (action-1 runs noted into the loaded plugin copy, which Claude Code refuses, and which a plugin update would overwrite)
- files: SKILL.md (opening lines)
- `TW` and the knowledge base now come from a git checkout: the current directory when it holds kb/SCHEMA.md, else the plugin root if it is a checkout, else ask. The rerun noted into the checkout in 3 of 3 runs.

### C-20260926-2 · 2026-09-26 · Scenario entries agree with the templates' verified records
- because: a knowledge base audit (procedure F) run during the 2026-09-26 headless eval pass (evals/results/2026-09-26-headless.md)
- files: kb/scenarios/games.md, video-and-turntables.md, generative-art.md (Essentials, Pitfalls, Notes; frontmatter `template:` in video-and-turntables)
- Four lines still called game-starter, video-turntable and html-webgpu's WebGPU backend unverified, or pointed at the removed templates-wip folder. They now cite the verified runs in each template.json.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json, references/
- Initial version. Tier `moderate`, interval 30 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

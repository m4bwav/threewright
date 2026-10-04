# Changelog: threewright

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20261003-1 · 2026-10-03 · Launcher commands pinned for the Claude plugin directory
- because: user request (directory submission: every package a launcher runs names an exact version)
- files: LEARNINGS.md (L-20260929-4 rule), ../../kb/recipes/optimize-gltf.md, ../../kb/recipes/export-glb.md, ../../kb/libraries/gltfpack.md, ../../kb/libraries/iwsdk.md, ../../kb/libraries/globe-gl.md, ../../kb/scenarios/xr-experiences.md, ../../kb/topics/webxr.md
- `npx` and `npm create` lines name exact versions checked with `npm view` on 2026-10-03 (`@gltf-transform/cli` 4.5.1, `gltfpack` 1.3.0, `@iwsdk/cli` and `@iwsdk/create` 1.0.1), and the pinned gltf-transform, gltfpack and iwsdk commands were run. The showroom rule says to serve with the project's own Vite instead of `npx vite`.

### C-20260930-1 · 2026-09-30 · Lessons from the vapor3d old man: a controllable figure on a scrolling floor, headless checks of controls
- because: L-20260930-1, L-20260930-2, L-20260929-8 (confirmed again) (user request: update the skills used)
- files: LEARNINGS.md (Active)
- Two lessons added: steer a figure on a moving floor by its speed over the floor, so idle is keeping pace; check interactive controls with tw --actions after focusing the canvas, aiming from the projection and hit-testing against the projected outline. L-20260929-8 confirmed again by the old man's cane.

### C-20260929-4 · 2026-09-29 · Lessons from the vapor3d random runs and dirt bike: per-run seeds pinned by URL, routes that double back, riding a two-wheeler
- because: L-20260929-4 (updated), L-20260929-10, L-20260929-11 (user request: update the skills used)
- files: LEARNINGS.md (Active)
- L-20260929-4 now covers a random seed per run with a URL pin for checks; two lessons added: test the tightest turn of planned routes over a scrolling floor, and pose a bike from both wheels on the path with a windowed lean.

### C-20260929-3 · 2026-09-29 · Lessons from the vapor3d road cars: background-colour fills for wireframes, models judged in the scene's camera, a scratch showroom
- because: L-20260929-7, L-20260929-8, L-20260929-9 (the markdavidrogers-web session prompt asked for tw and three.js lessons)
- files: LEARNINGS.md (Active)
- Three lessons added: fill a wireframe on a line-drawn floor in the background colour so nothing shows through it; check small models from the ends the fixed camera sees and drive them the way that shows their detail; iterate on models in a git-excluded showroom page served by Vite.

### C-20260929-2 · 2026-09-29 · Lessons from the vapor3d road clearing and picture match: still-frame poster renders, shader masks for line overlays
- because: L-20260929-5, L-20260929-6 (the markdavidrogers-web session prompt asked for tw and three.js lessons)
- files: LEARNINGS.md (Active)
- Two lessons added: render a still-image fallback from the scene pinned at its size (captures do not paint past the viewport; dpr 1 matches the live lines), and clear lines under an overlay with a fragment-shader mask mirrored by a tested pure function.

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

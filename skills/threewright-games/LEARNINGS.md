# Learnings: threewright-games

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

### L-20261120-1 · 2026-11-20 · Measure shake with a centred median, not a mean
- Trigger: building `tw feel`, a centred 9-frame mean spread a 15-frame camera shake to 18 frames and started it 6 frames early; the 15-frame median gave 14 frames on the same run. In pixel mode a plain median of the position track also bent a steady scroll into false bursts at a freeze.
- Hypothesis: a mean leaks a large offset into every frame of the window; a median ignores the minority of shaken frames and keeps steps (freezes, flashes) sharp.
- Rule: detrend shake with centred medians (camera: position, 9 frames; pixels: median velocity over 15 frames, then a 15-frame median of the rest), and drop the frames at the ends that have no full window.
- Evidence: C-20261120-2; tests/feel.test.mjs feel-3d and feel-2d runs, 2026-11-20
- Scope: repo:threewright
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-11-20

### L-20261120-2 · 2026-11-20 · Hook the renderer instance, never the prototype
- Trigger: harvest notes on a published three.js game (2026-11) found that three r169+ assigns `render` on each `WebGLRenderer` instance, so a wrapper on `WebGLRenderer.prototype.render` never fires.
- Hypothesis: the constructor sets `this.render = function ...`, shadowing the prototype.
- Rule: read the camera per frame through tw's per-instance wrapper (the `__THREE_DEVTOOLS__` observe hook wraps each renderer) or from `__tw.target()`; never patch the prototype.
- Evidence: C-20261120-2; feel-3d fixture reads FOV 60-74 exactly, 2026-11-20
- Scope: repo:threewright
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-11-20

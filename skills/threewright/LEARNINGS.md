# Learnings: threewright

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

### L-20260927-4 · 2026-09-27 · On the real production page tw check misses a bundled three.js; judge the clicked state by the shot
- Trigger: after integrating the vapor3d island into markdavidrogers-web, `tw check http://localhost:5080/ --eval "document.querySelector('.hero button').click()" --wait 4000` printed "three: not detected ... no three.js scene observed ... PROBLEMS FOUND", while `tw shot` with the same --eval showed the live scene drawn and the button reading "Picture".
- Hypothesis: tw finds scenes through hooks that a bundled, minified three.js on a page it does not control never exposes (the harness in L-20260927-2 sets `window.__tw.ready`); the pixel statistics of `shot` still see the canvas.
- Rule: on a production page, prove an opt-in scene with `tw shot` plus `--eval` for the click and read the picture and its pixel line; keep `tw check` for the harness. Candidate tw change: when no scene is hooked but a WebGL canvas exists and is painting, say so instead of "not loaded".
- Evidence: markdavidrogers-web `docs/screenshots/home-3d-dark.png`, PR #14.
- Scope: skill (verification on real sites) and scripts/tw.mjs
- Status: active · helpful 0 · harmful 0 · last_confirmed 2026-09-27

### L-20260927-1 · 2026-09-27 · A perspective floor grid needs rows faded early and columns late, or the horizon turns into a moire band
- Trigger: 2026-09-27, markdavidrogers-web vapor3d hero (synthwave floor grid, eye height 1, square 0.3 cells, linear Fog 6 to 58): the first two `tw shot`s showed a solid magenta crosshatch band 40 to 60 px tall under the horizon, and a dark empty strip between the sun and where the fogged grid began.
- Hypothesis: on screen, row spacing shrinks with the square of depth (eye * row / d^2) while column spacing shrinks only linearly (col / d), so rows go sub-pixel from about 13 units out while columns stay readable to about 50. One fog fades both kinds equally, so it either leaves the row band or wipes out the columns, and it hides the far floor so the horizon no longer meets the sun.
- Rule: draw the floor as one LineSegments with a per-vertex `kind` attribute (row, column, horizon) and a small ShaderMaterial that fades each kind by view depth (rows 4 to 19 units, columns 6 to 46 for eye height 1), with cells wider than deep (0.32 across, 0.8 deep). End the columns on a faint horizon line and cut the sun exactly there: cut NDC = horizon NDC - eye / (depth * tan(fov / 2)). Scroll by moving the group modulo one row. Check the far floor in a crop of the shot, not the downscaled full frame.
- Evidence: markdavidrogers-web client/src/islands/vapor3d-scene.ts (GRID_FRAGMENT, SUN_CUT_NDC); shots 1 to 5 of the session, the last one clean at 1280x600 dpr 1 and 390x844 dpr 2; confirmed 2026-09-27
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-27

### L-20260927-2 · 2026-09-27 · Verify a bundled island whose real page needs a backend with a scratch root and a harness page carrying the site's CSP
- Trigger: 2026-09-27, the vapor3d island mounts in an ASP.NET Core Razor page that `tw` cannot start, and three.js had to be proven to load lazily from `/app/chunks/` under a strict `script-src 'self' 'nonce-...'` policy.
- Hypothesis: `tw check` serves one static root, so the built output and the page's static assets have to sit together under that root; a meta CSP reproduces the server's header closely enough to catch eval or inline scripts in the chunk.
- Rule: after `vite build`, copy the output folder (here `wwwroot/app`) plus the CSS and images the page uses into a scratch folder, add a harness HTML with the site's CSP as `<meta http-equiv="Content-Security-Policy">` and a nonce'd boot script that sets `window.__tw.ready` once the island marks its canvas ready, then `tw check "<harness>?query" --root <scratch>`. Prove lazy loading with `--actions "click x,y"` and `--eval` over `performance.getEntriesByType("resource")`: no chunk before the click, the hashed chunk from the expected path after it. Vite 8 warns that the three chunk is over 500 kB (541 kB raw, 136 kB gzip here); that is expected, not a reason to split three.
- Evidence: markdavidrogers-web session 2026-09-27 (harness in the session scratchpad; eval showed `/app/chunks/vapor3d-scene-*.js` only after the click; result OK under the meta CSP); confirmed 2026-09-27
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-27

### L-20260927-3 · 2026-09-27 · For an opt-in scene, read reduced motion and teardown from tw's text lines, and expect a detached-canvas problem after switching off
- Trigger: 2026-09-27, vapor3d toggle: `tw check` after clicking 3D and then Picture printed `result: PROBLEMS FOUND` with the single check "renderer canvas is not attached to the document", although teardown was correct.
- Hypothesis: tw keeps every renderer three announced; a disposed renderer whose canvas was removed on purpose still looks like a page fault to the check.
- Rule: end an `--actions` toggle sequence in the on state (an odd number of clicks) when you want `result: OK`; when checking the off state, read the renderer line instead: `NOT IN DOM ... geometries 0 · textures 0 · programs 0` proves disposal. Prove the reduced-motion still frame with `render calls` (2 with `--reduced-motion` against 165 without, same wait). A 21-click run with `--strict` showed 10 disposed renderers, one live canvas and no context warnings.
- Evidence: markdavidrogers-web session 2026-09-27 (tw check runs listed in the rule); possible tw change: report a detached canvas with 0 programs as information, not a problem; confirmed 2026-09-27
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-27

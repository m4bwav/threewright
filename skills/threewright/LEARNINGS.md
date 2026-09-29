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

### L-20260927-5 · 2026-09-27 · tw --eval takes one expression and the shot follows at once; test page interactions with instant motion
- Trigger: checking a carousel on markdavidrogers.com. `--eval "a.click(); a.click()"` failed with "SyntaxError: Unexpected token ';'". A comma expression with a `setTimeout` second click never fired, and the shot caught a smooth `scrollTo` part-way (the slide sat 40 to 65 px off), which looked like a layout bug.
- Hypothesis: tw wraps --eval as an expression and captures right after it resolves; compositor-driven smooth scrolling and later timers are not waited for.
- Rule: chain actions with commas inside one expression, and pass `--reduced-motion` when the page honours it (its motion becomes instant), so the shot shows the settled state. Read an offset in a smooth-scroll shot as timing until the instant run disagrees.
- Evidence: markdavidrogers-web PR #14, `/scripts/carousel.js`; the reduced-motion run showed slide 3 of 10 exactly aligned.
- Scope: skill (tw shot and check usage)
- Status: active · helpful 0 · harmful 0 · last_confirmed 2026-09-27

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

### L-20260929-1 · 2026-09-29 · On a real page, tw check sees a lazily created renderer after a click; count draw calls with an eval when perf prints "?"
- Trigger: 2026-09-29, markdavidrogers-web vapor3d hero (three bundled by Vite, loaded on a toggle). Earlier notes said `tw check` reports "no three.js scene observed" there. With `--actions "click 1187,597; wait 3000"` it printed the full renderer line (draw calls 37, geometries, programs). `tw perf` on the same page gave 60 fps but `draw calls ? · triangles ?`.
- Hypothesis: tw hooks the renderer when three announces it. That happens when the island imports the chunk, so a check without the click finds nothing. perf's per-frame counters need a hook it does not have for a bundled copy.
- Rule: check an opt-in scene with the click in `--actions` and read its renderer line. For draw calls per frame, pass `--eval` with a promise that wraps `WebGL2RenderingContext.prototype.drawArrays` and `drawElements` with counters (patching the prototype also counts the context that already exists), counts 60 `requestAnimationFrame`s and resolves `calls / frames`. Take two waits to compare a state with and without an object (37.0 against 41.0 here).
- Evidence: markdavidrogers-web session 2026-09-29 (branch feat/hero-buggy-highway, log entry); confirmed 2026-09-29
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-2 · 2026-09-29 · An object that must stand on procedural meshes gets the mesh data from the same pure module as its motion
- Trigger: 2026-09-29, a dune buggy had to drive over the vapor3d hero's faceted ridges (seeded random peaks built inside the scene file) and pitch and roll with the rock. Its height had to match what is drawn, and the tests had to prove it without three.js.
- Hypothesis: when two copies of the shape exist (one drawn, one guessed for motion), they drift apart. When the mesh is data that both the scene and the motion read, they match by construction.
- Rule: move the mesh generator into the three-free motion module as plain arrays (points, triangle index), keeping the same random draws in the same order. The scene only wraps them in a BufferGeometry. The surface height at (x, z) is the highest barycentric height over the triangles under the point, with a reach test per mesh first. Pose a wheeled vehicle from four contact heights: y is their mean, pitch is atan2(front minus rear, 2 wheelbase), roll is atan2(left minus right, 2 track), with Euler order YXZ (heading, then pitch, then roll). Then pixel-diff the still frame against main with `tw diff` (0 pixels here) to prove the seeded stream is unchanged.
- Evidence: markdavidrogers-web client/src/islands/vapor3d-motion.ts (peakShape, terrainHeight, buggyPose) and its tests; confirmed 2026-09-29
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-3 · 2026-09-29 · Lines on top of other lines: no depth writes stops z-fighting, and a fixed renderOrder stops blend flicker
- Trigger: 2026-09-29, a highway's dashed centre line lies exactly on the floor grid's middle column, and both are transparent line sets that scroll.
- Hypothesis: if neither writes depth, they cannot depth-fight. But three sorts transparent objects by the distance of their origins, and origins that scroll change that order, so which colour is on top would flip from frame to frame.
- Rule: give coplanar decal lines `depthWrite: false` like the floor, and an explicit `renderOrder` between the floor and the objects on it (grid -0.5, road -0.25, the rest 0). Put parallel edges midway between grid lines (half-width 1.12 with columns every 0.32), not on them. Fade the dashes with depth like the grid's rows (their period shrinks with the square of depth) and let two long edges run on to the horizon at low alpha.
- Evidence: markdavidrogers-web vapor3d-scene.ts (ROAD_FRAGMENT, renderOrder); screenshots at 1280x800 in dark and light; confirmed 2026-09-29
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-4 · 2026-09-29 · Time screenshots of seeded animation from the plan and look at one contact sheet
- Trigger: 2026-09-29, a buggy that appears for about 15 s every 20 to 40 s had to be caught on the flat, on a ridge and leaving. Guessed waits would each cost a full-page image read.
- Hypothesis: when every appearance is planned from a seed as a pure function of time, a script can print the schedule. Parallel shots cropped to the canvas and tiled cost one image read.
- Rule: keep a small timeline script next to the scene that replays the scene's seeds and prints when each event happens (Node 23.6+ runs a `.mts` file directly; a `.ts` file outside a `"type": "module"` package fails to import). Shoot the chosen moments in parallel, crop to the canvas, tile at half scale with labels, and read only the sheet. Crop at full resolution only where a detail needs checking. Under light load, headless shots in parallel kept to the plan's timing within about half a second.
- Evidence: markdavidrogers-web scripts/hero-timeline.mts and scripts/hero-shots.py; three sheets of six to seven moments; confirmed 2026-09-29
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

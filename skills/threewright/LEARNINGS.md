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

### L-20260929-5 · 2026-09-29 · Render a still-image fallback from the live scene's still frame, pinned at the image's size, so switching does not jump
- Trigger: 2026-09-29, markdavidrogers.com's hero had a generated picture and an opt-in three.js scene "of the same world". Their ridges, sun, grid and colours differed, and the owner saw the jump when switching. The first capture of a 1536x640 canvas in a 1280x800 viewport came back 1536 wide, but everything right of x 1280 was page background.
- Hypothesis: `Page.captureScreenshot` with a clip does not paint beyond the viewport (tw sets captureBeyondViewport false), so an element wider than the viewport is cut. An image generated separately never matches a scene built "to look like it"; one rendered from the scene matches by construction. WebGL draws 1 device-pixel lines, so rendering at dpr 2 and scaling down gives thinner, dimmer lines than the live canvas shows at dpr 1.
- Rule: make the fallback the scene's reduced-motion still. Use `tw shot <page> --canvas --reduced-motion --size <w+64>x<h+64> --dpr 1 --eval "<click the toggle by element; pin the container position:fixed at 0,0 with the exact width and height; hide overlays with an injected style>" --evalWait 3000`, check the PNG's size, and save WebP with Pillow. Keep a script for it next to the scene and re-run it whenever the still changes. Compare the displayed picture with the canvas by the mean absolute difference, not by `tw diff`'s pixel count: the scaled 1536 picture against the native 1152 canvas differs at every line edge (6.7% of pixels, mean 4/255 per channel, against 15/255 for the old generated image).
- Evidence: markdavidrogers-web PR #23, scripts/hero-picture.py; confirmed 2026-09-29
- Scope: skill (tw shot usage, poster images for opt-in scenes)
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-6 · 2026-09-29 · To clear line geometry under an overlay, mask it in the fragment shader by floor x and view depth, with the reveal as a tested pure function
- Trigger: 2026-09-29, a highway drawn over a synthwave floor grid had the grid's rows and a column running through it and under its centre dashes; the owner called it "stupid". The road sweeps out over 4 s, so the clearing had to grow with it.
- Hypothesis: rebuilding the grid geometry per frame or splitting it would be heavy, and a depth or stencil trick fights the no-depth-write lines. The grid shader already knows each fragment's floor x (the grid only slides in z) and its view depth, which is what the road's reach is measured in.
- Rule: pass the reveal as uniforms (reach, half width, margin, tip length) and multiply alpha by `1 - across * along`, with `across = 1 - smoothstep(half - fwidth(x), half + margin + fwidth(x), abs(x))` and `along = 1 - smoothstep(reach - tip, reach, depth)`, the same tip the overlay fades in over, so the lines cross-fade behind its tip. Leave lines that should stay (the horizon line) out by kind, and discard below a tiny alpha. Write the same formula as a pure function in the motion module and test it: nothing cleared in the still frame, all cleared once out, never the nearest lines outside, nothing ahead of the tip.
- Evidence: markdavidrogers-web PR #23, `roadClearing` in client/src/islands/vapor3d-motion.ts and GRID_FRAGMENT; four tests; contact sheet at 2, 3.5 and 6 s; confirmed 2026-09-29
- Scope: skill (line-based scenes)
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-7 · 2026-09-29 · Give a wireframe object on a line-drawn floor a fill in the background colour, or the floor shows through it and it reads as a ghost
- Trigger: 2026-09-29, markdavidrogers-web hero road cars. The first full-resolution crops of seven wireframe cars on the highway showed the road's cyan edge line and the purple grid drawing straight through the van's and the wagon's bodies, and each car's far-side lines cluttered its shape. From behind, a van, a coupe and a wagon were all the same tangle of boxes.
- Hypothesis: line materials hide nothing, so everything behind a wireframe shows through it: the floor, the road and the object's own back. On a busy floor that destroys the silhouette, which is what makes a small object recognisable.
- Rule: build each solid part twice from the same outline: the lines, and triangles (a fan round each side profile's middle plus quads between neighbouring corners) drawn in the background colour with the same fade shader, `DoubleSide`, `polygonOffset` factor 1 and units 1, as the ridges' fill does. Give all the fills a `renderOrder` just below the lines (-0.1 against 0), after the floor and road decals, so every fill writes depth before any object's lines and one object hides another. Share the uniforms object between the line and fill materials, so palette and fade updates reach both. Leave thin parts (wheels, spoilers, rails) as lines only.
- Evidence: markdavidrogers-web PR #25, `client/src/islands/vapor3d-cars.ts` (`hull`, `face`, `quad`, `fill`, `createCars`); before and after crops of the same passes; confirmed 2026-09-29
- Scope: skill (line-based scenes)
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-8 · 2026-09-29 · Judge a small model from the ends the scene's camera sees, and drive it the way that shows its detail
- Trigger: 2026-09-29, markdavidrogers-web hero road cars. The cars looked right in side and three-quarter views, but the hero camera looks down the road, so it sees every car nearly end-on (6 to 7 degrees of side at the closest full view). The scanner car's sweeping light is on its nose, so going away it was a plain wedge. The fire-trail car's trails are behind it, so coming toward the viewer it was a plain wedge too.
- Hypothesis: a detail that is only on one face of a model is invisible for the whole pass when the camera sees the other face, and a model tuned in a showroom view is tuned for a view the scene never shows.
- Rule: check each model in the scene's own camera at the depths it will be seen from, at native pixel size (for example with `camera.setViewOffset(fullW, fullH, x, y, w, h)` round its projected position), from both ends. Put the telling detail where that camera sees it (roof, nose, tail, trails) or fix the model's direction in the plan (here a `way` on the car kind, honoured when picking pair partners), and test that the rule holds.
- Evidence: markdavidrogers-web PR #25, `CARS[].way` in `vapor3d-motion.ts` and its test; crops of the scanner at 112.9 and 113.6 s and the fire trails at 134 and 135.3 s; confirmed 2026-09-29
- Scope: skill (modelling for a fixed camera)
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

### L-20260929-9 · 2026-09-29 · Iterate on small models in a scratch showroom page served by the project's Vite, not by waiting for them to appear in the scene
- Trigger: 2026-09-29, markdavidrogers-web hero road cars. Each car appears for a few seconds every 25 to 50 s, the rarest first at 384 s, so checking a shape change in the real scene meant headless shots with waits of minutes.
- Hypothesis: the shape code is a plain module; any page that imports it can draw every model at once, in the scene's camera, instantly.
- Rule: add a throwaway `client/showroom/index.html` plus a small script that imports the model module and renders a grid of tiles with scissored viewports (`renderer.setScissorTest(true)`, then `setViewport` and `setScissor` per tile): a side view, a three-quarter view, and the scene camera cropped round the model at two or three depths each way with `setViewOffset`. Serve it with `npx vite` (the config's `base` applies: here `/app/showroom/index.html`), shoot it with `tw shot`, and keep the folder in `.git/info/exclude`; delete it before committing. Use the real scene only for the final contact sheets, timed from the plan (L-20260929-4).
- Evidence: markdavidrogers-web PR #25 session: three showroom rounds of about 10 s each before the first real sheet; confirmed 2026-09-29
- Scope: skill (workflow)
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-09-29

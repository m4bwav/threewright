# Log

## 2026-09-26: started

- Built the CDP-based CLI (check, scene, shot, sheet, doctor verified; video untested), first template, research passes. See HANDOFF.md.

## 2026-09-26: second session (continued from HANDOFF, stopped on budget)

- Made tw run in the cloud container (no-sandbox, Playwright Chromium, SwiftShader, offline CDN serving from node_modules or npm), added lint, deprecations, glb, kb, templates, versions, diff, pixel stats, fix hints and --eval; fixed main-scene and camera detection under post-processing and WebGPU shadows; verified tw video end to end including alpha; verified the Claude image-token formula against the vision docs.
- Seven research tracks run in parallel (video track stopped before writing); release numbers cross-checked against npm tarballs, which corrected several claims (UMD r161, physicallyCorrectLights r160, computeAsync not deprecated).
- Templates html-webgpu, vite-ts and r3f added and verified; chart-3d-scatter, video-turntable and game-starter were mid-build when the owner asked to stop spending, so they sit unverified in templates-wip/.
- Knowledge base schema, authoring brief and 7 exemplar entries; all ten skills scaffolded with evals. Next steps in HANDOFF.md.

## 2026-09-26: third session (cloud container; merged the parallel branches into main)

- Found two parallel branches from the same start (this session's and the second session's, `claude/nifty-rubin-57rr82`). The second session's was the fuller one, so main was fast-forwarded to it. This session's branch was merged with its duplicate CLI work dropped, keeping only the video and games research note. Both branches are merged; they could not be deleted from the container (the git proxy drops delete pushes), so delete them on GitHub.
- Finished and verified the chart-3d-scatter, video-turntable and game-starter templates. game-starter got its entry, HUD markup, configs and Node simulation tests, and was driven through `window.__game` in `tw check --eval`.
- Knowledge base grown from 7 to 89 entries by three parallel agents, following the HANDOFF slug plan.
- Lint rules consolidated to 67, with release numbers checked against npm tarballs.
- Packaging written: README, AGENTS.md, CLAUDE.md, Copilot instructions, `.claude-plugin/` manifests and CHANGELOG. Em dashes removed from the knowledge base and skills.

## 2026-09-26: fourth session (Windows 11, Chrome 153, RTX 5060 Ti; v0.2.0)

- Deleted the two merged `claude/*` branches on GitHub and pushed tag `v0.1.0`. Creating the GitHub Releases was blocked by the local agent's permission rules, so the owner still has to run `gh release create` for v0.1.0 and v0.2.0 (see HANDOFF).
- Real WebGPU verified: `tw doctor` shows a WebGPU adapter in headless Chrome 153. html-webgpu, bloom-webgpu, tsl-custom-material and webgpu-backend-check all ran on the WebGPU backend. The bloom-webgpu shot was blown out on both backends; lower values fixed it. `result: OK` cannot tell a glow from a blowout, so look at the shot.
- tw: `check --eval` binds renderer, scene, camera and `find(name)`, because most pages keep them module scoped and the knowledge base's `--eval "renderer..."` advice failed. Also: `perf`, `check --save/--against`, `shot/sheet --eval`, failing on three deprecation warnings (`--strict` for all warnings), ignoring the favicon 404, splat bounds, a scroll-offset crop fix, no DEP0190, build-then-check tests for the package templates, and an em-dash check in `kb validate`.
- Templates: splats (built in this session), plus surface, globe, product-viewer and scroll-hero (built by background agents; this session looked at their shots). All 12 templates are verified.
- All ten unexecuted recipes were run by a background agent, and six were fixed. environment-lighting leaked a render target per swap. optimize-gltf's `--slots` values matched nothing in gltf-transform 4.5.0.
- `npm test`: 43/43 on Windows (unit, browser, and the three package templates built and checked).
- The product-viewer agent ran `taskkill /F /IM python.exe` to stop its test server, which kills every Python process on the machine. Next time, stop a server by its PID.

## 2026-09-26: fifth session (Windows 11, Chrome 153, RTX 5060 Ti; v0.3.0)

- `gh release create` was blocked again by the auto-mode classifier, so v0.1.0 to v0.3.0 still have tags but no Releases (HANDOFF item 1).
- Fixed the six tw bugs from the fourth session. glb bounds: gltf-transform `quantize` and `meshopt` write normalized int16 positions whose accessor min and max are raw integers (gltfpack's unnormalized output was already right). Aspect: read from the projection matrix. `map:(none)`: now `map:DataTexture/NoColorSpace`. `--color-scheme light|dark` added and the light palettes of surface and globe looked at. Canvas capture replays the last frame's screen passes. Query strings on local paths.
- Found and fixed a seventh: two colours with real coverage (one flat-shaded face on a background) was reported as a blank canvas.
- Built the rest of the tools research list: `--actions`, `check --cycles`, `tw shaders`, `--labels`, several outputs per check launch, `render_game_to_text()` (added to game-starter, which was re-verified).
- Updated the debug, games, docs and assets skills, four recipes (resize-and-pixel-ratio, dispose-a-scene, raycast-hover-and-click, optimize-gltf) plus a note on capture-stills-and-video, the README and CLI help.
- `npm test`: 54/54. Version 0.3.0.

## 2026-09-26: fifth session, second part (v0.4.0)

- Installed KTX-Software 4.4.2 per user from the signed GitHub release (`/S /D=%LOCALAPPDATA%\Programs\KTX-Software`, no admin; bin added to the user PATH). gltf-transform 4.5.0 `etc1s` and `uastc` ran against a generated textured quad; `validate` clean.
- Built the remaining tools-research items: `sheet --sweep`, the `advanceTime(ms)` video driver, and sharing an existing `__THREE_DEVTOOLS__` hook. XR emulation stays open.
- `npm test`: 57/57. Version 0.4.0.

## 2026-09-26: releases published

- On the owner's explicit request, created GitHub Releases for v0.1.0 to v0.4.0 with notes from CHANGELOG.md; v0.4.0 is Latest.

- XR (webxr-starter template, tw --xr via IWER) parked on the owner's word: no headset. Nothing was built.

## 2026-09-26: evals run (v0.4.1)

- Ran every skill's suite: 41 trigger and decoy cases through `claude plugin eval` 2.1.281 ($16.28, all passed with 3/3 runs, triggers 0/3 without the plugin), 20 action and outcome cases through evergreen testers in per-run workspaces (all passed on disk evidence), 10 no-skill action baselines (none produced the evidence; several got there by hand at higher cost).
- Fixes from the runs: MP4 and WebM colour tags (ffmpeg 9.0.1), Git Bash /c/ paths with a query string, KTX2Loader in product-viewer, a lint rule named in color-management that never existed. Open: the scroll-hero template gaps (HANDOFF item 1).

## 2026-09-26: final test, campfire video

- The owner asked for a night camp by a creek under a full moon with a low crackling fire. Built with the threewright-video flow at D:/m4bwa/Claude/Projects/Ai/campfire-video (outside the repo): a new page on the renderFrame contract, looked at in tw shots between edits, recorded with `tw video --audio`, checked with ffprobe, a frame strip, blackdetect and freezedetect. Owner follow-ups taken mid-build: a real tent (A-frame, seams, rainfly, poles, guy lines, open door, lantern), a less barren ground (relief, grass, ferns, bushes, rocks, stumps, firewood), a bedroll and a backpack.
- Lessons: a point light placed among the logs throws hard radial shadows that read as a black pillar toward the camera (lift it above the logs, logs cast no shadow); scattered cover needs the camera's line of sight kept clear, or a near fern becomes a dark pillar; tw's bounds warnings misfire on landscapes (HANDOFF item 3).

## 2026-09-26: sixth session (v0.5.0)

- HANDOFF items 1 and 3 done. New `tw vendor` (scripts/lib/vendor.mjs): walks the page's module imports through the import map, copies only the reached pinned CDN files into vendor/ from node_modules, the tw cache or npm pack, and rewrites the map. `tw new` runs it for templates with `"vendor": true`.
- scroll-hero: `<picture>` poster (wide/tall x start/final, made with the new `tw shot --out x.jpg` and the text hidden), WebGL after first paint, canvas fades in once a frame is drawn, reduced motion holds the final keyframe (tw diff: 0 pixels between progress 0 and 1; 14% in normal mode). Checks: normal, reduced motion, ?progress=0.6, 390x844, all OK with --cdn offline.
- tw check bounds: backdrop objects (built-in material with fog: false in a fogged scene; beyond far/3 or spanning far/2) left out; inside-bounds warning skipped for wide flat bounds. The campfire demo and a new landscape fixture check clean; before the change the fixture raised both false warnings.
- `npm test`: 60/60. Version 0.5.0.

## 2026-09-26: final test, Austin showdown video

- The owner asked for a short video of a shootout in Austin, Texas. Built outside the repo at D:/m4bwa/Claude/Projects/Ai/austin-shootout-video with the threewright-video flow: a stylized dusk showdown where Pecan Street crosses Congress Avenue, the Capitol dome at the end of the street, bats, tumbleweed, a Texas flag, letterbox and a title card; six camera shots; procedural audio (wind, bell, drone, two shots with echoes, ricochet, fall). 12 s, 1920x1080, 360 frames, BT.709, AAC at -16.7 LUFS, no black or frozen frames.
- Iterations driven by tw shots in contact sheets (ffmpeg xstack): the low sun left the whole street in shadow and the side shots looked into buildings, so the duel moved to an open cross street lit straight down by a due-west sun; a moustache read as a censor bar; a close-up camera sat inside a coat and was replaced by a matching close-up of the villain.
- Owner question answered: the campfire audio came from make-audio.mjs (plain Node synthesis), not ComfyUI or Ollama. Two learnings added to threewright-video (shared timeline module, loudnorm before muxing).

## 2026-09-26: releases v0.4.1 and v0.5.0

- The owner added `Bash(gh release create:*)` to the user allow list (the auto-mode classifier had blocked it as a public surface); created both Releases from the CHANGELOG sections, v0.5.0 Latest.

## 2026-09-26: v0.6.0, product-viewer vendored, partial headless eval pass

- HANDOFF items 1 and 2. product-viewer is vendored: `tw vendor` follows `new URL(..., import.meta.url)` in vendored modules, which brings the r186 Draco and KTX2 decoders along (checked offline with a Draco model and a KTX2 model; shots looked at). The decoder hints in tw glb and tw check and the KB decoder text now agree that paths are optional in r186.
- Eval pass through `claude -p --plugin-dir` (Skill tool, per-run workspaces): 28 of 70 runs, $12.47. The Skill tool fired in all 25 with-plugin runs. Stopped for two reasons. 14 runs had tool calls denied because the workspaces used the wrong path casing (d-- vs D--). And the curate baseline escaped to the real repo through the user's memory and wrote an audit note, which was removed; its four scenario findings were checked and fixed. The auto-mode classifier then refused relaunching the headless runs. Record: evals/results/2026-09-26-headless.md; lessons in the evergreen plugin's LEARNINGS (L-025, L-026).
- `npm test` 61/61 on main (58 plus 3 skipped in the worktree, which had no template node_modules). kb validate --strict clean.

## 2026-09-26: v0.6.1, eval pass finished

- The owner said to relaunch the runner and to optimise for low upkeep (nobody else uses the library). The harness moved into the repo as evals/headless/ (run.py, grade.py, make-inputs.mjs).
- The earlier denials were not path casing. The workspace was loaded as the `--plugin-dir`, and Claude Code refuses edits inside a loaded plugin. With a separate plugin copy the pilot had 0 denials. Evergreen L-026 was corrected.
- 69 runs, $39.10: every action and outcome case passed 3 of 3 through the Skill tool, except r3f outcome-1 (run 3 invoked no skill). The curate skill was tuned first: it now edits a checkout, not the installed plugin. Outcome grading dropped reply-wording criteria. Baselines passed most outcome cases.

## 2026-09-26: v0.6.2, redundant outcome cases and the r3f trigger

- Outcome cases that the no-plugin baseline also passed are marked `redundant` and skipped by run.py unless `--all` (full pass 37 runs, was 69). threewright-r3f's description now covers "does this R3F app build and run"; outcome-1 rerun fired the skill 3 of 3 (T-20260926-4).
- The owner dropped XR: removed from the handoff's plan.

## 2026-09-27: learnings from a site hero (markdavidrogers-web vapor3d island)

- Used threewright (WebGLRenderer, lines only, lazy-loaded chunk in a Vite React island) to build the opt-in 3D version of Mark's synthwave hero. Verified with `tw check` and `tw shot` through a scratch root and a harness page carrying the site's CSP; not committed here.
- Added L-20260927-1 (fade floor-grid rows early and columns late to avoid horizon moire), L-20260927-2 (scratch-root harness for bundled islands behind a backend) and L-20260927-3 (reading reduced motion and teardown from `render calls` and the renderer line; the detached-canvas problem after switching off) to skills/threewright/LEARNINGS.md. evergreen.json counts.learnings 0 -> 3.
- Candidate tw change from L-20260927-3: report a detached canvas whose renderer has 0 programs and 0 geometries as information, not a problem.

## 2026-10-03: v0.6.3, prepared for the Claude plugin directory

- Checked the directory's pre-submission list. Two files failed it: templates/splats/scene.splat (768 KB) and templates/product-viewer/model.glb (a non-image binary). Both are now gitignored and written by `tw new` from the template's own script (template.json `generate`; three for the model comes from node_modules, the tw cache or `npm pack`). The output is byte for byte the old files; tested with three from the repo and from a fresh cache via npm pack.
- Pinned every launcher command in kb/ (gltf-transform 4.5.1, gltfpack 1.3.0, iwsdk 1.0.1) and ran the pinned commands.
- plugin.json: homepage, documentationUrl, supportUrl, privacyPolicyUrl. README: Privacy section (no telemetry, no credentials read; network only through the page under test, the CDN, npm pack, npm registry lookups and the doctor probe). `.gitignore` lets `.claude-plugin/icon.png` through for the icon another session adds.
- `npm test`: 62 of 62, browser tests included. `claude plugin validate .` passes.
- 2026-10-04: the plugin icon (icon.png in .claude-plugin) for the Claude directory, chosen from two Z-Image candidates. Z-Image Turbo bf16, 9 steps, cfg 1, res_multistep/simple, seed 4193800087, prompt "flat vector app icon, bold simple shapes, minimal, centered single motif, thick clean outlines, high contrast, readable at small size, no text, no letters, no numbers, no words, no logos, square composition, a glowing wireframe cube in isometric view, cyan lines on deep navy background"; white corners painted to the background (4, 11, 64)
- 2026-10-04: submitted to the Claude plugin directory, https://claude.ai/directory/manage/plugins/1341ab59-9fbd-45b0-a55e-ff60fe7475e2 (validated main@0f117b9, Scheduled check only, auto-publish on); holds: lockfile, image/font references (9), credential (4: CDN vendor, research note, cdp.mjs), all documented or false positives; status after submit: in review

## 2026-10-04: v0.6.4, lockfile out of the plugin root

- The Claude directory held 0.6.3 for content policy review: Claude Code would install from `package-lock.json` at the plugin root when a user installs the plugin. `package.json` and the lockfile moved to `dev/` (three 0.186.1 is the only, dev, dependency).
- `tw` finds three in `dev/node_modules` too: CDN serving (cdn.mjs roots), `tw new` asset generation (templates.mjs), `tw deprecations` (lint.mjs). browser.test.mjs skips only when neither node_modules has three; `evals/headless/run.py` links `dev/node_modules` and no longer copies a root package.json.
- `npm test` in `dev/`: 62 of 62. The first run had one flake (perf test, `check --against` saw 5.3% pixel change on the animated html-importmap page); the rerun passed. `tw deprecations` from the repo root finds three in dev/.
- The scanner's image warnings (templates/scroll-hero/*.jpg) are left alone: only `<img>`/`<source>` tags in the template's index.html reference them, nothing executes them.
- Portal result: after Check for new commits, v0.6.4 (fbd2fa3) passed the scan with no policy hold and is waiting for a reviewer. Warnings unchanged: image references (9), credential (4: browser paths in cdp.mjs, "visual tokens" in a research note, plugin.json), download-and-run (10, docs and kb recipes), plus the usual unrecognized-field and root CLAUDE.md notes.
- 2026-10-04 — From markdavidrogers-web PR #37 (hero traffic): four LEARNINGS entries pushed to master (L-20261004-1 to -4: typed buffer attributes copy their array; fixed-step physics with Coulomb friction; planning in road distance with a uniform array in the shader; cheap evidence across seeds), L-20260930-2 confirmed a second time. Branch `lint/buffer-attribute-copies`: the lint rule `typed-buffer-attribute-copies`, scoped to one top-level function (a first version matched across functions and flagged a false positive in vapor3d-scene.ts). Evidence: `npm test` in dev/ 62/62 (one browser pixel test failed once and passed on the rerun), lint on the fixed scene 0 notes.

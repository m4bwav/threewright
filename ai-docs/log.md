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

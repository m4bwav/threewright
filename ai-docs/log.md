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

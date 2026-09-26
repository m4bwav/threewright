# Log

## 2026-09-26: started

- Built the CDP-based CLI (check, scene, shot, sheet, doctor verified; video untested), first template, research passes. See HANDOFF.md.

## 2026-09-26: second session (continued from HANDOFF, stopped on budget)

- Made tw run in the cloud container (no-sandbox, Playwright Chromium, SwiftShader, offline CDN serving from node_modules or npm), added lint, deprecations, glb, kb, templates, versions, diff, pixel stats, fix hints and --eval; fixed main-scene and camera detection under post-processing and WebGPU shadows; verified tw video end to end including alpha; verified the Claude image-token formula against the vision docs.
- Seven research tracks run in parallel (video track stopped before writing); release numbers cross-checked against npm tarballs, which corrected several claims (UMD r161, physicallyCorrectLights r160, computeAsync not deprecated).
- Templates html-webgpu, vite-ts and r3f added and verified; chart-3d-scatter, video-turntable and game-starter were mid-build when the owner asked to stop spending, so they sit unverified in templates-wip/.
- Knowledge base schema, authoring brief and 7 exemplar entries; all ten skills scaffolded with evals. Next steps in HANDOFF.md.

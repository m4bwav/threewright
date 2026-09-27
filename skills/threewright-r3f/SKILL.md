---
name: threewright-r3f
description: "Build and fix React Three Fiber apps (R3F 9.8 with drei 10.7 on React 19.3, three r186): scenes as JSX components, useFrame animation on refs, drei helpers, Rapier physics through @react-three/rapier, post-processing, WebGPU through the async gl factory, and the v10 alpha caveats; verified by building and running tw check on the output. Use whenever the user mentions React Three Fiber, R3F, @react-three/fiber, drei, a Canvas component, useFrame, useThree, a 3D scene in a React or Next.js app, asks to move a three.js scene into React, or asks whether an R3F app (a folder whose package.json has @react-three/fiber) builds and runs clean; also 'refresh threewright-r3f'. Plain three.js pages stay with threewright; games add threewright-games."
---

# threewright-r3f

Outcome: the React Three Fiber code builds, runs without console errors or deprecation warnings under `tw check`, and follows the R3F rules that keep it fast (refs in useFrame, no per-frame React state).

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show react-three-fiber` and `TW kb show drei`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: versions first

Read the project's `package.json`: `@react-three/fiber`, `@react-three/drei`, `react`, `three`. The stable line on 2026-09-26 is fiber 9.8.1 with drei 10.7.9, React 19.3.0, three 0.186.1 (`TW versions` shows today's). R3F 10 and drei 11 are alphas that cap React below 19.3; do not move a project onto them unasked. New app: `TW new r3f <dir>` (Vite, TypeScript, pinned).

## Step 2: rules

1. Per-frame changes happen in `useFrame` on refs, scaled by `delta`; never `setState` per frame. Keep heavy objects in `useMemo`, and dispose what you create outside JSX.
2. Declarative first: `<mesh>`, `<meshStandardMaterial>` and so on; `args` for constructor arguments; `attach` for non-child properties.
3. drei `<Environment preset>` downloads HDRs from a CDN at runtime; build environments from `<Lightformer>`s or ship the HDR with the app.
4. `<Canvas shadows>` asks three for `PCFSoftShadowMap`, which r186 replaces with a warning; pass `shadows="percentage"` or set the shadow map type yourself so `tw check` stays clean.
5. WebGPU: pass an initialized `WebGPURenderer` through the async `gl` factory; @react-three/postprocessing is WebGL only, so use three's `RenderPipeline` there.
6. Physics: @react-three/rapier 2.2.0 pins Rapier 0.19.2; use it for React physics, or Rapier directly for 0.20+ features.
7. One copy of three: never mix a CDN copy with the bundled one; dedupe three-mesh-bvh if you add 0.9 next to drei's 0.8.

## Step 3: verify

1. `npm run typecheck && npm run build`.
2. `TW check dist` (or the dev server URL): `result: OK`, no `Clock`, `PCFSoftShadowMap` or `Multiple instances` warnings, the `pixels:` line shows content.
3. `TW lint src`: 0 errors.
4. Component logic without a GPU: @react-three/test-renderer 9.1.1 (scene graph assertions, `advanceFrames`).
5. One `TW shot dist --size 640x360` for a visual question.

## Step 4: report

Two to four lines: versions, files changed, the build and check results.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found (a peer-range fix, a drei quirk), or an environment fact is discovered, write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`. Library facts also go into `react-three-fiber` or `drei` (`TW kb note <slug> "<text>"`).

## Maintenance

This skill is evergreen (topic: React Three Fiber, drei and the pmndrs ecosystem, their versions, WebGPU support and pitfalls; tier `fast`, currently every 14 days, next due 2026-10-10). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

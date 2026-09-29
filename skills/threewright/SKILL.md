---
name: threewright
description: "Build, fix, upgrade and verify three.js work with current r186 APIs: WebGL or WebGPU scenes, TSL, glTF models, 3D charts, animation, from a one-file HTML page to a Vite or React app, proven with a headless check before it is called done. Use whenever the user mentions three.js, threejs, THREE, WebGL, WebGPU, TSL, a GLB or glTF on the web, a 3D scene, a 3D model viewer, 'make it 3D', 'upgrade my three.js code', or asks which three.js API or version to use; also 'refresh threewright' and 'is threewright stale'. Hands clear cases to its siblings: threewright-docs, -video, -games, -web, -assets, -shaders, -r3f, -debug, -curate. Not for 2D charts (chartwright), Babylon.js, PlayCanvas, Unity or Blender-only work."
---

# threewright

Outcome: the three.js page or code the user asked for exists, uses current r186 APIs (or the project's own release when it is older and no upgrade was asked for), and a headless `tw check` reports `result: OK`, with the evidence quoted in the reply.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"` (Node 22+, Chrome or Chromium; `TW doctor` says what this machine has). Knowledge base: `<plugin root>/kb/`, read through `kb/INDEX.md` and `TW kb`. Read a reference file only when its step is reached.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`, or `threewright-curate`'s refresh path) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: route

| the request is mainly about | skill |
|---|---|
| 3D in a document, README, report, notebook, slide or chat artifact; a 3D chart | `threewright-docs` |
| a video, GIF, turntable or social clip of a scene | `threewright-video` |
| a game | `threewright-games` |
| a product viewer or configurator, a scroll-driven hero, a marketing or portfolio site, a globe or map on a site | `threewright-web` |
| finding, converting, optimizing or licensing models, textures or HDRIs | `threewright-assets` |
| a custom material, shader, TSL, compute, post-processing effect | `threewright-shaders` |
| a React Three Fiber project | `threewright-r3f` |
| a page that is black, blank, broken, slow or looks wrong | `threewright-debug` |
| the knowledge base itself: a note, a new entry, a correction, an audit | `threewright-curate` |

Invoke the sibling and follow it when one row clearly fits; otherwise continue here. Several rows can apply in sequence (an asset, then a web page, then a video).

## Step 2: context

1. Existing project: find its three release (`package.json`, a pinned CDN URL, or `THREE.REVISION`). Work in that release unless the user asked for an upgrade; `TW lint <dir>` checks against it, `TW lint <dir> --target r186` lists what an upgrade breaks (recipe `upgrade-an-old-project`).
2. New work: start from a verified template, never from memory. `TW templates` lists them; `TW new <template> <dir>` copies one. Pick the renderer with `TW kb show renderer-choice --section Essentials`: WebGLRenderer for docs, product viewers, scroll heroes, video, XR, CAD and maps; WebGPURenderer (with its WebGL 2 fallback) for games, generative art and compute.
3. Knowledge: read `kb/INDEX.md` once per session, then `TW kb search <words>` and `TW kb show <slug> --section <name>`. Never read the whole `kb/` folder. The rules that always apply: `current-vs-legacy` (teach r186; legacy only for old projects) and `verification-ladder` (text before pixels).

## Step 3: build

Read [references/build-rules.md](references/build-rules.md) before writing three.js code (one page: imports, renderer, loop, colour, lighting, loading, resize, disposal, accessibility, performance). Write the change; keep templates' structure; pin exact versions.

## Step 4: verify (the step that makes it done)

1. `TW lint <dir>`: 0 errors. Fix warnings unless the user's release needs the old API.
2. `TW check <page>`: must print `result: OK`. Its lines are the evidence: the renderer and backend, draw calls, scene counts, bounds, camera, the `pixels:` line (content present, not black), no exceptions, errors or failed requests. Read the fix hints when it fails; `threewright-debug` owns hard cases. A scene that only starts on a click (a lazy island) is seen only when the click is in `--actions "click x,y; wait ms"`. When `perf` prints draw calls as `?`, count them with an `--eval` ([L-20260929-1](LEARNINGS.md)). For seeded animation, time the shots from the plan and read one contact sheet ([L-20260929-4](LEARNINGS.md)).
3. Only for a visual question: `TW shot <page> --size 640x360` (299 image tokens) or `TW sheet <page>` (700). Look once, fix, re-check.
4. A page that cannot be served headless (needs a login, a device, XR) is reported as unverified, with what was checked instead.

## Step 5: report and learn

Reply in two to five lines: what was built or changed (paths), the template and renderer, and the `tw check` result line with one or two evidence numbers. If the request needed research, a new entry, or showed a knowledge-base gap or error, run `threewright-curate` after delivering.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered, write it to `LEARNINGS.md` now (check existing entries first: add, update, retire, or nothing). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`. A lesson about one topic also goes into that entry's `## Notes` (`TW kb note <slug> "<text>"`).

## Maintenance

This skill is evergreen (topic: current three.js APIs and releases, WebGPU and TSL status, the verification tooling and how agents build and check three.js work; tier `fast`, currently every 14 days, next due 2026-10-10). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`; references in `references/`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

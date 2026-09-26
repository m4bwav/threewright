---
name: threewright-debug
description: "Diagnose and fix three.js pages that are black, blank, broken, slow, flickering or wrong-looking, with text evidence first: tw check (console errors, failed requests, renderer and scene numbers, pixel coverage and brightness, fix hints), tw scene, tw glb, tw lint, and one small screenshot only when the question is visual. Use whenever the user says their three.js or WebGL or WebGPU page shows a black or white screen, nothing appears, the model is missing, tiny or huge, colours look washed out or too dark, it lags or leaks memory, shadows or textures are wrong, it works locally but not deployed, or they paste a three.js error or warning; also 'refresh threewright-debug'. Building new features stays with threewright and its siblings."
---

# threewright-debug

Outcome: the cause is named with evidence (a check line, a hint, a number), the smallest fix is applied, and `tw check` goes from `PROBLEMS FOUND` to `result: OK` (or the remaining problem is stated with what was ruled out).

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb search <symptom words>`, `TW kb show <slug> --section Pitfalls`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: reproduce headless

`TW check <page>` (a folder, an HTML file or a URL; `--size`, `--wait 3000` for slow loads, `--gl swiftshader` on machines without a GPU). Read, in order: EXCEPTIONS, ERRORS, FAILED REQUESTS, `fix hints`, CHECK warnings, then the `pixels:` line (coverage, bounding box, brightness) and the renderer, scene, bounds and camera lines. The report plus [references/symptoms.md](references/symptoms.md) names the cause for most pages. It cannot reproduce: say what differs (device, GPU, auth, data) and ask for the console output.

## Step 2: narrow

- Structure: `TW scene <page>` (tree of the main scene: hidden objects, zero scale, missing materials, instance counts).
- A model: `TW glb <file>` (decoders needed, scale, texture sizes, missing normals).
- Stale APIs: `TW lint <dir>` (against the project's release; `--target r186` when upgrading).
- A value at runtime: `TW check <page> --eval "<expression>"` (for example the camera position, a material's `colorSpace`, `renderer.info.memory`).
- A shader that does not compile: `TW shaders <page>` (each WebGL program, its materials, and the failing line with source context; `--dump dir` writes the sources).
- A leak: `TW check <page> --cycles 5 --cycle "<js that builds and removes one thing>"` fails when geometries, textures or programs grow every cycle.
- A bug that needs input first: `TW check <page> --actions "click 480,270; key KeyW 500"` (also on shot, sheet and video).
- Visual only when text cannot answer: `TW shot <page> --size 640x360`, or `TW sheet <page>` for framing and hidden geometry. Add `--labels` to tag objects by name. `TW check <page> --shot a.png --tree` gets several outputs from one launch.

## Step 3: fix and prove

Make the smallest change that removes the cause, then run `TW check <page>` again. Done is `result: OK` plus the specific line that proves the fix (the warning gone, pixel coverage up, the request 200, draw calls down). For a look regression, `TW diff before.png after.png`.

## Step 4: report

Two to four lines: symptom, cause with its evidence line, the fix (file and change), the check result after.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered (a browser or GPU quirk), write it to `LEARNINGS.md` now (check existing entries first). A new symptom and fix pair also goes into `references/symptoms.md`, and a message tw should explain goes to `threewright-curate` (a hint in `scripts/lib/hints.mjs`, a check in `scripts/lib/inject.mjs`). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: failure modes of three.js pages, their console messages and fixes, browser and GPU quirks, debugging tools for agents; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`; references in `references/`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

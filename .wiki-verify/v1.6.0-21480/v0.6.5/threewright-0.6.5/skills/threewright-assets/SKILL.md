---
name: threewright-assets
description: "Find, make, convert, optimize and license 3D assets for three.js: glTF and GLB models, textures, HDRI environments and Gaussian splats; report a model's size, draw calls, texture pixels and needed decoders with tw glb, compress with glTF Transform or gltfpack (meshopt, Draco, KTX2, WebP), source CC0 packs (Poly Haven, ambientCG, Kenney, Quaternius), and point to Blender and AI generation tools, keeping a credits file. Use whenever the user asks for a model, texture or HDRI to use in three.js, to convert FBX, OBJ or STL to glTF, to make a GLB smaller or faster, to inspect or validate a model, or where to get free 3D assets; also 'refresh threewright-assets'. Not for 2D images or general Blender modelling help."
---

# threewright-assets

Outcome: the assets the scene needs are in the project as glTF or GLB (or KTX2, HDR, splat files), within web budgets, with the decoders they need wired in, and with their source and licence recorded.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show <slug> --section <name>`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: inspect before anything else

`TW glb <file>` for every model you are given or produce. It prints size, draw calls, triangles, texture pixels, extensions, the decoders the file needs, animations, world bounds and budget warnings. Never read binary files (GLB, BIN, HDR, EXR, KTX2, PLY, SPZ) into context.

## Step 2: source or make

1. Free and safe: CC0 sources first (Poly Haven for HDRIs, textures and models; ambientCG for materials; Kenney and Quaternius for game assets). Record the URL and licence in a `CREDITS.md` beside the assets, even for CC0.
2. Other licences (Sketchfab CC-BY and friends): check the licence per model and credit as it requires.
3. Generation: AI generators (their CLIs or MCP servers) and Blender (with an MCP bridge) are options the user must approve; always run `TW glb` and a validator on what they produce. Mixamo is unmaintained; prefer rigs and animations that ship with the model.
4. Conversion: FBX, OBJ and STL become glTF in Blender or with a converter; never ship FBX to the web.

## Step 3: optimize to budget

`TW kb show optimize-gltf --section Code` has the exact commands. The usual order: dedupe and prune, weld and simplify if triangles are over budget, resize textures to 2048 px or less, compress textures (KTX2 ETC1S for colour, UASTC for normals; or WebP; KTX2 needs KTX-Software's `ktx` and `toktx` on PATH, so if they are missing, say so and offer WebP rather than failing silently), compress geometry (meshopt, or Draco). Then wire the decoders into the loader (`load-gltf-with-decoders`) and `TW glb` again: the warnings should be gone or accepted with a reason.

## Step 4: verify in a page

Load the asset in the project or in `TW new product-viewer <dir>` and run `TW check <page>`: `result: OK`, no failed requests, the `bounds:` line has the expected size in metres (fix scale at export, not in code, when you can).

## Step 5: report

One to three lines per asset: path, source and licence, size before and after, draw calls and triangles, decoders wired.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found (an exporter setting, a converter flag), or an environment fact is discovered (a tool that is or is not installed), write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: glTF tooling and compression, CC0 asset sources and licences, 3D asset generation tools and MCP servers, splat formats; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

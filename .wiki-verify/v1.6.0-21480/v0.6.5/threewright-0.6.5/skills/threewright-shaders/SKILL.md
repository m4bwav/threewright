---
name: threewright-shaders
description: "Write custom materials, shaders and effects for three.js r186: TSL node materials (colorNode, positionNode, emissiveNode, uniforms, time), GPU compute for particles and simulations, node post-processing with RenderPipeline (bloom, SSAO, SSR, depth of field, FXAA, TRAA), GLSL ShaderMaterial and onBeforeCompile on the WebGL path, and porting GLSL or Shadertoy code to TSL with three's Transpiler. Use whenever the user asks for a shader, a custom or procedural material, a glow, dissolve, hologram, toon or water effect, post-processing, compute or GPGPU particles, TSL, WGSL or GLSL in three.js, or a shader that fails to compile; also 'refresh threewright-shaders'. Page-level debugging goes to threewright-debug; React projects add threewright-r3f."
---

# threewright-shaders

Outcome: the effect exists on the right path for its renderer (TSL on WebGPURenderer, GLSL on WebGLRenderer), compiles without errors in `tw check`, and looks as asked in one small image, with a diff against the previous look when it is a change.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show <slug> --section <name>`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: choose the path

| the page uses | write | post-processing |
|---|---|---|
| WebGPURenderer (`three/webgpu`) | TSL node materials (`MeshStandardNodeMaterial` and friends with `colorNode`, `positionNode`, `emissiveNode`, `normalNode`); `Fn()` for functions; compute with `Fn(...)().compute(n)` | `RenderPipeline` with `pass(scene, camera)` and display nodes from `three/addons/tsl/display/` |
| WebGLRenderer (`three`) | `ShaderMaterial` or `onBeforeCompile` in GLSL; TSL node materials run there only through the limited r184 bridge | `EffectComposer` with `RenderPass`, the effect passes, and `OutputPass` last |

New effects default to TSL on WebGPURenderer: it compiles to WGSL or GLSL and runs on both backends. `TW kb show tsl` has the basics and the renamed functions; `TW kb show post-processing` has both pipelines; recipes `tsl-custom-material`, `bloom-webgpu`, `bloom-webgl` have working code.

## Step 2: write

- Start from `TW new html-webgpu <dir>` (TSL material plus bloom) or the project's page.
- Uniforms for anything that changes at runtime (`uniform(value)`, then `.value =`), never a rebuilt material per frame.
- Porting GLSL or Shadertoy: `three/addons/transpiler/` (`Transpiler`, `GLSLDecoder` or `ShaderToyDecoder`, `TSLEncoder`) gives a TSL starting point; read and tidy its output.
- Keep the old look reproducible: `TW shot <page> --out before.png --size 640x360` before changing a material.

## Step 3: verify

1. `TW check <page>`: `result: OK`. Shader compile errors appear as console errors; WGSL errors name the pipeline and line, and the fix hint says so. `TW lint <dir>` flags GLSL materials and EffectComposer on WebGPU pages and renamed TSL functions.
2. `TW shot <page> --out after.png --size 640x360` and look once; for a change to an existing look, `TW diff before.png after.png --out diff.png` (small or zero differences outside the intended area).
3. Animated effects: two shots at different times, or `TW video` with a short frame strip.
4. State which backend ran (`renderer:` line in `tw check`): headless machines often have no WebGPU adapter and test the WebGL 2 fallback.

## Step 4: report

Two to four lines: the path chosen and why, files changed, the check result, and what the look check showed.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found (a TSL idiom, a backend difference), or an environment fact is discovered, write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`. TSL facts also go to the `tsl` entry (`TW kb note tsl "<text>"`).

## Maintenance

This skill is evergreen (topic: TSL, node materials, compute and node post-processing in three.js, the WebGL shader path, and shader tooling; tier `fast`, currently every 14 days, next due 2026-10-10). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

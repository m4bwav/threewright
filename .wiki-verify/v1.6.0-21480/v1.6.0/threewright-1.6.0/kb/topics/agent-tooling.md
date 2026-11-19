---
title: Agent tooling for three.js
slug: agent-tooling
kind: topic
summary: What the general and three.js-specific MCP servers give an agent, why tw stays a plain CLI, and the text-first token budget rules for verifying a scene.
tags: [mcp, agent, devtools, token budget, screenshot, tw]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-mcp-and-ai-tools.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [verification-ladder, testing, headless-and-ci]
---

# Agent tooling for three.js

## Essentials

- General browser MCPs carry almost all real-world use: Chrome DevTools MCP (52.6k stars) and Playwright MCP (37.6k stars) dwarf every three.js-specific tool by adoption, but neither knows anything about a three.js scene, and Playwright's accessibility snapshot is empty for a `<canvas>` element, so canvas interaction needs coordinate clicks, not accessibility-tree targeting.
- Three.js-aware tools exist but are smaller and narrower: `threejs-devtools-mcp` (60 tools, proxies a dev server on port 9222, reads `__THREE_DEVTOOLS__`, dormant since 2026-03-23) covers scene/object/material/shader/texture/animation/performance/memory inspection; Meta's IWSDK MCP runtime (55 tools) is the most complete agent tooling for any three.js-based stack found, but only works inside IWSDK apps specifically (ECS, ready-made hand/XR input emulation, a headless deterministic "agent" mode); the official three.js DevTools extension (now merged into the three.js repo itself, v1.18 in r186) is a human-facing browser panel with no agent interface at all.
- The converging design principle across every serious tool is "files and text, not bytes": Chrome DevTools MCP's own design principles say "Reference over Value"; IWSDK 1.0 returns a `screenshotPath`, not inline image bytes; the Playwright team's own guidance is to prefer its CLI over its MCP server for coding agents, citing about 27k tokens for the CLI against about 114k for the same task through the MCP server (secondary sources; treat the exact multiplier as approximate but the direction as consistent across every tool surveyed). This is why `tw` stays a zero-dependency CLI that prints compact text and writes images to disk rather than returning bytes inline by default.
- Concrete numbers worth knowing when budgeting a verification loop (measured 2026-09-26): `tw check` on a starter template printed 767 bytes (about 190 tokens); `tw scene` printed 226 bytes; a full canvas screenshot through `threejs-devtools-mcp` at 1920x1080 costs 2,691 tokens inline, the same image `tw shot` would instead write to disk and report the path plus that same cost estimate, letting you decide whether to actually read it.
- Ideas worth reusing from the wider tool landscape even without adopting the tool itself: a `dispose_check` that compares `renderer.info.memory` counts against unique in-scene geometries and textures (see `memory-and-disposal`); a `perf_monitor` reporting frame-time p50/p95/p99 with spike detection, not just an average fps; a `scene_diff` that snapshots and diffs the graph across two points in time; a labeled multi-view contact sheet that groups duplicate objects (`Mesh x240 'bolt'`) instead of listing each one, the same idea `tw scene` and `tw sheet` already implement.
- The verification-ladder discipline (`verification-ladder`) generalizes across every tool in this space: text first (console errors, `renderer.info` counts, a scene-graph dump), then a small screenshot only for a genuinely visual question, then a pixel diff rather than a human "looks fine" judgment for anything that repeats.

## Pitfalls

- Reaching for a general browser MCP (Playwright, Chrome DevTools) and trying to click into a canvas through its accessibility tree: the tree is empty for `<canvas>`, so interaction needs coordinate-based clicks or a page-side hook, not an accessibility-based selector.
- Choosing a three.js-specific MCP for its tool count without checking maintenance: `threejs-devtools-mcp` has not had a commit since 2026-03-23 (dormant), which matters for a tool an agent will depend on for correctness, not just convenience.
- Assuming IWSDK's MCP runtime works for a plain three.js page: it only operates inside apps built with IWSDK's own scaffolding, not an arbitrary three.js project.
- Reading every screenshot a tool offers inline instead of treating it as an artifact on disk: this is exactly the pattern that inflates a debugging session from tens of thousands to over a hundred thousand tokens, per the Playwright team's own comparison.
- Building a custom in-page devtools hook that duplicates `__THREE_DEVTOOLS__`: three.js already dispatches `register`/`observe` events through that global when it exists (confirmed in `Scene.js`, `WebGLRenderer.js`, `WebGPURenderer.js`, `AnimationMixer.js`, `Loader.js` in the r186 source), so a new tool should read that hook rather than reinvent scene observation.

## Verify

- `tw --help` (1,855 bytes, about 460 tokens) is read only when needed, not loaded up front, matching the "defer the schema" principle the general MCP clients use.
- `tw check <page>` is the default first call for "does this page work", printing renderer, console errors, failed requests and scene numbers in well under 1,000 tokens.
- Compare any new tool's reported cost against the numbers in this entry (per-call schema size, default screenshot size and cost) before adopting it into a verification loop, since the cost difference between tools in this space is large and easy to overlook.

## Notes

- 2026-09-26: written from the mcp-and-ai-tools research (sections 1, 4, 5), which measured MCP schema sizes, screenshot costs and tw's own output sizes directly on 2026-09-26.

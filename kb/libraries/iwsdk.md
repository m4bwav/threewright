---
title: Immersive Web SDK (IWSDK)
kind: library
slug: iwsdk
summary: Meta's three.js-plus-ECS framework for Quest-first WebXR, with the most complete agent tooling (an MCP runtime) of any three.js-based stack; still pins an old three fork.
tags: [iwsdk, webxr, meta, quest, ecs, havok, mcp, agent tooling]
applies_to: ">=r159"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [https://github.com/facebook/immersive-web-sdk, https://developers.meta.com/horizon/documentation/iwsdk/guides/overview/, ai-docs/research/2026-09-26-ecosystem-libraries.md, ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-games.md]
related: [xr-experiences, react-three-a11y]
package: "@iwsdk/core"
version_checked: "1.0.0-rc.2"
---

# Immersive Web SDK (IWSDK)

## Use it for

- Quest-first WebXR games and apps: ECS (elics), XR input with hands, locomotion, grabbing, spatial audio, Havok physics in a worker, scene understanding, spatial UI (uikit-based), and the IWER emulator to run XR in a desktop browser.
- Agent-driven development specifically: IWSDK ships an MCP runtime (`dist/mcp`) with tools for scene, ECS and UI debugging, screenshots, console capture, and a headless deterministic "agent" mode (`npx @iwsdk/cli@1.0.1 dev up --ai-mode agent`).

## Avoid it when

- The app needs a specific, current three.js version: `@iwsdk/core` requires aliasing `three` to `super-three@0.181.0` (a Supermedium fork) via an npm `overrides` entry, five releases behind r186. Features that landed in three r182 and later (current SunLight, native splats, RenderPipeline) are not available through IWSDK.
- The target is not Quest or XR: plain three.js, or @react-three/xr for a lighter XR layer in an existing R3F app, fit better.
- The project's Vite version is newer than IWSDK supports: `@iwsdk/vite-plugin-dev` 1.0.0-rc.2 declares `vite ^7.0.0`, outside Vite 8.3.1's range.

## Setup

Versions checked 2026-09-26: dist-tag `latest` is 1.0.0-rc.2 (2026-09-24); dist-tag `next` is 1.0.0 (also 2026-09-24). `npm i @iwsdk/core` resolves to the release candidate, not the 1.0.0 tagged `next`.

The commands below are pinned to an exact version so a launcher never fetches an unreviewed release: `@iwsdk/cli` and `@iwsdk/create` 1.0.1 (checked 2026-10-03 with `npm view`; `npx @iwsdk/cli@1.0.1 --help` runs). Raise the pin after checking the new release.

```sh
npm create @iwsdk@1.0.1 my-xr-app
```

Agent mode (headless, deterministic Playwright browser, default 800x800 viewport):

```sh
npx @iwsdk/cli@1.0.1 dev up --ai-mode agent
npx @iwsdk/cli@1.0.1 adapter sync   # writes MCP configs for Claude Code, Cursor, Copilot, Codex, OpenCode
```

## Pitfalls

- The `three` alias to `super-three@0.181.0` means any other package in the project that expects a current `three` (r186 APIs, current TSL nodes) can break; check `npm ls three` in an IWSDK project before adding three.js libraries written against r186.
- `npm i @iwsdk/core` alone does not give you the newest `1.0.0` build; check `next` versus `latest` explicitly with `npm view @iwsdk/core dist-tags` before reporting a version to a user.
- The MCP runtime's tools operate on IWSDK's ECS and ESM runtime concepts (entities, components, systems), not on raw three.js scene-graph terms; a general three.js debugging approach does not map one to one onto its tool names.
- IWSDK's physics runs Havok in a worker by default; console errors from the physics worker show up separately from the main-thread console, so check both when debugging.

## Notes

- 2026-09-26: written from the 2026-09-26 research (ecosystem-libraries, scenarios-xr-and-testing, games).

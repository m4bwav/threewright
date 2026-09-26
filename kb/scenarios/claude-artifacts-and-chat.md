---
title: Three.js in Claude artifacts and chat
slug: claude-artifacts-and-chat
kind: scenario
summary: Claude artifacts load three.js from jsDelivr through an import map; pin the exact version, build offline-safe lighting, and budget the page for a sandboxed, no-CDN-write environment.
tags: [claude, artifact, mcp apps, chat, embed, jsdelivr, import map, offline]
applies_to: ">=r161"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-mcp-and-ai-tools.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, https://platform.claude.com/docs/en/build-with-claude/vision]
related: [3d-chart-in-docs, import-maps-and-builds, renderer-choice, agent-tooling, headless-and-ci]
template: html-importmap
---

# Three.js in Claude artifacts and chat

## When

- A three.js page (a chart, a small demo, a product mockup, a generative-art piece) will be published as a Claude artifact or shown inline in a chat surface.
- The page must work with no build step and no server of its own: a single HTML file with an import map is the deliverable.
- Not for anything that needs a persistent backend, user accounts, or a bundler-only dependency; artifacts are static HTML served from claude.ai's own hosting.

## Stack

- One HTML file, no build: `three@0.186.1` pinned by an exact-version import map served from jsDelivr, exactly as `templates/html-importmap` does. Never point at `latest` or a floating range in a published artifact; a version bump elsewhere could change the page's behavior after publishing.
- `WebGLRenderer` is the default: smaller bundle, works with no `navigator.gpu` assumption, and renders correctly even where the viewer's browser lacks WebGPU.
- MCP Apps is the emerging chat-embedded pattern outside artifacts specifically: `@modelcontextprotocol/server-threejs`'s `show_threejs_scene` renders agent-written three.js code inline in a chat surface across several hosts (ChatGPT, Claude, VS Code, Goose), though it currently pins `three ^0.181.0`, several minors behind r186.

## Build

- Start from `tw new html-importmap <dir>` — the exemplar for exactly this deliverable, verified with `tw check`, `tw sheet` and `tw video`.
- Lighting must not depend on a runtime CDN fetch that could be blocked in a sandboxed preview: use `RoomEnvironment` through PMREM, or plain lights, rather than an HDR fetched from a third-party host at page load. This mirrors the same offline-safety rule the `react-three-fiber` entry gives for drei's `Environment preset`.
- Keep the page's own asset footprint small: any GLB, texture or HDR referenced from the artifact needs to be fetchable from wherever the artifact is actually served; do not assume arbitrary cross-origin fetches will succeed in every viewing context.
- If the artifact is meant to be screenshotted or described back to the model (a chart whose data matters), pair the canvas with a real HTML data table or a text summary in the same page, the same accessibility rule the `3d-chart-in-docs` scenario gives — this also means a reader who cannot see the canvas still gets the information.

## Pitfalls

- Two copies of three.js (a CDN copy and a differently pinned one, or a mismatched version elsewhere in the page) break `instanceof` checks and log "Multiple instances of Three.js being imported"; a single pinned import map avoids this entirely for a one-file artifact.
- Relying on a CDN-fetched HDR or a third-party API at load time is the single most common way an artifact that worked once stops working somewhere else; prefer self-contained lighting and geometry over runtime fetches whenever the artifact does not specifically need live data.
- A screenshot of the artifact that the model itself must interpret costs real tokens (see the verification ladder's image-cost table); keep any in-conversation review to a small image and prefer text-first checks (`tw check`, `tw scene`) while developing the page.
- `@modelcontextprotocol/server-threejs`'s three pin (`^0.181.0`) means code written against r186-only APIs (native Gaussian splats, `RenderPipeline`, current TSL nodes) will not run there even though it runs fine in a claude.ai artifact pinned to 0.186.1; check which surface a piece of code is actually targeting before assuming version parity.

## Verify

- `tw check <page>` is `result: OK` before publishing: no console errors, no failed requests (including to any CDN-hosted asset), sane bounds and camera.
- `tw shot <page> --size 640x360` or `tw sheet <page>` for a framing check; keep the image small since it is the same token-costed screenshot the verification ladder describes.
- For a chart or data-bearing artifact, confirm the accompanying HTML table or text summary is present in the page source, not only implied by the visualization.

## Notes

- 2026-09-26: written from the 2026-09-26 research (mcp-and-ai-tools, 3d-dataviz-and-docs) and the vision docs' token-cost formula. `@modelcontextprotocol/server-threejs`'s three pin and the exact set of hosts supporting MCP Apps are recent and likely to change.

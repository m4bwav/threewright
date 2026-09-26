---
name: threewright-web
description: "Build three.js experiences for websites: product viewers and configurators with material variants and AR, scroll-driven heroes and storytelling (GSAP ScrollTrigger and Lenis), landing and portfolio pages, globes and maps on a site, with a poster-first load, mobile budgets, reduced motion and keyboard access, verified headless. Use whenever the user wants a 3D hero, a product or model viewer, a configurator, a 3D landing page, scroll animation with three.js, a globe on a website, or asks to make a site's 3D fast or accessible; also 'refresh threewright-web'. Charts and figures in documents go to threewright-docs, games to threewright-games, React apps to threewright-r3f."
---

# threewright-web

Outcome: the web page's 3D piece works on phones and desktops within budget, loads with a poster first, respects reduced motion and keyboard users, and passes `tw check` in normal and reduced-motion modes.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show <slug> --section <name>`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: pick the scenario and starter

| request | scenario entry | starter |
|---|---|---|
| show a product or model, variants, AR | `product-viewer` | `TW new product-viewer <dir>`; `<model-viewer>` when no custom UI is needed |
| scroll-driven hero or story | `scroll-storytelling` | `TW new scroll-hero <dir>` |
| globe, arcs, map layers, 3D tiles | `geospatial-and-globes` | `TW new globe <dir>`, or globe.gl, 3d-tiles-renderer |
| any other decorative or interactive piece | `renderer-choice`, `performance` | `TW new html-importmap <dir>` |

Read the scenario's `Stack`, `Build` and `Pitfalls` sections before writing. WebGLRenderer is the default for all of these (widest reach, simplest capture).

## Step 2: rules for the web

1. One canvas per page, fixed behind the content when it spans sections; one animation loop (GSAP's ticker drives Lenis when both are present).
2. Load a poster image first so the largest contentful paint is an image; start WebGL after first paint or on interaction; hide the poster when `window.__tw.ready` resolves.
3. Budgets for phones: DPR at most 2, about 100 draw calls, under 100k triangles in view, a hero model under about 5 MB with meshopt or Draco and KTX2; pause rendering when off screen or idle.
4. `prefers-reduced-motion`: no scroll scrubbing, no camera flights, no auto-rotation; show the final state. Keep keyboard scrolling and focus working; never hijack the scroll wheel.
5. No runtime downloads from hosts you do not control; assets live with the site. `TW vendor <dir>` copies the pinned CDN modules the page imports, and the decoder files they fetch (Draco, KTX2), into `vendor/` and rewrites the import map (`TW new scroll-hero` and `TW new product-viewer` do this already). Make posters with `TW shot <page> --out poster.jpg` with the HTML text hidden.

## Step 3: verify

1. `TW check <page>` and `TW check <page> --reduced-motion`: both `result: OK`.
2. Scroll pages: accept `?progress=0.6` (or similar) to jump the timeline, and `TW check "<page>?progress=0.6"` too.
3. `TW shot <page> --size 390x844` (phone) and `--size 1280x720` once each for layout.
4. Model weight: `TW glb <model>` has no warnings, or each is accepted with a reason.

## Step 4: report

Two to five lines: what was built, the starter, the checks that passed (normal, reduced motion, phone size), model weight and draw calls.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered, write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: three.js on websites: product viewers, scroll storytelling, web performance and accessibility for WebGL, the libraries used for them; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

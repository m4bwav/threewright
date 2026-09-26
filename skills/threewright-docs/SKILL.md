---
name: threewright-docs
description: "Put 3D where people read: 3D charts (scatter, surface, globe, network, terrain, point cloud) and 3D figures or model embeds for READMEs, reports, wikis, Office files, notebooks and Claude artifacts, with the right fallback when the destination cannot run three.js (a GLB, a turntable GIF or MP4, or a PNG plus a data table). Use whenever the user asks for a 3D chart or plot, 'visualize this in 3D', a 3D figure for a document, README or slide, a model in a report, or asks whether a chart should be 3D; also 'refresh threewright-docs'. Refuses decorative 3D and hands 2D charts to chartwright. Not for standalone 3D websites (threewright-web) or videos (threewright-video)."
---

# threewright-docs

Outcome: the document gains a justified 3D figure in the form its destination can show (interactive page, GLB, GIF or MP4, PNG with alt text and a table), verified headless, with its source kept beside it.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show <slug> --section <name>`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: is 3D justified?

`TW kb show when-3d-is-justified --section Rule`. Data with three real axes or real geometry: continue. 3D bars, pies, lines or areas over 2D data, or dimension-reduced data with no reason for 3D: say so in one line, build the 2D chart instead (chartwright when installed), and stop here unless the user insists (then build it with a one-line note).

## Step 2: destination decides the deliverable

`TW kb show 3d-chart-in-docs --section Build` has the platform table. In short: GitHub and most wikis show no scripts (GIF under 5 MB plus a link); Office inserts GLB (never FBX); Jupyter uses Plotly or an anywidget plus a saved PNG; Claude artifacts and HTML sites run the full page pinned to `three@0.186.1`; Google Docs gets a PNG. Plan the fallback chain before building.

## Step 3: build

1. Data by file reference: write the numbers to a CSV or JSON beside the output; never paste thousands of rows into context.
2. A stock chart type that a library already draws (Plotly 3D traces, globe.gl, 3d-force-graph, deck.gl): use it. Otherwise start from `TW new chart-3d-scatter|surface|globe <dir>` and replace the data.
3. Keep what the templates carry: axes with units, legend, tooltip, keyboard orbit, pause control, `prefers-reduced-motion`, `role="img"` with `aria-label` and a described finding, and the HTML data table after the canvas. Title the figure with the finding, not "3D chart".

## Step 4: verify and produce the fallbacks

1. `TW check <page>`: `result: OK`, and the `pixels:` line shows content inside the frame.
2. `TW shot <page> --size 960x540` once: labels and legend legible (CSS2D labels show in shots, not in `TW sheet`).
3. `TW check <page> --reduced-motion` passes. If the page has a light palette, look at one `TW shot <page> --color-scheme light` too (headless Chrome reports dark by default).
4. Fallbacks as the destination needs: `TW video <page> --out fig.gif --seconds 4 --fps 15 --size 640x360` (check the file size), a still with `TW shot`, a GLB through `GLTFExporter` then `TW glb fig.glb`.

## Step 5: place and report

Place the figure (README: GIF, a link to the live page, alt text stating the finding; Office: the GLB; notebook: the widget and a PNG). Save the page or script beside it. Report in one to three lines: the chart type and why 3D was justified, the deliverables written, the `tw check` result.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered (a platform that renders or strips something), write it to `LEARNINGS.md` now (check existing entries first: add, update, retire, or nothing). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`. Platform facts also go into `3d-chart-in-docs` (`TW kb note 3d-chart-in-docs "<text>"`).

## Maintenance

This skill is evergreen (topic: 3D data visualization evidence and which document platforms render 3D, GLB or scripts; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

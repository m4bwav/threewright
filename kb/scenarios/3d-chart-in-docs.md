---
title: 3D charts and 3D figures in documents
slug: 3d-chart-in-docs
kind: scenario
summary: When a chart earns a third dimension, how to build it in three.js or a charting library, and what each document platform can show (GitHub, Office, Notion, Jupyter, Claude artifacts).
tags: [3d chart, scatter, surface, globe, data visualization, documentation, readme, github, office, notebook, artifact]
applies_to: ">=r161"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, https://clauswilke.com/dataviz/no-3d.html, https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files, https://support.microsoft.com/en-us/office/graphics-visuals/get-creative-with-3d-models, https://plotly.com/javascript/3d-charts/]
related: [when-3d-is-justified, capture-stills-and-video, verification-ladder, import-maps-and-builds]
---

# 3D charts and 3D figures in documents

## When

- The data has three real spatial or continuous axes (x, y, z measurements, a surface z = f(x, y), terrain, a point cloud, molecules, a globe, a dense network) and the reader needs its shape, clusters or spatial relations, not exact values (Munzner 2014, "no unjustified 3D"; Ware and Franck 1996).
- The reader can rotate it, or sees it rotating. Rotation is the depth cue that reveals structure a single still hides (Structure Perception in 3D Point Clouds, 2021).
- Not for 3D bars, pies, lines or areas over 2D data: they cost reading time (3D bars) or accuracy (3D pies) and add nothing (Siegrist 1996; Zacks et al. 1998). Hand those to a 2D charting tool (chartwright) and say why. For dimension-reduced data (PCA, t-SNE, UMAP) default to 2D and offer 3D as an extra (Sedlmair, Munzner and Tory 2013).

## Stack

| need | first choice | when to hand-roll in three.js |
|---|---|---|
| 3D scatter, surface, mesh, isosurface, volume, cones, streamtubes | Plotly (`scatter3d`, `surface`, `isosurface`, `volume`...) or echarts-gl | custom marks, labels or interaction, more than about 100k points, a page that must match a design |
| globe with points and arcs | globe.gl or three-globe | a globe that is part of a larger three.js scene |
| network too dense for 2D | 3d-force-graph | custom layouts or styling |
| maps and millions of points | deck.gl | three.js-specific effects |
| hand-rolled | three r186 with WebGLRenderer, OrbitControls, CSS2DRenderer labels, a Raycaster tooltip | templates `chart-3d-scatter`, `surface`, `globe` |

- WebGLRenderer is the default here: widest browser reach, simplest headless capture, and CSS2DRenderer labels work with either renderer (direction research, section 5).
- Labels: CSS2DRenderer for tens of labels (DOM text, selectable, read by screen readers); troika-three-text for hundreds (WebGL only).

## Build

- Start from `tw new chart-3d-scatter <dir>`, `tw new surface <dir>` or `tw new globe <dir>` (all three verified 2026-09-26). Each has a legend, a tooltip, keyboard orbit, a pause control for auto-rotation that stays off under reduced motion, and a data table. The scatter and the surface have axes with ticks; the surface adds a viridis colour bar, contour lines and render on demand; the globe has a graticule, great-circle arcs and city labels that hide on the far side.
- Encode data colour unlit (`MeshBasicMaterial`, `PointsMaterial`) or, on a shaded surface, with a map that varies mostly in hue or saturation (a cool-warm diverging map), because shading changes luminance and competes with a luminance ramp such as viridis (TVCG 2024, colormaps for shaded surfaces; Moreland).
- Pair the 3D view with an exact-value path: the DOM table below the canvas, a 2D cross-section or small multiples. Never ask a reader to read values off depth.
- Accessibility: the canvas container has `role="img"`, an `aria-label` and `aria-describedby` pointing at a sentence that states the finding; the table sits in the DOM after the canvas, not inside it; the canvas is focusable with a visible focus ring and arrow keys rotate (OrbitControls arrows only pan); `prefers-reduced-motion` turns auto-rotation off; auto-rotation has a pause button (WCAG 2.2.2).

What each place can show (the fallback chain is interactive HTML, then `<model-viewer>` with a GLB, then a turntable GIF or MP4, then a PNG with alt text and a table):

| destination | interactive 3D | practical choice |
|---|---|---|
| GitHub markdown | STL files and ASCII STL code blocks only; scripts and iframes are stripped | turntable GIF under 5 MB (hard limit 10 MB), link to a hosted page |
| GitLab | STL files in the file viewer | GIF or MP4, link to GitLab Pages |
| Obsidian | community plugins (Model Viewer, 3D Codeblocks, Embed 3D) | GIF or PNG for vaults shared without plugins |
| Notion | an embed block with a hosted URL | hosted three.js page, GIF otherwise |
| Confluence Cloud | Marketplace 3D viewer apps | macro if installed, else MP4 or GIF |
| Google Docs and Slides | none | PNG or GIF, link out |
| PowerPoint, Word, Excel (Windows, Mac) | Insert 3D Model: GLB (recommended), OBJ, 3MF, PLY, STL; FBX disabled since 2024-01-09 | export GLB with `GLTFExporter` |
| Jupyter | Plotly 3D, or an anywidget with three.js; pythreejs is unmaintained | Plotly or anywidget, plus a saved PNG for GitHub's static view |
| Quarto, MkDocs, Docusaurus, Astro | HTML output runs scripts or components | a lazy canvas with a poster image; PNG for PDF and DOCX |
| VS Code markdown preview | scripts disabled | images and GIFs |
| Claude artifacts | published artifacts load current three.js from jsDelivr | the full page, pinned to `three@0.186.1` |

## Pitfalls

- A single still of a 3D scatter can hide the structure that motivated 3D. Ship rotation or a turntable, and state the finding in words.
- Auto-rotation without a pause control fails WCAG 2.2.2 and fights readers who try to inspect a point.
- Lit data colours shift with the light direction; a legend swatch will not match the marks.
- Perspective makes near points look bigger; do not encode a value in point size as well without saying so.
- A table stuffed inside `<canvas>` as fallback content is read as one flat string; put a real table after the canvas.
- GitHub strips everything interactive. Budget GIFs (640 to 800 px wide, 12 to 15 fps, 3 to 6 s, under 5 MB) and give alt text that states the finding.

## Verify

- `tw check <page>` is `result: OK`, and its `pixels:` line shows content coverage well above zero with a bounding box inside the frame.
- `tw shot <page> --size 960x540` for one look at labels and legend (CSS2D labels show in page screenshots, not in `tw sheet`).
- `tw check <page> --reduced-motion` passes and the camera does not move between two shots.
- For a document, produce the fallback too: `tw video <page> --out turn.gif --seconds 4 --fps 15 --size 640x360` and check the size.

## Notes

- 2026-09-26: written from the 2026-09-26 research (3d-dataviz-and-docs, direction). Platform support is as of that date; GitHub rendering, Office formats and Claude artifact limits are the claims most likely to change.
- 2026-09-26: the `surface` and `globe` templates were built and verified (tw check, --reduced-motion, lint, shot) on Windows 11, Chrome 153, RTX 5060 Ti.

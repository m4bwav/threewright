---
title: When a chart may be 3D
slug: when-3d-is-justified
kind: rule
summary: Build a 3D chart only for data with three real axes or real geometry, always rotatable, always paired with an exact-value view; hand decorative 3D back to 2D.
tags: [3d chart, data visualization, when to use 3d, bar, pie, scatter, perception]
applies_to: any
status: current
renderer: none
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [3d-chart-in-docs]
---

# When a chart may be 3D

## Rule

1. Refuse 3D bars, 3D pies, 3D lines and 3D areas over 2D data; build the 2D chart instead (chartwright when installed) and say why in one line.
2. Build 3D only when the data has three meaningful spatial or continuous axes or real geometry: surfaces z = f(x, y), terrain, point clouds, molecules, globes, volumes, vector fields, networks too dense for 2D.
3. Every 3D view is rotatable, or shown rotating in a turntable, with a pause control and a reduced-motion still.
4. Never ask the reader to read exact values off depth: add the table, a 2D cross-section or small multiples.
5. For dimension-reduced data (PCA, t-SNE, UMAP), default to a 2D scatter and offer 3D as an extra.
6. Prefer an existing library (Plotly, echarts-gl, globe.gl, 3d-force-graph, deck.gl) over hand-rolled three.js unless the page needs custom marks, scale or design.
7. Keep data colour unlit, or use a hue or saturation based map on shaded surfaces.

## Why

- Decorative depth moves the reader from position and length judgements to angle, area and volume judgements, which are less accurate (Cleveland and McGill 1984). 3D bars read slower and 3D pies read less accurately than their 2D forms (Siegrist 1996; Zacks et al. 1998; the MeasuringU review). Munzner (2014) states it as "no unjustified 3D"; Wilke calls gratuitous 3D "unequivocally bad".
- Real 3D structure is read better with motion and stereo: about three times larger graphs with head-coupled stereo (Ware and Franck 1996), clusters found under rotation that scatterplot matrices hide (Structure Perception in 3D Point Clouds, 2021), better cluster identification in immersive 3D (Kraus et al. 2020).
- 2D is often good enough for dimension-reduced data (Sedlmair, Munzner and Tory 2013), and depth is a poor channel for exact values on a desktop (Whitlock, Smart and Szafir 2020).
- Shading changes luminance, so a luminance colormap on a lit surface confounds shape and value (TVCG 2024, colormaps for shaded surfaces).

## Notes

- 2026-09-26: written from the 2026-09-26 3d-dataviz-and-docs research, rules 1 to 7 and 17 of its list.

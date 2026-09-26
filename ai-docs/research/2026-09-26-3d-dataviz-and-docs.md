# 3D data visualization and 3D in documents

Date: 2026-09-26
Track: threewright research, 3D data visualization and putting 3D into documents.
Related: chartwright (2D charts, says "no 3D" for ordinary charts).

## Summary

3D earns its place when the data has three real spatial or continuous dimensions and the reader can move the view. It does not earn its place as decoration on a bar or pie chart. The research is consistent on the decorative case: 3D bars cost time and a little accuracy, and 3D pies cost real accuracy. The research is also consistent that motion (rotation, head coupling) and stereo make true 3D structure readable, in point clouds and in network graphs. A 2D projection is often good enough for dimension-reduced data, so 3D scatter needs a reason.

For documents, almost no document platform runs arbitrary three.js. The dependable chain is: interactive HTML page (hosted or in a platform that runs scripts), then `<model-viewer>` with a GLB where the platform allows a web component or a model file, then a turntable GIF or MP4, then a static PNG with alt text and a data table. GitHub renders STL only (file view and ASCII STL code blocks). Office renders GLB natively on Windows and Mac. Google Docs and Slides render no 3D. Notion and Confluence need an embed URL or a marketplace app.

Headless capture needs a real GPU or an explicit software flag. Chrome removed the automatic SwiftShader fallback, so headless runs without a GPU must pass `--enable-unsafe-swiftshader` (and usually `--use-angle=swiftshader`).

## 1. Evidence on 3D charts

### Decorative 3D (depth added to 2D data)

- Cleveland and McGill (1984) ranked elementary perceptual tasks. Position on a common scale is most accurate, then position on non-aligned scales, then length, direction and angle, then area, then volume and curvature, then shading and color saturation. Faking depth pushes a reader from position and length judgments toward volume and angle judgments, which are lower on the list.
- Siegrist (1996) found 3D bar charts about as accurate as 2D but slower to read. 3D pies were significantly less accurate, likely because front slices hide others and the perspective angle distorts slice size.
- Zacks, Levy, Tversky and Schiano (1998, Journal of Experimental Psychology: Applied 4:119-138) found that perspective depth cues lowered accuracy of bar height estimates. The penalty shrank when a short delay came before the judgment. The effect of neighbouring bars' heights was about ten times larger than the 3D effect.
- The MeasuringU literature review (Sauro) groups Casali and Gaylin (1988, 3D bars nearly twice as slow for point reading), Spence (1990, tiny accuracy differences), Carswell et al. (1991, 3D lines about 7 percent more errors), Zacks et al. (1998), and preference studies (Levy et al. 1996, Tractinsky and Meyer 1999). Its conclusion: 2D graphs are at least as good as or slightly better than 3D graphs, and the differences are often small.
- Kosara (eagereyes, 2016) argues that 3D bars are "not that harmful" compared with truncated axes and bad sorting. That is a fair caution against overstating the case, but it does not argue that 3D adds anything for 2D data.
- Tufte classes 3D effects on bar and line charts as chartjunk (non-data ink). Wilke (Fundamentals of Data Visualization, chapter "Avoid 3D") calls gratuitous 3D "unequivocally bad" and warns that 3D position scales need two non-invertible projections, so a point on screen maps to a line of possible data points.
- Munzner (Visualization Analysis and Design, 2014) states the rule "No unjustified 3D", with sections on occlusion, perspective distortion, the disparity of depth and text legibility under tilt. It is not "never 3D": 3D is justified when the task needs the shape of inherently 3D data.
- Practitioner tools reflect this. Datawrapper offers no 3D chart types, and the FT Visual Vocabulary lists no 3D forms among its roughly 70 chart types (both are catalog observations, unverified as explicit policy statements). The request mentioned "Fisher" as a source; I could not identify which Fisher study was meant (unverified).

### Genuine 3D structure (the data really has three dimensions)

- Ware and Franck (1996, ACM TOG 15(2)) found head-coupled stereo let people read abstract graphs about three times larger than 2D. Stereo alone gave 1.6 times, head-coupled motion alone 2.2 times. Motion cues mattered more than stereo, and the kind of motion mattered little. With motion plus stereo, skilled viewers traced paths in graphs of up to 1000 nodes under 10 percent error.
- McGuffin, Servera and Forest (2022, "Path Tracing in 2D, 3D, and Physicalized Networks", arXiv 2207.11586) found lower error rates for path tracing in 3D than 2D networks, even with edge routing in 2D. VR and physical models performed about the same.
- Zhang, Groene, Klein, Liotta and Schreiber (2025, "Investigating Crossing Perception in 3D Graph Visualisation", arXiv 2508.00950) show that in stereoscopic 3D, depth relationships and edge orientation change which apparent crossings hurt readability. 3D graphs need layouts judged in 3D, not by 2D crossing counts.
- Structure Perception in 3D Point Clouds (NREL, ACM SAP 2021) built point clouds whose 2D projections look Gaussian but hide 3D structure. 128 participants found the hidden structures under rotation, and missed them in scatterplot matrices and under translation. Rotation is the depth cue that matters.
- Kraus et al. (2020, TVCG 26(1), "The Impact of Immersion on Cluster Identification Tasks") found people identified clusters more accurately in VR 3D scatterplots than in 2D scatterplot matrices on a desktop.
- Whitlock, Smart and Szafir (2020, IEEE VR, "Graphical Perception for Immersive Analytics") found that channel accuracy differs by display. Depth is hard to read on desktops, while stereo viewing may make depth a usable channel.
- Counterweight: Sedlmair, Munzner and Tory (2013, TVCG 19(12)) coded 816 scatterplots of dimension-reduced data and found 2D scatterplots "good enough". Neither scatterplot matrices nor interactive 3D added notable cluster separability.
- Colour on lit surfaces: Colormaps for Shaded Surfaces: Stepped vs Smooth (TVCG 2024, doi 10.1109/TVCG.2024.3383336) studies colormaps draped on shaded height fields. Colormaps with large luminance ramps (viridis) compete with shading for shape perception, and Moreland's divergent map, which varies mostly in saturation, was designed for shaded surfaces (Moreland colour advice).

### Rule of thumb from the evidence

3D is justified when three conditions hold: the data has three meaningful spatial or continuous axes (or real geometry), the task needs shape, spatial relation or structure rather than exact value lookup, and the reader can rotate the view (or sees a rotating turntable). Exact comparisons still belong in 2D views: cross-sections, contour maps, small multiples, linked 2D panels, and a data table.

## 2. Chart types that are genuinely 3D

For each: what to encode, interaction, labels, accessibility, and libraries to try before hand-rolling three.js. All three.js builds should use OrbitControls with `enableDamping`, a `Raycaster` for hover and click, and an HTML data table next to the canvas.

Labels in three.js. `CSS2DRenderer` puts DOM labels over the scene. It is simple, crisp, selectable and readable by screen readers, but slows down with many labels. `troika-three-text` renders SDF text in the scene, lays it out in a worker, and scales to many labels, but its text is not in the DOM. Use CSS2D for tens of labels (axis titles, tick labels, the tooltip) and troika for hundreds.

| Type | Encode | Interaction | Libraries before hand-rolling |
|---|---|---|---|
| 3D scatter | x, y, z position, plus colour and size for one or two more fields | orbit required, raycast tooltip, axis box with ticks, click to select, optional slow auto-rotate | Plotly `scatter3d`, echarts-gl `scatter3D`, deck.gl `PointCloudLayer` for millions of points; three.js `Points` with a `BufferGeometry` otherwise |
| Surface z = f(x, y) | height is the value, colour repeats or adds a variable | orbit, hover readout of (x, y, z), toggle contour lines, wireframe option | Plotly `surface`, echarts-gl `surface`; three.js `PlaneGeometry` with displaced vertices and vertex colours |
| Terrain or heightmap | elevation from a DEM, colour for land cover or a draped variable | orbit with limited polar angle, vertical exaggeration control stated in the legend | deck.gl `TerrainLayer`, CesiumJS for globe-scale terrain; three.js displaced plane with a height texture |
| 3D bar map (hex bins) | count or rate as column height and colour, location on the map | tilt and rotate, hover for bin value, always offer a flat 2D choropleth toggle | deck.gl `HexagonLayer` (extruded, d3-hexbin aggregation) or `H3HexagonLayer`; echarts-gl `bar3D` on a geo |
| Globe with arcs and points | lat and lon position, arc for flow, point size or height for magnitude | drag rotate, zoom, hover tooltip, pause auto-rotate on interaction | globe.gl or three-globe (vasturiano), echarts-gl `globe`; CesiumJS when real geodesy matters |
| 3D network graph | nodes and edges, colour for group, size for degree | orbit and zoom required, click to focus a node and its neighbours, search box | 3d-force-graph (vasturiano, three.js), also its VR and AR variants |
| Volume rendering | scalar field on a 3D grid, transfer function maps value to colour and opacity | orbit, transfer-function sliders, clipping planes | vtk.js, Plotly `volume`; three.js `Data3DTexture` plus a ray-marching shader (see the official `webgl2_materials_texture3d` example) |
| Point cloud | real-world XYZ from LiDAR or photogrammetry, colour for intensity or class | orbit, eye-dome lighting helps depth, level of detail for large clouds | Potree for huge clouds, deck.gl `PointCloudLayer`; three.js `Points` with `PCDLoader` or `PLYLoader` |
| Isosurface | the surface where a field equals a threshold | threshold slider, orbit, clip plane | Plotly `isosurface`, vtk.js; three.js `MarchingCubes` addon |
| Vector field and streamlines | direction and magnitude of a flow | orbit, seed-point control, animate particles along lines only on request | Plotly `cone` and `streamtube`, vtk.js; three.js `InstancedMesh` of arrows or `Line2` streamlines |
| 3D histogram (2D joint distribution) | counts on an x by y grid shown as column heights | orbit, hover for bin count | echarts-gl `bar3D`, Plotly `mesh3d`; but prefer a 2D heatmap first, since this is a bar chart in 3D and inherits the bar-reading penalties |
| Molecules | atoms and bonds in real coordinates | orbit, select residues, style switch (cartoon, ball and stick) | 3Dmol.js, Mol* (molstar), NGL (unverified which is most active in 2026) |

Accessibility for every type: give the canvas `role="img"` and an `aria-label`, point `aria-describedby` at a written summary of the main finding, and put a real HTML table (or a CSV download) below the canvas. A table placed inside the `<canvas>` as fallback content is read as one flat string, so it does not work as a navigable table.

Plotly.js supports seven 3D trace types: `scatter3d`, `surface`, `mesh3d`, `cone`, `streamtube`, `isosurface` and `volume`. echarts-gl 2.1.0 (May 2026) fixed compatibility with ECharts 6, so it is maintained but slow moving. three.js is at r185 (1 July 2026) with r186 adding a Gaussian splat renderer; WebGPURenderer falls back to WebGL 2 when WebGPU is missing.

## 3. Putting 3D into documents and platforms (2026)

Fallback chain: interactive HTML (three.js page, hosted or in an iframe) -> `<model-viewer>` with a GLB (and `ios-src` USDZ for iOS Quick Look) -> turntable GIF or MP4 -> static PNG with alt text plus a data table. `<model-viewer>` loads glTF and GLB only. Its `poster` and `reveal` attributes let a document show a still until the reader clicks, which keeps page weight low.

| Platform | Interactive 3D natively | Best practical option |
|---|---|---|
| GitHub markdown | STL only. `.stl` files open in a 3D viewer (up to 10 MB). ASCII STL renders in a ```` ```stl ```` fenced block; binary STL does not. GeoJSON, TopoJSON and Mermaid also render. Scripts, iframes, inline styles, classes and ids are stripped | Turntable GIF (autoplays) or an uploaded MP4 (click to play); ASCII STL block for simple geometry; link to a hosted page (GitHub Pages) for full interactivity |
| GitLab | `.stl` files render in the file viewer (three.js based, since 2017). No STL in markdown found | GIF or MP4 in markdown, link to GitLab Pages |
| Obsidian | Not built in. Community plugins: Model Viewer (glTF, GLB via `<model-viewer>`), 3D Codeblocks (GLB, glTF, STL), Embed 3D (STL, GLB, OBJ with MTL, FBX, 3MF), 3D Model Viewer (STL, OBJ, 3MF). Obsidian also renders raw `<iframe>` HTML | GIF or PNG for vaults shared without plugins; plugin embed for your own vault |
| Notion | Embed block takes a URL (resolved through Iframely, about 1900 domains). Pasting an `<iframe>` tag does nothing. Hosted viewers such as Sketchfab, Vectary or Speckle work | Embed a hosted three.js page URL; GIF otherwise |
| Confluence Cloud | Not built in. Marketplace apps: 3D Viewer Macro, 3D Viewer+, Online 3D Viewer (open source), CAD 2D and 3D Model Viewer, Design3D-Macro; they read GLB, STL, OBJ and CAD formats from attachments | Marketplace macro if installed; otherwise attached MP4 or GIF |
| Google Docs and Slides | No 3D support | PNG or GIF; link to a hosted page |
| PowerPoint, Word, Excel (Windows, Mac) | Insert > 3D Models: GLB (recommended), OBJ, 3MF, PLY, STL; formats convert to glTF internally. FBX insertion disabled since 9 January 2024 for security. PowerPoint Morph can animate the model. PowerPoint for the web cannot insert 3D but plays models inserted on desktop | Export the scene to GLB (three.js `GLTFExporter`) and insert it; still image for other viewers |
| Jupyter | Plotly 3D works in JupyterLab and VS Code notebooks. pythreejs 2.4.1 is effectively unmaintained (last release about three years old). anywidget is the current way to ship custom three.js widgets across Jupyter, marimo, VS Code and Colab. GitHub's notebook view strips interactive JS output | Plotly or an anywidget for live work; save a PNG next to the figure for GitHub and nbviewer |
| Observable (notebooks, Framework) | Yes, three.js via `import` from npm or a CDN; older posts show friction with Framework's npm resolution | Direct three.js cell |
| Quarto | HTML output runs htmlwidgets (R `threejs`, `rgl`, plotly) and Jupyter widgets; OJS cells can import three.js. PDF and Word outputs need a static image | Interactive for HTML, `fig` PNG for PDF and DOCX |
| MkDocs (Material) | Raw HTML passes through; scripts load via `extra_javascript` (from general MkDocs knowledge, not fetched this session) | `<model-viewer>` tag or a small three.js script per page |
| Docusaurus (MDX), Astro | MDX can import React components, so react-three-fiber or plain three.js works; Astro can hydrate a component island (from general knowledge, not fetched this session) | Component with a lazy loaded canvas and a poster image |
| VS Code markdown preview | Scripts are disabled by default (Strict). Even with security set to Disabled, a reported issue (#243454) says scripts stopped running from 1.97 | Images and GIFs only; open the HTML in a browser |
| Claude artifacts | claude.ai chat artifacts have long been pinned to three.js r128 with no addon imports (third-party reports, unverified in 2026). Claude Code published Artifacts allow external scripts from cdnjs.cloudflare.com and cdn.jsdelivr.net/npm, so current three.js and addons can be loaded from jsDelivr (per this session's tool contract, 2026-09-26) | Full interactive three.js page |
| Slack | No iframe or JS rendering in messages; Block Kit video block embeds an iframe video player from an allowed provider; GIF uploads animate | GIF or MP4 upload, link to hosted page |

## 4. Producing stills and turntables headlessly

Stills:
- `canvas.toDataURL()` or `toBlob()` returns a blank image unless you either create the renderer with `preserveDrawingBuffer: true` or call `renderer.render()` in the same task right before capture (three.js manual, "Tips"). The second way keeps performance, so use it by default.
- For print quality, set `renderer.setPixelRatio(2)` or render into a `WebGLRenderTarget` at the target size and read pixels. Turn off auto-rotate and damping and wait a frame before capture so the view is settled.
- With WebGPURenderer, render with `await renderer.renderAsync()` before capture (unverified; test per release).

Headless Chrome:
- Chrome deprecated and then removed the automatic fallback to SwiftShader for WebGL (warning since Chrome 130). Without a GPU, WebGL context creation now fails unless you pass `--enable-unsafe-swiftshader`. A common Puppeteer or Playwright flag set is `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`. With a GPU on Linux, `--use-angle=vulkan --enable-features=Vulkan` is reported to work (unverified).
- Software rendering is slow and memory hungry. Cap resolution and frame count, and check each frame for an all-black or all-clear image before encoding.

Turntables:
- Drive time yourself. Step the camera angle by 360 / N degrees per frame, render, capture. Do not rely on `requestAnimationFrame` timing. CCapture.js does this with a virtual clock and can write PNG or WebM frames; a Puppeteer loop that sets the angle and calls `page.screenshot()` or reads `toDataURL()` works too.
- Encode MP4 with ffmpeg (H.264, `-pix_fmt yuv420p`, `-movflags +faststart`). Encode GIF with gifski, or ffmpeg with `palettegen` and `paletteuse`. A seamless loop needs the last frame to stop one step short of 360 degrees.

Sizes and budgets for READMEs and docs:
- GitHub limits images and GIFs to 10 MB, and videos to 10 MB on free plans and 100 MB on paid plans (MP4, MOV, WebM; H.264 recommended).
- README GIFs autoplay; videos show a click-to-play player. A third-party survey of 50 repos put the average README GIF at 3.2 MB at 640 px wide and 12 fps, with slow loads above about 8 MB (unverified methodology).
- Working budget: turntable GIF 640 to 800 px wide, 12 to 15 fps, 3 to 6 seconds, 36 to 72 frames, under 5 MB (under 2 MB preferred). MP4 same length at 1280 px under 3 MB. Static PNG hero 1200 to 1600 px wide under 500 KB (or WebP where supported). Always add alt text that states the finding, not just "3D chart".

## 5. Accessibility for 3D on the web

- Name and describe the canvas: `role="img"`, `aria-label` with a short name, `aria-describedby` pointing at a paragraph that states the insight. Place the data table in the DOM after the canvas, not inside it.
- Keyboard: three.js OrbitControls only listens to keys after `controls.listenToKeyEvents(window)` (or an element), and arrow keys pan by default (`keyPanSpeed` 7). `keyRotateSpeed` exists, but the docs describe arrows as pan, so add your own key handler (arrows rotate, plus and minus zoom, Home resets) and make the canvas focusable with `tabindex="0"` and a visible focus ring. `<model-viewer>` with `camera-controls` supports arrow-key rotation and an audible and visual interaction prompt.
- Motion: WCAG 2.2.2 Pause, Stop, Hide (level A) applies to auto-rotation that runs more than five seconds, so provide a pause control. WCAG 2.3.3 Animation from Interactions (AAA) covers motion triggered by interaction. Honour `prefers-reduced-motion: reduce` by turning off auto-rotate and damping, and swapping animated turntables for a still or a small set of fixed views.
- Colour: use colourblind-safe palettes (viridis family or Okabe-Ito for categories) and keep colour unlit when it encodes data, using `MeshBasicMaterial` or low-contrast lighting, because shading changes luminance and confounds luminance-based colormaps. When colour is draped on a shaded surface, prefer a map that varies mainly in hue or saturation (Moreland's cool-warm) or stepped bands. Add redundant encodings (size, shape, labels) for categories.
- Text alternatives: write the finding in words next to the figure, give exact values in the table, and give a 2D alternative view (heatmap, contour, small multiples) for readers who cannot use the 3D view.

## Rules for the skill

1. Refuse 3D bars, 3D pies, 3D lines and 3D areas for 2D data, and hand the request to chartwright's 2D equivalent. 3D pies lose accuracy and 3D bars lose time (Siegrist 1996; Zacks et al. 1998; MeasuringU review).
2. Build 3D only for inherently 3D data: surfaces z = f(x, y), terrain, point clouds, molecules and other real geometry, globes, volumes, vector fields, and networks too dense for 2D when interactive (Munzner 2014 "No unjustified 3D"; Wilke "Avoid 3D"; Ware and Franck 1996).
3. Every 3D view must be rotatable or shown rotating. A single still of a 3D scatter can hide structure that rotation reveals (Structure Perception in 3D Point Clouds 2021; Ware and Franck 1996).
4. For dimension-reduced data (PCA, t-SNE, UMAP), default to a 2D scatter and offer 3D only as an extra (Sedlmair, Munzner and Tory 2013).
5. Never ask readers to read exact values off depth. Pair the 3D view with a 2D view or table for exact comparisons (Cleveland and McGill 1984; Whitlock, Smart and Szafir 2020).
6. Prefer an existing library before hand-rolling: Plotly or echarts-gl for 3D charts, globe.gl for globes, 3d-force-graph for networks, deck.gl for maps and large point clouds (Plotly 3D docs; echarts-gl; vasturiano repos; deck.gl docs).
7. For 3D networks, judge layout in 3D and give orbit, focus and search, since projected crossings behave differently (Zhang et al. 2025; McGuffin et al. 2022).
8. Label with CSS2DRenderer for tens of labels and troika-three-text for hundreds (three.js CSS2DRenderer docs; troika docs).
9. Ship the fallback chain: interactive HTML, then `<model-viewer>` GLB, then turntable GIF or MP4, then PNG with alt text and a table (model-viewer docs; GitHub attaching files docs).
10. For GitHub, use a GIF under 5 MB (hard cap 10 MB), or ASCII STL in a fenced block for simple geometry; no scripts or iframes survive (GitHub non-code files docs; github/markup).
11. For Office, export GLB, never FBX (Microsoft Support, FBX turned off 2024).
12. For Jupyter, use Plotly or an anywidget, not pythreejs, and save a PNG for GitHub's static view (pythreejs repo; anywidget; ReviewNB).
13. Capture stills by rendering right before `toDataURL`, or set `preserveDrawingBuffer: true` only when needed (three.js manual Tips; MDN toDataURL).
14. Headless capture without a GPU must pass `--enable-unsafe-swiftshader` (Chromium Intent to Remove SwiftShader Fallback; chromestatus).
15. Give every canvas `role="img"`, an `aria-label`, a described finding, and a DOM table outside the canvas (Paul J. Adam canvas accessibility; Cerovac 2021).
16. Honour `prefers-reduced-motion`, and give auto-rotate a pause control (WCAG 2.2.2 and 2.3.3).
17. Keep data colour unlit or use a saturation or hue based map on shaded surfaces (TVCG 2024 Colormaps for Shaded Surfaces; Moreland colour advice).
18. Add real keyboard orbit and a focus ring, since OrbitControls' default keys pan only (three.js OrbitControls docs).

## Claims likely to change

- three.js version (r185 now, r186 next) and the maturity of WebGPURenderer, including capture behaviour under WebGPU.
- Chrome's software WebGL flags. The SwiftShader removal already broke scripts once; flag names may change again.
- GitHub rendering: only STL is 3D today. A glTF or GLB viewer would change rule 10.
- Microsoft Office 3D format list and platform support (web, iPad).
- Claude artifact library limits (r128 in chat artifacts is a third-party claim; Claude Code Artifacts allow jsDelivr today).
- VS Code markdown preview script execution (issue #243454).
- echarts-gl maintenance pace; pythreejs revival; anywidget adoption.
- Obsidian plugin set and names; Confluence marketplace apps.
- GitHub upload size limits.
- New immersive analytics results on depth as a channel.

## Search plan for next refresh

1. "site:docs.github.com working with non-code files" and GitHub changelog for 3D, glTF, GLB, OBJ.
2. "site:docs.gitlab.com stl" and GitLab release notes for 3D viewers.
3. three.js releases page for the current r number, WebGPURenderer status, and toDataURL with WebGPU.
4. chromestatus and blink-dev for SwiftShader, `--enable-unsafe-swiftshader`, headless WebGL.
5. Microsoft Support "Get creative with 3D models" and FBX page for format changes.
6. "IEEE VIS 2026 3D scatterplot", "immersive analytics depth perception 2026", "3D graph layout perception 2026".
7. pythreejs, anywidget, and marimo release notes.
8. Obsidian community plugin list for "3D"; Atlassian Marketplace for "3D viewer".
9. Claude artifacts library documentation for three.js version and allowed CDNs.
10. model-viewer releases for accessibility and reduced-motion changes.
11. Identify the "Fisher" study named in the brief.

## Sources (URL plus date)

Fetched or searched on 2026-09-26 unless noted.

1. Cleveland and McGill 1984, An experiment in graphical perception (PDF): http://snoid.sv.vt.edu/~npolys/projects/safas/science.pdf (2026-09-26)
2. Kennedy Elliott, 39 studies about human perception (Siegrist 1996 summary): https://medium.com/@kennelliott/39-studies-about-human-perception-in-30-minutes-4728f9e31a73 (2026-09-26)
3. Zacks et al. 1998, Reading bar graphs, Semantic Scholar: https://www.semanticscholar.org/paper/Reading-bar-graphs:-Effects-of-extraneous-depth-and-Zacks-Levy/de877b638ee5e8e0c2d4e260bb2e95d1ba0332d8 (2026-09-26)
4. MeasuringU, Are 3D graphs always worse than 2D graphs: https://measuringu.com/is-3d-worse-than-2d/ (2026-09-26)
5. Kosara, 3D bar charts considered not that harmful: https://eagereyes.org/blog/2016/3d-bar-charts-considered-not-that-harmful (2026-09-26)
6. Wilke, Fundamentals of Data Visualization, Avoid 3D: https://clauswilke.com/dataviz/no-3d.html (2026-09-26)
7. Munzner, Visualization Analysis and Design (No unjustified 3D): https://www.oreilly.com/library/view/visualization-analysis-and/9781466508910/ and Data Viz Today episode 31: https://dataviztoday.com/shownotes/31 (2026-09-26)
8. Tufte, Chartjunk: https://www.edwardtufte.com/notebook/chartjunk/ (2026-09-26)
9. Ware and Franck 1996, ACM TOG: https://dl.acm.org/doi/10.1145/234972.234975 (2026-09-26)
10. McGuffin, Servera, Forest 2022, Path tracing in 2D, 3D and physicalized networks: https://arxiv.org/abs/2207.11586 (2026-09-26)
11. Zhang et al. 2025, Investigating crossing perception in 3D graph visualisation: https://arxiv.org/abs/2508.00950 (2026-09-26)
12. Structure Perception in 3D Point Clouds, ACM SAP 2021: https://dl.acm.org/doi/10.1145/3474451.3476237 (2026-09-26)
13. Kraus et al. 2020, Impact of immersion on cluster identification: https://doi.org/10.1109/tvcg.2019.2934395 (2026-09-26)
14. Whitlock, Smart, Szafir 2020, Graphical perception for immersive analytics: https://cmci.colorado.edu/visualab/3DPerception/3DPerception.pdf (2026-09-26)
15. Sedlmair, Munzner, Tory 2013, Empirical guidance on scatterplot and DR choices: https://www.ncbi.nlm.nih.gov/pubmed/24051830 (2026-09-26)
16. Colormaps for Shaded Surfaces: Stepped vs Smooth, TVCG 2024: https://doi.org/10.1109/tvcg.2024.3383336 (2026-09-26)
17. Moreland, Color map advice for scientific visualization: https://www.kennethmoreland.com/color-advice/ (2026-09-26)
18. FT Visual Vocabulary (chart-doctor): https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary (2026-09-26)
19. Datawrapper chart types guide: https://www.datawrapper.de/blog/chart-types-guide (2026-09-26)
20. GitHub Docs, Working with non-code files: https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files (2026-09-26)
21. GitHub Changelog 2022-03-17, Mermaid, topoJSON, geoJSON and ASCII STL in markdown: https://github.blog/changelog/2022-03-17-mermaid-topojson-geojson-and-ascii-stl-diagrams-are-now-supported-in-markdown-and-as-files/ (2026-09-26)
22. GitHub Docs, Attaching files: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files (2026-09-26)
23. github/markup README (sanitization): https://github.com/github/markup (2026-09-26)
24. GitLab STL file viewer MR 10368: https://gitlab.com/gitlab-org/gitlab-foss/-/merge_requests/10368 (2026-09-26)
25. Microsoft Support, Support for FBX files has been turned off in Office: https://support.microsoft.com/en-us/topic/support-for-fbx-files-has-been-turned-off-in-office-9f2387f1-84ec-496a-a288-2c6f774db219 (2026-09-26)
26. Microsoft Support, Get creative with 3D models: https://support.microsoft.com/en-us/office/graphics-visuals/get-creative-with-3d-models (2026-09-26)
27. Obsidian Model Viewer plugin: https://github.com/janispritzkau/obsidian-model-viewer ; Embed 3D: https://github.com/ElmoNeedsArson/Obsidian-3D-embed ; 3D Codeblocks: https://community.obsidian.md/plugins/three-d-codeblocks (2026-09-26)
28. Notion Help, Embeds, bookmarks and link mentions: https://www.notion.com/help/embed-and-connect-other-apps (2026-09-26)
29. Atlassian Marketplace, 3D Viewer+ for Confluence: https://marketplace.atlassian.com/apps/1226700/3d-viewer-for-confluence ; Online 3D Viewer for Confluence: https://github.com/kovacsv/Online3DViewerConfluence (2026-09-26)
30. pythreejs repository: https://github.com/jupyter-widgets/pythreejs ; Snyk health: https://snyk.io/advisor/python/pythreejs (2026-09-26)
31. anywidget: https://anywidget.dev/en/getting-started/ ; marimo threewidget: https://marimo.io/gallery/l/threewidget (2026-09-26)
32. ReviewNB, GitHub not rendering interactive notebook widgets: https://blog.reviewnb.com/github-not-rendering-interactive-notebook-widgets/ (2026-09-26)
33. Quarto htmlwidgets: https://quarto.org/docs/interactive/widgets/htmlwidgets.html (2026-09-26)
34. Observable three.js notebook: https://observablehq.com/@observablehq/three-js (2026-09-26)
35. VS Code markdown docs: https://code.visualstudio.com/docs/languages/markdown ; issue 243454: https://github.com/microsoft/vscode/issues/243454 (2026-09-26)
36. Claude Lab, artifacts guide (three.js r128 claim): https://claudelab.net/en/articles/claude-ai/claude-artifacts-advanced-interactive-prototyping-guide (2026-09-26, third party)
37. Slack Block Kit video block: https://docs.slack.dev/reference/block-kit/blocks/video-block/ (2026-09-26)
38. Plotly 3D charts in JavaScript: https://plotly.com/javascript/3d-charts/ (2026-09-26)
39. echarts-gl releases: https://github.com/ecomfe/echarts-gl/releases (2026-09-26)
40. globe.gl: https://github.com/vasturiano/globe.gl ; 3d-force-graph: https://github.com/vasturiano/3d-force-graph (2026-09-26)
41. deck.gl HexagonLayer: https://deck.gl/docs/api-reference/aggregation-layers/hexagon-layer ; PointCloudLayer: https://deck.gl/docs/api-reference/layers/point-cloud-layer (2026-09-26)
42. three.js r185 release: https://github.com/mrdoob/three.js/releases/tag/r185 ; r186 splats: https://radiancefields.com/three.js-merges-a-native-gaussian-splat-renderer-for-webgpu-in-r186 ; WebGPURenderer manual: https://threejs.org/manual/en/webgpurenderer.html (2026-09-26)
43. three.js CSS2DRenderer docs: https://threejs.org/docs/pages/CSS2DRenderer.html ; troika-three-text: https://protectwise.github.io/troika/troika-three-text/ (2026-09-26)
44. three.js OrbitControls docs: https://threejs.org/docs/pages/OrbitControls.html (2026-09-26)
45. three.js manual, Tips (canvas screenshots): https://threejs.org/manual/en/tips.html (2026-09-26, not fetched; content confirmed via mirror search result) ; MDN toDataURL: https://developer.mozilla.org/en/docs/Web/API/HTMLCanvasElement/toDataURL (2026-09-26)
46. Chromium Intent to Remove SwiftShader Fallback: https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM ; chromestatus: https://chromestatus.com/feature/5166674414927872 (2026-09-26)
47. CCapture.js: https://github.com/spite/ccapture.js/ (2026-09-26)
48. GIF for GitHub README (size survey, third party): https://rekort.app/blog/gif-for-github-readme (2026-09-26)
49. model-viewer docs: https://modelviewer.dev/docs/index.html (2026-09-26, page body did not load in fetch; attribute details from search results)
50. W3C Understanding SC 2.3.3: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html (2026-09-26)
51. Paul J. Adam, HTML canvas accessibility: https://pauljadam.com/demos/canvas.html ; Cerovac, Making 3D web UIs accessible: https://cerovac.com/a11y/2021/06/making-three-dimensional-web-user-interfaces-accessible/ (2026-09-26)

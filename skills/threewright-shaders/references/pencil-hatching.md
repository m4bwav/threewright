# Pencil hatching that stays put while the camera moves

<!-- harvestwright: kevintngo-procedural-rpg https://github.com/kevintngo/procedural-rpg tier - 2026-11-28 -->

Status: untested in three.js. This is a method read from a shipped WebGL game (MIT, raw WebGL2, not three.js) and written down in our words on 2026-11-28. Nothing here was rebuilt or measured in a three.js page. Treat the numbers as starting points and verify with the test at the end before calling a build done.

Use it for a hand-drawn look: coloured pencil lays on paper, darker pencil for shade, pen for contours. The problem it solves is swimming. Hatching drawn in screen space slides over objects when the camera turns, and hatching in object UVs changes stroke width with distance.

## Method

1. Passes. Render the scene to a G-buffer (pigment colour and cover, shade amount, depth, normal, object id). A full-screen pass then lays paper, pencil, shade and pen. No bloom or tone mapping; nothing is brighter than the paper.
2. One slant for everything. All colour strokes run at one angle (62 degrees in the source) and shade strokes a few degrees flatter (6 degrees). A shared direction is what reads as one hand.
3. Paper coordinates from a held view. Project each pixel's world position onto the right and up axes of a stored camera basis, not the live one, so strokes stick to the world while the camera moves a little. Replace the held basis when the camera has turned more than 0.3 rad: fade to a second basis over 0.2 s, aimed up to 0.18 rad ahead of the turn. After 0.3 s of standing still with more than 0.012 rad of drift, settle onto the exact view over 0.45 s. Snap the anchor point to a coarse grid (64 units) so precision holds far from the origin.
4. Constant stroke width at any depth. Stroke pitch starts at 1/64 world unit and doubles per level. Level = log2(pixel footprint x 4.6 x device pixel ratio x depth / base pitch). Between levels, fade out every odd stroke while the even ones widen up to 2x, so a level change is not a pop.
5. One stroke. A row index across the slant with a per-row random weight (0.82 to 1.06), slow pressure noise along its length (0.66 to 1.12), and paper tooth from two noise scales as the threshold. Ragged ends: offset the lookup along the slant by a per-row random 2.6 to 6.5 px.
6. Blend order. Pigment is mixed over the paper by cover, so paper shows through light lays. Shade is a multiply by a deeper pencil derived from the pigment. Pen is a mix toward a dark ink. Contours come from depth steps, object-id edges and normal folds over four neighbours, drawn with a 2.4 px wobble.
7. Boil. Re-seed the hatching of moving figures 6 times a second and step their poses at 12 per second. Turn the re-seed off under `prefers-reduced-motion` and offer a "steady lines" setting.

## In three.js (not yet built)

- WebGLRenderer: a `WebGLRenderTarget` with `count: 3` (colour and cover, normal and shade, id) plus a `DepthTexture`, then one `ShaderMaterial` on a full-screen triangle. Pass the held basis as two `vec3` uniforms and the blend factor as a float; rebuild world position from depth with the inverse view-projection matrix.
- WebGPURenderer: `pass(scene, camera)` with `mrt()` outputs, and a TSL function for the stroke; `getViewPosition` and `cameraWorldMatrix` give the world position.
- `tw check` reads the world scene on such a page, not the quad (fixed in 1.17.0).

## Test before trusting it

Build a small page with two modes, held axes and plain screen-space hatching. `tw shot` two frames 0.1 rad of camera pan apart in each mode and `tw diff` them: the held-axes pair must differ less. Repeat with a tilt. Record both numbers here and remove the untested status.

Source: kevintngo/procedural-rpg (MIT), parameters read from its shader and renderer files; a block-orientation measure on five of its six screenshots found one shared stroke direction (share 0.41 to 0.75 against 0.19 to 0.24 for controls).

# Rendering books for threewright (2026-10-25)

Source: the round 2 books track. A reading pass over Gambetta, *Computer Graphics from Scratch* (2021), and Hughes, van Dam et al., *Computer Graphics: Principles and Practice* 3rd edition (CGPP, read by section). The findings below are in fresh words; section numbers are CGPP's printed pages. Every three.js name was then checked in the installed three 0.186.1 source.

## Findings that changed the knowledge base

| # | Finding | Book basis | three 0.186.1 check | Where it went |
|---|---|---|---|---|
| 1 | Transparency has three causes (coverage, transmission, glow) with different tools; per-object sorting fails for crossing or concave transparent meshes | CGPP §14.10 pp. 361-369, §14.7.3 p. 351, §17.4 pp. 485-489 | `Material.js` alphaHash, alphaToCoverage (MSAA context only), premultipliedAlpha, depthWrite; `MeshPhysicalMaterial.js` transmission (opacity 1), thickness, attenuationColor (the colour white light becomes at attenuationDistance); `WebGLRenderLists.js` sorts transparent items by groupOrder, renderOrder, then object depth; `OITPassNode.js` exports `oitPass` | new topic `transparency-and-blending` |
| 2 | Detail under about 2 px at one sample per pixel only aliases, so LOD switches belong on projected size; removed geometry moves into the normal map, then into roughness | CGPP §25.4 pp. 645-648, §14.6 pp. 346-348 | `LOD.addLevel(object, distance, hysteresis)` with hysteresis as a fraction of distance | `performance` Pitfalls, `models-for-the-web` Pitfalls |
| 3 | Minification without filtering aliases (moire on grazing ground); palette textures must not be filtered at all; fine normal maps sparkle at distance and MSAA does not help | CGPP §20.7 pp. 557-558, §36.9.1 p. 1058; Gambetta, "Textures" | `Texture.anisotropy`, `renderer.capabilities.getMaxAnisotropy()` | `models-for-the-web` Pitfalls |
| 4 | Multisampling covers only the target it is attached to | CGPP §36.9.1 pp. 1056-1058 | `EffectComposer.js` creates its default `WebGLRenderTarget` with no `samples`; `SMAAPass`, `FXAAPass`, `TAARenderPass`, `SSAARenderPass` exist | `post-processing` Pitfalls, lint rule `composer-without-aa` (info) |
| 5 | Depth precision piles up at the near plane | CGPP §36.3.1 pp. 1037-1039 | `polygonOffset`, `polygonOffsetFactor`; `logdepthbuf_fragment` writes `gl_FragDepth` | `cameras-and-controls` Pitfalls |
| 6 | Shadow maps self-shadow without an offset (acne), and too much offset detaches the shadow | Gambetta, "Shadows" and "Extending the Rasterizer" | `LightShadow.js` bias and normalBias, both default 0 | `lighting-and-shadows` Pitfalls |
| 7 | Blended double-sided cards are usually coverage; KTX2 needs sides in multiples of 4 | CGPP §14.10.2 p. 364; the 4-multiple rule was already in `models-for-the-web` | none needed | `tw glb` warnings |

The bias ranges in finding 6 are starting points, not book numbers. Nothing here was run in a page; the topic's Notes say so.

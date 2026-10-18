---
title: 3D models for the web
slug: models-for-the-web
kind: topic
summary: What a glTF model must be for three.js: PBR and ORM maps, KTX2 and meshopt or Draco, budgets, LODs, lightmaps, styles, scale and pivots, and how a bad model shows up.
tags: [model, gltf, glb, pbr, orm, lightmap, low-poly, toon, lod, texture atlas]
applies_to: ">=r180"
status: current
renderer: both
last_verified: 2026-10-17
sources: [ai-docs/research/2026-10-17-models-for-the-web.md, https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md, https://meshoptimizer.org/gltf/, https://gltf-transform.dev/cli, https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html]
related: [loaders-and-assets, optimize-gltf, load-gltf-with-decoders, performance, color-management, materials, gaussian-splats, product-viewer]
---

# 3D models for the web

This entry is about the model file itself, as a three.js developer receives it. Making, finding or fixing a model is the job of the polywright plugin (https://github.com/m4bwav/polywright): ask it through its asset folder [contract](https://github.com/m4bwav/polywright/blob/main/skills/polywright/references/contract.md) with the `web-threejs` target. Its artist's view of the same ground is [polywright-finish: web and three.js](https://github.com/m4bwav/polywright/blob/main/skills/polywright-finish/references/web-threejs.md).

## Essentials

- Format: glTF 2.0, shipped as one `.glb` (binary, textures inside) unless textures must be cached or swapped apart. Units are metres, +Y is up and the asset's front faces +Z (glTF spec). FBX, OBJ, STL and `.blend` are source formats; convert before they reach a page.
- Materials: glTF's metallic-roughness PBR maps to `MeshStandardMaterial` (or `MeshPhysicalMaterial` when `KHR_materials_*` extensions such as clearcoat or transmission are present). One texture can carry occlusion, roughness and metalness in R, G and B (ORM): three reads AO from red, roughness from green and metalness from blue, so a packed ORM works unchanged. Base colour and emissive are sRGB; normal, ORM and every other data map are linear. GLTFLoader tags them correctly; only hand-loaded textures need `colorSpace` set (see `color-management`).
- `KHR_materials_unlit` loads as `MeshBasicMaterial`, which ignores lights and drops normal, occlusion and emissive maps. Right for baked or flat-colour art, wrong for anything that must react to scene lights.
- Textures: KHR_texture_basisu (KTX2) keeps textures compressed on the GPU, which JPEG, PNG and WebP do not; the Khronos artist guide shows a 96 MB to 21 MB GPU memory drop on one sample. Use ETC1S for base colour and emissive with broad flat areas (also toon and UI art), UASTC for normal maps, ORM and fine-detail colour. ETC1S does not hold tangent-space normals well. Sizes in powers of two (multiples of 4 are required for KTX2), 2048 px or less except a hero asset. WebP or AVIF are smaller downloads but full size in VRAM.
- Geometry compression: `EXT_meshopt_compression` (meshopt) decodes fast, also compresses animation and morph data, and gets smaller again under gzip or Brotli; `KHR_draco_mesh_compression` compresses mesh geometry only and decodes slower in a WASM worker. Both rely on quantization (`KHR_mesh_quantization`: gltfpack defaults to 14-bit positions, 12-bit UVs, 8-bit normals). Prefer meshopt unless the file is static and download size is everything; three's loader also reads `KHR_meshopt_compression` (a Khronos release candidate on 2026-10-17, not ratified).
- Draw calls cost more than triangles. Every mesh and material pair is a draw call: one material per prop, shared materials across a kit, texture atlases and trim sheets so many objects share one material, merged static meshes (`BufferGeometryUtils.mergeGeometries`, or `optimize --join`), and `InstancedMesh` or `BatchedMesh` for repeats (see `performance`). glTF can carry instancing itself (`EXT_mesh_gpu_instancing`, written by `gltf-transform instance` and `gltfpack -mi`; GLTFLoader turns it into `InstancedMesh`).
- LODs: glTF has no LOD that three reads (GLTFLoader has no `MSFT_lod`). Ship the levels as separate meshes (named `_LOD0`, `_LOD1` and so on, about half the triangles per level) or files, and build a `THREE.LOD` in code. Most single-object web models need none; big scenes and repeated props do.
- Lighting baked or live: a lightmap or AO map on its own non-overlapping second UV set (`TEXCOORD_1`, which loads as `uv1`) makes static scenes look lit for the cost of one texture. glTF has no lightmap slot, so load it separately, set `texture.channel = 1` and assign `material.lightMap`. Baked light does not move with the object or react to new lights; keep live lights and shadows for what moves.
- Vertex colours (`COLOR_0`) turn on `vertexColors` in GLTFLoader, and a primitive with no normals loads with `flatShading` on. Low-poly art often needs no textures at all: vertex colours or a small palette texture (`gltf-transform palette`) and flat or faceted normals.
- Animation: skinning (`SkinnedMesh`, four joint influences per vertex, since three reads one `JOINTS_0`/`WEIGHTS_0` set), morph targets (blend shapes, face expressions) and node animation all arrive as `gltf.animations` (`AnimationClip`s) for an `AnimationMixer`. Clone a skinned model with `SkeletonUtils.clone`, never `Object3D.clone`. Several clips can share one rig in one file. `KHR_animation_pointer` (animate material values) needs a third-party loader plugin.
- Pivots: a prop's origin at its bottom centre (top centre for a ceiling item), a door at its hinge, a wheel at its axle. The origin decides where `position` puts the object and what it rotates around; fixing it in code with wrapper groups works but belongs in the source file.
- Gaussian splats are a separate asset type with their own formats and renderers: see `gaussian-splats` (native `GaussianSplat` on WebGPURenderer, or Spark 2.x on WebGL).

### Styles and what each asks of the model

| Style | The model needs | three.js side |
|---|---|---|
| Low-poly, flat-shaded | Hard edges or split normals, vertex colours or one palette texture, few materials | `MeshStandardMaterial` or `MeshLambertMaterial`, `flatShading` when normals are absent |
| Toon or cel | Clean silhouettes, flat base colours, little texture noise | `MeshToonMaterial` with a few-pixel `gradientMap` (`NearestFilter`, no colour space); outlines from `OutlineEffect` (WebGL) or `toonOutlinePass` from `three/tsl` (WebGPU), or an inverted-hull copy built in the file |
| Stylized PBR | Hand-painted or trim-sheet base colour, simple roughness, metalness 0 or 1, atlases | `MeshStandardMaterial`, an HDRI or room environment, few lights |
| Product-viewer realism | Real size, clean UVs, 2k ORM and normal maps, clearcoat or transmission where real | `MeshPhysicalMaterial` from the extensions, HDRI lighting, tone mapping (see `product-viewer`) |
| Isometric diorama | One small scene, baked lightmap or AO on `uv1`, shared atlas | Orthographic or narrow-FOV camera, `lightMap`, few or no live shadows |

## Budgets

Guidance for one model on a page, not a spec (whole-scene numbers are in `performance`):

| Target | Triangles | Draw calls | Textures | File |
|---|---|---|---|---|
| Phone, one hero model | 50k to 100k | under 10 | 1024 to 2048 px, KTX2 | 2 to 5 MB |
| Desktop product viewer | 100k to 300k | under 20 | 2048 px (4096 only for a true hero), KTX2 | 5 to 10 MB |
| Game prop in a kit | 500 to 5k | 1 (shared material) | atlas or trim sheet | under 500 KB |

polywright's `web-threejs` check target warns above 150k triangles, 2048 px images and 10 MB.

## Pitfalls

- Huge textures: a 4096 px RGBA PNG costs about 64 MB of GPU memory (about 85 MB with mipmaps) whatever its file size. `tw glb` lists texture pixels; resize and use KTX2.
- Unapplied transforms: a model scaled 0.01 or rotated -90 degrees on X at the root (an FBX habit) loads at the wrong size or lies on its side, and any code that sets `scale` or `rotation` on that node overwrites the fix. Apply transforms in the source and re-export.
- Wrong units: a model in centimetres arrives 100 times too big; one in inches 39 times. `tw glb` prints world bounds in metres; compare with the real object.
- Non-power-of-two or not-multiple-of-4 sizes: KTX2 encoding fails or the texture is padded; WebGL 2 handles NPOT textures, but mipmaps and compression behave best with powers of two.
- sRGB versus linear: a normal or ORM map tagged sRGB gives wrong lighting and washed roughness; a colour map left linear looks dark and flat. Hand-loaded textures are the usual culprit.
- Normal maps in DirectX convention (Y down, from Unreal or some generators): bumps look inverted under light. glTF and three use OpenGL (Y up); invert the green channel in the source.
- `gltf-transform optimize` defaults (4.5.1) flatten the hierarchy and join named meshes. A model whose parts are picked, hidden or animated by name loses them; pass `--join-named false` (or `--flatten false --join false`), or `gltfpack -kn`.
- Too many materials: an AI-generated or CAD model with hundreds of materials or parts is hundreds of draw calls. Merge and atlas in the source, or `optimize --join` when nothing needs its own name.
- Missing decoders: a meshopt, Draco or KTX2 file fails to load until the loader has the decoder (`load-gltf-with-decoders`).
- Unlit by accident: an exporter wrote `KHR_materials_unlit` and the model ignores every light.

## Verify

- `tw glb model.glb` before any loader code: size, draw calls, triangles, texture pixels, extensions, the decoders the file needs, animations, world bounds in metres and budget warnings.
- `npx @gltf-transform/cli@4.5.1 validate model.glb`: `No errors found` (KTX2 shows as an unsupported-extension info, which is expected). `inspect` lists meshes, materials, textures with their sizes and GPU memory, and animations.
- `tw check <page>`: `result: OK`, no failed requests, and the `bounds:` line in metres matches the real object.
- For style and lighting, one `tw shot` after the text checks pass: compare against a reference picture in the same viewer (model-viewer or the `product-viewer` template) so the lighting is the same.

## Notes

- 2026-10-17: written from the 2026-10-17 research (ai-docs/research/2026-10-17-models-for-the-web.md): texture channels, `uv1` and loader behaviour checked in three 0.186.1 source; gltfpack 1.3.0 and @gltf-transform/cli 4.5.1 help output read on the day. User request: each plugin carries 3D modelling knowledge for its topic and points to polywright. The per-model budgets are threewright's own guidance, not an industry figure.

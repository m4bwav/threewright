# Research: 3D models for three.js, from the developer's side (2026-10-17)

Why: user request, each plugin carries 3D modelling knowledge for its topic and points to polywright (the 3D modelling plugin, m4bwav/polywright). This note backs the `models-for-the-web` kb topic. polywright keeps the artist's side (making and finishing models) in its own `polywright-finish/references/web-threejs.md`.

## Checked against installed source (three 0.186.1 from `npm pack`, 2026-10-17)

- `npm view three version` is still 0.186.1 (2026-09-24); no r187 on npm on 2026-10-17.
- `MeshStandardMaterial`: AO is the red channel of `aoMap`, roughness the green channel of `roughnessMap`, metalness the blue channel of `metalnessMap` (doc comments in src/materials/MeshStandardMaterial.js). glTF's ORM texture fits this layout unchanged.
- `Texture.channel` defaults to 0 (src/textures/Texture.js). GLTFLoader maps `TEXCOORD_1` to the `uv1` attribute and sets `texture.channel` from a texture's `texCoord` (examples/jsm/loaders/GLTFLoader.js). glTF has no lightmap slot: a lightmap is loaded separately and given `channel = 1`.
- GLTFLoader turns on `vertexColors` when a primitive has `COLOR_0` and `flatShading` when it has no normals; `KHR_materials_unlit` becomes `MeshBasicMaterial`, which drops normal, occlusion and emissive maps.
- GLTFLoader supports `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_meshopt_compression`, `KHR_texture_basisu`, `EXT_texture_webp`, `EXT_texture_avif`, `EXT_mesh_gpu_instancing`, `KHR_texture_transform`, `KHR_materials_emissive_strength`. `KHR_materials_variants` and `KHR_animation_pointer` need third-party plugins (named in the loader's header). No `MSFT_lod` support.
- `MeshToonMaterial.gradientMap` must use `NearestFilter` for min and mag filters and stays `NoColorSpace`. Outlines: `OutlineEffect` (examples/jsm/effects, WebGL) and `toonOutlinePass` in `three/tsl` (src/nodes/display/ToonOutlinePassNode.js, WebGPU; defaults color black, thickness 0.003, alpha 1).

## Tools (run 2026-10-17)

- `@gltf-transform/cli` 4.5.1 `optimize -h`: defaults are `--flatten true`, `--join true`, `--join-meshes true`, `--join-named true`, `--instance true` (`--instance-min 5`), `--palette true`, `--simplify true` with `--simplify-error 0.0001`, `--texture-size 2048`, `--meshopt-level high`. So `optimize` merges named meshes and flattens the hierarchy unless told not to: a model whose parts are picked or animated by name needs `--join-named false` (or `--flatten false --join false`).
- `gltfpack` 1.3.0 `-h`: `-vp` 14 bits positions, `-vt` 12 bits UVs, `-vn` 8 bits normals by default; `-tc`/`-tu` pick ETC1S or UASTC per texture class (`color`, `normal`, `attrib`); `-tl N` caps texture size; `-kn` keeps named nodes; `-mi` instancing; `-cc` meshopt, `-cz` KHR_meshopt_compression. It never writes Draco. Texture compression needs the native binary, not the npm build (meshoptimizer.org/gltf).
- npm versions: meshoptimizer 1.3.0, @google/model-viewer 4.4.0, @sparkjsdev/spark 2.3.1, gltf-validator 2.0.0-dev.3.10.

## Specs and guides

- KHR_meshopt_compression: Release Candidate, not ratified (Khronos glTF repo, 2026-10-17). v1 vertex codec compresses better; a COLOR filter is new; EXT assets convert by renaming the extension.
- Khronos KTX Artist Guide (3D-Formats-Guidelines): ETC1S for base colour and emissive with large flat areas, toon and UI art; UASTC for normal maps, ORM and other packed data, and high-detail colour. Power-of-two sizes; multiples of 4 required for KHR_texture_basisu. Normal and ORM encoded linear (`--assign_oetf linear`). Example GPU memory: 96 MB to 21 MB for StainedGlassLamp.
- Basis Universal README and a Khronos forum answer: ETC1S does not handle tangent-space normal maps well; two-channel RG normals with ETC1S are not supported in glTF.
- glTF 2.0 spec: metres, +Y up, the front faces +Z.
- Khronos 3D Commerce guidelines (via polywright's engines page, checked 2026-10-11): real size, origin bottom centre, metalness 0 or 1, KTX2 for delivery.

## Sources

- https://meshoptimizer.org/gltf/
- https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
- https://gltf-transform.dev/cli
- https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_meshopt_compression/README.md
- https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md
- https://community.khronos.org/t/gltf-basisu-extension-platform-support/110144
- https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets
- https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- https://github.com/m4bwav/polywright/blob/main/skills/polywright-finish/references/engines.md
- three 0.186.1 source: src/materials/MeshStandardMaterial.js, MeshToonMaterial.js, src/textures/Texture.js, examples/jsm/loaders/GLTFLoader.js, src/nodes/display/ToonOutlinePassNode.js

## Not verified

- Draco versus meshopt size and decode-time numbers: the meshoptimizer and glTF Transform pages give none. The kb states the usual trade-off (Draco often smaller geometry, meshopt faster to decode, also covers animation and morph data, and compresses further under gzip or Brotli) as practice, not a measured figure.

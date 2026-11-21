# Lighting models, colour space, stencil and transparency

Engine-agnostic shader craft from Espindola, *The Godot Shaders Bible* (v0.11, 2025), mapped to three.js r186. API names checked against the installed three 0.186.1 source on 2026-11-21. Page numbers are PDF pages.

## Rim and fresnel: one space for normal and view

- rim = pow(1 - max(dot(n, v), 0), power). Both vectors must be in the same space. In TSL use `normalView` with `positionViewDirection` (both view space), or `normalWorld` with `cameraPosition.sub(positionWorld).normalize()` (both world). Mixing `normalWorld` with `positionViewDirection` is the common bug: the rim slides as the camera turns (p. 128-138).
- Guard every `pow` base with `max(.., 0)`: a negative base is undefined in GLSL and WGSL (p. 119, 147).

## Anisotropic hair (Ashikhmin-Shirley)

- h = normalize(l + v). Exponent e = (au * dot(h,t)^2 + av * dot(h,b)^2) / (1 - dot(n,h)^2). Specular = sqrt((au+1)(av+1)) / (8 pi) * pow(max(dot(n,h), 0.001), e) / (dot(v,h) * max(dot(n,l), dot(n,v))). The 0.001 floor stops a zero-based pow and division blowups (p. 139-162).
- `MeshPhysicalMaterial.anisotropy` (with `anisotropyRotation`) is GGX anisotropy for brushed metal. It does not give the stylized anime-hair band; write a custom model for that.
- In TSL custom lighting, put light-independent work (normal transform, texture reads) in `colorNode`/`normalNode`, not in the per-light `direct()` of a `LightingModel`, and add into `reflectedLight.directSpecular` with `addAssign`, never plain assignment, or every other light is dropped (p. 116-118, 166-168). Unverified on a page in this repo.

## Tangents need data

- Anything reading t and b needs tangents. `geometry.computeTangents()` requires an index plus position, normal and uv; without them it logs `computeTangents() failed` and does nothing. glTF files may ship a TANGENT attribute instead (p. 49-64, 150).
- In GLSL `ShaderMaterial`, a missing `tangent` attribute reads as zero. In TSL r186, `tangentView` with no attribute falls back in the fragment stage to a frame built from screen derivatives of the UVs (`TangentUtils.js`): it runs but is per-pixel, faceted on low-poly meshes and unstable at UV seams. Call `computeTangents()` for hair and anisotropy.

## Colour space: convert once

- Colour textures get `texture.colorSpace = SRGBColorSpace`; normal, roughness, metalness, AO, mask, alpha and density textures stay `NoColorSpace` (p. 124).
- Do not write pow(c, 1/2.2) or the 12.92 sRGB curve in a material: the renderer's output transform already encodes, so a hand conversion double-encodes and the image looks washed out. Use the piecewise IEC curve (0.04045, 12.92, 2.4) only when writing a render target that something reads raw (p. 122-127). The book converts by hand in its light function as a teaching device.

## clamp argument order

- `clamp(x, min, max)` in GLSL, WGSL and TSL (`clamp(x, 0, 1)` or `x.clamp(0, 1)`). The book's listing writes clamp(0.0, 1.0, x) (p. 264), which clamps the constant 0.0 into [1.0, x]. Check copied code for two leading literals.

## Stencil portals

- Writer (portal window): `stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc, stencilZPass: ReplaceStencilOp`, often `colorWrite: false`. Reader (world behind the portal): `stencilWrite: true, stencilRef: 1, stencilFunc: EqualStencilFunc` (`stencilWrite` turns on the test as well as writes) (p. 338-354).
- The stencil buffer is off by default on both renderers in r186: pass `stencil: true` to `new WebGLRenderer()` or `new WebGPURenderer()`, or nothing masks. (The book's Godot needs 4.5+; this is the three.js analogue of that version gate.)
- Portal interior: reader with `depthTest: false, depthWrite: false` so the frame does not hide it. Set `renderOrder` so the writer draws first; transparent materials sort into a later list and can run out of order without it (p. 349-352).
- Shape the mask from a texture in the writer with `alphaTest` or TSL `Discard()` (p. 353-354). A ray-marched volume inside the portal needs the same reader settings.

## Double-sided transparent sorting

- `transparent: true` with `side: DoubleSide` sorts per object, not per triangle, so a foliage card shows back faces over front faces. Fix: `alphaTest` (cutout, writes depth) or `alphaHash`, or draw a depth pre-pass copy (`colorWrite: false`, `depthWrite: true`) before the blended mesh (p. 306-312).
- Smeared cutout edges: compressed alpha (KTX2 ETC1S) damages edges; use UASTC or an uncompressed texture. `alphaToCoverage: true` with MSAA (`antialias: true`) is the edge-smoothing analogue of Godot's ALPHA_ANTIALIASING_EDGE (p. 311-312).

## Distance fade with dither

- fade = saturate(distance(positionWorld, cameraPosition) / fadeDistance), squared for a softer start. Compare it with screen-space hash noise (dither) and discard or use `alphaHash`, instead of blending: the object stays opaque, sorts correctly and the band edge breaks into noise (p. 313-319). Hash from `screenCoordinate` so the pattern stays fixed on screen.

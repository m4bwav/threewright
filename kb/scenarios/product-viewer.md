---
title: Product viewers and configurators
slug: product-viewer
kind: scenario
summary: Show a GLB with AR in one tag, or build a custom three.js configurator with material variants, image-based lighting and tone mapping tuned for color accuracy.
tags: [product viewer, configurator, model-viewer, ar, variants, ibl, tone mapping, ecommerce]
applies_to: ">=r167"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-ecosystem-libraries.md, https://github.com/google/model-viewer, https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_variants/README.md]
related: [model-viewer, camera-controls, gltf-transform, three-vrm, renderer-choice, environment-lighting, fit-camera-to-object, export-glb, optimize-gltf]
template: r3f
---

# Product viewers and configurators

## When

- A page must show a single product model, let a visitor orbit it, and optionally view it in AR on their own device (furniture, footwear, jewelry, electronics).
- The product has a small number of material or color variants baked into one GLB (`KHR_materials_variants`), such as a shoe in several colorways.
- A real configurator needs rules and pricing beyond swapping textures: multiple parts, incompatible option combinations, a running price — that is a job for custom three.js or React Three Fiber, not `<model-viewer>`.

## Stack

| need | first choice | when to hand-roll |
|---|---|---|
| show a GLB, allow AR, swap named variants | `@google/model-viewer` (built on three.js) | custom UI, custom shaders, many interactive parts, or a rules-and-pricing configurator |
| React product viewer with drei helpers | React Three Fiber + drei `Stage`, `Environment`, `ContactShadows`, `Bounds` | — |
| vanilla, full control | three.js `WebGLRenderer` + `camera-controls` (or `OrbitControls`) + `GLTFLoader` with Meshopt and KTX2 | — |
| hero stills for marketing | `three-gpu-pathtracer` on top of the same scene | not real time; use for a still, not the live viewer |

- `WebGLRenderer` is the renderer default here: MSAA works everywhere, compatibility-mode WebGPU turns MSAA off, and the PBR look is identical on both renderers, so there is no reason to pay WebGPU's larger bundle for this scenario (`renderer-choice`).
- iOS AR needs USDZ. `<model-viewer>` can generate it on the fly from the GLB, or take a pre-authored `ios-src`; three.js exports USDZ with `USDZExporter`. Pre-authored USDZ is more reliable for materials.

## Build

- No verified `product-viewer` template exists yet. Start from `tw new r3f <dir>` (verified: build, typecheck, `tw check` on dist all clean) and add drei `Stage`/`Environment`/`Bounds`, or from `tw new html-importmap <dir>` for a vanilla page and add `camera-controls` plus `GLTFLoader`.
- Author variants in one GLB with `KHR_materials_variants`; three's `GLTFLoader` variants plugin reads them (example `webgl_loader_gltf_variants`), and glTF Transform's `KHRMaterialsVariants` class edits them in a pipeline. Load only the selected variant's textures; do not eagerly fetch every variant's textures on page load.
- Lighting: an HDR or EXR environment through `PMREMGenerator`, or `RoomEnvironment` for a fast-loading studio look that needs no external file (works offline, in CI, and in sandboxed pages such as Claude artifacts). Use `AgXToneMapping` or `NeutralToneMapping`, not the default, for product color accuracy.
- Shadows: a contact-shadow plane or a baked shadow texture reads better and costs less than a real-time shadow map for a single hero product.
- Compress the hero GLB with `gltf-transform optimize` (Meshopt plus KTX2) or `gltfpack`; target 1 to 5 MB for the hero asset with a 1k environment map, one draw call per material, 60 fps on a mid phone.

## Pitfalls

- Color mismatch from wrong texture color space: tag base-color textures `SRGBColorSpace`, never normal, roughness or metalness maps the same way.
- HDR environments of 10 to 30 MB blow the mobile budget; prefer a small prefiltered environment or `RoomEnvironment` unless the brand needs a specific real-world HDRI.
- Variants that duplicate geometry instead of swapping materials waste memory and bandwidth; check with `gltf-transform inspect` that a "variant" is really a material change, not a second copy of the mesh.
- The wrong tone mapping shifts brand colors compared to the source render; confirm the exact tone-mapping mode against reference renders before shipping, since `AgXToneMapping` and `NeutralToneMapping` produce visibly different results from each other and from no tone mapping at all.
- `<model-viewer>`'s peer range is exactly `three ^0.183.0`; you cannot simply point it at a newer `three` install if the rest of the page needs r186 features.

## Verify

- `tw check <page>` is `result: OK`: no console errors, no failed texture or environment requests, sane bounds and camera (the model is inside the frustum, not at the origin with the camera inside it).
- `tw glb <model>` for size, draw calls, triangles, texture pixel counts and required decoders before shipping; keep it inside the 1 to 5 MB hero budget.
- `tw shot <page> --size 960x540` for a framing and color check; compare against a reference render if brand color accuracy matters.
- For AR paths, check the exported USDZ opens in a real Quick Look session at least once per release; headless checks cannot verify the native AR viewer.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A2, ecosystem-libraries). Google's model-viewer three.js peer pin and the exact USDZ/AR behavior are the claims most likely to move.

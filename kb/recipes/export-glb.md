---
title: Export a GLB
slug: export-glb
kind: recipe
summary: Export a scene or object to a binary GLB with GLTFExporter's parseAsync, for embedding in Office, model-viewer, or a downstream optimization pipeline.
tags: [gltfexporter, glb, export, parseAsync]
applies_to: ">=r170"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [optimize-gltf, loaders-and-assets]
template: html-importmap
---

# Export a GLB

## Goal

Turn a live three.js scene (or a single object) into a binary `.glb` file the browser can download, for embedding in PowerPoint/Word (`Insert > 3D Models`, GLB is the recommended format there; FBX insertion was disabled in Office in 2024), loading into `<model-viewer>`, or feeding into `optimize-gltf`.

## Code

```js
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

async function exportGLB(object, filename = 'export.glb') {
  const exporter = new GLTFExporter();
  const glbArrayBuffer = await exporter.parseAsync(object, { binary: true }); // binary: true -> .glb, not .gltf+.bin+textures

  const blob = new Blob([glbArrayBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Export the whole scene:
// await exportGLB(scene, 'scene.glb');
// Or just one subtree:
// await exportGLB(scene.getObjectByName('model'), 'model.glb');
```

`GLTFExporter.parse()` (the callback form) still exists, but `parseAsync()` is the current, promise-based entry point and is what the exporter's own docs lead with; prefer it in new code. Pass `{ binary: true }` for a single self-contained `.glb`; omit it (or set it `false`) to get a `.gltf` JSON document with separate buffer/texture files instead, which is rarely what you want for a one-file download.

## Verify

- Run `tw glb export.glb` on the downloaded file: it should report a sensible size, draw call and triangle count matching what you exported, with no unexpected extensions.
- `npx @gltf-transform/cli@4.5.1 validate export.glb` must report `No errors found`.
- Load the exported GLB in a fresh page with `GLTFLoader` (see `load-gltf-with-decoders`) and run `tw check` on it: `result: OK` and a scene graph matching the original is the end-to-end proof.
- In a headless test the download cannot be caught, so call `parseAsync` from `tw check --json --eval` and return the bytes as base64, then write them to a file from Node. The first four bytes must be `glTF`.
- Verified 2026-09-26 on Windows 11, Chrome 153 headless, RTX 5060 Ti (WebGL), three 0.186.1 from node_modules. Harness: the recipe function unchanged, called on a group with a torus knot, a box and a plane with 3000 px color, 512 px emissive and 1024 px normal canvas textures; no errors or warnings in the page. The same `parseAsync(object, { binary: true })` call returned an ArrayBuffer of 315,768 bytes with magic `glTF`. `tw glb` read `glTF 2.0 · THREE.GLTFExporter r186 · nodes 4 · meshes 3 (3 draw calls) · triangles 4,110 · images 3 (png 3; largest 3000 px)`. `@gltf-transform/cli` 4.5.0 `validate`: `No errors found` (infos only: unused TEXCOORD_0, a non-power-of-two image, generated tangents). Reloaded with GLTFLoader, it gave `tris 4110 knot true` and `result: OK`. `tw lint` found 0 errors and 0 warnings; the `tw shot` showed the three objects.

## Notes

- 2026-09-26: written from the dataviz research (section 3, Office's GLB-over-FBX guidance) and the core r160-r186 research, checked against `node_modules/three/examples/jsm/exporters/GLTFExporter.js` in the installed 0.186.1 (`parse`/`parseAsync` signatures confirmed directly in source).
- 2026-09-26: ran it (see Verify). The code was right; no change beyond the Verify record. The exported file also served as the source model for `optimize-gltf` and `load-gltf-with-decoders`.

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

- After exporting, run `tw glb export.glb` on the downloaded file: it should report a sensible size, draw call and triangle count matching what you exported, with no unexpected extensions.
- `npx @gltf-transform/cli validate export.glb` should report no errors, confirming the exported file is actually well-formed glTF and not just "a file that downloaded".
- Re-load the exported GLB in a fresh page with `GLTFLoader` (see `load-gltf-with-decoders`) and run `tw check` on that page: `result: OK` with a scene graph matching the original object is the end-to-end proof that the round trip works.

## Notes

- 2026-09-26: written from the dataviz research (section 3, Office's GLB-over-FBX guidance) and the core r160-r186 research, checked against `node_modules/three/examples/jsm/exporters/GLTFExporter.js` in the installed 0.186.1 (`parse`/`parseAsync` signatures confirmed directly in source).

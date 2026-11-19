# Symptoms, the evidence that names them, and the fix

Match the `tw check` output to a row. Rows are ordered by how often they occur in agent-written pages. Each fix links the knowledge-base entry with details (`tw kb show <slug>`).

| symptom | evidence in `tw check` | usual cause | fix |
|---|---|---|---|
| blank page, nothing renders | `three: not detected`; FAILED REQUESTS; `Failed to resolve module specifier` with the import-map hint | three did not load: missing or wrong import map, `file://`, a blocked CDN, a typo in a version | pinned import map (`import-maps-and-builds`); serve over http |
| black canvas | `pixels: ... one flat colour (#000000)`; CHECK `lit materials but no lights and no scene.environment` | lit materials with no light or environment; camera inside an object; objects outside near/far | add a light or `RoomEnvironment` (`environment-lighting`); fit the camera (`fit-camera-to-object`) |
| objects too dark | `pixels: ... almost black`; mean luma under 0.05 | no environment for PBR, exposure too low, legacy light intensities after an upgrade (units changed in r155 and r165) | environment lighting; retune intensities; tone mapping on purpose (`color-management`) |
| washed-out colours | CHECK `color map(s) not tagged SRGBColorSpace` | a hand-loaded colour texture left untagged | `texture.colorSpace = THREE.SRGBColorSpace` for colour maps only |
| nothing visible but no errors | `pixels: only the background`; CHECK `scene center is outside the camera view` or `very small in view` | camera looks away, model at the wrong scale (centimetres exported as metres), object hidden | `tw scene` for HIDDEN and scale; `tw glb` bounds; fit the camera |
| stretched image | CHECK `camera.aspect ... does not match the canvas` | resize handler missing `updateProjectionMatrix()` | `resize-and-pixel-ratio` |
| model missing | FAILED REQUESTS on the .glb or its textures; `No DRACOLoader instance provided`, `setKTX2Loader must be called`, `setMeshoptDecoder must be called` hints | wrong path, missing decoder, CORS | `tw glb` names the decoders; `load-gltf-with-decoders` |
| WebGPU page runs on WebGL | `renderer: WebGPURenderer (WebGL2 fallback)`; warning `WebGPU is not available` | no adapter (headless, old browser, Linux Firefox) | expected fallback; test both (`webgpu-backend-check`) |
| WebGPU page throws on start | `called before the backend is initialized` | PMREM, compute or render before init | `await renderer.init()` |
| custom material fails on WebGPU | `Material "ShaderMaterial" is not compatible` | GLSL on WebGPURenderer | TSL node material (`tsl`), or WebGLRenderer |
| deprecation warnings | warnings block: `Clock ... deprecated`, `PostProcessing ... renamed`, `PCFSoftShadowMap has been removed`, `RGBELoader has been deprecated` | old API in current code | `tw lint` gives the fix per line (`current-vs-legacy`) |
| two copies of three | `Multiple instances of Three.js being imported` | CDN plus bundle, or two versions | one source, one version |
| slow or janky | draw calls over about 100 on phones or 1000 anywhere (CHECK says so); triangles in the millions | many meshes, no instancing, huge textures, DPR uncapped | `performance`, `instanced-scatter`; cap DPR at 2 |
| memory keeps growing | `tw check --eval "JSON.stringify(renderer.info.memory)"` rising across swaps | geometries, materials, textures not disposed | `dispose-a-scene` |
| z-fighting or flicker | CHECK `near/far ratio ... risks z-fighting` | near plane too small for the far plane | raise `near`; logarithmic or reversed depth for huge ranges |
| works locally, not deployed | FAILED REQUESTS with 404 or CORS on the deployed URL | wrong base path, case-sensitive file names, assets on another origin without CORS | `tw check <deployed URL>`; fix paths and headers |
| shadows missing | CHECK `a light casts shadows but renderer.shadowMap.enabled is false` | shadow map off, or the shadow camera does not cover the scene | enable; fit `light.shadow.camera` (`lighting-and-shadows`) |
| WGSL compile error | `[... fragment error] at line` with the shader hint | a TSL graph mixing types or an unsupported node | fix the node types; `renderer.onError` gets the same report |
| page fine, capture black | `tw shot` fine but `toDataURL` blank in page code | drawing buffer cleared after present | capture right after `render()` in the same task (`capture-stills-and-video`) |

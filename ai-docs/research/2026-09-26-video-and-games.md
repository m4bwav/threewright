# Video output and game-building with three.js in 2026

Date: 2026-09-26
Track: threewright research, rendering three.js scenes to video files, and building/testing games in three.js.
Related: 2026-09-26-ecosystem-and-assets.md, 2026-09-26-3d-dataviz-and-docs.md (headless capture flags).

## Summary

There is no single "best" way to turn a three.js scene into a video; the right tool depends on whether the agent needs frame-perfect determinism, real-time speed, or in-browser distribution. For frame-accurate offline rendering, the reliable pattern is: drive a virtual/manual clock so the scene renders at exact simulated timestamps, capture each frame (via CDP screenshot piping, or in-page WebCodecs encoding), and mux with `ffmpeg` or a WebCodecs muxer (mp4-muxer / mediabunny). `canvas.captureStream()` plus `MediaRecorder` is real-time-only and has known black-frame bugs in headless Chrome with SwiftShader, so avoid it for anything that must be exact. For games, three.js still has no built-in game framework; the practical stack is three.js + Rapier physics + a fixed-timestep loop, with instancing/BatchedMesh and LOD for performance, and headless CDP-driven Puppeteer/Playwright for automated testing since three.js exposes no native "step the game one frame with this input" API of its own.

## 1. Frame capture methods, compared

- **CDP screencast / `Page.captureScreenshot` per frame**: the most reliable path for headless, frame-accurate capture. An agent pauses the render loop, sets a virtual clock to `t = frameIndex / fps`, renders one frame, calls `Page.captureScreenshot`, then advances the clock and repeats. This bypasses whatever real-time constraints the browser's own capture APIs have, at the cost of speed (community reports around 5 fps capture throughput in headless mode for this approach). It is the right choice when correctness (every frame present, exact timing) matters more than wall-clock render time.
- **`canvas.captureStream()` + `MediaRecorder`**: simplest API, works in a normal browser tab, but is a real-time capture — frame timing follows wall clock, not simulation time, so it is unsuitable for deterministic rendering. It has a documented headless-Chrome bug producing solid-black video frames under ANGLE+SwiftShader while audio records fine; treat it as a real-browser, not headless, technique.
- **`canvas.toDataURL()` per frame**: works headless, is deterministic if driven by a virtual clock, but is slow for large canvases (full PNG/JPEG encode per frame) and needs an external muxer (ffmpeg image2pipe or a JS-side stitcher). Reasonable for lower-resolution or short clips.
- **WebCodecs, in-page**: `VideoEncoder` encodes raw canvas frames (via `VideoFrame` from a `WebGLTexture`/`ImageBitmap`) directly to H.264/VP9/AV1 chunks in the browser, with reported throughput up to about 10x realtime for canvas-to-MP4 encoding. This needs a muxer to produce a playable file: `mp4-muxer` (and the discontinued-in-favor-of `webm-muxer`) have been superseded by **mediabunny**, described by its own docs as "the evolution of mp4-muxer and webm-muxer," unifying muxing/demuxing behind one API where switching output container is a one-line change. This is the best in-browser, no-ffmpeg path when the whole pipeline (render, encode, mux) must run client-side or inside a headless page without shelling out.
- **`canvas-record`** (dmnsgn/canvas-record): a ready-made wrapper over WebCodecs/WASM that records a 2D/WebGL/WebGPU canvas region to MP4/WebM/MKV/MOV/GIF/PNG-sequence. Useful as an off-the-shelf option instead of hand-rolling the WebCodecs + mediabunny plumbing.
- **CCapture.js**: not deprecated. Version 2.0.0 is a ground-up rewrite (ES modules, WebCodecs backend, GPU motion blur, async/await) while keeping the original `new CCapture({...})` / `.start()`/`.capture()`/`.stop()`/`.save()` API. It renders at an exact requested framerate by controlling the capture loop itself, decoupled from real time, and is a solid choice for turntables/loops driven from inside the page. Prefer it over a from-scratch capture loop for simple in-browser recordings; prefer the CDP-screencast or WebCodecs approaches above when full external control (arbitrary resolution, exact ffmpeg-level encoding options) is needed.

## 2. Deterministic frame stepping

- The core pattern for any of the above: never call `requestAnimationFrame`-driven real delta time during capture. Instead maintain a virtual `THREE.Clock`-like counter set manually: `const t = frameIndex / fps; scene state = simulate(t); renderer.render(scene, camera);` then capture. This applies equally to physics (step Rapier by a fixed `dt` matching the video framerate, not by wall-clock delta) and to any GSAP/Theatre.js/keyframe animation (seek the timeline to `t` explicitly rather than playing it).
- Chromium has ongoing work combining "deterministic rendering control" for headless Chrome with virtual time, so that animations can be rendered deterministically at emulated timestamps rather than real ones (unverified exact API name/status as of r186-era Chrome; recheck at next refresh, since this could simplify the CDP-screencast pattern further).
- Headless GPU note (carried over from the dataviz research): Chrome removed automatic SwiftShader fallback, so a headless render without a real GPU needs `--enable-unsafe-swiftshader` (and typically `--use-angle=swiftshader`) or frames will be blank/black.

## 3. Encoding with ffmpeg

- Good default H.264 web-delivery command: `ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k output.mp4`. CRF 17-18 with `-preset slow` is described as near-master quality; CRF 23 with `-preset medium` is a lighter social-media-tier tradeoff.
- `-pix_fmt yuv420p` is required for broad player/browser compatibility (avoids 4:4:4 or 10-bit playback failures in common players).
- For explicit BT.709 tagging (recommended for any HD-or-larger output so color isn't left to inference): add `-color_primaries bt709 -colorspace bt709 -color_trc iec61966-2-1`. At HD resolutions with `yuv420p`, ffmpeg defaults to BT.709 anyway, but tagging explicitly avoids ambiguity in downstream tools.
- `-movflags +faststart` moves the MP4 moov atom to the front so browsers can start playback before the full file downloads; always include it for web delivery.
- GIF output: the standard high-quality path is a two-pass palette approach, `palettegenerate` then `paletteuse` filters, e.g. `ffmpeg -i in.mp4 -vf "fps=15,scale=480:-1:flags=lanczos,palettegen" palette.png` then `ffmpeg -i in.mp4 -i palette.png -filter_complex "fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse" out.gif` (this specific pair of commands is standard ffmpeg practice, not sourced from a 2026 page in this pass; treat as house knowledge, not "unverified" in the risky sense, but worth a spot re-check).
- **Alpha video**: two workable containers as of this research. ProRes 4444 (`-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le`) preserves alpha losslessly, large files, used in professional/desktop compositing pipelines (After Effects, Premiere, Final Cut). VP9 with alpha (`-c:v libvpx-vp9 -pix_fmt yuva420p`) is the practical web/browser-compatible alpha-video format, playable in `<video>` tags in Chrome/Firefox. Neither claim was directly re-verified with a fresh search this pass; flag as **unverified** pending a dedicated check next refresh.

## 4. Higher-level video tools

- **Remotion + `@remotion/three`**: `@remotion/three`'s `<ThreeCanvas>` bridges an R3F/three.js canvas into Remotion's deterministic, frame-by-frame render lifecycle, so Remotion drives the virtual clock and calls render-and-capture per frame automatically. This is the best-supported "compose a video with three.js content plus React UI/text/audio" path, and it produces broadcast-quality MP4 output via its own render farm/CLI rather than ad hoc ffmpeg piping. Current version 4.0.529, actively maintained.
- **Theatre.js sequences**: usable for authoring keyframed camera/object animation timelines that get seeked to an exact time per frame during capture, but the package (`@theatre/core` 0.7.2) has not published since 2024-05-19 — treat as stalled/maintenance-mode pending a repo check (see ecosystem doc).
- Recommendation: for a "render this three.js scene as a polished video" task, prefer Remotion + `@remotion/three` when React is already in play; fall back to the manual virtual-clock + CDP-screenshot (or WebCodecs+mediabunny) pipeline for non-React or fully headless/CLI contexts.

## 5. Building games in three.js

- **Game loop**: standard pattern is a fixed-timestep physics/logic update decoupled from a variable-timestep render call — accumulate real `deltaTime`, step physics in fixed `dt` chunks (e.g. 1/60s) inside a `while (accumulator >= dt)` loop, then render once per frame with interpolation between the last two physics states for smooth visuals. This avoids the classic three.js/Rapier discrepancy where physics stepped at render-frame rate goes unstable at low framerates.
- **Rapier integration**: `@dimforge/rapier3d-compat` (WASM inlined as base64, so no separate `.wasm` fetch/config needed) is the standard choice; `@react-three/rapier` wraps it for R3F with `<RigidBody>`/`<Physics>` components. Character movement uses Rapier's `KinematicCharacterController`: create one controller instance (parameters only, no body/collider state), call `.computeColliderMovement()`/`move_shape()` each fixed step with the desired translation, then apply the corrected movement to the kinematic body. Filter obstacles via `filterFlags`, `filterGroups`, or a custom `filterPredicate` closure.
- **Input**: no framework-level standard; typical approach is a small input-state module capturing keydown/keyup (and pointer/gamepad) into a plain object polled once per fixed-step tick, so input sampling is decoupled from render rate the same way physics is.
- **Audio**: three.js ships `PositionalAudio` (attach to an `Object3D`, feeds off `AudioListener` on the camera) for spatial sound, and plain `Audio` for UI/music. This remains the standard, no extra dependency needed for basic 3D audio.
- **Instancing and batching**: `InstancedMesh` is correct when every copy shares one geometry (trees, foliage, particles) — single draw call for potentially thousands of instances. `BatchedMesh` (three.js core since r170s-era, matured through r183 with per-instance opacity) is correct when several different geometries share a material and instance count per geometry is not huge; it trades some per-instance draw efficiency (its multi-draw emulation is measured roughly 1.5x-2x slower than true instancing on iGPU/dGPU respectively) for flexibility across many distinct meshes. Rule of thumb: one geometry, many copies -> `InstancedMesh`; a handful of distinct geometries, one material -> `BatchedMesh`; many wildly different meshes -> normal draw calls, and rely on frustum culling/LOD instead.
- **LOD**: `THREE.LOD` (built into three.js core) swaps geometry detail level by camera distance; combine with texture mip-mapping and, for large scenes, `3d-tiles-renderer` streaming (see ecosystem doc) rather than hand-building tile logic.
- **Physics debug**: Rapier's `world.debugRender()` (or the R3F `<Physics debug>` prop in `@react-three/rapier`) draws collider wireframes directly; use it during development and strip it in production builds.
- **Performance budgets** (working defaults, not a vendor spec — treat as house heuristics): keep draw calls per frame in the low hundreds at most on desktop, well under 100 on mobile/WebXR; watch `renderer.info.render.calls` (or `.drawCalls` on `WebGPURenderer`) directly rather than guessing. Triangle counts in the low millions are fine on desktop GPUs with good batching; mobile targets should stay in the hundreds of thousands visible per frame. Texture memory is often the first real bottleneck on integrated GPUs — KTX2/Basis-compressed textures (see ecosystem doc) reduce both download size and GPU memory footprint, unlike PNG/JPG which decode to full-size GPU textures regardless of file size on disk.

## 6. Notable three.js-based game engines/frameworks in 2026

- **Hology Engine**: a game engine built specifically for web/mobile/VR games on top of three.js, with a built-in physics engine for collision/raycasting and a kinematic character-movement component that blends upper/lower body animation by movement state. Positions itself as a higher-level game-engine layer above raw three.js (unverified how widely adopted it is versus a niche/early-stage project; check its GitHub activity at next refresh).
- **Immersive Web SDK (IWSDK)**, from Meta (`facebook/immersive-web-sdk` on GitHub, branded for Horizon OS developers): combines three.js rendering with an Entity-Component-System, plus interactions, locomotion, spatial UI, project tooling, and browser emulation for WebXR apps. Unveiled at Meta Connect and available in early access as of this research date. This is the most credible "engine layer over three.js" push in 2026 given it comes from Meta and targets Horizon OS's browser-based content, but early-access status means API stability should be treated as unverified/subject to change.
- These two plus Rapier/R3F/Threlte/TresJS cover most "should I write my own engine layer" questions: for VR/XR-first work, IWSDK is worth evaluating; for general web games, composing three.js + Rapier + R3F (or Threlte/TresJS) directly remains more common and lower-risk than adopting either engine wholesale.

## 7. Multiplayer basics

- Standard architecture: authoritative server, client-side prediction, server reconciliation. Client applies local input immediately using the same movement/physics code the server runs, tags each input with a sequence number, and buffers unacknowledged inputs. When the server sends back authoritative state plus the last processed input sequence number, the client discards acknowledged inputs and replays any newer buffered inputs on top of the server's corrected state (classic Gabriel Gambetta pattern, still the reference explanation as of 2026).
- For three.js specifically there is no special-cased networking library; teams pair a WebSocket (or WebRTC data channel) transport with a Node.js authoritative server running the same physics step (often the same Rapier build server-side via `@dimforge/rapier3d-compat` in Node) as the client, so prediction and reconciliation stay consistent.
- Entity interpolation (rendering other players slightly in the past, smoothly interpolated between received snapshots) is the usual complement to prediction/reconciliation for other players' avatars, since only the local player gets client-side prediction.

## 8. Headless testing of a three.js game

- three.js exposes no native "step one frame with this input" test API; an agent must build this itself: expose a small test hook on `window` (e.g. `window.__game.step(dt, input)`) that advances the fixed-timestep loop exactly once with injected input, bypassing `requestAnimationFrame`.
- Puppeteer/Playwright over CDP remains the standard automation layer: Puppeteer is specifically strong when an agent needs direct CDP access (network interception, performance tracing) alongside browser control. Input injection for a canvas-based game typically goes through the exposed test hook rather than simulated DOM events, since canvas games do not have per-element DOM targets to click.
- Combine the deterministic-stepping hook (section 2) with this test harness for reproducible game tests: set a fixed random seed, call `step(dt, {keys: [...]})` N times, then assert on exposed game-state (`window.__game.getState()`) or take a CDP screenshot for visual diffing. This is the same underlying technique as deterministic video capture, just driven by a test assertion instead of an encoder.
- No fully standardized "AI agent plays this three.js game headlessly" framework was found in this pass; agent-facing browser-automation tools (e.g. CDP-direct tools favored by coding agents) are converging on talking to CDP directly rather than through Puppeteer/Playwright wrappers, which suggests future game-testing hooks may look more like "send raw CDP input events to canvas coordinates" than DOM-event simulation. Treat this trend as unverified/early and recheck next refresh.

## Rules for the skill

1. For any "render this three.js scene to a video file" task, drive a manual/virtual clock and step frame-by-frame; never rely on `canvas.captureStream()`/`MediaRecorder` for anything that must be exact or run headless.
2. Prefer CDP-screenshot-per-frame capture for maximum headless reliability; prefer WebCodecs + mediabunny (or `canvas-record`) when the whole pipeline must stay in-browser without shelling out to ffmpeg; prefer Remotion + `@remotion/three` when the target stack is already React and a polished, composited video (with text/audio/UI) is wanted.
3. Encode final delivery MP4s with libx264, `-pix_fmt yuv420p`, `-movflags +faststart`, and CRF 17-18 (`-preset slow`) for high quality or CRF 23 (`-preset medium`) for lighter social delivery. Tag BT.709 explicitly for HD+ output.
4. For alpha-channel video, default to VP9 with `yuva420p` for web/browser playback and ProRes 4444 for desktop compositing handoff; confirm codec support with the receiving tool before committing to one (marked unverified above).
5. Default new three.js game work to a fixed-timestep loop decoupled from render rate, Rapier for physics (with its `KinematicCharacterController` for player movement), `InstancedMesh`/`BatchedMesh` chosen by the one-geometry-vs-many-geometries rule, and `THREE.LOD` for distance-based detail.
6. Watch `renderer.info.render.calls` during development; keep draw calls in the low hundreds on desktop and well under 100 on mobile/WebXR, and use KTX2-compressed textures to control GPU memory, not just download size.
7. For headless game testing, expose an explicit single-step test hook on the page (`step(dt, input)`) rather than relying on `requestAnimationFrame` or simulated DOM clicks on a canvas; drive it from Puppeteer/Playwright over CDP.
8. Evaluate IWSDK for WebXR/VR-first three.js projects and Hology for a full game-engine layer, but default to composing three.js + Rapier + R3F/Threlte/TresJS directly for general-purpose games, since both engines are early-stage as of this research date.

## Claims likely to change

- IWSDK's stability and API surface (currently early access).
- Hology Engine's adoption and maintenance trajectory (unverified how established it is).
- Chromium's deterministic-rendering-plus-virtual-time headless feature, whose exact API/status was not directly confirmed this pass.
- ProRes 4444 / VP9-alpha codec compatibility claims (flagged unverified above, worth a direct re-check).
- Whether Theatre.js resumes releases (shared with the ecosystem doc).
- Whether any standardized "AI agent tests a three.js game headlessly" framework emerges, versus ad hoc test hooks.

## Search plan for next refresh

1. Search "Chromium virtual time deterministic rendering headless" directly against chromestatus.com / Chromium bug tracker for the current status of that feature.
2. Recheck ProRes 4444 / VP9 alpha browser support tables (caniuse or MDN) rather than relying on general knowledge.
3. `npm view @remotion/three time.modified` and Remotion's release notes for any three.js-specific breaking changes.
4. Search "Hology Engine github stars commits 2026" and "Immersive Web SDK github release" for maturity signals.
5. Search "three.js game agent testing headless" and "canvas game CDP input injection" again for any newly published tooling.
6. Re-check `@dimforge/rapier3d-compat` changelog for `KinematicCharacterController` API changes.

## Sources

1. npm registry version/time checks for: three, @remotion/three, remotion, mp4-muxer, mediabunny, ccapture.js, @dimforge/rapier3d-compat, @theatre/core, leva, jolt-physics, postprocessing, troika-three-text, 3d-tiles-renderer, gltfjsx, camera-controls, @tresjs/core, threlte (2026-09-26)
2. Discourse three.js forum, "How to record your canvas or screen for video capture?": https://discourse.threejs.org/t/how-to-record-your-canvas-or-screen-for-video-capture/49872 (2026-09-26)
3. dev.to, "How to capture 3D animation and encode it into video by WebCodecs": https://dev.to/sabigara/how-to-capture-3d-animation-and-encode-it-into-video-by-webcodecs-3505 (2026-09-26)
4. canvas-record (dmnsgn): https://github.com/dmnsgn/canvas-record (2026-09-26)
5. Mediabunny introduction: https://mediabunny.dev/guide/introduction (2026-09-26)
6. devtails, "How to Save HTML Canvas to Mp4 Using WebCodecs API 10x Faster Than Realtime": https://devtails.xyz/adam/how-to-save-html-canvas-to-mp4-using-web-codecs-api (2026-09-26)
7. CCapture: https://spite.github.io/ccapture.js/ , https://github.com/spite/ccapture.js/ (2026-09-26)
8. vibbit.ai, "FFmpeg CRF Examples (2026)": https://vibbit.ai/blog/ffmpeg-crf-examples (2026-09-26)
9. pixelSham, "sRGB vs REC709": https://www.pixelsham.com/2025/08/07/srgb-vs-rec709-an-introduction/ (2026-09-26)
10. Remotion docs, @remotion/three: https://www.remotion.dev/docs/three , https://www.remotion.dev/docs/three-canvas (2026-09-26)
11. Rapier docs, character controller and KinematicCharacterController: https://rapier.rs/docs/user_guides/javascript/character_controller/ , https://rapier.rs/javascript3d/classes/KinematicCharacterController.html (2026-09-26)
12. Discourse three.js forum, InstancedMesh vs BatchedMesh: https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221 (2026-09-26)
13. Hology Engine: https://hology.app/ , https://threejsresources.com/tool/hology-engine (2026-09-26)
14. Immersive Web SDK: https://github.com/facebook/immersive-web-sdk , https://developers.meta.com/horizon/documentation/iwsdk/guides/overview/ , https://developers.meta.com/horizon/blog/immersive-web-sdk-new-era-spatial-web-development/ (2026-09-26)
15. Gabriel Gambetta, Client-Side Prediction and Server Reconciliation: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html (2026-09-26)
16. webgamedev.com, Client-Side Prediction and Server Reconciliation: https://www.webgamedev.com/backend/prediction-reconciliation (2026-09-26)
17. copyprogramming.com, "Headless Chrome Capture Screen Video or Animation: 2026 Complete Guide": https://copyprogramming.com/howto/headless-chrome-capture-screen-video-or-animation (2026-09-26, aggregator, unverified authority)
18. dev.to, "Browser Tools for AI Agents Part 1: Playwright, Puppeteer": https://dev.to/stevengonsalvez/browser-tools-for-ai-agents-part-1-playwright-puppeteer-and-why-your-agent-picked-playwright-k71 (2026-09-26)
19. Chromium SwiftShader fallback removal (carried from dataviz doc): https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM (2026-09-26)

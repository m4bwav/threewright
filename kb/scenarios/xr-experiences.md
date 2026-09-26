---
title: WebXR experiences
slug: xr-experiences
kind: scenario
summary: Quest Browser, Chrome on Android XR and Safari on visionOS are the real targets; iPhone Safari has no WebXR at all, so iOS "AR" means AR Quick Look, not WebXR.
tags: [webxr, quest, vision pro, android xr, iwsdk, hand tracking, foveation, ar quick look]
applies_to: ">=r185"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md]
related: [iwsdk, react-three-a11y, model-viewer, renderer-choice, webxr, keyboard-orbit-and-reduced-motion]
template: html-importmap
---

# WebXR experiences

## When

- A VR or AR experience must run in a browser (no app-store install), targeting Quest Browser, Chrome on Android phones or Android XR (Samsung Galaxy XR), or Safari on visionOS.
- Not for iPhone or iPad: Safari there has no WebXR at all as of this writing. For iOS "AR," use AR Quick Look (USDZ) or `<model-viewer>`, not a WebXR session.
- A Quest-first, ECS-driven app with locomotion, grabbing and spatial UI fits Meta's IWSDK better than hand-rolled `WebXRManager` code.

## Stack

| target | framework |
|---|---|
| core three.js, any XR target | `WebXRManager` plus `XRButton`, `XRControllerModelFactory`, `XRHandModelFactory` |
| React Three Fiber | `@react-three/xr` v6 (store-based, R3F event handlers on XR pointers, works with `@pmndrs/uikit`) |
| Quest-first, ECS, spatial UI | Meta IWSDK: three.js plus ECS, hands, locomotion, grabbing, spatial audio, Havok physics, an MCP runtime for agent-driven testing |
| declarative HTML scenes | A-Frame 1.8.0 (WebGPU and TSL since 1.7.0, but WebXR itself needs `forceWebGL` per A-Frame's own 1.7.0 notes) |

- `WebGLRenderer` is the default renderer for XR: there is no WebXR/WebGPU binding on Meta Quest ("It is not implemented on Meta Quest," three.js issue 32858), and all 27 of three's own `webxr_*` examples, IWSDK, and `@react-three/xr` build on `WebGLRenderer`. Flip to `WebGPURenderer` only when the target is Vision Pro specifically (the WebXR/WebGPU binding ships in visionOS Safari) or a WebGPU-only feature is required and the r185 WebGL XR fallback swap is acceptable elsewhere.

## Build

- No dedicated WebXR-starter template exists yet (`webxr-starter` is planned but not built). Start from `tw new html-importmap <dir>` and add `WebXRManager`/`XRButton` by hand, or evaluate IWSDK directly (`npm create @iwsdk@latest`) for a Quest-first project.
- Design for no controllers: Vision Pro uses gaze and pinch (transient pointer), not handheld controllers. Do not assume every target has a controller model to render.
- Always add `optionalFeatures: ['hand-tracking']` explicitly when hand tracking matters; it is easy to forget and silently get no hands on a device that supports them.
- Performance: Quest apps are usually fill-rate bound. Use fixed foveated rendering (`renderer.xr.setFoveation`), multiview where supported, one directional or point light with PBR, KTX2 textures, and little to no heavy post-processing.
- DOM overlays used on the desktop version of a page do not exist inside an active VR session; design the in-headset UI (spatial panels, `@pmndrs/uikit` or IWSDK's UIKitML) separately rather than assuming the same DOM renders.

## Pitfalls

- Testing only in desktop emulation (IWER or a browser's own device emulation) and never on a real headset misses input-timing and comfort issues that only show up on-device.
- Designing controller-only interactions breaks on Vision Pro, which has no controllers; test the gaze-and-pinch path explicitly if Vision Pro is a target.
- Forgetting `optionalFeatures: ['hand-tracking']` is the most common way "hands just don't show up" gets reported as a bug when it is a missing session-request option.
- Any claim that "Quest exposes WebXR through WebGPU" is currently wrong; three.js's own maintainers confirm it is not implemented there (issue 32858). Treat this as an active claim to re-check, not settled fact, since it could change.

## Verify

- `tw check <page>` is `result: OK` for the non-XR desktop fallback path at minimum; a full XR session needs on-device testing that headless `tw check` cannot substitute for.
- Confirm the session request lists every needed optional feature (`hand-tracking`, `hit-test`, `anchors`) explicitly and check the console for a rejected-feature warning rather than a silent no-op.
- For IWSDK projects, use its MCP runtime's agent mode (`npx @iwsdk/cli dev up --ai-mode agent`) for headless, deterministic checks of ECS state and XR input emulation before an on-device pass.

## Notes

- 2026-09-26: written from the 2026-09-26 research (scenarios-xr-and-testing A8, direction section 4.4). WebXR's Interop 2026 focus-area status, and whether Quest ever gains a WebGPU/WebXR binding, are the claims most likely to change.

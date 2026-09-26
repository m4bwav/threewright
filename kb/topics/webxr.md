---
title: WebXR
slug: webxr
kind: topic
summary: Device support in September 2026, why Quest stays on WebGLRenderer, and the performance and input differences across headsets.
tags: [webxr, vr, ar, quest, visionos, xrbutton, hand tracking]
applies_to: ">=r185"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, ai-docs/research/2026-09-26-direction.md]
related: [renderer-choice, performance, accessibility]
---

# WebXR

## Essentials

- Device support (checked 2026-09-26): Meta Quest Browser is the most complete target (`immersive-vr`, `immersive-ar` with passthrough, hand tracking, anchors, plane/mesh detection, layers, 72-90 fps). Chrome on Android phones and on Android XR (Samsung Galaxy XR) supports WebXR. Safari on visionOS 2+ has WebXR on by default for `immersive-vr`, with gaze-and-pinch (transient pointer) input and hand tracking, but `immersive-ar` is not enabled there. Safari on iPhone/iPad has no WebXR at all; for iOS AR use AR Quick Look (USDZ) or `<model-viewer>`.
- WebXR over the WebGPU backend needs `XRGPUBinding`, which as of r185 ships on Apple Vision Pro and experimentally on Chrome for Windows and Android XR, and explicitly "is not implemented on Meta Quest" (three.js issue 32858, 2026-01-26). This is why `renderer-choice` defaults every WebXR scenario to `WebGLRenderer`: all 27 official `webxr_*` examples, IWSDK 1.0.0-rc.2 and `@react-three/xr` all build on it. `setupWebGLXRFallback()` (`three/addons/webxr/WebGLXRFallback.js`) swaps in a WebGL-backend renderer automatically when `XRGPUBinding` is missing, for pages that do start on `WebGPURenderer`.
- Core building blocks: `renderer.xr.enabled = true`, `renderer.setAnimationLoop(fn)` (required for WebXR frames), `XRButton`/`VRButton`/`ARButton` from `three/addons/webxr/`, `XRControllerModelFactory` and `XRHandModelFactory` for rendering the controllers/hands three gives you. r186 added MSAA for XR layers and fixed WebGPU XR camera issues; r185 added WebXR on the WebGPU backend and the WebGL fallback described above.
- Frameworks beyond core: `@react-three/xr` v6 (pmndrs) wraps R3F with a store and XR pointer event handlers. Meta's IWSDK (Immersive Web SDK, MIT) pairs three.js with an ECS, XR input (hands, locomotion, grabbing), spatial audio, Havok physics and an MCP runtime for agent tooling (`npx create @iwsdk@latest`); its `IWER` emulator runs XR in a desktop browser without a headset.
- Performance: Quest apps are usually fill-rate bound. Use fixed foveated rendering (`renderer.xr.setFoveation(value)`), multiview where supported, one directional or point light with PBR, KTX2 textures, no heavy post-processing, and lower the framebuffer scale if frame time is tight; `updateTargetFrameRate` can raise the target frame rate on devices that support more than the default.
- Design for input diversity, not just controllers: Vision Pro has no physical controllers (gaze-and-pinch only), so a controller-only interaction model excludes it entirely. Always request `optionalFeatures: ['hand-tracking']` rather than assuming controllers exist.

## Pitfalls

- Believing "Quest exposes WebXR through WebGPU" from a secondary source: the three.js project itself says the opposite (issue 32858). Default Quest content to `WebGLRenderer`.
- Testing only in desktop emulation and never on a real headset: emulators do not reproduce fill-rate limits, foveation, or Vision Pro's gaze-and-pinch input model.
- Forgetting `optionalFeatures: ['hand-tracking']` on the session request: hand tracking silently never activates even on a headset that supports it.
- Building DOM overlays into a WebXR experience and assuming they exist in the headset: DOM overlay support and behavior differ by platform, and some XR contexts have no DOM overlay at all.
- Assuming iOS Safari will eventually get inline WebXR support because some articles claim it already has: as of the source checked, iPhone/iPad Safari has none, and any article claiming iOS 18 inline AR support should be treated as wrong or unverified until checked against WebKit's own release notes.

## Verify

- `tw check <page>` reports the renderer and backend line even for a WebXR page rendered outside a session (the desktop preview before entering XR).
- `tw check <page> --eval "renderer.xr.enabled"` confirms XR is actually turned on before assuming a session-entry bug is something else.
- A real headset (or, at minimum, the IWER desktop emulator) is the only reliable verification for foveation, hand tracking and input model differences; no `tw` command substitutes for an actual XR session.

## Notes

- 2026-09-26: written from the scenarios research (section A8) and the direction research (section 4.4), citing three.js issue 32858 for the Quest/WebGPU binding gap and the r185/r186 release notes for what changed in WebXR on the WebGPU backend.

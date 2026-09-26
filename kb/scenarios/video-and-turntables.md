---
title: Video output and turntables
slug: video-and-turntables
kind: scenario
summary: Frame-exact MP4, WebM, GIF or ProRes from a three.js page, driven by a virtual clock instead of wall-clock capture, for turntables, loops and social clips.
tags: [video, turntable, mp4, gif, webm, alpha, ffmpeg, capture, deterministic, loop]
applies_to: ">=r152"
status: current
renderer: webgl
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-video-and-games.md, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, kb/recipes/capture-stills-and-video.md]
related: [capture-stills-and-video, verification-ladder, fixed-timestep-loop, seeded-randomness, renderer-choice]
template: html-importmap
---

# Video output and turntables

## When

- A three.js scene needs to become a video file: a product turntable, a README GIF, a social clip, a loop for a landing page background.
- The output must be reproducible frame for frame (a CI-checked asset, a render farm job), not just "recorded once and hoped for the best."
- Not for live streaming or screen-recording a live user session; this scenario is about deterministic, offline capture of a scene you control.

## Stack

| need | first choice | avoid |
|---|---|---|
| deterministic headless capture, any resolution | a virtual clock stepping the scene frame by frame, captured per frame, muxed with ffmpeg (`tw video`) | `canvas.captureStream()` + `MediaRecorder`: real-time only, and has a known black-frame bug in headless Chrome under ANGLE+SwiftShader |
| in-browser encode with no ffmpeg | WebCodecs `VideoEncoder` plus a muxer (`mediabunny`, the successor to `mp4-muxer`/`webm-muxer`), or `canvas-record` as a ready-made wrapper | — |
| composed video with React UI, text, audio | Remotion + `@remotion/three`'s `<ThreeCanvas>` (drives the virtual clock itself) | — |
| simple in-page turntable/loop capture | CCapture.js 2.0 (WebCodecs backend, decoupled from real time) | — |

- `WebGLRenderer` is the renderer default for capture: render hosts often have no WebGPU adapter (SwiftShader gives WebGL but not WebGPU in this container's `tw doctor`), so a WebGPU scene would silently fall back to WebGL2 mid-pipeline and change pixels. Assert `renderer.backend.isWebGPUBackend` at startup if a WebGPU-specific effect must be captured, and fail the job rather than accept a silent fallback (`renderer-choice`, `webgpu-backend-check`).

## Build

- Use `tw video <page> --out clip.mp4 --seconds 6 --fps 30 --size 1920x1080` (H.264, `yuv420p`, BT.709 tags, faststart) — verified against `templates/html-importmap` and `templates/html-webgpu`. See `capture-stills-and-video` for the full command set (GIF, WebM alpha, ProRes 4444 alpha).
- Drive every animated value from time, never from a per-frame increment: `THREE.Timer` in the simple case, or a custom `window.__tw.renderFrame(i, fps)` hook for a scripted turntable or camera path (exact code in `capture-stills-and-video`).
- `templates-wip/video-turntable` exists as a starting point but is **unverified** (moved to `templates-wip/` pending a `tw check`, `tw lint` and looked-at `tw shot` pass); prefer building from the verified `html-importmap` template plus the Timer/renderFrame pattern until it is promoted.
- Encoding: `-pix_fmt yuv420p` for broad player compatibility, `-movflags +faststart` for web delivery, CRF 17–18 with `-preset slow` for near-master quality or CRF 23 with `-preset medium` for lighter social delivery. Tag `-color_primaries bt709 -colorspace bt709 -color_trc iec61966-2-1` explicitly for HD or larger output.
- GIF: the two-pass `palettegen`/`paletteuse` filter pair, scaled to 640–800 px wide, 12–15 fps, 3–6 s, under 5 MB for a README.
- Alpha video: ProRes 4444 (`-pix_fmt yuva444p10le`) for desktop compositing handoff (After Effects, Premiere, Final Cut); VP9 (`-pix_fmt yuva420p`) for web `<video>` playback. Neither codec claim was independently re-verified this pass; confirm codec support with the receiving tool before committing to one.

## Pitfalls

- Never rely on `canvas.captureStream()` + `MediaRecorder` for anything that must be exact or run headless; it follows wall-clock time, not simulation time, and produces black frames under headless SwiftShader in some Chrome builds.
- A transparent output needs a transparent page: `alpha: true` on the renderer, a cleared clear color, no `scene.background`, and no CSS background on `html`/`body`/canvas — `tw video --alpha` and `tw shot --alpha` also stop Chrome painting its own white page background behind the canvas.
- Physics or GSAP timelines driven by wall-clock delta during capture give non-reproducible output; step Rapier by a fixed `dt` matching the video framerate, and `seek()`/`progress()` GSAP or Theatre.js timelines explicitly to the frame's time rather than letting them play.
- A loop's last frame should stop one step short of a full turn (360 degrees), or the loop visibly stutters on repeat.

## Verify

- `tw video` prints the frame count, fps, size and driver (`virtual clock` or `page renderFrame()`); a wrong frame count means the `--seconds`/`--fps` flags do not match what the page expects.
- Check the file without watching it: `ffprobe -show_entries stream=codec_name,pix_fmt,nb_frames,r_frame_rate,color_transfer` for the container, and `ffmpeg ... blackdetect ... freezedetect` to confirm no black stretches or stalls.
- Pull a frame strip (`select='not(mod(n\,15))'`, tiled) and look at one small image to confirm motion, rather than watching the whole clip.
- Alpha: decode one frame and read a corner pixel; `0 0 0 0` means transparent.

## Notes

- 2026-09-26: written from the 2026-09-26 research (video-and-games, 3d-dataviz-and-docs) and the verified `tw video`/`tw shot` runs recorded in `capture-stills-and-video`. Capture of the WebGPU backend itself (not the WebGL2 fallback) is unverified in this container; ProRes/VP9-alpha compatibility claims are flagged unverified in the source research.

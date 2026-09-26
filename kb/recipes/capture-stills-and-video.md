---
title: Capture stills and video from a three.js page
slug: capture-stills-and-video
kind: recipe
summary: Get a PNG, a contact sheet, or a frame-exact MP4, WebM, GIF or ProRes from a page, headless and deterministic, and check the result without watching it.
tags: [screenshot, png, video, mp4, gif, turntable, ffmpeg, capture, headless, loop]
applies_to: ">=r152"
status: current
renderer: both
last_verified: 2026-09-26
sources: [https://threejs.org/manual/#en/tips, https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL, ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, scripts/lib/video.mjs, scripts/lib/inject.mjs]
related: [verification-ladder]
template: html-importmap
---

# Capture stills and video from a three.js page

## Goal

A still or a video of a page, reproducible frame for frame on any machine, without a screen recorder and without guessing whether the output is right.

## Code

Stills from the command line (the page is served, loaded, settled, then captured by the browser, so `preserveDrawingBuffer` is not needed):

```sh
node scripts/tw.mjs shot page/ --out hero.png --size 1280x720 --dpr 2   # one image, prints its token cost
node scripts/tw.mjs sheet page/ --out sheet.png                          # current, front, right and top views
```

Stills from inside the page: render and read the canvas in the same task, because the drawing buffer is cleared after it is presented.

```js
function snapshot(renderer, scene, camera) {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}
```

Video: time is virtual, so a 10 second clip at 60 fps is exactly 600 frames however slow the machine is.

```sh
node scripts/tw.mjs video page/ --out clip.mp4 --seconds 6 --fps 30 --size 1920x1080   # H.264, yuv420p, BT.709 tags, faststart
node scripts/tw.mjs video page/ --out loop.gif --seconds 3 --fps 15 --size 640x360     # palettegen and paletteuse
node scripts/tw.mjs video page/ --out clip.webm --alpha --seconds 4                     # VP9 with an alpha channel
node scripts/tw.mjs video page/ --out clip.mov --alpha                                  # ProRes 4444 with alpha, for editors
```

Transparent output needs a transparent page: `new THREE.WebGLRenderer({ alpha: true })`, `renderer.setClearColor(0x000000, 0)`, no `scene.background` and no CSS background on `html`, `body` or the canvas. With `--alpha`, tw also stops Chrome from painting its white page background behind the canvas. `tw shot --alpha` does the same for a PNG.

Drive animation from time, never from a per-frame increment, so the virtual clock controls it:

```js
import * as THREE from 'three';

const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  mesh.rotation.y = timer.getElapsed() * 0.5;
  renderer.render(scene, camera);
});
```

For full control (a seamless turntable, a scripted camera path), define the frame yourself; tw calls it once per frame instead of advancing the clock. The last frame of a loop stops one step short of 360 degrees:

```js
const tw = (window.__tw ??= {});
tw.duration = 4;
tw.fps = 30;
tw.renderFrame = (i, fps) => {
  const turns = i / (tw.duration * fps);
  pivot.rotation.y = turns * Math.PI * 2;
  renderer.render(scene, camera);
};
```

## Verify

- `tw video` prints the frame count, the fps, the size and the driver (`virtual clock` or `page renderFrame()`); a wrong frame count means the duration or fps flags are wrong.
- Check the file without watching it (ffprobe and ffmpeg):

```sh
ffprobe -v error -show_entries stream=codec_name,pix_fmt,nb_frames,r_frame_rate,color_transfer -of compact clip.mp4
ffmpeg -v error -i clip.mp4 -vf "select='not(mod(n\,15))',scale=320:-1,tile=4x1" -frames:v 1 strip.png
ffmpeg -hide_banner -i clip.mp4 -vf "blackdetect=d=0.1:pix_th=0.05,freezedetect=n=0.001:d=0.5" -f null - 2>&1 | grep -E "black_|freeze_"
```

- Look at `strip.png` (one small image) to confirm motion; no `black_` or `freeze_` lines means no black stretches and no stalls.
- For stills, `tw shot` reports the pixel size and the image token cost; the default sheet is 960x540 and costs 700 tokens.
- Alpha: decode one frame and read a corner pixel; `0 0 0 0` means transparent (`ffmpeg -v error -c:v libvpx-vp9 -i clip.webm -frames:v 1 f.png`, then `ffmpeg -v error -i f.png -vf "crop=1:1:0:0,format=rgba" -f rawvideo - | od -An -tu1`).

## Notes

- 2026-09-26: written from the tw video, shot and sheet runs on templates/html-importmap and templates/html-webgpu (MP4, WebM, GIF, MOV, canvas capture, frames directory all verified with a static ffmpeg build; alpha verified in WebM VP9 and ProRes 4444 after tw learned to clear Chrome's page background); the in-page toDataURL rule is from the three.js manual Tips page. Capture of the WebGPU backend itself (not the WebGL 2 fallback) is unverified.
- 2026-09-26: tw video --capture canvas used to record blank frames on render-on-demand pages (nothing drawn since the last present). tw now replays the last frame's screen passes when a step drew nothing; checked on templates/surface and globe. The default page capture still includes HTML overlays such as CSS2D labels; canvas capture does not.
- 2026-09-26: tw video also steps a page through window.advanceTime(ms), the game-testing convention, when the page defines it and has no __tw.renderFrame (tests/fixtures/pages/advance-time).

---
title: Pixel art render target
slug: pixel-art-render-target
kind: recipe
summary: Draw pixel art or pixel-3D into a small render target, snap the camera to whole art pixels, and upscale with a sub-pixel offset so pans stay smooth and pixels stay square.
tags: [pixel art, pixel-3d, render target, low resolution, upscale, nearest, sharp bilinear, camera snap]
applies_to: ">=r152"
status: current
renderer: webgl
last_verified: 2026-11-19
sources: [https://github.com/isadorasophia/murder, https://colececil.io/blog/2017/scaling-pixel-art-without-destroying-it]
related: [resize-and-pixel-ratio, cameras-and-controls]
template: html-importmap
---

# Pixel art render target

## Goal

A game or scene that looks like low-resolution pixel art at any window size. The world renders into a
`WebGLRenderTarget` the size of the art (for example 320x180) plus a small bleed margin. The camera moves in
whole art pixels, so sprites and voxels never swim. The leftover fraction of a pixel is applied when the
target is drawn to the screen, so the camera still pans smoothly. A sharp-bilinear upscale keeps every art
pixel the same width when the window is not a whole multiple of the art.

The bleed margin and sub-pixel offset come from the Murder engine (isadorasophia/murder, MIT). The
sharp-bilinear sampling is Cole Cecil's idea ("Scaling Pixel Art Without Destroying It", 2017). This code is
written fresh for threewright; none was copied.

## Code

```js
import * as THREE from 'three';

const ART_W = 320, ART_H = 180; // the art's screen size in art pixels
const BLEED = 2;                // spare pixels on each side, hidden by the offset
const PPU = 16;                 // art pixels per world unit

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1); // the upscale shader does the scaling; keep the buffer simple
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const lowRes = new THREE.WebGLRenderTarget(ART_W + 2 * BLEED, ART_H + 2 * BLEED, {
  minFilter: THREE.LinearFilter, // linear on purpose: the shader below decides where blending happens
  magFilter: THREE.LinearFilter,
  generateMipmaps: false,
});

// World camera: one world unit is PPU art pixels.
const halfW = (ART_W + 2 * BLEED) / PPU / 2, halfH = (ART_H + 2 * BLEED) / PPU / 2;
const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
camera.position.z = 10;

// Screen pass: a full-screen triangle pair that samples the low-res target.
const screenScene = new THREE.Scene();
const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const upscale = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: lowRes.texture },
    uTexSize: { value: new THREE.Vector2(ART_W + 2 * BLEED, ART_H + 2 * BLEED) },
    uView: { value: new THREE.Vector2(ART_W, ART_H) },
    uOffset: { value: new THREE.Vector2(BLEED, BLEED) }, // in art pixels: bleed + sub-pixel fraction
    uScale: { value: new THREE.Vector2(1, 1) },          // screen pixels per art pixel
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D uTex;
    uniform vec2 uTexSize, uView, uOffset, uScale;
    varying vec2 vUv;
    void main() {
      vec2 t = uOffset + vUv * uView - 0.5;      // texel space, texel centres on integers
      vec2 base = floor(t);
      vec2 f = clamp((t - base - 0.5) * uScale + 0.5, 0.0, 1.0); // blend only one screen pixel wide
      gl_FragColor = texture2D(uTex, (base + 0.5 + f) / uTexSize);
      #include <colorspace_fragment>
    }`,
  depthTest: false,
  depthWrite: false,
});
screenScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), upscale));

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  upscale.uniforms.uScale.value.set(window.innerWidth / ART_W, window.innerHeight / ART_H);
}
window.addEventListener('resize', onResize);
onResize();

// follow: the smooth position the camera wants (a lerp towards the player, say).
function renderPixelFrame(scene, follow) {
  const sx = Math.floor(follow.x * PPU), sy = Math.floor(follow.y * PPU);
  camera.position.x = sx / PPU; // whole art pixels: the world stays on the grid
  camera.position.y = sy / PPU;
  upscale.uniforms.uOffset.value.set(BLEED + (follow.x * PPU - sx), BLEED + (follow.y * PPU - sy));

  renderer.setRenderTarget(lowRes);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(screenScene, screenCamera);
}
```

Use it from the loop: `renderer.setAnimationLoop(() => renderPixelFrame(scene, follow));`. Textures on
sprites and models in the world use `NearestFilter` and no mipmaps, as for any pixel art.

Choices:

- Whole-number scale first. If bars are acceptable, size the canvas to `floor(min(w / ART_W, h / ART_H))`
  times the art and centre it; every art pixel is then exactly that many screen pixels. The shader above is
  for the fill-the-window case and still gives square, even pixels at 2.5x.
- Pure nearest instead of sharp-bilinear: set `minFilter`/`magFilter` to `NearestFilter`. Pixels then have uneven 2 and 3 pixel widths at fractional scale, and the
  sub-pixel pan only moves in whole screen pixels.
- A rotated or perspective 3D camera: snap in the camera's own axes (project the follow point onto the
  camera's right and up vectors), not world x and y, or the world shimmers as the view turns.

## Verify

- `tw check <page>`: no errors; the `renderer:` line shows the full window size and pixel evidence shows
  coverage in the frame (the screen pass drew).
- `tw check <page> --eval "[lowRes.width, lowRes.height]"` on a page that keeps `lowRes` global must print
  `[324, 184]` for the defaults.
- Pan check: `tw shot` twice with `--eval` setting the follow point 0.5 art pixels apart. The two images must
  differ, and each art pixel must stay a square block (zoom one image).
- Verified 2026-11-19 on Windows 11, Chrome headless, RTX 5060 Ti (WebGL), three 0.186.1. A harness page ran
  the Code block unchanged with 40 rotated 2x2-texel sprites. `tw check --size 800x450 --eval
  "[lowRes.width, lowRes.height]"` printed `eval: [324,184]` and `result: OK`; `tw lint` 0 errors, 0 warnings.
  Two `tw shot`s with the follow point 0.5 art pixels apart differed; the shot showed square, even art
  pixels at 2.5x with jagged (unsmoothed) rotated edges.

## Notes

- 2026-11-19: written from the Murder engine's RenderContext (bleed, floored camera, sub-pixel offset at
  upscale) and Cole Cecil's sharp-bilinear method, as a technique harvest. A Python model of the sampling at
  2.5x on a 24x24 sprite: nearest gives uneven 2 and 3 pixel runs; sharp-bilinear gives even runs with about
  30% of pixels blended, all in one-pixel edge bands; plain bilinear blends 97%.

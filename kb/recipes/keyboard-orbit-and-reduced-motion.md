---
title: Keyboard orbit and reduced motion
slug: keyboard-orbit-and-reduced-motion
kind: recipe
summary: A real keyboard rotate/zoom scheme for OrbitControls (whose default arrow keys only pan) plus a prefers-reduced-motion branch that turns off auto-rotate.
tags: [accessibility, keyboard, orbitcontrols, reduced motion, focus ring]
applies_to: ">=r175"
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md, ai-docs/research/2026-09-26-core-r160-r186.md]
related: [accessibility, cameras-and-controls]
template: html-importmap
---

# Keyboard orbit and reduced motion

## Goal

Make an `OrbitControls` canvas actually keyboard-navigable (its own arrow keys pan, not rotate, by default) and respect `prefers-reduced-motion` by turning off auto-rotate rather than leaving a moving turntable running for a user who asked not to see it.

## Code

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = renderer.domElement;
canvas.tabIndex = 0; // focusable
canvas.style.outline = 'revert'; // keep the browser's default focus ring instead of removing it

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotate = !reduceMotion; // never auto-rotate for a reduced-motion visitor
controls.autoRotateSpeed = 1.2;

let paused = controls.autoRotate === false;

// A visible pause control satisfies WCAG 2.2.2 (Pause, Stop, Hide) for any
// auto-rotation running more than five seconds, independent of the OS setting.
const pauseButton = document.getElementById('pause-rotate');
pauseButton.hidden = !controls.autoRotate; // no button needed if it never auto-rotates
pauseButton.addEventListener('click', () => {
  paused = !paused;
  controls.autoRotate = !paused;
  pauseButton.setAttribute('aria-pressed', String(paused));
});

// OrbitControls' own listenToKeyEvents wires its DEFAULT scheme: plain arrows
// pan, Ctrl/Meta/Shift+arrow rotates. That is not an accessible "keyboard
// orbit" on its own, so add a dedicated rotate/zoom scheme on top of it.
const ROTATE_SPEED = 0.03;
const ZOOM_STEP = 0.15;

canvas.addEventListener('keydown', (event) => {
  let handled = true;
  switch (event.key) {
    case 'ArrowLeft':  rotateBy(-ROTATE_SPEED, 0); break;
    case 'ArrowRight': rotateBy(ROTATE_SPEED, 0); break;
    case 'ArrowUp':    rotateBy(0, -ROTATE_SPEED); break;
    case 'ArrowDown':  rotateBy(0, ROTATE_SPEED); break;
    case '+':
    case '=':          zoomBy(1 - ZOOM_STEP); break;
    case '-':          zoomBy(1 + ZOOM_STEP); break;
    case 'Home':       resetView(); break;
    default:           handled = false;
  }
  if (handled) event.preventDefault(); // stop the page itself from scrolling on arrow keys
});

function rotateBy(azimuthDelta, polarDelta) {
  const spherical = new THREE.Spherical().setFromVector3(
    camera.position.clone().sub(controls.target)
  );
  spherical.theta += azimuthDelta;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + polarDelta, 0.05, Math.PI - 0.05);
  camera.position.setFromSpherical(spherical).add(controls.target);
  controls.update();
}

function zoomBy(factor) {
  camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
  controls.update();
}

function resetView() {
  // restore your own known-good starting camera position/target here
  controls.update();
}
```

Give the canvas an `aria-label` and, if it carries information rather than decoration, `role="img"` plus `aria-describedby` pointing at a written summary and a DOM table; see `accessibility` for the full checklist this recipe only covers the motion/keyboard piece of.

## Verify

- `tw check <page> --reduced-motion` runs the page with `prefers-reduced-motion: reduce` emulated; `tw check <page> --eval "controls.autoRotate"` in that run should read `false`, and without the flag (a normal run) it should read `true` if the page intends to auto-rotate by default.
- `tw check <page> --eval "document.activeElement === renderer.domElement"` after simulating a Tab key (or just checking `canvas.tabIndex`) confirms the canvas is actually focusable, a prerequisite for any keyboard scheme to reach it at all.
- A manual keyboard pass (Tab to the canvas, try each key) is the real proof that rotate/zoom/reset work as intended; text checks above confirm the wiring exists, not that it feels right.

## Notes

- 2026-09-26: written from the dataviz research (section 5, the arrow-keys-pan-by-default fact and the WCAG 2.2.2/`prefers-reduced-motion` rules) cross-checked against `node_modules/three/examples/jsm/controls/OrbitControls.js` `_handleKeyDown` in the installed 0.186.1 (confirmed directly in `cameras-and-controls`).

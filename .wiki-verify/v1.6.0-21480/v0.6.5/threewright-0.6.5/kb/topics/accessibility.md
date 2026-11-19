---
title: Accessibility for three.js pages
slug: accessibility
kind: topic
summary: Naming the canvas, keyboard orbit, reduced motion, colorblind-safe data color, and the DOM table every information-carrying scene needs.
tags: [accessibility, aria, reduced motion, keyboard, wcag, canvas, colorblind]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-3d-dataviz-and-docs.md]
related: [keyboard-orbit-and-reduced-motion, text-and-labels, cameras-and-controls]
---

# Accessibility for three.js pages

## Essentials

- Name and describe the canvas: `role="img"`, a short `aria-label`, and `aria-describedby` pointing at a paragraph that states the finding in words, not just "3D chart". Put the data table (or a CSV download) in the DOM after the canvas, never inside it: fallback content placed inside a `<canvas>` element is read as one flat string by assistive technology, so it does not work as a navigable table.
- Keyboard: `OrbitControls` only listens to keys after `controls.listenToKeyEvents(window)` (or a specific element), and its default arrow-key behavior is pan, not rotate (checked against the installed source; see `cameras-and-controls`). Make the canvas focusable (`tabindex="0"`) with a visible focus ring, and add a real key scheme (arrows or WASD to rotate, plus/minus to zoom, Home to reset) rather than relying on the default. `<model-viewer>` with `camera-controls` already supports arrow-key rotation and gives an audible and visual interaction prompt.
- Motion: WCAG 2.2.2 (Pause, Stop, Hide, level A) applies to any auto-rotation or animation that runs more than five seconds, so give auto-rotate a pause control. Honour `prefers-reduced-motion: reduce` by turning off auto-rotate and damping-driven inertia, and by replacing an animated turntable with a still image or a small set of fixed views rather than a moving one. WCAG 2.3.3 (Animation from Interactions, AAA) covers motion that a user interaction triggers, such as a scroll-scrubbed camera flight.
- Color: use a colorblind-safe palette for categorical data (viridis family or Okabe-Ito) and, when color encodes data on a lit or shaded surface, keep it unlit (`MeshBasicMaterial`, or otherwise low-contrast lighting) since shading changes perceived luminance and confounds a luminance-based colormap; a map that varies mainly in hue or saturation (for example Moreland's cool-warm) fares better on a shaded surface than one with a large luminance ramp (viridis). Add a redundant encoding (size, shape, a label) for categories so color alone never carries the whole distinction.
- Text alternatives: write the finding in words next to the figure, give exact values in a table rather than asking the reader to judge them by eye in 3D, and offer a 2D alternative view (a heatmap, a contour plot, small multiples) for anyone who cannot use the 3D view at all.

## Pitfalls

- Fallback content inside `<canvas>...</canvas>`: it exists for browsers with no canvas support, and screen readers read it as one string, not a table. A `role="img"`/`aria-describedby` pair plus a real DOM table after the canvas is the only combination that actually works.
- Auto-rotate with no pause control and no `prefers-reduced-motion` check: fails WCAG 2.2.2 outright for any rotation lasting more than five seconds, and is a genuinely uncomfortable experience for vestibular-motion-sensitive users.
- Assuming `OrbitControls`' arrow keys rotate: they pan by default. Testing "keyboard access" by pressing arrow keys and seeing the view move is not proof that orbit is keyboard-accessible; check that a modifier or a custom binding actually rotates.
- Encoding a data value only in hue on a shaded 3D surface: the shading's own luminance variation competes with a luminance-heavy colormap and can make the "true" data value unreadable regardless of colorblindness.
- Treating a screenshot or a turntable video as the accessible deliverable on its own: neither is text, so neither satisfies a screen-reader user without an `alt`/`aria-label` and a written finding alongside it.

## Verify

- `tw check <page>` cannot see ARIA attributes directly, but a quick grep of the page for `role="img"`, `aria-label` and a `<table>` after the canvas is a cheap text-only check before any screenshot.
- Test reduced motion the same way the page's own visitors would trigger it: `tw check <page> --reduced-motion` runs the page with `prefers-reduced-motion: reduce` emulated; confirm auto-rotate and scroll-driven camera flights are off in that run (see `keyboard-orbit-and-reduced-motion`).
- A manual keyboard pass (Tab to the canvas, check the focus ring, try the documented key scheme) is the actual proof for keyboard accessibility; no `tw` command substitutes for it.

## Notes

- 2026-09-26: written from the dataviz research (section 5), citing WCAG 2.2.2 and 2.3.3, Paul J. Adam's canvas accessibility notes, and Cerovac's "Making 3D web UIs accessible" (2021), with the `OrbitControls` keyboard default cross-checked against the installed three source in `cameras-and-controls`.

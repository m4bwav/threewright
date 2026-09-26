---
title: The verification ladder (text before pixels)
slug: verification-ladder
kind: rule
summary: Prove a three.js page works with the cheapest evidence first; lint, console and scene text, model report, then one small image, and what each rung costs in tokens.
tags: [verify, debug, tokens, screenshot, check, lint, agent, black screen]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md, https://platform.claude.com/docs/en/build-with-claude/vision, scripts/tw.mjs]
related: [import-maps-and-builds, capture-stills-and-video]
---

# The verification ladder (text before pixels)

## Rule

Climb only as far as the question needs, and never report a page as working from its source alone.

| rung | command | answers | cost |
|---|---|---|---|
| 1 | `tw lint <dir>` | stale or risky API, with the release and the fix | a few lines of text |
| 2 | `tw check <page>` | exceptions, console errors and warnings, failed requests, renderer, draw calls, triangles, scene counts, bounds, camera, runtime warnings (black meshes, washed-out textures, camera off the scene, aspect mismatch) and fix hints | 15 to 30 lines of text |
| 3 | `tw scene <page>` | the scene graph as an indented tree, repeated siblings collapsed | up to `--max` lines (80 default) |
| 4 | `tw glb <model>` | model size, draw calls, triangles, texture pixels, extensions and the decoders they need, bounds, budget warnings | about 10 lines |
| 5 | `tw shot <page> --size 640x360` | one picture of the page, for a visual question only | 299 image tokens |
| 6 | `tw sheet <page>` | four camera angles in one 960x540 image (framing, scale, hidden geometry) | 700 image tokens |
| 7 | `tw video <page>` then a frame strip | motion, loops, timing | one strip image, never the video |

- Rung 2 is the default proof that a page works: `result: OK` means no exceptions, no console errors, no failed requests and no scene warnings. Report its lines, not "it looks fine".
- Go to an image (rungs 5 to 7) only when the question is visual (composition, colour, framing, style) or when text says OK but the user reports something wrong.
- Keep images small: 640x360 or the default sheet. A 1280x720 shot costs 1196 tokens and a 1920x1080 one 2691, and every image stays in the conversation for later turns.
- Never read binary assets (GLB, HDR, EXR, KTX2, PLY, SPZ, base64 data URIs) into context; `tw glb` and file sizes answer the questions.

## Why

- Most failures in three.js pages are visible in text: a module that did not resolve, a 404 on a texture, a shader compile error, a lit material with no light, a missing colour space tag, a camera inside or far away from the bounds. Text costs tens of tokens; a screenshot costs hundreds to thousands and still needs interpreting.
- Claude's image cost is one visual token per 28 by 28 pixel patch, `ceil(w/28) * ceil(h/28)`, with images over 2576 px on the long edge or 4784 tokens scaled down on Claude 4.7 and later, and over 1568 px or 1568 tokens on earlier models (Anthropic vision docs, checked 2026-09-26). tw prints the exact cost of each image it writes.
- The three.js project tests its own examples the same way: small 400 by 250 screenshots with a fixed random seed and a pixel-difference budget, not by looking (scenarios and testing research, B1).
- An agent that describes a page it has not run reads exactly like one that did; only rung 2 or higher output is evidence.

## Notes

- 2026-09-26: written from the scenarios and testing research (B5, B6), the vision docs formula (tw's imageFit reproduces the docs table exactly) and the tw commands as built and tested this day.

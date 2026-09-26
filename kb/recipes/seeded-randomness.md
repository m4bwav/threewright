---
title: Seeded randomness
slug: seeded-randomness
kind: recipe
summary: A tiny seeded PRNG (mulberry32) to replace Math.random() wherever a scene's layout must be reproducible: tests, generative art, and screenshot diffs.
tags: [seeded randomness, prng, mulberry32, determinism, math.random]
applies_to: any
status: current
renderer: both
last_verified: 2026-09-26
sources: [ai-docs/research/2026-09-26-scenarios-xr-and-testing.md]
related: [instanced-scatter, testing, headless-and-ci]
---

# Seeded randomness

## Goal

`Math.random()` gives a different scene every run, which breaks visual regression tests, generative-art platforms that require the same output for the same input hash (fxhash and similar), and any "reproduce this exact layout" debugging request. Replace it with a small seeded PRNG so the same seed always produces the same sequence.

## Code

```js
// mulberry32: a small, fast, good-enough 32-bit PRNG. Not cryptographically
// secure; that is not the goal here, reproducibility is.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0, 1)
  };
}

const rand = mulberry32(1); // any integer seed; the same seed always gives the same sequence

// Use exactly like Math.random() everywhere a scene's layout, color or
// timing needs to be reproducible:
const x = (rand() - 0.5) * 10;
const hue = rand();

// Deriving a seed from something meaningful (a URL param, a token hash, a
// test case name) instead of hardcoding it:
function hashStringToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}
const seed = hashStringToSeed(new URLSearchParams(location.search).get('seed') ?? 'default');
const sceneRand = mulberry32(seed);
```

For a uniformly distributed point inside a disc (a common scatter pattern), use `radius = maxRadius * Math.sqrt(rand())`, not `radius = maxRadius * rand()`, or points cluster toward the center; see `instanced-scatter` for this in context. Never mix a seeded PRNG with real `Math.random()` calls in the same generative step (a stray library call, a `Date.now()`-seeded default): any unseeded call reintroduces nondeterminism into an otherwise reproducible pipeline.

## Verify

- Run the page twice with the same seed and diff two screenshots (`tw shot` twice, then `tw diff a.png b.png --threshold 0.1 --max 0.001`): identical seeds should produce a PASS with zero or near-zero pixel difference.
- `tw check <page> --eval "<call sceneRand a few times and print the sequence>"` with the same seed on two separate runs should print the identical sequence of numbers, which is the direct proof the PRNG (not just the visual result) is deterministic.
- Grep the page's own source for `Math.random(` outside of the PRNG's own implementation; any hit is a place determinism can silently break.

## Notes

- 2026-09-26: written from the scenarios research (section A7, the determinism checklist for generative art and fxhash-style platforms, which names mulberry32 and sfc32 as common seeded PRNG choices) and three.js's own e2e test practice of replacing `Math.random()` for deterministic screenshot comparisons (section B1).

---
name: threewright-games
description: "Build browser games with three.js that run, feel right and pass automated checks: a Vite and TypeScript starter with Rapier physics, a fixed-timestep loop, an input action map (keyboard, gamepad, touch), a follow camera, seeded randomness, save and pause, and test hooks that let a headless run press keys and assert that the player moved. Use whenever the user wants to make, prototype or fix a 3D web game, a game jam entry, a platformer, racer, shooter or physics toy in three.js, or asks about game loops, character controllers, Rapier, game input or shipping to itch.io, Poki or CrazyGames; also 'refresh threewright-games'. React games go through threewright-r3f first; non-game scenes stay with threewright."
---

# threewright-games

Outcome: a game that builds, type-checks, passes `tw check`, passes a scripted smoke test (inputs move the player, the simulation is deterministic by seed), and meets the done checklist, with the evidence in the reply.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Knowledge: `TW kb show games` and the entries it links.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: start from the starter

New game: `TW new game-starter <dir>`, then `npm install`. It pins three 0.186.1, @dimforge/rapier3d-compat 0.21.0, Vite and TypeScript, and carries the loop, the input layer, the window hooks and a determinism test. Keep the pins; do not add a CDN import for physics. Existing game: read its loop, input and physics first (`TW check <page> --eval "window.__game && window.__game.state()"` shows whether it has the hooks).

## Step 2: rules that keep a game correct

1. The simulation runs in fixed ticks (1/60 s, at most 4 per frame, render interpolated); nothing moves by a per-frame constant. `THREE.Timer` with `connect(document)`, never `THREE.Clock`.
2. All input goes through the action map (`event.code` for keys, polled gamepads, touch controls on coarse pointers); pointer lock only on a click, and losing it pauses.
3. The player uses Rapier's kinematic character controller; props use dynamic bodies; colliders come from simple shapes or simplified meshes; gameplay collisions use contact events and scene queries.
4. Seeded randomness only; no `Math.random()` or `Date.now()` in the simulation code.
5. glTF assets only, optimized (`threewright-assets`); clone rigged characters with `SkeletonUtils.clone`; dispose on unload; credit every asset.
6. Budgets: draw calls and triangles within `TW kb show performance --section Budgets`; instancing for repeats; shadows on one light.

## Step 3: verify (the done checklist)

Read [references/done-checklist.md](references/done-checklist.md) and run every line that applies: typecheck and build, `TW lint src`, `TW check dist`, the Node determinism test (same seed and inputs, same hash twice), the scripted smoke test through `TW check dist --eval "..."` using `window.__game`, frame-rate independence, pause on hide, touch and gamepad paths, size and draw-call budgets, one `TW shot` at 640x360.

## Step 4: report

Two to five lines: what changed, the checklist lines that passed with their numbers (moved distance, hash equality, draw calls, bundle size), and the lines not run with the reason.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered (a portal limit, a Rapier behaviour), write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: three.js game development: physics engines, loop and input patterns, performance budgets, portals, automated game testing, AI-built games; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`; references in `references/`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

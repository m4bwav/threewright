---
name: threewright-video
description: "Make videos, GIFs and stills from three.js scenes: product turntables, explainer and data animations, social clips in 16:9, 1:1 or 9:16, README GIFs, transparent overlays, image sequences; frame-exact and headless with tw video and ffmpeg, then checked without watching (frame count, colour tags, black or frozen frames, a frame strip). Use whenever the user asks to record, render, export or capture a three.js scene or page as MP4, WebM, GIF, MOV or PNG frames, make a turntable or a seamless loop, or 'turn this scene into a video'; also 'refresh threewright-video'. Not for editing existing footage and not for live screen recording of a desktop app."
---

# threewright-video

Outcome: a video file (or GIF, or frames) rendered frame by frame from the scene, with the right size, length, codec and colour tags for where it will be posted, proven by ffprobe numbers and one frame strip, never by a claim.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"` (needs ffmpeg on PATH or `TW_FFMPEG`; `TW doctor` says). Knowledge: `TW kb show <slug> --section <name>`.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: plan the output

Settle before rendering: destination (README, social, editor, web embed), aspect and size, duration, fps, loop or not, alpha or not, audio or not. `TW kb show video-and-turntables --section Budgets` has platform sizes and limits. Defaults: 1920x1080 at 30 fps H.264 for general use; 1080x1920 for vertical social; GIF 640 px wide, 15 fps, 3 to 6 s, under 5 MB for READMEs; WebM VP9 or ProRes 4444 with `--alpha` for overlays.

## Step 2: make the page capturable

- Motion must come from time, never from a per-frame constant; tw replaces the page clock, so `THREE.Timer` and `setAnimationLoop` are captured exactly.
- For exact control (turntables, camera paths, loops), define `window.__tw.renderFrame(i, fps)`, `__tw.duration` and `__tw.fps` (a game that already has `window.advanceTime(ms)` is stepped through it instead); a loop ends one step short of 360 degrees. Start from `TW new video-turntable <dir>` when it fits.
- Expose `window.__tw.ready` when assets load asynchronously. Avoid temporal effects that ghost in stepped capture (TAA) unless the page steps them itself.
- Alpha needs `alpha: true`, a transparent clear colour, no `scene.background` and no CSS background.

## Step 3: capture

`TW video <page> --out clip.mp4 --seconds 6 --fps 30 --size 1920x1080` (add `--alpha` for WebM or MOV with transparency, `--capture canvas` to read the canvas instead of the page, `--frames-dir d` for PNG frames). The recipe with every variant: `TW kb show capture-stills-and-video --section Code`.

## Step 4: verify without watching

Run the three checks in `capture-stills-and-video` `## Verify`: ffprobe (codec, pix_fmt, frame count, fps, colour transfer), a four-frame strip image looked at once, and blackdetect plus freezedetect with no hits. Check the file size against the destination limit. A loop: compare the first frame with the frame after the last (they should differ by one step).

## Step 5: report

One to three lines: file path, codec, size in pixels and MB, duration and frame count, the driver (`virtual clock`, `page renderFrame()` or `page advanceTime()`), and the check results.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found (an ffmpeg flag, a platform limit), or an environment fact is discovered (which ffmpeg build has which encoders), write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: deterministic capture of three.js scenes, encoding settings and platform video specs, video tools for agents; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

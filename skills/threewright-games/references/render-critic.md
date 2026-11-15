# Blind render critic loop

A second agent judges the scene from screenshots alone, so it cannot excuse what the code meant to draw. From the Abyssal Garden thread (r/ClaudeAI, 2026-11; a one-prompt 97 KB WebGPU world whose author credits this loop for landing a vague brief). Unverified as a measured gain here.

## Loop

1. Shoot a fixed set of views: `tw sheet <page> --out s.png --views current,front,right,top`, or several `tw shot --eval "<js that moves the camera>"`. Keep the same views every round.
2. Start a fresh subagent. Give it only the images and a one-paragraph brief of what the scene should show. No code, no prompt history, no file paths.
3. Ask for a numbered list of visual defects, worst first, each with where in the image it is (tile and region) and a severity 1 to 3. Ask it to say "no severity 3 or 2 defects" when that is true.
4. Fix the top defects, reshoot the same views, and start a new critic (never reuse one; it remembers its old list).
5. Stop when the critic reports no severity 3 or 2 defects, or after 5 rounds. Report the last list.

## Critic prompt

> You see screenshots of a 3D scene. It should show: <brief>. You do not see the code. List every visual defect, worst first: floating or clipped geometry, z-fighting, seams, noise or stray fragments, wrong scale, flat or blown-out lighting, empty or cluttered composition, anything that does not read as the brief. For each: image and region, what is wrong, severity 1 (polish) to 3 (breaks the scene). Say "no severity 3 or 2 defects" if none.

## Pair it with

- `tw perf <page> --fly "<camera path using u>" --target-ms 16.7` so each round also checks frame time on the same path.
- Low, Medium and High detail presets in procedural scenes, so a phone loads Low and still plays. Check `tw check --size 390x844` on Low.
- Save the build prompt next to the output as `prompt.txt` so the scene can be rebuilt.

The same "critic sees only the output" rule suits sprites (pixelwright) and video takes (cinewright-qc).

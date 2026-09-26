# Game done checklist

Run each line that applies before calling a game done, and report the evidence (a number, a hash, a command's result line). From the 2026-09-26 games research (Implications) and the game-starter template's hooks.

| # | check | how | passes when |
|---|---|---|---|
| 1 | types, build, lint | `npm run typecheck && npm run build`, `tw lint src` | exit 0; tw lint 0 errors |
| 2 | page health | `tw check dist` | `result: OK`: no exceptions, console errors or failed requests; the `pixels:` line shows content |
| 3 | determinism | `npm test` (the Node simulation test) | the same seed and inputs give the same hash twice |
| 4 | inputs move the player | `tw check dist --eval "<script>"` that reads `window.__game.state()`, holds an action for N ticks with the hooks, steps, and reads the state again | the player moved the right way; jump lands; grounded at rest |
| 5 | frame-rate independence | step the same inputs at 30, 60 and 144 fps (`__game.step`, or the loop with a forced frame time) | positions match within a small tolerance |
| 6 | replay | record inputs, reload, replay | the same hash across reloads |
| 7 | pause | hide the tab (or press Escape) | the simulation and audio stop; resuming does not jump |
| 8 | every input path | keyboard, gamepad (standard mapping), touch on a coarse pointer | each moves the player |
| 9 | budgets | `tw check` draw calls and triangles; bundle size from the build | within `performance` budgets; first load under the portal's limit (for example Poki about 8 MB initial) |
| 10 | memory | restart the level several times with `tw check --eval` | geometries and textures in `renderer.info.memory` stay flat |
| 11 | sizes | `tw check dist --size 390x844` and `--size 1920x1080` | both OK; UI inside safe areas |
| 12 | full loop | title, play, pause, game over, restart; settings persist | every state reachable by input |
| 13 | embedding | load the build inside an iframe with no login | runs; no top-level navigation |
| 14 | looks right | one `tw shot dist --size 640x360` | the scene reads at a glance |
| 15 | credits | a credits file lists every asset and its licence | present |

Lines 3 to 6 need the window hooks the starter exposes (`window.__tw.ready`, `window.__game` with `state()`, `pause()`, `step(n)`, input injection, `record()`, `replay()`, `hash()`). A game without them gets them added first; they cost a few dozen lines and make every later check cheap.

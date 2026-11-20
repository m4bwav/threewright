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
| 12a | play soak | `tw play dist --monkey --seconds 60 --seed N` for N = 1, 2, 3; a goal bot with `--bot bot.mjs` (exports `decide(state, ctx)`, returns an `--actions` string, `done <why>` or `fail <why>`) | every run ends `timeout` or `done`, never `crash` or `stuck`; for a failure, `result.json` has the reason and exception, `fail.png` the frame, `trace.jsonl` the inputs that led there (rerun the same seed to reproduce). State comes from `__game.snapshot()`, `__game.state()` or `render_game_to_text()` (or `--state "<js>"`); keep wall-clock time out of it or `--stuck` never fires |
| 13 | embedding | load the build inside an iframe with no login | runs; no top-level navigation |
| 14 | looks right | one `tw shot dist --size 640x360` | the scene reads at a glance |
| 14a | repeatable shots | load `dist/index.html?manual&seed=N` (no animation loop runs), `__game.advance(seconds)`, then `tw shot` with that `--eval` | two runs give the same hash and the same picture; nothing depended on wall-clock timing |
| 15a | blind critic | the loop in [render-critic.md](render-critic.md): a fresh subagent sees only `tw sheet` views | no severity 3 or 2 defects, or 5 rounds reported |
| 15b | frame time on a path | `tw perf dist --fly "<camera path using u>" --target-ms 16.7` (or a page's `window.flyThrough(u)`) | `target ... OK`; the same path every run |
| 15 | credits | a credits file lists every asset and its licence | present |

Lines 3 to 6 need the window hooks the starter exposes (`window.__tw.ready`, `window.__game` with `state()`, `pause()`, `step(n)`, `advance(seconds)` with `?manual`, input injection, `record()`, `replay()`, `hash()`). A game without them gets them added first; they cost a few dozen lines and make every later check cheap.

## tw play: closed-loop runs (line 12a)

`tw play <page|dist>` loads the page like `tw check`, then ticks every `--tick` ms (default 100) for `--seconds` (default 60), or `--ticks N`:

1. Read the state: `--state "<js>"`, else `window.__game.snapshot()`, else `__game.state()`, else `render_game_to_text()`. With none of these it hashes a small screenshot instead.
2. Pick an action: the bot's `decide(state, ctx)` (state parsed from JSON when it is JSON; `ctx` has `tick`, `t` in seconds, `seed`, `rng()` seeded, `width`, `height`, `frames`, and `page.eval(js)`; an optional `init(ctx)` runs once), or the seeded monkey (keys from `--keys`, default WASD, arrows, Space, Enter; clicks, moves, drags). Same seed, same monkey actions.
3. Send it as trusted input and log `{tick, t, hash, state, action}` to `trace.jsonl`.

It stops on: an uncaught exception or a dead tab (`crash`), the state (or frame) unchanged for `--stuck` seconds, no animation frame for 2 s, or a main thread that stops answering (`stuck`), the bot's `done` or `fail`, or the time (`timeout`). `result.json` holds the status, reason, failure tick, first exception with its stack, console errors with counts, failed requests and the seed; `fail.png` is the frame at the failure tick. Exit 1 on crash, stuck, fail or any exception. `--stuck 0` turns stuck detection off (a menu that waits for input on purpose). Output goes to `--out` (default `tw-play/seed-N`).

File each crash or stuck run as a bug with the seed and the trace path; rerunning the same seed replays the same inputs (timing can still differ, so a rare crash may need a few runs).

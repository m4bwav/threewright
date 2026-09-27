# Headless eval results

Graded by evals/headless/grade.py. 69 runs, $39.10. A with-plugin run passes only if the Skill tool fired the expected skill, no tool call inside its workspace was denied (edits to the loaded plugin copy are refused by design), and the evidence held. Baselines (base) show what happens without the plugin.

## By case

| skill | case | arm | passed |
|---|---|---|---|
| threewright | action-1 | with | 3/3 |
| threewright | outcome-1 | base | 1/1 |
| threewright | outcome-1 | with | 3/3 |
| threewright-assets | action-1 | with | 3/3 |
| threewright-assets | outcome-1 | base | 1/1 |
| threewright-assets | outcome-1 | with | 3/3 |
| threewright-curate | action-1 | with | 3/3 |
| threewright-curate | outcome-1 | with | 3/3 |
| threewright-debug | action-1 | with | 3/3 |
| threewright-debug | outcome-1 | base | 1/1 |
| threewright-debug | outcome-1 | with | 3/3 |
| threewright-docs | action-1 | with | 3/3 |
| threewright-docs | outcome-1 | base | 1/1 |
| threewright-docs | outcome-1 | with | 3/3 |
| threewright-games | action-1 | with | 3/3 |
| threewright-games | outcome-1 | base | 0/1 |
| threewright-games | outcome-1 | with | 3/3 |
| threewright-r3f | action-1 | with | 3/3 |
| threewright-r3f | outcome-1 | base | 1/1 |
| threewright-r3f | outcome-1 | with | 2/3 |
| threewright-shaders | action-1 | with | 3/3 |
| threewright-shaders | outcome-1 | base | 1/1 |
| threewright-shaders | outcome-1 | with | 3/3 |
| threewright-video | action-1 | with | 3/3 |
| threewright-video | outcome-1 | base | 1/1 |
| threewright-video | outcome-1 | with | 3/3 |
| threewright-web | action-1 | with | 3/3 |
| threewright-web | outcome-1 | base | 1/1 |
| threewright-web | outcome-1 | with | 3/3 |

## Runs

| skill | case | run | Skill tool | denied | result | evidence | cost |
|---|---|---|---|---|---|---|---|
| threewright-assets | action-1 | with 1 | yes | 0 | PASS | trace: tw.mjs glb | $0.29 |
| threewright-assets | action-1 | with 2 | yes | 0 | PASS | trace: tw.mjs glb | $0.25 |
| threewright-assets | action-1 | with 3 | yes | 0 | PASS | trace: tw.mjs glb | $0.25 |
| threewright-assets | outcome-1 | base 1 | no | 0 | PASS | 320 KB vs 5386 KB; glb warnings 0 | $0.42 |
| threewright-assets | outcome-1 | with 1 | yes | 0 | PASS | 581 KB vs 5386 KB; glb warnings 0 | $0.47 |
| threewright-assets | outcome-1 | with 2 | yes | 0 | PASS | 453 KB vs 5386 KB; glb warnings 0 | $0.56 |
| threewright-assets | outcome-1 | with 3 | yes | 0 | PASS | 320 KB vs 5386 KB; glb warnings 0 | $0.49 |
| threewright-curate | action-1 | with 1 | yes | 0 | PASS | kb/topics/color-management.md has /VideoTexture/ | $0.38 |
| threewright-curate | action-1 | with 2 | yes | 0 | PASS | kb/topics/color-management.md has /VideoTexture/ | $0.48 |
| threewright-curate | action-1 | with 3 | yes | 0 | PASS | kb/topics/color-management.md has /VideoTexture/ | $0.51 |
| threewright-curate | outcome-1 | with 1 | yes | 0 | PASS | validate --strict in trace True; counts in reply True | $0.82 |
| threewright-curate | outcome-1 | with 2 | yes | 0 | PASS | validate --strict in trace True; counts in reply True | $0.60 |
| threewright-curate | outcome-1 | with 3 | yes | 0 | PASS | validate --strict in trace True; counts in reply True | $0.82 |
| threewright-debug | action-1 | with 1 | yes | 0 | PASS | trace: tw.mjs check | $0.33 |
| threewright-debug | action-1 | with 2 | yes | 0 | PASS | trace: tw.mjs check | $0.32 |
| threewright-debug | action-1 | with 3 | yes | 0 | PASS | trace: tw.mjs check | $0.32 |
| threewright-debug | outcome-1 | base 1 | no | 0 | PASS | check out/fixed True; cause (lights) named True | $0.40 |
| threewright-debug | outcome-1 | with 1 | yes | 0 | PASS | check out/fixed True; cause (lights) named True | $0.33 |
| threewright-debug | outcome-1 | with 2 | yes | 0 | PASS | check out/fixed True; cause (lights) named True | $0.34 |
| threewright-debug | outcome-1 | with 3 | yes | 0 | PASS | check out/fixed True; cause (lights) named True | $0.39 |
| threewright-docs | action-1 | with 1 | yes | 0 | PASS | trace: TW new | $0.63 |
| threewright-docs | action-1 | with 2 | yes | 0 | PASS | trace: tw.mjs new | $0.49 |
| threewright-docs | action-1 | with 3 | yes | 0 | PASS | file: docs/figure.html | $0.55 |
| threewright-docs | outcome-1 | base 1 | no | 0 | PASS | 1773 KB | $0.60 |
| threewright-docs | outcome-1 | with 1 | yes | 0 | PASS | 1532 KB | $1.13 |
| threewright-docs | outcome-1 | with 2 | yes | 0 | PASS | 1531 KB | $1.35 |
| threewright-docs | outcome-1 | with 3 | yes | 0 | PASS | 2016 KB | $1.29 |
| threewright-games | action-1 | with 1 | yes | 0 | PASS | file: out/game/package.json | $0.54 |
| threewright-games | action-1 | with 2 | yes | 0 | PASS | file: out/game/package.json | $0.49 |
| threewright-games | action-1 | with 3 | yes | 0 | PASS | file: out/game/package.json | $0.61 |
| threewright-games | outcome-1 | base 1 | no | 0 | FAIL | npm test 0; check dist True; check --eval/--actions in trace False | $1.23 |
| threewright-games | outcome-1 | with 1 | yes | 0 | PASS | npm test 0; check dist True; check --eval/--actions in trace True | $1.07 |
| threewright-games | outcome-1 | with 2 | yes | 0 | PASS | npm test 0; check dist True; check --eval/--actions in trace True | $1.07 |
| threewright-games | outcome-1 | with 3 | yes | 0 | PASS | npm test 0; check dist True; check --eval/--actions in trace True | $1.17 |
| threewright-r3f | action-1 | with 1 | yes | 0 | PASS | trace: $TW new r3f | $0.37 |
| threewright-r3f | action-1 | with 2 | yes | 0 | PASS | file: out/r3f/package.json | $0.35 |
| threewright-r3f | action-1 | with 3 | yes | 0 | PASS | file: out/r3f/package.json | $0.36 |
| threewright-r3f | outcome-1 | base 1 | no | 0 | PASS | build 0; check dist True | $0.40 |
| threewright-r3f | outcome-1 | with 1 | yes | 0 | PASS | build 0; check dist True | $0.48 |
| threewright-r3f | outcome-1 | with 2 | yes | 0 | PASS | build 0; check dist True | $0.42 |
| threewright-r3f | outcome-1 | with 3 | no | 0 | FAIL | build 0; check dist True | $0.33 |
| threewright-shaders | action-1 | with 1 | yes | 0 | PASS | trace: $TW check | $0.55 |
| threewright-shaders | action-1 | with 2 | yes | 0 | PASS | trace: $TW check | $0.55 |
| threewright-shaders | action-1 | with 3 | yes | 0 | PASS | trace: tw.mjs check | $0.65 |
| threewright-shaders | outcome-1 | base 1 | no | 0 | PASS | check True; three/tsl and no ShaderMaterial True | $0.71 |
| threewright-shaders | outcome-1 | with 1 | yes | 0 | PASS | check True; three/tsl and no ShaderMaterial True | $0.39 |
| threewright-shaders | outcome-1 | with 2 | yes | 0 | PASS | check True; three/tsl and no ShaderMaterial True | $0.43 |
| threewright-shaders | outcome-1 | with 3 | yes | 0 | PASS | check True; three/tsl and no ShaderMaterial True | $0.37 |
| threewright-video | action-1 | with 1 | yes | 0 | PASS | trace: tw.mjs video | $0.44 |
| threewright-video | action-1 | with 2 | yes | 0 | PASS | file: out/clip.webm | $0.46 |
| threewright-video | action-1 | with 3 | yes | 0 | PASS | file: out/clip.webm | $0.31 |
| threewright-video | outcome-1 | base 1 | no | 0 | PASS | {'codec_name': 'h264', 'width': 1280, 'height': 720, 'pix_fmt': 'yuv420p', 'nb_read_frames': '90'} | $0.36 |
| threewright-video | outcome-1 | with 1 | yes | 0 | PASS | {'codec_name': 'h264', 'width': 1280, 'height': 720, 'pix_fmt': 'yuv420p', 'nb_read_frames': '90'} | $0.52 |
| threewright-video | outcome-1 | with 2 | yes | 0 | PASS | {'codec_name': 'h264', 'width': 1280, 'height': 720, 'pix_fmt': 'yuv420p', 'nb_read_frames': '90'} | $0.49 |
| threewright-video | outcome-1 | with 3 | yes | 0 | PASS | {'codec_name': 'h264', 'width': 1280, 'height': 720, 'pix_fmt': 'yuv420p', 'nb_read_frames': '90'} | $0.49 |
| threewright-web | action-1 | with 1 | yes | 0 | PASS | trace: $TW check | $0.48 |
| threewright-web | action-1 | with 2 | yes | 0 | PASS | trace: $TW check | $0.52 |
| threewright-web | action-1 | with 3 | yes | 0 | PASS | trace: $TW check | $0.45 |
| threewright-web | outcome-1 | base 1 | no | 0 | PASS | check --reduced-motion True | $0.96 |
| threewright-web | outcome-1 | with 1 | yes | 0 | PASS | check --reduced-motion True | $1.02 |
| threewright-web | outcome-1 | with 2 | yes | 0 | PASS | check --reduced-motion True | $1.15 |
| threewright-web | outcome-1 | with 3 | yes | 0 | PASS | check --reduced-motion True | $1.14 |
| threewright | action-1 | with 1 | yes | 0 | PASS | trace: $TW check | $0.39 |
| threewright | action-1 | with 2 | yes | 0 | PASS | file: out/scene/index.html | $0.41 |
| threewright | action-1 | with 3 | yes | 0 | PASS | trace: tw.mjs new | $0.37 |
| threewright | outcome-1 | base 1 | no | 0 | PASS | check True; lint 0 error(s), 0 warning(s); pins 0.186.1 True | $0.45 |
| threewright | outcome-1 | with 1 | yes | 0 | PASS | check True; lint 0 error(s), 0 warning(s); pins 0.186.1 True | $0.45 |
| threewright | outcome-1 | with 2 | yes | 0 | PASS | check True; lint 0 error(s), 0 warning(s); pins 0.186.1 True | $0.41 |
| threewright | outcome-1 | with 3 | yes | 0 | PASS | check True; lint 0 error(s), 0 warning(s); pins 0.186.1 True | $0.48 |

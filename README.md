# threewright

Evergreen three.js skills for AI coding agents. It teaches the current release (r186, three 0.186.1) and where three.js is heading (WebGPU, TSL). Old APIs stay available but labelled legacy, with the release that changed them. It ships a knowledge base, verified starters and a zero-dependency Node CLI. The CLI lets an agent prove a page works, as text first, before it claims anything.

## Skills

| Skill | Does |
|---|---|
| `threewright` | Hub: any three.js build, fix or upgrade with current APIs, verified headlessly before it is called done. Routes to the others. |
| `threewright-docs` | 3D charts, figures and model embeds for READMEs, reports, wikis, Office files, notebooks and Claude artifacts, with fallbacks (turntable, still, data table). |
| `threewright-video` | Frame-exact videos, GIFs and stills: turntables, explainers, social clips, transparent overlays. |
| `threewright-games` | Browser games: Vite, TypeScript and Rapier, fixed timestep, input actions, test hooks an agent can drive. |
| `threewright-web` | Product viewers, scroll heroes, landing pages, globes. |
| `threewright-assets` | Find, convert, optimize and license glTF models, textures, HDRIs and splats. |
| `threewright-shaders` | TSL node materials, compute, node post-processing, GLSL where it still fits. |
| `threewright-r3f` | React Three Fiber and drei apps. |
| `threewright-debug` | Black, blank, slow or wrong-looking pages, diagnosed with text evidence first. |
| `threewright-curate` | Grow and correct the knowledge base; add lint rules after a three.js release. |

Each skill is an evergreen unit under the [evergreen protocol](https://github.com/m4bwav/evergreen-protocol): a research refresh on a schedule, plus learnings, a changelog and an eval suite.

## Knowledge base

89 entries in `kb/`: 23 topics, 13 scenarios, 30 libraries, 20 recipes and 3 rules. Each carries an `applies_to` release range and a `status` of current or legacy. Recipes that are one page were run through `tw check`. `kb/rules/lint-rules.json` holds 67 stale-API rules, with release numbers checked against npm tarballs. Start at [kb/INDEX.md](kb/INDEX.md) (generated) and read [kb/SCHEMA.md](kb/SCHEMA.md) before editing.

## Templates

Each one passes `tw check`; `node scripts/tw.mjs templates` lists where and how it was verified.

| Template | What |
|---|---|
| `html-importmap` | One HTML file, WebGL, import map pinned to 0.186.1 |
| `html-webgpu` | One HTML file, WebGPURenderer, TSL material, RenderPipeline bloom |
| `vite-ts` | Vite and TypeScript |
| `r3f` | React Three Fiber and drei on Vite |
| `chart-3d-scatter` | 3D scatter for documents: axes, legend, reduced motion |
| `video-turntable` | Product turntable with `__tw.renderFrame` for exact video frames |
| `game-starter` | Vite, TypeScript, Rapier; deterministic simulation with Node tests and `window.__game` hooks |

## CLI

```
node scripts/tw.mjs check page/              # errors, failed requests, renderer, scene numbers, pixel evidence
node scripts/tw.mjs check page/ --eval "window.__game.state()"
node scripts/tw.mjs sheet page/ --out s.png  # four angles in one image, prints its token cost
node scripts/tw.mjs video page/ --out turn.mp4 --seconds 3 --fps 30
node scripts/tw.mjs lint src/                # stale APIs, with the release that changed them and the fix
node scripts/tw.mjs glb model.glb            # size, triangles, textures, decoders needed
node scripts/tw.mjs kb search "bloom webgpu" # then: kb show <slug> --section <name>
node scripts/tw.mjs new game-starter my-game
node scripts/tw.mjs deprecations             # @deprecated markers in the installed three no rule covers
node scripts/tw.mjs versions --check         # npm versions vs the knowledge base
node scripts/tw.mjs doctor
```

Needs Node 22+ and Chrome or Chromium (Playwright and Puppeteer browsers are found automatically). `video` also needs ffmpeg (set `TW_FFMPEG`). CDN import maps still work offline: pinned jsDelivr and unpkg files are served from `node_modules` or the npm cache. Image costs use Claude's formula, ceil(w/28) * ceil(h/28).

## Tested where

Windows 11 with Chrome 153 on an RTX 5060 Ti, where the WebGPU pages run on the real WebGPU backend, and a Linux container with Chromium 141 on SwiftShader, where three r186's WebGPU backend fails and the same pages run on the WebGL 2 fallback. Run `npm test`: unit tests, plus browser tests that check every template.

## Install

Claude Code: `/plugin marketplace add m4bwav/threewright`, then `/plugin install threewright@threewright`. Other agents: copy `skills/*` into the agent's skill folder, and keep the plugin folder where the skills can find `scripts/`, `kb/` and `templates/` (two levels up from each SKILL.md). Run `npm install` once for the offline CDN serving and the tests.

## Layout

```
skills/       ten skills, each with SKILL.md, RESEARCH, CHANGELOG, LEARNINGS, TESTS, evergreen.json, evals/
kb/           topics, scenarios, libraries, recipes, rules; INDEX.md and index.json are generated
templates/    verified starters
scripts/      tw.mjs and scripts/lib/
tests/        node --test suites
ai-docs/      handoff, log, research notes, authoring brief
```

Agent rules: [AGENTS.md](AGENTS.md). History: [CHANGELOG.md](CHANGELOG.md). License: MIT.

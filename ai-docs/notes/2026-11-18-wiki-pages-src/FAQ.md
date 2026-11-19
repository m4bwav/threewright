## Does it need a GPU?

No. Headless Chrome uses the real GPU when there is one and SwiftShader (software WebGL) when there is not; `--gl swiftshader` forces the software path. SwiftShader has no WebGPU adapter, so WebGPU pages fall back to WebGL 2 there. `tw doctor` shows which you have ([Getting started](Getting-Started#check-the-machine)).

## Does WebGPU get tested?

On the Windows test machine (RTX 5060 Ti) headless Chrome picks the real WebGPU adapter by default, and `html-webgpu`, `splats`, bloom-webgpu, tsl-custom-material and webgpu-backend-check were verified there (0.2.0). On a Linux container with Chromium 141, Chrome has an adapter but three r186's WebGPU backend throws (`swizzle: 'rgba'`), and the pages run on the WebGL 2 fallback. Pass `--webgpu` to `check` to ask for it.

## Why a CLI and not an MCP server?

The kb topic `agent-tooling` compares the three.js MCP servers with a plain CLI and explains why `tw` stays a plain CLI, with the text-first token budget rules for verifying a scene (`tw kb show agent-tooling`).

## Does it work offline?

Mostly. With the default `--cdn auto`, pinned jsDelivr and unpkg files come from `node_modules` or the tw cache when they are there, and from the CDN otherwise. `--cdn offline` never touches the CDN: missing files come from `npm pack`. `tw vendor` copies a page's modules next to it so the page itself needs no network (see [Recipes](Recipes#ship-a-page-with-no-cdn-requests)).

## What does it send over the network?

No telemetry and no credentials. The page under test makes its own requests. `tw` runs `npm pack` for exact pinned versions in four cases (a module is missing locally and the CDN fails, `--cdn offline`, `tw vendor`, and `tw new` for templates that vendor or generate a model), `tw versions` asks the npm registry for release numbers, and `tw doctor` checks from the browser whether jsDelivr is reachable. The README's Privacy section lists every route and the environment variables `tw` reads.

## Which three.js version does it teach?

r186 (three 0.186.1). Older APIs are kept in entries marked `legacy` with their release range, so an agent porting an old project can read them; `tw lint` names the release that changed each one. `tw lint --target r186` sets the release to lint against when it cannot be read from a pinned URL.

## Can I use it without Claude Code?

Yes: copy `skills/*` into the agent's skill folder and keep the plugin folder where the skills can find `scripts/`, `kb/` and `templates/` ([Getting started](Getting-Started#install)). `tw` is plain Node and needs no agent. The root `plugin.json` (0.6.5) is read by GitHub Copilot CLI; the 0.6.5 CHANGELOG records an install with Copilot CLI 1.0.92.

## Does it make 3D models?

No. `threewright-assets` finds, converts and optimizes models and `tw glb` reports on them. With the [polywright](https://github.com/m4bwav/polywright) plugin installed, models to make, capture or fix come from polywright since 0.6.6.

## What about React Three Fiber, games, video?

Each has its skill and a template: `threewright-r3f` with `r3f`, `threewright-games` with `game-starter`, `threewright-video` with `video-turntable` ([The skills](The-Skills), [Templates](Templates)).

## Is XR supported?

No. A WebXR starter was considered and dropped on 2026-09-26 (HANDOFF). The kb still has a `webxr` topic.

# Research: threewright

Findings that back [SKILL.md](SKILL.md). Changes they caused are logged in [CHANGELOG.md](CHANGELOG.md); procedural lessons live in [LEARNINGS.md](LEARNINGS.md); test runs and their evidence in [TESTS.md](TESTS.md); schedule and state in `evergreen.json`. Protocol: the evergreen plugin's `protocol/PROTOCOL.md`. Full research notes: `../../ai-docs/research/`.

Topic: current three.js APIs and releases, WebGPU and TSL status, the verification tooling and how agents build and check three.js work. Tier `fast`. Last refresh 2026-09-26; next due 2026-10-10.

## Current understanding

- three.js is at r186 (npm three 0.186.1, 2026-09-24). Releases slowed to about one every two months in 2026. r186 deprecated the CommonJS build, removed every minified build, renamed Source to TextureSource and added a native Gaussian splat renderer and SunLight with cascaded shadows. Settled for this refresh (direction and core research).
- The manual still calls WebGPURenderer experimental and llms.txt tells agents to default to WebGLRenderer; new features land on WebGPURenderer and TSL. threewright defaults WebGL for docs, product, scroll, video, XR, CAD and maps, and WebGPU for games, generative art and compute (direction research, section 5). Moving.
- Models keep writing removed APIs (the global THREE script, Geometry, outputEncoding, Clock); lint rules with release numbers, checked against npm tarballs, catch them (ai-skills research, section 3.5). Settled.
- Text evidence (console, scene numbers, pixel statistics) proves a page works far cheaper than screenshots; Claude image cost is ceil(w/28) * ceil(h/28) tokens (vision docs, 2026-09-26). Settled.
- Existing three.js skill packs teach stale APIs (RGBELoader in 1,356 SKILL.md files against 11 for HDRLoader) and none lints user code or targets r186 (ai-skills research). The gap threewright fills.

## Open questions

- When WebGPURenderer stops being called experimental in the manual, and whether r187 or later changes the default renderer advice.
- Whether headless Chrome in CI gains a WebGPU adapter by default (SwiftShader has one on Linux with Vulkan; Chromium 141 fails r186 on texture view swizzle).

## Search plan

Four tracks; every refresh runs at least one query on each, scoped to the period since the last refresh (add the year or month).

Subject:

- `three.js r<next> release notes`, the Migration Guide section for the new release, `npm view three time --json`
- `site:threejs.org/manual webgpurenderer`, the TSL Guide, and llms.txt for changed agent rules

Tooling:

- `path:SKILL.md three.js` and `path:SKILL.md threejs` on GitHub code search, sorted by recently updated; skills.sh weekly installs for "three.js" and "threejs" (never all-time; exclude meta and installer skills)
- `https://registry.modelcontextprotocol.io/v0/servers?search=three` and `search=3d`; `anthropics/claude-plugins-official` and `claude-plugins-community` searched for three.js (record the tier)
- Supersession sweep: `"three.js" skill deprecated OR superseded OR archived <year>`; the archive flag on every tool already listed here

Practice:

- `"three.js" "claude code" OR codex OR cursor workflow <year>`; hn.algolia.com `three.js agent` sorted by date
- discourse.threejs.org threads on AI agents (search "AI", "LLM", "agent") since the last check

Testing:

- `path:SKILL.md three.js evals OR benchmark` on GitHub; `"three.js" LLM benchmark OR "WebDev Arena" <year>`
- `site:arxiv.org LLM 3D web generation evaluation <year>`; promptfoo or Inspect assertion types for browser output

Best sources: the mrdoob/three.js releases and Migration Guide, the installed package source, threejs.org docs pages and manual, npm registry metadata, the threewright research notes. Noisy: SEO "best three.js libraries" listicles, scraped MCP directories, answers older than a year without a release number.

## Findings log

Newest first.

### R-20261011-1 · 2026-10-11 · Testing: the Linux headless WebGPU flags lose the device; WorldBench; quiet releases
- Summary: two independent repositories (niivue/mono #253, moritzbrantner/maps #198) report that on Chromium 149 headless shell under Linux, WebGPU on SwiftShader with `--enable-unsafe-webgpu --enable-features=Vulkan` loses its device about 0.5 s after the first frame; it works once `--use-vulkan=swiftshader` (and `--use-angle=swiftshader`) is added, and agent-browser's preset adds `--use-webgpu-adapter=swiftshader --disable-vulkan-surface`. `scripts/lib/cdp.mjs` passed exactly the failing set, so `--gl swiftshader --webgpu` on Linux now adds the Vulkan SwiftShader flags (unit-tested; not yet run on a Linux machine). The maps repository also found its WebGPU tests read the backend only at load, so pixel checks measured the fallback: `tw check` should read the backend and device-lost state after frames (open question). agent-browser says headless WebGPU canvas screenshots come out black on Windows and Linux, which conflicts with this project's own 2026-09-26 Windows run. WebGPU texture swizzle shipped in Chrome 143 (why r186 fails on Chromium 141). WorldBench (arXiv 2610.10622) judges three.js worlds by driving the scene and reading the code: screenshot and code judging disagree on 32% of required items, and code-only judging credited 4 of 5 removed features, which backs pairing `tw check` with a targeted look. Releases: three.js still 0.186.1 (r187 expected November or December), no new MCP servers; dgreenheck's TSL skill (most installed, aligned to r183) looks abandoned after its author's 2026-09-22 post; openai/plugins has `three-webgl-game` (about 42 installs, no versions, no verification step).
- Track: testing, subject, tooling
- Sources: https://github.com/niivue/mono/issues/253, https://github.com/moritzbrantner/maps/issues/198, https://agent-browser.dev/webgpu, https://developer.chrome.com/docs/web-platform/webgpu/news, https://arxiv.org/abs/2610.10622, https://github.com/dgreenheck/webgpu-claude-skill/commits/main, https://www.skills.sh/openai/plugins/three-webgl-game
- Magnitude: 0.45 (the skill's own headless flags were the failing set)
- Applied: C-20261011-1 (scripts/lib/cdp.mjs `glFlags`; tests/unit.test.mjs; kb/topics/headless-and-ci.md)

### R-20260926-1 · 2026-09-26 · Initial research
- Summary: Initial research: nine research notes (dataviz and docs, scenarios and testing, AI skills and docs, MCP and AI tools, core r160 to r186, ecosystem libraries, video, games, direction). Distilled into the knowledge base under `kb/` and this skill's SKILL.md.
- Track: subject
- Sources: ai-docs/research/
- Magnitude: n/a (initial)
- Applied: C-20260926-1

# Action and outcome runs (evergreen-tester, Windows 11, Chrome 153, RTX 5060 Ti, 2026-09-26)

One run per arm. "with" read the SKILL.md in place of the Skill tool (the plugin was not installed in the session); "base" had no skill, kb or CLI in its workspace.

- threewright-assets action-1 · with · PASS · trace: `node scripts/tw.mjs glb models/duck.glb`; reply gives counts, bounds, no decoders needed.
- threewright-r3f action-1 · with · PASS · trace: `tw.mjs new r3f out/r3f`; out/r3f/package.json and dist exist; build OK, tw check OK, lint 0/0.
- threewright-curate action-1 · with · PASS · trace: `tw.mjs kb note color-management ...`, then validate --strict and index; the note is in kb/topics/color-management.md. Side finding: the entry Verify names a lint rule `texture-loader-without-srgb` that the run could not find in lint-rules.json.
- threewright action-1 · with · PASS · trace: `tw.mjs new html-importmap out/scene`, then lint and check (OK); out/scene/index.html exists.
- threewright-debug action-1 · with · PASS · trace: `tw.mjs check tests/fixtures/pages/black-mesh` first; cause named from the CHECK line (lit material, no lights); fix proved on a temp copy (the fixture was left alone on purpose).
- threewright-video action-1 · with · PASS · trace: `tw.mjs video templates/html-importmap --out out/clip.webm --seconds 2`; out/clip.webm exists (VP9, 60 frames). Side finding: the WebM carries no BT.709 colour tags.
- threewright-docs action-1 · with · PASS · trace: `tw.mjs new surface`, then `tw.mjs check docs/figure.html` (OK, and OK with --reduced-motion); docs/figure.html exists with f = sin(x)cos(y).
- threewright-games action-1 · with · PASS · trace: `tw.mjs new game-starter out/game`, npm ci, build, test 4/4, lint 0/0, then `tw check dist --actions "key KeyW 800; key KeyD 800"` moved the player; WASD was already in the starter.
- threewright-shaders action-1 · with · PASS · trace: `tw.mjs new html-webgpu out/bloom`, `tw.mjs check out/bloom` (OK on the WebGPU backend), lint 0/0, before/after shots and diff; changed the whole-frame bloom to selective emissive bloom (MRT).
- threewright-web action-1 · with · PASS · trace: `tw.mjs new scroll-hero out/hero`, three checks OK (normal, --reduced-motion, ?progress=0.6); out/hero/index.html exists. Side finding: the scroll-hero template breaks the skill Step 2 rules (runtime CDN libraries, no poster); the run vendored them and added a poster.
- threewright outcome-1 · with · PASS · grader: `tw check out/knot` exit 0, `tw lint out/knot` 0/0, pins three@0.186.1, no THREE.Clock.
- threewright-debug outcome-1 · with · PASS · grader: `tw check out/fixed` exit 0; the reply names the cause with the CHECK line (lit materials but no lights).
- threewright-r3f outcome-1 · with · PASS · grader: `npm run build` exit 0 and `tw check out/r3f/dist` exit 0 (rerun by the grader).
- threewright-curate outcome-1 · with · PASS · trace: `tw.mjs kb validate --strict`; the reply gives its counts (89 entries, 67 rules, 0/0) and says no entry is stale. Its "npm test ran 0 tests" note is a workspace artifact (tests/*.test.mjs were not copied into eval workspaces).
- threewright-shaders outcome-1 · with · PASS · grader: `tw check out/stripes` exit 0 (WebGPU backend); the page imports three/tsl and has no ShaderMaterial.
- threewright-video outcome-1 · with · PASS · grader: ffprobe h264, yuv420p, 1280x720, 90 frames; the reply names the driver (page renderFrame()) and the checks. Side finding: ffmpeg 9.0.1 drops the BT.709 primaries and transfer tags on the MP4 too; the run fixed them with the h264_metadata bitstream filter.
- threewright-games outcome-1 · with · PASS · grader: npm test 7/7 (3 new coin tests), `tw check dist` OK, and a real W key via --actions raised the score to 5 (grader rerun).
- threewright-docs outcome-1 · with · PASS · grader: docs/scatter.gif exists, 642 KB (under 5 MB), 720x480, 60 frames; the reply states the finding (three groups, gamma in front of alpha from some angles) and gives alt text.
- threewright-assets outcome-1 · with · PASS · grader: models/big.opt.glb 661 KB vs 5.3 MB input, `tw glb` shows no budget warning, and the reply names MeshoptDecoder and KTX2Loader. Side findings: the product-viewer template wires Draco and meshopt but not KTX2Loader; and `tw check "/c/...?query"` failed because Git Bash skips its path conversion for arguments with a `?` (fixed in tw).
- threewright-web outcome-1 · with · PASS · grader: `tw check out/hero --reduced-motion` exit 0 (and normal exit 0, rerun by the grader); the reply quotes the check results and pixel diffs (reduced mode: 0 pixels change on scroll). Side finding: the template cut the camera per section under reduced motion instead of showing the final state (skill rule 4), and it still has no poster and loads its libraries from the CDN.

## Baselines (skill absent)

- threewright-debug action-1 · base · evidence absent (no tw) · read the source and named the right cause (no lights); no runtime check, no pixel proof.
- threewright-curate action-1 · base · evidence absent · found no knowledge base and asked where the entry lives; wrote nothing.
- threewright-assets action-1 · base · evidence absent · parsed the GLB with inline Python; accurate counts, no decoder or budget advice.
- threewright-shaders action-1 · base · evidence absent · raised the existing bloom and added a lil-gui panel; syntax check only, never rendered.
- threewright-docs action-1 · base · evidence absent · wrote a surface page from scratch; syntax check only, never rendered.
- threewright action-1 · base · evidence absent (no tw) · wrote the page and verified it with a hand-rolled headless Chrome screenshot and a python server; a real check, done by hand.
- threewright-r3f action-1 · base · evidence absent (no tw) · found and copied templates/r3f (the template helps without the skill), npm ci and build passed, vite preview 200; no render check. Its first kill left a vite child listening until it was stopped by PID.
- threewright-games action-1 · base · evidence absent (no tw) · found and copied templates/game-starter, added a Node test for WASD (5/5), build OK; no browser run.
- threewright-web action-1 · base · evidence absent (no tw) · copied templates/scroll-hero verbatim; hand-rolled headless Chrome screenshots, mid-scroll states came out blank and stayed unverified.
- threewright-video action-1 · base · evidence absent (no tw) · built its own recorder (playwright-core installed into the workspace, a virtual-time shim, screenshots piped to ffmpeg) after two dead ends; out/clip.webm correct, 14 tool calls and 220 s vs 10 calls and 70 s with the skill.

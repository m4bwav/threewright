# Knowledge base authoring brief

For anyone (human or agent) writing entries in `kb/`. Written 2026-09-26 for the first fan-out; still the standard.

## Read first, in this order

1. [kb/SCHEMA.md](../../kb/SCHEMA.md): kinds, frontmatter, required sections, code-fence rules.
2. The exemplar for your kind: [topics/import-maps-and-builds](../../kb/topics/import-maps-and-builds.md), [scenarios/3d-chart-in-docs](../../kb/scenarios/3d-chart-in-docs.md), [recipes/capture-stills-and-video](../../kb/recipes/capture-stills-and-video.md), [rules/verification-ladder](../../kb/rules/verification-ladder.md). Match their depth, tone and structure.
3. The research notes in `ai-docs/research/` that cover your entries (cite them in `sources:` next to the primary URLs they give).
4. The installed three at `node_modules/three` (run `npm install` first): check every class name, import path and default against it. `grep -rn "@deprecated" node_modules/three/src` shows what is on the way out.

## Rules

- Teach r186 as current. Write for `applies_to: ">=r1NN"` from the release the practice became right. Anything that was right only for older releases goes in a `## Legacy` section with its release numbers, inside a fence marked `legacy`, or in a separate entry with `status: legacy` and `superseded_by`.
- Never guess a release number, class name, option or default. Verify it in `node_modules/three`, the three.js Migration Guide, release notes or the research notes; if you cannot, write "unverified" next to it.
- Name the renderer. Most of three works on both, but materials, post-processing and shaders differ: `renderer: webgl`, `webgpu` or `both`, and say in the text where WebGLRenderer and WebGPURenderer part ways (GLSL `ShaderMaterial` and `EffectComposer` are WebGL only; TSL node materials and `RenderPipeline` are the WebGPURenderer path).
- Every entry has a `## Verify` section (or the kind's equivalent) that proves the thing with text before pixels: a `tw check` line to look for, a warning that must be absent, a number, a `tw glb` field, a `tw lint` rule id.
- Code: minimal, runnable in context, import specifiers `three`, `three/addons/...`, `three/webgpu`, `three/tsl`. Use `THREE.Timer`, never `THREE.Clock` (deprecated r183). Pin CDN URLs to exact versions. `tw kb validate` lints every current fence; a finding is an error.
- Prose: plain, short sentences, no em dashes, no filler, no marketing words. Cite by author-year or by source name. Say what is uncertain.
- `summary` is the index line: what the entry answers, under 200 characters, different from its neighbours.
- `tags`: 4 to 10 lower-case words a request would contain.
- Library entries: `package` and `version_checked` from `npm view <pkg> version` on the day, with the peer range for three and React where it matters, and whether it works with WebGPURenderer.
- `## Notes` starts with `- 2026-09-26: written from the 2026-09-26 research (<note file>).`
- No AI attribution anywhere.

## After writing

`node scripts/tw.mjs kb validate` (no errors; warnings only for `verify` rules and legacy entries without `superseded_by`), then `node scripts/tw.mjs kb index`. Search for your entry with a phrase a user would type (`tw kb search <words>`) and adjust `title`, `summary` and `tags` until it ranks first.

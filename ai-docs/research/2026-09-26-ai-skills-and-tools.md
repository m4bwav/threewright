# AI skills and tools for three.js agents

Date: 2026-09-26
Track: threewright research, the AI-tooling landscape around three.js and what threewright should copy or avoid.
Related: threewright is itself an evergreen three.js plugin/skill for AI agents, so this file is competitive and design research.

## Summary

Three.js ships an official `llms.txt` and a much larger `llms-full.txt` from the docs site, so an agent can get grounded API context without scraping HTML. Outside the official docs, the ecosystem has three kinds of AI helpers: Claude Code "skills" packages (SKILL.md bundles, several with 10 to 24 sub-skills), MCP servers that either serve documentation or attach live to a running three.js scene for inspection, and framework-specific rule files (Cursor `.mdc` rules, mostly for React Three Fiber). Quality is uneven. Several skill packages advertise "r160+" APIs, which is already two years and dozens of releases stale against r186. The strongest pattern worth copying is a live introspection MCP server that reads the actual running scene graph instead of asserting facts from a static knowledge file. The weakest pattern is any skill or rule file that hard-codes a three.js version-specific API without a version guard or a "check current version" step.

For Claude vision, the image token formula changed from the old whole-image-area formula to a patch-based formula: `ceil(width/28) * ceil(height/28)` visual tokens, with a per-model resolution tier that caps the long edge and the token count before that formula runs.

## 1. Official three.js docs for LLMs

- three.js ships `llms.txt` at the repo root (`github.com/mrdoob/three.js/blob/dev/llms.txt`, dev branch, 7 lines / 274 bytes as of this check). It is a short pointer file, not the content itself.
- It points to two files served from the docs site: `threejs.org/docs/llms.txt` (short overview, "use for quick context") and `threejs.org/docs/llms-full.txt` (full API reference including TSL, reported at roughly 3.7 MB by the three.js project's own account on social media in 2026).
- Practical implication for threewright: prefer fetching `llms-full.txt` fresh at skill-build or CI time over embedding a snapshot, since it is large and versioned to whatever `dev` currently is. A stale copy will misdescribe deprecations the same way stale skill packages do (see below).
- `docs/llms-full.txt` lives in the same repo as the source, so it should track releases tag-for-tag; unverified whether the hosted `threejs.org/docs/llms-full.txt` always matches the latest npm release exactly, or lags behind `dev`.

## 2. Claude/Codex skills for three.js and R3F

Observed on skills.sh (agentskill.sh) and GitHub, searched under `path:SKILL.md three.js` and by name:

- **CloudAI-X/threejs-skills** — a bundle, listed as one of ~193 skills in the agentskill.sh directory. Marketed for scenes, materials, lighting, shaders, GLTF loading, post-processing.
- **Impertio-Studio/Three.js-Claude-Skill-Package** — 24 deterministic skills, each with `methods.md`, `examples.md`, and `anti-patterns.md`. Covers WebGL, WebGPU, R3F, Drei, physics, IFC. This is the most structurally complete package found: separating "anti-patterns" from "methods" is a good idea threewright should copy, since agents need explicit "don't do X" entries as much as "do Y" ones.
- **EnzeD/r3f-skills** — 11 R3F skill files for Claude Code and OpenAI Codex, covering animation, shaders, physics, post-processing.
- **freshtechbro/claudedesignskills** — a broader web-dev skill collection with a `web3d-integration-patterns/SKILL.md` and an R3F skill; root-level SKILL.md per skill plus references/scripts/assets subfolders.
- **anthemflynn/ccmp** — an R3F skill pinned to "v9.5+" plus Drei, Rapier, postprocessing.
- **majidmanzarpour/threejs-game-skills** — game-oriented: gameplay, AAA-style graphics, UI, QA, optional AI-generated 3D/image/audio assets.
- **Nice-Wolf-Studio/claude-skills-threejs-ecs-ts** — three.js plus an ECS pattern plus TypeScript.

What they do well:
- Splitting a big topic (three.js) into many small, independently triggerable skill files instead of one giant document. This keeps context small per task, which several packages explicitly call out as the reason for the split.
- Pairing an "anti-patterns" file with a "methods" file (Impertio-Studio). Agents reliably repeat known-bad patterns (memory leaks from undisposed geometries/materials, wrong disposal order, calling deprecated Async render methods) unless a skill says explicitly not to.
- Framework-specific skills (R3F, Drei, Rapier) instead of one generic "three.js" skill, since the actual failure mode for agents is usually at the framework-integration seam (stale prop, wrong hook), not the raw three.js API.

What they do badly, or unverified concerns:
- Version pinning without a freshness mechanism. Several packages explicitly advertise "r160+" (CloudAI-X marketing copy) or "R3F v9.5+" (ccmp) as if that were still current; r160 was mid-2024 and three.js is now at r186 with several renames and deprecations in between (see the companion core-changes file). A skill that says "r160+" without a re-check step will teach an agent APIs that now warn or no longer exist (`Clock`, `PostProcessing`, `Source`, several `*Async` render methods).
- Marketplace/directory listings (agentskill.sh, mcpmarket.com, promptsrush.com) surface competing, overlapping skill packages with no visible curation signal (stars, last-updated, or version-tested-against are not consistently shown in the search snippets). Treat any specific claim from these directories as unverified until you open the actual repo.
- None of the found packages advertise an automated "regenerate against latest three.js" step; they read as one-time authored snapshots. This is exactly the gap threewright's evergreen-refresh design is meant to close.

## 3. MCP servers

- **ThreeJSMCP (deya-0x/ThreeJSMCP)** — described as an MCP server "for AI agents" around three.js; scope beyond the name is unverified from search snippets alone.
- **threejs-devtools-mcp (DmitriyGolub)** — the standout find: inspects and edits a *running* three.js scene in real time (objects, materials, shaders, lights) with 59 tools covering objects, materials, shaders, textures, animation, performance monitoring, memory diagnostics, and code generation. Claimed to work with vanilla three.js or R3F without code changes. This is the pattern threewright should study: ground truth comes from the live scene graph and renderer state, not from a static description of the API. A static skill can describe what a `Mesh` is; only a live introspection tool can tell an agent why a specific frame is dropping to 20 fps or which material on screen is actually double-compiling.
- **mcp-threejs (baryhuang)** — appears documentation/utility-oriented (search for classes, methods, concepts, constructor signatures); scope beyond that is unverified.
- **threejsresources.com/mcp** — described as free, read-only, giving "version-verified" three.js guides, an official-sounding GLSL-to-TSL converter, a tools directory, and showcase projects. "Version-verified" is the vendor's own claim; unverified independently.
- **3D Model Search MCP** — finds and serves pre-built 3D model assets via natural-language search, for populating scenes rather than for API help.
- Outside three.js specifically: Blender MCP servers exist for scene/asset authoring (not deeply explored this pass; budget-limited, unverified beyond name-level confirmation from the broader MCP ecosystem) and glTF-focused tool servers exist for format conversion/validation. Treat both as a follow-up area, not covered in depth here.

Lesson for threewright: a documentation-serving MCP server is a nice-to-have convenience; a live-introspection MCP server is a materially different and more valuable capability, because it can catch drift between what an agent believes about a scene and what is actually rendered. If threewright ever exposes an MCP surface, the introspection angle (read the live renderer/scene, not just static docs) is the differentiated move.

On Blender MCP and glTF tooling specifically: Blender MCP servers (multiple exist under names like "blender-mcp") generally expose Blender's own Python API to an agent for scene authoring and asset prep, which is a neighboring but separate problem from three.js runtime work — the natural boundary is Blender MCP for authoring/exporting an asset, then a three.js-side loader (GLTFLoader, or the native Gaussian splat loaders described in the companion core file) for bringing it into a running scene. glTF-specific tool servers in the wider MCP ecosystem tend to focus on validation and format conversion (checking a glTF/GLB file against the spec, converting between glTF and other formats) rather than three.js API knowledge; this pass did not find a glTF MCP server that also understands three.js's `GLTFLoader` options (Draco/KTX2 decoder setup, texture transforms) in depth. This is unverified beyond name-level confirmation and is a reasonable follow-up search rather than a settled finding.

## 4. Cursor rules and other IDE-level rule files

- Cursor rules for R3F exist as single-page rule sets (e.g. "React Three Fiber Rules" by Erik Hulmák, mirrored on cursor.directory and cursorrules.io) covering an R3F+Vite+Tailwind+three.js stack with generic guidance (concise responses, functional/declarative style, accurate examples). These read as generic frontend style guides with an R3F label, not deep three.js-version-specific correctness rules.
- As of Cursor 3.2 / Composer 2 (2026), the modern convention moved from a single `.cursorrules` file to a `.cursor/rules/` directory of scoped `.mdc` files with "Auto Attached" behavior, so only the rules relevant to files currently in context get loaded. This scoping mechanism is worth copying conceptually: threewright's own rules should be splittable by concern (renderer setup, materials, disposal, TSL) rather than one monolithic file, so an agent only pays context cost for what's relevant to its current file.
- No three.js-specific Cursor rule set found that encodes the r160-to-r186 deprecation surface; they focus on code style, not API-version correctness. This is a gap threewright's "stale API -> current API" table (see the companion file) directly fills.

## 5. Claude vision image token formula (current, verified against docs.claude.com / platform.claude.com)

Fetched directly from the live vision page on 2026-09-26 (note: an initial web search surfaced an outdated third-party blog formula, `tokens = (width*height)/750`; that formula is stale and was not used here — the numbers below come from the official page itself):

- Claude views images in patches, not raw pixels. Each patch is 28x28 pixels and counts as one visual token.
- Formula: `visual_tokens = ceil(width_px / 28) * ceil(height_px / 28)`.
- Two resolution tiers gate the formula by downscaling first:
  - High-resolution tier (Claude 4.7 and later models): max long edge 2576 px, max visual tokens 4784. Automatic, no beta header or opt-in needed.
  - Standard tier (all other models): max long edge 1568 px, max visual tokens 1568.
- If an image exceeds either limit for its tier, Claude downscales it first, preserving aspect ratio, to the largest size that fits, then applies the patch formula to the downscaled size.
- Example sizes from the page's own table: 1000x1000 px (1 MP) costs 1296 tokens on both tiers (not resized). 1920x1080 costs 1560 tokens standard (resized to 1456x819) vs 2691 tokens high-res (not resized). A 3840x2160 (4K) image costs 1560 tokens standard (resized) vs 4784 tokens high-res (resized to 2576x1449, hitting the token cap).
- Hard request limits: max 8000x8000 px per image; if a single request has more than 20 images/documents, a stricter effective cap applies and Anthropic's own guidance is to keep every image under 2000 px on its long edge, or keep the request at 20 or fewer image/document blocks.
- Max encoded size: 10 MB base64 on the direct API and on claude.ai; 5 MB on Amazon Bedrock and Google Cloud.
- Max images per request: 100 for 200k-context models, 600 for others on the API; 20 per turn on claude.ai.
- Formats: JPEG, PNG, GIF, WebP; animations unsupported (first frame only).

Implication for a three.js agent skill: if threewright ever asks an agent to screenshot a rendered scene for visual verification (e.g. checking a material or lighting change), keep screenshots near 1000x1000 to 1456x819 px. That range is at or below both tiers' downscale thresholds, so no information is thrown away by server-side downscaling and token cost stays predictable (roughly 1300-1560 tokens per screenshot). Going to full 4K screenshots wastes tokens on the standard tier (server discards resolution anyway) and only pays off on the high-resolution tier if fine detail (e.g. thin shader artifacts) actually matters.

## Rules for the skill

1. Never hard-code "three.js r16x APIs" as an evergreen claim in a shipped skill; state the three.js version the skill was verified against and include a step (or CI check) that re-verifies against the current npm `three` version.
2. Pair every "how to do X" entry with a matching "do not do Y" anti-pattern entry when Y is a common agent mistake (undisposed resources, deprecated Async render calls, wrong disposal order).
3. Split rules by concern (renderer setup, materials/TSL, disposal, XR, post-processing) into separate small files rather than one large document, so an agent's context cost scales with what it actually touches.
4. Prefer describing how to introspect the live renderer/scene state (stats, materials in use, program count) over asserting static facts about the API, wherever a live check is possible — static claims go stale, live checks do not.
5. When asking an agent to attach a screenshot for verification, target roughly 1000-1460 px on the long edge to avoid both token waste and lossy server-side downscaling.
6. Treat marketplace skill/MCP directory descriptions as marketing copy, not verified fact, until the underlying repo or docs page is read directly.
7. Keep Blender/asset-authoring concerns and three.js runtime concerns in separate skill files; do not blend "how to export a glTF from Blender" with "how to load a glTF in three.js" in one document.

## Claims likely to change

- WebGPU global browser support percentage (reported as ~83-87% in different September 2026 sources) will keep climbing; re-check via caniuse before citing a number.
- Any "current" skill package's version pin (r160+, R3F v9.5+) will look increasingly stale; re-run the skills.sh/GitHub searches at each refresh.
- Claude's resolution tiers are tied to model generations ("4.7 and later"); a future model generation could change the tier thresholds, so re-fetch the vision page rather than trusting this file's numbers past a few months.
- MCP server feature claims (tool counts, "version-verified") are self-reported by their authors and can drift or be outdated at the source.

## Search plan for next refresh

1. Re-fetch `https://threejs.org/docs/llms.txt` and `llms-full.txt` directly (not just the repo pointer) and diff byte size / version string against this file's date.
2. Re-search `path:SKILL.md three.js` and `path:SKILL.md react-three-fiber` on GitHub code search; note which packages bumped their stated three.js/R3F version.
3. Re-fetch `https://platform.claude.com/docs/en/build-with-claude/vision` directly (not via search snippet) since third-party blogs reliably cite the old pre-patch formula; check the resolution-tier table for new model names.
4. Check `github.com/DmitriyGolub/threejs-devtools-mcp` and similar live-introspection servers for adoption signals (stars, recent commits) versus new entrants.
5. Search caniuse or MDN for current WebGPU baseline browser support percentage.

## Sources

- https://github.com/mrdoob/three.js/blob/dev/llms.txt — fetched 2026-09-26
- https://platform.claude.com/docs/en/build-with-claude/vision — fetched 2026-09-26 (redirected from docs.claude.com)
- https://github.com/deya-0x/ThreeJSMCP — search result, 2026-09-26
- https://github.com/DmitriyGolub/threejs-devtools-mcp — search result, 2026-09-26
- https://github.com/baryhuang/mcp-threejs — search result, 2026-09-26
- https://threejsresources.com/mcp — search result, 2026-09-26
- https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package — search result, 2026-09-26
- https://github.com/Nice-Wolf-Studio/claude-skills-threejs-ecs-ts — search result, 2026-09-26
- https://github.com/EnzeD/r3f-skills — search result, 2026-09-26
- https://github.com/freshtechbro/claudedesignskills — search result, 2026-09-26
- https://agentskill.sh (various threejs-skills listings) — search results, 2026-09-26
- https://cursor.directory/react-native-r3f — search result, 2026-09-26
- https://cursorrules.io/react-native-r3f — search result, 2026-09-26
- https://baeseokjae.github.io/posts/cursor-rules-advanced-2026/ — search result, 2026-09-26
- https://usewalkie.com/blog/claude-image-token-calculation-explained/ — search result (superseded by official docs fetch, cited only as an example of a stale third-party formula), 2026-09-26

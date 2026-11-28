# Changelog: threewright-shaders

Every change to [SKILL.md](SKILL.md) and its companions, newest first, each with the reason. Reasons cite findings in [RESEARCH.md](RESEARCH.md) (`R-`), lessons in [LEARNINGS.md](LEARNINGS.md) (`L-`), and test runs in [TESTS.md](TESTS.md) (`T-`). State in `evergreen.json`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json).

Entry shape: `### C-YYYYMMDD-n · date · one-line summary`, then `because:` (IDs or "user request"), `files:` (file and section), and a sentence on what changed. Cite section headings, not line numbers.

### C-20261128-1 · 2026-11-28 · pencil hatching reference (untested in three.js)
- because: user request (technique harvest 2026-11-28: kevintngo-procedural-rpg)
- files: SKILL.md (reference list), references/pencil-hatching.md (new)

Camera-stable hatching: held paper axes with a crossfade, depth-nested stroke pitch, blend order and a stepped re-seed. Read from an MIT game that uses raw WebGL2; the file says it is untested in three.js and gives the `tw shot` / `tw diff` test that would verify it.

### C-20261121-1 · 2026-11-21 · lighting models, stencil and transparency reference
- because: book distillation (Espindola, The Godot Shaders Bible v0.11, ch. 2 and 4), L-20261121-1
- files: SKILL.md (Step 2 references), references/lighting-and-transparency.md (new)

Rim with matched spaces, Ashikhmin-Shirley hair, tangent requirements, single sRGB conversion, clamp order, stencil portals, double-sided alpha sorting and dithered distance fade, with three.js names checked in the 0.186.1 source. Not run on a page yet.

### C-20261120-1 · 2026-11-20 · ray tracing in shaders, sampling cheat sheet, bump terminator option
- because: R-20261120-1 (book distillation, Ray Tracing Gems ch. 6, 7, 12, 15, 16, 17, 21, 28)
- files: SKILL.md (Step 2 references), references/ray-tracing-in-shaders.md (new), references/sampling.md (new), references/clay-material.md (Notes: Bump terminator)

GLSL ES 3.0 ray-origin offset along the geometric normal in float steps, a stable ray/sphere test, environment mip level from ray spread, running-mean accumulation and delta tracking, all compiled and measured on tests/fixtures/pages/ray-tracing (fixed tMin 1e-4: 42% of a ground plane shadowed by acne at 10,000 units, offset: 0%; textbook sphere 65,536 px against 32,942 expected, stable form 32,928 px; delta-tracking escape 36.6% against 36.8%; accumulation spread 0.072 at 16 frames, 0.036 at 64). A sampler cheat sheet with JS samplers histogram-checked in tests/sampling.test.mjs (cosine AO variance 0.44x uniform per sample) and three-gpu-pathtracer's filterGlossyFactor. Bump terminator fix documented as an option, unverified. DXR-only chapters marked as not carrying.

### C-20261119-2 · 2026-11-19 · Book of Shaders fragment rules
- because: book distillation (The Book of Shaders, ch. 5-12)
- files: SKILL.md (Step 3 lint line), kb/topics/tsl.md, kb/recipes/seeded-randomness.md, kb/rules/lint-rules.json

Fragment idioms (aspect before distance fields, smoothstep edges, transform about the centre, floor/fract tiling with a hashed id, atan and radius normalisation), two debug views, the 3x3 cell-local Worley search, a time-wrap pitfall, and a note that the fract(sin) hash is not bit-exact across GPUs. Three info/warn lint rules: glsl-float-int-literal, glsl-step-visible-edge, glsl-unwrapped-time.

### C-20261119-1 · 2026-11-19 · clay look on stock materials
- because: user request
- files: SKILL.md (Step 2 references), references/clay-material.md (new)

Patching MeshStandardMaterial with onBeforeCompile for a clay surface (ridge normal bump, roughness 0.98, metalness 0), patch versus ShaderMaterial, and the customProgramCacheKey pitfall with a versioned key per variant. Fixture tests/fixtures/pages/clay; a browser test checks two programs compile. Idea seen in a commercial web game demo; written fresh.

### C-20261118-3 · 2026-11-18 · hit-effects in TSL, shield overcharge veins
- because: user request (follow-up to C-20261118-2)
- files: SKILL.md (Step 2), references/hit-effects-tsl.md (new), references/hit-effects.md (Shield)

All six hit-effect recipes written in TSL and checked by tw check on tests/fixtures/pages/hit-fx-tsl (WebGPU backend, no errors). The shield in both languages gains overcharge veins: sin-warped fbm zero crossings, idea from GPU-Bandits, written fresh. Found while verifying: vec3(Color) renders black in TSL, use color().

### C-20261118-2 · 2026-11-18 · hit-effects reference
- because: user request (technique harvest, GPU-Bandits and voidstruck)
- files: SKILL.md (Step 2), references/hit-effects.md (new)

Multi-hit shield, capsule bullet holes, depth-Laplacian outline, nested beam, black-hole disc and octave-offset fbm, written fresh in GLSL and compiled by `tw shaders` on tests/fixtures/pages/hit-fx.

### C-20261118-1 · 2026-11-18 · particle notes
- because: user request (technique harvest, robinduckett/boo-mas)
- files: SKILL.md (Step 2), references/particles.md (new)

Vertex-shader-advected ambient particles and tangent wind on a sphere. kb `post-processing` also gained the r182 `setEffects` HDR section and the `setEffects-output-pass` lint rule.

### C-20261111-1 · 2026-11-11 · kb recipe fft-ocean
- because: user request (technique harvest, post 1vic0bw)
- files: kb/recipes/fft-ocean.md

A CPU FFT ocean (Tessendorf) with Jacobian foam, 4-sample buoyancy and auto-downgrading tiers, verified with tw check and a shot on WebGPU.

### C-20261110-1 · 2026-11-10 · kb recipe tsl-loom-warp
- because: user request (technique harvest, post 1wqawdv)
- files: kb/recipes/tsl-loom-warp.md

A TSL positionNode world warp that keeps height and compresses distance past a radius, verified with tw check and two shots on WebGPU.

### C-20260926-2 · 2026-09-26 · WebGPU recipes verified on a real GPU; bloom values fixed
- because: ai-docs/HANDOFF.md step 5
- files: kb/recipes/bloom-webgpu.md (Code, Verify, Notes), kb/recipes/tsl-custom-material.md (Verify, Notes), kb/recipes/webgpu-backend-check.md (Verify, Notes)
- All three pass `tw check --webgpu` on Chrome 153 with an RTX 5060 Ti. A look at the bloom shot showed a blowout on both backends, so emissive went from x3 to x1.1 and strength from 1.2 to 0.6, with one directional light added. The backend check's Verify section named a `--webgl` flag tw does not have.

### C-20260926-1 · 2026-09-26 · Created as an evergreen unit
- because: user request (ai-docs/HANDOFF.md step 6)
- files: SKILL.md, RESEARCH.md, LEARNINGS.md, TESTS.md, evergreen.json, evals/evals.json
- Initial version. Tier `fast`, interval 14 days. See R-20260926-1 for the research basis; the first test run is logged in TESTS.md.

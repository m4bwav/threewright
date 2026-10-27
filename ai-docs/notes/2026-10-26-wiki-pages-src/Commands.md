Every output on this page is filled from the threewright 0.6.7 tag-archive verification on Windows, with `tw` standing for `node <plugin>/scripts/tw.mjs`. Paths of the scratch folder are shown as `<work>`, the local server's port as `<port>`, and numbers that change from run to run with timing as `<n>`, `<h>`, `<s>` and the like. The verification program is `ai-docs/notes/2026-10-26-wiki-verify.py` in the repository.

Add `--json` to any command for machine-readable output.

## The command list

```sh
tw --help
```

<!-- outputs: skip (usage synopsis) -->
```text
{{help}}
```

## Verify a page

A page is a file, a folder with an `index.html`, or a URL. Local pages are served from 127.0.0.1 (Chrome blocks module imports from `file://`), and a local path may carry a query string or hash (`tw check "page/?model=x.glb"`).

### check

```sh
tw check site/
```

On the `html-importmap` starter (`tw new html-importmap site`) it prints:

```text
{{check|noexit}}
```

Line by line: `three` is the release tw detected, with how many scenes and `render()` calls it saw. `renderer` gives the main renderer's numbers for the last frame. `cdn` says the pinned jsDelivr or unpkg files were served from `node_modules` or the tw cache. `scene` and `bounds` describe the main scene: the one rendered in most frames, never an environment scene when anything else exists. `pixels` is what the canvas shows, measured against its background colour. `result` is OK or PROBLEMS FOUND. The scene count is 2 here because the starter bakes a `RoomEnvironment`. Exit code 0 on OK, 1 otherwise. What makes it fail is on [Errors and edge cases](Errors-and-Edge-Cases#what-tw-check-reports).

Page options shared by the browser commands: `--size 960x540 --dpr 1 --gl auto|gpu|swiftshader --webgpu --wait 1000 --root dir --reduced-motion --color-scheme light|dark --timeout 60000 --headed --cdn auto|offline|net`.

### check --eval

`--eval` prints the value of one expression after the page settles. `renderer`, `scene` and `camera` are bound to the main ones tw observed, so this works on pages that keep them in module scope:

```sh
tw check site/ --eval "renderer.info.render.calls > 0"
```

The output is the same as above with one line added before `result`:

```text
eval: true
```

```sh
tw check site/ --eval "scene.getObjectByName('knot').material.color.getHexString()"
```

```text
eval: "3fa7ff"
```

The expression is one expression: join steps with commas, `"(__tw.setProgress(1), hide())"`; a `;` is a syntax error.

### check --save and --against

```sh
tw check site/ --save before.json
tw check site/ --against before.json
```

The first run adds `saved before.json`; the second compares renderer and scene counts, object types, problems and the changed frame region:

```text
against before.json (<time>): no changes
```

Other `check` options: `--strict` also fails on any console warning (three's own deprecation warnings always fail), `--cycles 5 [--cycle "<js>"]` runs `window.__tw.cycle()` or the expression N times and fails on steady growth of geometries, textures or programs, `--shot a.png --sheet b.png --tree` makes extra outputs in the same browser launch, and `--actions "key KeyW 500; click 480,270; drag 100,100 300,120; wheel 480,270 -120; type hi; wait 500"` sends input first. A page that defines `render_game_to_text()` gets its text printed as `game:`.

### scene

```sh
tw scene site/
```

```text
{{scene|noexit}}
```

`--depth 6 --max 80` limit the tree; long runs of similar siblings are collapsed.

### shot and sheet

```sh
tw shot site/ --out shot.png
```

```text
wrote shot.png (960x540, 700 image tokens)
```

It then prints the same `pixels:` line as `check`. `--canvas` captures the canvas alone, `--alpha` keeps transparency, `.jpg` or `.webp` write that format (`--quality 82`) for a poster, and `--eval "<js>"` sets a state first (`scrollTo(0, 2000)`).

```sh
tw sheet site/ --out sheet.png
```

```text
{{sheet|noexit}}
```

A sheet puts several angles (`--views current,front,right,top`) in one image. `--sweep "find('knot').material.roughness=0,0.5,1"` makes one tile per value from the current view and puts the old value back afterwards; `--labels` (on `shot` too) draws name tags on objects and prints the legend as text.

### diff

```sh
tw diff shot.png shot.png
```

```text
{{diff|noexit}}
```

`--threshold 0.1` is the per-channel tolerance, `--max 0.001` the share of pixels allowed to differ, `--out d.png` writes the difference. Exit code 1 on FAIL.

### perf

```sh
tw perf site/ --seconds 2
```

```text
{{perf|noexit}}
```

The frame times are left out here because they change every run. Headless Chrome ran at a 60 fps vsync cap on the test machine, so fps says little: read p95, p99 and max. `--cpu-throttle 4` slows the CPU.

### video

```sh
tw video site/ --out turn.mp4 --seconds 1 --fps 10
```

```text
{{video|noexit}}
```

Formats: `.mp4`, `.webm`, `.gif`, `.mov`; `--alpha` needs `.webm` or `.mov`. The driver is the virtual clock unless the page defines `__tw.renderFrame(i, fps)` or `advanceTime(ms)`; `--capture canvas` reads the canvas without HTML overlays and `--frames-dir d` writes the frames. Needs ffmpeg.

### shaders

```sh
tw shaders bad-shader/
```

On the repository's `tests/fixtures/pages/bad-shader` page, whose fragment shader uses an undeclared `glowColour`:

```text
{{shaders bad shader}}
```

`--dump dir` writes each program's `.vert` and `.frag`. It lists WebGL programs only; WebGPU WGSL errors show up in `tw check`.

## Static tools

### lint

```sh
tw lint old/
```

On an r150-era page (`old/index.html`):

```html
<!doctype html>
<script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.150.0/examples/js/controls/OrbitControls.js"></script>
<script>
  const renderer = new THREE.WebGLRenderer();
  renderer.physicallyCorrectLights = true;
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  const box = new THREE.BoxBufferGeometry(1, 1, 1);
</script>
```

it prints:

```text
{{lint old page}}
```

Each finding names the rule, the release that changed the API and the fix. The first line is the release lint assumed: here read from the pinned URL; otherwise `--target r186`. Exit code 1 when there is an error; `--strict` also fails on warnings. `--md` also lints the code fences of markdown files found in a folder; a markdown file named on the command line is always linted.

Rules with severity `info` are notes. The 0.6.6 note `composer-without-aa` fires on an `EffectComposer` with no multisampled target and no AA pass (`post/bloom.js`):

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
```

```text
{{lint composer}}
```

A note does not change the exit code. Give the composer a multisampled target and the note goes:

```js
import { WebGLRenderTarget, HalfFloatType } from 'three';

const target = new WebGLRenderTarget(innerWidth, innerHeight, { type: HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
```

```text
{{lint composer fixed}}
```

The 0.6.5 note `typed-buffer-attribute-copies` (`wave/wave.js`):

```js
function makeWave(count) {
  const positions = new Float32Array(count * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = Math.sin(i);
  return geometry;
}
```

```text
{{lint typed buffer attribute}}
```

### glb

```sh
tw glb forest.glb
```

On a model with one tree mesh placed by 150 plain nodes:

```text
{{glb forest}}
```

From 0.6.6, draw calls are counted per node that draws a mesh, and 50 or more nodes that repeat a mesh get the warning. The same 150 trees as one `EXT_mesh_gpu_instancing` node:

```sh
tw glb forest-instanced.glb
```

```text
{{glb forest instanced}}
```

A double-sided card with `alphaMode` BLEND and a 1000 x 750 texture gets the two other 0.6.6 warnings:

```sh
tw glb cards.glb
```

```text
{{glb cards}}
```

The exit code is 0 with warnings. `--strict` makes it 1 when there is any warning (`tw --help` does not list `--strict` for `glb`; it is in `scripts/lib/glb.mjs`):

```sh
tw glb cards.glb --strict
```

```text
{{glb strict}}
```

`--json` gives the full report:

```sh
tw glb forest-instanced.glb --json
```

```text
{{glb json|noexit}}
```

Other warnings `glb` gives (from `scripts/lib/glb.mjs`): required extensions GLTFLoader r186 does not handle, files over 5 MB and over 10 MB, over 500k and over 2M triangles, over 200 draw calls, textures over 2048 px, more than 32 MB of uncompressed texture memory without KTX2, primitives without normals, a model over 100 units or under 0.01 units across, and missing external images or `.bin` buffers. `needs:` lines name the decoder an extension needs.

### kb

```sh
tw kb search "transparency sorting"
```

```text
{{kb search}}
```

```sh
tw kb show models-for-the-web --section Budgets
```

```text
{{kb show models budgets}}
```

```sh
tw kb list --kind rule
```

```text
{{kb list rule}}
```

`kb index` regenerates `kb/INDEX.md` and `kb/index.json`, `kb validate [--strict]` checks every entry against `kb/SCHEMA.md`, and `kb note <slug> "<text>"` adds a dated note. More on [The knowledge base](Knowledge-Base).

### new, templates and vendor

```sh
tw new html-importmap site
```

```text
{{new|noexit}}
```

`--force` writes into a folder that is not empty; templates marked `"vendor": true` (product-viewer, scroll-hero) are vendored unless `--no-vendor`. `tw templates` lists the starters: see [Templates](Templates).

```sh
tw vendor site/ --dry-run
```

```text
{{vendor dry run|noexit}}
```

Without `--dry-run` it copies those pinned CDN modules, their own imports and the files they fetch by `new URL(..., import.meta.url)` (the r186 Draco and KTX2 decoders) into `vendor/`, and rewrites the import map. The bytes come from `node_modules`, the tw cache or `npm pack`, never the CDN.

### deprecations and versions

With three installed in `dev/` (`npm ci` there):

```sh
tw deprecations
```

```text
{{deprecations|noexit}}
```

```sh
tw versions --check
```

On 2026-10-26 it printed (the list changes as packages release; first and last lines):

```text
@gltf-transform/cli            latest 4.5.1        BEHIND  (4.5.0 in 1 place)
@google/model-viewer           latest 4.4.0        BEHIND  (4.3.1 in 1 place)
```

```text
three                          latest 0.186.1      ok  (0.186.1 in 14 places)
```

```text
15 package(s) behind: refresh those kb entries and templates (threewright-curate), then tw kb validate
```

Exit code 1 when anything is behind.

### doctor

`tw doctor` checks Node, Chrome, ffmpeg, npm, CDN reach, and WebGL and WebGPU in headless Chrome; its output is on [Getting started](Getting-Started#check-the-machine).

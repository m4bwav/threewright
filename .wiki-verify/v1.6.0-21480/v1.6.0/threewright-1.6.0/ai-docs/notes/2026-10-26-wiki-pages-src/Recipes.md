Each recipe is a short sequence of `tw` commands. Outputs are on [Commands](Commands); this page shows the order and what to read.

## Prove a page works before calling it done

The skills follow the verification ladder (`tw kb show verification-ladder`): the cheapest evidence first.

```sh
tw lint site/
tw check site/
tw shot site/ --out shot.png
```

1. `lint` catches stale APIs before anything runs. On the starter it printed:

```text
{{lint site|noexit}}
```

2. `check` must end in `result: OK`. Read `pixels:` too: `46% differ from the background` means something covers about half the canvas; 0% with "one flat colour" means nothing rendered.
3. Look at one shot (700 image tokens at 960 x 540). A `result: OK` page can still look wrong.

## Upgrade an old project

```sh
tw lint old/
```

Each finding names the release that changed the API and the fix (output on [Commands](Commands#lint)). Fix the errors first: they are APIs that no longer exist in r186 (`examples/js`, `THREE.OrbitControls`). Then read the legacy map:

```sh
tw kb show current-vs-legacy
```

The kb recipe `upgrade-an-old-project` walks the whole port (`tw kb show upgrade-an-old-project`); it was run when 0.2.0 was made.

## Check a model before it goes on a page

```sh
tw glb forest.glb
```

Read the `draw calls` count and the warnings. The forest model on [Commands](Commands#glb) draws 150 times for 150 copies of one mesh, and `glb` names three ways to instance them: `gltf-transform instance`, `gltfpack -mi`, or Blender's glTF export with GPU instances. After instancing, the same trees are one draw call (`forest-instanced.glb`). Running `gltf-transform instance` on the test model was not tested for this page.

For a blended double-sided material, `glb` suggests `alphaMode` MASK (alphaTest, or alphaToCoverage with MSAA) when the material is a leaf, grass, fence or hair card. The why is in `tw kb show transparency-and-blending --section Essentials`.

With the polywright plugin installed, `threewright-assets` gets models from polywright's asset folder with its `web-threejs` target instead ([The skills](The-Skills#threewright-assets-and-polywright)).

## Compare before and after a change

```sh
tw check site/ --save before.json
tw check site/ --against before.json
```

Make the change between the two runs. The second run lists what changed: renderer and scene counts, object types, new or gone problems and the changed frame region, or `no changes`.

## Record a short video

```sh
tw video site/ --out turn.mp4 --seconds 1 --fps 10
```

```text
{{video|noexit}}
```

The virtual clock steps the page frame by frame, so the video has exactly `seconds x fps` frames whatever the machine's speed. For a seamless product loop start from the `video-turntable` template, whose `window.__tw.renderFrame(i, fps)` drives each frame.

## Find a shader error

```sh
tw shaders bad-shader/
```

The failing program's error lines come with source context, with `>` on the line the compiler named (output on [Commands](Commands#shaders)).

## Ship a page with no CDN requests

```sh
tw vendor site/ --dry-run
```

The dry run lists the files and size it would copy; run it again without `--dry-run`, then `tw check site/ --cdn offline` to prove the page needs no network.

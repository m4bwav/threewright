threewright is installed from the repository, so a version is a git tag (`v0.6.6`) with a GitHub Release; nothing is published to npm. `.claude-plugin/plugin.json`, the root `plugin.json` and `dev/package.json` carry the same version. In Claude Code, update the `threewright` marketplace and then the plugin from the `/plugin` menu (not run for this page).

| Version | Date | What changed |
|---|---|---|
| 0.6.6 | 2026-10-26 | kb topics `transparency-and-blending` and `models-for-the-web`; rendering pitfalls; `tw lint` note `composer-without-aa`; `tw glb` counts draw calls per node, warns on repeated meshes, BLEND double-sided materials and texture sides not a multiple of 4; threewright-assets asks polywright for models |
| 0.6.5 | 2026-10-05 | root `plugin.json` for Copilot CLI and awesome-copilot; `tw lint` note `typed-buffer-attribute-copies` |
| 0.6.4 | 2026-10-04 | `package.json` and lockfile moved to `dev/`; nothing to install with the plugin |
| 0.6.3 | 2026-10-03 | no binaries in the repository (`tw new` generates the sample model and splat scene); exact versions in every `npx` command; Privacy section |
| 0.6.2 | 2026-09-26 | redundant outcome evals skipped by default; r3f trigger fixed |
| 0.6.1 | 2026-09-26 | headless eval harness `evals/headless/` |
| 0.6.0 | 2026-09-26 | `tw vendor` copies decoder files; product-viewer vendored |
| 0.5.0 | 2026-09-26 | `tw vendor`; JPEG and WebP shots; backdrop objects left out of bounds |
| 0.4.1 | 2026-09-26 | first full eval run; BT.709 tags in videos; Git Bash query paths |
| 0.4.0 | 2026-09-26 | `sheet --sweep`; `advanceTime(ms)` video driver |
| 0.3.0 | 2026-09-26 | `--actions`, `check --cycles`, `tw shaders`, `--labels`, `--color-scheme`; six fixes |
| 0.2.0 | 2026-09-26 | all templates built, every recipe run, WebGPU verified on a real GPU; `tw perf`, `--save` and `--against` |
| 0.1.0 | 2026-09-26 | first release |

Dates are the CHANGELOG's. The details of every release are in the [CHANGELOG](https://github.com/m4bwav/threewright/blob/main/CHANGELOG.md).

## From 0.6.5 to 0.6.6

Nothing to change in your pages or scripts. Three things read differently:

- **`tw glb` draw calls.** 0.6.5 counted one draw call per mesh; 0.6.6 counts one per node that draws a mesh, so a mesh reused by many plain nodes now shows its real cost. The same 150-tree model, under 0.6.5:

```text
{{glb forest 0.6.5|noexit}}
```

and under 0.6.6:

```text
{{glb forest|noexit}}
```

A node with `EXT_mesh_gpu_instancing` is still one draw call. Scripts that read `drawCalls` from `tw glb --json` see the higher number, and the new repeated-mesh warning, on such models.

- **New `tw glb` warnings.** A BLEND double-sided material and a texture side that is not a multiple of 4 are warned about; 0.6.5 printed no warnings for the same `cards.glb`. With `--strict`, `tw glb cards.glb` exits 1 under 0.6.6 and 0 under 0.6.5.
- **New `tw lint` note.** `composer-without-aa` fires on an `EffectComposer` without a multisampled target or an AA pass. It is a note (severity `info`), so the exit code does not change, even with `--strict`.

The knowledge base grew from 89 to 91 entries and the lint rules from 68 to 69, counted with `tw kb list` and in `kb/rules/lint-rules.json` at each tag:

| Tag | Entries (`tw kb list --kind ...`) | Lint rules |
|---|---|---|
| v0.6.5 | {{kb counts 0.6.5}} | {{lint rule count 0.6.5}} |
| v0.6.6 | {{kb counts}} | {{lint rule count}} |

## From 0.6.3 or older

- 0.6.4 moved the development `package.json` and lockfile to `dev/`. Run `npm install` and `npm test` there, not at the plugin root.
- 0.6.3 removed product-viewer's `model.glb` and splats' `scene.splat` from the repository; `tw new` writes them in the new folder from the template's own script.

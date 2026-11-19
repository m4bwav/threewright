## What tw check reports

`tw check` prints the renderer, scene and pixel lines (see [Commands](Commands#check)), then one heading per kind of problem, then `result:`. The headings it printed in the runs below are `EXCEPTIONS`, `ERRORS`, `CHECK` and `fix hints`; three's own deprecation warnings have their own heading and always fail. Any problem makes the result `PROBLEMS FOUND` and the exit code 1. Other console warnings only print, unless `--strict`. A 404 for `/favicon.ico` is ignored.

### A lit mesh and no light

The repository's `tests/fixtures/pages/black-mesh` page has a `MeshStandardMaterial` cube, no light and no environment:

```sh
tw check black-mesh/
```

```text
{{check black mesh|noexit}}
```

### A camera aspect set without updateProjectionMatrix

`tests/fixtures/pages/stale-projection` sets `camera.aspect` and never updates the projection. The check reads the projection matrix, so it catches it (since 0.3.0):

```sh
tw check stale-projection/
```

```text
CHECK (1):
  camera.aspect is 1.78 but the projection matrix still uses 1: call camera.updateProjectionMatrix() after setting aspect
result: PROBLEMS FOUND
```

### A bare "three" import with no import map

```sh
tw check missing-import-map/
```

```text
{{check missing import map|noexit}}
```

The fix hints come from `scripts/lib/hints.mjs`, which matches known error texts (a missing import-map entry, a missing DRACOLoader, a WebGPU texture swizzle error).

## Exit codes

| Command | 0 | 1 |
|---|---|---|
| `check`, `shaders` | OK, every program linked | a problem found, a program failed |
| `lint` | no errors (warnings and notes allowed) | an error; with `--strict`, any warning |
| `glb` | report printed, warnings allowed | with `--strict`, any warning |
| `diff` | PASS | FAIL |
| `versions --check` | everything current | a package behind |

An unknown command prints the help and exits 2; a command that throws prints the error and exits 1 (`scripts/tw.mjs`).

## What tw glb warns about

The warnings and their thresholds are listed on [Commands](Commands#glb). One number there changed meaning in 0.6.6: draw calls are counted per node that draws a mesh, not per mesh (see [Versions and upgrading](Versions-and-Upgrading#from-065-to-066)).

## Known limits

- `result: OK` does not mean the page looks right: bloom-webgpu once passed while blown out (HANDOFF). Look at one `tw shot`.
- `WebGPURenderer`'s `info.render.calls` counts `render()` calls since the start; the per-frame number is `info.render.drawCalls`.
- `tw shaders` lists WebGL programs only; WebGPU WGSL errors show up in `tw check`.
- Headless Chrome reports `prefers-color-scheme: dark`; pass `--color-scheme light` for a light palette.
- Headless Chrome ran at a 60 fps vsync cap on the test machine, so `tw perf` fps is uninformative; read p95, p99 and max.
- `--eval` takes one expression; join steps with commas.
- Git Bash does not convert `/tmp/...?query` paths; pass a `C:/...` path when a local page carries a query string outside `/c/`. tw maps `/c/...` itself on Windows (0.4.1).
- On the html-importmap starter, which animates, the scene bounds and the screenshot's pixel box move between runs, and the render-call count depends on how long the page ran. A `check --against` comparison can report a real change even when the source is unchanged. The browser test uses a static fixture from 0.6.7; the comparison thresholds are unchanged.
- In one of seven verification runs, `tw scene site/` printed only the root `Scene` line with no children; the other runs printed the full tree. Not reproduced since; if it happens, run it again or use `tw check site/ --tree`.

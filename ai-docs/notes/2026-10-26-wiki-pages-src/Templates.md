Twelve starters ship in `templates/`. Each passed `tw check` when it was made, and its `template.json` records where and how (`verified`). Copy one with `tw new <template> <dir>`; list them with:

```sh
tw templates
```

```text
{{templates}}
```

## Notes on using them

- `html-importmap`, `html-webgpu`, `chart-3d-scatter`, `surface`, `globe`, `product-viewer`, `scroll-hero`, `splats` and `video-turntable` are single pages with no build. Their import maps pin three 0.186.1 on jsDelivr; `tw check` serves those files from `node_modules` or the tw cache when it can (`cdn:` line).
- `product-viewer` and `scroll-hero` are marked `"vendor": true`, so `tw new` copies three (and the Draco and KTX2 decoders, or GSAP and Lenis) into `vendor/` and rewrites the import map; `--no-vendor` keeps the CDN. `tw new` also writes product-viewer's sample `model.glb` with `make-model.mjs` and splats' `scene.splat` with `make-splat.mjs` (since 0.6.3, the binaries are not in the repository).
- `vite-ts`, `r3f` and `game-starter` need a build: run `npm ci` in the new folder, build, then `tw check dist/`. The browser tests build and check them only when their own `node_modules` exists.
- `html-webgpu` and `splats` run on WebGPU where the browser has an adapter and fall back to WebGL 2 otherwise; `tw check --webgpu` and `tw check --gl swiftshader` check each path.
- Headless Chrome reports `prefers-color-scheme: dark`; use `--color-scheme light` to see a light palette.

The [Recipes](Recipes) page has a copy, check and record walk-through.

The knowledge base in `kb/` is what the skills read. At 0.6.7 it holds 91 entries, counted with `tw kb list --kind <kind>`:

```text
{{kb counts}}
```

Start at `kb/INDEX.md` (generated, one line per entry) and read `kb/SCHEMA.md` before editing.

## Kinds

| Kind | Folder | Holds | Required sections |
|---|---|---|---|
| topic | `topics/` | a core concept: renderers, colour management, lighting, TSL, post-processing, loaders, performance | Essentials, Pitfalls, Verify, Notes |
| scenario | `scenarios/` | a job people do: a 3D chart in a document, a product viewer, a game, a video, a globe | When, Stack, Build, Pitfalls, Verify, Notes |
| library | `libraries/` | one package of the ecosystem: React Three Fiber, Rapier, glTF Transform | Use it for, Avoid it when, Setup, Pitfalls, Notes |
| recipe | `recipes/` | one task with working code | Goal, Code, Verify, Notes |
| rule | `rules/` | a cross-cutting rule the skills apply | Rule, Why, Notes |

## Release ranges keep it current

Every entry's frontmatter carries `applies_to` (`any`, `>=r152`, `<r152`, `r152-r186`, `r186`) and `status` (`current` or `legacy`). Current practice is written for the newest range; anything that only held for older releases lives in a `legacy` entry or a code fence marked `legacy`, with its range. An agent porting an old project still finds it, and an agent on a new one is never taught it. Legacy entries rank lower in search. Code fences in current entries are linted as r186 code by `tw kb validate`.

## Searching and reading

```sh
tw kb search "transparency sorting"
tw kb show transparency-and-blending --section Essentials
```

`search` prints the top 8 entries, one line each (output on [Commands](Commands#kb)). `show` prints an entry or only the sections named; the header line names the file, status and range:

```text
# Transparency and blending (topics/transparency-and-blending.md; current, >=r162)
```

## New in 0.6.6

- `transparency-and-blending` (topic): pick the transparency by its cause before touching `transparent`. Coverage (leaf and grass cards, fences) takes `alphaTest`, or `alphaToCoverage` with MSAA, or `alphaHash`; transmission (glass, water) takes `MeshPhysicalMaterial.transmission`; glow takes additive blending with `depthWrite: false`. Then the sorting traps. Its Notes say it was not run in a page.
- `models-for-the-web` (topic): what a glTF model must be for three.js (PBR and ORM maps, KTX2, meshopt or Draco, budgets, LODs, lightmaps on `uv1`, styles, scale and pivots, failure modes), pointing to polywright for making and fixing models. Its Pitfalls cover Blender Geometry Nodes scatters (need `export_gpu_instances`), Smooth by Angle (modifiers must be applied) and flipped faces. Its budget table:

```text
{{kb show models budgets}}
```

- Rendering pitfalls added to existing entries: LOD switching by projected size, pixel-art texture filtering and anisotropy, composer MSAA, depth precision and shadow acne.

## Lint rules

`kb/rules/lint-rules.json` holds the rules `tw lint` applies: 69 at 0.6.7, each with the release that changed the API, a message, a fix, a sample that must fire and an `ok` sample that must not. Rules come from three's own `@deprecated` markers (`tw deprecations` lists markers no rule covers yet) and from pitfalls found in real projects (`typed-buffer-attribute-copies` in 0.6.5, `composer-without-aa` in 0.6.6). Release numbers in rules were checked against npm tarballs.

## Changing it

Edit `kb/**/*.md` by `kb/SCHEMA.md` and `ai-docs/notes/kb-authoring-brief.md`, then run `tw kb validate --strict` and `tw kb index`. Never edit `INDEX.md` or `index.json` by hand. A user correction lands first as a dated note (`tw kb note <slug> "<text>"`) and is promoted into its section on the next curation pass, which `threewright-curate` runs.

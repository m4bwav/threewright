# Knowledge base schema

One markdown file per entry, `kb/<folder>/<slug>.md`, with YAML frontmatter and a fixed set of `##` sections per kind. `node scripts/tw.mjs kb index` compiles the frontmatter into [INDEX.md](INDEX.md) (the one-line-per-entry table an agent reads first) and `index.json`; `node scripts/tw.mjs kb validate` enforces this schema and lints every code block in current entries against [rules/lint-rules.json](rules/lint-rules.json). Never edit INDEX.md or index.json by hand.

## Kinds and folders

| kind | folder | holds |
|---|---|---|
| `topic` | `topics/` | a core concept of three.js: renderers, color management, lighting, TSL, post-processing, loaders, performance |
| `scenario` | `scenarios/` | a job people do with three.js: a 3D chart in a document, a product viewer, a game, a video, a globe |
| `library` | `libraries/` | one package of the ecosystem: React Three Fiber, Rapier, glTF Transform |
| `recipe` | `recipes/` | one task with working code: load a glTF with its decoders, fit the camera, capture a still |
| `rule` | `rules/` | a cross-cutting rule the skills apply: the verification ladder, when 3D is justified, current versus legacy |

## Frontmatter

```yaml
---
title: Color management          # display name
slug: color-management           # = file name without .md
kind: topic                      # topic | scenario | library | recipe | rule (must match the folder)
summary: One line on what the entry answers; it becomes the index line (under 200 characters).
tags: [color, srgb, textures, tone mapping]
applies_to: ">=r152"             # release range the content is right for: any | >=r152 | <r152 | r152-r186 | r186
status: current                  # current | legacy
renderer: both                   # webgl | webgpu | both | none
last_verified: 2026-09-26        # the date the claims were last checked against a primary source
sources: [https://..., ai-docs/research/2026-09-26-core-r160-r186.md]
related: [lighting, tone-mapping] # optional, slugs that exist
template: html-importmap          # optional, a folder under templates/
superseded_by: renderers          # legacy entries: the current entry that replaces it
package: "@react-three/fiber"     # library entries: the npm name
version_checked: "9.8.1"          # library entries: the version the entry was checked against
---
```

- `applies_to` is what keeps the base evergreen: current practice is written for the newest release range, and anything that only held for older releases lives in a `legacy` entry (or a code fence marked `legacy`) with its range, so an agent working on an old project can still find it and an agent on a new one is never taught it.
- `status: legacy` entries are listed in their own section of the index and rank lower in search.
- `sources` are URLs or repository paths (a research note, a template). Rules may cite only research notes; every other kind needs at least one source.
- `last_verified` older than 120 days is a validate warning: re-check the claims (the curate skill does this on refresh).
- Library entries also carry `package` and `version_checked`; `tw versions` compares them with npm.

## Sections by kind (in this order; `tw kb show <slug> --section <name>` reads them)

| kind | required sections |
|---|---|
| topic | `## Essentials`, `## Pitfalls`, `## Verify`, `## Notes` |
| scenario | `## When`, `## Stack`, `## Build`, `## Pitfalls`, `## Verify`, `## Notes` |
| library | `## Use it for`, `## Avoid it when`, `## Setup`, `## Pitfalls`, `## Notes` |
| recipe | `## Goal`, `## Code`, `## Verify`, `## Notes` |
| rule | `## Rule`, `## Why`, `## Notes` |

Optional sections may sit between them: `## Legacy` (what older releases did, with release numbers), `## Budgets`, `## Accessibility`, `## Alternatives`, `## Versions`, `## Examples`.

- `## Verify` says how to prove the thing works without looking at pixels first: a `tw` command, a console message that must be absent, a number in `tw check` output. It is the section the debug skill reads.
- `## Notes` holds dated lines (`- 2026-09-26: ...`), appended by `tw kb note <slug> "<text>"`. User corrections land there first; a note that changes the guidance is promoted into its section on the next curation pass and logged in the curate skill's CHANGELOG.md.

## Code in entries

- Code fences are linted as r186 code. A fence that deliberately shows an old API gets `legacy` in its info string (```` ```js legacy ````), and the prose around it says which release it belongs to.
- Imports use the specifiers of the import-map templates (`three`, `three/addons/...`, `three/webgpu`, `three/tsl`) so snippets paste into both the no-build templates and bundler projects.
- Keep snippets minimal and runnable in context; point to a template for the full page.

## Lint rules

[rules/lint-rules.json](rules/lint-rules.json) holds one rule per stale or risky API: `id`, `pattern` (a JavaScript regex source), `since` (release that deprecated it, or removed it without a deprecation period), `removed` (release that deleted it), `status` (`removed`, `deprecated`, `pitfall`), `message`, `fix`, `sample` (must match), `ok` (must not match), `source`, optional `requires` (a regex the file must match first), `unless` (a regex that turns the rule off for the file) and `verify: true` while the release numbers still need a primary-source check. `skipped` lists deprecation markers in three's source that deliberately have no rule, each with a reason. `tw deprecations` lists markers in the installed three that are neither covered nor skipped.

## Adding an entry

Copy an entry of the same kind as the starting point, keep the section order, fill every section (no TODO), cite sources, then run `node scripts/tw.mjs kb validate` and `node scripts/tw.mjs kb index`. The authoring standard is [../ai-docs/notes/kb-authoring-brief.md](../ai-docs/notes/kb-authoring-brief.md).

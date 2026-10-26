Agent rules for the repository are in [AGENTS.md](https://github.com/m4bwav/threewright/blob/main/AGENTS.md); the handoff and the session log are in `ai-docs/`.

## Tests

The development `package.json` lives in `dev/`, so installing the plugin installs nothing:

```sh
npm ci
npm test
```

Run both in `dev/`. `npm test` runs `node --test ../tests/*.test.mjs`: unit tests and browser tests that check every template. At v0.6.6 on the Windows test machine it gave 64 tests, 61 passed, 3 skipped, 0 failed:

<!-- outputs: skip (node --test summary with timings; recorded in ai-docs/notes/2026-10-26-github-wiki.md) -->
```text
ℹ tests 64
ℹ pass 61
ℹ fail 0
ℹ skipped 3
```

The three skips are the templates with a build step (vite-ts, r3f, game-starter): they are built and their `dist` checked only when the template's own `node_modules` exists (`npm ci` in the template folder). Browser tests skip when no Chrome is found. The repository has no CI workflow; run the tests before committing.

The animated starter makes one browser test timing-sensitive: `perf prints frame percentiles; --save then --against reports no changes` failed once while another Chrome workload ran on the same machine and passed on three reruns alone.

Every CLI change has a test in `tests/`. `scripts/tw.mjs` stays dependency-free and runs on Windows, macOS and Linux.

## The knowledge base

Edit `kb/**/*.md` by `kb/SCHEMA.md`, then:

```sh
tw kb validate --strict
tw kb index
```

`validate` checks frontmatter, sections, sources, the lint rules' `sample` and `ok` texts, and lints code fences in current entries; `--strict` also fails on an em dash outside code. See [The knowledge base](Knowledge-Base).

After a three.js release, `tw deprecations` lists `@deprecated` markers no lint rule covers and `tw versions --check` lists packages the kb and templates are behind on; `threewright-curate` does the refresh. Release numbers come from npm tarballs (`npm pack three@0.<N>.0`) or the installed source, never from memory.

## Evals

Each skill's eval cases are exported under `evals/<skill>/`. `evals/headless/run.py` runs the action and outcome cases through `claude -p --plugin-dir` in fresh workspaces (3 runs each plus a no-plugin baseline, resumable) and `evals/headless/grade.py` grades them into `evals/results/headless-latest.md`. Cases the baseline also passes are marked `redundant` and skipped unless `--all`. HANDOFF puts a run at about $0.50 and a full pass at 37 runs; rerun only the skill that changed (`--filter <skill>`). `evals/run-triggers.sh` runs the trigger and decoy cases.

## Releases

Bump `.claude-plugin/plugin.json`, the root `plugin.json` and `dev/package.json` together (knowledge additions minor, fixes patch, breaking CLI or schema changes major), move the CHANGELOG's Unreleased entries under the version, tag `vX.Y.Z` and publish a GitHub Release for the tag with the CHANGELOG section as notes. Work lands on `main` through pull requests; side branches are merged and deleted.

## The wiki

The wiki's examples are run by `ai-docs/notes/2026-10-26-wiki-verify.py`, which downloads a tag's source archive into a scratch folder and runs every command the pages show; its saved output is next to it. `ai-docs/notes/2026-10-26-github-wiki.md` says how to update the wiki for the next release.

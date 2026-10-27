---
title: GitHub wiki provenance for 0.6.6 and 0.6.7
kind: note
date: 2026-10-26
verified: 2026-10-26
stale_after: 2027-04-26
tags: [wiki, docs, 0.6.6, 0.6.7, github]
summary: "the published 0.6.7 wiki commit and passing gates, original 0.6.6 evidence, released-tag archive verification, sources and rebuild procedure, and unresolved findings"
---

# GitHub wiki for 0.6.6 and 0.6.7

## 0.6.7 verification

The original 0.6.6 recording and findings below remain historical evidence. The 0.6.7 source changes correct the README counts and help omission, refresh HANDOFF and use a static browser comparison fixture. `2026-10-26-round2-followup.md` records the execution results and unresolved scene observation.

Parent ran the verifier against the released v0.6.7 and historical v0.6.5 source archives. It completed with exit 0 and empty stderr. The recording identifies `threewright 0.6.7 (tag v0.6.7 archive)` and Node 24.18.0. Its help includes `glb --strict` and the warning exit code. The scene case printed the root, directional light, knot mesh and ground mesh; the root-only observation did not recur. The saved-run comparison printed `no changes`.

This run does not resolve the earlier intermittent empty-tree observation. `versions --check` reports 14 packages behind and exits 1 as expected for that command; an ecosystem refresh was outside this follow-up. Individual negative fixtures also deliberately return nonzero exits, which the recording preserves.

The original recording is in the parent session at `files/threewright-067-wiki.out.txt`. Preserve it in this folder as `2026-10-26-wiki-verify-067.out.txt` before committing the publication record. The original 0.6.6 recording stays separate.

The verification program defaults to 0.6.7 and still downloads 0.6.5 for the historical comparison. Scratch files stay in `.wiki-verify/v<version>-<pid>` below the working directory. Reproduce from the repository root:

```powershell
python ai-docs\notes\2026-10-26-wiki-verify.py 0.6.7 > ai-docs\notes\2026-10-26-wiki-verify-067.out.txt
python ai-docs\notes\2026-10-26-wiki-build-pages.py ai-docs\notes\2026-10-26-wiki-verify-067.out.txt ai-docs\notes\2026-10-26-wiki-pages-src D:\m4bwa\Claude\Projects\Ai\threewright.wiki ai-docs\notes\2026-10-26-wiki-verify.py
```

The archive input is `https://github.com/m4bwav/threewright/archive/refs/tags/v0.6.7.tar.gz`, fetched by the verifier itself. Use a UTF-8 output redirection method. `Home.md` and `_Footer.md` name and link v0.6.7. Current-release references in the page sources name 0.6.7; 0.6.6 references describe introductions or historical comparisons.

The eight generated pages were rebuilt from the released-tag recording. No built pages were edited by hand during the rebuild. The [wiki](https://github.com/m4bwav/threewright/wiki) is published at commit `8c9e5a818e12bb8ec8c9c45591e6b541f1379de5`.

Final gates:

- Build succeeded; version check: 11 pages, 0 errors.
- Output coverage: 42 checked, 0 missing, 3 skipped.
- Snippet coverage: 3 blocks, 44 commands, 0 missing.
- Prose: 0 strong, 10 weak findings.
- Live: 11 pages, 0 failures, 16 anchors, 0 broken.
- `diffout`: 61 sections, 58 unchanged, 3 changed.

The first output gate checked 44 blocks and found two stale lines in Commands' hardcoded `versions --check` excerpt: glTF Transform was shown behind at 4.5.0, and the total was 15 behind. The source now uses `{{versions check|noexit}}`, so the builder inserts that entire labeled section from the current recording. It reports glTF Transform 4.5.1 as current and 14 packages behind. The rebuilt page passed the output gate; this first failure is retained as provenance.

After publication, the exact existing scene-tree browser assertion passed in 20 separate targeted runs. The transient root-only output was not reproduced, and scene selection code remains unchanged.

## Summary

Asked: bring the wiki up to v0.6.6 with the wikiwright skill. The kickoff assumed a 0.6.5 wiki, but there was none: `wikiwright.py preflight` found GitHub's placeholder (one `Home.md`, "Welcome to the threewright wiki!", 2026-10-09), so the run took wikiwright's new-wiki route (Steps 1 to 8) and wrote the whole set. Pages written from the README, CHANGELOG, AGENTS.md, HANDOFF, `tw --help`, `scripts/lib/*.mjs`, `kb/`, `templates/`, the skills' SKILL.md files, `evals/results/` and the PR history (no issues exist). Wiki commits 3349c7a (the pages) and e999a1c (a wording fix). `live`: 11 pages, 0 failures, sidebar and footer render, anchors 16 links, 0 broken. everwrite `tells.py`: 0 strong, 12 weak (long sentences, "seamless", "harness").

Pages: Home, Getting-Started, The-Skills, Commands, Knowledge-Base, Templates, Errors-and-Edge-Cases, Recipes, FAQ, Versions-and-Upgrading, Development, _Sidebar, _Footer.

## Where the pages are

`D:\m4bwa\Claude\Projects\Ai\threewright.wiki` (a sibling of the clone), branch `master`, remote `origin` = `https://github.com/m4bwav/threewright.wiki.git`. Plain links (`[Recipes](Recipes)`), LF line endings.

Eight pages (Commands, Development, Errors-and-Edge-Cases, FAQ, Knowledge-Base, Recipes, Templates, Versions-and-Upgrading) are built from sources in [2026-10-26-wiki-pages-src/](2026-10-26-wiki-pages-src/): `{{label}}` or `{{label|noexit}}` placeholders are filled with the sections of the saved verification output by [2026-10-26-wiki-build-pages.py](2026-10-26-wiki-build-pages.py), so outputs on the pages are pasted by program, never by hand. Home, Getting-Started, The-Skills, _Sidebar and _Footer are edited in the wiki directly. Edit a built page's source, then rebuild; an edit made only in the wiki is lost at the next build.

## How it was published

Preflight state `placeholder`; pages committed on top of the cloned placeholder, plain `git push` (fast-forward), commits 3349c7a and e999a1c, author m4bwav with the no-reply address.

## Updating the wiki later

1. `git -C D:\m4bwa\Claude\Projects\Ai\threewright.wiki pull --ff-only`.
2. Copy [2026-10-26-wiki-verify.py](2026-10-26-wiki-verify.py) to a new dated name and set `VERSION`. Keep `OLD = "0.6.5"` while the pages show that historical comparison; change it only with the corresponding case labels and page sources. Run from the repository root (`python ai-docs/notes/<date>-wiki-verify.py > <project-local-scratch>/new.txt`); it downloads tag archives from GitHub below `.wiki-verify` and needs Node 22+, Chrome, ffmpeg and the network. Then run wikiwright `diffout` between the latest saved verification output and the new output: every difference is a page to fix. `kb show` output contains `## ` lines, so diffout reports them as sections of their own; read those as part of the `kb show` case before them. Save UTF-8 output with LF line endings.
3. Rebuild: `python ai-docs/notes/<date>-wiki-build-pages.py <new output> ai-docs/notes/<date>-wiki-pages-src <wiki dir> ai-docs/notes/<date>-wiki-verify.py`.
4. `wikiwright.py check <wiki> --version <new>`, `outputs <wiki> <new output> --address ''`, `snippets <wiki> <program>`, everwrite `tells.py`; commit, push, `wikiwright.py live m4bwav/threewright <wiki>`.

Pages that name the current release: _Footer, Home, Commands, Knowledge-Base, Versions-and-Upgrading and Development. Getting-Started contains machine-specific doctor output to compare on every run. Keep historical introduction versions in Knowledge-Base, The-Skills, FAQ, Errors-and-Edge-Cases and Versions-and-Upgrading unchanged unless the history itself was wrong.

## How the examples were verified

[2026-10-26-wiki-verify.py](2026-10-26-wiki-verify.py) downloads `https://github.com/m4bwav/threewright/archive/refs/tags/v0.6.6.tar.gz` and the v0.6.5 archive into a temp folder (the plugin is installed from the repository at a tag, so the archive is what users get; the releases carry no assets), writes three test GLBs (150 plain nodes sharing one mesh, the same as one `EXT_mesh_gpu_instancing` node, a BLEND double-sided card with a 1000x750 PNG) and four lint inputs, copies four fixture pages from the tag's `tests/fixtures/pages`, and runs every command the pages show with `tw` mapped to the tag's `scripts/tw.mjs`. Its output, saved in [2026-10-26-wiki-verify.out.txt](2026-10-26-wiki-verify.out.txt), has 61 `## ` sections as diffout counts them (a few are headings printed by `kb show`). Masks: scratch paths (`<work>`, `<plugin>`), the port, render-call counts, colour counts, perf timings and heap, video timing, npm's timing, the `--against` timestamp, and the starter's bounds height (`<h>`, 2.49 or 2.5 as the knot turns). The last two runs of the final program gave identical output (diffout 61 of 61 sections same); earlier unmasked runs differed only in those masked numbers and in `shot`'s pixel box (the page shows only shot's first line for that reason).

Run on Windows 11, Node 24.18.0, Chrome 155, RTX 5060 Ti, ffmpeg 9.0.1, about 2 minutes. Not run: the Claude Code `/plugin` commands, `gltf-transform instance` on the test model, `tw check --cycles`, `--webgpu` pages, the Linux container, macOS, other agents (Copilot CLI is cited from the 0.6.5 CHANGELOG). The pages say so where it matters.

`outputs --address ''`: 44 checked, 0 missing, 3 skipped (help synopsis, the `/plugin` commands, the `node --test` summary). `snippets`: 3 blocks checked, 0 missing, 44 commands. `check --version 0.6.6`: 11 pages, 0 errors, 0 warnings.

Repository tests at v0.6.6 (worktree from origin/main at 8967754, `npm ci` then `npm test` in dev/): 64 tests, 61 pass, 3 skipped (vite-ts, r3f, game-starter builds without their node_modules), 0 fail. A first run, made while the verification program drove Chrome at the same time, failed `perf prints frame percentiles; --save then --against reports no changes on the same page` (the animated knot moved 5.6% of the frame between runs); that test passed three times alone and the full suite passed on a quiet machine.

## Facts verified while writing (not in the README)

- At 0.6.6 the kb has 91 entries (25 topics, 13 scenarios, 30 libraries, 20 recipes, 3 rules) and 69 lint rules; at 0.6.5, 89 (23 topics) and 68. Every rule has a `sample` and an `ok` text, which `tw kb validate` and the unit tests check.
- `tw glb --strict` exits 1 on any warning; `tw --help` does not list it.
- `tw lint` notes (severity `info`) never change the exit code, even with `--strict` (`r.errors || (a.strict && r.warnings)`).
- An unknown `tw` command prints the help and exits 2.
- Under 0.6.5 the 150-node forest reads "1 draw calls" with no warning; under 0.6.6 "150 draw calls" and "149 nodes repeat a mesh".
- `tw versions --check` on 2026-10-26: 15 packages behind (exit 1), among them `@gltf-transform/cli` (kb `libraries/gltf-transform.md` still says 4.5.0 and installs `@4.5.0`, while the CHANGELOG 0.6.3 npx commands name 4.5.1), `@react-three/fiber` 9.8.2, vite 8.3.5, lenis 1.3.27.
- `tw deprecations` at 0.6.6: 59 markers, 53 covered, 6 skipped, 0 pending.
- `tw new` prints its "next:" check command with mixed separators on Windows (`node <plugin>/scripts/tw.mjs check site`).

## Inaccuracies found in the shipped docs

Not fixed here (the README ships with the plugin; fix on request or in the next release).

1. README, "Knowledge base": "89 entries in `kb/`: 23 topics, 13 scenarios, 30 libraries, 20 recipes and 3 rules". At 0.6.6 it is 91 entries with 25 topics (`kb/INDEX.md` says 91).
2. README, "Knowledge base": "`kb/rules/lint-rules.json` holds 67 stale-API rules". It holds 69 at 0.6.6 (68 at 0.6.5), and three of them are `info` pitfall notes rather than stale APIs.
3. README, "Tested where": "Chrome 153"; the test machine runs Chrome 155 now (the templates' `verified` lines are from Chrome 153, so this is a date, not an error).
4. `tw --help`: `glb` lists no `--strict`, though `scripts/lib/glb.mjs` honours it.
5. ai-docs/HANDOFF.md: header still "Updated 2026-09-26 (seventh session, v0.6.2)", "npm test passes 61/61" (64 tests now, 61 pass, 3 skip), and the round 2 books section says "no version bump or tag", which 0.6.6 has since done.

## Bugs seen (not fixed)

1. `tw scene site/` on the html-importmap starter printed only the root `Scene` line, no children, in one of seven verification runs (the first, 2026-10-26); every other run, and four runs by hand, printed the full tree. A likely cause, not proven: `mainScene()` in `scripts/lib/inject.mjs` falls back to `T.scenes[0]` (the RoomEnvironment scene the starter bakes) when no frame use has been recorded yet.
2. The browser test `perf prints frame percentiles; --save then --against reports no changes on the same page` is load-sensitive: on the animated html-importmap template the frame region changed 5.6% between the saved and the new run while another Chrome workload ran.

## Gotchas

- Python's stdout on Windows is cp1252; the program reconfigures it to UTF-8, or the `·` separators print as `?`.
- Bash heredocs here turn `\\` into `\`; write scripts with the editor tools.

Related: see also [../HANDOFF.md](../HANDOFF.md), [../log.md](../log.md).

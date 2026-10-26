---
title: GitHub wiki written and published for 0.6.6
kind: note
date: 2026-10-26
verified: 2026-10-26
stale_after: 2027-04-26
tags: [wiki, docs, 0.6.6, github]
summary: "the wiki's eleven pages, where their working copy is, how every example was run against the v0.6.6 tag archive (and 0.6.5 for the upgrade section), the facts and inaccuracies found, the bugs seen, and how to update the wiki at the next release"
---

# GitHub wiki for 0.6.6

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
2. Copy [2026-10-26-wiki-verify.py](2026-10-26-wiki-verify.py) to a new dated name, set `VERSION` and `OLD` (the previous release, used by the "From X to Y" section), run it from the repository root (`python ai-docs/notes/<date>-wiki-verify.py > <scratch>/new.txt`); it downloads the tag archives from GitHub into a temp folder and needs Node 22+, Chrome, ffmpeg and the network. Then `python <wikiwright>/scripts/wikiwright.py diffout ai-docs/notes/2026-10-26-wiki-verify.out.txt <scratch>/new.txt`: every difference is a page to fix. `kb show` output contains `## ` lines, so diffout reports them as sections of their own (`## Essentials`, `## Budgets`); read those as part of the `kb show` case before them. Save the new output with LF only (`tr -d '\r'`).
3. Rebuild: `python ai-docs/notes/<date>-wiki-build-pages.py <new output> ai-docs/notes/<date>-wiki-pages-src <wiki dir> ai-docs/notes/<date>-wiki-verify.py`.
4. `wikiwright.py check <wiki> --version <new>`, `outputs <wiki> <new output> --address ''`, `snippets <wiki> <program>`, everwrite `tells.py`; commit, push, `wikiwright.py live m4bwav/threewright <wiki>`.

Pages that name the version or the release's numbers: _Footer, Home (current release line, "91 entries"), Commands (first paragraph: 0.6.6, Node, Chrome), Getting-Started (doctor output), Knowledge-Base ("At 0.6.6", 69 rules, "New in 0.6.6"), Versions-and-Upgrading (table row, "From 0.6.5 to 0.6.6", the count table), The-Skills (polywright since 0.6.6), Development (test counts at v0.6.6), Errors-and-Edge-Cases (glb meaning change).

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

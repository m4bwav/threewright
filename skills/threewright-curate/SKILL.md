---
name: threewright-curate
description: "Grow and correct threewright's three.js knowledge base and keep it current: add or fix an entry (topic, scenario, library, recipe, rule), record a dated note or correction, add lint rules when a new three.js release deprecates APIs (tw deprecations), bring library versions up to date (tw versions), research a request the knowledge base cannot answer, and audit for stale or unverified entries. Use whenever the user says add this to the three.js knowledge base, note that, the threewright entry on X is wrong, a new three.js release is out, check threewright for stale versions, audit the knowledge base, or when another threewright skill hands over a gap or an error; also 'refresh threewright-curate'. Building scenes is threewright; this skill edits kb/, lint rules, hints and templates' pins."
---

# threewright-curate

Outcome: the knowledge base (and, when needed, lint rules, fix hints and template pins) gained or corrected content that `tw kb validate --strict` accepts, `kb/INDEX.md` was regenerated, the change is logged with its reason and sources, and nothing was edited from memory.

Plugin root: two levels above this file. `TW` = `node "<plugin root>/scripts/tw.mjs"`. Schema: `kb/SCHEMA.md`; standard: `ai-docs/notes/kb-authoring-brief.md`. The full procedure for each path is in [references/procedures.md](references/procedures.md); read only the section you need.

## Step 0: freshness (every use, one read)

Read `evergreen.json` next to this file. If `verify_at_use` is true, re-check the due `volatile_claims` before relying on them. If `contradiction` is set or today is on or after `next_due`, tell the user in one line, do the task with the current content, then run the refresh (`evergreen-refresh`) in the same session. If `tests.failing` is non-empty, say so in one line and run `evergreen-tune` after the task. Never block the task on a refresh unless the task depends on the stale claim.

## Step 1: route

Check first: `TW kb search <words>` and `TW kb list --kind <kind>`. Something that exists under another name gets its title, tags or summary improved, not a duplicate.

| ask | path in references/procedures.md | evidence it leaves |
|---|---|---|
| a gap: a question or task the knowledge base cannot answer | A research, then B add | a findings entry in RESEARCH.md; a new `kb/<folder>/<slug>.md` that validates |
| a note or correction on an entry | C | `TW kb note <slug> "<text>"`, or an edited section plus a `C-` entry |
| a new three.js release | D release | new lint rules for every pending `TW deprecations` marker (or a `skipped` reason), templates and `package.json` pinned to the release, `node --test tests/*.test.mjs` green |
| library versions | E versions | `TW versions` with no `BEHIND` rows, each updated entry re-checked |
| audit | F audit | `TW kb validate --strict` output, re-verified entries with a new `last_verified`, a report |

## Step 2: prove it

Every path ends with `TW kb validate` (no errors) and `TW kb index`. A change to `scripts/` also runs `npm test` (`node --test tests/*.test.mjs`). A change to lint rules keeps `sample` and `ok` for each rule and `TW deprecations` at zero pending. Log the change as a `C-` entry in this skill's [CHANGELOG.md](CHANGELOG.md) (what, why, the `R-`, `L-` or `T-` it answers). Nothing is reported done until validate and index have run.

## Output

One to three lines: files added or changed, the validate and index result, and the `R-` and `C-` ids written.

## While working: capture learnings

If the user corrects you, the same error happens twice, a workaround is found, or an environment fact is discovered, write it to `LEARNINGS.md` now (check existing entries first). If a learning proves a claim above or in the knowledge base wrong, fix it, log it in `CHANGELOG.md`, and set `contradiction` in `evergreen.json`.

## Maintenance

This skill is evergreen (topic: sources for three.js releases, migration notes and ecosystem versions used to keep the knowledge base, lint rules and templates current; tier `moderate`, currently every 30 days, next due 2026-10-26). Files: `evergreen.json` (state), [RESEARCH.md](RESEARCH.md), [CHANGELOG.md](CHANGELOG.md), [LEARNINGS.md](LEARNINGS.md), [TESTS.md](TESTS.md) and `evals/evals.json`; procedures in `references/`. Protocol: the installed evergreen plugin (`protocol: "plugin"` in evergreen.json). Refresh with `evergreen-refresh`; test with `evergreen-test`; fix a failure with `evergreen-tune`; audit with `evergreen-audit`.

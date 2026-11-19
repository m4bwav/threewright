# Curation procedures

`TW` = `node "<plugin root>/scripts/tw.mjs"`. Every path ends with `TW kb validate`, `TW kb index`, and a `C-` entry in this skill's CHANGELOG.md.

## A. Research a gap

1. State the question in one line and search the knowledge base once more with other words (`TW kb search`).
2. Primary sources first: the installed three (`grep -rn` in `node_modules/three/src` and `examples/jsm`), the three.js docs pages (`https://threejs.org/docs/pages/<Class>.html`), the official examples source (`https://raw.githubusercontent.com/mrdoob/three.js/r<N>/examples/<name>.html`), release notes and the Migration Guide, the package's own npm tarball (`npm pack <pkg>@<version>`), then the research notes in `ai-docs/research/`. Blogs and forums only to find leads.
3. Record a findings entry `R-YYYYMMDD-n` in this skill's RESEARCH.md: summary, track (subject, tooling, practice, testing), sources with dates, magnitude, `applied:`. A large pass gets its own note in `ai-docs/research/<date>-<topic>.md`.

## B. Add an entry

1. Pick the kind by the schema (`kb/SCHEMA.md`): a concept is a topic, a job is a scenario, a package is a library, a task with code is a recipe, a cross-cutting rule is a rule.
2. Copy the exemplar of that kind (listed in `ai-docs/notes/kb-authoring-brief.md`), keep the section order, fill every section, cite sources, set `applies_to`, `status`, `renderer`, `last_verified`.
3. Code must run: put it in a scratch page with a pinned import map and `TW check` it until `result: OK`. Command lines must be run on a sample.
4. `TW kb validate` (it lints the code fences against r186), `TW kb search <words a user would type>` ranks it first or second, then `TW kb index`.

## C. Note or correct

- A preference, a platform fact or a small correction: `TW kb note <slug> "<text>"` (a dated line in `## Notes`). No changelog entry for a note that does not change guidance.
- A correction that changes guidance: edit the section, update `last_verified` and `sources`, log a `C-` entry, and if the wrong claim came from a research note, add a Corrections line to that note.

## D. A new three.js release

1. `npm view three version time --json`: confirm the release and its date. Read its release notes and the Migration Guide section.
2. In a scratch folder install it (`npm install three@<version>`), then from the repo `TW deprecations --src <scratch>/node_modules/three`. For every pending marker add a rule to `kb/rules/lint-rules.json` (`id`, `pattern`, `since`, `removed` when announced, `status`, `message`, `fix`, `sample`, `ok`, `source`) or a `skipped` entry with the reason. Rules for removals: check the tarballs (`npm pack three@<v> --dry-run --json` lists files; grep a build for a symbol) rather than trusting memory.
3. Raise `latest` in `lint-rules.json`, the root `package.json` devDependency, every template's pinned version and `template.json` `three` field; run `npm install` and `node --test tests/*.test.mjs` (the browser tests check every template with the new release). Record new `verified` lines in each `template.json`.
4. Update the entries the release touches (`TW kb search` for the changed APIs), the legacy map in `kb/rules/current-vs-legacy.md`, and `skills/threewright/references/build-rules.md`.
5. Log it: a `C-` entry here, the root CHANGELOG.md, and a version bump (a new three release is a minor bump).

## E. Library versions

1. `TW versions`: every `BEHIND` row is a library entry or template pin older than npm's latest stable (prereleases are shown as `also:` and never replace a stable pin).
2. For each: read the changelog between the two versions, re-check the entry's Setup and Pitfalls against the new package (`npm pack`), update `version_checked` and `last_verified`, and log the change.

## F. Audit

1. `TW kb validate --strict`: every warning is fixed or accepted with a reason in the report.
2. Entries whose `last_verified` is older than 120 days: re-check their load-bearing claims against primary sources, then update the date (or mark them `legacy` with `superseded_by`).
3. `TW deprecations` at zero pending, `TW versions` with no `BEHIND`, `npm test` green.
4. Report: counts per kind, what was re-verified, what was retired, what needs the user.

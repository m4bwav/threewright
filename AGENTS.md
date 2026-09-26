# AGENTS.md

Rules for any AI agent (Claude Code, Copilot, Cursor, Codex) working in this repository. `CLAUDE.md` and `.github/copilot-instructions.md` only point here.

## What this is

A plugin: ten skills under `skills/`, a three.js knowledge base under `kb/`, verified starters under `templates/`, one CLI at `scripts/tw.mjs` (Node 22+, no dependencies), tests under `tests/`. The README has the layout and the CLI. Handoff, research, notes and the log are under `ai-docs/` (start with `ai-docs/HANDOFF.md`).

## Rules

- The knowledge base is the product. Edit `kb/**/*.md` by `kb/SCHEMA.md` and `ai-docs/notes/kb-authoring-brief.md`, then run `node scripts/tw.mjs kb validate --strict` and `node scripts/tw.mjs kb index`. Never edit `kb/INDEX.md` or `kb/index.json` by hand.
- Current means r186 (three 0.186.1). Old APIs live only in entries marked `status: legacy` with a closed `applies_to` range, and in `kb/rules/lint-rules.json`. After a three release, run `node scripts/tw.mjs deprecations` and `node scripts/tw.mjs versions --check`, then refresh through `threewright-curate`.
- Release numbers come from the installed source or npm tarballs (`npm pack three@0.<N>.0`), never from memory; research notes were wrong several times.
- Nothing is done until it is verified: a template or recipe passes `tw check` (and `tw lint`), and someone looked at one `tw shot`. Record where and how in `template.json` `verified` or the entry's Verify section.
- `scripts/tw.mjs` stays dependency-free and runs on Windows, macOS and Linux. Every CLI change has a test in `tests/`; run `npm test` before committing (browser tests skip when no Chrome is found).
- Every change is logged: the skill's `CHANGELOG.md` for skill or knowledge changes, the root `CHANGELOG.md` for the plugin version, `ai-docs/log.md` for the session. Bump `.claude-plugin/plugin.json` and `package.json` together (knowledge additions minor, fixes patch, breaking CLI or schema changes major), tag `vX.Y.Z`, and publish a GitHub Release for the tag.
- Work on `main`; merge any side branch into it and delete the branch. Do not leave stray branches.
- No AI attribution anywhere: no Co-Authored-By trailers, no "generated with" lines in commits, PRs or files.
- Prose style in knowledge files: plain short sentences, no em dashes, say when something is unverified, date anything that may change.

# Learnings: threewright-shaders

Procedural lessons for [SKILL.md](SKILL.md). Research findings live in [RESEARCH.md](RESEARCH.md); every change is logged in [CHANGELOG.md](CHANGELOG.md); test runs in [TESTS.md](TESTS.md); state in `evergreen.json`. Format and write-time gate: the evergreen plugin's protocol/LEARNINGS-FORMAT.md. Retired entries go to LEARNINGS-ARCHIVE.md with a reason.

Write an entry the moment a real signal happens: a user correction, the same error twice, a discovered workaround, an environment fact, a stated preference, a failed test or a failure in use. Check existing entries first (add / update / retire / none). Trigger and Hypothesis are required. Promote after three confirmations; retire when harmful > helpful.

## Active

### L-20261121-1 · 2026-11-21 · Book notes on three.js defaults were wrong twice; check the installed source
- Trigger: the Godot Shaders Bible notes said WebGL has a stencil buffer by default and TSL tangents without an attribute are garbage; three 0.186.1 source shows `stencil = false` in both WebGLRenderer and Renderer, and `tangentView` falls back to a UV-derivative frame (TangentUtils.js).
- Hypothesis: notes written from older three versions or by analogy with another engine.
- Rule: before writing a three.js default or fallback into a reference, grep `dev/node_modules/three/src` for it.
- Evidence: C-20261121-1
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-11-21

<!-- Entry shape:
### L-YYYYMMDD-n · date · One-line lesson in plain words
- Trigger: what happened, with dates or counts
- Hypothesis: why
- Rule: the shortest instruction that prevents the trigger
- Evidence: C-..., T-..., confirmed date
- Scope: skill | repo:<slug> | env:<name> | global
- Status: active · helpful 1 · harmful 0 · last_confirmed date
-->

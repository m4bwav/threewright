# Learnings: threewright-assets

Procedural lessons for [SKILL.md](SKILL.md). Research findings live in [RESEARCH.md](RESEARCH.md); every change is logged in [CHANGELOG.md](CHANGELOG.md); test runs in [TESTS.md](TESTS.md); state in `evergreen.json`. Format and write-time gate: the evergreen plugin's protocol/LEARNINGS-FORMAT.md. Retired entries go to LEARNINGS-ARCHIVE.md with a reason.

Write an entry the moment a real signal happens: a user correction, the same error twice, a discovered workaround, an environment fact, a stated preference, a failed test or a failure in use. Check existing entries first (add / update / retire / none). Trigger and Hypothesis are required. Promote after three confirmations; retire when harmful > helpful.

## Active

<!-- Entry shape:
### L-YYYYMMDD-n · date · One-line lesson in plain words
- Trigger: what happened, with dates or counts
- Hypothesis: why
- Rule: the shortest instruction that prevents the trigger
- Evidence: C-..., T-..., confirmed date
- Scope: skill | repo:<slug> | env:<name> | global
- Status: active · helpful 1 · harmful 0 · last_confirmed date
-->

### L-20261022-1 · 2026-10-22 · A model report must count draw calls per node, and shading by corners, not vertices
- Trigger: `tw glb` showed 5 draw calls for a GLB with 152 nodes reusing 5 meshes, which three drew in 463 calls a frame; a re-imported cylinder had 130 vertices whether or not its Smooth by Angle survived export.
- Hypothesis: counting what a file stores (meshes, vertices) hides what the renderer does with it (one draw per node, one vertex per position and normal pair).
- Rule: count draw calls per node that uses a mesh (an `EXT_mesh_gpu_instancing` node once); judge a shading change by distinct (position, normal) corners.
- Evidence: C-20261022-1; three 0.186.1 `tw check --eval` 22 against 463 calls; corners 128 applied against 64 unapplied.
- Scope: skill
- Status: active · helpful 1 · harmful 0 · last_confirmed 2026-10-22

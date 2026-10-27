# Round 2 follow-up

## Confirmed fixes

- `tw --help` omitted `glb --strict`, although the command supports it. The help now names the flag and its warning exit code; a CLI unit test checks both.
- The combined perf/`--against` browser test compared two independently animated starter runs. A prior verification recorded 5.6% pixel change under browser load. Perf still measures the animated starter; the comparison now uses the existing static input fixture. Thresholds and production comparison code are unchanged.
- README counts were stale. The shipped 0.6.6 wiki verification recorded 91 entries, 25 topics and 69 lint rules. README now names those counts and describes rendering-pitfall rules as well as stale APIs.
- HANDOFF's header, release state, test counts and unreleased books-track claim were stale. Historical eval results keep their original dates.
- The glTF Transform library entry pinned 4.5.0 while the recipes and CHANGELOG 0.6.3 used 4.5.1. Parent ran `npm view @gltf-transform/cli@4.5.1 version dist.tarball repository.url --json`: version 4.5.1, tarball `https://registry.npmjs.org/@gltf-transform/cli/-/cli-4.5.1.tgz`, no `repository.url` field. The library pin and `version_checked` are corrected. Its extension-support findings still describe the reviewed 4.5.0 bundle; 4.5.1 source/API behavior is unverified.

## Investigation still requiring evidence

The root-only `tw scene` output was recorded once in seven wiki verification runs. Source inspection confirms `target()` uses `mainScene() || T.scenes[0]`, but does not prove that fallback caused the observation. The html-importmap starter creates the real scene before baking its RoomEnvironment and only adds its lights and meshes afterward. An incompletely initialized page could also explain an empty tree. No scene selection code has changed.

The scene-tree browser test passed in both the baseline and follow-up full suites. Twenty additional standalone scene runs were proposed but not completed for this release. The prior root-only observation remains unresolved; do not treat the fallback as its proven cause.

## Validation and release

Parent execution on Windows: `npm ci` followed by `npm test` in `dev/` passed. Full suite: 66 tests, 63 passed, 3 skipped, 0 failed, 0 cancelled, 190373.5061 ms. The skips are the existing game-starter, r3f and vite-ts build tests because their template dependencies are absent. Browser checks ran, including WebGPU, the separate perf test, static comparison and the scene-tree test. The complete log is in the parent session's `files/threewright-tests.log`; copy it into this note's folder as `2026-10-26-round2-tests.log` before merging the records.

The pre-change baseline at origin/main 2b973a3 also passed: `npm ci` installed one package with no vulnerabilities; `npm test` gave 64 tests, 61 passed, 3 skipped, 0 failed, 190757.1468 ms.

Before committing, parent must run `node scripts/tw.mjs kb validate --strict`, `node scripts/tw.mjs kb index` and `git diff --check`. No production behavior changed after the passing full test suite; the final edits only correct documentation and the library version metadata.

Release handoff: squash merge the follow-up PR, create GitHub Release v0.6.7, then run the tag-archive wiki verification and live checks. Record the PR URL, merge commit, release URL and wiki commit in this note. No npm or other registry publishing is authorized.

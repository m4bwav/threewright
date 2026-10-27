# Round 2 follow-up

## Confirmed fixes

- `tw --help` omitted `glb --strict`, although the command supports it. The help now names the flag and its warning exit code; a CLI unit test checks both.
- The combined perf/`--against` browser test compared two independently animated starter runs. A prior verification recorded 5.6% pixel change under browser load. Perf still measures the animated starter; the comparison now uses the existing static input fixture. Thresholds and production comparison code are unchanged.
- README counts were stale. The shipped 0.6.6 wiki verification recorded 91 entries, 25 topics and 69 lint rules. README now names those counts and describes rendering-pitfall rules as well as stale APIs.
- HANDOFF's header, release state, test counts and unreleased books-track claim were stale. Historical eval results keep their original dates.
- The glTF Transform library entry pinned 4.5.0 while the recipes and CHANGELOG 0.6.3 used 4.5.1. Parent ran `npm view @gltf-transform/cli@4.5.1 version dist.tarball repository.url --json`: version 4.5.1, tarball `https://registry.npmjs.org/@gltf-transform/cli/-/cli-4.5.1.tgz`, no `repository.url` field. The library pin and `version_checked` are corrected. Its extension-support findings still describe the reviewed 4.5.0 bundle; 4.5.1 source/API behavior is unverified.

## Investigation still requiring evidence

The root-only `tw scene` output was recorded once in seven wiki verification runs. Source inspection confirms `target()` uses `mainScene() || T.scenes[0]`, but does not prove that fallback caused the observation. The html-importmap starter creates the real scene before baking its RoomEnvironment and only adds its lights and meshes afterward. An incompletely initialized page could also explain an empty tree. No scene selection code has changed.

The scene-tree browser test passed in both the baseline and follow-up full suites. The exact existing assertion, `scene prints a compact tree of the main scene`, then passed in 20 separate targeted runs, one selected test per run. Logs are `files/threewright-scene-01.txt` through `files/threewright-scene-20.txt` in the coordinating session. The root-only observation could not be reproduced; its cause remains unresolved. `mainScene()` and the fallback are unchanged.

## Validation and release

Windows validation: `npm ci` followed by `npm test` in `dev/` passed. Full suite: 66 tests, 63 passed, 3 skipped, 0 failed, 0 cancelled, 190373.5061 ms. The skips are the existing game-starter, r3f and vite-ts build tests because their template dependencies are absent. Browser checks ran, including WebGPU, the separate perf test, static comparison and the scene-tree test. The complete log is in the coordinating session's `files/threewright-tests.log`; preserve it here as `2026-10-26-round2-tests.log` with the publication records.

The pre-change baseline at origin/main 2b973a3 also passed: `npm ci` installed one package with no vulnerabilities; `npm test` gave 64 tests, 61 passed, 3 skipped, 0 failed, 190757.1468 ms.

KB maintenance commands for this change are `node scripts/tw.mjs kb validate --strict` and `node scripts/tw.mjs kb index`; final whitespace validation uses `git diff --check`. No production behavior changed after the passing full test suite; the final edits only correct documentation and the library version metadata.

Published: [PR #15](https://github.com/m4bwav/threewright/pull/15) was squash merged as `5f56603`. [GitHub Release v0.6.7](https://github.com/m4bwav/threewright/releases/tag/v0.6.7) is live. No npm or other registry publishing was performed.

Wiki verifier: the released v0.6.7 archive and historical v0.6.5 archive verification completed with exit 0 and empty stderr. The recording identifies version 0.6.7 and Node 24.18.0; it prints the full scene tree and `against before.json: no changes`. `versions --check` reports 14 packages behind, an expected exit 1 preserved in the recording rather than treated as a failed verifier. Negative fixture exits are likewise recorded.

Published [wiki](https://github.com/m4bwav/threewright/wiki) commit: `8c9e5a818e12bb8ec8c9c45591e6b541f1379de5`. Pages were rebuilt from the released-tag recording. `Home.md` and `_Footer.md` name and link v0.6.7; historical introduction dates remain unchanged.

Final wiki gates: `check` 11 pages, 0 errors; `outputs` 42 checked, 0 missing, 3 skipped; `snippets` 3 blocks, 44 commands, 0 missing; prose 0 strong, 10 weak findings; `live` 11 pages, 0 failures, 16 anchors, 0 broken. `diffout` compared 61 sections, 58 unchanged and 3 changed. A stale hardcoded versions excerpt failed the first output check; replacing it with `{{versions check|noexit}}` in the persistent page source fixed the gate.

The full provenance, recording location and reproduction commands are in `2026-10-26-github-wiki.md`. Source, release, wiki and twenty scene reruns are complete; the remaining operation is merging these publication records through a docs-only PR.

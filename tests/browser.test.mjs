// End-to-end tests through headless Chrome: every template passes `tw check`,
// and broken fixture pages fail with the right message and hint.
// Skipped when no Chrome is found, when three is not installed (npm install),
// or with TW_SKIP_BROWSER=1. Pinned CDN files are served from node_modules or npm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../scripts/lib/cdp.mjs';
import { listTemplates } from '../scripts/lib/templates.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts/tw.mjs');
const skip = process.env.TW_SKIP_BROWSER ? 'TW_SKIP_BROWSER is set'
  : !findChrome() ? 'no Chrome or Chromium found (set TW_CHROME)'
    : !existsSync(join(ROOT, 'node_modules/three/package.json')) ? 'three is not installed (npm install)' : false;

function tw(...args) {
  const r = spawnSync(process.execPath, [TW, ...args], { encoding: 'utf8', timeout: 240000 });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* text mode */ }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}

// Templates with a build step (package.json) are checked by their own tests.
const pageTemplates = listTemplates(ROOT).filter((t) => existsSync(join(ROOT, t.path, 'index.html')) && !existsSync(join(ROOT, t.path, 'package.json')));

for (const t of pageTemplates) {
  test(`template ${t.name} passes tw check`, { skip, timeout: 300000 }, () => {
    const r = tw('check', join(ROOT, t.path), '--json', '--size', '640x360');
    assert.ok(r.json, r.err || r.out);
    const problems = [...r.json.logs.exceptions, ...r.json.logs.errors, ...r.json.logs.network, ...(r.json.summary.warn || [])];
    assert.equal(r.json.ok, true, problems.join('\n'));
    assert.ok(r.json.summary.scene && r.json.summary.scene.meshes > 0, 'a scene with meshes was observed');
    assert.ok(r.json.summary.camera, 'a camera was observed');
    assert.equal(r.code, 0);
  });
}

test('the black-mesh fixture is reported as rendering black', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'tests/fixtures/pages/black-mesh'), '--json', '--size', '480x270');
  assert.equal(r.code, 1);
  assert.ok(r.json.summary.warn.some((w) => w.includes('render black')), JSON.stringify(r.json.summary.warn));
});

test('a bare import without an import map gets the import-map hint', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'tests/fixtures/pages/missing-import-map'), '--json', '--size', '480x270');
  assert.equal(r.code, 1);
  assert.ok(r.json.hints.some((h) => h.includes('import map')), JSON.stringify(r.json.hints));
});

test('sheet and shot write images and report their token cost', { skip, timeout: 300000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-shot-'));
  try {
    const s = tw('sheet', join(ROOT, 'templates/html-importmap'), '--out', join(dir, 's.png'), '--json');
    assert.equal(s.code, 0, s.err);
    assert.equal(s.json.tokens, 700); // 960x540 -> 35 x 20 patches
    assert.ok(statSync(join(dir, 's.png')).size > 5000);
    const p = tw('shot', join(ROOT, 'templates/html-importmap'), '--out', join(dir, 'p.png'), '--size', '640x360', '--json');
    assert.equal(p.code, 0, p.err);
    assert.equal(p.json.tokens, 299); // 23 x 13 patches
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('scene prints a compact tree of the main scene', { skip, timeout: 300000 }, () => {
  const r = tw('scene', join(ROOT, 'templates/html-importmap'));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^Scene/m);
  assert.match(r.out, /Mesh "knot"/);
});

// End-to-end tests through headless Chrome: every template passes `tw check`,
// and broken fixture pages fail with the right message and hint.
// Skipped when no Chrome is found, when three is not installed (npm install),
// or with TW_SKIP_BROWSER=1. Pinned CDN files are served from node_modules or npm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../scripts/lib/cdp.mjs';
import { listTemplates } from '../scripts/lib/templates.mjs';
import { cmdSpec } from '../scripts/lib/proc.mjs';
import { decodePng, pixelStats } from '../scripts/lib/png.mjs';

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

// Templates with a build step: build, then check the built page. Runs only when the
// template's own node_modules exists (npm ci in the template folder), so a plain
// checkout stays fast.
const buildTemplates = listTemplates(ROOT).filter((t) => existsSync(join(ROOT, t.path, 'package.json')));
for (const t of buildTemplates) {
  const dir = join(ROOT, t.path);
  const noModules = !existsSync(join(dir, 'node_modules')) && `run npm ci in ${t.path} to test its build`;
  test(`template ${t.name} builds and its dist passes tw check`, { skip: skip || noModules, timeout: 600000 }, () => {
    const b = spawnSync(...cmdSpec('npm', ['run', 'build'], { cwd: dir, encoding: 'utf8', timeout: 300000 }));
    assert.equal(b.status, 0, (b.stdout || '') + (b.stderr || ''));
    const r = tw('check', join(dir, 'dist'), '--json', '--size', '640x360');
    assert.ok(r.json, r.err || r.out);
    const problems = [...r.json.logs.exceptions, ...r.json.logs.errors, ...r.json.logs.network, ...(r.json.summary.warn || [])];
    assert.equal(r.json.ok, true, problems.join('\n'));
    assert.ok(r.json.summary.scene && r.json.summary.scene.meshes > 0, 'a scene with meshes was observed');
  });
}

test('the black-mesh fixture is reported as rendering black', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'tests/fixtures/pages/black-mesh'), '--json', '--size', '480x270');
  assert.equal(r.code, 1);
  assert.ok(r.json.summary.warn.some((w) => w.includes('render black')), JSON.stringify(r.json.summary.warn));
});

test('a stale projection matrix is caught even when camera.aspect is right', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'tests/fixtures/pages/stale-projection'), '--json', '--size', '480x270');
  assert.equal(r.code, 1);
  assert.ok(r.json.summary.warn.some((w) => w.includes('projection matrix still uses 1')), JSON.stringify(r.json.summary.warn));
});

test('video --capture canvas gets real frames from a render-on-demand page', { skip, timeout: 300000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-frames-'));
  try {
    const r = tw('video', join(ROOT, 'templates/surface'), '--frames-dir', dir, '--frames', '3', '--fps', '10', '--capture', 'canvas', '--reduced-motion', '--size', '480x270', '--json');
    assert.equal(r.code, 0, r.err || r.out);
    for (let i = 0; i < 3; i++) {
      const s = pixelStats(decodePng(readFileSync(join(dir, `frame-0000${i}.png`))));
      assert.ok(s.coverage > 0.05 && s.colours > 50, `frame ${i} is blank: ${JSON.stringify(s)}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('--actions sends trusted keys, clicks and wheel; --cycles passes a leak-free hook and flags a leak', { skip, timeout: 300000 }, () => {
  const page = join(ROOT, 'tests/fixtures/pages/input');
  let r = tw('check', page, '--json', '--size', '480x270', '--actions', 'key KeyW 50; click 100,80; wheel 240,135 120', '--eval', '__events', '--cycles', '4');
  assert.equal(r.code, 0, r.out + r.err);
  assert.deepEqual(r.json.eval, ['down KeyW', 'up KeyW', 'pointerdown 100,80', 'wheel 1']);
  assert.deepEqual(r.json.cycles.leaks, []);
  r = tw('check', page, '--json', '--size', '480x270', '--cycles', '4', '--cycle', 'scene.add(new (find("box").constructor)(find("box").geometry.clone(), find("box").material))');
  assert.equal(r.code, 1);
  assert.ok(r.json.cycles.leaks.some((l) => l.startsWith('geometries grow')), JSON.stringify(r.json.cycles));
});

test('check writes a shot, a labelled sheet and the tree from one launch', { skip, timeout: 300000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-multi-'));
  try {
    const r = tw('check', join(ROOT, 'tests/fixtures/pages/input'), '--json', '--size', '480x270', '--tree', '--shot', join(dir, 'a.png'), '--sheet', join(dir, 'b.png'), '--labels');
    assert.equal(r.code, 0, r.out + r.err);
    assert.ok(r.json.tree.includes('Mesh "box"'), r.json.tree);
    assert.ok(statSync(join(dir, 'a.png')).size > 1000 && statSync(join(dir, 'b.png')).size > 1000);
    assert.ok(r.json.shot.labels.some((l) => l.startsWith('box ')), JSON.stringify(r.json.shot.labels));
    assert.ok(r.json.sheet.labels[0].startsWith('current: box'), JSON.stringify(r.json.sheet.labels));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('tw shaders names the failing ShaderMaterial and its line', { skip, timeout: 300000 }, () => {
  const r = tw('shaders', join(ROOT, 'tests/fixtures/pages/bad-shader'), '--size', '480x270');
  assert.equal(r.code, 1);
  assert.ok(r.out.includes('FAILED #') && r.out.includes('"glow"') && r.out.includes("'glowColour' : undeclared identifier"), r.out);
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

test('splat bounds come from the splat cloud, not its quad geometry', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'templates/splats'), '--json', '--size', '480x270');
  assert.equal(r.code, 0, r.err || r.out);
  const [, sy] = r.json.summary.bounds.size.split(',').map(Number);
  assert.ok(sy > 1, 'splat scene has height: ' + r.json.summary.bounds.size);
});

test('check --eval binds renderer from the page even when it is module scoped', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'templates/html-importmap'), '--json', '--size', '480x270', '--eval', 'renderer.info.render.calls > 0');
  assert.equal(r.code, 0, r.err || r.out);
  assert.equal(r.json.eval, true);
});

test('perf prints frame percentiles; --save then --against reports no changes on the same page', { skip, timeout: 300000 }, () => {
  const p = tw('perf', join(ROOT, 'templates/html-importmap'), '--seconds', '1', '--json', '--size', '480x270');
  assert.equal(p.code, 0, p.err || p.out);
  assert.ok(p.json.frames > 10 && p.json.p95 > 0, p.out);
  const dir = mkdtempSync(join(tmpdir(), 'tw-run-'));
  try {
    const file = join(dir, 'run.json');
    assert.equal(tw('check', join(ROOT, 'templates/html-importmap'), '--save', file, '--size', '480x270').code, 0);
    const r = tw('check', join(ROOT, 'templates/html-importmap'), '--against', file, '--json', '--size', '480x270');
    assert.deepEqual(r.json.against.changes, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('pixel stats measure the canvas on a scrolled page', { skip, timeout: 300000 }, () => {
  const r = tw('check', join(ROOT, 'tests/fixtures/pages/scrolled'), '--json', '--size', '480x270');
  assert.equal(r.code, 0, r.out);
  assert.equal(r.json.pixels.background, '#202830');
  assert.ok(r.json.pixels.coverage > 0.05, JSON.stringify(r.json.pixels));
});

test('shot --eval changes the scene before the capture', { skip, timeout: 300000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-eval-'));
  try {
    const page = join(ROOT, 'templates/html-importmap');
    const a = tw('shot', page, '--out', join(dir, 'a.png'), '--json', '--size', '480x270');
    const b = tw('shot', page, '--out', join(dir, 'b.png'), '--json', '--size', '480x270', '--eval', "find('knot').visible = false");
    assert.equal(b.code, 0, b.err);
    assert.ok(b.json.pixels.bbox.y0 > a.json.pixels.bbox.y0, `${JSON.stringify(a.json.pixels.bbox)} vs ${JSON.stringify(b.json.pixels.bbox)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

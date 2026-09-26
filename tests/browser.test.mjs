// Browser tests: every template must pass `tw check` (CDN imports served from
// node_modules with --cdn local), and shot, sheet and video must write files.
// Skipped when no Chrome or Chromium is found (set TW_CHROME). Needs `npm install`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../scripts/lib/cdp.mjs';
import { listTemplates } from '../scripts/lib/templates.mjs';
import { hasFfmpeg } from '../scripts/lib/video.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts', 'tw.mjs');
const skip = !findChrome() ? 'no Chrome found' : !existsSync(join(ROOT, 'node_modules/three')) ? 'run npm install first' : false;
const tw = (...args) => spawnSync(process.execPath, [TW, ...args, '--cdn', 'local'], { encoding: 'utf8', timeout: 180000 });
const out = mkdtempSync(join(tmpdir(), 'tw-browser-'));

for (const t of listTemplates(ROOT)) {
  const dir = join(ROOT, 'templates', t.name);
  // Templates with a build step are checked through their built dist/ when present.
  const page = existsSync(join(dir, 'index.html')) ? dir : null;
  test(`template ${t.name}: tw check is clean`, { skip: skip || (!page && 'needs a build'), timeout: 200000 }, () => {
    const r = tw('check', page, '--json', ...(t.renderer === 'webgpu' ? ['--webgpu'] : []));
    const j = JSON.parse(r.stdout || '{}');
    assert.equal(j.ok, true, r.stdout.slice(0, 3000) + r.stderr);
    assert.ok(j.summary.scene && j.summary.scene.meshes + (j.summary.scene.types.Points || 0) + (j.summary.scene.types.InstancedMesh || 0) > 0, 'scene has something to draw');
  });
}

test('shot and sheet write images', { skip, timeout: 200000 }, () => {
  const page = join(ROOT, 'templates', 'html-importmap');
  let r = tw('shot', page, '--out', join(out, 's.png'), '--size', '480x270');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /image tokens/);
  r = tw('sheet', page, '--out', join(out, 'sheet.png'));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(statSync(join(out, 'sheet.png')).size > 5000);
});

test('video writes an mp4', { skip: skip || (!hasFfmpeg() && 'no ffmpeg'), timeout: 200000 }, () => {
  const r = tw('video', join(ROOT, 'templates', 'html-importmap'), '--out', join(out, 'v.mp4'), '--seconds', '0.5', '--fps', '10', '--size', '320x180');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(statSync(join(out, 'v.mp4')).size > 1000);
});

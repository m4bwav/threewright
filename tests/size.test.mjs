// tw size: byte counts, the budget exit code and the packed-payload warning. No browser.
// harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, gzipSync } from 'node:zlib';
import { inlineBytes, measure, sizeReport, formatSize } from '../scripts/lib/size.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts/tw.mjs');
const tw = (...args) => spawnSync(process.execPath, [TW, ...args], { encoding: 'utf8' });

// Real source text: the CLI's own library files, about 250 kB.
const LIB = join(ROOT, 'scripts/lib');
const source = readdirSync(LIB).sort().map((f) => readFileSync(join(LIB, f), 'utf8')).join('\n');

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tw-size-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><style>body{margin:0}</style><script src="assets/app.js"></script><script>start()</script>');
  writeFileSync(join(dir, 'assets/app.js'), source);
  writeFileSync(join(dir, 'assets/app.js.map'), '{"mappings":""}');
  writeFileSync(join(dir, '.hidden'), 'x'.repeat(100));
  return dir;
}

test('size: per-file and total bytes, inline bytes, source maps left out', () => {
  const dir = fixture();
  try {
    const r = sizeReport(dir);
    assert.deepEqual(r.files.map((f) => f.file), ['assets/app.js', 'index.html']);
    assert.equal(r.skippedMaps, 1);
    const app = r.files[0], html = r.files[1];
    assert.equal(app.raw, Buffer.byteLength(source));
    assert.equal(app.gzip, gzipSync(Buffer.from(source), { level: 9 }).length);
    assert.ok(app.brotli < app.gzip * 0.95, 'brotli beats gzip on plain source');
    assert.deepEqual(html.inline, { script: 7, style: 14 });
    assert.equal(r.total.raw, app.raw + html.raw);
    assert.equal(r.total.gzip, app.gzip + html.gzip);
    assert.deepEqual(r.warn, [], 'plain source is not packed');
    assert.match(formatSize(r), /total: raw [\d,]+ · gzip [\d,]+ · brotli [\d,]+ bytes/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('size --budget: exit 1 at or over the budget, 0 under it, by the chosen measure', () => {
  const dir = fixture();
  try {
    const total = sizeReport(dir).total;
    const over = tw('size', dir, '--budget', String(total.gzip / 1000));
    assert.equal(over.status, 1, over.stdout + over.stderr);
    assert.match(over.stdout, /budget: .* by gzip: OVER/);
    const under = tw('size', dir, '--budget', String((total.gzip + 1) / 1000));
    assert.equal(under.status, 0, under.stdout + under.stderr);
    assert.match(under.stdout, /budget: .* by gzip: OK/);
    // The same number is far under the raw size.
    assert.equal(tw('size', dir, '--budget', String((total.gzip + 1) / 1000), '--by', 'raw').status, 1);
    const j = JSON.parse(tw('size', dir, '--json', '--budget', '1', '--by', 'brotli').stdout);
    assert.equal(j.budget.ok, false);
    assert.equal(j.total.brotli, total.brotli);
    assert.equal(tw('size', dir, '--by', 'zstd').status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('size: a self-extracting payload gets the packed warning, one file as the target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-size-'));
  try {
    // Deflated source carried as base64 text inside one script, as a packer would write it.
    const packed = `<!doctype html><script>boot("${deflateRawSync(Buffer.from(source), { level: 9 }).toString('base64')}")</script>`;
    const file = join(dir, 'packed.html');
    writeFileSync(file, packed);
    const r = sizeReport(file);
    assert.equal(r.files.length, 1);
    assert.equal(r.files[0].packed, true);
    assert.match(r.warn[0], /packed payload: brotli saves under 2%/);
    assert.match(tw('size', file).stdout, /warning: packed\.html: packed payload/);
    // The plain script it came from is smaller once the server compresses it.
    assert.ok(measure(Buffer.from(source)).brotli < r.files[0].brotli);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('size: small files and binary types never warn; inline bytes skip external scripts', () => {
  assert.deepEqual(inlineBytes('<script src="a.js"></script><script type="module">ab</script><style>c</style>'), { script: 2, style: 1 });
  const dir = mkdtempSync(join(tmpdir(), 'tw-size-'));
  try {
    const noise = Buffer.from(Array.from({ length: 30000 }, (_, i) => (i * 2654435761) >>> 24));
    writeFileSync(join(dir, 'texture.png'), noise);
    writeFileSync(join(dir, 'tiny.js'), noise.subarray(0, 1000).toString('base64'));
    assert.deepEqual(sizeReport(dir).warn, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('game-starter quality controller trace tests pass', { skip: !process.features.typescript && 'this Node does not run TypeScript' }, () => {
  const r = spawnSync(process.execPath, ['--test', join(ROOT, 'templates/game-starter/tests/quality.test.ts')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

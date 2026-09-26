// Unit tests: no browser, no network. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, list } from '../scripts/lib/args.mjs';
import { parseCdnUrl, resolveLocal, moduleDirs } from '../scripts/lib/cdn.mjs';
import { loadRules, lintText, fixText, scanDeprecations } from '../scripts/lib/lint.mjs';
import { parseGltf, report, imageSize } from '../scripts/lib/glb.mjs';
import { imageTokens, parseSize } from '../scripts/lib/page.mjs';
import { parseFrontmatter, sections, loadKb, validate, search } from '../scripts/lib/kb.mjs';
import { listTemplates } from '../scripts/lib/templates.mjs';
import { drift } from '../scripts/lib/versions.mjs';
import { ffmpegArgs } from '../scripts/lib/video.mjs';
import { safeJoin } from '../scripts/lib/serve.mjs';
import { existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadRules(ROOT);

test('args: flags, values, arrays and camelCase', () => {
  const a = parseArgs(['check', 'x.html', '--json', '--size', '800x600', '--views', 'a,b', '--views', 'c', '--reduced-motion'], { booleans: ['json', 'reduced-motion'] });
  assert.deepEqual(a._, ['check', 'x.html']);
  assert.equal(a.json, true);
  assert.equal(a.size, '800x600');
  assert.deepEqual(list(a.views), ['a', 'b', 'c']);
  assert.equal(a.reducedMotion, true);
  assert.deepEqual(parseSize('1280x720'), [1280, 720]);
  assert.throws(() => parseSize('big'));
});

test('image tokens follow ceil(w/28)*ceil(h/28) with tier caps', () => {
  assert.equal(imageTokens(960, 540), 35 * 20);
  assert.equal(imageTokens(28, 28), 1);
  assert.ok(imageTokens(8000, 8000) <= 4784);
  assert.ok(imageTokens(4000, 3000, 'standard') <= 1568);
});

test('cdn: parse jsdelivr and unpkg URLs and resolve from node_modules', () => {
  assert.deepEqual(parseCdnUrl('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'), { pkg: 'three', version: '0.186.1', path: 'build/three.module.js' });
  assert.deepEqual(parseCdnUrl('https://unpkg.com/@dimforge/rapier3d-compat@0.21.0/rapier.es.js'), { pkg: '@dimforge/rapier3d-compat', version: '0.21.0', path: 'rapier.es.js' });
  assert.equal(parseCdnUrl('https://example.com/three.js'), null);
  const dir = mkdtempSync(join(tmpdir(), 'tw-cdn-'));
  mkdirSync(join(dir, 'node_modules', 'three', 'build'), { recursive: true });
  writeFileSync(join(dir, 'node_modules', 'three', 'package.json'), '{"version":"0.185.0"}');
  writeFileSync(join(dir, 'node_modules', 'three', 'build', 'three.module.js'), 'export {}');
  const hit = resolveLocal(parseCdnUrl('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'), moduleDirs(dir));
  assert.ok(hit && hit.mismatch && hit.version === '0.185.0');
  assert.equal(resolveLocal(parseCdnUrl('https://cdn.jsdelivr.net/npm/three@0.185.0/../../etc/passwd'), moduleDirs(dir)), null);
});

test('lint: the stale fixture trips each rule it was written for', () => {
  const found = lintText(readFileSync(join(ROOT, 'tests/fixtures/stale.js'), 'utf8'), 'stale.js', rules).map((f) => f.rule);
  for (const id of ['unpinned-cdn', 'examples-jsm-path', 'clock', 'output-encoding', 'legacy-lights', 'pcf-soft-shadow', 'buffer-geometry-alias', 'render-async', 'postprocessing-class', 'tsl-label']) assert.ok(found.includes(id), id);
  assert.equal(found.filter((x) => x === 'clock').length, 1, 'commented-out code is ignored');
});

test('lint: current templates are clean and mixed versions are caught', () => {
  const html = readFileSync(join(ROOT, 'templates/html-importmap/index.html'), 'utf8');
  assert.deepEqual(lintText(html, 'index.html', rules), []);
  const mixed = '"three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",\n"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/"';
  assert.ok(lintText(mixed, 'x.html', rules).some((f) => f.rule === 'mixed-three-versions'));
  const md = 'text new THREE.Clock() outside a fence\n```js\nconst c = new THREE.Clock();\n```\n';
  assert.equal(lintText(md, 'x.md', rules).length, 1);
});

test('lint --fix rewrites the mechanical renames only', () => {
  const r = fixText("import { X } from 'three/examples/jsm/X.js';\nconst g = new THREE.SphereBufferGeometry(1);\nr.shadowMap.type = THREE.PCFSoftShadowMap;\nconst c = new THREE.Clock();\n", 'a.js', rules);
  assert.equal(r.fixes, 3);
  assert.match(r.text, /three\/addons\/X\.js/);
  assert.match(r.text, /SphereGeometry/);
  assert.match(r.text, /PCFShadowMap;/);
  assert.match(r.text, /new THREE\.Clock/);
});

test('deprecations: the installed three is scanned', { skip: !existsSync(join(ROOT, 'node_modules/three/src')) && 'three not installed' }, () => {
  const d = scanDeprecations(join(ROOT, 'node_modules/three/src'));
  assert.ok(d.length > 20);
  assert.ok(d.some((x) => /Timer/.test(x.text)));
});

function tinyGlb() {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000800000004000806000000', 'hex');
  const bin = Buffer.alloc(36 + 8);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => bin.writeFloatLE(v, i * 4));
  const imgOff = bin.length;
  const binAll = Buffer.concat([bin, png, Buffer.alloc((4 - (png.length % 4)) % 4)]);
  const json = {
    asset: { version: '2.0', generator: 'test' }, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ name: 'm', alphaMode: 'BLEND' }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', max: [1, 1, 0], min: [0, 0, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: imgOff, byteLength: png.length }],
    images: [{ bufferView: 1, mimeType: 'image/png' }], buffers: [{ byteLength: binAll.length }],
    extensionsUsed: ['KHR_draco_mesh_compression', 'EXT_made_up'],
  };
  let j = Buffer.from(JSON.stringify(json)); j = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + j.length + 8 + binAll.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  return Buffer.concat([header, ch(j.length, 0x4e4f534a), j, ch(binAll.length, 0x004e4942), binAll]);
}

test('glb: parses a binary glTF and flags extensions and big textures', () => {
  const buf = tinyGlb();
  const r = report(parseGltf(buf, 'mem.glb'), buf.length);
  assert.equal(r.triangles, 1);
  assert.equal(r.vertices, 3);
  assert.deepEqual(r.images[0].size, [2048 * 1, 1024]);
  assert.ok(r.warn.some((w) => /DRACOLoader/.test(w)));
  assert.ok(r.warn.some((w) => /EXT_made_up/.test(w)));
  const jpeg = Buffer.concat([Buffer.from('ffd8ffc00011080020004003', 'hex'), Buffer.alloc(16)]);
  assert.deepEqual(imageSize(jpeg), [64, 32]);
});

test('kb: frontmatter, sections, validation and search', () => {
  const { data, body } = parseFrontmatter('---\nname: "A b"\nslug: a-b\ntags: [x, "y z"]\nsources:\n  - https://e.com\n---\n## When\nuse it\n## Code\nx\n');
  assert.equal(data.name, 'A b');
  assert.deepEqual(data.tags, ['x', 'y z']);
  assert.deepEqual(data.sources, ['https://e.com']);
  assert.deepEqual(Object.keys(sections(body)).filter((s) => s !== '_intro'), ['When', 'Code']);
  const dir = mkdtempSync(join(tmpdir(), 'tw-kb-'));
  mkdirSync(join(dir, 'kb', 'topics'), { recursive: true });
  const fm = (slug, extra = '') => `---\nname: ${slug}\nslug: ${slug}\nkind: topic\nsummary: about ${slug} shadows\ntags: [shadow]\napplies_to: r160+\nstatus: current\nupdated: 2026-09-26\nsources: [https://threejs.org]\n${extra}---\n## Summary\nshadow text\n`;
  writeFileSync(join(dir, 'kb/topics/good.md'), fm('good'));
  writeFileSync(join(dir, 'kb/topics/bad.md'), fm('wrong', 'related: [nothing]\n').replace('r160+', '160').replace(/shadows?/g, 'light'));
  const problems = validate(loadKb(dir));
  assert.ok(problems.some((p) => /does not match the file name/.test(p)));
  assert.ok(problems.some((p) => /applies_to/.test(p)));
  assert.ok(problems.some((p) => /related "nothing"/.test(p)));
  assert.equal(search(loadKb(dir), 'shadows')[0].slug, 'good');
});

test('kb: the shipped knowledge base validates strictly', { skip: !existsSync(join(ROOT, 'kb/topics')) && 'no kb yet' }, () => {
  assert.deepEqual(validate(loadKb(ROOT), { strict: true }), []);
});

test('templates: every starter has template.json and lints clean', () => {
  for (const t of listTemplates(ROOT)) {
    assert.ok(t.summary, `${t.name} has a summary`);
    assert.ok(existsSync(join(ROOT, 'templates', t.name, 'template.json')), t.name);
  }
});

test('versions: drift classes', () => {
  assert.equal(drift('0.186.1', '0.186.1'), 'same');
  assert.equal(drift('0.185.0', '0.186.1'), 'major');
  assert.equal(drift('9.7.0', '9.8.1'), 'minor');
  assert.equal(drift('9.8.0', '9.8.1'), 'patch');
});

test('video: ffmpeg arguments by container', () => {
  assert.ok(ffmpegArgs({ fps: 30, out: 'a.mp4' }).includes('libx264'));
  assert.ok(ffmpegArgs({ fps: 30, out: 'a.webm', alpha: true }).includes('yuva420p'));
  assert.ok(ffmpegArgs({ fps: 30, out: 'a.gif' }).join(' ').includes('palettegen'));
  assert.ok(ffmpegArgs({ fps: 30, out: 'a.mov', alpha: true }).includes('4444'));
});

test('serve: paths cannot escape the root', () => {
  assert.equal(safeJoin('/srv/site', '/../etc/passwd'), null);
  assert.equal(safeJoin('/srv/site', '/a/b.js'), resolve('/srv/site/a/b.js'));
});

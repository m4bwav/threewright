// Unit tests for the tw CLI modules. No browser, no network: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs, list, parseSweep } from '../scripts/lib/args.mjs';
import { imageFit, parseSize, evalWithTarget, digestLogs, resolveTarget } from '../scripts/lib/page.mjs';
import { cmdSpec, quoteWin } from '../scripts/lib/proc.mjs';
import vm from 'node:vm';
import { hintsFor } from '../scripts/lib/hints.mjs';
import { safeJoin, contentType } from '../scripts/lib/serve.mjs';
import { parseCdnUrl, untar, findInstalled, packageFile } from '../scripts/lib/cdn.mjs';
import { compileRule, lintText, loadRules, stripComments, markdownCode, releaseIn, scanDeprecations, coveredBy, lintPaths } from '../scripts/lib/lint.mjs';
import { imageSize, parseGlb, loadModel, report } from '../scripts/lib/glb.mjs';
import { parseFrontmatter, parseRange, sections, tokens, emDashLine } from '../scripts/lib/kb.mjs';
import { compareVersions } from '../scripts/lib/versions.mjs';
import { cycleGrowth } from '../scripts/lib/runs.mjs';
import { errorContext, formatShaders } from '../scripts/lib/shaders.mjs';
import { glFlags, sandboxFlags } from '../scripts/lib/cdp.mjs';
import { pixelWarnings } from '../scripts/lib/png.mjs';
import { parseActions, keyInfo } from '../scripts/lib/actions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'tw-test-'));

test('args: flags, values, repeats, camelCase', () => {
  const a = parseArgs(['check', 'page', '--size', '640x360', '--json', '--views=front,top', '--section', 'a', '--section', 'b', '--reduced-motion'], { booleans: ['json', 'reduced-motion'] });
  assert.deepEqual(a._, ['check', 'page']);
  assert.equal(a.size, '640x360');
  assert.equal(a.json, true);
  assert.equal(a.reducedMotion, true);
  assert.deepEqual(a.section, ['a', 'b']);
  assert.deepEqual(list(a.views), ['front', 'top']);
  assert.deepEqual(parseSize('1280x720'), [1280, 720]);
  assert.throws(() => parseSize('big'));
});

test('image tokens match the table in Claude vision docs (2026-09-26)', () => {
  const rows = [
    [200, 200, 'standard', 64, '200x200'], [1000, 1000, 'standard', 1296], [1092, 1092, 'standard', 1521],
    [1920, 1080, 'standard', 1560, '1456x819'], [2000, 1500, 'standard', 1564, '1269x952'], [3840, 2160, 'standard', 1560, '1456x819'],
    [1920, 1080, 'high', 2691, '1920x1080'], [2000, 1500, 'high', 3888], [3840, 2160, 'high', 4784, '2576x1449'],
    [1080, 1920, 'standard', 1560, '819x1456'],
  ];
  for (const [w, h, tier, tokens, size] of rows) {
    const r = imageFit(w, h, tier);
    assert.equal(r.tokens, tokens, `${w}x${h} ${tier}`);
    if (size) assert.equal(`${r.width}x${r.height}`, size, `${w}x${h} ${tier} size`);
  }
});

test('hints map common errors to one-line fixes', () => {
  assert.equal(hintsFor(['Uncaught TypeError: Failed to resolve module specifier "three". Relative references must start with'])[0].includes('import map'), true);
  assert.ok(hintsFor(["TypeError: Failed to execute 'createView' on 'GPUTexture': ... not of type 'GPUTextureComponentSwizzle'"])[0].includes('WebGPU'));
  assert.ok(hintsFor(['THREE.GLTFLoader: No DRACOLoader instance provided.'])[0].includes('DRACOLoader'));
  assert.deepEqual(hintsFor(['all good']), []);
});

test('serve: paths cannot escape the root', () => {
  const root = resolve('/srv/site');
  assert.equal(safeJoin(root, '/index.html'), join(root, 'index.html'));
  assert.equal(safeJoin(root, '/../etc/passwd'), null);
  assert.equal(safeJoin(root, '/%2e%2e/secret'), null);
  assert.equal(contentType('a.glb'), 'model/gltf-binary');
  assert.equal(contentType('a.mjs'), 'text/javascript; charset=utf-8');
});

test('cdp: flags for sandbox and GL modes', () => {
  assert.ok(glFlags('auto').includes('--enable-unsafe-swiftshader'));
  assert.ok(glFlags('swiftshader').includes('--use-angle=swiftshader'));
  assert.ok(glFlags('auto', true).includes('--enable-unsafe-webgpu'));
  assert.ok(Array.isArray(sandboxFlags()));
});

test('cdn: pinned URLs parse; ranges and other hosts do not map to files', () => {
  assert.deepEqual(parseCdnUrl('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'), { host: 'jsdelivr', name: 'three', version: '0.186.1', path: 'build/three.module.js' });
  assert.deepEqual(parseCdnUrl('https://unpkg.com/@pixiv/three-vrm@3.4.0/lib/three-vrm.module.js'), { host: 'unpkg', name: '@pixiv/three-vrm', version: '3.4.0', path: 'lib/three-vrm.module.js' });
  assert.equal(parseCdnUrl('https://cdn.jsdelivr.net/npm/three/build/three.module.js'), null);
  assert.equal(parseCdnUrl('https://esm.sh/three@0.186.1'), null);
});

test('cdn: untar reads npm tarballs and refuses paths outside the target', () => {
  const header = (name, size, type = '0') => {
    const h = Buffer.alloc(512);
    h.write(name, 0, 'utf8');
    h.write('0000644\0', 100); h.write('0000000\0', 108); h.write('0000000\0', 116);
    h.write(size.toString(8).padStart(11, '0') + '\0', 124);
    h.write('00000000000\0', 136); h.write('        ', 148); h.write(type, 156); h.write('ustar\0', 257); h.write('00', 263);
    let sum = 0; for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    return h;
  };
  const file = (name, text) => { const body = Buffer.from(text); const pad = Buffer.alloc((512 - (body.length % 512)) % 512); return Buffer.concat([header(name, body.length), body, pad]); };
  const tar = Buffer.concat([file('package/package.json', '{"name":"x","version":"1.0.0","module":"lib/x.js"}'), file('package/lib/x.js', 'export const x = 1;'), file('package/../../evil.js', 'bad'), Buffer.alloc(1024)]);
  const dir = tmp();
  try {
    const n = untar(tar, dir);
    assert.equal(n, 2);
    assert.equal(readFileSync(join(dir, 'lib/x.js'), 'utf8'), 'export const x = 1;');
    assert.equal(packageFile(dir, ''), join(dir, 'lib/x.js'));
    assert.equal(packageFile(dir, '../outside.js'), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cdn: findInstalled only accepts the exact version', () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, 'node_modules/three'), { recursive: true });
    writeFileSync(join(dir, 'node_modules/three/package.json'), '{"name":"three","version":"0.186.1"}');
    mkdirSync(join(dir, 'site/sub'), { recursive: true });
    assert.equal(findInstalled('three', '0.186.1', [join(dir, 'site/sub')]), join(dir, 'node_modules/three'));
    assert.equal(findInstalled('three', '0.185.1', [join(dir, 'site/sub')]), null);
    assert.equal(findInstalled('three', '^0.186.0', [join(dir, 'site/sub')]), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('lint rules: every sample matches and every ok text does not', () => {
  const { rules, latest } = loadRules();
  assert.ok(rules.length >= 40);
  const ids = new Set();
  for (const r of rules) {
    assert.ok(!ids.has(r.id), `duplicate ${r.id}`); ids.add(r.id);
    assert.ok(['removed', 'deprecated', 'pitfall'].includes(r.status), r.id);
    assert.ok(r.since <= latest, `${r.id} since`);
    assert.ok(lintText(r.sample, { rules: [r], release: 999 }).length > 0, `${r.id} sample`);
    if (r.ok) assert.equal(lintText(r.ok, { rules: [r], release: 999 }).length, 0, `${r.id} ok`);
  }
});

test('lint: comments are ignored, URLs are not comments, releases gate rules', () => {
  const src = 'const a = 1; // new THREE.Geometry()\n/* renderer.outputEncoding */\nconst u = "https://unpkg.com/three@0.150.0/build/three.min.js";';
  const stripped = stripComments(src);
  assert.ok(!stripped.includes('Geometry'));
  assert.ok(stripped.includes('https://unpkg.com'));
  const { rules } = loadRules();
  const f = lintText(src, { rules, release: 186 });
  assert.deepEqual(f.map((x) => x.rule), ['umd-build']);
  assert.equal(f[0].severity, 'error');
  assert.equal(f[0].line, 3);
  // Clock is fine before r183 and a warning after.
  assert.equal(lintText('new THREE.Clock()', { rules, release: 182 }).length, 0);
  assert.equal(lintText('new THREE.Clock()', { rules, release: 183 })[0].severity, 'warn');
  // A deprecated API with a removal release becomes an error once removed.
  const enc = lintText('renderer.outputEncoding = x;', { rules, release: 155 })[0];
  assert.equal(enc.severity, 'warn');
  assert.equal(lintText('renderer.outputEncoding = x;', { rules, release: 170 })[0].severity, 'error');
});

test('lint: requires and unless scope rules to the right files', () => {
  const { rules } = loadRules();
  assert.equal(lintText('const b = d3.axisBottom().label("x");', { rules, release: 186 }).length, 0);
  assert.equal(lintText("import { uniform } from 'three/tsl'; uniform(1).label('x');", { rules, release: 186 })[0].rule, 'tsl-label');
  assert.equal(lintText('const m = new THREE.ShaderMaterial({});', { rules, release: 186 }).length, 0);
  const init = rules.find((r) => r.id === 'webgpu-before-init');
  assert.equal(lintText('const r = new THREE.WebGPURenderer(); await r.init();', { rules: [init], release: 186 }).length, 0);
  assert.equal(lintText('const r = new THREE.WebGPURenderer(); r.render(s, c);', { rules: [init], release: 186 }).length, 1);
});

test('lint: markdown only checks code fences, and skips fences marked legacy', () => {
  const md = 'Use `new THREE.Clock()` never.\n\n```js\nconst c = new THREE.Clock();\n```\n\n```js legacy\nrenderer.outputEncoding = THREE.sRGBEncoding;\n```\n';
  const code = markdownCode(md);
  assert.ok(code.includes('Clock'));
  assert.ok(!code.includes('outputEncoding'));
  const { rules } = loadRules();
  const f = lintText(md, { rules, release: 186, ext: '.md' });
  assert.deepEqual(f.map((x) => [x.rule, x.line]), [['clock', 4]]);
});

test('lint: the stale fixture page reports each stale line against r186', () => {
  const r = lintPaths([join(ROOT, 'tests/fixtures/lint/stale.html')], { target: 'r186' });
  const ids = r.results[0].findings.map((f) => f.rule);
  for (const id of ['umd-build', 'examples-js', 'encoding-api', 'physically-correct-lights', 'global-three-addon', 'clock', 'buffer-geometry-aliases']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('geometry-class'), 'the commented Geometry line is ignored');
  assert.ok(r.errors >= 5);
});

test('deprecations: markers are found, dated and matched to rules', () => {
  assert.equal(releaseIn('@deprecated since r183.'), 183);
  assert.equal(releaseIn("warn( 'x' ); // @deprecated, r177"), 177);
  assert.equal(releaseIn('@deprecated since 185.'), 185);
  const dir = tmp();
  try {
    mkdirSync(join(dir, 'src/core'), { recursive: true });
    writeFileSync(join(dir, 'src/core/Thing.js'), [
      '/**', ' * @deprecated since r190. Use Widget instead.', ' */', 'class Thing {', '', '\tconstructor() {', '', "\t\twarnOnce( 'Thing: \"Thing\" has been renamed to \"Widget\".' ); // @deprecated, r190", '', '\t}', '', '}', '',
      'class Clock {', '', '\tconstructor() {', "\t\twarn( 'Clock: This module has been deprecated. Please use THREE.Timer instead.' ); // @deprecated, r183", '\t}', '}',
    ].join('\n'));
    const found = scanDeprecations(dir);
    const thing = found.find((d) => d.symbol === 'Thing');
    assert.ok(thing, JSON.stringify(found));
    assert.equal(thing.release, 190);
    assert.match(thing.message, /renamed to "Widget"/);
    const { rules } = loadRules();
    assert.equal(coveredBy(rules, thing), null);
    assert.equal(coveredBy(rules, found.find((d) => (d.message || '').startsWith('Clock:'))).id, 'clock');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// A one-triangle GLB with a 2x1 PNG texture and a node transform.
function tinyGlb() {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000002000000010806000000f478d4fa0000000d49444154789c63f8cfc0f01f0005000201a3b2d8e10000000049454e44ae426082', 'hex');
  const pos = Buffer.from(new Float32Array([0, 0, 0, 2, 0, 0, 0, 1, 0]).buffer);
  const pad = (b, n = 4) => Buffer.concat([b, Buffer.alloc((n - (b.length % n)) % n)]);
  const bin = pad(Buffer.concat([pos, pad(png)]));
  const json = {
    asset: { version: '2.0', generator: 'tw test' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [2, 2, 2] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, doubleSided: true }],
    textures: [{ source: 0 }], images: [{ bufferView: 1, mimeType: 'image/png' }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 1, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.length }, { buffer: 0, byteOffset: pos.length, byteLength: png.length }],
    buffers: [{ byteLength: bin.length }],
    extensionsUsed: ['KHR_draco_mesh_compression'],
  };
  const jb = pad(Buffer.from(JSON.stringify(json)), 4);
  const jsonChunk = Buffer.concat([Buffer.from(Uint32Array.of(jb.length, 0x4e4f534a).buffer), jb]);
  const binChunk = Buffer.concat([Buffer.from(Uint32Array.of(bin.length, 0x004e4942).buffer), bin]);
  const total = 12 + jsonChunk.length + binChunk.length;
  return Buffer.concat([Buffer.from(Uint32Array.of(0x46546c67, 2, total).buffer), jsonChunk, binChunk]);
}

test('glb: parses chunks, counts, texture pixels, bounds with node transforms, decoder needs', () => {
  const buf = tinyGlb();
  const { json, bin } = parseGlb(buf);
  assert.equal(json.asset.generator, 'tw test');
  assert.ok(bin.length > 36);
  const dir = tmp();
  try {
    const f = join(dir, 'tri.glb');
    writeFileSync(f, buf);
    const r = report(loadModel(f));
    assert.equal(r.triangles, 1);
    assert.equal(r.vertices, 3);
    assert.equal(r.drawCalls, 1);
    assert.equal(r.largestImage, 2);
    assert.deepEqual(r.bounds.size, [4, 2, 0]);
    assert.equal(r.doubleSided, 1);
    assert.ok(r.needs[0].startsWith('KHR_draco_mesh_compression'));
    assert.ok(r.warn.some((w) => w.includes('without normals')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(imageSize(Buffer.from('89504e470d0a1a0a0000000d49484452000000400000002008060000', 'hex')), { type: 'image/png', width: 64, height: 32 });
});

test('glb: bounds dequantize normalized KHR_mesh_quantization positions', () => {
  const dir = tmp();
  try {
    const f = join(dir, 'q.gltf');
    writeFileSync(f, JSON.stringify({
      asset: { version: '2.0' }, extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'],
      scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [2, 2, 2] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [{ componentType: 5122, normalized: true, type: 'VEC3', count: 3, min: [-32767, 0, -32768], max: [32767, 32767, 0] }],
    }));
    assert.deepEqual(report(loadModel(f)).bounds.size, [4, 2, 2]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('pixels: a flat-shaded object on a background is not a blank canvas', () => {
  const base = { background: '#000000', meanLuma: 0.5 };
  assert.ok(pixelWarnings({ ...base, colours: 1, coverage: 0 })[0].includes('one flat colour'));
  assert.ok(pixelWarnings({ ...base, colours: 2, coverage: 0.0001 })[0].includes('one flat colour'));
  assert.deepEqual(pixelWarnings({ ...base, colours: 2, coverage: 0.09 }), []);
});

test('page: a query or hash on a local folder or file goes on the served URL', async () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    for (const [t, tail] of [[dir + '?model=x.glb', '/index.html?model=x.glb'], [join(dir, 'index.html') + '#top', '/index.html#top'], [dir, '/index.html']]) {
      const r = await resolveTarget(t);
      try { assert.ok(r.url.endsWith(tail), r.url); } finally { await r.server.close(); }
    }
    await assert.rejects(resolveTarget(join(dir, 'nope') + '?a=1'), /not found/);
    if (process.platform === 'win32') {
      // Git Bash leaves /c/... unconverted in an argument that holds a '?'
      const msys = '/' + dir[0].toLowerCase() + dir.slice(2).split(String.fromCharCode(92)).join('/') + '?m=1';
      const r = await resolveTarget(msys);
      try { assert.ok(r.url.endsWith('/index.html?m=1'), r.url); } finally { await r.server.close(); }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('runs: leak cycles flag steady growth, not warm-up or flat counters', () => {
  const s = (g, t) => ({ geometries: g, textures: t, programs: 2, heapMB: 5 });
  const leak = cycleGrowth([s(1, 1), s(2, 1), s(3, 1), s(4, 1), s(5, 1)]);
  assert.equal(leak.leaks.length, 1);
  assert.ok(leak.leaks[0].startsWith('geometries grow by about 1 per cycle'));
  assert.deepEqual(cycleGrowth([s(1, 1), s(4, 3), s(4, 3), s(4, 3), s(4, 3)]).leaks, [], 'first-cycle warm-up is not a leak');
  assert.deepEqual(cycleGrowth([s(1, 1), s(2, 1), s(3, 1), s(2, 1), s(3, 1)]).leaks, [], 'falling back is not a steady leak');
  assert.equal(cycleGrowth([{ geometries: null }, { geometries: null }]).counters.geometries, undefined);
});

test('shaders: error lines get their source context, grouped by line', () => {
  const src = ['a', 'b', 'c', 'd', 'e', 'f'].join('NL');
  const ctx = errorContext(src.split('NL').join(String.fromCharCode(10)), "ERROR: 0:4: 'x' : undeclared identifier" + String.fromCharCode(10) + "ERROR: 0:4: 'constructor' : not enough data", 1);
  assert.deepEqual(ctx, ["line 4: 'x' : undeclared identifier; 'constructor' : not enough data", '     3 | c', '>    4 | d', '     5 | e']);
  const text = formatShaders({ backend: 'webgl', programs: [{ id: 1, type: 'ShaderMaterial', name: 'glow', usedTimes: 1, materials: [], linked: false, programLog: 'Fragment shader is not compiled.', vertex: { log: '', source: 'v' }, fragment: { log: '', source: 'f' } }] });
  assert.ok(text.includes('1 FAILED') && text.includes('program: Fragment shader is not compiled.'), text);
});

test('args: --sweep splits on the last lone =, keeping == and !=', () => {
  assert.deepEqual(parseSweep("find('knot').material.roughness=0, 0.5 ,1"), { lhs: "find('knot').material.roughness", values: ['0', '0.5', '1'] });
  assert.deepEqual(parseSweep("scene.children.find((o) => o.name == 'a').visible=true,false"), { lhs: "scene.children.find((o) => o.name == 'a').visible", values: ['true', 'false'] });
  assert.throws(() => parseSweep('roughness'), /--sweep needs/);
});

test('actions: parse the input burst language and map keys for CDP', () => {
  assert.deepEqual(parseActions('key KeyW 500; click 480,270; drag 10,20 30,40 5; wheel 5,5 -120; wait 100; type hi there; move 1.5,2'), [
    { op: 'key', key: 'KeyW', hold: 500 },
    { op: 'click', at: [480, 270], button: 'left' },
    { op: 'drag', from: [10, 20], to: [30, 40], steps: 5 },
    { op: 'wheel', at: [5, 5], dy: -120, dx: 0 },
    { op: 'wait', ms: 100 },
    { op: 'type', text: 'hi there' },
    { op: 'move', at: [1.5, 2] },
  ]);
  assert.deepEqual(keyInfo('w'), { key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, text: 'w' });
  assert.equal(keyInfo('ArrowLeft').text, undefined);
  assert.equal(keyInfo('Space').key, ' ');
  assert.throws(() => parseActions('jump'), /unknown action/);
  assert.throws(() => parseActions('click 3'), /point x,y/);
  assert.throws(() => parseActions('key Frobnicate'), /unknown key/);
});

test('kb: frontmatter subset, release ranges, sections, tokens', () => {
  const { data, body } = parseFrontmatter('---\ntitle: "Color: management"\ntags: [color, "srgb, linear"]\nsources:\n  - https://a.example/x#frag\n  - https://b.example\napplies_to: ">=r152"\nstatus: current # comment\n---\n## Essentials\nx\n## Notes\n- 2026-09-26: y\n');
  assert.equal(data.title, 'Color: management');
  assert.deepEqual(data.tags, ['color', 'srgb, linear']);
  assert.deepEqual(data.sources, ['https://a.example/x#frag', 'https://b.example']);
  assert.equal(data.status, 'current');
  assert.deepEqual(Object.keys(sections(body)), ['Essentials', 'Notes']);
  assert.deepEqual(parseRange('>=r152'), { min: 152, max: Infinity });
  assert.deepEqual(parseRange('r150-r159'), { min: 150, max: 159 });
  assert.deepEqual(parseRange('<r152'), { min: 0, max: 151 });
  assert.equal(parseRange('recent'), null);
  assert.deepEqual(tokens('How do I load GLTF models with textures?'), ['load', 'gltf', 'model', 'texture']);
});

test('versions: semver comparison with prereleases', () => {
  assert.equal(compareVersions('0.185.1', '0.186.1'), -1);
  assert.equal(compareVersions('10.0.0', '9.9.9'), 1);
  assert.equal(compareVersions('10.0.0-alpha.1', '10.0.0'), -1);
  assert.equal(compareVersions('^0.186.1', '0.186.1'), 0);
});

test('eval: renderer, scene and camera come from the page globals, else from __tw.target()', () => {
  const target = { renderer: { info: { calls: 3 } }, scene: 's', camera: 'c' };
  const ctx = vm.createContext({});
  ctx.window = ctx;
  ctx.__tw = { target: () => target };
  assert.equal(vm.runInContext(evalWithTarget('renderer.info.calls'), ctx), 3);
  assert.equal(vm.runInContext(evalWithTarget('JSON.stringify([scene, camera])'), ctx), '["s","c"]');
  vm.runInContext('let camera = "page camera"', ctx); // top-level let is not on window
  assert.equal(vm.runInContext(evalWithTarget('camera'), ctx), 'page camera');
  assert.equal(vm.runInContext(evalWithTarget('1 + 1 // trailing comment'), ctx), 2);
  delete ctx.__tw;
  assert.equal(vm.runInContext(evalWithTarget('typeof renderer'), ctx), 'undefined');
});

test('proc: Windows gets one quoted command string with shell, others get args', () => {
  assert.deepEqual(cmdSpec('npm', ['view', 'three', '--json'], { stdio: 'pipe' }, 'linux'), ['npm', ['view', 'three', '--json'], { stdio: 'pipe' }]);
  assert.deepEqual(cmdSpec('npm', ['pack', 'three@0.186.1', 'a b'], {}, 'win32'), ['npm.cmd pack three@0.186.1 "a b"', [], { shell: true }]);
  assert.equal(quoteWin('say "hi"'), '"say ""hi"""');
});

test('digest: favicon 404 is noise, three deprecation warnings are singled out', () => {
  const d = digestLogs({
    console: [
      { type: 'warning', text: 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.' },
      { type: 'warning', text: 'some library: deprecated option' },
    ],
    exceptions: [],
    network: [{ status: 404, url: 'http://127.0.0.1:5173/favicon.ico' }, { status: 404, url: 'http://127.0.0.1:5173/model.glb' }],
    counts: {},
  });
  assert.deepEqual(d.network, ['404 http://127.0.0.1:5173/model.glb']);
  assert.equal(d.deprecations.length, 1);
  assert.equal(d.warnings.length, 2);
});

test('kb: em dashes are found in prose, not in code fences', () => {
  const d = String.fromCharCode(0x2014);
  assert.equal(emDashLine(`# T\n\nplain line\n`), 0);
  assert.equal(emDashLine(`# T\n\`\`\`js\n// a ${d} b\n\`\`\`\nprose ${d} here\n`), 5);
});

test('runs: frame stats, luma grid and run comparison', async () => {
  const { frameStats, lumaGrid, compareRuns } = await import('../scripts/lib/runs.mjs');
  const f = frameStats([16, 16, 16, 17, 50]);
  assert.equal(f.frames, 5); assert.equal(f.p50, 16); assert.equal(f.max, 50); assert.equal(f.over33, 1);
  const img = { width: 4, height: 2, data: new Uint8Array(4 * 2 * 4).fill(255) };
  assert.deepEqual(lumaGrid(img, { cols: 2, rows: 1 }).data, [255, 255]);
  const base = { renderer: { drawCalls: 3, backend: 'WebGPU' }, scene: { meshes: 2, types: { Mesh: 2 } }, problems: ['old warning'], pixels: { meanLuma: 0.4, grid: { cols: 2, rows: 1, data: [10, 10] } } };
  assert.deepEqual(compareRuns(base, base), []);
  const after = { renderer: { drawCalls: 5, backend: 'WebGPU' }, scene: { meshes: 3, types: { Mesh: 3 } }, problems: ['new error'], pixels: { meanLuma: 0.5, grid: { cols: 2, rows: 1, data: [10, 200] } } };
  const c = compareRuns(base, after);
  assert.ok(c.includes('draw calls 3 -> 5 (+2)'), c.join('\n'));
  assert.ok(c.includes('Mesh 2 -> 3'));
  assert.ok(c.includes('NEW new error') && c.includes('gone old warning'));
  assert.ok(c.some((l) => l.startsWith('pixels: 50% of the frame changed · region x 0.5-1')), c.join('\n'));
});

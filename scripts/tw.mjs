#!/usr/bin/env node
// threewright CLI. Zero dependencies: Node 22+ and a Chrome or Chromium install.
// Every command prints compact text (or --json) so an agent spends as few tokens
// as possible: errors and scene summaries as text, images only when asked.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, list } from './lib/args.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..');

const HELP = `threewright CLI (tw)  usage: node scripts/tw.mjs <command> [options]

Verify a page (file, folder with index.html, or URL); text first, images on request:
  check <page>          errors, warnings, failed requests, renderer and scene summary, runtime warnings,
                        pixel evidence (coverage, bounds, brightness of what the canvas shows)
  scene <page>          compact scene-graph tree (--depth 6 --max 80)
  check <page> --eval "<js>"   also print the value of an expression after the page settles
                        (renderer, scene and camera are bound to the main ones tw observed)
  check <page> --strict        also fail on any console warning (three's own deprecation warnings always fail)
  check <page> --save run.json ; check <page> --against run.json   what changed since a saved run:
                        renderer and scene counts, object types, new or gone problems, changed frame region
  check <page> --cycles 5 [--cycle "<js>"]   run window.__tw.cycle() (or the js) N times and fail on
                        steady growth of geometries, textures or programs (a leak)
  check <page> --shot a.png --sheet b.png --tree   extra outputs from the same browser launch
                        (pages defining render_game_to_text() get its text printed as game:)
  shaders <page> [--dump dir]   WebGL programs, their materials and link status; a failing
                        shader's error lines with source context; --dump writes .vert/.frag files
  perf <page> [--seconds 5] [--cpu-throttle 4]   frame time p50/p95/p99/max, frames over 33 ms,
                        draw calls and triangles per frame, geometry, texture and heap growth
  shot <page> --out f.png [--canvas] [--alpha]   one screenshot; prints its token cost
                        (shot and sheet take --eval "<js>" to set a state first, e.g. scrollTo(0, 2000))
  sheet <page> --out f.png [--views current,front,right,top]   several angles in one image
                        (shot and sheet take --labels: name tags on objects, legend printed as text)
  video <page> --out f.mp4|.webm|.gif|.mov --seconds 5 --fps 30 [--alpha] [--frames-dir d]
                        deterministic capture via ffmpeg (alpha: .webm or .mov, page cleared transparent;
                        --capture canvas reads the canvas alone, without HTML overlays)
  --actions "key KeyW 500; click 480,270; drag 100,100 300,120; wheel 480,270 -120; type hi; wait 500"
                        input sent before check, shot, sheet or video measures or captures
      page options: --size 960x540 --dpr 1 --gl auto|gpu|swiftshader --webgpu --wait 1000 --root dir
                    --reduced-motion --color-scheme light|dark --timeout 60000 --headed
                    --cdn auto|offline|net   pinned jsDelivr/unpkg files come from node_modules or the
                                             npm cache (auto: CDN when absent, npm if the CDN fails)
Static tools (no browser):
  diff <a.png> <b.png> [--threshold 0.1] [--max 0.001] [--out d.png]   pixel comparison, PASS/FAIL
  lint <files|dirs> [--target r186] [--md] [--strict]   stale or risky three.js API use, with the
                        release that changed it and the fix (rules: kb/rules/lint-rules.json)
  glb <file.glb|.gltf>  model report: size, draw calls, triangles, textures in px, extensions and the
                        decoders they need, animations, world bounds, web-budget warnings
  kb search <words>     find knowledge-base entries (top 8, one line each)
  kb show <slug> [--section name ...]   print an entry or only some sections
  kb list [--kind topic|scenario|library|recipe|rule] ; kb index ; kb validate [--strict]
  kb note <slug> "<text>"   add a dated note to an entry
  new <template> <dir> [--force]   copy a verified starter (tw templates lists them)
  templates             list starters and where each was verified
  versions [--check]    latest npm versions vs the knowledge base and templates
  deprecations [--src node_modules/three] [--all]   @deprecated markers no lint rule covers yet
  doctor                node, chrome, ffmpeg, npm, CDN reach, WebGL and WebGPU in headless Chrome
Global: --json for machine output. Image costs use Claude's 28 px patches (TW_IMAGE_TIER=standard
for models before Claude 4.7).`;

const BOOLS = ['json', 'canvas', 'webgpu', 'headed', 'strict', 'reducedMotion', 'reduced-motion', 'alpha', 'check', 'all', 'help', 'fix', 'keepFrames', 'force', 'md', 'tree', 'labels', 'sources'];

function print(obj, asJson, textFn) {
  if (asJson) console.log(JSON.stringify(obj, null, 2));
  else console.log(textFn ? textFn(obj) : obj);
}

function pageOpts(a) {
  return { size: a.size, dpr: a.dpr, gl: a.gl, webgpu: !!a.webgpu, root: a.root, headed: !!a.headed, reducedMotion: !!(a.reducedMotion || a['reduced-motion']), colorScheme: a.colorScheme || a['color-scheme'], timeout: a.timeout ? Number(a.timeout) : undefined, cdn: a.cdn };
}

function formatCheck(r) {
  const L = [];
  L.push(`page: ${r.url}`);
  L.push(`three: ${r.summary.three ? 'r' + r.summary.three : 'not detected'} · scenes ${r.summary.scenes} · render calls ${r.summary.renderCalls}`);
  for (const ri of r.summary.renderers || []) {
    if (!ri) continue;
    L.push(`renderer: ${ri.type}${ri.backend ? ' (' + ri.backend + ')' : ''} canvas ${ri.canvas}${ri.inDom === false ? ' NOT IN DOM' : ''} dpr ${ri.pixelRatio} · draw calls ${ri.drawCalls} · tris ${ri.triangles} · geometries ${ri.geometries} · textures ${ri.textures}${ri.programs !== undefined ? ' · programs ' + ri.programs : ''} · output ${ri.outputColorSpace} · toneMapping ${ri.toneMapping} · shadows ${ri.shadows}`);
  }
  if (r.gl) L.push(`gpu: ${r.gl}`);
  if (r.cdn && r.cdn.total) L.push(`cdn: ${r.cdn.total} file(s) served locally (${Object.entries(r.cdn.packages).map(([k, v]) => `${k} from ${v}`).join(', ')})`);
  const s = r.summary.scene;
  if (s) {
    const types = Object.entries(s.types).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', ');
    L.push(`scene: ${types}`);
    L.push(`  meshes ${s.meshes} · lights ${s.lights} · verts ${s.verts} · tris ${s.tris}${s.instances ? ' · instances ' + s.instances : ''} · materials ${s.materials} · textures ${s.textures} · environment ${s.environment} · background ${s.background}${s.fog ? ' · fog ' + s.fog : ''}`);
  }
  if (r.summary.bounds) L.push(`bounds: center ${r.summary.bounds.center} size ${r.summary.bounds.size}`);
  if (r.summary.camera) { const c = r.summary.camera; L.push(`camera: ${c.type} pos ${c.pos}${c.fov ? ' fov ' + c.fov : ''} near ${c.near} far ${c.far}${c.aspect ? ' aspect ' + c.aspect : ''}`); }
  if (r.pixels) L.push(formatPixels(r.pixels));
  if (r.eval !== undefined) L.push('eval: ' + JSON.stringify(r.eval).slice(0, 2000));
  if (r.game) L.push('game: ' + r.game.replace(/\n/g, '\n  '));
  if (r.against) {
    L.push(`against ${r.against.file} (${r.against.date}): ${r.against.changes.length ? r.against.changes.length + ' change(s)' : 'no changes'}`);
    for (const c of r.against.changes.slice(0, 30)) L.push('  ' + c);
  }
  if (r.cycles) L.push(`cycles ${r.cycles.cycles}: ` + Object.entries(r.cycles.counters).map(([k, v]) => `${k} ${v.join('>')}`).join(' · '));
  if (r.saved) L.push(`saved ${r.saved}`);
  const d = r.logs;
  const sec = (name, arr) => { if (arr && arr.length) { L.push(`${name} (${arr.length}):`); for (const x of arr.slice(0, 12)) L.push('  ' + x.replace(/\n/g, '\n    ')); if (arr.length > 12) L.push(`  … ${arr.length - 12} more`); } };
  sec('EXCEPTIONS', d.exceptions);
  sec('ERRORS', d.errors.concat(r.summary.errors || []));
  sec('FAILED REQUESTS', d.network);
  sec('THREE DEPRECATIONS', d.deprecations || []);
  sec('warnings', d.warnings.filter((w) => !(d.deprecations || []).includes(w)));
  sec('CHECK', [...(r.summary.warn || []), ...((r.pixels && r.pixels.warn) || []), ...((r.cycles && r.cycles.leaks) || [])]);
  sec('fix hints', r.hints);
  if (r.tree) L.push('tree:\n' + r.tree);
  if (r.shot) L.push(formatShot(r.shot));
  if (r.sheet) L.push(formatImage(r.sheet));
  L.push(r.ok ? 'result: OK (no exceptions, errors, failed requests, three deprecations or scene warnings)' : 'result: PROBLEMS FOUND');
  return L.join('\n');
}

function formatPixels(p) {
  const pct = (v) => (v >= 0.1 ? Math.round(v * 100) : Math.round(v * 1000) / 10) + '%';
  return `pixels: ${pct(p.coverage)} differ from the background ${p.background}${p.bbox ? ` · bbox x ${p.bbox.x0}-${p.bbox.x1} y ${p.bbox.y0}-${p.bbox.y1}` : ''} · mean luma ${Math.round(p.meanLuma * 100) / 100} · ${p.colours} colours${p.transparentShare > 0.01 ? ` · ${pct(p.transparentShare)} transparent` : ''}`;
}

// Measure what the main canvas shows, from a small screenshot of its box.
async function canvasPixels(ctx) {
  const box = await ctx.page.eval('(() => { const t = window.__tw && window.__tw.target && window.__tw.target(); const c = (t && t.renderer && t.renderer.domElement) || document.querySelector("canvas"); if (!c) return null; const b = c.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height } : null; })()');
  if (!box) return null;
  const { decodePng, pixelStats, pixelWarnings } = await import('./lib/png.mjs');
  const scale = Math.min(1, 240 / box.width);
  const { data } = await ctx.page.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale }, captureBeyondViewport: false });
  const img = decodePng(Buffer.from(data, 'base64'));
  const stats = pixelStats(img);
  const out = { ...stats, warn: pixelWarnings(stats) };
  // For --save and --against; hidden from --json output.
  const { lumaGrid } = await import('./lib/runs.mjs');
  Object.defineProperty(out, 'grid', { value: lumaGrid(img), enumerable: false });
  return out;
}

// shot and sheet --eval: set a state (scroll, a material, a camera) before capture,
// then let the page draw it.
async function preCapture(ctx, a) {
  await doActions(ctx, a);
  if (!a.eval) return;
  const { evalWithTarget } = await import('./lib/page.mjs');
  await ctx.page.eval(evalWithTarget(String(a.eval)));
  await ctx.settle({ wait: Number(a.evalWait || 300) });
}

// --actions "key KeyW 500; click 480,270; wait 200": input sent before measuring or capturing.
async function doActions(ctx, a, opts = {}) {
  if (!a.actions) return;
  const { parseActions, runActions } = await import('./lib/actions.mjs');
  await runActions(ctx.page, parseActions(a.actions), opts);
  if (!opts.virtual) await ctx.settle({ wait: Number(a.actionsWait || 300) });
}

// --cycles N: run the page's window.__tw.cycle() (or --cycle "<js>") N times and watch
// renderer memory counters for steady growth.
async function leakCycles(ctx, a) {
  const n = Number(a.cycles);
  if (!n) return null;
  const { evalWithTarget } = await import('./lib/page.mjs');
  const { cycleGrowth } = await import('./lib/runs.mjs');
  const hook = await ctx.page.eval('typeof (window.__tw && window.__tw.cycle) === "function"');
  if (!a.cycle && !hook) throw new Error('--cycles needs a page hook (window.__tw.cycle = () => { build and dispose one thing }) or --cycle "<js>"');
  const step = a.cycle ? `Promise.resolve(${evalWithTarget(String(a.cycle))}).then(() => true)` : 'Promise.resolve(window.__tw.cycle()).then(() => true)';
  const read = '(() => { const t = window.__tw.target(); const i = t.renderer && t.renderer.info; return { geometries: i && i.memory ? i.memory.geometries : null, textures: i && i.memory ? i.memory.textures : null, programs: i && Array.isArray(i.programs) ? i.programs.length : null, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e5) / 10 : null }; })()';
  const samples = [await ctx.page.eval(read)];
  for (let i = 0; i < n; i++) {
    await ctx.page.eval(step);
    await ctx.settle({ wait: Number(a.cycleWait || 200) });
    samples.push(await ctx.page.eval(read));
  }
  return cycleGrowth(samples);
}

async function withPage(target, a, fn, extra = {}) {
  const { openPage } = await import('./lib/page.mjs');
  if (!target) throw new Error('give a page: a .html file, a folder with index.html, or a URL');
  const ctx = await openPage(target, { ...pageOpts(a), ...extra });
  try { return await fn(ctx); } finally { await ctx.close(); }
}

async function glString(page) {
  return page.eval(`(() => { try { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); if (!g) return 'no WebGL2'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); } catch (e) { return String(e); } })()`);
}

const formatImage = (x) => `wrote ${x.file} (${x.width}x${x.height}, ${x.tokens} image tokens${x.seenAs ? `; the model downscales it to ${x.seenAs}` : ''})${x.labels && x.labels.length ? '\nlabels: ' + x.labels.join(' · ') : ''}`;
const formatShot = (x) => `${formatImage(x)}\n${formatPixels(x.pixels)}${x.pixels.warn.length ? '\n' + x.pixels.warn.map((w) => 'CHECK ' + w).join('\n') : ''}`;

async function takeShot(ctx, a, out) {
  const { screenshot } = await import('./lib/page.mjs');
  // --labels: overlay name tags on the canvas for the capture, then remove them.
  const labels = a.labels ? await ctx.page.eval(`(() => {
    const t = window.__tw.target(), c = t.renderer && t.renderer.domElement;
    if (!c) return [];
    const b = c.getBoundingClientRect(), tags = window.__tw.labels(null, { width: b.width, height: b.height });
    const box = document.createElement('div');
    box.id = '__tw_labels';
    box.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:2147483647';
    for (const g of tags) {
      const d = document.createElement('div');
      d.textContent = g.text;
      d.style.cssText = 'position:absolute;transform:translate(-50%,-50%);font:11px sans-serif;color:#ffeb3b;background:rgba(0,0,0,.7);padding:1px 4px;white-space:nowrap';
      d.style.left = (b.left + scrollX + g.x * b.width) + 'px';
      d.style.top = (b.top + scrollY + g.y * b.height) + 'px';
      box.appendChild(d);
    }
    document.body.appendChild(box);
    return tags.map((g) => g.text + ' ' + Math.round(g.x * 100) + '%,' + Math.round(g.y * 100) + '%');
  })()`) : null;
  const r = await screenshot(ctx, out, { canvasOnly: !!a.canvas, alpha: !!a.alpha });
  if (labels) { await ctx.page.eval('document.getElementById("__tw_labels")?.remove(), true'); r.labels = labels; }
  const { readFileSync } = await import('node:fs');
  const { decodePng, pixelStats, pixelWarnings } = await import('./lib/png.mjs');
  const px = pixelStats(decodePng(readFileSync(out)));
  return { ...r, pixels: { ...px, warn: pixelWarnings(px) } };
}

async function takeSheet(ctx, a, out) {
  const views = list(a.views);
  const [tw, th] = (a.tile || '480x270').split('x').map(Number);
  const { writeDataUrl, imageFit } = await import('./lib/page.mjs');
  const url = await ctx.page.eval(`window.__tw.sheet(${JSON.stringify({ views: views.length ? views : undefined, tileW: tw, tileH: th, cols: a.cols ? Number(a.cols) : undefined, labels: !!a.labels })})`);
  if (!url) throw new Error('no scene, camera or renderer observed; run tw check');
  writeDataUrl(url, out);
  const labels = a.labels ? await ctx.page.eval('window.__tw.sheetLabels') : undefined;
  const n = views.length || 4, cols = Math.min(n, Number(a.cols || 2)), rows = Math.ceil(n / cols);
  const fit = imageFit(tw * cols, th * rows);
  return { file: out, width: tw * cols, height: th * rows, tokens: fit.tokens, seenAs: fit.scaled ? `${fit.width}x${fit.height}` : undefined, labels };
}

const commands = {
  async check(a) {
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      await doActions(ctx, a);
      const cycles = await leakCycles(ctx, a);
      const { digestLogs } = await import('./lib/page.mjs');
      const summary = await ctx.page.eval('window.__tw.summary()');
      const pixels = await canvasPixels(ctx);
      const { evalWithTarget } = await import('./lib/page.mjs');
      const evaluated = a.eval ? await ctx.page.eval(evalWithTarget(String(a.eval))).catch(() => ctx.page.eval(String(a.eval))).catch((e) => 'eval failed: ' + e.message) : undefined;
      // Pages that follow the render_game_to_text() convention describe their state in text.
      const game = await ctx.page.eval('typeof window.render_game_to_text === "function" ? String(window.render_game_to_text()).slice(0, 4000) : null').catch((e) => 'render_game_to_text failed: ' + e.message);
      const logs = digestLogs(ctx.logs);
      const gl = await glString(ctx.page);
      const ok = !logs.exceptions.length && !logs.errors.length && !logs.network.length && !logs.deprecations.length && !(a.strict && logs.warnings.length) && !(summary.errors || []).length && !(summary.warn || []).length && !(pixels && pixels.warn.length) && !(cycles && cycles.leaks.length);
      const { hintsFor } = await import('./lib/hints.mjs');
      const hints = hintsFor([...logs.exceptions, ...logs.errors, ...logs.network, ...logs.warnings, ...(summary.errors || [])]);
      const r = { url: ctx.url, ok, gl, cdn: ctx.cdn.stats(), summary, pixels, logs, hints, ...(a.eval ? { eval: evaluated } : {}), ...(game ? { game } : {}), ...(cycles ? { cycles } : {}) };
      if (a.save || a.against) {
        const { snapshotRun, compareRuns } = await import('./lib/runs.mjs');
        const { readFileSync, writeFileSync } = await import('node:fs');
        const snap = snapshotRun(r, pixels && pixels.grid);
        if (a.against) {
          const before = JSON.parse(readFileSync(String(a.against), 'utf8'));
          r.against = { file: String(a.against), date: before.date, changes: compareRuns(before, snap) };
        }
        if (a.save) { writeFileSync(String(a.save), JSON.stringify(snap)); r.saved = String(a.save); }
      }
      // Extra outputs from the same launch (each saves a Chrome start).
      if (a.tree) r.tree = await ctx.page.eval(`window.__tw.tree(${JSON.stringify({ depth: Number(a.depth || 6), max: Number(a.max || 80) })})`);
      if (a.shot) r.shot = await takeShot(ctx, a, String(a.shot));
      if (a.sheet) r.sheet = await takeSheet(ctx, a, String(a.sheet));
      print(r, a.json, formatCheck);
      if (!ok) process.exitCode = 1;
    });
  },

  async perf(a) {
    const seconds = Number(a.seconds || 5), throttle = Number(a.cpuThrottle || 1);
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      if (throttle > 1) await ctx.page.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      // Frame times from requestAnimationFrame, with renderer counters per frame.
      const raw = await ctx.page.eval(`new Promise((done) => {
        const t = window.__tw && window.__tw.target ? window.__tw.target() : {};
        const info = () => { const r = t.renderer && t.renderer.info; return r ? [r.render.drawCalls ?? r.render.calls ?? 0, r.render.triangles ?? 0, r.memory.geometries ?? 0, r.memory.textures ?? 0] : null; };
        const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : null);
        const frames = [], counts = [], start = { info: info(), heap: heap() };
        let last = performance.now();
        const end = last + ${seconds * 1000};
        const step = (now) => {
          frames.push(now - last); last = now;
          const c = info(); if (c) counts.push(c);
          if (now < end) requestAnimationFrame(step);
          else done({ frames: frames.slice(1), counts, start, end: { info: info(), heap: heap() } });
        };
        requestAnimationFrame(step);
      })`, { timeoutMs: seconds * 1000 + 30000 });
      const { frameStats } = await import('./lib/runs.mjs');
      const { digestLogs } = await import('./lib/page.mjs');
      const col = (i) => raw.counts.map((c) => c[i]);
      const range = (xs) => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);
      const r = {
        url: ctx.url, seconds, cpuThrottle: throttle, note: 'headless, uncalibrated',
        ...frameStats(raw.frames),
        drawCalls: range(col(0)), triangles: range(col(1)),
        geometries: raw.start.info && raw.end.info ? [raw.start.info[2], raw.end.info[2]] : null,
        textures: raw.start.info && raw.end.info ? [raw.start.info[3], raw.end.info[3]] : null,
        heapMB: raw.start.heap && raw.end.heap ? [raw.start.heap, raw.end.heap].map((v) => Math.round(v / 1e5) / 10) : null,
        problems: (({ exceptions, errors }) => [...exceptions, ...errors])(digestLogs(ctx.logs)).length,
      };
      const span = (v) => (v ? (v[0] === v[1] ? String(v[0]) : `${v[0]}-${v[1]}`) : '?');
      const grow = (v, unit = '') => (v ? `${v[0]}${unit} -> ${v[1]}${unit}` : 'n/a');
      print(r, a.json, (x) => [
        `perf ${x.seconds}s${x.cpuThrottle > 1 ? ` at ${x.cpuThrottle}x CPU throttle` : ''} (${x.note}): ${x.frames} frames · ${x.fps} fps`,
        `frame ms: p50 ${x.p50} · p95 ${x.p95} · p99 ${x.p99} · max ${x.max} · over 33 ms: ${x.over33}`,
        `per frame: draw calls ${span(x.drawCalls)} · triangles ${span(x.triangles)}`,
        `memory: geometries ${grow(x.geometries)} · textures ${grow(x.textures)} · JS heap ${grow(x.heapMB, ' MB')}`,
        ...(x.problems ? [`${x.problems} error(s) during the run: tw check shows them`] : []),
      ].join('\n'));
    });
  },

  async shaders(a) {
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      const { formatShaders, dumpShaders, failed } = await import('./lib/shaders.mjs');
      const r = await ctx.page.eval('window.__tw.shaders()');
      if (a.dump && r.programs) { r.dumped = dumpShaders(r, String(a.dump)); r.dumpDir = String(a.dump); }
      // Sources go to --dump files; the JSON keeps them only when asked (--sources).
      if (a.json && !a.sources) for (const p of r.programs || []) { delete p.vertex.source; delete p.fragment.source; }
      print(r, a.json, formatShaders);
      if (r.error || (r.programs || []).some(failed)) process.exitCode = 1;
    });
  },

  async scene(a) {
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      const tree = await ctx.page.eval(`window.__tw.tree(${JSON.stringify({ depth: Number(a.depth || 6), max: Number(a.max || 80) })})`);
      print(a.json ? { tree } : tree, a.json);
    });
  },

  async shot(a) {
    const out = a.out || 'shot.png';
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      await preCapture(ctx, a);
      const r = await takeShot(ctx, a, out);
      const { digestLogs } = await import('./lib/page.mjs');
      const logs = digestLogs(ctx.logs);
      const problems = logs.exceptions.length + logs.errors.length + logs.network.length;
      print({ ...r, problems, logs: problems ? logs : undefined }, a.json, (x) => `${formatShot(x)}${problems ? `\n${problems} problem(s): run tw check for details\n` + [...logs.exceptions, ...logs.errors, ...logs.network].slice(0, 5).map((s) => '  ' + s.split('\n')[0]).join('\n') : ''}`);
    });
  },

  async sheet(a) {
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      await preCapture(ctx, a);
      print(await takeSheet(ctx, a, a.out || 'sheet.png'), a.json, formatImage);
    });
  },

  async video(a) {
    const { hasFfmpeg, recordVideo } = await import('./lib/video.mjs');
    const fps = Number(a.fps || 30);
    const frames = a.frames ? Number(a.frames) : Math.round(Number(a.seconds || 5) * fps);
    if (a.out && !hasFfmpeg()) throw new Error('ffmpeg not found on PATH (set TW_FFMPEG); use --frames-dir to save PNG frames only');
    if (!a.out && !a.framesDir) throw new Error('give --out file.mp4|.webm|.gif|.mov and/or --frames-dir dir');
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: 0 });
      await doActions(ctx, a, { virtual: true });
      const r = await recordVideo(ctx, { out: a.out, frames, fps, mode: a.capture || 'page', crf: a.crf ? Number(a.crf) : undefined, scale: a.scale, audio: a.audio, alpha: !!a.alpha, framesDir: a.framesDir, start: Number(a.start || 0) });
      const { digestLogs } = await import('./lib/page.mjs');
      const logs = digestLogs(ctx.logs);
      const size = r.out && existsSync(r.out) ? statSync(r.out).size : 0;
      print({ ...r, bytes: size, logs }, a.json, (x) => `wrote ${x.out || a.framesDir} · ${x.frames} frames at ${x.fps} fps (${x.seconds}s) · ${Math.round(size / 1024)} KB · driver ${x.driver} · took ${x.wallSeconds.toFixed(1)}s${logs.exceptions.length + logs.errors.length ? '\nproblems: ' + [...logs.exceptions, ...logs.errors].slice(0, 5).join(' | ') : ''}`);
    }, { clock: true });
  },

  async doctor(a) {
    const { findChrome } = await import('./lib/cdp.mjs');
    const { hasFfmpeg } = await import('./lib/video.mjs');
    const r = { node: process.version, nodeOk: Number(process.versions.node.split('.')[0]) >= 22, chrome: findChrome(), ffmpeg: hasFfmpeg() };
    if (r.chrome && r.nodeOk) {
      const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const dir = mkdtempSync(join(tmpdir(), 'tw-doctor-'));
      const cdnProbe = 'https://cdn.jsdelivr.net/npm/three@0.186.1/package.json';
      writeFileSync(join(dir, 'index.html'), `<!doctype html><script>window.__probe = (async () => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); let gl = 'none'; if (g) { const e = g.getExtension('WEBGL_debug_renderer_info'); gl = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); } let gpu = 'navigator.gpu missing'; if (navigator.gpu) { try { const ad = await navigator.gpu.requestAdapter(); gpu = ad ? 'adapter ok' + (ad.info ? ' (' + [ad.info.vendor, ad.info.architecture].filter(Boolean).join(' ') + ')' : '') : 'no adapter'; } catch (e) { gpu = String(e); } } const cdn = await Promise.race([fetch('${cdnProbe}').then((r) => 'reachable (' + r.status + ')', () => 'blocked'), new Promise((r) => setTimeout(() => r('timed out'), 8000))]); return { gl, gpu, cdn, ua: navigator.userAgent.match(/Chrom\\w*\\/[\\d.]+/)?.[0] }; })();</script>`);
      const { openPage } = await import('./lib/page.mjs');
      for (const [mode, webgpu] of [['auto', true], ['swiftshader', true]]) {
        let ctx;
        try { ctx = await openPage(dir, { gl: mode, webgpu, cdn: 'net' }); r[mode] = await ctx.page.eval('window.__probe'); }
        catch (e) { r[mode] = { gl: String(e.message || e), gpu: '?' }; }
        finally { if (ctx) await ctx.close(); }
      }
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
      const { spawnSync } = await import('node:child_process');
      const { cmdSpec } = await import('./lib/proc.mjs');
      const npm = spawnSync(...cmdSpec('npm', ['--version'], { encoding: 'utf8' }));
      r.npm = npm.status === 0 ? npm.stdout.trim() : null;
      r.cache = (await import('./lib/cdn.mjs')).cacheRoot();
    }
    print(r, a.json, (x) => [
      `node ${x.node} ${x.nodeOk ? 'ok' : 'TOO OLD (need 22+)'}`,
      `chrome ${x.chrome || 'NOT FOUND (set TW_CHROME)'}${x.auto && x.auto.ua ? ' (' + x.auto.ua + ')' : ''}`,
      `ffmpeg ${x.ffmpeg ? 'ok' : 'not found (video needs it; set TW_FFMPEG)'}`,
      x.auto ? `headless default: WebGL ${x.auto.gl} · WebGPU ${x.auto.gpu}` : '',
      x.swiftshader ? `headless --gl swiftshader: WebGL ${x.swiftshader.gl} · WebGPU ${x.swiftshader.gpu}` : '',
      x.auto && x.auto.cdn ? `cdn.jsdelivr.net from the browser: ${x.auto.cdn}${x.auto.cdn.startsWith('reachable') ? '' : ` (tw serves pinned packages from node_modules or via npm ${x.npm || 'NOT FOUND'} into ${x.cache})`}` : '',
    ].filter(Boolean).join('\n'));
  },

  async diff(a) {
    const [fa, fb] = a._.slice(1);
    if (!fa || !fb) throw new Error('diff <a.png> <b.png> [--threshold 0.1] [--max 0.001] [--out diff.png]');
    const { readFileSync, writeFileSync } = await import('node:fs');
    const { decodePng, encodePng, diffImages } = await import('./lib/png.mjs');
    const d = diffImages(decodePng(readFileSync(fa)), decodePng(readFileSync(fb)), { threshold: a.threshold ? Number(a.threshold) : 0.1 });
    if (a.out) writeFileSync(a.out, encodePng(d.image));
    const max = a.max !== undefined ? Number(a.max) : 0.001;
    const r = { share: d.share, pixels: d.pixels, maxDelta: Math.round(d.maxDelta * 1000) / 1000, pass: d.share <= max, max, out: a.out || null };
    print(r, a.json, (x) => `${x.pixels} pixel(s) differ (${(x.share * 100).toFixed(3)}%, budget ${(x.max * 100).toFixed(3)}%) · largest channel change ${x.maxDelta} · ${x.pass ? 'PASS' : 'FAIL'}${x.out ? ' · wrote ' + x.out + ' (differences in red)' : ''}`);
    if (!r.pass) process.exitCode = 1;
  },

  async lint(a) { const m = await import('./lib/lint.mjs'); return m.cmdLint(a, print); },
  async glb(a) { const m = await import('./lib/glb.mjs'); return m.cmdGlb(a, print); },
  async kb(a) { const m = await import('./lib/kb.mjs'); return m.cmdKb(a, print, ROOT); },
  async new(a) { const m = await import('./lib/templates.mjs'); return m.cmdNew(a, print, ROOT); },
  async templates(a) { const m = await import('./lib/templates.mjs'); return m.cmdTemplates(a, print, ROOT); },
  async versions(a) { const m = await import('./lib/versions.mjs'); return m.cmdVersions(a, print, ROOT); },
  async deprecations(a) { const m = await import('./lib/lint.mjs'); return m.cmdDeprecations(a, print, ROOT); },
};

async function main() {
  const a = parseArgs(process.argv.slice(2), { booleans: BOOLS });
  const cmd = a._[0];
  if (!cmd || a.help || cmd === 'help') { console.log(HELP); return; }
  const fn = commands[cmd];
  if (!fn) { console.error(`unknown command "${cmd}"\n\n${HELP}`); process.exitCode = 2; return; }
  try { await fn(a); } catch (e) {
    console.error('tw ' + cmd + ': ' + (e && e.message ? e.message : e));
    if (process.env.TW_DEBUG) console.error(e.stack);
    process.exitCode = process.exitCode || 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

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
  shot <page> --out f.png [--canvas] [--alpha]   one screenshot; prints its token cost
  sheet <page> --out f.png [--views current,front,right,top]   several angles in one image
  video <page> --out f.mp4|.webm|.gif|.mov --seconds 5 --fps 30 [--alpha] [--frames-dir d]
                        deterministic capture via ffmpeg (alpha: .webm or .mov, page cleared transparent)
      page options: --size 960x540 --dpr 1 --gl auto|gpu|swiftshader --webgpu --wait 1000 --root dir
                    --reduced-motion --timeout 60000 --headed
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

const BOOLS = ['json', 'canvas', 'webgpu', 'headed', 'strict', 'reducedMotion', 'reduced-motion', 'alpha', 'check', 'all', 'help', 'fix', 'keepFrames', 'force', 'md'];

function print(obj, asJson, textFn) {
  if (asJson) console.log(JSON.stringify(obj, null, 2));
  else console.log(textFn ? textFn(obj) : obj);
}

function pageOpts(a) {
  return { size: a.size, dpr: a.dpr, gl: a.gl, webgpu: !!a.webgpu, root: a.root, headed: !!a.headed, reducedMotion: !!(a.reducedMotion || a['reduced-motion']), timeout: a.timeout ? Number(a.timeout) : undefined, cdn: a.cdn };
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
  const d = r.logs;
  const sec = (name, arr) => { if (arr && arr.length) { L.push(`${name} (${arr.length}):`); for (const x of arr.slice(0, 12)) L.push('  ' + x.replace(/\n/g, '\n    ')); if (arr.length > 12) L.push(`  … ${arr.length - 12} more`); } };
  sec('EXCEPTIONS', d.exceptions);
  sec('ERRORS', d.errors.concat(r.summary.errors || []));
  sec('FAILED REQUESTS', d.network);
  sec('warnings', d.warnings);
  sec('CHECK', [...(r.summary.warn || []), ...((r.pixels && r.pixels.warn) || [])]);
  sec('fix hints', r.hints);
  L.push(r.ok ? 'result: OK (no exceptions, errors, failed requests or scene warnings)' : 'result: PROBLEMS FOUND');
  return L.join('\n');
}

function formatPixels(p) {
  const pct = (v) => (v >= 0.1 ? Math.round(v * 100) : Math.round(v * 1000) / 10) + '%';
  return `pixels: ${pct(p.coverage)} differ from the background ${p.background}${p.bbox ? ` · bbox x ${p.bbox.x0}-${p.bbox.x1} y ${p.bbox.y0}-${p.bbox.y1}` : ''} · mean luma ${Math.round(p.meanLuma * 100) / 100} · ${p.colours} colours${p.transparentShare > 0.01 ? ` · ${pct(p.transparentShare)} transparent` : ''}`;
}

// Measure what the main canvas shows, from a small screenshot of its box.
async function canvasPixels(ctx) {
  const box = await ctx.page.eval('(() => { const t = window.__tw && window.__tw.target && window.__tw.target(); const c = (t && t.renderer && t.renderer.domElement) || document.querySelector("canvas"); if (!c) return null; const b = c.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.x, y: b.y, width: b.width, height: b.height } : null; })()');
  if (!box) return null;
  const { decodePng, pixelStats, pixelWarnings } = await import('./lib/png.mjs');
  const scale = Math.min(1, 240 / box.width);
  const { data } = await ctx.page.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale }, captureBeyondViewport: false });
  const stats = pixelStats(decodePng(Buffer.from(data, 'base64')));
  return { ...stats, warn: pixelWarnings(stats) };
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

const commands = {
  async check(a) {
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      const { digestLogs } = await import('./lib/page.mjs');
      const summary = await ctx.page.eval('window.__tw.summary()');
      const pixels = await canvasPixels(ctx);
      const { evalWithTarget } = await import('./lib/page.mjs');
      const evaluated = a.eval ? await ctx.page.eval(evalWithTarget(String(a.eval))).catch(() => ctx.page.eval(String(a.eval))).catch((e) => 'eval failed: ' + e.message) : undefined;
      const logs = digestLogs(ctx.logs);
      const gl = await glString(ctx.page);
      const ok = !logs.exceptions.length && !logs.errors.length && !logs.network.length && !(summary.errors || []).length && !(summary.warn || []).length && !(pixels && pixels.warn.length);
      const { hintsFor } = await import('./lib/hints.mjs');
      const hints = hintsFor([...logs.exceptions, ...logs.errors, ...logs.network, ...logs.warnings, ...(summary.errors || [])]);
      const r = { url: ctx.url, ok, gl, cdn: ctx.cdn.stats(), summary, pixels, logs, hints, ...(a.eval ? { eval: evaluated } : {}) };
      print(r, a.json, formatCheck);
      if (!ok) process.exitCode = 1;
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
      const { screenshot, digestLogs } = await import('./lib/page.mjs');
      const r = await screenshot(ctx, out, { canvasOnly: !!a.canvas, alpha: !!a.alpha });
      const { readFileSync } = await import('node:fs');
      const { decodePng, pixelStats, pixelWarnings } = await import('./lib/png.mjs');
      const px = pixelStats(decodePng(readFileSync(out)));
      const pixels = { ...px, warn: pixelWarnings(px) };
      const logs = digestLogs(ctx.logs);
      const problems = logs.exceptions.length + logs.errors.length + logs.network.length;
      print({ ...r, pixels, problems, logs: problems ? logs : undefined }, a.json, (x) => `wrote ${x.file} (${x.width}x${x.height}, ${x.tokens} image tokens${x.seenAs ? `; the model downscales it to ${x.seenAs}` : ''})\n${formatPixels(x.pixels)}${x.pixels.warn.length ? '\n' + x.pixels.warn.map((w) => 'CHECK ' + w).join('\n') : ''}${problems ? `\n${problems} problem(s): run tw check for details\n` + [...logs.exceptions, ...logs.errors, ...logs.network].slice(0, 5).map((s) => '  ' + s.split('\n')[0]).join('\n') : ''}`);
    });
  },

  async sheet(a) {
    const out = a.out || 'sheet.png';
    const views = list(a.views);
    const [tw, th] = (a.tile || '480x270').split('x').map(Number);
    return withPage(a._[1], a, async (ctx) => {
      await ctx.settle({ wait: Number(a.wait || 1000) });
      const { writeDataUrl, imageFit } = await import('./lib/page.mjs');
      const url = await ctx.page.eval(`window.__tw.sheet(${JSON.stringify({ views: views.length ? views : undefined, tileW: tw, tileH: th, cols: a.cols ? Number(a.cols) : undefined })})`);
      if (!url) throw new Error('no scene, camera or renderer observed; run tw check');
      writeDataUrl(url, out);
      const n = views.length || 4, cols = Math.min(n, Number(a.cols || 2)), rows = Math.ceil(n / cols);
      const fit = imageFit(tw * cols, th * rows);
      print({ file: out, width: tw * cols, height: th * rows, tokens: fit.tokens, seenAs: fit.scaled ? `${fit.width}x${fit.height}` : undefined }, a.json, (x) => `wrote ${x.file} (${x.width}x${x.height}, ${x.tokens} image tokens${x.seenAs ? `; the model downscales it to ${x.seenAs}` : ''})`);
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
      const npm = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
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

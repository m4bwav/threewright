// Open a three.js page in headless Chrome and collect what an agent needs to
// verify it, as text first (errors, scene summary) and images only on request.

import { existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { launch } from './cdp.mjs';
import { serve } from './serve.mjs';
import { injectScript } from './inject.mjs';
import { createCdnResolver } from './cdn.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Claude's image cost (Anthropic vision docs, checked 2026-09-26): one visual token
// per 28x28 patch, ceil(w/28) * ceil(h/28). Larger images are first scaled down,
// keeping the aspect ratio, to the largest size within the tier's long-edge and
// token limits: "high" is Claude 4.7 and later (2576 px, 4784 tokens), "standard"
// every other model (1568 px, 1568 tokens). TW_IMAGE_TIER picks the default.
export const IMAGE_TIERS = { high: { edge: 2576, tokens: 4784 }, standard: { edge: 1568, tokens: 1568 } };
const patches = (w, h) => Math.ceil(w / 28) * Math.ceil(h / 28);

export function imageFit(w, h, tier = process.env.TW_IMAGE_TIER || 'high') {
  const t = IMAGE_TIERS[tier] || IMAGE_TIERS.high;
  if (Math.max(w, h) <= t.edge && patches(w, h) <= t.tokens) return { width: w, height: h, tokens: patches(w, h), scaled: false };
  const long = Math.max(w, h), ratio = Math.min(w, h) / long;
  for (let L = Math.min(long, t.edge); L > 0; L--) {
    const S = Math.max(1, Math.round(L * ratio));
    if (patches(L, S) <= t.tokens) {
      const [W, H] = w >= h ? [L, S] : [S, L];
      return { width: W, height: H, tokens: patches(W, H), scaled: true };
    }
  }
  return { width: 1, height: 1, tokens: 1, scaled: true };
}

export function imageTokens(w, h, tier) { return imageFit(w, h, tier).tokens; }

export function parseSize(s, fallback = [960, 540]) {
  if (!s) return fallback;
  const m = String(s).match(/^(\d+)\s*[x×,]\s*(\d+)$/i);
  if (!m) throw new Error(`bad size "${s}", expected WIDTHxHEIGHT such as 960x540`);
  return [Number(m[1]), Number(m[2])];
}

// Turn a file path or URL into something the browser can load.
export async function resolveTarget(target, root) {
  if (/^(https?|data|about):/i.test(target)) return { url: target, server: null, base: null };
  const file = resolve(target);
  if (!existsSync(file)) throw new Error(`not found: ${target}`);
  const isDir = statSync(file).isDirectory();
  const base = resolve(root || (isDir ? file : dirname(file)));
  const rel = relative(base, isDir ? resolve(file, 'index.html') : file);
  if (rel.startsWith('..')) throw new Error(`--root ${base} must contain ${file}`);
  const server = await serve(base);
  return { url: server.url + '/' + rel.split(sep).join('/'), server, base };
}

export async function openPage(target, opts = {}) {
  const [width, height] = parseSize(opts.size, [960, 540]);
  const dpr = Number(opts.dpr || 1);
  const { url, server, base } = await resolveTarget(target, opts.root);
  let browser;
  try {
    browser = await launch({ width, height, gl: opts.gl || 'auto', webgpu: !!opts.webgpu, headless: !opts.headed });
  } catch (e) {
    if (server) await server.close();
    throw e;
  }
  const page = await browser.newPage();
  const cdn = createCdnResolver({ mode: opts.cdn || process.env.TW_CDN || 'auto', roots: [base] });
  const logs = { console: [], exceptions: [], network: [], counts: {} };
  const inflight = new Set();
  let lastNet = Date.now();
  const push = (arr, item, max = 200) => { if (arr.length < max) arr.push(item); };

  page.on('Runtime.consoleAPICalled', (p) => {
    const text = p.args.map((a) => (a.value !== undefined ? (typeof a.value === 'string' ? a.value : JSON.stringify(a.value)) : a.description || a.type)).join(' ');
    const key = p.type + ':' + text.slice(0, 200);
    logs.counts[key] = (logs.counts[key] || 0) + 1;
    if (logs.counts[key] === 1) push(logs.console, { type: p.type, text: text.slice(0, 600) });
  });
  page.on('Runtime.exceptionThrown', (p) => {
    const d = p.exceptionDetails;
    push(logs.exceptions, ((d.exception && d.exception.description) || d.text || '').split('\n').slice(0, 5).join('\n'));
  });
  page.on('Log.entryAdded', (p) => {
    const e = p.entry;
    if (e.level === 'error' || e.level === 'warning') {
      const key = 'log:' + e.text.slice(0, 200);
      logs.counts[key] = (logs.counts[key] || 0) + 1;
      if (logs.counts[key] === 1) push(logs.console, { type: e.level === 'error' ? 'error' : 'warning', text: (e.text + (e.url ? ' ' + e.url : '')).slice(0, 600), source: e.source });
    }
  });
  const urls = new Map();
  page.on('Network.requestWillBeSent', (p) => { inflight.add(p.requestId); urls.set(p.requestId, p.request.url); lastNet = Date.now(); });
  page.on('Network.loadingFinished', (p) => { inflight.delete(p.requestId); lastNet = Date.now(); });
  page.on('Network.loadingFailed', (p) => {
    inflight.delete(p.requestId); lastNet = Date.now();
    if (!p.canceled) push(logs.network, { failed: p.errorText, url: urls.get(p.requestId) });
  });
  page.on('Network.responseReceived', (p) => {
    if (p.response.status >= 400) push(logs.network, { status: p.response.status, url: p.response.url });
  });

  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  if (opts.reducedMotion) await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: injectScript({ clock: !!opts.clock }) });
  if (cdn.enabled) {
    page.on('Fetch.requestPaused', (p) => { cdn.handle(page, p); });
    await page.send('Fetch.enable', { patterns: cdn.patterns });
  }

  const loaded = page.waitFor('Page.loadEventFired', opts.timeout || 60000);
  await page.send('Page.navigate', { url });
  await loaded;

  const ctx = {
    browser, page, server, logs, url, width, height, dpr, cdn,
    async networkIdle(quietMs = 500, maxMs = 20000) {
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        if (inflight.size === 0 && Date.now() - lastNet >= quietMs) return true;
        await sleep(100);
      }
      return false;
    },
    // Wait for assets, the page's own ready promise and a few real frames.
    async settle({ wait = 1000, maxMs = 30000 } = {}) {
      await ctx.networkIdle(500, maxMs);
      const hasReady = await page.eval('!!(window.__tw && window.__tw.ready && typeof window.__tw.ready.then === "function")');
      if (hasReady) await page.eval('Promise.race([window.__tw.ready, new Promise(r => setTimeout(r, ' + maxMs + '))]).then(() => true)', { timeoutMs: maxMs + 5000 });
      if (!opts.clock) await sleep(wait);
      else await page.eval('window.__tw.advance(16.667), true');
      await ctx.networkIdle(300, 5000);
    },
    async close() {
      await browser.close();
      if (server) await server.close();
    },
  };
  return ctx;
}

// `check --eval`: bind renderer, scene and camera for the expression. A page's own
// global wins; otherwise the main ones tw observed (most pages keep them module scoped).
// The object literal is evaluated at global scope so typeof sees top-level let/const.
export function evalWithTarget(expr) {
  const g = (n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`;
  return `((__t, __g) => ((renderer, scene, camera) => (${expr}
))(`
    + `__g.renderer ?? __t.renderer, __g.scene ?? __t.scene, __g.camera ?? __t.camera))(`
    + `(window.__tw && window.__tw.target && window.__tw.target()) || {}, { ${g('renderer')}, ${g('scene')}, ${g('camera')} })`;
}

export function writeDataUrl(dataUrl, out) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, Buffer.from(b64, 'base64'));
}

export async function screenshot(ctx, out, { canvasOnly = false, alpha = false } = {}) {
  if (alpha) await ctx.page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  let clip;
  if (canvasOnly) {
    const r = await ctx.page.eval('(() => { const t = window.__tw && window.__tw.target && window.__tw.target(); const c = (t && t.renderer && t.renderer.domElement) || document.querySelector("canvas"); if (!c) return null; const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()');
    if (r && r.width > 0) clip = { ...r, scale: 1 };
  }
  const { data } = await ctx.page.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}), captureBeyondViewport: false });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, Buffer.from(data, 'base64'));
  const w = clip ? Math.round(clip.width * ctx.dpr) : ctx.width * ctx.dpr;
  const h = clip ? Math.round(clip.height * ctx.dpr) : ctx.height * ctx.dpr;
  const fit = imageFit(w, h);
  return { file: out, width: w, height: h, tokens: fit.tokens, seenAs: fit.scaled ? `${fit.width}x${fit.height}` : undefined };
}

// Console lines that are driver chatter, not problems in the page.
export const NOISE = [
  /Program Info Log:(\s|\S)*warning X\d{4}/, // D3D compiler precision notes via ANGLE on Windows
  /GPU stall due to ReadPixels/,
  /Automatic fallback to software WebGL has been deprecated/,
  /\[\.WebGL-[0-9a-fx]+\]GL Driver Message \(OpenGL, Performance/,
];
export const isNoise = (text) => NOISE.some((re) => re.test(text));

// Collapse the collected logs to the lines worth an agent's attention.
export function digestLogs(logs) {
  const count = (e) => logs.counts[e.type + ':' + e.text.slice(0, 200)] || logs.counts['log:' + e.text.slice(0, 200)] || 1;
  const fmt = (e) => (count(e) > 1 ? `${e.text} (x${count(e)})` : e.text);
  const real = logs.console.filter((e) => !isNoise(e.text));
  const noise = logs.console.length - real.length;
  const errors = real.filter((e) => e.type === 'error' || e.type === 'assert').map(fmt);
  const warnings = real.filter((e) => e.type === 'warning' || e.type === 'warn').map(fmt);
  return { exceptions: logs.exceptions, errors, warnings, network: logs.network.map((n) => (n.status ? `${n.status} ${n.url}` : `${n.failed} ${n.url || ''}`.trim())), noise };
}

// Minimal Chrome DevTools Protocol client with no dependencies.
// Node 22+ ships a global WebSocket; older Node is refused with a clear message.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

// Browsers that test tools download (Playwright, Puppeteer), newest build first.
function toolBrowsers() {
  const out = [];
  const home = homedir();
  const pw = [process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.platform === 'win32' ? join(process.env.LOCALAPPDATA || home, 'ms-playwright')
      : process.platform === 'darwin' ? join(home, 'Library/Caches/ms-playwright') : join(home, '.cache/ms-playwright')];
  const exe = process.platform === 'win32' ? ['chrome-win/chrome.exe', 'chrome-win64/chrome.exe']
    : process.platform === 'darwin' ? ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium']
      : ['chrome-linux/chrome', 'chrome-linux64/chrome'];
  const newest = (dir, prefix) => {
    try { return readdirSync(dir).filter((d) => d.startsWith(prefix)).sort((a, b) => b.localeCompare(a, 'en', { numeric: true })); } catch { return []; }
  };
  for (const root of pw) {
    if (!root) continue;
    for (const d of newest(root, 'chromium-')) for (const e of exe) out.push(join(root, d, e));
  }
  const pup = join(home, '.cache/puppeteer/chrome');
  const pexe = process.platform === 'win32' ? ['chrome-win64/chrome.exe'] : process.platform === 'darwin' ? ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'] : ['chrome-linux64/chrome'];
  for (const d of newest(pup, '')) for (const e of pexe) out.push(join(pup, d, e));
  return out;
}

export function findChrome() {
  const env = process.env.TW_CHROME || process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [];
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
      if (!base) continue;
      candidates.push(join(base, 'Google/Chrome/Application/chrome.exe'));
      candidates.push(join(base, 'Chromium/Application/chrome.exe'));
      candidates.push(join(base, 'Microsoft/Edge/Application/msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    candidates.push('/Applications/Chromium.app/Contents/MacOS/Chromium');
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge']) candidates.push(p);
  }
  candidates.push(...toolBrowsers());
  return candidates.find((p) => existsSync(p)) || null;
}

// GL modes. "auto" lets Chrome pick the GPU and still allows the software
// fallback, which Chrome no longer enables by itself (so GPU-less CI still gets WebGL).
// "swiftshader" forces the deterministic CPU path used for pixel tests.
export function glFlags(mode = 'auto', webgpu = false) {
  const f = [];
  if (mode === 'swiftshader') f.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  else if (mode === 'gpu') f.push('--enable-gpu', '--ignore-gpu-blocklist');
  else f.push('--enable-unsafe-swiftshader');
  if (webgpu) {
    f.push('--enable-unsafe-webgpu', '--ignore-gpu-blocklist');
    if (process.platform === 'linux') f.push('--enable-features=Vulkan');
  }
  return f;
}

// Chrome's sandbox cannot start as root (containers, CI images); it also wants a
// large /dev/shm, which Docker does not give by default.
export function sandboxFlags() {
  const f = [];
  const root = typeof process.getuid === 'function' && process.getuid() === 0;
  if (root || process.env.TW_NO_SANDBOX) f.push('--no-sandbox');
  if (process.platform === 'linux') f.push('--disable-dev-shm-usage');
  return f;
}

export async function launch({ width = 1280, height = 720, gl = 'auto', webgpu = false, headless = true, extraArgs = [] } = {}) {
  if (typeof WebSocket === 'undefined') throw new Error('Node 22 or newer is required (global WebSocket). Found ' + process.version);
  const exe = findChrome();
  if (!exe) throw new Error('Chrome or Chromium not found. Set TW_CHROME to the browser executable.');
  const profile = mkdtempSync(join(tmpdir(), 'tw-chrome-'));
  const args = [
    headless ? '--headless=new' : '',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    // No calls home: component updates, sync, field trials, translate.
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--metrics-recording-only', '--no-pings',
    '--disable-features=Translate,OptimizationHints,MediaRouter',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${width},${height}`,
    ...sandboxFlags(),
    ...glFlags(gl, webgpu),
    ...extraArgs,
    'about:blank',
  ].filter(Boolean);
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start within 20 s. stderr: ' + buf.slice(-500))), 20000);
    proc.stderr.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chrome exited early (code ${code}). stderr: ${buf.slice(-500)}`)); });
  });
  const browser = await Connection.open(wsUrl);
  browser.proc = proc;
  browser.profile = profile;
  browser.exe = exe;
  return browser;
}

export class Connection {
  static open(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const c = new Connection(ws);
      ws.addEventListener('open', () => resolve(c));
      ws.addEventListener('error', (e) => reject(new Error('CDP socket error: ' + (e.message || 'unknown'))));
    });
  }

  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
    ws.addEventListener('close', () => {
      for (const { reject, method } of this.pending.values()) reject(new Error(`${method}: connection closed`));
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify(msg));
    });
  }

  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((l) => l !== fn); }; }

  async newPage() {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return new Page(this, sessionId, targetId);
  }

  async close() {
    try { await this.send('Browser.close'); } catch { /* already gone */ }
    try { this.ws.close(); } catch { /* ignore */ }
    if (this.proc) {
      await new Promise((r) => { if (this.proc.exitCode !== null) r(); else { this.proc.once('exit', r); setTimeout(r, 3000); } });
      try { this.proc.kill(); } catch { /* ignore */ }
    }
    if (this.profile) { try { rmSync(this.profile, { recursive: true, force: true }); } catch { /* Windows may hold files briefly */ } }
  }
}

export class Page {
  constructor(conn, sessionId, targetId) {
    this.conn = conn;
    this.sessionId = sessionId;
    this.targetId = targetId;
  }

  send(method, params) { return this.conn.send(method, params, this.sessionId); }

  on(method, fn) {
    return this.conn.on((msg) => { if (msg.sessionId === this.sessionId && msg.method === method) fn(msg.params); });
  }

  waitFor(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { off(); reject(new Error(`timed out waiting for ${method}`)); }, timeoutMs);
      const off = this.on(method, (p) => { clearTimeout(t); off(); resolve(p); });
    });
  }

  // Evaluate an expression; promises are awaited; the value comes back by value (JSON).
  async eval(expression, { timeoutMs = 60000 } = {}) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: timeoutMs });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('page eval failed: ' + (d.exception?.description || d.text || JSON.stringify(d)).split('\n').slice(0, 4).join(' | '));
    }
    return r.result.value;
  }
}

export function readDevToolsPort(profile) {
  const f = join(profile, 'DevToolsActivePort');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n')[0] : null;
}

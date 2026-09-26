// Serve pinned CDN module URLs (jsDelivr /npm/ and unpkg) from local copies of
// the same package version, so pages keep their CDN import maps while checks run
// offline, faster and with the exact bytes the version pins.
//
// Order: node_modules with the exact version, then the tw cache, then the CDN
// itself; when the CDN fails (blocked host, proxy refusal, 5xx), the package is
// fetched once through npm into the cache and served from there.
// Modes: auto (default), offline (never touch the CDN), net (no interception).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { contentType } from './serve.mjs';
import { cmdSpec } from './proc.mjs';

const TW_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const HOSTS = [
  { host: 'jsdelivr', pattern: 'https://cdn.jsdelivr.net/npm/*', re: /^https?:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/@]+\/)?[^/@]+)@([^/?#]+)(\/[^?#]*)?/ },
  { host: 'unpkg', pattern: 'https://unpkg.com/*', re: /^https?:\/\/unpkg\.com\/((?:@[^/@]+\/)?[^/@]+)@([^/?#]+)(\/[^?#]*)?/ },
];

const EXACT = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;

// { host, name, version, path } for a pinned package URL, else null.
export function parseCdnUrl(url) {
  for (const h of HOSTS) {
    const m = url.match(h.re);
    if (m) return { host: h.host, name: m[1], version: decodeURIComponent(m[2]), path: decodeURIComponent((m[3] || '/').replace(/^\/+/, '')) };
  }
  return null;
}

export function cacheRoot() {
  if (process.env.TW_CACHE) return resolve(process.env.TW_CACHE);
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA || homedir(), 'threewright', 'cache');
  return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'threewright');
}

const safeName = (s) => s.replace(/[^\w.@+-]/g, '_');
export const cacheDirFor = (name, version) => join(cacheRoot(), 'npm', safeName(name) + '@' + safeName(version));

// node_modules/<name> with exactly this version, looked up from each root upwards.
export function findInstalled(name, version, roots) {
  if (!EXACT.test(version)) return null;
  for (const start of roots) {
    if (!start) continue;
    let dir = resolve(start);
    for (;;) {
      const pj = join(dir, 'node_modules', name, 'package.json');
      if (existsSync(pj)) {
        try { if (JSON.parse(readFileSync(pj, 'utf8')).version === version) return dirname(pj); } catch { /* unreadable */ }
      }
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
  return null;
}

// Minimal tar reader for npm tarballs: regular files only, `package/` stripped,
// GNU long names and pax paths honoured, nothing written outside dest.
export function untar(buf, dest) {
  const root = resolve(dest);
  let off = 0, longName = null, paxPath = null, files = 0;
  const field = (h, a, b) => h.subarray(a, b).toString('utf8').replace(/\0[\s\S]*$/, '');
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    let name = field(h, 0, 100);
    const size = parseInt(field(h, 124, 136).trim() || '0', 8);
    const type = h[156] ? String.fromCharCode(h[156]) : '0';
    const prefix = field(h, 345, 500);
    if (prefix) name = prefix + '/' + name;
    const body = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = field(body, 0, body.length); continue; }
    if (type === 'x') { const m = body.toString('utf8').match(/\d+ path=([^\n]*)\n/); paxPath = m ? m[1] : null; continue; }
    if (longName) { name = longName; longName = null; }
    if (paxPath) { name = paxPath; paxPath = null; }
    if (type !== '0' && type !== '7') continue;
    const rel = name.replace(/^\.?\/?[^/]+\//, '');
    const out = resolve(root, rel);
    if (!out.startsWith(root + sep)) continue;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, body);
    files++;
  }
  return files;
}

function run(cmd, args, timeoutMs) {
  return new Promise((resolveP) => {
    let out = '', err = '';
    const p = spawn(...cmdSpec(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }));
    const t = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(t); resolveP({ code: -1, out, err: String(e) }); });
    p.on('close', (code) => { clearTimeout(t); resolveP({ code, out, err }); });
  });
}

const pending = new Map();

// Download name@version through npm (which honours the user's registry, proxy and
// auth settings) and unpack it into the cache. Resolves to the package dir or null.
export function fetchPackage(name, version) {
  const dir = cacheDirFor(name, version);
  if (existsSync(join(dir, '.complete'))) return Promise.resolve(dir);
  const key = name + '@' + version;
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tw-pack-'));
    try {
      const r = await run('npm', ['pack', key, '--pack-destination', tmp, '--json', '--silent'], 300000);
      if (r.code !== 0) return null;
      let file;
      try { file = join(tmp, JSON.parse(r.out)[0].filename); } catch { return null; }
      if (!existsSync(file)) return null;
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      untar(gunzipSync(readFileSync(file)), dir);
      writeFileSync(join(dir, '.complete'), key + '\n');
      return dir;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      pending.delete(key);
    }
  })();
  pending.set(key, job);
  return job;
}

// A file inside a package dir; the package root resolves to its module entry.
export function packageFile(dir, path) {
  let rel = path;
  if (!rel) {
    try {
      const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      const dot = pj.exports && (typeof pj.exports === 'string' ? pj.exports : pj.exports['.']);
      rel = (dot && (typeof dot === 'string' ? dot : dot.import || dot.browser || dot.default)) || pj.module || pj.main || 'index.js';
    } catch { return null; }
  }
  const file = resolve(dir, rel);
  if (!file.startsWith(resolve(dir) + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

export function createCdnResolver({ mode = 'auto', roots = [] } = {}) {
  const allRoots = [...roots, process.cwd(), TW_ROOT];
  const served = { node_modules: 0, cache: 0, npm: 0 };
  const packages = new Map();
  const note = (ref, where) => {
    served[where]++;
    const key = ref.name + '@' + ref.version;
    if (!packages.has(key)) packages.set(key, new Set());
    packages.get(key).add(where);
  };

  function local(ref) {
    const inst = findInstalled(ref.name, ref.version, allRoots);
    if (inst) { const f = packageFile(inst, ref.path); if (f) return { file: f, where: 'node_modules' }; }
    const dir = cacheDirFor(ref.name, ref.version);
    if (existsSync(join(dir, '.complete'))) { const f = packageFile(dir, ref.path); if (f) return { file: f, where: 'cache' }; }
    return null;
  }

  async function viaNpm(ref) {
    const dir = await fetchPackage(ref.name, ref.version);
    const f = dir && packageFile(dir, ref.path);
    return f ? { file: f, where: 'npm' } : null;
  }

  const fulfill = (page, requestId, hit, ref) => {
    note(ref, hit.where);
    return page.send('Fetch.fulfillRequest', {
      requestId, responseCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: contentType(hit.file) },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        { name: 'Cache-Control', value: 'no-store' },
      ],
      body: readFileSync(hit.file).toString('base64'),
    });
  };

  return {
    mode,
    enabled: mode !== 'net',
    patterns: HOSTS.flatMap((h) => [
      { urlPattern: h.pattern, requestStage: 'Request' },
      ...(mode === 'auto' ? [{ urlPattern: h.pattern, requestStage: 'Response' }] : []),
    ]),
    async handle(page, p) {
      const { requestId, request, responseStatusCode, responseErrorReason } = p;
      const atResponse = responseStatusCode !== undefined || responseErrorReason !== undefined;
      const ref = parseCdnUrl(request.url);
      try {
        if (ref && !atResponse) {
          const hit = local(ref) || (mode === 'offline' ? await viaNpm(ref) : null);
          if (hit) return await fulfill(page, requestId, hit, ref);
          if (mode === 'offline') {
            return await page.send('Fetch.fulfillRequest', { requestId, responseCode: 404, responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(`not found in npm package ${ref.name}@${ref.version}`).toString('base64') });
          }
        } else if (ref && atResponse) {
          const refused = responseErrorReason || responseStatusCode === 403 || responseStatusCode === 407 || responseStatusCode === 429 || responseStatusCode >= 500;
          if (refused) { const hit = await viaNpm(ref); if (hit) return await fulfill(page, requestId, hit, ref); }
        }
        return await page.send('Fetch.continueRequest', { requestId });
      } catch {
        try { await page.send('Fetch.continueRequest', { requestId }); } catch { /* request gone */ }
      }
    },
    stats() {
      const total = served.node_modules + served.cache + served.npm;
      return { total, ...served, packages: Object.fromEntries([...packages].map(([k, v]) => [k, [...v].join('+')])) };
    },
  };
}

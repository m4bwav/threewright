// Copy the pinned CDN modules a page imports into <dir>/vendor/ and point its
// import map at the copies, so a site ships with no runtime downloads from hosts
// it does not control.
//
// Only files the page reaches are copied: the page's module scripts are scanned
// for import specifiers, each is resolved through the import map, and every
// vendored file is scanned again for its own imports (relative ones inside the
// package, bare ones through the import map). The bytes come from node_modules
// with the exact version, the tw cache, or `npm pack` (never the CDN itself).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parseCdnUrl, findInstalled, cacheDirFor, fetchPackage, packageFile } from './cdn.mjs';
import { stripComments } from './lint.mjs';

const IMPORTMAP = /(<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/i;
const MODULE_SCRIPT = /<script\b([^>]*\btype\s*=\s*["']module["'][^>]*)>([\s\S]*?)<\/script>/gi;

// Static and dynamic import specifiers in module source.
export function importSpecifiers(src) {
  const out = new Set();
  const stat = /(?:^|[;\n}])\s*(?:import|export)\s*(?:[^'"`;()]*?\sfrom\s*)?(['"])([^'"\n]+)\1/g;
  const dyn = /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g;
  for (const re of [stat, dyn]) for (const m of src.matchAll(re)) out.add(m[2]);
  return [...out];
}

// Import map resolution for bare specifiers: exact key first, then the longest
// key ending in "/" that prefixes it. Returns null when nothing maps.
export function resolveBare(spec, imports) {
  if (Object.hasOwn(imports, spec)) return imports[spec];
  let best = null;
  for (const k of Object.keys(imports)) if (k.endsWith('/') && spec.startsWith(k) && (!best || k.length > best.length)) best = k;
  return best ? imports[best] + spec.slice(best.length) : null;
}

const isBare = (s) => !/^(?:[a-z][\w+.-]*:|\/|\.\.?\/)/i.test(s);

// vendor/<name>@<version>/<path> for a pinned CDN URL (a path ending in / stays a prefix).
export function vendorPath(ref) {
  return `vendor/${ref.name}@${ref.version}/${ref.path}`;
}

async function packageDir(ref, roots, offline) {
  const inst = findInstalled(ref.name, ref.version, roots);
  if (inst) return inst;
  const cached = cacheDirFor(ref.name, ref.version);
  if (existsSync(join(cached, '.complete'))) return cached;
  return offline ? null : fetchPackage(ref.name, ref.version);
}

// Package root URLs ("https://cdn.jsdelivr.net/npm/lenis@1.3.26") name no file;
// fill in the entry the CDN would serve, so the copy has a real path.
function withEntry(ref, dir) {
  if (ref.path) return ref;
  const f = packageFile(dir, '');
  return f ? { ...ref, path: relative(dir, f).split(sep).join('/') } : ref;
}

function pagesIn(target) {
  const t = resolve(target);
  if (!existsSync(t)) throw new Error(`${target} does not exist`);
  if (statSync(t).isFile()) return [t];
  const html = readdirSync(t).filter((f) => /\.html?$/i.test(f)).map((f) => join(t, f));
  if (!html.length) throw new Error(`no .html files in ${target}`);
  return html;
}

export async function vendorPage(file, { roots = [], offline = false, dryRun = false } = {}) {
  const base = dirname(file);
  let html = readFileSync(file, 'utf8');
  const r = { page: file, files: [], bytes: 0, rewritten: [], warnings: [] };
  const mapMatch = html.match(IMPORTMAP);
  if (!mapMatch) { r.warnings.push('no import map; nothing to vendor'); return r; }
  let imports;
  try { imports = JSON.parse(mapMatch[2]).imports || {}; } catch (e) { throw new Error(`${file}: the import map is not valid JSON (${e.message})`); }
  if (!Object.values(imports).some((v) => parseCdnUrl(String(v)))) { r.warnings.push('the import map has no pinned CDN URLs (already vendored?)'); return r; }

  // Specifiers the page itself uses: inline module scripts and local module files.
  const seeds = [];
  const localSeen = new Set();
  const scanLocal = (src, fromFile) => {
    for (const s of importSpecifiers(stripComments(src))) {
      if (isBare(s)) seeds.push(s);
      else if (/^\.\.?\//.test(s) && fromFile) {
        const f = resolve(dirname(fromFile), s);
        if (!localSeen.has(f) && existsSync(f) && f.startsWith(base + sep)) { localSeen.add(f); scanLocal(readFileSync(f, 'utf8'), f); }
      } else if (parseCdnUrl(s)) seeds.push(s);
    }
  };
  for (const m of html.matchAll(MODULE_SCRIPT)) {
    const src = m[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (src) {
      if (parseCdnUrl(src[1])) seeds.push(src[1]);
      else if (!/^[a-z]+:/i.test(src[1])) { const f = resolve(base, src[1]); if (existsSync(f)) { localSeen.add(f); scanLocal(readFileSync(f, 'utf8'), f); } }
    } else scanLocal(m[2], file);
  }

  // Walk the CDN graph.
  const queue = [];
  const seen = new Set();
  const dirs = new Map();
  const enqueue = (url, from) => {
    const ref = parseCdnUrl(url);
    if (!ref) { r.warnings.push(`${from}: ${url} is not a pinned jsDelivr or unpkg URL; left as is`); return; }
    if (!seen.has(url)) { seen.add(url); queue.push({ url, ref, from }); }
  };
  for (const s of seeds) {
    const url = isBare(s) ? resolveBare(s, imports) : s;
    if (!url) { r.warnings.push(`the page imports "${s}" but the import map does not map it`); continue; }
    if (parseCdnUrl(url)) enqueue(url, 'page');
  }
  while (queue.length) {
    const { url, ref: raw, from } = queue.shift();
    const key = raw.name + '@' + raw.version;
    if (!dirs.has(key)) dirs.set(key, await packageDir(raw, roots, offline));
    const dir = dirs.get(key);
    if (!dir) { r.warnings.push(`${key} is not in node_modules or the tw cache${offline ? ' (offline)' : ' and npm pack failed'}`); continue; }
    const ref = withEntry(raw, dir);
    const src = packageFile(dir, ref.path);
    if (!src) { r.warnings.push(`${from}: ${url} is not a file in the ${key} package (a CDN-built file such as /+esm cannot be vendored)`); continue; }
    const dest = join(base, ...vendorPath(ref).split('/'));
    const size = statSync(src).size;
    r.files.push({ file: relative(base, dest).split(sep).join('/'), bytes: size });
    r.bytes += size;
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
    if (!/\.m?js$/i.test(ref.path)) continue;
    const fileUrl = `https://cdn.jsdelivr.net/npm/${ref.name}@${ref.version}/${ref.path}`;
    for (const s of importSpecifiers(readFileSync(src, 'utf8'))) {
      if (/^\.\.?\//.test(s)) enqueue(new URL(s, fileUrl).href, ref.path);
      else if (isBare(s)) {
        const u = resolveBare(s, imports);
        if (!u) r.warnings.push(`${key}/${ref.path} imports "${s}" but the import map does not map it`);
        else if (parseCdnUrl(u)) enqueue(u, `${key}/${ref.path}`);
      } else if (/^https?:/i.test(s)) enqueue(s, `${key}/${ref.path}`);
      else r.warnings.push(`${key}/${ref.path} imports "${s}", which a copy cannot resolve`);
    }
  }

  // Point the import map at the copies; package-root entries get the entry file.
  let block = mapMatch[2];
  for (const [k, v] of Object.entries(imports)) {
    const raw = parseCdnUrl(String(v));
    if (!raw) continue;
    const dir = dirs.get(raw.name + '@' + raw.version);
    if (!dir) continue; // never reached: leave it on the CDN
    const local = './' + vendorPath(withEntry(raw, dir)) + (String(v).endsWith('/') && !vendorPath(raw).endsWith('/') ? '/' : '');
    block = block.split(JSON.stringify(v)).join(JSON.stringify(local));
    r.rewritten.push({ specifier: k, from: v, to: local });
  }
  const unused = Object.entries(imports).filter(([, v]) => parseCdnUrl(String(v)) && !dirs.has(parseCdnUrl(String(v)).name + '@' + parseCdnUrl(String(v)).version));
  for (const [k] of unused) r.warnings.push(`"${k}" is mapped but never imported; left on the CDN`);
  html = html.replace(IMPORTMAP, (_, a, _b, c) => a + block + c);
  const left = [...html.matchAll(/https?:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|cdnjs\.cloudflare\.com)\/[^\s"'<>)]+/g)].map((m) => m[0])
    .filter((u) => !Object.values(imports).includes(u));
  for (const u of new Set(left)) r.warnings.push(`the page still names ${u}`);
  if (!dryRun) writeFileSync(file, html);
  return r;
}

export async function cmdVendor(a, print) {
  const target = a._[1];
  if (!target) throw new Error('vendor <dir|page.html> [--offline] [--dry-run]');
  const roots = [dirname(resolve(target)), resolve(target)];
  const results = [];
  for (const file of pagesIn(target)) results.push(await vendorPage(file, { roots, offline: !!a.offline, dryRun: !!a.dryRun }));
  print(results, a.json, (rs) => rs.map((x) => [
    `${x.page}: ${x.files.length} file(s), ${Math.round(x.bytes / 1024)} KB${a.dryRun ? ' (dry run, nothing written)' : ' copied under vendor/'}`,
    ...x.rewritten.map((w) => `  ${w.specifier} -> ${w.to}`),
    ...x.warnings.map((w) => '  warning: ' + w),
  ].join('\n')).join('\n'));
  if (results.some((x) => x.warnings.some((w) => /not in node_modules|not a file|does not map/.test(w)))) process.exitCode = 1;
}

// tw size: what a built folder or one file costs to ship. Raw, gzip 9 and brotli 11 bytes per
// file and in total, the inline script and style bytes of HTML files, a budget that fails the
// run, and a warning for a self-extracting (packed) payload. Node zlib only, no browser.
// harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28
// Method from measuring a packed single-file game: its file was 55% smaller on disk than the
// plain minified script, but 16% larger than that script once the server applied brotli,
// because packed text does not compress again. Written fresh; no code from the source.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, extname } from 'node:path';
import { gzipSync, brotliCompressSync, deflateRawSync, constants } from 'node:zlib';

const TEXT = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.css', '.json', '.svg', '.txt', '.xml', '.glsl', '.wgsl']);
const SKIP_DIRS = new Set(['node_modules', '.git']);
export const PACKED_MIN_BYTES = 20000; // smaller files compress too unevenly to judge
export const PACKED_GAIN = 0.02; // brotli under 2% smaller than raw deflate: nothing left to compress

// Sizes of one buffer: raw, gzip -9, brotli 11 and raw deflate 9 (the packed test's baseline).
export function measure(buf) {
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length,
    deflate: deflateRawSync(buf, { level: 9 }).length,
  };
}

// A text file whose brotli size is within 2% of its deflate size is already compressed inside:
// a self-extracting script, a base64 or base91 blob. Plain minified JS gains 8% or more.
export function isPacked(m, ext) {
  return TEXT.has(ext) && m.raw > PACKED_MIN_BYTES && m.brotli > m.deflate * (1 - PACKED_GAIN);
}

// Bytes of inline <script> (no src) and <style> bodies in an HTML document.
export function inlineBytes(html) {
  let script = 0, style = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) if (!/\bsrc\s*=/i.test(m[1])) script += Buffer.byteLength(m[2]);
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) style += Buffer.byteLength(m[1]);
  return { script, style };
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

// Report for a folder (every file under it; source maps are listed as skipped) or one file.
export function sizeReport(target, { budget = null, by = 'gzip' } = {}) {
  if (!['raw', 'gzip', 'brotli'].includes(by)) throw new Error('--by takes raw, gzip or brotli');
  const root = resolve(target);
  const st = statSync(root);
  const paths = st.isDirectory() ? walk(root) : [root];
  const files = [], warn = [];
  let skipped = 0;
  const total = { raw: 0, gzip: 0, brotli: 0 };
  for (const p of paths) {
    if (/\.map$/i.test(p)) { skipped++; continue; }
    const buf = readFileSync(p), ext = extname(p).toLowerCase(), m = measure(buf);
    const f = { file: st.isDirectory() ? relative(root, p).replace(/\\/g, '/') : p.replace(/\\/g, '/').split('/').pop(), raw: m.raw, gzip: m.gzip, brotli: m.brotli };
    if (ext === '.html' || ext === '.htm') f.inline = inlineBytes(buf.toString('utf8'));
    if (isPacked(m, ext)) {
      f.packed = true;
      warn.push(`${f.file}: packed payload: brotli saves under 2% (${m.brotli} against ${m.deflate} deflate). A self-extracting or already compressed payload cannot be compressed again by the server; plain minified text is smaller over brotli. Pack only where raw file size is the limit.`);
    }
    for (const k of ['raw', 'gzip', 'brotli']) total[k] += f[k];
    files.push(f);
  }
  if (!files.length) throw new Error(`no files to measure in ${target}`);
  files.sort((a, b) => b[by] - a[by]);
  const r = { target: root.replace(/\\/g, '/'), files, total, by, skippedMaps: skipped, warn };
  if (budget != null) {
    const bytes = Number(budget) * 1000;
    if (!(bytes > 0)) throw new Error('--budget takes a size in kB (1 kB = 1000 bytes), e.g. --budget 300');
    r.budget = { kB: Number(budget), bytes, by, ok: total[by] < bytes };
  }
  return r;
}

const n = (v) => v.toLocaleString('en-US');
export function formatSize(r) {
  const L = [`size: ${r.target} · ${r.files.length} file(s)${r.skippedMaps ? ` · ${r.skippedMaps} source map(s) not counted` : ''}`];
  for (const f of r.files.slice(0, 15)) L.push(`  raw ${n(f.raw)} · gzip ${n(f.gzip)} · brotli ${n(f.brotli)}  ${f.file}${f.inline ? ` (inline script ${n(f.inline.script)}, style ${n(f.inline.style)})` : ''}${f.packed ? ' PACKED' : ''}`);
  if (r.files.length > 15) L.push(`  … ${r.files.length - 15} smaller file(s)`);
  L.push(`total: raw ${n(r.total.raw)} · gzip ${n(r.total.gzip)} · brotli ${n(r.total.brotli)} bytes`);
  for (const w of r.warn) L.push('warning: ' + w);
  if (r.budget) L.push(`budget: ${r.budget.kB} kB by ${r.budget.by}: ${r.budget.ok ? 'OK' : 'OVER'} (${n(r.total[r.budget.by])} of ${n(r.budget.bytes)} bytes)`);
  return L.join('\n');
}

export async function cmdSize(a, print) {
  const target = a._[1];
  if (!target) throw new Error('size <dir|file> [--budget <kB>] [--by raw|gzip|brotli] [--json]');
  const r = sizeReport(target, { budget: a.budget === undefined || a.budget === true ? null : a.budget, by: a.by && a.by !== true ? String(a.by) : 'gzip' });
  print(r, a.json, formatSize);
  if (r.budget && !r.budget.ok) process.exitCode = 1;
}

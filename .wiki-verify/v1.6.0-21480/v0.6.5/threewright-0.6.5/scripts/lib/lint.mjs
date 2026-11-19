// Static checks for stale or risky three.js API use, and a scanner that finds
// @deprecated markers in an installed three that no lint rule covers yet.
// Rules are data: kb/rules/lint-rules.json (each carries a sample that must match).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TW_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RULES_FILE = join(TW_ROOT, 'kb/rules/lint-rules.json');

const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.mts', '.cts', '.html', '.htm', '.vue', '.svelte', '.astro']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit', 'coverage', '.cache', '.vite', 'out']);

export function loadRules(file = RULES_FILE) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return { latest: data.latest, rules: data.rules.map(compileRule), skipped: data.skipped || [] };
}

export function compileRule(r) {
  return {
    ...r,
    re: new RegExp(r.pattern, 'g'),
    requiresRe: r.requires ? new RegExp(r.requires) : null,
    unlessRe: r.unless ? new RegExp(r.unless) : null,
  };
}

// Blank out comments (keeping every newline so line numbers hold). Strings are kept:
// import paths and CDN URLs live in strings.
export function stripComments(src, ext = '.js') {
  const out = src.split('');
  const blank = (a, b) => { for (let i = a; i < b; i++) if (out[i] !== '\n') out[i] = ' '; };
  if (ext === '.html' || ext === '.htm' || ext === '.vue' || ext === '.svelte' || ext === '.astro') {
    src.replace(/<!--[\s\S]*?-->/g, (m, off) => { blank(off, off + m.length); return m; });
  }
  let i = 0, str = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (str) {
      if (c === '\\') { i += 2; continue; }
      if (c === str || (c === '\n' && str !== '`')) str = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { str = c; i++; continue; }
    if (c === '/' && n === '/') {
      // Not a comment inside a URL such as https://
      if (src[i - 1] === ':') { i += 2; continue; }
      const end = src.indexOf('\n', i);
      blank(i, end < 0 ? src.length : end);
      i = end < 0 ? src.length : end; continue;
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      blank(i, stop); i = stop; continue;
    }
    i++;
  }
  return out.join('');
}

// Release number of three a project uses: package.json, node_modules, then pinned URLs.
export function detectRelease(startPath, contents = []) {
  let dir = resolve(startPath);
  if (existsSync(dir) && statSync(dir).isFile()) dir = dirname(dir);
  for (let d = dir; ; d = dirname(d)) {
    const pj = join(d, 'package.json');
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, 'utf8'));
        const spec = (j.dependencies && j.dependencies.three) || (j.devDependencies && j.devDependencies.three) || (j.peerDependencies && j.peerDependencies.three);
        const m = spec && String(spec).match(/0\.(\d{2,3})\./);
        if (m) return { release: Number(m[1]), from: relative(process.cwd(), pj) || 'package.json' };
      } catch { /* not JSON */ }
      const inst = join(d, 'node_modules/three/package.json');
      if (existsSync(inst)) {
        try { const v = JSON.parse(readFileSync(inst, 'utf8')).version; return { release: Number(v.split('.')[1]), from: 'node_modules/three' }; } catch { /* ignore */ }
      }
    }
    if (dirname(d) === d) break;
  }
  for (const text of contents) {
    const m = text.match(/three@0\.(\d{2,3})\.\d+/);
    if (m) return { release: Number(m[1]), from: 'pinned URL' };
  }
  return null;
}

export function collectFiles(paths, { md = false } = {}) {
  const files = [];
  const walk = (p, explicit) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) {
        if (SKIP_DIRS.has(e) || e.startsWith('.')) continue;
        walk(join(p, e), false);
      }
    } else {
      const ext = extname(p).toLowerCase();
      if (CODE_EXT.has(ext) || (ext === '.md' && (md || explicit))) files.push(p);
    }
  };
  for (const p of paths) walk(resolve(p), true);
  return files;
}

// Only fenced code blocks count in markdown; fences whose info string says "legacy" are skipped.
export function markdownCode(src) {
  const lines = src.split('\n');
  let inFence = false, legacy = false;
  return lines.map((l) => {
    const f = l.match(/^\s*(```|~~~)(.*)$/);
    if (f) { if (!inFence) { inFence = true; legacy = /legacy/i.test(f[2]); } else inFence = false; return ''; }
    return inFence && !legacy ? l : '';
  }).join('\n');
}

function severityOf(rule, release) {
  if (rule.status === 'pitfall') return rule.severity || 'warn';
  if (rule.removed && release >= rule.removed) return 'error';
  if (rule.status === 'removed' && !rule.removed && release >= rule.since) return 'error';
  return 'warn';
}

// Lint one text. Rules newer than the project's release are skipped: the API was still fine there.
export function lintText(text, { rules, release, ext = '.js' }) {
  const src = ext === '.md' ? markdownCode(text) : stripComments(text, ext);
  const findings = [];
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (off) => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
  for (const r of rules) {
    if (r.status !== 'pitfall' && r.since > release) continue;
    if (r.requiresRe && !r.requiresRe.test(src)) continue;
    if (r.unlessRe && r.unlessRe.test(src)) continue;
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(src))) {
      const ln = lineOf(m.index);
      findings.push({ rule: r.id, severity: severityOf(r, release), line: ln + 1, col: m.index - lineStarts[ln] + 1, match: m[0].slice(0, 80), message: r.message, fix: r.fix, since: r.since || null, removed: r.removed || null });
      if (m[0].length === 0) r.re.lastIndex++;
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.col - b.col);
}

export function lintPaths(paths, { target, md = false, rulesFile } = {}) {
  const { latest, rules } = loadRules(rulesFile);
  const files = collectFiles(paths, { md });
  const texts = files.map((f) => readFileSync(f, 'utf8'));
  const det = target ? { release: Number(String(target).replace(/^r/, '')), from: '--target' } : detectRelease(paths[0] || '.', texts);
  const release = det ? det.release : latest;
  const results = [];
  files.forEach((f, i) => {
    const ext = extname(f).toLowerCase();
    const found = lintText(texts[i], { rules, release, ext });
    if (found.length) results.push({ file: relative(process.cwd(), f) || f, findings: found });
  });
  const count = (s) => results.reduce((n, r) => n + r.findings.filter((x) => x.severity === s).length, 0);
  return { release, releaseFrom: det ? det.from : `latest known (r${latest})`, files: files.length, errors: count('error'), warnings: count('warn'), infos: count('info'), results };
}

export function cmdLint(a, print) {
  const paths = a._.slice(1);
  if (!paths.length) paths.push('.');
  const r = lintPaths(paths, { target: a.target, md: !!a.md });
  print(r, a.json, (x) => {
    const L = [`three r${x.release} (${x.releaseFrom}) · ${x.files} file(s)`];
    for (const f of x.results) {
      for (const d of f.findings) L.push(`${f.file}:${d.line}:${d.col} ${d.severity} ${d.rule}: ${d.message}${d.fix ? '\n    fix: ' + d.fix : ''}`);
    }
    L.push(`${x.errors} error(s), ${x.warnings} warning(s)${x.infos ? ', ' + x.infos + ' note(s)' : ''}`);
    return L.join('\n');
  });
  if (r.errors || (a.strict && r.warnings)) process.exitCode = 1;
}

// ---- deprecations: markers in the installed three that no rule mentions yet

// "since r183", "@deprecated, r183", "since 183." -> 183
export function releaseIn(text) {
  const m = text.match(/(?:since\s+r?|@deprecated,?\s*r|\br)(\d{3})\b/);
  return m ? Number(m[1]) : null;
}

const WARN_CALL = /(?:warnOnce|warn|console\.warn|error)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/;
const DECL = /^\s*(?:export\s+)?(?:(?:const|let|var|function|class|async|get|set|static)\s+)*(?:this\.)?(\w+)\s*(?:[=(:]|extends\b|\{)/;

// Identifiers a deprecation message names: "label()", .scale(), "PostProcessing", RGBELoader has been ...
export function namesIn(message = '') {
  const out = new Set();
  for (const re of [/"\.?(\w+)(?:\(\))?"/g, /\.(\w+)\(\)/g, /\b(\w+)\(\)/g, /\b([A-Z]\w+) (?:has been|is) (?:deprecated|renamed|removed)/g]) {
    let m; while ((m = re.exec(message))) out.add(m[1]);
  }
  return [...out];
}

export function scanDeprecations(root) {
  const out = [];
  const dirs = ['src', 'examples/jsm'].map((d) => join(root, d)).filter(existsSync);
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) scanFile(p);
    }
  };
  const scanFile = (p) => {
    const lines = readFileSync(p, 'utf8').split('\n');
    let cls = null, member = null;
    lines.forEach((l, i) => {
      const c = l.match(/^\s*(?:export\s+)?class\s+(\w+)/);
      if (c) { cls = c[1]; member = null; }
      // Class members sit one tab in: "\tname( args ) {" or "\tasync name(".
      const mm = l.match(/^\t(?:static\s+|async\s+|get\s+|set\s+)*(\w+)\s*\([^)]*\)\s*\{/);
      if (mm && !/^(?:if|for|while|switch|return)$/.test(mm[1])) member = mm[1];
      if (!/@deprecated/.test(l)) return;
      let rel = releaseIn(l), symbol = null, message = null;
      const inDoc = /^\s*(?:\/\*\*|\*)/.test(l);
      let from = i;
      if (inDoc) {
        // JSDoc: the declaration follows the comment block.
        while (from < lines.length && !/\*\//.test(lines[from])) from++;
        for (let k = from + 1; k < Math.min(lines.length, from + 4); k++) {
          const d = lines[k].trim() && lines[k].match(DECL);
          if (d) { symbol = d[1]; break; }
        }
      } else {
        const d = l.match(/^\s*#define\s+(\w+)/) || l.match(DECL);
        if (d && !/^(?:warnOnce|warn|console|error|if|return)$/.test(d[1])) symbol = d[1];
        else if (member && /^\t\t/.test(l)) symbol = member; // inside a method body
      }
      // The warn line (and often the release) sits on or just after the marker.
      for (let k = inDoc ? from + 1 : i; k < Math.min(lines.length, from + 14); k++) {
        const w = lines[k].match(WARN_CALL);
        if (w) { message = w[2]; if (!rel && /@deprecated/.test(lines[k])) rel = releaseIn(lines[k]); break; }
      }
      if (symbol === 'constructor' || symbol === 'super') symbol = cls;
      const qualified = symbol && cls && symbol !== cls && /^[a-z]/.test(symbol) ? `${cls}.${symbol}` : symbol;
      out.push({ file: relative(root, p).split('\\').join('/'), line: i + 1, release: rel, symbol: qualified, message });
    });
  };
  dirs.forEach(walk);
  // A JSDoc marker and the warn line inside the same member describe one deprecation.
  const merged = [];
  for (const d of out) {
    const prev = merged[merged.length - 1];
    const same = prev && prev.file === d.file && d.line - prev.line <= 16 &&
      (!prev.symbol || !d.symbol || prev.symbol === d.symbol || (prev.message && d.message && prev.message === d.message));
    if (same) { prev.symbol = prev.symbol || d.symbol; prev.message = prev.message || d.message; prev.release = prev.release || d.release; }
    else merged.push({ ...d });
  }
  return merged;
}

// A rule covers a marker when its pattern names the deprecated identifier, or
// matches a typical use of it (new X(, .x(, THREE.X).
export function coveredBy(rules, d) {
  let names = [(d.symbol || '').split('.').pop(), ...namesIn(d.message)];
  if (/This module has been deprecated/.test(d.message || '')) names.push((d.message.match(/^(?:THREE\.)?(\w+):/) || [])[1]);
  names = names.filter((n) => n && n.length >= 3 && !/^(?:THREE|TSL|constructor)$/.test(n));
  return rules.find((r) => {
    const plain = r.pattern.replace(/\\[bBsSdDwW]/g, ' ');
    const re = new RegExp(r.pattern);
    return names.some((n) => new RegExp(`(^|[^A-Za-z0-9_])${n}([^A-Za-z0-9_]|$)`).test(plain) ||
      [n, `.${n}(`, `new ${n}(`, `new THREE.${n}(`, `THREE.${n}`].some((u) => re.test(u)));
  }) || null;
}

export function isSkipped(skipped, d) {
  return skipped.some((s) => (s.symbol && s.symbol === d.symbol) ||
    (s.file && s.file === d.file && (!s.line_message || (d.message || '').includes(s.line_message))));
}

export function cmdDeprecations(a, print, ROOT) {
  const root = resolve(a.src || join(process.cwd(), 'node_modules/three'));
  const alt = [join(ROOT, 'node_modules/three'), join(ROOT, 'dev/node_modules/three')].find((d) => existsSync(join(d, 'src'))) || join(ROOT, 'node_modules/three');
  const dir = existsSync(join(root, 'src')) ? root : alt;
  if (!existsSync(join(dir, 'src'))) throw new Error(`no three source at ${root} (npm install three, or pass --src path/to/three)`);
  const version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
  const { rules, skipped } = loadRules();
  const all = scanDeprecations(dir);
  const skip = all.filter((d) => !coveredBy(rules, d) && isSkipped(skipped, d));
  const pending = all.filter((d) => !coveredBy(rules, d) && !isSkipped(skipped, d));
  const r = { three: version, markers: all.length, covered: all.length - pending.length - skip.length, skipped: skip.length, pending: a.all ? all : pending };
  print(r, a.json, (x) => [
    `three ${x.three}: ${x.markers} deprecation marker(s), ${x.covered} covered by lint rules, ${x.skipped} skipped on purpose, ${x.markers - x.covered - x.skipped} pending`,
    ...x.pending.map((d) => `  r${d.release || '?'}  ${d.symbol || '(unnamed)'}  ${d.file}:${d.line}${d.message ? '  ' + d.message.slice(0, 110) : ''}`),
    x.markers - x.covered - x.skipped ? 'add a rule to kb/rules/lint-rules.json for each pending entry that user code can hit (sample and ok required), then tw kb validate' : '',
  ].filter(Boolean).join('\n'));
}

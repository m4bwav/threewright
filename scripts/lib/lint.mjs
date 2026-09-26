// Static checks for stale or wrong three.js API use, driven by kb/rules/stale-api.json.
// `tw lint` reports file:line, the release that changed the API and the replacement.
// `tw deprecations` lists @deprecated markers in an installed three that no rule covers yet.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.htm', '.vue', '.svelte', '.glsl', '.wgsl', '.vert', '.frag', '.md']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit', 'coverage', '.vite']);

export function loadRules(root) {
  const data = JSON.parse(readFileSync(join(root, 'kb', 'rules', 'stale-api.json'), 'utf8'));
  return data.rules.map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags || '') }));
}

export function walk(paths, out = []) {
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`not found: ${p}`);
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const n of readdirSync(p)) if (!SKIP.has(n) && !n.startsWith('.')) walk([join(p, n)], out);
    } else if (EXTS.has(extname(p).toLowerCase())) out.push(p);
  }
  return out;
}

// A line that is only a comment is not code; markdown is checked only inside code fences.
function codeLines(text, ext) {
  const lines = text.split(/\r?\n/);
  let fence = false;
  return lines.map((line) => {
    if (ext === '.md') {
      if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return ''; }
      return fence ? line : '';
    }
    return /^\s*(\/\/|\*|\/\*)/.test(line) ? '' : line;
  });
}

export function lintText(text, file, rules) {
  const ext = extname(file).toLowerCase();
  const found = [];
  const lines = codeLines(text, ext);
  const versions = new Map();
  lines.forEach((line, i) => {
    if (!line) return;
    for (const r of rules) {
      if (r.ext && !r.ext.includes(ext)) continue;
      if (r.file_check === 'same-version') {
        for (const m of line.matchAll(new RegExp(r.pattern, 'g'))) if (!versions.has(m[0])) versions.set(m[0], i + 1);
        continue;
      }
      const m = line.match(r.re);
      if (m) found.push({ file, line: i + 1, rule: r.id, severity: r.severity, since: r.since, status: r.status, match: m[0].slice(0, 60), replacement: r.replacement, fixable: !!r.fix });
    }
  });
  if (versions.size > 1) {
    const r = rules.find((x) => x.file_check === 'same-version');
    const [first, ...rest] = [...versions.entries()];
    for (const [v, line] of rest) found.push({ file, line, rule: r.id, severity: r.severity, since: r.since, status: r.status, match: `${v} vs ${first[0]} (line ${first[1]})`, replacement: r.replacement, fixable: false });
  }
  return found;
}

export function fixText(text, file, rules) {
  const ext = extname(file).toLowerCase();
  let n = 0;
  const out = text.split(/(\r?\n)/).map((line) => {
    if (/^\r?\n$/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line) || ext === '.md') return line;
    for (const r of rules) {
      if (!r.fix) continue;
      const re = new RegExp(r.fix.from, 'g');
      const next = line.replace(re, r.fix.to);
      if (next !== line) { n++; line = next; }
    }
    return line;
  }).join('');
  return { text: out, fixes: n };
}

export async function cmdLint(a, print, root) {
  const rules = loadRules(root);
  const targets = a._.slice(1);
  if (!targets.length) throw new Error('give files or folders to lint');
  const files = walk(targets);
  let findings = [];
  let fixes = 0;
  for (const f of files) {
    let text = readFileSync(f, 'utf8');
    if (a.fix) {
      const r = fixText(text, f, rules);
      if (r.fixes) { writeFileSync(f, r.text); text = r.text; fixes += r.fixes; }
    }
    findings = findings.concat(lintText(text, f, rules));
  }
  const errors = findings.filter((x) => x.severity === 'error').length;
  const rel = (f) => relative(process.cwd(), resolve(f)) || f;
  print({ files: files.length, errors, findings, fixes }, a.json, (r) => {
    const L = r.findings.map((x) => `${rel(x.file)}:${x.line}  ${x.severity}  ${x.rule}  "${x.match}"  (${x.status} ${x.since}) -> ${x.replacement}${x.fixable && !a.fix ? '  [--fix]' : ''}`);
    L.push(`${r.files} file(s), ${r.findings.length} finding(s), ${r.errors} error(s)${a.fix ? `, ${r.fixes} fix(es) applied` : ''}`);
    return L.join('\n');
  });
  if (errors) process.exitCode = 1;
}

// Pull "@deprecated ... rNNN" markers out of an installed three.
export function scanDeprecations(src) {
  const out = [];
  for (const f of walk([src])) {
    if (!/\.js$/.test(f)) continue;
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!/@deprecated/.test(line)) return;
      const rel = (line.match(/r?(1\d\d)\b/) || [])[1];
      // The message usually sits on the same line (warn(...)) or within the next lines.
      const ctx = lines.slice(Math.max(0, i - 1), i + 10).join(' ');
      const msg = (ctx.match(/(?:warnOnce|warn|error|console\.warn)\(\s*'([^']+)'/) || [])[1] || line.replace(/^\s*(\*|\/\/)\s*/, '').trim();
      if (!rel && !msg) return;
      out.push({ file: relative(src, f), line: i + 1, release: rel ? 'r' + rel : '?', text: msg.slice(0, 160), ctx: relative(src, f) + ' ' + lines.slice(i, i + 14).join(' ') });
    });
  }
  // One entry per message.
  const seen = new Set();
  return out.filter((d) => (seen.has(d.file + d.text) ? false : (seen.add(d.file + d.text), true)));
}

export async function cmdDeprecations(a, print, root) {
  const src = resolve(a.src || join(root, 'node_modules', 'three'));
  if (!existsSync(src)) throw new Error(`no three install at ${src}; npm install three or pass --src`);
  const version = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).version;
  const rules = loadRules(root);
  const keys = rules.flatMap((r) => r.keys || []);
  const all = [...scanDeprecations(join(src, 'src')), ...scanDeprecations(join(src, 'examples', 'jsm'))];
  const items = all.map((d) => ({ ...d, covered: keys.some((k) => d.ctx.includes(k)) }));
  for (const d of items) delete d.ctx;
  const pending = items.filter((d) => !d.covered);
  print({ version, total: items.length, covered: items.length - pending.length, pending: a.all ? items : pending }, a.json, (r) => [
    `three ${r.version}: ${r.total} @deprecated markers, ${r.covered} covered by kb/rules/stale-api.json`,
    ...r.pending.map((d) => `${d.covered ? '  ok ' : '  NEW'} ${d.release.padEnd(5)} ${d.file}:${d.line}  ${d.text}`),
    pending.length ? 'add a rule for each NEW marker worth catching (threewright-curate), or ignore internal ones' : 'all markers covered',
  ].join('\n'));
}

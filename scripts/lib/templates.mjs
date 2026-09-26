// Verified starters under templates/<name>/, each described by template.json.

import { cpSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function listTemplates(ROOT) {
  const dir = join(ROOT, 'templates');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort().map((d) => {
    const meta = join(dir, d, 'template.json');
    let t = {};
    try { t = JSON.parse(readFileSync(meta, 'utf8')); } catch { /* missing or invalid: validate reports it */ }
    return { name: d, ...t, path: `templates/${d}`, hasMeta: existsSync(meta) };
  });
}

export function cmdTemplates(a, print, ROOT) {
  const list = listTemplates(ROOT);
  print(list, a.json, (x) => x.map((t) => {
    const v = [].concat(t.verified || [])[0];
    return `${t.name.padEnd(18)} ${t.summary || '(no template.json)'}${t.renderer ? ` [${t.renderer}${t.three ? ', three ' + t.three : ''}]` : ''}${v ? `\n${' '.repeat(19)}verified ${v.date}: ${v.checks}` : ''}`;
  }).join('\n'));
}

export function cmdNew(a, print, ROOT) {
  const name = a._[1], dest = a._[2];
  if (!name || !dest) throw new Error('new <template> <dir>   (tw templates lists them)');
  const t = listTemplates(ROOT).find((x) => x.name === name);
  if (!t) throw new Error(`no template "${name}"; tw templates lists them`);
  const out = resolve(dest);
  if (existsSync(out) && readdirSync(out).length && !a.force) throw new Error(`${dest} is not empty (use --force to copy into it anyway)`);
  cpSync(join(ROOT, t.path), out, { recursive: true, filter: (src) => !/[\\/](node_modules|dist|\.vite)([\\/]|$)|[\\/]template\.json$/.test(src) });
  const fill = (s) => s.replace(/<threewright>/g, ROOT).replace(/<dir>/g, dest);
  const r = { template: name, dir: out, next: [].concat(t.next || `node <threewright>/scripts/tw.mjs check <dir>`).map(fill) };
  print(r, a.json, (x) => [`copied ${x.template} to ${x.dir}`, ...[].concat(x.next).map((s) => '  next: ' + s)].join('\n'));
}

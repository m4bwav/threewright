// Verified starters under templates/<name>/, each described by template.json:
// { "name", "summary", "stack", "renderer": "webgl|webgpu", "verified": ["<date> <how>"] }.

import { cpSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function listTemplates(root) {
  const d = join(root, 'templates');
  return readdirSync(d, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => {
    const f = join(d, x.name, 'template.json');
    const meta = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
    return { name: x.name, summary: meta.summary || '', stack: meta.stack || '', renderer: meta.renderer || '', verified: meta.verified || [], run: meta.run || '' };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export async function cmdTemplates(a, print, root) {
  print(listTemplates(root), a.json, (ts) => ts.map((t) => `${t.name.padEnd(20)} ${t.renderer.padEnd(7)} ${t.summary}${t.verified.length ? '' : ' [unverified]'}`).join('\n'));
}

export async function cmdNew(a, print, root) {
  const [, name, dir] = a._;
  const ts = listTemplates(root);
  const t = ts.find((x) => x.name === name);
  if (!t) throw new Error(`unknown template "${name}"; one of: ${ts.map((x) => x.name).join(', ')}`);
  if (!dir) throw new Error('give a destination folder: tw new <template> <dir>');
  const dest = resolve(dir);
  if (existsSync(dest) && readdirSync(dest).length && !a.force) throw new Error(`${dir} is not empty (use --force to copy into it)`);
  cpSync(join(root, 'templates', name), dest, { recursive: true, filter: (s) => !/[\\/](node_modules|dist)([\\/]|$)/.test(s) && !s.endsWith('template.json') });
  print({ template: name, dir: dest, run: t.run }, a.json, (r) => `copied ${r.template} to ${r.dir}${r.run ? '\nnext: ' + r.run : ''}\nverify: node scripts/tw.mjs check ${dir}`);
}

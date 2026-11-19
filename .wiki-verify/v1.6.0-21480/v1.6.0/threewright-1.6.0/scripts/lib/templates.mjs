// Verified starters under templates/<name>/, each described by template.json.

import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { cacheDirFor, fetchPackage, findInstalled } from './cdn.mjs';

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

// Binary assets a template needs but the repository does not hold (the Claude plugin
// directory accepts no binaries except images). template.json "generate" lists them:
// { file, script, args (with <out> for the target path), needs: { package: exact version } }.
// The script runs from a temp folder whose node_modules links each needed package,
// found in node_modules, the tw cache or through npm pack. Returns the files written.
export async function generateAssets(t, out, ROOT) {
  const made = [];
  for (const g of [].concat(t.generate || [])) {
    const target = join(out, g.file);
    if (existsSync(target)) continue;
    const tmp = mkdtempSync(join(tmpdir(), 'tw-gen-'));
    const links = [];
    try {
      for (const [name, version] of Object.entries(g.needs || {})) {
        const cached = cacheDirFor(name, version);
        const dir = findInstalled(name, version, [ROOT, join(ROOT, 'dev')]) || (existsSync(join(cached, '.complete')) ? cached : await fetchPackage(name, version));
        if (!dir) throw new Error(`${g.file}: could not get ${name}@${version} from node_modules, the tw cache or npm`);
        const link = join(tmp, 'node_modules', name);
        mkdirSync(dirname(link), { recursive: true });
        symlinkSync(dir, link, 'junction');
        links.push(link);
      }
      const script = join(tmp, basename(g.script));
      copyFileSync(join(ROOT, t.path, g.script), script);
      const args = [].concat(g.args || ['<out>']).map((x) => (x === '<out>' ? target : String(x)));
      const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
      if (r.status !== 0 || !existsSync(target)) throw new Error(`${g.file}: ${g.script} failed
${(r.stderr || r.stdout || '').trim()}`);
      made.push(g.file);
    } finally {
      for (const l of links) { try { unlinkSync(l); } catch { /* already gone */ } }
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return made;
}

export async function cmdNew(a, print, ROOT) {
  const name = a._[1], dest = a._[2];
  if (!name || !dest) throw new Error('new <template> <dir>   (tw templates lists them)');
  const t = listTemplates(ROOT).find((x) => x.name === name);
  if (!t) throw new Error(`no template "${name}"; tw templates lists them`);
  const out = resolve(dest);
  if (existsSync(out) && readdirSync(out).length && !a.force) throw new Error(`${dest} is not empty (use --force to copy into it anyway)`);
  cpSync(join(ROOT, t.path), out, { recursive: true, filter: (src) => !/[\\/](node_modules|dist|\.vite)([\\/]|$)|[\\/]template\.json$/.test(src) });
  const fill = (s) => s.replace(/<threewright>/g, ROOT).replace(/<dir>/g, dest);
  const r = { template: name, dir: out, next: [].concat(t.next || `node <threewright>/scripts/tw.mjs check <dir>`).map(fill) };
  const generated = await generateAssets(t, out, ROOT);
  if (generated.length) r.generated = generated;
  // Templates for sites ship their libraries: copy the pinned CDN modules into vendor/.
  if (t.vendor && !a.noVendor) {
    const { vendorPage } = await import('./vendor.mjs');
    const v = await vendorPage(join(out, t.entry || 'index.html'), { roots: [out, ROOT] });
    r.vendored = { files: v.files.length, bytes: v.bytes, warnings: v.warnings };
  }
  print(r, a.json, (x) => [`copied ${x.template} to ${x.dir}`,
    ...(x.generated ? [`generated ${x.generated.join(', ')}`] : []),
    ...(x.vendored ? [`vendored ${x.vendored.files} module file(s), ${Math.round(x.vendored.bytes / 1024)} KB, into vendor/ (--no-vendor keeps the CDN import map)`, ...x.vendored.warnings.map((w) => '  warning: ' + w)] : []),
    ...[].concat(x.next).map((s) => '  next: ' + s)].join('\n'));
}

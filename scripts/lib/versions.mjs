// Latest npm versions of three and the ecosystem, against what the knowledge
// base (kb/libraries/*.md: package, version_checked) and templates pin.

import { spawn } from 'node:child_process';
import { readEntries } from './kb.mjs';
import { listTemplates } from './templates.mjs';

// -1, 0, 1 for semver-ish strings; prerelease sorts below its release.
export function compareVersions(a, b) {
  const parse = (v) => {
    const [main, pre] = String(v).replace(/^[^\d]*/, '').split('-');
    return { nums: main.split('.').map((n) => parseInt(n, 10) || 0), pre: pre || null };
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if ((x.nums[i] || 0) !== (y.nums[i] || 0)) return (x.nums[i] || 0) < (y.nums[i] || 0) ? -1 : 1;
  if (x.pre && !y.pre) return -1;
  if (!x.pre && y.pre) return 1;
  return 0;
}

function npmView(pkg) {
  return new Promise((resolveP) => {
    const win = process.platform === 'win32';
    const p = spawn(win ? 'npm.cmd' : 'npm', ['view', pkg, 'version', '--json'], { shell: win, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('error', () => resolveP(null));
    p.on('close', (code) => { try { resolveP(code === 0 ? JSON.parse(out) : null); } catch { resolveP(null); } });
  });
}

export async function latestVersion(pkg) {
  const url = `${(process.env.npm_config_registry || 'https://registry.npmjs.org').replace(/\/$/, '')}/${pkg.replace('/', '%2F')}/latest`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    clearTimeout(t);
    if (res.ok) { const j = await res.json(); if (j.version) return j.version; }
  } catch { /* proxy or offline: npm knows the user's registry and proxy settings */ }
  return npmView(pkg);
}

export function pinnedPackages(ROOT) {
  const out = new Map();
  const add = (pkg, version, where) => { if (!pkg || !version) return; if (!out.has(pkg)) out.set(pkg, []); out.get(pkg).push({ version: String(version).replace(/^[\^~=v]/, ''), where }); };
  for (const e of readEntries(ROOT)) if (e.kind === 'library' && e.fm.package) add(e.fm.package, e.fm.version_checked, `kb/${e.rel}`);
  for (const t of listTemplates(ROOT)) {
    if (t.three) add('three', t.three, `${t.path}/template.json`);
    for (const [p, v] of Object.entries(t.packages || {})) add(p, v, `${t.path}/template.json`);
  }
  return out;
}

export async function cmdVersions(a, print, ROOT) {
  const pinned = pinnedPackages(ROOT);
  if (!pinned.has('three')) pinned.set('three', []);
  const names = [...pinned.keys()];
  const results = [];
  for (let i = 0; i < names.length; i += 8) {
    const batch = await Promise.all(names.slice(i, i + 8).map(async (pkg) => ({ pkg, latest: await latestVersion(pkg) })));
    results.push(...batch);
  }
  const rows = results.map(({ pkg, latest }) => {
    const pins = pinned.get(pkg);
    const oldest = pins.reduce((m, p) => (!m || compareVersions(p.version, m.version) < 0 ? p : m), null);
    const status = !latest ? 'unknown (registry unreachable)' : !oldest ? 'not pinned' : compareVersions(oldest.version, latest) < 0 ? 'BEHIND' : 'ok';
    return { package: pkg, latest, pinned: pins, status };
  }).sort((x, y) => (x.status === 'BEHIND' ? 0 : 1) - (y.status === 'BEHIND' ? 0 : 1) || x.package.localeCompare(y.package));
  const behind = rows.filter((r) => r.status === 'BEHIND');
  print({ rows, behind: behind.length }, a.json, (x) => [
    ...x.rows.map((r) => `${r.package.padEnd(30)} latest ${String(r.latest || '?').padEnd(12)} ${r.status}${r.pinned.length ? '  (' + [...new Set(r.pinned.map((p) => p.version))].join(', ') + ' in ' + r.pinned.length + ' place' + (r.pinned.length > 1 ? 's' : '') + ')' : ''}`),
    x.behind ? `${x.behind} package(s) behind: refresh those kb entries and templates (threewright-curate), then tw kb validate` : 'knowledge base and templates are current with npm',
  ].join('\n'));
  if (a.check && behind.length) process.exitCode = 1;
}

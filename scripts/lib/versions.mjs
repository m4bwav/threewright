// Latest npm versions of three and the ecosystem, compared with what the knowledge
// base last checked (version_checked in kb/libraries/*.md and kb/topics/*.md).

import { execFileSync } from 'node:child_process';
import { loadKb } from './kb.mjs';

async function latest(pkg) {
  try {
    const r = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2f')}/latest`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) return (await r.json()).version;
  } catch { /* fall back to the npm CLI, which honours proxy settings */ }
  try { return execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['view', pkg, 'version'], { encoding: 'utf8', timeout: 30000, shell: process.platform === 'win32' }).trim(); }
  catch { return null; }
}

// "0.186.1" vs "0.185.0": which part moved. three's real releases live in the minor field.
export function drift(checked, now) {
  if (!checked || !now) return 'unknown';
  const a = String(checked).replace(/^[^\d]*/, '').split('.').map(Number), b = String(now).split('.').map(Number);
  if (a[0] !== b[0]) return 'major';
  if ((a[1] || 0) !== (b[1] || 0)) return a[0] === 0 ? 'major' : 'minor';
  if ((a[2] || 0) !== (b[2] || 0)) return 'patch';
  return 'same';
}

export async function cmdVersions(a, print, root) {
  const entries = loadKb(root).filter((e) => e.data.package);
  const pkgs = new Map([['three', null]]);
  for (const e of entries) pkgs.set(e.data.package, { checked: e.data.version_checked, slug: e.data.slug });
  const rows = await Promise.all([...pkgs].map(async ([pkg, info]) => {
    const now = await latest(pkg);
    return { pkg, latest: now, checked: info && info.checked, slug: info && info.slug, drift: info ? drift(info.checked, now) : 'n/a' };
  }));
  const stale = rows.filter((r) => r.drift === 'major' || r.drift === 'minor');
  print({ rows, stale: stale.length }, a.json, (r) => r.rows.map((x) => `${x.pkg.padEnd(30)} ${String(x.latest).padEnd(10)} kb ${String(x.checked || '-').padEnd(10)} ${x.drift === 'same' || x.drift === 'n/a' || x.drift === 'patch' ? '' : 'STALE ' + x.drift + (x.slug ? ' (kb/' + x.slug + ')' : '')}`).join('\n') + `\n${r.stale} stale entr${r.stale === 1 ? 'y' : 'ies'}${r.stale ? ': refresh them (threewright-curate)' : ''}`);
  if (a.check && stale.length) process.exitCode = 1;
}

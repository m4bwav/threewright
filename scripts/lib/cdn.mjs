// Serve CDN module URLs from a local node_modules folder (--cdn local).
// Pages written for a CDN import map (jsdelivr, unpkg) can then be checked offline,
// in CI, or behind a proxy that blocks the CDN, with the same bytes npm installed.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { contentType } from './serve.mjs';

// URL patterns handed to CDP Fetch.enable.
export const CDN_PATTERNS = ['*://cdn.jsdelivr.net/npm/*', '*://unpkg.com/*'];

// Split a CDN URL into package, version and file path; null when it is not one.
export function parseCdnUrl(url) {
  let m = String(url).match(/^https?:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/[^?#]*)?/);
  if (!m) return null;
  return { pkg: m[1], version: m[2] || null, path: (m[3] || '/').replace(/^\//, '') };
}

// node_modules folders to search, nearest first: TW_MODULES, then upward from start, then extra.
export function moduleDirs(start, extra = []) {
  const dirs = [];
  for (const d of String(process.env.TW_MODULES || '').split(/[;:](?![\\/])/).filter(Boolean)) dirs.push(resolve(d));
  let d = resolve(start);
  for (;;) {
    const nm = join(d, 'node_modules');
    if (existsSync(nm)) dirs.push(nm);
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  for (const e of extra) if (existsSync(e)) dirs.push(resolve(e));
  return [...new Set(dirs)];
}

// Find the local file for a parsed CDN URL. Returns { file, version, mismatch } or null.
export function resolveLocal(parsed, dirs) {
  for (const nm of dirs) {
    const root = join(nm, ...parsed.pkg.split('/'));
    const pj = join(root, 'package.json');
    if (!existsSync(pj)) continue;
    let pkgJson = {};
    try { pkgJson = JSON.parse(readFileSync(pj, 'utf8')); } catch { /* ignore */ }
    let rel = parsed.path;
    if (!rel) rel = pkgJson.module || pkgJson.main || 'index.js';
    const file = join(root, rel);
    if (!resolve(file).startsWith(resolve(root))) return null;
    if (!existsSync(file) || statSync(file).isDirectory()) continue;
    const mismatch = !!(parsed.version && /^\d/.test(parsed.version) && pkgJson.version && pkgJson.version !== parsed.version);
    return { file, version: pkgJson.version, mismatch };
  }
  return null;
}

// Wire Fetch interception into a CDP page. Returns a list the caller reports from.
export async function enableLocalCdn(page, dirs) {
  const report = { served: 0, missing: [], mismatched: new Set() };
  page.on('Fetch.requestPaused', async (p) => {
    const parsed = parseCdnUrl(p.request.url);
    const hit = parsed && resolveLocal(parsed, dirs);
    try {
      if (!hit) {
        report.missing.push(p.request.url);
        await page.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'FileNotFound' });
        return;
      }
      if (hit.mismatch) report.mismatched.add(`${parsed.pkg}@${parsed.version} served from local ${hit.version}`);
      report.served++;
      await page.send('Fetch.fulfillRequest', {
        requestId: p.requestId, responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: contentType(hit.file) }, { name: 'access-control-allow-origin', value: '*' }],
        body: readFileSync(hit.file).toString('base64'),
      });
    } catch { /* page closed */ }
  });
  await page.send('Fetch.enable', { patterns: CDN_PATTERNS.map((urlPattern) => ({ urlPattern, requestStage: 'Request' })) });
  return report;
}

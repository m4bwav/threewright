// Knowledge base tools: index, validate, search, show, list. Schema: kb/SCHEMA.md.
// The agent reads kb/INDEX.md (or `tw kb search`) first and opens single entries or
// single sections, never the whole folder.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export const KINDS = { topic: 'topics', scenario: 'scenarios', library: 'libraries', recipe: 'recipes', rule: 'rules' };
export const REQUIRED = ['name', 'slug', 'kind', 'summary', 'tags', 'applies_to', 'status', 'updated', 'sources'];
export const STATUS = ['current', 'legacy', 'experimental'];
export const APPLIES = /^(any|r\d{2,3}\+|r\d{2,3}-r\d{2,3})$/;

// Frontmatter: `key: value`, `key: [a, b]`, quoted strings, and `- item` lists.
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: null, body: text };
  const data = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { data[listKey].push(unquote(item[1])); continue; }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { data[k] = []; listKey = k; continue; }
    listKey = null;
    if (/^\[.*\]$/.test(v)) data[k] = splitList(v.slice(1, -1)).map(unquote).filter((x) => x !== '');
    else data[k] = unquote(v);
  }
  return { data, body: text.slice(m[0].length) };
}
function splitList(s) {
  const out = []; let cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; }
    else if (ch === '"' || ch === "'") { q = ch; cur += ch; }
    else if (ch === ',') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const unquote = (s) => String(s).trim().replace(/^(["'])(.*)\1$/, '$2');

// Split a markdown body into { heading: text } by `## ` headings.
export function sections(body) {
  const out = {}; let cur = '_intro';
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1]; out[cur] = ''; continue; }
    out[cur] = (out[cur] || '') + line + '\n';
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

export function loadKb(root) {
  const entries = [];
  for (const [kind, dir] of Object.entries(KINDS)) {
    const d = join(root, 'kb', dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((n) => n.endsWith('.md')).sort()) {
      const file = join(d, f);
      const text = readFileSync(file, 'utf8');
      const { data, body } = parseFrontmatter(text);
      entries.push({ file, folderKind: kind, fileSlug: basename(f, '.md'), data: data || {}, body, hasFrontmatter: !!data });
    }
  }
  return entries;
}

export function validate(entries, { strict = false } = {}) {
  const problems = [];
  const slugs = new Set(entries.map((e) => e.data.slug));
  const seen = new Set();
  for (const e of entries) {
    const d = e.data, where = `kb/${KINDS[e.folderKind]}/${e.fileSlug}.md`;
    if (!e.hasFrontmatter) { problems.push(`${where}: no frontmatter`); continue; }
    for (const k of REQUIRED) if (d[k] === undefined || d[k] === '') problems.push(`${where}: missing ${k}`);
    if (d.slug && d.slug !== e.fileSlug) problems.push(`${where}: slug "${d.slug}" does not match the file name`);
    if (d.slug && seen.has(d.slug)) problems.push(`${where}: duplicate slug ${d.slug}`);
    seen.add(d.slug);
    if (d.kind && d.kind !== e.folderKind) problems.push(`${where}: kind "${d.kind}" but the file is in ${KINDS[e.folderKind]}/`);
    if (d.status && !STATUS.includes(d.status)) problems.push(`${where}: status must be one of ${STATUS.join(', ')}`);
    if (d.applies_to && !APPLIES.test(d.applies_to)) problems.push(`${where}: applies_to "${d.applies_to}" must look like r160+, r125-r162 or any`);
    if (d.updated && !/^\d{4}-\d{2}-\d{2}$/.test(d.updated)) problems.push(`${where}: updated must be YYYY-MM-DD`);
    if (d.tags && !Array.isArray(d.tags)) problems.push(`${where}: tags must be a list`);
    if (d.sources && !Array.isArray(d.sources)) problems.push(`${where}: sources must be a list`);
    if (d.summary && d.summary.length > 200) problems.push(`${where}: summary over 200 characters (it goes in the index)`);
    for (const r of [].concat(d.related || [])) if (!slugs.has(r)) problems.push(`${where}: related "${r}" is not a slug in the knowledge base`);
    if (d.kind === 'library' && !d.package) problems.push(`${where}: libraries need package (npm name)`);
    if (strict) {
      if (!Array.isArray(d.sources) || !d.sources.length) problems.push(`${where}: strict: at least one source`);
      if (!/\S/.test(e.body)) problems.push(`${where}: strict: empty body`);
      if (/—/.test(e.body)) problems.push(`${where}: strict: em dash in body (house style)`);
      if (d.status === 'current' && d.applies_to && /^r\d+-r\d+$/.test(d.applies_to)) problems.push(`${where}: strict: a closed release range should be status legacy`);
    }
  }
  return problems;
}

export function buildIndex(entries, root) {
  const rows = entries.filter((e) => e.hasFrontmatter).map((e) => ({
    slug: e.data.slug, kind: e.data.kind, name: e.data.name, summary: e.data.summary, tags: e.data.tags || [],
    applies_to: e.data.applies_to, status: e.data.status, updated: e.data.updated,
    package: e.data.package, version_checked: e.data.version_checked, related: e.data.related || [],
    path: `kb/${KINDS[e.folderKind]}/${e.fileSlug}.md`, sections: Object.keys(sections(e.body)).filter((s) => s !== '_intro'),
  }));
  const L = ['# Knowledge base index', '', 'Generated by `tw kb index` from the frontmatter; do not edit by hand. Read this once per session, then `tw kb show <slug> --section <name>` for the part you need. Search: `tw kb search <words>`.', ''];
  for (const [kind, dir] of Object.entries(KINDS)) {
    const rs = rows.filter((r) => r.kind === kind);
    if (!rs.length) continue;
    L.push(`## ${dir[0].toUpperCase() + dir.slice(1)} (${rs.length})`, '', '| slug | summary | releases | status |', '|---|---|---|---|');
    for (const r of rs) L.push(`| [${r.slug}](${dir}/${r.slug}.md) | ${String(r.summary).replace(/\|/g, '/')}${r.package ? ` (\`${r.package}\` ${r.version_checked || ''})` : ''} | ${r.applies_to} | ${r.status} |`);
    L.push('');
  }
  writeFileSync(join(root, 'kb', 'INDEX.md'), L.join('\n'));
  writeFileSync(join(root, 'kb', 'index.json'), JSON.stringify({ generated: 'tw kb index', count: rows.length, entries: rows }, null, 1) + '\n');
  return rows.length;
}

const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);
const STOP = new Set(['the', 'and', 'for', 'with', 'how', 'to', 'in', 'of', 'a', 'an', 'is', 'it', 'on', 'my', 'do', 'what', 'can', 'use', 'using', 'three', 'three.js', 'threejs', 'js']);

export function search(entries, query, n = 8) {
  const q = words(query).filter((w) => !STOP.has(w));
  if (!q.length) return [];
  const scored = entries.filter((e) => e.hasFrontmatter).map((e) => {
    const d = e.data;
    const head = { slug: words(d.slug), name: words(d.name), tags: (d.tags || []).flatMap(words), summary: words(d.summary) };
    const body = words(e.body);
    let s = 0;
    for (const w of q) {
      const stem = w.replace(/(ing|es|s)$/, '');
      const hit = (arr) => arr.some((x) => x === w || (stem.length > 3 && x.startsWith(stem)));
      if (hit(head.slug)) s += 6;
      if (hit(head.tags)) s += 4;
      if (hit(head.name)) s += 3;
      if (hit(head.summary)) s += 2;
      s += Math.min(3, body.filter((x) => x === w).length * 0.5);
    }
    if (d.status === 'legacy') s *= 0.6;
    return { slug: d.slug, kind: d.kind, summary: d.summary, status: d.status, score: Math.round(s * 10) / 10 };
  });
  return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}

export async function cmdKb(a, print, root) {
  const sub = a._[1];
  const entries = loadKb(root);
  if (sub === 'index') {
    const problems = validate(entries);
    if (problems.length) { print({ problems }, a.json, (r) => r.problems.join('\n') + '\nfix these first (tw kb validate)'); process.exitCode = 1; return; }
    const n = buildIndex(entries, root);
    print({ entries: n }, a.json, (r) => `wrote kb/INDEX.md and kb/index.json (${r.entries} entries)`);
  } else if (sub === 'validate') {
    const problems = validate(entries, { strict: !!a.strict });
    print({ entries: entries.length, problems }, a.json, (r) => (r.problems.length ? r.problems.join('\n') + '\n' : '') + `${r.entries} entries, ${r.problems.length} problem(s)`);
    if (problems.length) process.exitCode = 1;
  } else if (sub === 'search') {
    const q = a._.slice(2).join(' ');
    const r = search(entries, q, Number(a.n || 8));
    print(r, a.json, (rs) => (rs.length ? rs.map((x) => `${x.slug.padEnd(28)} ${x.kind.padEnd(9)} ${x.summary}${x.status === 'legacy' ? ' [legacy]' : ''}`).join('\n') : `no entries for "${q}"; research it and add one (threewright-curate)`));
  } else if (sub === 'show') {
    const slug = a._[2];
    const e = entries.find((x) => x.data.slug === slug) || entries.find((x) => x.fileSlug === slug);
    if (!e) throw new Error(`no entry "${slug}"; try tw kb search`);
    const want = [].concat(a.section || [], a._.slice(3)).filter((x) => x !== true).map((s) => String(s).toLowerCase());
    if (!want.length) { print({ ...e.data, body: e.body }, a.json, () => readFileSync(e.file, 'utf8')); return; }
    const secs = sections(e.body);
    const picked = Object.entries(secs).filter(([h]) => want.some((w) => h.toLowerCase().startsWith(w) || h.toLowerCase().includes(w)));
    if (!picked.length) throw new Error(`no section matching ${want.join(', ')} in ${slug}; sections: ${Object.keys(secs).filter((s) => s !== '_intro').join(', ')}`);
    print(Object.fromEntries(picked), a.json, () => [`# ${e.data.name} (${e.data.applies_to}, ${e.data.status}, updated ${e.data.updated})`, ...picked.map(([h, t]) => `## ${h}\n${t}`)].join('\n\n'));
  } else if (sub === 'list') {
    const rs = entries.filter((e) => !a.kind || e.data.kind === a.kind).map((e) => ({ slug: e.data.slug, kind: e.data.kind, summary: e.data.summary }));
    print(rs, a.json, (x) => x.map((r) => `${String(r.slug).padEnd(28)} ${String(r.kind).padEnd(9)} ${r.summary}`).join('\n'));
  } else throw new Error('kb subcommands: search <words> | show <slug> [--section name] | list [--kind k] | index | validate [--strict]');
}

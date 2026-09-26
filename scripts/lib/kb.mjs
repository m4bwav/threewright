// Knowledge base tools: index (INDEX.md + index.json from frontmatter), validate,
// search, show (whole entry or chosen sections), list, note (dated line in ## Notes).
// Schema: kb/SCHEMA.md. Entries: kb/<kind folder>/<slug>.md.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { lintText, loadRules, RULES_FILE } from './lint.mjs';

export const KINDS = { topic: 'topics', scenario: 'scenarios', library: 'libraries', recipe: 'recipes', rule: 'rules' };
export const SECTIONS = {
  topic: ['Essentials', 'Pitfalls', 'Verify', 'Notes'],
  scenario: ['When', 'Stack', 'Build', 'Pitfalls', 'Verify', 'Notes'],
  library: ['Use it for', 'Avoid it when', 'Setup', 'Pitfalls', 'Notes'],
  recipe: ['Goal', 'Code', 'Verify', 'Notes'],
  rule: ['Rule', 'Why', 'Notes'],
};
const REQUIRED = ['title', 'slug', 'kind', 'summary', 'tags', 'applies_to', 'status', 'renderer', 'last_verified', 'sources'];
const STALE_DAYS = 120;

// Frontmatter: a small YAML subset (scalars, quoted strings, [inline, lists], block lists).
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: null, body: text };
  const data = {};
  let key = null;
  const scalar = (v) => {
    v = v.trim();
    if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"');
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    return v;
  };
  const splitList = (s) => {
    const out = []; let cur = '', q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === ',') { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out.map(scalar).filter((x) => x !== '');
  };
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#(?![^"']*["'][^"']*$).*$/, '');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) { if (!Array.isArray(data[key])) data[key] = []; data[key].push(scalar(item[1])); continue; }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const v = kv[2].trim();
    if (v === '') data[key] = [];
    else if (v.startsWith('[') && v.endsWith(']')) data[key] = splitList(v.slice(1, -1));
    else data[key] = scalar(v);
  }
  return { data, body: text.slice(m[0].length) };
}

// "## Heading" -> text until the next ## heading.
export function sections(body) {
  const out = {};
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1]; out[cur] = []; continue; }
    if (cur) out[cur].push(line);
  }
  for (const k of Object.keys(out)) out[k] = out[k].join('\n').trim();
  return out;
}

// Release ranges: any, >=r152, <=r151, <r152, r152-r186, r186.
export function parseRange(s) {
  if (!s) return null;
  s = String(s).trim();
  if (s === 'any') return { min: 0, max: Infinity };
  let m;
  if ((m = s.match(/^>=\s*r?(\d+)$/))) return { min: +m[1], max: Infinity };
  if ((m = s.match(/^<=\s*r?(\d+)$/))) return { min: 0, max: +m[1] };
  if ((m = s.match(/^<\s*r?(\d+)$/))) return { min: 0, max: +m[1] - 1 };
  if ((m = s.match(/^r?(\d+)\s*-\s*r?(\d+)$/))) return { min: +m[1], max: +m[2] };
  if ((m = s.match(/^r?(\d+)$/))) return { min: +m[1], max: +m[1] };
  return null;
}

export function readEntries(ROOT) {
  const kbDir = join(ROOT, 'kb');
  const entries = [];
  for (const [kind, folder] of Object.entries(KINDS)) {
    const dir = join(kbDir, folder);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
      const path = join(dir, f);
      const text = readFileSync(path, 'utf8');
      const { data, body } = parseFrontmatter(text);
      entries.push({ kind, folder, file: f, path, rel: `${folder}/${f}`, text, body, fm: data || {}, secs: sections(body), bytes: Buffer.byteLength(text) });
    }
  }
  return entries;
}

const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// First line (1-based) with an em dash outside code fences, or 0.
export function emDashLine(text) {
  let fence = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (!fence && lines[i].includes('—')) return i + 1;
  }
  return 0;
}

export function validate(ROOT, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const entries = readEntries(ROOT);
  const errors = [], warnings = [];
  const E = (e, msg) => errors.push(`${e.rel}: ${msg}`);
  const W = (e, msg) => warnings.push(`${e.rel}: ${msg}`);
  const slugs = new Map();
  const { latest, rules } = loadRules();
  const templates = existsSync(join(ROOT, 'templates')) ? readdirSync(join(ROOT, 'templates')) : [];
  for (const e of entries) {
    const f = e.fm;
    if (!Object.keys(f).length) { E(e, 'no frontmatter'); continue; }
    for (const k of REQUIRED) if (f[k] === undefined || (Array.isArray(f[k]) && !f[k].length && k !== 'sources')) E(e, `missing ${k}`);
    if (f.slug && f.slug + '.md' !== e.file) E(e, `slug ${f.slug} does not match the file name`);
    if (f.kind && f.kind !== e.kind) E(e, `kind ${f.kind} but the file is in ${e.folder}/`);
    if (f.status && !['current', 'legacy'].includes(f.status)) E(e, `status must be current or legacy, not ${f.status}`);
    if (f.renderer && !['webgl', 'webgpu', 'both', 'none'].includes(f.renderer)) E(e, `renderer must be webgl, webgpu, both or none`);
    if (f.applies_to && !parseRange(f.applies_to)) E(e, `applies_to "${f.applies_to}" is not a release range (any, >=r152, <r152, r152-r186)`);
    if (f.last_verified && !/^\d{4}-\d{2}-\d{2}$/.test(f.last_verified)) E(e, 'last_verified must be YYYY-MM-DD');
    else if (f.last_verified && (Date.parse(today) - Date.parse(f.last_verified)) / 864e5 > STALE_DAYS) W(e, `last verified ${f.last_verified}, over ${STALE_DAYS} days ago`);
    if (typeof f.summary === 'string' && f.summary.length > 200) W(e, `summary is ${f.summary.length} characters (keep it under 200; it is the index line)`);
    for (const s of arr(f.sources)) if (!/^https?:\/\//.test(s) && !/^(ai-docs|kb|templates|scripts)\//.test(s)) E(e, `source "${s}" is not a URL or a repository path`);
    if (!arr(f.sources).length && e.kind !== 'rule') E(e, 'needs at least one source');
    if (e.kind === 'library') { if (!f.package) E(e, 'library entries need package (the npm name)'); if (!f.version_checked) E(e, 'library entries need version_checked'); }
    if (f.template && !templates.includes(f.template)) E(e, `template ${f.template} is not in templates/`);
    if (f.status === 'legacy' && !f.superseded_by) W(e, 'legacy entries should name superseded_by');
    for (const s of SECTIONS[e.kind] || []) if (!(s in e.secs)) E(e, `missing section "## ${s}"`);
    // House style: no em dashes (AGENTS.md). Code fences are exempt.
    { const dash = emDashLine(e.text); if (dash) W(e, `line ${dash}: em dash; use a comma, colon, parentheses or a new sentence`); }
    if (f.slug) { if (slugs.has(f.slug)) E(e, `duplicate slug (also ${slugs.get(f.slug)})`); slugs.set(f.slug, e.rel); }
    // Relative links must resolve.
    const linkRe = /\]\((?!https?:|mailto:|#)([^)#\s]+)(?:#[^)]*)?\)/g;
    let m;
    while ((m = linkRe.exec(e.body))) if (!existsSync(resolve(dirname(e.path), m[1]))) E(e, `broken link ${m[1]}`);
    // Current entries must not teach stale APIs (fences marked legacy are skipped).
    if (f.status !== 'legacy') {
      const found = lintText(e.text, { rules, release: latest, ext: '.md' });
      for (const d of found) (d.severity === 'error' ? E : W)(e, `line ${d.line}: ${d.rule} (${d.message}); mark the fence \`\`\`js legacy if it is meant as an old example`);
    }
  }
  for (const e of entries) for (const r of arr(e.fm.related)) if (!slugs.has(r)) E(e, `related slug ${r} does not exist`);
  for (const e of entries) if (e.fm.superseded_by && !slugs.has(e.fm.superseded_by)) E(e, `superseded_by ${e.fm.superseded_by} does not exist`);
  // The lint rules file is part of the knowledge base.
  const ruleIds = new Set();
  for (const r of rules) {
    const where = `rules/lint-rules.json#${r.id}`;
    if (ruleIds.has(r.id)) errors.push(`${where}: duplicate id`);
    ruleIds.add(r.id);
    for (const k of ['id', 'pattern', 'status', 'message', 'fix', 'sample', 'source']) if (r[k] === undefined) errors.push(`${where}: missing ${k}`);
    if (!['removed', 'deprecated', 'pitfall'].includes(r.status)) errors.push(`${where}: status must be removed, deprecated or pitfall`);
    if (r.since > latest) errors.push(`${where}: since r${r.since} is newer than latest r${latest}`);
    if (r.sample && !lintText(r.sample, { rules: [r], release: 999 }).length) errors.push(`${where}: sample does not match`);
    if (r.ok && lintText(r.ok, { rules: [r], release: 999 }).length) errors.push(`${where}: ok text matches`);
    if (r.verify) warnings.push(`${where}: release numbers not yet verified from a primary source`);
  }
  return { entries: entries.length, rules: rules.length, errors, warnings };
}

export function buildIndex(ROOT) {
  const entries = readEntries(ROOT);
  const titleOf = (e) => e.fm.title || e.fm.slug || e.file;
  const json = entries.map((e) => ({ slug: e.fm.slug, kind: e.kind, path: e.rel, title: e.fm.title, summary: e.fm.summary, tags: arr(e.fm.tags), applies_to: e.fm.applies_to, status: e.fm.status, renderer: e.fm.renderer, last_verified: e.fm.last_verified, ...(e.fm.package ? { package: e.fm.package, version_checked: e.fm.version_checked } : {}), ...(e.fm.template ? { template: e.fm.template } : {}), sections: Object.keys(e.secs), bytes: e.bytes }));
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  const L = ['# Knowledge base index', '',
    `Generated by \`node scripts/tw.mjs kb index\`; do not edit by hand (edit the entries' frontmatter). ${entries.length} entries, ${Math.round(total / 1024)} KB in all; this index is the part to read first. Search with \`tw kb search <words>\`, read one entry or a few of its sections with \`tw kb show <slug> --section <name>\`. Format: [SCHEMA.md](SCHEMA.md). Stale-API lint rules: [rules/lint-rules.json](rules/lint-rules.json). Plugin overview: [README](../README.md).`, ''];
  const heads = { topic: 'Topics', scenario: 'Scenarios', library: 'Libraries', recipe: 'Recipes', rule: 'Rules' };
  for (const kind of Object.keys(KINDS)) {
    const list = entries.filter((e) => e.kind === kind && e.fm.status !== 'legacy');
    if (!list.length) continue;
    L.push(`## ${heads[kind]}`, '');
    for (const e of list) {
      const meta = [e.fm.applies_to && e.fm.applies_to !== 'any' ? e.fm.applies_to : null, e.fm.renderer && !['both', 'none'].includes(e.fm.renderer) ? e.fm.renderer : null, e.fm.package ? `${e.fm.package} ${e.fm.version_checked}` : null].filter(Boolean).join(', ');
      L.push(`- [${titleOf(e)}](${e.rel}): ${e.fm.summary || ''}${meta ? ` (${meta})` : ''}`);
    }
    L.push('');
  }
  const legacy = entries.filter((e) => e.fm.status === 'legacy');
  if (legacy.length) {
    L.push('## Legacy (older releases only)', '');
    for (const e of legacy) L.push(`- [${titleOf(e)}](${e.rel}): ${e.fm.summary || ''} (${e.fm.applies_to}${e.fm.superseded_by ? `; now: ${e.fm.superseded_by}` : ''})`);
    L.push('');
  }
  writeFileSync(join(ROOT, 'kb/INDEX.md'), L.join('\n'));
  writeFileSync(join(ROOT, 'kb/index.json'), JSON.stringify({ generated_by: 'tw kb index', entries: json }, null, 1) + '\n');
  return { entries: entries.length, indexBytes: Buffer.byteLength(L.join('\n')), totalBytes: total };
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'how', 'do', 'i', 'my', 'what', 'when', 'use', 'using', 'make', 'three', 'threejs', 'js']);
export const tokens = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t)).map((t) => t.replace(/(?<=[a-z]{3})s$/, ''));

// BM25 over weighted fields: title x3, tags x3, summary x2, headings x2, body x1.
export function search(ROOT, query, n = 8) {
  const entries = readEntries(ROOT);
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const docs = entries.map((e) => {
    const tf = new Map();
    const add = (text, w) => { for (const t of tokens(text)) tf.set(t, (tf.get(t) || 0) + w); };
    add(e.fm.title, 3); add(arr(e.fm.tags).join(' '), 3); add(e.fm.summary, 2); add(Object.keys(e.secs).join(' '), 2); add(e.fm.slug, 3); add(e.fm.package, 3); add(e.body, 1);
    const len = [...tf.values()].reduce((a, b) => a + b, 0);
    return { e, tf, len };
  });
  const avg = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  const df = new Map(q.map((t) => [t, docs.filter((d) => d.tf.has(t)).length]));
  const k1 = 1.2, b = 0.75, N = docs.length;
  const scored = docs.map((d) => {
    let s = 0;
    for (const t of q) {
      const f = d.tf.get(t) || 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avg));
    }
    if (d.e.fm.status === 'legacy') s *= 0.6;
    return { slug: d.e.fm.slug, kind: d.e.kind, status: d.e.fm.status, summary: d.e.fm.summary, path: d.e.rel, score: Math.round(s * 100) / 100 };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}

export function show(ROOT, slug, wanted = []) {
  const e = readEntries(ROOT).find((x) => x.fm.slug === slug || x.file === slug + '.md');
  if (!e) return null;
  if (!wanted.length) return e.text;
  const keys = Object.keys(e.secs);
  const out = [`# ${e.fm.title} (${e.rel}; ${e.fm.status}, ${e.fm.applies_to})`];
  for (const w of wanted) {
    const k = keys.find((x) => x.toLowerCase().startsWith(w.toLowerCase()));
    out.push(k ? `\n## ${k}\n${e.secs[k]}` : `\n## ${w}\n(no such section; sections: ${keys.join(', ')})`);
  }
  return out.join('\n');
}

export function addNote(ROOT, slug, text, today = new Date().toISOString().slice(0, 10)) {
  const e = readEntries(ROOT).find((x) => x.fm.slug === slug);
  if (!e) throw new Error(`no entry ${slug}`);
  let t = e.text;
  const line = `- ${today}: ${text.trim()}`;
  if (/^## Notes\s*$/m.test(t)) {
    const i = t.search(/^## Notes\s*$/m);
    const next = t.slice(i + 1).search(/^## /m);
    const end = next < 0 ? t.length : i + 1 + next;
    const head = t.slice(0, end).replace(/\s*$/, '');
    t = head + '\n' + line + '\n' + (next < 0 ? '' : '\n' + t.slice(end));
  } else t = t.replace(/\s*$/, '') + '\n\n## Notes\n\n' + line + '\n';
  writeFileSync(e.path, t);
  return { file: e.rel, line };
}

export function cmdKb(a, print, ROOT) {
  const sub = a._[1];
  if (sub === 'index') {
    const r = buildIndex(ROOT);
    print(r, a.json, (x) => `wrote kb/INDEX.md (${Math.round(x.indexBytes / 1024)} KB) and kb/index.json for ${x.entries} entries (${Math.round(x.totalBytes / 1024)} KB of entries)`);
  } else if (sub === 'validate') {
    const r = validate(ROOT);
    print(r, a.json, (x) => [`${x.entries} entries, ${x.rules} lint rules: ${x.errors.length} error(s), ${x.warnings.length} warning(s)`, ...x.errors.map((s) => 'ERROR ' + s), ...x.warnings.map((s) => 'warn  ' + s)].join('\n'));
    if (r.errors.length || (a.strict && r.warnings.length)) process.exitCode = 1;
  } else if (sub === 'search') {
    const r = search(ROOT, a._.slice(2).join(' '), Number(a.n || 8));
    print(r, a.json, (x) => (x.length ? x.map((h) => `${h.slug}  (${h.kind}${h.status === 'legacy' ? ', legacy' : ''})  ${h.summary}`).join('\n') : 'no match; try other words, or tw kb list'));
  } else if (sub === 'show') {
    const slug = a._[2];
    if (!slug) throw new Error('kb show <slug> [--section name ...]');
    const wanted = [].concat(a.section || []).filter((s) => s !== true);
    const r = show(ROOT, slug, wanted);
    if (r === null) throw new Error(`no entry "${slug}"; tw kb search <words> finds the slug`);
    print(a.json ? { slug, text: r } : r, a.json);
  } else if (sub === 'list') {
    const kind = a.kind;
    const es = readEntries(ROOT).filter((e) => !kind || e.kind === kind);
    print(es.map((e) => ({ slug: e.fm.slug, kind: e.kind, status: e.fm.status, summary: e.fm.summary })), a.json, (x) => x.map((e) => `${e.slug}  (${e.kind}${e.status === 'legacy' ? ', legacy' : ''})  ${e.summary}`).join('\n'));
  } else if (sub === 'note') {
    const slug = a._[2], text = a._.slice(3).join(' ');
    if (!slug || !text) throw new Error('kb note <slug> "<text>"');
    const r = addNote(ROOT, slug, text);
    print(r, a.json, (x) => `added to ${x.file}: ${x.line}`);
  } else {
    throw new Error('kb index | validate [--strict] | search <words> | show <slug> [--section s] | list [--kind k] | note <slug> "<text>"');
  }
}

export { RULES_FILE };

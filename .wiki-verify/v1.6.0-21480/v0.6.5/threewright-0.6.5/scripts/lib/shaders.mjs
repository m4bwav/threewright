// tw shaders: format the WebGL program list from window.__tw.shaders() and point at
// the failing line of a shader that did not compile.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The source lines around each "ERROR: 0:<line>:" in a GLSL info log.
export function errorContext(source, log, around = 3) {
  const lines = String(source || '').split('\n');
  const byLine = new Map();
  for (const m of String(log || '').matchAll(/ERROR: \d+:(\d+):\s*(.*)/g)) {
    const n = Number(m[1]);
    byLine.set(n, [...(byLine.get(n) || []), m[2].trim()]);
  }
  const out = [];
  for (const [n, msgs] of byLine) {
    out.push(`line ${n}: ${msgs.join('; ')}`);
    for (let i = Math.max(1, n - around); i <= Math.min(lines.length, n + around); i++) {
      out.push(`${i === n ? '>' : ' '} ${String(i).padStart(4)} | ${lines[i - 1]}`);
    }
  }
  return out;
}

export const failed = (p) => !p.linked || /ERROR/.test(p.vertex.log + p.fragment.log);

export function formatShaders(r) {
  if (r.error) return r.error;
  if (r.backend === 'webgpu') return r.note;
  const L = [`programs ${r.programs.length} (WebGL)${r.programs.some(failed) ? ` · ${r.programs.filter(failed).length} FAILED` : ''}`];
  for (const p of r.programs) {
    const lines = (s) => (s ? s.split('\n').length : 0);
    L.push(`  #${p.id} ${p.type}${p.name ? ` "${p.name}"` : ''} · ${failed(p) ? 'FAILED' : 'linked'} · used by ${p.materials.length ? p.materials.join(', ') : 'no material in the scene'} · vertex ${lines(p.vertex.source)} lines, fragment ${lines(p.fragment.source)} lines`);
  }
  for (const p of r.programs.filter(failed)) {
    L.push(`FAILED #${p.id} ${p.type}${p.name ? ` "${p.name}"` : ''}:`);
    if (p.programLog) L.push('  program: ' + p.programLog.split('\n')[0]);
    for (const [kind, s] of [['vertex', p.vertex], ['fragment', p.fragment]]) {
      const ctx = errorContext(s.source, s.log);
      if (ctx.length) { L.push(`  ${kind}:`); for (const l of ctx) L.push('    ' + l); } else if (s.log) L.push(`  ${kind}: ${s.log.split('\n')[0]}`);
    }
  }
  if (r.dumped) L.push(`wrote ${r.dumped.length} files to ${r.dumpDir}`);
  return L.join('\n');
}

// --dump dir: one .vert and one .frag per program, named by id and type.
export function dumpShaders(r, dir) {
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (const p of r.programs || []) {
    const base = `${p.id}-${(p.name || p.type).replace(/[^\w.-]+/g, '_')}`;
    for (const [ext, s] of [['vert', p.vertex], ['frag', p.fragment]]) {
      if (!s.source) continue;
      const f = join(dir, `${base}.${ext}`);
      writeFileSync(f, s.source);
      files.push(f);
    }
  }
  return files;
}

// Saved runs and frame statistics: `check --save run.json` / `--against run.json`
// print what changed between two runs as text, and `perf` summarises frame times.
// Pure functions, so they are unit tested without a browser.

const GRID = { cols: 48, rows: 27 };

// Mean luma (0-255) of each cell of a cols x rows grid over an RGBA image.
export function lumaGrid({ width, height, data }, { cols = GRID.cols, rows = GRID.rows } = {}) {
  const sum = new Float64Array(cols * rows), n = new Uint32Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const cy = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x++) {
      const cx = Math.min(cols - 1, Math.floor((x * cols) / width));
      const i = (y * width + x) * 4, c = cy * cols + cx;
      sum[c] += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      n[c]++;
    }
  }
  return { cols, rows, data: Array.from(sum, (s, c) => (n[c] ? Math.round(s / n[c]) : 0)) };
}

// The parts of a check result worth comparing later.
export function snapshotRun(r, grid, date = new Date().toISOString()) {
  const ri = (r.summary.renderers || []).find(Boolean) || {};
  const s = r.summary.scene || {};
  return {
    tw: 1, date, url: r.url,
    renderer: { type: ri.type, backend: ri.backend, drawCalls: ri.drawCalls, triangles: ri.triangles, geometries: ri.geometries, textures: ri.textures, programs: ri.programs },
    scene: { meshes: s.meshes, lights: s.lights, verts: s.verts, tris: s.tris, instances: s.instances, materials: s.materials, textures: s.textures, types: s.types || {} },
    problems: [...r.logs.exceptions, ...r.logs.errors, ...r.logs.network, ...r.logs.warnings, ...(r.summary.errors || []), ...(r.summary.warn || [])].map((x) => String(x).split('\n')[0].slice(0, 200)),
    pixels: r.pixels ? { coverage: r.pixels.coverage, meanLuma: r.pixels.meanLuma, bbox: r.pixels.bbox, grid } : null,
  };
}

// Lines describing how `after` differs from `before`; empty when nothing moved.
export function compareRuns(before, after, { lumaTolerance = 12 } = {}) {
  const L = [];
  const num = (group, key, label = key) => {
    const a = before[group] && before[group][key], b = after[group] && after[group][key];
    if (a === undefined && b === undefined) return;
    if (a !== b) L.push(`${label} ${a ?? '?'} -> ${b ?? '?'}${typeof a === 'number' && typeof b === 'number' ? ` (${b > a ? '+' : ''}${b - a})` : ''}`);
  };
  num('renderer', 'backend');
  for (const k of ['drawCalls', 'triangles', 'geometries', 'textures', 'programs']) num('renderer', k, k === 'drawCalls' ? 'draw calls' : k);
  for (const k of ['meshes', 'lights', 'instances', 'materials']) num('scene', k, 'scene ' + k);
  const ta = before.scene.types || {}, tb = after.scene.types || {};
  for (const t of new Set([...Object.keys(ta), ...Object.keys(tb)])) if ((ta[t] || 0) !== (tb[t] || 0)) L.push(`${t} ${ta[t] || 0} -> ${tb[t] || 0}`);
  const pa = new Set(before.problems), pb = new Set(after.problems);
  for (const p of pb) if (!pa.has(p)) L.push('NEW ' + p);
  for (const p of pa) if (!pb.has(p)) L.push('gone ' + p);
  const ga = before.pixels && before.pixels.grid, gb = after.pixels && after.pixels.grid;
  if (ga && gb && ga.cols === gb.cols && ga.rows === gb.rows) {
    let changed = 0, x0 = ga.cols, y0 = ga.rows, x1 = -1, y1 = -1;
    for (let c = 0; c < ga.data.length; c++) {
      if (Math.abs(ga.data[c] - gb.data[c]) <= lumaTolerance) continue;
      changed++;
      const x = c % ga.cols, y = Math.floor(c / ga.cols);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (changed) {
      const f = (v, n) => Math.round((v / n) * 100) / 100;
      L.push(`pixels: ${Math.round((changed / ga.data.length) * 1000) / 10}% of the frame changed · region x ${f(x0, ga.cols)}-${f(x1 + 1, ga.cols)} y ${f(y0, ga.rows)}-${f(y1 + 1, ga.rows)} · mean luma ${Math.round(before.pixels.meanLuma * 100) / 100} -> ${Math.round(after.pixels.meanLuma * 100) / 100}`);
    }
  }
  return L;
}

// Frame-time summary from a list of frame durations in ms.
export function frameStats(ms) {
  const s = [...ms].sort((a, b) => a - b);
  const pick = (p) => (s.length ? s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] : 0);
  const total = ms.reduce((a, b) => a + b, 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    frames: ms.length,
    fps: total ? r1((ms.length * 1000) / total) : 0,
    p50: r1(pick(50)), p95: r1(pick(95)), p99: r1(pick(99)), max: r1(s[s.length - 1] || 0),
    over33: ms.filter((v) => v > 33.4).length,
  };
}

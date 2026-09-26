// Tiny argv parser: positionals, --flag, --key value, --key=value, repeated keys become arrays.
export function parseArgs(argv, { booleans = [] } = {}) {
  const out = { _: [] };
  const bools = new Set(booleans);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { out._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      let key = a.slice(2), val;
      const eq = key.indexOf('=');
      if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
      else if (bools.has(key) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) val = true;
      else val = argv[++i];
      key = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (key in out) out[key] = [].concat(out[key], val);
      else out[key] = val;
    } else out._.push(a);
  }
  return out;
}

export function list(v) {
  if (v === undefined || v === true) return [];
  return [].concat(v).flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);
}

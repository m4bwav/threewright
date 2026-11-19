// Spawning npm and other .cmd shims portably. On Windows a .cmd needs a shell, and
// Node 24 deprecates passing an args array with shell: true (DEP0190), so the
// command goes over as one string with each argument quoted.

const SAFE = /^[\w@%+=:,./-]+$/;
export const quoteWin = (a) => (SAFE.test(a) ? a : '"' + String(a).replace(/"/g, '""') + '"');

// Returns [file, args, options] for spawn or spawnSync.
export function cmdSpec(cmd, args = [], opts = {}, platform = process.platform) {
  if (platform !== 'win32') return [cmd, args, opts];
  return [[cmd + '.cmd', ...args.map(quoteWin)].join(' '), [], { ...opts, shell: true }];
}

// A test bot for tw play: walk right until x passes 200, then report done.
// Fails if Space never registers a jump (a broken input path).
export function init(ctx) { ctx.jumped = false; }

export function decide(state, ctx) {
  if (!ctx.jumped) { ctx.jumped = true; return 'key Space 30'; }
  if (state.jumps < 1) return 'fail Space did not register';
  if (state.x > 200) return 'done reached x ' + state.x;
  if (ctx.t > 8) return 'fail never reached x 200';
  return 'key KeyD 200';
}

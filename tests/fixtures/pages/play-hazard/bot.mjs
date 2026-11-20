// Jumps when a hazard is 90 px (0.3 s) away; reports the run lost when the game says dead.
export function decide(s) {
  if (s.dead) return 'fail hit a hazard';
  if (!s.air && s.hx > s.px && s.hx - s.px < 90) return 'key Space 30';
  return null;
}

// Fixed timestep with an accumulator ("Fix Your Timestep!", Glenn Fiedler).
// Real frame time is banked; the simulation spends it in whole ticks of STEP,
// so movement is the same at 30, 60 or 144 fps. What is left over (alpha) lets
// the view interpolate between the last two ticks. No DOM here: Node tests use it.

import { STEP } from './sim/game.ts';

export { STEP };
export const MAX_STEPS = 4; // at most 4 ticks per frame: a slow frame drops time instead of spiralling
export const MAX_FRAME = 0.25; // seconds; longer frames (a debugger pause, a hidden tab) are clamped

export class FixedStep {
  private acc = 0;

  // Bank dt seconds of frame time; returns how many ticks to run now.
  advance(dt: number): number {
    this.acc += Math.min(Math.max(dt, 0), MAX_FRAME);
    let n = 0;
    while (this.acc >= STEP && n < MAX_STEPS) {
      this.acc -= STEP;
      n++;
    }
    if (n === MAX_STEPS && this.acc >= STEP) this.acc = 0; // still behind: drop the rest
    return n;
  }

  // How far the render time is between the previous tick (0) and the current one (1).
  get alpha(): number {
    return Math.min(this.acc / STEP, 1);
  }

  reset(): void {
    this.acc = 0;
  }
}

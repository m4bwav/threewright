// Input: devices in, one ActionFrame per tick out. Keyboard uses KeyboardEvent.code
// (the physical key, so WASD stays WASD on an AZERTY layout), held keys are cleared
// on blur so nothing sticks, and gamepads are polled because the Gamepad API has
// no button events. Tests and replays inject frames here, below the devices.

import type { ActionFrame } from '../sim/game.ts';

export type Action = 'left' | 'right' | 'forward' | 'back' | 'jump';

// Default bindings. A settings screen can rebind by editing this map.
export const bindings: Record<Action, string[]> = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
};

const GAME_KEYS = new Set(Object.values(bindings).flat());
const DEAD_ZONE = 0.15; // radial, on the left stick

export class Input {
  private readonly held = new Set<string>();
  private readonly holds = new Map<Action, number>(); // action -> ticks left
  private override: ActionFrame | null = null;

  // Listen on window for keys; returns a function that removes the listeners.
  attach(target: Window = window): () => void {
    const down = (e: KeyboardEvent) => {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault(); // arrows and space would scroll the page (or the page around an iframe)
      this.held.add(e.code);
    };
    const up = (e: KeyboardEvent) => { this.held.delete(e.code); };
    const blur = () => { this.held.clear(); };
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    target.addEventListener('blur', blur);
    return () => {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    };
  }

  // Test hooks: a fixed frame used instead of the devices until clear().
  set(frame: Partial<ActionFrame>): void {
    this.override = { moveX: frame.moveX ?? 0, moveY: frame.moveY ?? 0, jump: frame.jump ?? false };
  }

  // Test hooks: press an action for the next n ticks, on top of any other input.
  hold(action: Action, ticks: number): void {
    this.holds.set(action, Math.max(0, Math.floor(ticks)));
  }

  clear(): void {
    this.override = null;
    this.holds.clear();
    this.held.clear();
  }

  // Called once per tick, never per frame.
  sample(): ActionFrame {
    let moveX = 0, moveY = 0, jump = false;
    if (this.override) {
      ({ moveX, moveY, jump } = this.override);
    } else {
      const on = (a: Action) => bindings[a].some((code) => this.held.has(code));
      moveX = (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
      moveY = (on('forward') ? 1 : 0) - (on('back') ? 1 : 0);
      jump = on('jump');
      const pad = firstGamepad();
      if (pad) {
        const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
        const m = Math.hypot(x, y);
        if (m > DEAD_ZONE) {
          const k = Math.min(1, (m - DEAD_ZONE) / (1 - DEAD_ZONE)) / m; // rescale so the stick still reaches 1
          moveX += x * k;
          moveY -= y * k; // stick up is negative
        }
        jump ||= !!pad.buttons[0]?.pressed; // A / Cross in the standard mapping
      }
    }
    for (const [action, left] of this.holds) {
      if (left <= 0) { this.holds.delete(action); continue; }
      if (action === 'left') moveX -= 1;
      else if (action === 'right') moveX += 1;
      else if (action === 'forward') moveY += 1;
      else if (action === 'back') moveY -= 1;
      else jump = true;
      this.holds.set(action, left - 1);
    }
    return { moveX: Math.max(-1, Math.min(1, moveX)), moveY: Math.max(-1, Math.min(1, moveY)), jump };
  }

  // Start (button 9) on a standard gamepad; the caller turns it into pause.
  startPressed(): boolean {
    return !!firstGamepad()?.buttons[9]?.pressed;
  }
}

function firstGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  for (const p of navigator.getGamepads()) if (p && p.connected && p.mapping === 'standard') return p;
  return null;
}

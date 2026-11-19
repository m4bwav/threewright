// Input bursts for check, shot, sheet and video: --actions "key KeyW 500; click 480,270; wait 200".
// Sent through CDP Input events, so the page sees trusted keyboard, mouse, pointer and wheel events.
//
//   key <code|char> [holdMs]      press and release (KeyW, w, ArrowLeft, Space, Enter, Escape, Digit1)
//   type <text>                   type characters into the focused element
//   click <x>,<y> [right|middle]  click at canvas-page pixels (CSS px of the viewport)
//   move <x>,<y>                  move the mouse (hover)
//   drag <x>,<y> <x2>,<y2> [steps]  press, move in steps (default 10), release
//   wheel <x>,<y> <dy> [dx]       scroll wheel at a point (positive dy scrolls down or zooms out)
//   wait <ms>                     let the page run

const NAMED = {
  Space: [' ', 32], Enter: ['Enter', 13], Escape: ['Escape', 27], Tab: ['Tab', 9], Backspace: ['Backspace', 8],
  ArrowLeft: ['ArrowLeft', 37], ArrowUp: ['ArrowUp', 38], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40],
  ShiftLeft: ['Shift', 16], ControlLeft: ['Control', 17], AltLeft: ['Alt', 18], Home: ['Home', 36], End: ['End', 35],
  PageUp: ['PageUp', 33], PageDown: ['PageDown', 34], Minus: ['-', 189], Equal: ['=', 187],
};

// Key code or single character to the fields Input.dispatchKeyEvent needs.
export function keyInfo(k) {
  if (NAMED[k]) { const [key, vk] = NAMED[k]; return { key, code: k, windowsVirtualKeyCode: vk, text: key.length === 1 ? key : undefined }; }
  let m = k.match(/^Key([A-Z])$/);
  if (m) return { key: m[1].toLowerCase(), code: k, windowsVirtualKeyCode: m[1].charCodeAt(0), text: m[1].toLowerCase() };
  m = k.match(/^Digit(\d)$/);
  if (m) return { key: m[1], code: k, windowsVirtualKeyCode: m[1].charCodeAt(0), text: m[1] };
  if (/^[a-z]$/i.test(k)) return keyInfo('Key' + k.toUpperCase());
  if (/^\d$/.test(k)) return keyInfo('Digit' + k);
  if (k === ' ') return keyInfo('Space');
  throw new Error(`unknown key "${k}": use a code such as KeyW, Digit1, ArrowLeft, Space, Enter, Escape`);
}

const point = (s, what) => {
  const m = String(s || '').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!m) throw new Error(`${what} needs a point x,y (got "${s || ''}")`);
  return [Number(m[1]), Number(m[2])];
};
const num = (s, what, dflt) => {
  if (s === undefined) { if (dflt !== undefined) return dflt; throw new Error(`${what} needs a number`); }
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${what}: "${s}" is not a number`);
  return n;
};

export function parseActions(src) {
  const out = [];
  for (const part of String(src || '').split(';').map((s) => s.trim()).filter(Boolean)) {
    const [op, ...rest] = part.split(/\s+/);
    switch (op) {
      case 'key': keyInfo(rest[0] || ''); out.push({ op, key: rest[0], hold: num(rest[1], 'key hold', 50) }); break;
      case 'type': out.push({ op, text: part.slice(4).trimStart() }); break;
      case 'click': out.push({ op, at: point(rest[0], 'click'), button: rest[1] || 'left' }); break;
      case 'move': out.push({ op, at: point(rest[0], 'move') }); break;
      case 'drag': out.push({ op, from: point(rest[0], 'drag'), to: point(rest[1], 'drag'), steps: num(rest[2], 'drag steps', 10) }); break;
      case 'wheel': out.push({ op, at: point(rest[0], 'wheel'), dy: num(rest[1], 'wheel dy'), dx: num(rest[2], 'wheel dx', 0) }); break;
      case 'wait': out.push({ op, ms: num(rest[0], 'wait') }); break;
      default: throw new Error(`unknown action "${op}": use key, type, click, move, drag, wheel or wait`);
    }
  }
  return out;
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// virtual: the page runs on tw's virtual clock (tw video), so waits advance it instead of real time.
export async function runActions(page, actions, { virtual = false } = {}) {
  const sleep = virtual ? (ms) => page.eval(`window.__tw.advance(${Number(ms)}), true`) : realSleep;
  const mouse = (type, [x, y], extra = {}) => page.send('Input.dispatchMouseEvent', { type, x, y, ...extra });
  for (const a of actions) {
    if (a.op === 'key') {
      const k = keyInfo(a.key);
      await page.send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', ...k });
      if (a.hold) await sleep(a.hold);
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
    } else if (a.op === 'type') {
      await page.send('Input.insertText', { text: a.text });
    } else if (a.op === 'click') {
      await mouse('mouseMoved', a.at);
      await mouse('mousePressed', a.at, { button: a.button, buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', a.at, { button: a.button, buttons: 0, clickCount: 1 });
    } else if (a.op === 'move') {
      await mouse('mouseMoved', a.at);
    } else if (a.op === 'drag') {
      await mouse('mouseMoved', a.from);
      await mouse('mousePressed', a.from, { button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= a.steps; i++) {
        const t = i / a.steps;
        await mouse('mouseMoved', [a.from[0] + (a.to[0] - a.from[0]) * t, a.from[1] + (a.to[1] - a.from[1]) * t], { button: 'left', buttons: 1 });
        await sleep(16);
      }
      await mouse('mouseReleased', a.to, { button: 'left', buttons: 0, clickCount: 1 });
    } else if (a.op === 'wheel') {
      await mouse('mouseWheel', a.at, { deltaX: a.dx, deltaY: a.dy });
    } else if (a.op === 'wait') {
      await sleep(a.ms);
    }
  }
}

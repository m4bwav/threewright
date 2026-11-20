// tw play: drive a game page in a closed loop and report how the run ended.
//
// Each tick: read the game state, ask a policy for an action, send it as trusted input.
// The policy is a bot module (--bot bot.mjs exporting decide(state, ctx)) or a seeded
// random "monkey" (--monkey). Every decision goes to trace.jsonl; result.json holds the
// status: done (bot said so), fail (bot said so), timeout (ran the full time, fine),
// crash (uncaught exception or the tab died) or stuck (state, or the frame when the page
// has no state hook, unchanged for --stuck seconds; or no animation frame for 2 s; or the
// main thread stopped answering). A screenshot is taken at the failure tick.
//
// The loop shape (snapshot, decide, act, log every decision, one status file) follows the
// bot runner described in arXiv:2610.33106 (VibeGame). Written fresh from our notes;
// the stuck detector, the exception hook and the monkey policy are additions of ours.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseActions, runActions } from './actions.mjs';
import { digestLogs, evalWithTarget, openPage, screenshot } from './page.mjs';

export const DEFAULT_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];

// mulberry32: small, fast, and the same sequence for the same seed on every platform.
export function makeRng(seed) {
  let s = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One monkey action in the --actions grammar. Uses only the rng, never the state,
// so the same seed gives the same action column.
export function monkeyAction(rng, { keys = DEFAULT_KEYS, width = 960, height = 540 } = {}) {
  const r = rng();
  const pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  const at = () => `${Math.floor(rng() * width)},${Math.floor(rng() * height)}`;
  if (r < 0.6) return `key ${pick(keys)} ${30 + Math.floor(rng() * 8) * 30}`; // tap or hold up to 240 ms
  if (r < 0.75) return `click ${at()}`;
  if (r < 0.85) return `move ${at()}`;
  if (r < 0.9) return `drag ${at()} ${at()} 4`;
  return 'wait 0';
}

// A bot's answer: an action string, done/fail with an optional reason, or nothing (idle tick).
export function parseDecision(v) {
  if (v === undefined || v === null || v === '' || v === false) return { kind: 'idle', action: '' };
  const s = String(v).trim();
  const m = s.match(/^(done|fail)\b\s*(.*)$/);
  if (m) return { kind: m[1], reason: m[2] || (m[1] === 'done' ? 'bot finished' : 'bot reported failure') };
  return { kind: 'act', action: s, actions: parseActions(s) };
}

// Watches state keys and the frame counter; returns a reason once the run is stuck.
export function stuckWatch({ stuckMs = 5000, stallMs = 2000 } = {}) {
  let lastKey, keyAt = 0, lastFrames, framesAt = 0;
  return (tMs, key, frames) => {
    if (key !== lastKey) { lastKey = key; keyAt = tMs; }
    if (frames !== lastFrames) { lastFrames = frames; framesAt = tMs; }
    if (stallMs > 0 && frames != null && tMs - framesAt >= stallMs) return `no animation frame for ${((tMs - framesAt) / 1000).toFixed(1)} s`;
    if (stuckMs > 0 && tMs - keyAt >= stuckMs) return `state unchanged for ${((tMs - keyAt) / 1000).toFixed(1)} s`;
    return null;
  };
}

const hash = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);

// Reads state in the page. Order: --state "<js>", __game.snapshot(), __game.state(), render_game_to_text().
function stateReader(expr) {
  const custom = expr ? `(() => ${evalWithTarget(String(expr))})` : 'null';
  return `(() => {
    const P = window.__twPlay;
    let s = null, src = null;
    try {
      const custom = ${custom};
      const g = window.__game;
      if (custom) { s = custom(); src = 'state'; }
      else if (g && typeof g.snapshot === 'function') { s = g.snapshot(); src = '__game.snapshot()'; }
      else if (g && typeof g.state === 'function') { s = g.state(); src = '__game.state()'; }
      else if (typeof window.render_game_to_text === 'function') { s = window.render_game_to_text(); src = 'render_game_to_text()'; }
    } catch (e) { return { error: String(e && e.message || e), frames: P ? P.frames : null }; }
    let text = null;
    if (src) { try { text = typeof s === 'string' ? s : JSON.stringify(s); } catch (e) { text = String(s); } }
    return { src, text, frames: P ? P.frames : null };
  })()`;
}

const FRAME_COUNTER = `(() => { if (window.__twPlay) return true; window.__twPlay = { frames: 0 };
  const f = () => { window.__twPlay.frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`;

async function frameKey(ctx) {
  const { data } = await ctx.page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: ctx.width, height: ctx.height, scale: Math.min(1, 96 / ctx.width) }, captureBeyondViewport: false });
  return 'frame:' + hash(data);
}

export async function runPlay(target, opts) {
  const seconds = Number(opts.seconds ?? 60), seed = Number(opts.seed ?? 1);
  const stuckS = Number(opts.stuck ?? 5), tickMs = Number(opts.tick ?? 100);
  const maxTicks = opts.ticks ? Number(opts.ticks) : Infinity;
  const keys = opts.keys && opts.keys.length ? opts.keys : DEFAULT_KEYS;
  const out = resolve(opts.out || join('tw-play', `seed-${seed}`));
  mkdirSync(out, { recursive: true });
  const rng = makeRng(seed);

  let bot = null;
  if (opts.bot) {
    bot = await import(pathToFileURL(resolve(String(opts.bot))).href);
    if (typeof bot.decide !== 'function') throw new Error(`--bot ${opts.bot} must export decide(state, ctx)`);
  } else if (!opts.monkey) throw new Error('give a policy: --bot bot.mjs (exports decide(state, ctx)) or --monkey');

  const ctx = await openPage(target, opts.page || {});
  let crashed = null;
  ctx.page.on('Inspector.targetCrashed', () => { crashed = 'the tab crashed (renderer process died)'; });
  await ctx.page.send('Inspector.enable').catch(() => {});
  const trace = [];
  const r = { url: ctx.url, policy: bot ? 'bot ' + opts.bot : 'monkey', seed, seconds, stuck: stuckS, status: 'timeout', reason: `ran ${seconds} s`, ticks: 0, decisions: 0 };
  try {
    await ctx.settle({ wait: Number(opts.wait ?? 1000) });
    await ctx.page.eval(FRAME_COUNTER);
    const watch = stuckWatch({ stuckMs: stuckS * 1000, stallMs: stuckS > 0 ? 2000 : 0 });
    const read = stateReader(opts.state);
    const botCtx = { seed, rng, width: ctx.width, height: ctx.height, tick: 0, t: 0, frames: 0, keys, page: { eval: (e) => ctx.page.eval(e) } };
    if (bot && typeof bot.init === 'function') await bot.init(botCtx);
    const t0 = Date.now();
    let exSeen = 0;
    const fail = (status, reason) => { r.status = status; r.reason = reason; };
    for (let tick = 0; tick < maxTicks; tick++) {
      const tMs = Date.now() - t0;
      if (tMs >= seconds * 1000) break;
      r.ticks = tick + 1;
      if (crashed) { fail('crash', crashed); break; }
      if (ctx.logs.exceptions.length > exSeen) { fail('crash', 'uncaught exception: ' + ctx.logs.exceptions[0].split('\n')[0]); break; }
      let st;
      try { st = await withTimeout(ctx.page.eval(read, { timeoutMs: 5000 }), 5000, 'main thread did not answer for 5 s'); }
      catch (e) { fail(crashed ? 'crash' : 'stuck', crashed || e.message); break; }
      if (ctx.logs.exceptions.length > exSeen) { fail('crash', 'uncaught exception: ' + ctx.logs.exceptions[0].split('\n')[0]); break; }
      if (st.error) { fail('crash', 'state read threw: ' + st.error); break; }
      r.stateSource = st.src || 'frame hash (no state hook)';
      const key = st.src ? 'state:' + hash(st.text) : await frameKey(ctx);
      const why = watch(tMs, key, st.frames);
      const entry = { tick, t: Math.round(tMs) / 1000, hash: key.split(':')[1] };
      if (st.text != null) entry.state = st.text.length > 240 ? st.text.slice(0, 240) + '…' : st.text;
      if (why) { entry.action = ''; trace.push(entry); fail('stuck', why); break; }
      let decision;
      if (bot) {
        let state = st.text;
        if (state != null) { try { state = JSON.parse(state); } catch { /* plain text */ } }
        Object.assign(botCtx, { tick, t: tMs / 1000, frames: st.frames });
        try { decision = parseDecision(await bot.decide(state, botCtx)); }
        catch (e) { entry.action = ''; trace.push(entry); fail('fail', 'bot error: ' + e.message); break; }
      } else decision = parseDecision(monkeyAction(rng, { keys, width: ctx.width, height: ctx.height }));
      entry.action = decision.kind === 'act' ? decision.action : decision.kind === 'idle' ? '' : decision.kind + ' ' + decision.reason;
      trace.push(entry);
      if (decision.kind === 'done' || decision.kind === 'fail') { fail(decision.kind, decision.reason); break; }
      if (decision.kind === 'act') {
        r.decisions++;
        try { await withTimeout(runActions(ctx.page, decision.actions), 10000, 'input was not accepted for 10 s'); }
        catch (e) { fail(crashed ? 'crash' : 'stuck', crashed || e.message); break; }
      }
      const spent = Date.now() - t0 - tMs;
      if (spent < tickMs) await new Promise((res) => setTimeout(res, tickMs - spent));
    }
    if (r.status === 'timeout' && ctx.logs.exceptions.length > exSeen) fail('crash', 'uncaught exception: ' + ctx.logs.exceptions[0].split('\n')[0]);
    if (r.status === 'timeout' && Number.isFinite(maxTicks) && r.ticks >= maxTicks) r.reason = `ran ${maxTicks} ticks`;
    r.elapsed = Math.round(Date.now() - t0) / 1000;
    const failed = ['crash', 'stuck', 'fail'].includes(r.status);
    if (failed) {
      r.failTick = trace.length ? trace[trace.length - 1].tick : 0;
      try { r.screenshot = (await withTimeout(screenshot(ctx, join(out, 'fail.png')), 5000, 'screenshot timed out')).file; }
      catch (e) { r.screenshotError = e.message; }
    }
    const logs = digestLogs(ctx.logs);
    r.exception = logs.exceptions[0] || null;
    r.exceptions = logs.exceptions;
    r.errors = logs.errors;
    r.network = logs.network;
    r.warnings = logs.warnings.length;
    r.ok = !failed && !logs.exceptions.length;
  } finally {
    await withTimeout(ctx.close(), 10000, 'close').catch(() => {});
  }
  writeFileSync(join(out, 'trace.jsonl'), trace.map((e) => JSON.stringify(e)).join('\n') + (trace.length ? '\n' : ''));
  r.trace = join(out, 'trace.jsonl');
  r.result = join(out, 'result.json');
  writeFileSync(r.result, JSON.stringify(r, null, 2));
  return r;
}

export function formatPlay(r) {
  const L = [];
  L.push(`play: ${r.url} · ${r.policy} · seed ${r.seed} · ${r.elapsed} s · ${r.ticks} ticks · ${r.decisions} actions · state from ${r.stateSource || 'nothing read'}`);
  L.push(`result: ${r.status.toUpperCase()} ${r.reason}${r.failTick !== undefined ? ` (tick ${r.failTick})` : ''}`);
  if (r.exception) L.push('exception:\n  ' + r.exception.replace(/\n/g, '\n  '));
  if (r.errors.length) { L.push(`errors (${r.errors.length}):`); for (const e of r.errors.slice(0, 8)) L.push('  ' + e); }
  if (r.network.length) { L.push(`failed requests (${r.network.length}):`); for (const n of r.network.slice(0, 8)) L.push('  ' + n); }
  L.push(`wrote ${r.trace}, ${r.result}${r.screenshot ? ', ' + r.screenshot : ''}`);
  return L.join('\n');
}

// tw play <page|dist> [--bot bot.mjs | --monkey] [--seconds 60] [--seed 1] [--stuck 5] [--out dir]
export async function cmdPlay(a, print, pageOpts, list) {
  const target = a._[1];
  if (!target) throw new Error('give a page: a .html file, a folder with index.html (dist), or a URL');
  const r = await runPlay(target, {
    bot: a.bot, monkey: !!a.monkey, seconds: a.seconds, seed: a.seed, stuck: a.stuck, tick: a.tick, ticks: a.ticks,
    out: a.out, wait: a.wait, state: a.state ?? a.eval, keys: list(a.keys), page: pageOpts(a),
  });
  print(r, a.json, formatPlay);
  if (['crash', 'stuck', 'fail'].includes(r.status) || !r.ok) process.exitCode = 1;
  return r;
}

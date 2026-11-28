// Adaptive quality: a pure frame-time controller. No DOM and no three.js, so it runs in Node
// tests. Feed it every frame's delta; it returns the quality level to apply (0 is the lowest).
// Recipe with the wiring (pixel ratio first, then shadow size and post steps): the
// `adaptive-quality` knowledge-base entry (tw kb show adaptive-quality).
// harvestwright: kevintngo-voidlight https://github.com/kevintngo/voidlight tier - 2026-11-28
// harvestwright: kevintngo-lumenwake https://github.com/kevintngo/lumenwake tier - 2026-11-28
// harvestwright: 1y66rh1-render https://github.com/kevintngo/cinderwatch tier - 2026-11-28
// Thresholds, dwell times and the anti-flap bar are the first game's parameters; the futility
// guard is the second's and its doubling hold the third's. Written fresh from notes.

export interface QualityOptions {
  /** Number of levels; level 0 is the cheapest. */
  readonly levels: number;
  /** Share of each new frame in the moving average. */
  readonly blend: number;
  /** Average the controller starts from and returns to after a change, ms. */
  readonly startMs: number;
  /** Average above this fills the slow timer, ms. */
  readonly slowMs: number;
  /** Average below this fills the fast timer, ms. */
  readonly fastMs: number;
  /** Seconds of slow before one step down, and the wait after it. */
  readonly downAfter: number;
  readonly downWait: number;
  /** Seconds of fast before one step up, and the wait after it. */
  readonly upAfter: number;
  readonly upWait: number;
  /** A step down this soon after a step up bars the upper level for barSeconds. */
  readonly bounceWindow: number;
  readonly barSeconds: number;
  /** Frames longer than this are ignored (a tab switch, a loading hitch), ms. */
  readonly ignoreMs: number;
  /** Two steps down in a row that each gained less than this are futile, ms. */
  readonly futileGainMs: number;
  /** Hold after a futile verdict, seconds; doubles each time up to futileHoldMax. */
  readonly futileHold: number;
  readonly futileHoldMax: number;
}

export const QUALITY_DEFAULTS: QualityOptions = Object.freeze({
  levels: 5,
  blend: 0.06,
  startMs: 16.7,
  slowMs: 19.5,
  fastMs: 17.4,
  downAfter: 1.1,
  downWait: 2.5,
  upAfter: 6,
  upWait: 3,
  bounceWindow: 8,
  barSeconds: 90,
  ignoreMs: 100,
  futileGainMs: 1,
  futileHold: 21,
  futileHoldMax: 480,
});

export interface QualityState {
  level: number;
  /** Moving average of frame time, ms. */
  avgMs: number;
  slow: number;
  fast: number;
  /** No decisions before this time, seconds. */
  holdUntil: number;
  /** Time of the last step up, or -1. */
  lastUpAt: number;
  /** barredUntil[level]: that level may not be entered from below before this time. */
  barredUntil: number[];
  /** Average at the last step down, or -1 when the last change was not a step down. */
  lastDownAvg: number;
  /** Level before the current run of steps down. */
  runFrom: number;
  futileRun: number;
  /** Times the futility guard fired: lowering quality did not help, the cost is elsewhere. */
  futile: number;
  /** A test or a settings menu holds the level. */
  locked: boolean;
  /** Level changes so far. */
  changes: number;
}

export function createQuality(level = QUALITY_DEFAULTS.levels - 1, o: QualityOptions = QUALITY_DEFAULTS): QualityState {
  return {
    level: Math.max(0, Math.min(o.levels - 1, level)), avgMs: o.startMs, slow: 0, fast: 0, holdUntil: 0, lastUpAt: -1,
    barredUntil: new Array<number>(o.levels).fill(0), lastDownAvg: -1, runFrom: level, futileRun: 0, futile: 0, locked: false, changes: 0,
  };
}

/**
 * One frame. dtSeconds is the frame's delta, nowSeconds any monotonic clock. Returns a new state;
 * compare its level with the old one and apply the change. Skip the call while the tab is hidden.
 */
export function stepQuality(prev: QualityState, dtSeconds: number, nowSeconds: number, o: QualityOptions = QUALITY_DEFAULTS): QualityState {
  const ms = dtSeconds * 1000;
  if (prev.locked || !(ms > 0) || ms > o.ignoreMs || nowSeconds < prev.holdUntil) return prev;
  const s: QualityState = { ...prev, barredUntil: prev.barredUntil.slice() };
  s.avgMs += (ms - s.avgMs) * o.blend;
  // Slow fills while over the threshold and drains at double speed otherwise, so one good
  // moment does not erase a bad stretch. Fast must be unbroken.
  s.slow = s.avgMs > o.slowMs ? s.slow + dtSeconds : Math.max(0, s.slow - 2 * dtSeconds);
  s.fast = s.avgMs < o.fastMs ? s.fast + dtSeconds : 0;

  if (s.slow >= o.downAfter && s.level > 0) {
    const from = s.level;
    // Anti-flap: this level was just entered and could not hold, so keep out of it for a while.
    if (s.lastUpAt >= 0 && nowSeconds - s.lastUpAt <= o.bounceWindow) s.barredUntil[from] = nowSeconds + o.barSeconds;
    if (s.lastDownAvg < 0) { s.runFrom = from; s.futileRun = 0; }
    else s.futileRun = s.lastDownAvg - s.avgMs < o.futileGainMs ? s.futileRun + 1 : 0;
    s.lastDownAvg = s.avgMs;
    s.level = from - 1;
    s.holdUntil = nowSeconds + o.downWait;
    if (s.futileRun >= 2) {
      // Futility guard: two steps down bought under a millisecond each, so the frame is not
      // limited by what the levels control. Go back and hold, longer each time.
      s.level = s.runFrom;
      s.holdUntil = nowSeconds + Math.min(o.futileHoldMax, o.futileHold * 2 ** s.futile);
      s.futile++;
      s.futileRun = 0;
      s.lastDownAvg = -1;
    }
    s.avgMs = o.startMs; s.slow = 0; s.fast = 0; s.changes++;
  } else if (s.fast >= o.upAfter && s.level < o.levels - 1 && nowSeconds >= s.barredUntil[s.level + 1]) {
    s.level++;
    s.lastUpAt = nowSeconds;
    s.lastDownAvg = -1;
    s.holdUntil = nowSeconds + o.upWait;
    s.avgMs = o.startMs; s.slow = 0; s.fast = 0; s.changes++;
  }
  return s;
}

/** What each level sets. Pixel ratio goes first because it is the cheapest change to apply. */
export interface QualitySettings {
  /** Multiplier on the capped device pixel ratio. */
  readonly pixelRatioScale: number;
  readonly shadowMapSize: number;
  /** Share of post-processing samples and particles to keep. */
  readonly effects: number;
}

export const QUALITY_LEVELS: readonly QualitySettings[] = Object.freeze([
  { pixelRatioScale: 0.5, shadowMapSize: 512, effects: 0.4 },
  { pixelRatioScale: 0.65, shadowMapSize: 512, effects: 0.55 },
  { pixelRatioScale: 0.8, shadowMapSize: 1024, effects: 0.7 },
  { pixelRatioScale: 1, shadowMapSize: 1024, effects: 0.85 },
  { pixelRatioScale: 1, shadowMapSize: 2048, effects: 1 },
]);

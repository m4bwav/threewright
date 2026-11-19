# Mobile shell for a browser game

The page around the game: what a phone player sees before and around the canvas. Four parts, all plain HTML, CSS and a few lines of script, no library.

1. **Turn-sideways prompt.** A landscape game on a portrait phone shows a full-screen "turn your phone sideways" card and pauses. CSS alone decides when (`orientation: portrait` and a coarse pointer), so desktop windows that happen to be tall are left alone. `screen.orientation.lock('landscape')` only works in fullscreen on Android and not at all on iOS Safari (checked 2026-11-19), so treat it as a bonus after a fullscreen tap, never the plan.
2. **No-WebGL fallback.** Test for a context before loading three.js. If none, replace the page with a short note and links to where the game can be played (a store page, a download, a video). Old devices, blocked GPUs and some locked-down work browsers land here; a blank canvas tells them nothing.
3. **PWA manifest.** `manifest.webmanifest` with `display: fullscreen` (or `standalone`), `orientation: landscape`, a theme colour and 192 and 512 px icons lets players add the game to the home screen and launch without browser chrome. Add `apple-mobile-web-app-capable` for iOS. A service worker is optional and only for offline play.
4. **Loading screen with flavour text.** Show progress from `THREE.LoadingManager` (`onProgress(url, loaded, total)`) and rotate short in-world lines every few seconds so a slow load feels like part of the game. Remove it on the first rendered frame, not on `onLoad`, so the player never sees an empty scene.

Pause on the prompt the same way as on a hidden tab: the game's pause flag, read by the fixed-step loop. Do not stop `setAnimationLoop`, or the prompt cannot resume.

## Markup and style

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1d1a24">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>
  html, body { margin: 0; height: 100%; background: #1d1a24; color: #f3ead8; font: 16px system-ui, sans-serif; overflow: hidden; }
  .shell-card { position: fixed; inset: 0; display: none; place-items: center; text-align: center; padding: 24px; background: #1d1a24; z-index: 10; }
  #loading { display: grid; }
  #loading .bar { width: min(60vw, 320px); height: 6px; background: #3a3444; margin: 16px auto; }
  #loading .bar i { display: block; height: 100%; width: 0; background: #e0a050; transition: width .2s; }
  @media (orientation: portrait) and (pointer: coarse) { #rotate { display: grid; } }
</style>
<div id="loading" class="shell-card"><div><div class="bar"><i></i></div><p id="flavour">&nbsp;</p></div></div>
<div id="rotate" class="shell-card"><p>Turn your phone sideways to play.</p></div>
<div id="no-webgl" class="shell-card"><div>
  <p>This game needs WebGL, and this browser has it turned off or does not support it.</p>
  <p><a href="https://example.com/your-game">Get the game</a> or watch the <a href="https://example.com/trailer">trailer</a>.</p>
</div></div>
```

## Script

Run the WebGL check first and import the game only when it passes, so the fallback never waits on three.js.

```js
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}
const portraitQuery = matchMedia('(orientation: portrait) and (pointer: coarse)');
const shell = {
  paused: () => portraitQuery.matches || document.hidden,
  onPauseChange(fn) {
    portraitQuery.addEventListener('change', () => fn(shell.paused()));
    document.addEventListener('visibilitychange', () => fn(shell.paused()));
  },
  startLoading(manager, lines) {
    const bar = document.querySelector('#loading .bar i');
    const text = document.getElementById('flavour');
    let i = 0;
    const show = () => { text.textContent = lines[i++ % lines.length]; };
    show();
    const timer = setInterval(show, 2500);
    manager.onProgress = (url, loaded, total) => { bar.style.width = (100 * loaded / total) + '%'; };
    return () => { clearInterval(timer); document.getElementById('loading').remove(); };
  },
};
if (!hasWebGL()) {
  document.getElementById('loading').remove();
  document.getElementById('no-webgl').style.display = 'grid';
} else {
  window.__shell = shell;
  import('./game.js');
}
```

In `game.js`: `const done = __shell.startLoading(THREE.DefaultLoadingManager, LINES)`, call `done()` after the first `renderer.render`, and feed `__shell.onPauseChange` into the game's pause flag.

## Manifest

```json
{
  "name": "Your Game",
  "short_name": "Game",
  "start_url": ".",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#1d1a24",
  "theme_color": "#1d1a24",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Verify

- `TW check dist --size 480x270` passes with the loading card gone (`--eval "!document.getElementById('loading')"` is true).
- Portrait: Chrome DevTools device mode (a phone preset, portrait) shows the rotate card. `TW shot` has no touch emulation (2026-11-19), so at `--size 390x844` the card stays hidden, which is the desktop case and also worth checking.
- Fallback: open the page with WebGL disabled (Chrome `--disable-webgl`) and see the links.
- Lighthouse or Chrome DevTools Application tab reads the manifest without errors.
- Fixture: `tests/fixtures/pages/mobile-shell` holds these blocks verbatim (unit test) and passes `tw check` (browser test), checked 2026-11-19 on three 0.186.1. Idea seen in a commercial web game demo; written fresh.

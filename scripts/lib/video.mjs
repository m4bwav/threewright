// Deterministic frame capture and encoding.
// Time is virtual: each frame advances the page clock by exactly 1/fps seconds,
// or calls the page's own window.__tw.renderFrame(i, fps) when it defines one.

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

export function hasFfmpeg(bin = process.env.TW_FFMPEG || 'ffmpeg') {
  try { return spawnSync(bin, ['-version'], { encoding: 'utf8' }).status === 0; } catch { return false; }
}

// ffmpeg arguments for an output file, chosen by extension.
// Input frames are sRGB PNGs; outputs are tagged BT.709 so players do not wash them out.
export function ffmpegArgs({ fps, out, crf = 18, scale, audio, alpha = false, loop = true }) {
  const ext = extname(out).toLowerCase();
  const input = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) input.push('-i', audio);
  const vf = [];
  if (scale) vf.push(`scale=${scale}:flags=lanczos`);
  let codec;
  if (ext === '.gif') {
    const pre = vf.length ? vf.join(',') + ',' : '';
    return [...input, '-filter_complex', `[0:v]${pre}split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`, '-loop', loop ? '0' : '-1', out];
  } else if (ext === '.webm') {
    codec = ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(Math.max(crf + 12, 24)), '-row-mt', '1', '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p'];
    if (audio) codec.push('-c:a', 'libopus');
  } else if (ext === '.mov') {
    codec = ['-c:v', 'prores_ks', '-profile:v', alpha ? '4444' : '3', '-pix_fmt', alpha ? 'yuva444p10le' : 'yuv422p10le'];
    if (audio) codec.push('-c:a', 'pcm_s16le');
  } else {
    vf.push('scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv');
    codec = ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart'];
    if (audio) codec.push('-c:a', 'aac', '-b:a', '192k');
  }
  if (ext === '.webm' || ext === '.mov') { /* no forced even size needed for these */ }
  return [...input, ...(vf.length ? ['-vf', vf.join(',')] : []), ...codec, ...(audio ? ['-shortest'] : []), out];
}

export async function captureFrames(ctx, { frames, fps, mode = 'page', onFrame, start = 0 }) {
  const { page } = ctx;
  const custom = await page.eval('typeof (window.__tw && window.__tw.renderFrame) === "function"');
  const dt = 1000 / fps;
  // Frame 0 is the state at t = start; the settle step already ran one frame.
  if (start > 0 && !custom) await page.eval(`window.__tw.advance(${start * 1000}), true`);
  for (let i = 0; i < frames; i++) {
    let png;
    if (mode === 'canvas') {
      const step = custom ? `await window.__tw.renderFrame(${i}, ${fps});` : `window.__tw.advance(${dt});`;
      const url = await page.eval(`(async () => { ${step} return window.__tw.capture('image/png'); })()`);
      if (!url) throw new Error('no renderer canvas found for canvas capture; use --capture page');
      png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    } else {
      if (custom) await page.eval(`Promise.resolve(window.__tw.renderFrame(${i}, ${fps})).then(() => true)`);
      else await page.eval(`window.__tw.advance(${dt}), true`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      png = Buffer.from(data, 'base64');
    }
    await onFrame(png, i);
  }
  return { custom };
}

export async function recordVideo(ctx, { out, frames, fps, mode, crf, scale, audio, alpha, framesDir, start }) {
  const outAbs = out ? resolve(out) : null;
  let ff = null, ffErr = '';
  if (outAbs) {
    const args = ffmpegArgs({ fps, out: outAbs, crf, scale, audio, alpha });
    ff = spawn(process.env.TW_FFMPEG || 'ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    ff.stderr.on('data', (d) => { ffErr += d.toString(); });
  }
  if (framesDir) mkdirSync(framesDir, { recursive: true });
  // Chrome paints an opaque white page behind the canvas; alpha needs it transparent
  // (the page must also clear with alpha: new WebGLRenderer({ alpha: true }) and no CSS background).
  if (alpha) await ctx.page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  const t0 = Date.now();
  const res = await captureFrames(ctx, {
    frames, fps, mode, start,
    onFrame: async (png, i) => {
      if (framesDir) writeFileSync(join(framesDir, `frame-${String(i).padStart(5, '0')}.png`), png);
      if (ff && !ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (process.stderr.isTTY && i % 10 === 0) process.stderr.write(`\rframe ${i + 1}/${frames}`);
    },
  });
  if (process.stderr.isTTY) process.stderr.write('\r');
  let code = 0;
  if (ff) {
    ff.stdin.end();
    code = await new Promise((r) => ff.on('close', r));
    if (code !== 0) throw new Error('ffmpeg failed: ' + ffErr.slice(-800));
  }
  return { out: outAbs, frames, fps, seconds: frames / fps, wallSeconds: (Date.now() - t0) / 1000, driver: res.custom ? 'page renderFrame()' : 'virtual clock' };
}

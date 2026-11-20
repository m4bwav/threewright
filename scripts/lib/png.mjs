// Minimal PNG codec (8-bit greyscale, RGB, RGBA, grey+alpha; not interlaced) so tw
// can measure and compare screenshots without dependencies and without sending
// images to the model.

import { deflateSync, inflateSync } from 'node:zlib';

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// Returns { width, height, data } with data as RGBA bytes.
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), kind = buf.toString('ascii', off + 4, off + 8);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (kind === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    off += 12 + len;
  }
  const ch = CHANNELS[type];
  if (depth !== 8 || !ch || interlace) throw new Error(`unsupported PNG (bit depth ${depth}, colour type ${type}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? out[i - ch] : 0, b = prev ? prev[i] : 0, c = prev && i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[i] = v & 0xff;
    }
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += ch) {
    if (ch === 4) { data[i * 4] = px[j]; data[i * 4 + 1] = px[j + 1]; data[i * 4 + 2] = px[j + 2]; data[i * 4 + 3] = px[j + 3]; }
    else if (ch === 3) { data[i * 4] = px[j]; data[i * 4 + 1] = px[j + 1]; data[i * 4 + 2] = px[j + 2]; data[i * 4 + 3] = 255; }
    else if (ch === 2) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[j]; data[i * 4 + 3] = px[j + 1]; }
    else { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[j]; data[i * 4 + 3] = 255; }
  }
  return { width, height, data };
}

export function encodePng({ width, height, data }) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const chunk = (kind, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const kb = Buffer.concat([Buffer.from(kind, 'ascii'), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(kb));
    return Buffer.concat([len, kb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// What is on screen, as numbers: background colour (the most common border colour),
// how much differs from it, where, how bright, how many distinct colours.
export function pixelStats({ width, height, data }, { tolerance = 12 } = {}) {
  const border = new Map();
  const key = (i) => ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
  const addBorder = (x, y) => { const i = (y * width + x) * 4; const k = key(i); border.set(k, (border.get(k) || 0) + 1); };
  for (let x = 0; x < width; x++) { addBorder(x, 0); addBorder(x, height - 1); }
  for (let y = 0; y < height; y++) { addBorder(0, y); addBorder(width - 1, y); }
  let bgKey = 0, best = -1;
  for (const [k, n] of border) if (n > best) { best = n; bgKey = k; }
  let bi = 0;
  for (let i = 0; i < data.length; i += 4) if (key(i) === bgKey) { bi = i; break; }
  const bg = [data[bi], data[bi + 1], data[bi + 2]];
  let covered = 0, black = 0, lumSum = 0, minX = width, minY = height, maxX = -1, maxY = -1, transparent = 0;
  const colours = new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] < 8) transparent++;
      colours.add(key(i));
      if (Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2])) <= tolerance) continue;
      covered++;
      lumSum += luma(r, g, b);
      if (r < 8 && g < 8 && b < 8) black++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const n = width * height;
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    width, height,
    background: '#' + bg.map((v) => v.toString(16).padStart(2, '0')).join(''),
    coverage: covered / n,
    bbox: covered ? { x0: r2(minX / width), x1: r2((maxX + 1) / width), y0: r2(minY / height), y1: r2((maxY + 1) / height) } : null,
    meanLuma: covered ? lumSum / covered : luma(...bg),
    blackShare: covered ? black / covered : 0,
    transparentShare: transparent / n,
    colours: colours.size,
  };
}

export function pixelWarnings(s) {
  const w = [];
  // Two colours with real coverage is a flat-shaded object on a background, not a blank canvas.
  if (s.colours <= 1 || (s.colours <= 2 && s.coverage < 0.002)) w.push(`the canvas is one flat colour (${s.background}): nothing rendered, or the camera sees nothing`);
  else if (s.coverage < 0.002) w.push(`only the background (${s.background}) is visible: the objects are off screen, too small, or drawn in the background colour`);
  else if (s.meanLuma < 0.03) w.push('what is drawn is almost black: missing lights or environment, a colour map without SRGBColorSpace, or exposure far too low');
  else if (s.meanLuma > 0.97 && s.coverage > 0.2) w.push('what is drawn is almost white: blown-out lighting or exposure, or a white material under strong light with no tone mapping');
  return w;
}

// Per-pixel comparison of two same-size images: the share of pixels whose colour
// differs by more than threshold (0 to 1 of the channel range), plus a diff image.
export function diffImages(a, b, { threshold = 0.1 } = {}) {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`sizes differ: ${a.width}x${a.height} and ${b.width}x${b.height}`);
  const t = threshold * 255;
  const out = Buffer.alloc(a.data.length);
  let bad = 0, maxDelta = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]), Math.abs(a.data[i + 3] - b.data[i + 3]));
    if (d > maxDelta) maxDelta = d;
    const grey = Math.round(luma(a.data[i], a.data[i + 1], a.data[i + 2]) * 255 * 0.35 + 160);
    if (d > t) { bad++; out[i] = 255; out[i + 1] = 0; out[i + 2] = 64; }
    else { out[i] = out[i + 1] = out[i + 2] = grey; }
    out[i + 3] = 255;
  }
  return { share: bad / (a.width * a.height), pixels: bad, maxDelta: maxDelta / 255, image: { width: a.width, height: a.height, data: out } };
}

// Advisory look numbers for one frame (tw shot --metrics). Colour entropy in bits over a
// 4-bit-per-channel histogram (0 to 12), the most common of those colours' share, edge
// density (share of pixels whose luma gradient |dx| + |dy| over 2 px is 40 or more) and
// contrast (5th to 95th percentile of luma, 0-255). Below 3.0 bits, above 0.6 share, below
// 0.04 edges or below 60 contrast reads as flat, empty or washed out: a note, never a failure.
export const LOOK_LIMITS = { entropy: 3.0, dominant: 0.6, edges: 0.04, contrast: 60 };

export function lookMetrics({ width, height, data }) {
  const n = width * height;
  const hist = new Uint32Array(4096);
  const luma = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    hist[((data[p] >> 4) << 8) | ((data[p + 1] >> 4) << 4) | (data[p + 2] >> 4)]++;
    luma[i] = (data[p] * 54 + data[p + 1] * 183 + data[p + 2] * 19) >> 8;
  }
  let entropy = 0, top = 0;
  for (const c of hist) if (c) { const q = c / n; entropy -= q * Math.log2(q); if (c > top) top = c; }
  let edges = 0, m = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    if (Math.abs(luma[i + 1] - luma[i - 1]) + Math.abs(luma[i + width] - luma[i - width]) >= 40) edges++;
    m++;
  }
  const lh = new Uint32Array(256);
  for (const v of luma) lh[v]++;
  const pct = (f) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += lh[v]; if (acc >= f * n) return v; } return 255; };
  const r = { entropy: Math.round(entropy * 100) / 100, dominant: Math.round(top / n * 1000) / 1000, edges: Math.round((m ? edges / m : 0) * 1000) / 1000, contrast: pct(0.95) - pct(0.05) };
  const L = LOOK_LIMITS, low = [];
  if (r.entropy < L.entropy) low.push(`colour entropy ${r.entropy} bits < ${L.entropy} (few colours)`);
  if (r.dominant > L.dominant) low.push(`one colour covers ${Math.round(r.dominant * 100)}% > ${L.dominant * 100}% (mostly empty)`);
  if (r.edges < L.edges) low.push(`edge density ${r.edges} < ${L.edges} (little detail)`);
  if (r.contrast < L.contrast) low.push(`contrast ${r.contrast} < ${L.contrast} (washed out)`);
  return { ...r, low };
}

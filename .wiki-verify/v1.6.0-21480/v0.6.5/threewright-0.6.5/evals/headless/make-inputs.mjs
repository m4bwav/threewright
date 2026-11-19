// Inputs the threewright action and outcome evals refer to: models/duck.glb (the product-viewer model),
// models/big.glb (heavy on purpose) and data.csv. Usage: node make-inputs.mjs <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAssets, listTemplates } from '../../scripts/lib/templates.mjs';
import { encodePng } from '../../scripts/lib/png.mjs';

const out = process.argv[2];
mkdirSync(join(out, 'models'), { recursive: true });
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pv = listTemplates(ROOT).find((t) => t.name === 'product-viewer');
await generateAssets({ ...pv, generate: pv.generate.map((g) => ({ ...g, file: 'duck.glb' })) }, join(out, 'models'), ROOT);

// big.glb: a 300x300 grid (180k triangles) with an uncompressed 4096 px colour texture.
const N = 300, W = 4096;
const img = Buffer.alloc(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4, c = ((x >> 7) + (y >> 7)) & 1;
  img[i] = c ? 200 : (x * 255) / W; img[i + 1] = (y * 255) / W; img[i + 2] = c ? 60 : 180; img[i + 3] = 255;
}
const png = Buffer.from(encodePng({ width: W, height: W, data: img }));
const pos = [], uv = [], nrm = [], idx = [];
for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
  const u = i / N, v = j / N, x = u * 2 - 1, z = v * 2 - 1;
  pos.push(x, 0.2 * Math.sin(x * 6) * Math.cos(z * 6), z); uv.push(u, v); nrm.push(0, 1, 0);
}
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
  idx.push(a, c, b, b, c, d);
}
const chunks = [new Float32Array(pos), new Float32Array(nrm), new Float32Array(uv), new Uint32Array(idx)].map((a) => Buffer.from(a.buffer));
const pad = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
let off = 0;
const views = [];
const parts = [];
for (const [k, b] of chunks.concat([png]).entries()) {
  const p = pad(b);
  views.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(k < 3 ? { target: 34962 } : k === 3 ? { target: 34963 } : {}) });
  parts.push(p); off += p.length;
}
const bin = Buffer.concat(parts);
const xs = pos.filter((_, i) => i % 3 === 1);
const json = {
  asset: { version: '2.0', generator: 'threewright eval inputs' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'terrain' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ name: 'ground', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, roughnessFactor: 0.8, metallicFactor: 0 } }],
  textures: [{ source: 0 }], images: [{ bufferView: 4, mimeType: 'image/png' }],
  buffers: [{ byteLength: bin.length }], bufferViews: views,
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [-1, Math.min(...xs), -1], max: [1, Math.max(...xs), 1] },
    { bufferView: 1, componentType: 5126, count: pos.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: uv.length / 2, type: 'VEC2' },
    { bufferView: 3, componentType: 5125, count: idx.length, type: 'SCALAR' },
  ],
};
const js = pad(Buffer.from(JSON.stringify(json)));
const jsP = Buffer.concat([js.subarray(0, js.length), Buffer.alloc(0)]);
for (let i = Buffer.byteLength(JSON.stringify(json)); i < jsP.length; i++) jsP[i] = 0x20;
const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsP.length + 8 + bin.length, 8);
jh.writeUInt32LE(jsP.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(join(out, 'models/big.glb'), Buffer.concat([header, jh, jsP, bh, bin]));

// data.csv: three seeded clusters, x,y,z,group.
let s = 7;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const rows = ['x,y,z,group'];
for (const [g, cx, cy, cz] of [['alpha', 2, 3, 1], ['beta', 6, 1, 4], ['gamma', 4, 6, 7]]) {
  for (let i = 0; i < 40; i++) rows.push([cx + rnd() * 2 - 1, cy + rnd() * 2 - 1, cz + rnd() * 2 - 1].map((v) => v.toFixed(3)).concat(g).join(','));
}
writeFileSync(join(out, 'data.csv'), rows.join('\n') + '\n');

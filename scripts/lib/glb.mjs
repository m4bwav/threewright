// Compact report on a .glb or .gltf file with no dependencies, so an agent can judge a
// model (size, triangles, textures, extensions, animations) without loading it in a page.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';

// Extensions three's GLTFLoader handles in r186, and what each one needs wired up.
export const LOADER_EXT = {
  KHR_draco_mesh_compression: 'needs loader.setDRACOLoader(new DRACOLoader().setDecoderPath(...))',
  EXT_meshopt_compression: 'needs loader.setMeshoptDecoder(MeshoptDecoder)',
  KHR_meshopt_compression: 'needs loader.setMeshoptDecoder(MeshoptDecoder)',
  KHR_texture_basisu: 'needs loader.setKTX2Loader(new KTX2Loader().setTranscoderPath(...).detectSupport(renderer))',
  KHR_mesh_quantization: '', KHR_texture_transform: '', KHR_lights_punctual: '', KHR_materials_unlit: '',
  KHR_materials_emissive_strength: '', KHR_materials_clearcoat: '', KHR_materials_transmission: '',
  KHR_materials_volume: '', KHR_materials_ior: '', KHR_materials_specular: '', KHR_materials_sheen: '',
  KHR_materials_iridescence: '', KHR_materials_anisotropy: '', KHR_materials_dispersion: '', KHR_materials_bump: '',
  KHR_materials_pbrSpecularGlossiness: 'removed from GLTFLoader in r147: convert with gltf-transform metalrough',
  KHR_animation_pointer: '', KHR_materials_variants: 'variants load; switching needs your own code',
  EXT_texture_webp: '', EXT_texture_avif: '', EXT_mesh_gpu_instancing: '', EXT_materials_bump: '',
};

const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

export function parseGltf(buf, file = 'model.glb') {
  let json, bin = null;
  if (buf.readUInt32LE(0) === 0x46546c67) {
    const length = buf.readUInt32LE(8);
    let off = 12;
    while (off < length) {
      const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
      const chunk = buf.subarray(off + 8, off + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
      else if (type === 0x004e4942) bin = chunk;
      off += 8 + len;
    }
  } else json = JSON.parse(buf.toString('utf8'));
  if (!json) throw new Error('no glTF JSON chunk found');
  return { json, bin, file };
}

// Image width and height from PNG, JPEG, WebP or KTX2 headers.
export function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)];
      o += 2 + b.readUInt16BE(o + 2);
    }
    return null;
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (f === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
    if (f === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (b[0] === 0xab && b.toString('ascii', 1, 4) === 'KTX') return [b.readUInt32LE(20), b.readUInt32LE(24)];
  return null;
}

export function report({ json, bin, file }, bytes) {
  const j = json;
  const acc = j.accessors || [];
  const bufferBytes = (i) => {
    const bv = (j.bufferViews || [])[i];
    if (!bv) return null;
    const buffer = (j.buffers || [])[bv.buffer || 0];
    let data = null;
    if (buffer && buffer.uri === undefined) data = bin;
    else if (buffer && /^data:/.test(buffer.uri)) data = Buffer.from(buffer.uri.split(',')[1], 'base64');
    else if (buffer && file) { const p = join(dirname(file), decodeURIComponent(buffer.uri)); if (existsSync(p)) data = readFileSync(p); }
    return data ? data.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength) : null;
  };
  let tris = 0, verts = 0, prims = 0, morph = 0, noIndex = 0;
  const draco = (j.extensionsUsed || []).includes('KHR_draco_mesh_compression');
  for (const m of j.meshes || []) for (const p of m.primitives || []) {
    prims++;
    const pos = acc[p.attributes && p.attributes.POSITION];
    const n = pos ? pos.count : 0;
    verts += n;
    if (p.targets) morph += p.targets.length;
    const idx = p.indices !== undefined ? acc[p.indices].count : n;
    if (p.indices === undefined && !draco) noIndex++;
    const mode = p.mode === undefined ? 4 : p.mode;
    if (mode === 4) tris += Math.floor(idx / 3);
    else if (mode === 5 || mode === 6) tris += Math.max(0, idx - 2);
  }
  // Instancing multiplies drawn triangles; count instances per node.
  let instances = 0;
  for (const n of j.nodes || []) { const e = n.extensions && n.extensions.EXT_mesh_gpu_instancing; if (e && e.attributes) { const a = acc[Object.values(e.attributes)[0]]; if (a) instances += a.count; } }
  const images = (j.images || []).map((im, i) => {
    let data = null;
    if (im.bufferView !== undefined) data = bufferBytes(im.bufferView);
    else if (im.uri && /^data:/.test(im.uri)) data = Buffer.from(im.uri.split(',')[1], 'base64');
    else if (im.uri && file) { const p = join(dirname(file), decodeURIComponent(im.uri)); if (existsSync(p)) data = readFileSync(p); }
    const size = imageSize(data);
    return { i, name: im.name || im.uri || `image${i}`, mime: im.mimeType || (im.uri ? extname(im.uri).slice(1) : '?'), bytes: data ? data.length : null, size };
  });
  const materials = (j.materials || []).map((m) => {
    const ext = Object.keys(m.extensions || {});
    return { name: m.name || '(unnamed)', alpha: m.alphaMode || 'OPAQUE', doubleSided: !!m.doubleSided, ext };
  });
  const animations = (j.animations || []).map((a) => {
    let dur = 0;
    for (const s of a.samplers || []) { const x = acc[s.input]; if (x && x.max) dur = Math.max(dur, x.max[0]); }
    return { name: a.name || '(unnamed)', channels: (a.channels || []).length, seconds: Math.round(dur * 100) / 100 };
  });
  const used = j.extensionsUsed || [], required = j.extensionsRequired || [];
  const warn = [];
  for (const e of used) {
    if (!(e in LOADER_EXT)) warn.push(`extension ${e} is not handled by three's GLTFLoader (r186); check a plugin exists`);
    else if (LOADER_EXT[e]) warn.push(`${e}: ${LOADER_EXT[e]}`);
  }
  for (const im of images) {
    if (im.size && Math.max(...im.size) > 2048) warn.push(`texture ${im.name} is ${im.size.join('x')}; 2048 or less is the usual web budget (gltf-transform resize)`);
    if (im.size && (im.mime === 'image/png' || im.mime === 'image/jpeg') && Math.max(...im.size) >= 1024) { warn.push(`uncompressed ${im.mime} textures stay full size in GPU memory; KTX2 (gltf-transform etc1s/uastc) cuts that about 4 to 8x`); break; }
  }
  if (bytes > 20 * 1024 * 1024) warn.push(`file is ${(bytes / 1048576).toFixed(1)} MB; aim for under 5 to 10 MB on the web (gltf-transform optimize)`);
  if (tris > 1_000_000) warn.push(`${tris} triangles; over a million is heavy for mobile (gltf-transform simplify)`);
  if (noIndex) warn.push(`${noIndex} primitive(s) without indices (gltf-transform weld)`);
  if (!j.scenes || !j.scenes.length) warn.push('no scenes: GLTFLoader will return an empty group');
  const texBytes = images.reduce((s, im) => s + (im.size ? im.size[0] * im.size[1] * 4 * 1.33 : 0), 0);
  return {
    file, bytes, generator: j.asset && j.asset.generator, version: j.asset && j.asset.version,
    scenes: (j.scenes || []).length, nodes: (j.nodes || []).length, meshes: (j.meshes || []).length, primitives: prims,
    triangles: tris, vertices: verts, instances, morphTargets: morph, skins: (j.skins || []).length,
    materials, images, animations, cameras: (j.cameras || []).length,
    extensionsUsed: used, extensionsRequired: required, gpuTextureMB: Math.round(texBytes / 1048576 * 10) / 10, warn,
  };
}

export function formatReport(r) {
  const L = [];
  L.push(`${r.file} · ${(r.bytes / 1024).toFixed(0)} KB · glTF ${r.version || '?'}${r.generator ? ' · ' + r.generator : ''}`);
  L.push(`scenes ${r.scenes} · nodes ${r.nodes} · meshes ${r.meshes} (${r.primitives} primitives) · tris ${r.triangles} · verts ${r.vertices}${r.instances ? ' · gpu instances ' + r.instances : ''}${r.skins ? ' · skins ' + r.skins : ''}${r.morphTargets ? ' · morph targets ' + r.morphTargets : ''}${r.cameras ? ' · cameras ' + r.cameras : ''}`);
  if (r.materials.length) L.push(`materials ${r.materials.length}: ` + r.materials.slice(0, 8).map((m) => m.name + (m.alpha !== 'OPAQUE' ? ` [${m.alpha}]` : '') + (m.ext.length ? ` {${m.ext.map((e) => e.replace(/^KHR_materials_/, '')).join(',')}}` : '')).join(', ') + (r.materials.length > 8 ? ' …' : ''));
  if (r.images.length) L.push(`textures ${r.images.length} (about ${r.gpuTextureMB} MB GPU uncompressed): ` + r.images.slice(0, 8).map((im) => `${im.name} ${im.size ? im.size.join('x') : '?'} ${String(im.mime).replace('image/', '')}${im.bytes ? ' ' + Math.round(im.bytes / 1024) + 'KB' : ''}`).join(', ') + (r.images.length > 8 ? ' …' : ''));
  if (r.animations.length) L.push(`animations ${r.animations.length}: ` + r.animations.slice(0, 10).map((a) => `${a.name} ${a.seconds}s`).join(', '));
  if (r.extensionsUsed.length) L.push(`extensions: ${r.extensionsUsed.join(', ')}${r.extensionsRequired.length ? ' (required: ' + r.extensionsRequired.join(', ') + ')' : ''}`);
  for (const w of r.warn) L.push('  ! ' + w);
  return L.join('\n');
}

export async function cmdGlb(a, print) {
  const file = a._[1];
  if (!file || !existsSync(file)) throw new Error('give a .glb or .gltf file');
  const buf = readFileSync(file);
  const r = report(parseGltf(buf, file), statSync(file).size);
  print(r, a.json, formatReport);
}

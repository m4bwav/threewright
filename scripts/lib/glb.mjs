// Compact report on a .glb or .gltf so an agent never reads binary model data:
// sizes, counts, extensions and the decoders they need, textures with their pixel
// sizes, animations, world bounds, and warnings against web budgets.
// For full spec validation use the Khronos glTF-Validator or `gltf-transform validate`.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

// Extensions GLTFLoader handles by itself in r186 (examples/jsm/loaders/GLTFLoader.js, EXTENSIONS).
export const LOADER_EXTENSIONS = new Set(['KHR_binary_glTF', 'KHR_draco_mesh_compression', 'KHR_lights_punctual', 'KHR_materials_clearcoat', 'KHR_materials_dispersion', 'KHR_materials_ior', 'KHR_materials_sheen', 'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_iridescence', 'KHR_materials_anisotropy', 'KHR_materials_unlit', 'KHR_materials_volume', 'KHR_texture_basisu', 'KHR_texture_transform', 'KHR_mesh_quantization', 'KHR_materials_emissive_strength', 'EXT_materials_bump', 'EXT_texture_webp', 'EXT_texture_avif', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'EXT_mesh_gpu_instancing']);

// What the page must set up for an extension, when anything.
export const NEEDS = {
  KHR_draco_mesh_compression: 'DRACOLoader: loader.setDRACOLoader(new DRACOLoader().setDecoderPath(...))',
  EXT_meshopt_compression: 'MeshoptDecoder: loader.setMeshoptDecoder(MeshoptDecoder) from three/addons/libs/meshopt_decoder.module.js',
  KHR_meshopt_compression: 'MeshoptDecoder: loader.setMeshoptDecoder(MeshoptDecoder) from three/addons/libs/meshopt_decoder.module.js',
  KHR_texture_basisu: 'KTX2Loader: loader.setKTX2Loader(new KTX2Loader().setTranscoderPath(...).detectSupport(renderer))',
  KHR_gaussian_splatting: 'the r186 splat plugin: GLTFGaussianSplatLoaderExtension from three/addons/loaders/ (WebGPURenderer)',
  KHR_materials_variants: 'your own variant switching (see the three.js webgl_loader_gltf_variants example)',
};

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

export function parseGlb(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  let off = 12, json = null, bin = null, jsonBytes = 0;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) { json = JSON.parse(data.toString('utf8').replace(/[\0 ]+$/, '')); jsonBytes = len; }
    else if (type === 0x004e4942) bin = data;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { version, json, bin, jsonBytes };
}

// Pixel size from an image's header bytes (PNG, JPEG, WebP, KTX2, AVIF not decoded).
export function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return { type: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const marker = b[o + 1], len = b.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: 'image/jpeg', width: b.readUInt16BE(o + 7), height: b.readUInt16BE(o + 5) };
      o += 2 + len;
    }
    return { type: 'image/jpeg' };
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { type: 'image/webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
    if (kind === 'VP8 ') return { type: 'image/webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    return { type: 'image/webp' };
  }
  if (b[0] === 0xab && b.toString('ascii', 1, 7) === 'KTX 20') return { type: 'image/ktx2', width: b.readUInt32LE(20), height: b.readUInt32LE(24) };
  if (b.toString('ascii', 4, 12).startsWith('ftypavi')) return { type: 'image/avif' };
  return null;
}

function mat4FromNode(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0, (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0, (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0, tx, ty, tz, 1];
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

// Load everything the report needs: JSON, binary chunk or external buffers, image bytes.
export function loadModel(file) {
  const buf = readFileSync(file);
  const isGlb = buf.readUInt32LE(0) === 0x46546c67;
  let json, bin = null, jsonBytes;
  if (isGlb) ({ json, bin, jsonBytes } = parseGlb(buf));
  else { json = JSON.parse(buf.toString('utf8')); jsonBytes = buf.length; }
  const base = dirname(resolve(file));
  const uriBytes = (uri) => {
    if (!uri) return null;
    if (uri.startsWith('data:')) return Buffer.from(uri.slice(uri.indexOf(',') + 1), /;base64/.test(uri.slice(0, uri.indexOf(','))) ? 'base64' : 'utf8');
    const p = resolve(base, decodeURIComponent(uri));
    return existsSync(p) ? readFileSync(p) : null;
  };
  const buffers = (json.buffers || []).map((b, i) => (b.uri ? uriBytes(b.uri) : i === 0 ? bin : null));
  const viewBytes = (i) => {
    const v = json.bufferViews && json.bufferViews[i];
    const b = v && buffers[v.buffer];
    return b ? b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength) : null;
  };
  const images = (json.images || []).map((im) => {
    const bytes = im.uri ? uriBytes(im.uri) : im.bufferView !== undefined ? viewBytes(im.bufferView) : null;
    const size = imageSize(bytes);
    return { name: im.name || im.uri || null, mimeType: im.mimeType || (size && size.type) || null, bytes: bytes ? bytes.length : 0, width: size && size.width, height: size && size.height, external: !!(im.uri && !im.uri.startsWith('data:')) };
  });
  return { file, fileBytes: statSync(file).size, isGlb, json, jsonBytes, binBytes: bin ? bin.length : 0, buffers, images };
}

export function report(model) {
  const { json, images } = model;
  const acc = json.accessors || [];
  const used = json.extensionsUsed || [], required = json.extensionsRequired || [];
  const meshes = json.meshes || [], nodes = json.nodes || [];

  // Instances per mesh and world bounds by walking the default scene.
  const inst = new Map();
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const sceneIdx = json.scene ?? 0;
  const roots = (json.scenes && json.scenes[sceneIdx] && json.scenes[sceneIdx].nodes) || nodes.map((_, i) => i);
  const visit = (i, parent, depth) => {
    const n = nodes[i];
    if (!n || depth > 64) return;
    const m = mul(parent, mat4FromNode(n));
    if (n.mesh !== undefined) {
      const gpu = n.extensions && n.extensions.EXT_mesh_gpu_instancing;
      const count = gpu && gpu.attributes && gpu.attributes.TRANSLATION !== undefined ? (acc[gpu.attributes.TRANSLATION] || {}).count || 1 : 1;
      inst.set(n.mesh, (inst.get(n.mesh) || 0) + count);
      for (const p of (meshes[n.mesh] || {}).primitives || []) {
        const a = acc[p.attributes && p.attributes.POSITION];
        if (!a || !a.min || !a.max) continue;
        for (let c = 0; c < 8; c++) {
          const v = [c & 1 ? a.max[0] : a.min[0], c & 2 ? a.max[1] : a.min[1], c & 4 ? a.max[2] : a.min[2]];
          for (let k = 0; k < 3; k++) {
            const w = m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k];
            if (w < min[k]) min[k] = w;
            if (w > max[k]) max[k] = w;
          }
        }
      }
    }
    for (const c of n.children || []) visit(c, m, depth + 1);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  roots.forEach((r) => visit(r, I, 0));

  let primitives = 0, drawCalls = 0, verts = 0, tris = 0, noNormals = 0, morph = 0, geomBytes = 0;
  meshes.forEach((mesh, mi) => {
    const k = inst.get(mi) || 0;
    for (const p of mesh.primitives || []) {
      primitives++;
      drawCalls += k ? 1 : 0;
      const pos = acc[p.attributes && p.attributes.POSITION];
      const n = pos ? pos.count : 0;
      const idx = p.indices !== undefined ? acc[p.indices] : null;
      const mode = p.mode ?? 4;
      const ic = idx ? idx.count : n;
      const t = mode === 4 ? ic / 3 : mode === 5 || mode === 6 ? Math.max(0, ic - 2) : 0;
      verts += n * k; tris += t * k;
      if (p.attributes && p.attributes.NORMAL === undefined && mode >= 4) noNormals++;
      if (p.targets && p.targets.length) morph = Math.max(morph, p.targets.length);
      for (const a of Object.values(p.attributes || {}).concat(p.indices !== undefined ? [p.indices] : [])) {
        const x = acc[a];
        if (x) geomBytes += x.count * (COMPONENTS[x.type] || 1) * (BYTES[x.componentType] || 4);
      }
    }
  });

  const mats = json.materials || [];
  const alpha = {};
  let doubleSided = 0, unlit = 0;
  for (const m of mats) {
    const a = m.alphaMode || 'OPAQUE';
    alpha[a] = (alpha[a] || 0) + 1;
    if (m.doubleSided) doubleSided++;
    if (m.extensions && m.extensions.KHR_materials_unlit) unlit++;
  }

  const anims = (json.animations || []).map((a) => {
    let dur = 0;
    for (const s of a.samplers || []) { const x = acc[s.input]; if (x && x.max) dur = Math.max(dur, x.max[0]); }
    return { name: a.name || null, channels: (a.channels || []).length, seconds: Math.round(dur * 100) / 100 };
  });
  const variants = (json.extensions && json.extensions.KHR_materials_variants && json.extensions.KHR_materials_variants.variants || []).map((v) => v.name);

  const imgBytes = images.reduce((s, i) => s + i.bytes, 0);
  const largest = images.reduce((m, i) => Math.max(m, i.width || 0, i.height || 0), 0);
  const gpuBytes = images.reduce((s, i) => s + (i.width && i.height && i.mimeType !== 'image/ktx2' ? i.width * i.height * 4 * 1.33 : 0), 0);
  const mimes = {};
  for (const i of images) mimes[i.mimeType || '?'] = (mimes[i.mimeType || '?'] || 0) + 1;

  const size = isFinite(min[0]) ? max.map((v, k) => v - min[k]) : null;
  const center = size ? max.map((v, k) => (v + min[k]) / 2) : null;
  const warn = [];
  const unsupported = required.filter((e) => !LOADER_EXTENSIONS.has(e) && !NEEDS[e]);
  if (unsupported.length) warn.push(`required extension(s) GLTFLoader r186 does not handle: ${unsupported.join(', ')}`);
  const mb = model.fileBytes / 1048576;
  if (mb > 10) warn.push(`${mb.toFixed(1)} MB: too heavy for a web page; run gltf-transform optimize (meshopt or Draco, KTX2 or WebP)`);
  else if (mb > 5) warn.push(`${mb.toFixed(1)} MB: heavy for a hero model on mobile (aim for under 5 MB)`);
  if (tris > 2e6) warn.push(`${(tris / 1e6).toFixed(1)}M triangles: simplify (gltf-transform simplify) or use LODs`);
  else if (tris > 5e5) warn.push(`${Math.round(tris / 1e3)}k triangles: heavy for mobile`);
  if (drawCalls > 200) warn.push(`${drawCalls} draw calls: join meshes that share a material (gltf-transform join) or instance repeats`);
  const big = images.filter((i) => Math.max(i.width || 0, i.height || 0) > 2048).length;
  if (big) warn.push(`${big} texture(s) over 2048 px: resize for the web (gltf-transform resize --width 2048 --height 2048)`);
  if (images.length >= 3 && !used.includes('KHR_texture_basisu') && gpuBytes > 32 * 1048576) warn.push(`textures need about ${Math.round(gpuBytes / 1048576)} MB of GPU memory uncompressed: KTX2 (gltf-transform etc1s or uastc) cuts it several times`);
  if (noNormals) warn.push(`${noNormals} primitive(s) without normals: GLTFLoader renders them flat shaded`);
  if (size) {
    const span = Math.max(...size);
    if (span > 100) warn.push(`the model is ${Math.round(span)} units across: if it is one object it was probably exported in centimetres or millimetres (three.js scenes use metres); scale it or fit the camera to its bounds`);
    else if (span > 0 && span < 0.01) warn.push(`the model is ${span.toPrecision(2)} units across: tiny in metres; check the export scale`);
  }
  if (model.isGlb === false && images.some((i) => i.external && !i.bytes)) warn.push('some external images are missing next to the .gltf');
  if (model.buffers.some((b, i) => !b && (json.buffers[i] || {}).uri)) warn.push('an external .bin buffer is missing next to the .gltf');

  return {
    file: basename(model.file), bytes: model.fileBytes, jsonBytes: model.jsonBytes, binBytes: model.binBytes,
    glb: model.isGlb, version: json.asset && json.asset.version, generator: json.asset && json.asset.generator || null,
    extensionsUsed: used, extensionsRequired: required, needs: [...new Set([...used, ...required])].filter((e) => NEEDS[e]).map((e) => `${e} -> ${NEEDS[e]}`),
    scenes: (json.scenes || []).length, nodes: nodes.length, meshes: meshes.length, primitives, drawCalls, vertices: verts, triangles: Math.round(tris), geometryBytes: geomBytes,
    materials: mats.length, alphaModes: alpha, doubleSided, unlit, textures: (json.textures || []).length, images: images.length, imageBytes: imgBytes, imageTypes: mimes, largestImage: largest || null,
    animations: anims, skins: (json.skins || []).map((s) => (s.joints || []).length), morphTargets: morph,
    cameras: (json.cameras || []).length, lights: ((json.extensions && json.extensions.KHR_lights_punctual && json.extensions.KHR_lights_punctual.lights) || []).length, variants,
    bounds: size ? { size: size.map((v) => +v.toPrecision(4)), center: center.map((v) => +v.toPrecision(4)) } : null,
    warn,
  };
}

const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

export function formatReport(r) {
  const L = [];
  L.push(`${r.file} · ${kb(r.bytes)}${r.glb ? ` (JSON ${kb(r.jsonBytes)}, binary ${kb(r.binBytes)})` : ''} · glTF ${r.version || '?'}${r.generator ? ` · ${r.generator}` : ''}`);
  if (r.extensionsUsed.length) L.push(`extensions: ${r.extensionsUsed.join(', ')}${r.extensionsRequired.length ? ` (required: ${r.extensionsRequired.join(', ')})` : ''}`);
  for (const n of r.needs) L.push(`needs: ${n}`);
  L.push(`scenes ${r.scenes} · nodes ${r.nodes} · meshes ${r.meshes} (${r.primitives} primitives, ${r.drawCalls} draw calls) · vertices ${r.vertices.toLocaleString('en-US')} · triangles ${r.triangles.toLocaleString('en-US')}`);
  const alpha = Object.entries(r.alphaModes).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ');
  L.push(`materials ${r.materials}${alpha ? ` (${alpha}${r.doubleSided ? `, double-sided ${r.doubleSided}` : ''}${r.unlit ? `, unlit ${r.unlit}` : ''})` : ''} · textures ${r.textures} · images ${r.images}${r.images ? ` (${Object.entries(r.imageTypes).map(([k, v]) => `${k.replace('image/', '')} ${v}`).join(', ')}; ${kb(r.imageBytes)}${r.largestImage ? `; largest ${r.largestImage} px` : ''})` : ''}`);
  const extras = [];
  if (r.animations.length) extras.push(`animations ${r.animations.length} (${r.animations.slice(0, 6).map((a) => `${a.name || 'unnamed'} ${a.seconds}s`).join(', ')}${r.animations.length > 6 ? ', ...' : ''})`);
  if (r.skins.length) extras.push(`skins ${r.skins.length} (${r.skins.join(', ')} joints)`);
  if (r.morphTargets) extras.push(`morph targets up to ${r.morphTargets}`);
  if (r.cameras) extras.push(`cameras ${r.cameras}`);
  if (r.lights) extras.push(`lights ${r.lights}`);
  if (r.variants.length) extras.push(`variants ${r.variants.join(', ')}`);
  if (extras.length) L.push(extras.join(' · '));
  if (r.bounds) L.push(`bounds: size ${r.bounds.size.join(' x ')} · center ${r.bounds.center.join(', ')}`);
  if (r.warn.length) { L.push(`warnings (${r.warn.length}):`); for (const w of r.warn) L.push('  ' + w); }
  return L.join('\n');
}

export function cmdGlb(a, print) {
  const files = a._.slice(1);
  if (!files.length) throw new Error('give a .glb or .gltf file');
  const out = files.map((f) => report(loadModel(f)));
  print(out.length === 1 ? out[0] : out, a.json, (x) => [].concat(x).map(formatReport).join('\n\n'));
  if (a.strict && out.some((r) => r.warn.length)) process.exitCode = 1;
}

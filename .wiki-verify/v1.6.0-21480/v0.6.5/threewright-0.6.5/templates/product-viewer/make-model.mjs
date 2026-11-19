// Builds model.glb for the product-viewer template: a small portable speaker made
// from lathe profiles and primitives, no textures, three materials plus a steel badge.
// Everything here is original geometry, so the file is free to use (CC0).
//
// Run from anywhere inside the threewright folder (it resolves three from its
// node_modules), or in a copied folder after `npm install three@0.186.1`:
//   node make-model.mjs            writes model.glb next to this script
//   node make-model.mjs out.glb    writes somewhere else
//
// GLTFExporter is written for browsers. Node 22+ has Blob, but not FileReader, which
// the exporter uses to turn its Blob of buffers into an ArrayBuffer; the small shim
// below provides the two methods it calls. No textures are exported, so the exporter
// never needs a canvas (it would ask for document or OffscreenCanvas for those).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,` + Buffer.from(buffer).toString('base64');
        this.onloadend?.();
      });
    }
  };
}

const v = (x, y) => new THREE.Vector2(x, y);
// Points on a quarter circle, for rounded edges in a lathe profile.
const arc = (cx, cy, r, from, to, steps) => Array.from({ length: steps + 1 }, (_, k) => {
  const a = from + ((to - from) * k) / steps;
  return v(cx + r * Math.cos(a), cy + r * Math.sin(a));
});

// Units are metres: the speaker is 18 cm tall and 9.4 cm across.
const R = 0.047;
const SEGMENTS = 64;

// Material names are the contract with index.html: its colour buttons look up
// "fabric" and "trim" by name and change their colour.
const fabric = new THREE.MeshStandardMaterial({ name: 'fabric', color: 0x5b7a6e, roughness: 0.92, metalness: 0 });
const trim = new THREE.MeshStandardMaterial({ name: 'trim', color: 0xc9ccd0, roughness: 0.32, metalness: 1 });
const rubber = new THREE.MeshStandardMaterial({ name: 'rubber', color: 0x1e1f22, roughness: 0.75, metalness: 0 });
const steel = new THREE.MeshStandardMaterial({ name: 'badge', color: 0xe4e5e7, roughness: 0.2, metalness: 1 });

const speaker = new THREE.Group();
speaker.name = 'speaker';

// Fabric sleeve: a straight wall with a fine rib every 3.75 mm, which reads as
// woven cloth under the environment light without any texture.
const sleeve = [];
const y0 = 0.014, y1 = 0.164, ribs = 40;
for (let i = 0; i <= ribs * 2; i++) {
  const y = y0 + ((y1 - y0) * i) / (ribs * 2);
  sleeve.push(v(R + (i % 2 ? 0.0005 : 0), y));
}
const body = new THREE.Mesh(new THREE.LatheGeometry(sleeve, 56), fabric);
body.name = 'body';

// Rubber foot: a rounded base slightly narrower than the sleeve.
const footProfile = [v(0, 0), v(R - 0.006, 0), ...arc(R - 0.006, 0.006, 0.006, -Math.PI / 2, 0, 5), v(R, 0.014)];
const foot = new THREE.Mesh(new THREE.LatheGeometry(footProfile, SEGMENTS), rubber);
foot.name = 'foot';

// Anodised top cap: a rounded rim with a shallow dish in the middle.
const capProfile = [
  v(R + 0.0003, 0.1635), v(R + 0.0003, 0.172), ...arc(R - 0.0035, 0.172, 0.0038, 0, Math.PI / 2, 6),
  v(R - 0.009, 0.1758), v(R - 0.011, 0.1738), v(0, 0.1738),
];
const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile, SEGMENTS), trim);
cap.name = 'cap';

// Three buttons on the cap: minus, power, plus.
const buttons = new THREE.Group();
buttons.name = 'buttons';
for (const [i, x] of [-0.014, 0, 0.014].entries()) {
  const r = i === 1 ? 0.0065 : 0.005;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.003, 24), i === 1 ? steel : rubber);
  b.name = ['minus', 'power', 'plus'][i];
  b.position.set(x, 0.1738 + 0.0015, 0.004);
  buttons.add(b);
}

// A carry strap on the back and a badge on the front, so the object has a front
// and a back when it turns.
const strap = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 10, 32, Math.PI), rubber);
strap.name = 'strap';
strap.rotation.set(0, Math.PI / 2, -Math.PI / 2);
strap.position.set(0, 0.12, -R - 0.0005);
strap.scale.set(1, 1, 0.55);
const badge = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, 0.008, 16, 1, true, -0.22, 0.44), steel);
badge.name = 'badge';
badge.position.y = 0.04;

speaker.add(body, foot, cap, buttons, strap, badge);

// Texture coordinates are unused (no textures), so drop them to keep the file small.
speaker.traverse((o) => {
  if (!o.isMesh) return;
  o.geometry.deleteAttribute('uv');
  // Lathe normals come out slightly off unit length; normalise them so the exporter does not warn.
  o.geometry.normalizeNormals();
});

const glb = await new GLTFExporter().parseAsync(speaker, { binary: true });
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || resolve(here, 'model.glb'));
writeFileSync(out, Buffer.from(glb));
console.log(`wrote ${out} (${(glb.byteLength / 1024).toFixed(1)} KB)`);

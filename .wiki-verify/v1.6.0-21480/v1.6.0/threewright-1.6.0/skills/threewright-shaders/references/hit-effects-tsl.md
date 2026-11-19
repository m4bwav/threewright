# Hit effects in TSL (WebGPURenderer)

The six recipes of [hit-effects.md](hit-effects.md) written in TSL (`three/tsl`) for `WebGPURenderer`, with the shield's overcharge veins. The maths is the same as the GLSL; read that file for what each effect does and why. Every block below is copied verbatim into `tests/fixtures/pages/hit-fx-tsl/index.html`, as one module script in this order. A unit test fails if a block here and the fixture drift apart, and a browser test runs `tw check` on the page (no errors, pixels drawn; three r186, WebGPU backend in headless Chrome on an RTX 5060 Ti, 2026-11-18). `tw shaders` lists WebGL programs only, so for TSL the proof is `tw check` (WGSL compile errors arrive as console errors) plus a `tw shot`. Open the page with `?overcharge` to see the veins at full strength.

Differences from the GLSL that bite:

- `vec3(new THREE.Color())` compiles but renders black. Use `color(c)` for a Color (found while verifying this page).
- Uniform arrays are `uniformArray([...vectors], 'vec4')`; change `arr.array[i]` in place on the CPU and read with `.element(i)` inside `Loop`.
- A loop with a JavaScript bound unrolls when the graph is built (`fbm` here). Use `Loop(n, ({ i }) => ...)` with `Break()` and `Discard()` when the count is a uniform.
- GLSL `smoothstep(hi, lo, x)` is written `smoothstep(lo, hi, x).oneMinus()`.
- `MeshBasicNodeMaterial.colorNode` goes through the renderer's output colour space (sRGB), so the same numbers look brighter than a raw GLSL `ShaderMaterial`, which writes linear values to the screen. Tune by eye.
- The outline is a `RenderPipeline` output node (`PostProcessing` was renamed in r183) reading the pass's own depth with `getTextureNode('depth')`; no separate render target.

## Imports

```js
// imports (TSL)
import * as THREE from 'three/webgpu';
import {
  Fn, If, Loop, Break, Discard, uniform, uniformArray, float, vec2, vec3, vec4,
  abs, acos, asin, atan, clamp, color, dot, exp, floor, fract, length, max, mix, mod, select,
  sin, smoothstep, step, frontFacing, normalWorld, pass, positionLocal, positionWorld,
  screenSize, screenUV, time, uv,
} from 'three/tsl';
```
## Shared noise

Same hash, value noise and fbm with a per-octave offset and lacunarity 2.03.

```js
// noise (TSL): unrolled in JavaScript, so octaves is a plain number
const hash12 = Fn(([p]) => {
  const q = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  q.addAssign(dot(q, q.yzx.add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
});
const vnoise = Fn(([p]) => {
  const i = floor(p), f = fract(p);
  const w = f.mul(f).mul(f.mul(-2).add(3));
  const a = hash12(i), b = hash12(i.add(vec2(1, 0)));
  const c = hash12(i.add(vec2(0, 1))), d = hash12(i.add(vec2(1, 1)));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
});
const fbm = (p, octaves = 4) => {
  let sum = float(0), amp = 0.5, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum = sum.add(vnoise(p).mul(amp));
    norm += amp;
    p = p.mul(2.03).add(vec2(13.7, 7.9));
    amp *= 0.5;
  }
  return sum.div(norm);
};
```
## Shield with several hits and overcharge veins

Same ring buffer of hits as the GLSL: on a hit, `set(dir.x, dir.y, dir.z, 0)` the oldest `hits.array` slot with the impact direction in the shield's local space; each frame add `dt` to every age at or above zero and set it to -1 once it passes `HIT_LIFE`. `overcharge` (0 to 1) draws thin lightning veins where fbm, sampled at a point pushed around by slow sines, crosses 0.5; the sines make the veins crawl and fork, and a fast sine flickers them. Raise it when the shield is over full strength.

```js
// shield (TSL)
const HIT_LIFE = 1.0;
const hits = uniformArray(Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 1, -1)), 'vec4');
const strength = uniform(1.0);    // 0 broken .. 1 full
const overcharge = uniform(0.0);  // 0 normal .. 1 fully overcharged
const hexLine = Fn(([p]) => {
  const r = vec2(1.0, 1.7320508);
  const h = r.mul(0.5);
  const a = mod(p, r).sub(h);
  const b = mod(p.add(h), r).sub(h);
  const g = abs(select(dot(a, a).lessThan(dot(b, b)), a, b));
  return float(0.5).sub(max(dot(g, r.normalize()), g.x));
});
const shieldColor = Fn(() => {
  const n = positionLocal.normalize();
  const glow = float(0).toVar();
  Loop(4, ({ i }) => {
    const hit = hits.element(i);
    const age = hit.w;
    If(age.greaterThanEqual(0).and(age.lessThanEqual(HIT_LIFE)), () => {
      const ang = acos(clamp(dot(n, hit.xyz.normalize()), -1, 1));
      const ring = exp(ang.sub(age.mul(3.5)).mul(5).pow2().negate());
      const flash = exp(ang.mul(ang).mul(-3)).mul(exp(age.mul(-6)));
      glow.addAssign(ring.add(flash.mul(1.6)).mul(age.div(HIT_LIFE).oneMinus()));
    });
  });
  const weak = smoothstep(0, 0.4, strength).oneMinus();
  const wobble = sin(n.x.mul(6).add(time.mul(2.3))).mul(sin(n.y.mul(5).sub(time.mul(1.7)))).add(sin(n.z.mul(8).add(time.mul(3.1))).mul(0.5));
  const hole = weak.mul(smoothstep(weak.mul(1.4).oneMinus(), weak.mul(1.4).negate().add(1.15), wobble));
  glow.addAssign(weak.mul(0.2).mul(sin(time.mul(19)).mul(0.25).add(0.75)).mul(step(0.001, strength)));
  const p = vec2(atan(n.x, n.z).mul(3), asin(n.y).mul(4));
  const lattice = smoothstep(0.02, 0.08, hexLine(p)).oneMinus();
  const a = glow.mul(mix(0.2, 1.0, lattice)).mul(hole.oneMinus());
  const tint = mix(vec3(1.0, 0.25, 0.15), vec3(0.4, 0.8, 1.0), smoothstep(0, 0.8, strength));
  // overcharge: lightning veins where sin-warped noise crosses its middle value
  const warp = vec2(sin(n.y.mul(7).add(time.mul(1.3))), sin(n.x.mul(6).sub(time.mul(1.1)))).mul(0.35);
  const s = fbm(p.mul(0.8).add(warp).add(time.mul(0.4)), 3).sub(0.5);
  const flicker = sin(time.mul(23).add(n.y.mul(30))).mul(0.4).add(0.6);
  const vein = smoothstep(0, 0.035, abs(s)).oneMinus().mul(overcharge).mul(flicker);
  return tint.mul(1.6).mul(clamp(a, 0, 1)).add(vec3(0.75, 0.9, 1.0).mul(vein).mul(2));
});
const shieldMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
shieldMaterial.colorNode = shieldColor();
```
## Bullet holes as world-space capsules

```js
// holes (TSL)
const holeA = uniformArray(Array.from({ length: 32 }, () => new THREE.Vector4()), 'vec4'); // xyz start, w radius
const holeB = uniformArray(Array.from({ length: 32 }, () => new THREE.Vector3()), 'vec3'); // end
const holeCount = uniform(0, 'int');
const wallColor = uniform(new THREE.Color(0.7, 0.7, 0.65));
const lightDir = uniform(new THREE.Vector3(1, 2, 3));
const capsuleDist = Fn(([p, a, b]) => {
  const ab = b.sub(a);
  const t = clamp(dot(p.sub(a), ab).div(max(dot(ab, ab), 1e-5)), 0, 1);
  return length(p.sub(a.add(ab.mul(t))));
});
const holesColor = Fn(() => {
  const burn = float(0).toVar();
  Loop(32, ({ i }) => {
    If(i.greaterThanEqual(holeCount), () => { Break(); });
    const A = holeA.element(i);
    const d = capsuleDist(positionWorld, A.xyz, holeB.element(i)).div(max(A.w, 1e-3));
    If(d.lessThan(1), () => { Discard(); });
    burn.assign(max(burn, smoothstep(1, 1.7, d).oneMinus()));
  });
  const lit = max(dot(normalWorld, lightDir.normalize()), 0).mul(0.65).add(0.35);
  const base = select(frontFacing, wallColor.mul(lit), vec3(0.05, 0.04, 0.035));
  const col = mix(base, vec3(0.02), burn);
  return col.add(vec3(1.0, 0.4, 0.08).mul(2).mul(smoothstep(0.75, 1, burn)));
});
const holesMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
holesMaterial.colorNode = holesColor();
```
Shadows still come from the uncut mesh unless the shadow pass gets the same discard (set the material's `castShadowNode` or a depth material with this loop; unverified here).

## Outline from the depth Laplacian

```js
// outline (TSL): the RenderPipeline output, over the scene pass's colour and depth
const outlineNode = (scenePass, thickness = 1.5, ink = vec3(0.02, 0.02, 0.06)) => Fn(() => {
  const depth = scenePass.getTextureNode('depth');
  const texel = vec2(thickness).div(screenSize);
  const at = (o) => depth.sample(screenUV.add(o)).r;
  const c = at(vec2(0));
  const l = at(vec2(texel.x.negate(), 0)), r = at(vec2(texel.x, 0));
  const d = at(vec2(0, texel.y.negate())), u = at(vec2(0, texel.y));
  const lap = abs(l.add(r).sub(c.mul(2))).add(abs(u.add(d).sub(c.mul(2))));
  const far = max(max(max(l, r), max(u, d)), c);
  const edge = smoothstep(0.02, 0.06, lap.div(max(far, 1e-7)));
  return vec4(mix(scenePass.getTextureNode('output').rgb, ink, edge), 1);
})();
```
Use: `const pipeline = new THREE.RenderPipeline(renderer); pipeline.outputNode = outlineNode(pass(scene, camera)); renderer.setAnimationLoop(() => pipeline.render());`. Same thresholds as the GLSL (perspective camera, near 0.1, far about 100).

## Energy beam from nested cylinders

```js
// beam (TSL): one material per cylinder, each with its own colour and intensity
const beamMaterial = (beamColor, intensity, beamLength) => {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const n = fbm(vec2(uv().x.mul(3), uv().y.mul(beamLength * 0.15).sub(time.mul(4))), 4);
  const ends = smoothstep(0, 0.05, uv().y).mul(smoothstep(0.85, 1, uv().y).oneMinus());
  const a = clamp(ends.mul(n.mul(0.4).add(0.6)).mul(intensity), 0, 1);
  m.colorNode = color(beamColor).mul(n.mul(0.6).add(0.8)).mul(a);
  return m;
};
```
Call it three times (outer glow, mid, core) with your colours and intensities. `beamLength` is a plain number here; make it a `uniform` if the beam stretches at run time.

## Black hole

```js
// blackhole (TSL)
const bhExtent = uniform(6);   // quad half-size in horizon radii
const bhTilt = uniform(0.3);   // disc squash, 0.3 = seen nearly edge on
const blackHoleColor = Fn(() => {
  const P = uv().mul(2).sub(1).mul(bhExtent);
  const r = length(P);
  const dir = P.div(max(r, 1e-4));
  const q = vec2(P.x, P.y.div(bhTilt));
  const rq = length(q);
  const spin = atan(q.y, q.x).add(rq.mul(0.6)).sub(time.mul(0.35));
  const swirl = fbm(vec2(spin.cos(), spin.sin()).mul(2.5).add(vec2(rq.mul(1.2), 0)), 4);
  const band = smoothstep(1.4, 2.0, rq).mul(smoothstep(2.8, 5.0, rq).oneMinus());
  const doppler = smoothstep(-0.6, 0.6, dir.x).oneMinus().mul(0.8).add(0.5);   // left side approaches
  const disc = band.mul(swirl.mul(0.8).add(0.4)).mul(doppler);
  const hot = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.95, 0.88), smoothstep(1.6, 3.5, rq).oneMinus());
  const inFront = smoothstep(-0.1, 0.1, P.y);
  const arc = smoothstep(1.1, 1.3, r).mul(smoothstep(1.4, 1.8, r).oneMinus()).mul(smoothstep(-0.3, 0.2, dir.y).oneMinus()).mul(swirl.mul(0.5).add(0.5));
  const ring = smoothstep(0.97, 1.03, r).mul(smoothstep(1.05, 1.13, r).oneMinus()).mul(1.6);
  const fade = smoothstep(bhExtent.mul(0.7), bhExtent, r).oneMinus();
  const inside = hot.mul(disc).mul(inFront).mul(1.5);   // black, unless the disc crosses in front
  const outside = hot.mul(disc.mul(mix(0.75, 1.0, inFront)).add(arc.mul(1.3)).add(ring)).mul(1.45).mul(fade);
  return select(r.lessThan(1), inside, outside);
});
const blackHoleMaterial = new THREE.MeshBasicNodeMaterial();
blackHoleMaterial.colorNode = blackHoleColor();
```
Ideas from sloppysteaks69/GPU-Bandits (no licence) and vitaminclaude/voidstruck (PolyForm Strict). Only ideas were taken; the code was written fresh.

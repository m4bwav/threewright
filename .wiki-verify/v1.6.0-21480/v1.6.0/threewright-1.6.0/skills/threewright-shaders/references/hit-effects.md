# Hit effects, outline, beam and black hole (GLSL)

Six WebGL `ShaderMaterial` recipes for games: a shield that shows several hits at once, bullet holes cut through scenery, an ink outline from depth, a layered energy beam, a black-hole accretion disc, and an fbm detail. Every block below is copied verbatim into `tests/fixtures/pages/hit-fx/index.html`, which `tw shaders` compiles in the browser tests (five programs link, the noise is included in three of them; three r186, 2026-11-18). A unit test fails if a block here and the fixture drift apart. For WebGPURenderer use the TSL versions in [hit-effects-tsl.md](hit-effects-tsl.md).

Ideas from sloppysteaks69/GPU-Bandits (Godot shaders, no licence) and vitaminclaude/voidstruck (WGSL, PolyForm Strict). Neither licence allows reuse, so only the ideas were taken; the code here was written fresh.

## Shared noise with an octave offset

Shift the sample point by a fixed odd vector each octave, and use a lacunarity a little off 2.0 (2.03 here). Plain `p *= 2.0` lines every octave's lattice up at the origin and shows a grid seam there; the offset and the odd ratio break that. Divide by the summed amplitude so the result stays in 0..1 whatever the octave count.

```glsl
// noise.glsl
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}
float fbm(vec2 p, int octaves) {
  float sum = 0.0, amp = 0.5, norm = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    sum += amp * vnoise(p);
    norm += amp;
    p = p * 2.03 + vec2(13.7, 7.9);
    amp *= 0.5;
  }
  return sum / norm;
}
```

## Shield with several hits at once

A sphere around the ship, additive, `depthWrite: false`, `side: DoubleSide`. It is invisible until hit. Keep a small ring buffer of hits on the CPU: each is the impact direction in the shield's local space plus its age in seconds (negative when the slot is free). Each hit draws a flash at the impact point and a ring that travels away from it over the sphere, both fading with age. A hex lattice masks the glow so the hits read as a force field. As `uStrength` drops, the tint slides from blue to red and wobbling holes open in the field.

CPU side: on a hit, write `vec4(localDir, 0)` into the oldest slot; each frame add `dt` to every age at or above zero, and set it to -1 once it passes `HIT_LIFE`.

```glsl
// shield.vert
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// shield.frag
uniform vec4 uHits[4];
uniform float uStrength;
uniform float uTime;
uniform float uOvercharge;   // 0 normal .. 1 fully overcharged
varying vec3 vLocal;
const float HIT_LIFE = 1.0;
// noise.glsl goes here
float hexLine(vec2 p) {
  // distance to the nearest hex cell edge, 0 on the edge
  const vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p + h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  g = abs(g);
  return 0.5 - max(dot(g, normalize(r)), g.x);
}
void main() {
  vec3 n = normalize(vLocal);
  float glow = 0.0;
  for (int i = 0; i < 4; i++) {
    float age = uHits[i].w;
    if (age < 0.0 || age > HIT_LIFE) continue;
    float ang = acos(clamp(dot(n, normalize(uHits[i].xyz)), -1.0, 1.0));
    float front = age * 3.5;                       // ring radius in radians
    float ring = exp(-pow((ang - front) * 5.0, 2.0));
    float flash = exp(-ang * ang * 3.0) * exp(-age * 6.0);
    glow += (ring + 1.6 * flash) * (1.0 - age / HIT_LIFE);
  }
  float weak = 1.0 - smoothstep(0.0, 0.4, uStrength);
  float wobble = sin(n.x * 6.0 + uTime * 2.3) * sin(n.y * 5.0 - uTime * 1.7) + 0.5 * sin(n.z * 8.0 + uTime * 3.1);
  float hole = weak * smoothstep(1.0 - weak * 1.4, 1.15 - weak * 1.4, wobble);
  glow += weak * 0.2 * (0.75 + 0.25 * sin(uTime * 19.0)) * step(0.001, uStrength);
  vec2 uv = vec2(atan(n.x, n.z) * 3.0, asin(n.y) * 4.0);
  float lattice = 1.0 - smoothstep(0.02, 0.08, hexLine(uv));
  float a = glow * mix(0.2, 1.0, lattice) * (1.0 - hole);
  vec3 tint = mix(vec3(1.0, 0.25, 0.15), vec3(0.4, 0.8, 1.0), smoothstep(0.0, 0.8, uStrength));
  // overcharge: lightning veins where sin-warped noise crosses its middle value
  vec2 warp = vec2(sin(n.y * 7.0 + uTime * 1.3), sin(n.x * 6.0 - uTime * 1.1)) * 0.35;
  float s = fbm(uv * 0.8 + warp + uTime * 0.4, 3) - 0.5;
  float flicker = 0.6 + 0.4 * sin(uTime * 23.0 + n.y * 30.0);
  float vein = (1.0 - smoothstep(0.0, 0.035, abs(s))) * uOvercharge * flicker;
  gl_FragColor = vec4(tint * 1.6 * clamp(a, 0.0, 1.0) + vec3(0.75, 0.9, 1.0) * vein * 2.0, 1.0);
}
```

Overcharge: raise `uOvercharge` toward 1 when the shield is over full. Thin bright veins appear where fbm, sampled at a point pushed around by slow sines, crosses its middle value 0.5; the sines make the veins crawl and fork like lightning, and a fast sine flickers them.

Notes: with `AdditiveBlending` write the colour already scaled by alpha, as above. More than four live hits: raise the array size and the loop bound together.

## Bullet holes as world-space capsules

Each hole is a capsule (start, end, radius) in world space, so a shot that goes through a wall cuts a tunnel, not a decal. Fragments inside any capsule are discarded; a band just outside darkens and glows like a burnt rim; with `side: DoubleSide` the back faces seen through the hole are painted charred, so the hole looks hollow without new geometry. Up to 32 holes per material; recycle the oldest on the CPU.

```glsl
// holes.vert
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
```

```glsl
// holes.frag
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform int uHoleCount;
uniform vec4 uHoleA[32];   // xyz start, w radius
uniform vec3 uHoleB[32];   // end
varying vec3 vWorld;
varying vec3 vNormalW;
float capsuleDist(vec3 p, vec3 a, vec3 b) {
  vec3 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  return length(p - (a + ab * t));
}
void main() {
  float burn = 0.0;
  for (int i = 0; i < 32; i++) {
    if (i >= uHoleCount) break;
    float d = capsuleDist(vWorld, uHoleA[i].xyz, uHoleB[i]) / max(uHoleA[i].w, 1e-3);
    if (d < 1.0) discard;
    burn = max(burn, 1.0 - smoothstep(1.0, 1.7, d));
  }
  vec3 n = normalize(gl_FrontFacing ? vNormalW : -vNormalW);
  float lit = 0.35 + 0.65 * max(dot(n, normalize(uLightDir)), 0.0);
  vec3 base = gl_FrontFacing ? uColor * lit : vec3(0.05, 0.04, 0.035);
  vec3 col = mix(base, vec3(0.02), burn);
  col += vec3(1.0, 0.4, 0.08) * 2.0 * smoothstep(0.75, 1.0, burn);
  gl_FragColor = vec4(col, 1.0);
}
```

Notes: shadows still come from the uncut mesh unless the shadow pass gets the same discard (set `customDepthMaterial` with this fragment's discard loop). With `MeshStandardMaterial` instead, inject the loop through `onBeforeCompile` at the top of `main`.

## Outline from the depth Laplacian

A full-screen pass over the scene's colour and depth (render to a `WebGLRenderTarget` with a `DepthTexture`). Raw (non-linear) depth on a flat plane changes linearly across the screen, so its second difference is near zero on floors and walls, even at grazing angles, and large at silhouettes. Dividing by the largest nearby depth keeps the threshold the same near and far. A first-difference (Sobel) edge on the same depth draws false lines on sloped floors.

```glsl
// outline.vert
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
```

```glsl
// outline.frag
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;       // thickness / resolution
uniform vec3 uInk;
varying vec2 vUv;
void main() {
  float c = texture2D(tDepth, vUv).r;
  float l = texture2D(tDepth, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture2D(tDepth, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture2D(tDepth, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture2D(tDepth, vUv + vec2(0.0, uTexel.y)).r;
  float lap = abs(l + r - 2.0 * c) + abs(u + d - 2.0 * c);
  float far = max(max(max(l, r), max(u, d)), c);
  float edge = smoothstep(0.02, 0.06, lap / max(far, 1e-7));
  vec3 col = texture2D(tColor, vUv).rgb;
  gl_FragColor = vec4(mix(col, uInk, edge), 1.0);
}
```

Draw it on a 2x2 `PlaneGeometry` with an orthographic camera (`depthTest: false`). The thresholds suit a perspective camera with near 0.1 and far around 100; tune them when the depth range differs.

## Energy beam from nested cylinders

Three open cylinders on the same axis (outer glow, mid, thin core), all with this one material, additive and `depthWrite: false`, each with its own `uColor` and `uIntensity` (for example purple 0.5, pink 0.8, near-white 1.5). Noise scrolls from muzzle to tip, the start fades in and the tip tapers, so the ends never cut hard. `uLength` keeps the noise scale fixed as the beam stretches. `uv.y` must run 0 at the muzzle to 1 at the tip: rotate the cylinder so its +Y points along the beam.

```glsl
// beam.vert
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// beam.frag
uniform vec3 uColor;
uniform float uIntensity;
uniform float uLength;
uniform float uTime;
varying vec2 vUv;
// noise.glsl goes here
void main() {
  float n = fbm(vec2(vUv.x * 3.0, vUv.y * uLength * 0.15 - uTime * 4.0), 4);
  float ends = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
  float a = clamp(ends * (0.6 + 0.4 * n) * uIntensity, 0.0, 1.0);
  gl_FragColor = vec4(uColor * (0.8 + 0.6 * n) * a, 1.0);
}
```

## Black hole: disc, Doppler side, lensed arc, photon ring

A camera-facing quad (or a full-screen pass) with `p` in units of the event horizon radius. Five layers: a black disc inside radius 1; a flattened accretion disc of swirling polar noise; one side brighter than the other (gas moving toward the viewer is Doppler-beamed); a thin arc above the hole, the far side of the disc bent over the top by lensing; and a bright photon ring just outside the horizon. Where the disc passes in front of the hole, it is drawn over the black.

```glsl
// blackhole.vert
varying vec2 vP;
uniform float uExtent;   // quad half-size in horizon radii, e.g. 6
void main() {
  vP = (uv * 2.0 - 1.0) * uExtent;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```glsl
// blackhole.frag
uniform float uTime;
uniform float uExtent;
uniform float uTilt;      // disc squash, 0.3 = seen nearly edge on
varying vec2 vP;
// noise.glsl goes here
void main() {
  float r = length(vP);
  vec2 dir = vP / max(r, 1e-4);
  vec2 q = vec2(vP.x, vP.y / uTilt);           // disc plane coordinates
  float rq = length(q);
  float spin = atan(q.y, q.x) + rq * 0.6 - uTime * 0.35;
  float swirl = fbm(vec2(cos(spin), sin(spin)) * 2.5 + vec2(rq * 1.2, 0.0), 4);
  float band = smoothstep(1.4, 2.0, rq) * smoothstep(5.0, 2.8, rq);
  float doppler = 0.5 + 0.8 * smoothstep(0.6, -0.6, dir.x);   // left side approaches
  float disc = band * (0.4 + 0.8 * swirl) * doppler;
  vec3 hot = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.95, 0.88), smoothstep(3.5, 1.6, rq));
  float inFront = smoothstep(-0.1, 0.1, vP.y);   // near half of the disc
  float arc = smoothstep(1.1, 1.3, r) * smoothstep(1.8, 1.4, r) * smoothstep(0.2, -0.3, dir.y) * (0.5 + 0.5 * swirl);
  float ring = smoothstep(0.97, 1.03, r) * smoothstep(1.13, 1.05, r) * 1.6;
  float fade = smoothstep(uExtent, uExtent * 0.7, r);
  vec3 col;
  if (r < 1.0) col = hot * disc * inFront * 1.5;   // black, unless the disc crosses in front
  else col = hot * (disc * mix(0.75, 1.0, inFront) + arc * 1.3 + ring) * 1.45 * fade;
  gl_FragColor = vec4(col, 1.0);
}
```

Notes: blend additively over the starfield, or draw opaque and let the black disc hide what is behind. This is an artistic fake, not a geodesic ray tracer: the arc is a fixed band, so it does not follow the disc tilt exactly. For physical lensing of the background, march rays with a `1/r^2` bend toward the centre instead.

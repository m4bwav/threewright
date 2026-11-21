# Ray tracing and ray marching in shaders

For a ray tracer, path tracer or ray marcher written by hand in GLSL ES 3.0 (`ShaderMaterial` on `WebGLRenderer`) or TSL/WGSL. three.js has no hardware ray tracing; for a full path tracer of a three.js scene use three-gpu-pathtracer, and for BVH queries in your own shader use three-mesh-bvh (`TW kb show three-mesh-bvh`). Sampling patterns, fireflies and the cost of more samples are in [sampling.md](sampling.md).

Methods from Ray Tracing Gems (Haines and Akenine-Moller, eds., 2019, open access CC BY-NC-ND 4.0), chapters cited per section. Described in our own words; every block below is written fresh and checked on `tests/fixtures/pages/ray-tracing`.

Does not carry to the browser: the book's DXR host setup (ch. 3), any-hit multi-hit (ch. 9), multi-GPU load balancing (ch. 10), RTX shadow and caustic pipelines (ch. 13, 14) and the hybrid engine chapters (Parts V and VI). They need hardware ray tracing APIs that WebGL and WebGPU do not have.

## Ray origins: offset along the geometric normal (ch. 6, Wachter and Binder)

Shadow acne in a ray tracer is float error: the hit point lands a hair behind the surface, and the next ray hits the surface it starts on. Rules:

1. Rebuild the hit point from the surface itself (barycentrics on a triangle, the analytic surface) rather than `origin + t * dir` when you can. The error of `origin + t * dir` lies along the old ray and puts points on both sides of the surface.
2. Then push the origin off along the geometric normal, turned to the side the new ray leaves from (flip it for refraction). Not the shading or normal-mapped normal: it is not perpendicular to the true surface.
3. Size the push by each coordinate's magnitude, a fixed number of float steps (ULPs) per coordinate, because float spacing grows with distance from the world origin. A fixed `tMin` epsilon works at one scale and fails at another or at grazing angles.
4. Skipping the hit primitive's ID as well is a free extra for flat triangles; it is wrong for curved analytic shapes, which can hit themselves.

The bit casts need WebGL 2 or WebGPU (`floatBitsToInt` in GLSL ES 3.0, `floatBitsToInt` / `intBitsToFloat` or `bitcast` in TSL, checked in three 0.186.1 `src/nodes/math/BitcastNode.js`). Declare `highp`: a mediump fragment shader on some phones breaks the step sizes. Our step counts were checked on the fixture only; the chapter tunes its own from a large triangle test.

```glsl
// Push a new ray origin p off its surface along the geometric normal ng (unit length,
// pointing to the side the new ray leaves from). Far from zero each coordinate moves a
// fixed count of float steps, so the push grows with magnitude; near zero a small
// absolute step takes over, because there the error comes from larger terms.
const float RT_ULP_STEPS = 128.0;
const float RT_NEAR_ZERO = 0.03;
const float RT_ABS_STEP = 3e-5;
vec3 offsetRayOrigin(vec3 p, vec3 ng) {
  ivec3 steps = ivec3(ng * RT_ULP_STEPS);
  // Adding to a negative float's bits moves it away from zero, so flip the step there.
  ivec3 signedSteps = ivec3(p.x < 0.0 ? -steps.x : steps.x, p.y < 0.0 ? -steps.y : steps.y, p.z < 0.0 ? -steps.z : steps.z);
  vec3 stepped = intBitsToFloat(floatBitsToInt(p) + signedSteps);
  vec3 nudged = p + ng * RT_ABS_STEP;
  return mix(stepped, nudged, lessThan(abs(p), vec3(RT_NEAR_ZERO)));
}
```

Measured on the fixture (2026-11-20, ANGLE D3D11, RTX 5060 Ti): a tilted ground of two large triangles, one shadow ray per pixel, nothing to cast shadows. A fixed `tMin` of 1e-4 marks 0% of the ground as shadowed at the origin and 42% with the scene moved 10,000 units away; the offset above marks 0% in both. At 8 steps 0.04% acne remained at the origin, at 32 none, so 128 keeps a margin. The push is large far out: 128 steps at 10,000 units is about 0.125 units, enough to leak light through thin crevices.

Keep path-traced or ray-marched worlds near the origin, and when coordinates get large render camera-relative (subtract the camera position on the CPU in double precision before uploading). WebGL and WebGPU have no 64-bit float fallback in shaders.

## Ray and sphere without precision loss (ch. 7, Haines, Gunther and Akenine-Moller)

The textbook quadratic fails in 32-bit floats in two cases. A small sphere far away: squaring the centre distance before subtracting the squared radius throws the radius away (beyond a few thousand radii it no longer matters at all). A ray close to a huge sphere: one root suffers cancellation. Fixes: get the discriminant from the centre's perpendicular offset to the ray, formed as a vector before squaring; take the root whose sign matches and get the other from the product of the roots.

```glsl
// Ray/sphere hit distances, stable for tiny far spheres and huge near ones.
// rd must be unit length. Returns (tNear, tFar); tNear > tFar means a miss.
vec2 intersectSphere(vec3 ro, vec3 rd, vec3 center, float radius) {
  vec3 f = ro - center;
  float b = dot(f, rd);
  vec3 perp = f - b * rd;
  float h = radius * radius - dot(perp, perp);
  if (h < 0.0) return vec2(1.0, -1.0);
  float c = dot(f, f) - radius * radius;
  float q = -b - (b >= 0.0 ? 1.0 : -1.0) * sqrt(h);
  float t0 = c / q;
  return t0 < q ? vec2(t0, q) : vec2(q, t0);
}
```

Early outs: `c > 0.0` means the origin is outside; outside with `b > 0.0` means the sphere is behind. If the camera never comes close to large spheres, the second fix can be dropped. Measured on the fixture (2026-11-20): a radius-1 sphere 10,000 units away, framed to about 100 px radius in a 256 px square, covers every pixel of the frame (65,536 px, a solid block) with the textbook form and 32,928 px with this one, against 32,942 expected.

## Environment lookups: mip level from the ray's spread (ch. 21, Akenine-Moller and Nilsson)

Rays have no 2x2 pixel quads, so `texture()` cannot pick a mip for an environment map hit by a reflected or refracted ray, and the reflection aliases. Track a spread angle per ray (a ray cone: the pixel's angle at the camera, widened at each curved bounce) and choose the level from spread over radians per texel. Isotropic only, with no correction for the map's distortion near the poles.

```glsl
// Mip level for an environment lookup by a ray whose footprint spans spread radians.
// Equirectangular map: the full height covers pi radians. Cube map: a face covers pi / 2.
float envLodEquirect(float spread, float heightPx) {
  return max(log2(spread * heightPx / 3.14159265), 0.0);
}
float envLodCube(float spread, float faceSizePx) {
  return max(log2(spread * faceSizePx / 1.57079633), 0.0);
}
```

Use it with `textureLod`. The texture needs mipmaps: `HDRLoader` (r186) returns `generateMipmaps = false` and `minFilter = LinearFilter`, so set `generateMipmaps = true` and `minFilter = THREE.LinearMipmapLinearFilter` on the texture first, or sample a PMREM output instead.

## Progressive accumulation is a running mean (ch. 28, Raab; ch. 15, Pharr)

Fold frame n (counting from 1) into the accumulation at weight 1/n. Two float render targets swap roles each frame; the new noisy frame renders into a third. Reset the count whenever the camera, scene or a uniform changes. Error falls only with the square root of the frame count (16 frames to 64 halves it), so cap the count and hand the rest to a denoiser or `TRAA`.

```js
// Running-mean accumulation: frame n (from 1) is mixed in at weight 1 / n.
function makeAccumulator(renderer, width, height) {
  const target = () => new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType, depthBuffer: false });
  let read = target(), write = target();
  const frame = target();
  const blend = new THREE.ShaderMaterial({
    uniforms: { uPrev: { value: null }, uNew: { value: null }, uWeight: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D uPrev, uNew; uniform float uWeight; varying vec2 vUv;\n'
      + 'void main() { gl_FragColor = mix(texture2D(uPrev, vUv), texture2D(uNew, vUv), uWeight); }',
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blend);
  const quadCamera = new THREE.Camera();
  let n = 0;
  return {
    get count() { return n; },
    get target() { return read; },
    reset() { n = 0; },
    add(scene, camera) {
      renderer.setRenderTarget(frame);
      renderer.render(scene, camera);
      n += 1;
      blend.uniforms.uPrev.value = read.texture;
      blend.uniforms.uNew.value = frame.texture;
      blend.uniforms.uWeight.value = 1 / n;
      renderer.setRenderTarget(write);
      renderer.render(quad, quadCamera);
      [read, write] = [write, read];
      renderer.setRenderTarget(null);
    },
  };
}
```

Show `acc.target.texture` on a full-screen quad with tone mapping. `FloatType` targets need `EXT_color_buffer_float`, which three requests on WebGL 2; `HalfFloatType` works more widely but its 10-bit mantissa stalls the mean after a few hundred frames. Measured on the fixture: a uniform noise field has a per-pixel spread of 0.072 after 16 frames and 0.036 after 64 (expected 0.072 and 0.036), mean 0.500.

## Volumes: delta tracking (ch. 28, Raab)

For a ray-marched medium that accumulates over frames, delta (Woodcock) tracking replaces a fixed step count. Pad the medium with imaginary particles up to a known maximum extinction, take exponential steps as if the medium were uniform at that maximum, and accept a real collision with probability local over maximum; otherwise keep going. It is unbiased, so it suits progressive accumulation. It turns slow when the maximum is far above typical values, and a game's real-time fog is usually better as a fixed-step march with jitter.

```glsl
// Delta tracking: distance to a real collision in a medium whose extinction(p) never
// exceeds sigmaMax, or -1.0 when the ray leaves (t >= tMax). rand01(seed) is any uniform
// [0, 1) generator. The loop cap is a GLSL necessity and biases toward escaping; size it
// so sigmaMax * tMax stays well under the cap.
float deltaTrack(vec3 ro, vec3 rd, float tMax, float sigmaMax, inout uint seed) {
  float t = 0.0;
  for (int i = 0; i < 256; i++) {
    t -= log(1.0 - rand01(seed)) / sigmaMax;
    if (t >= tMax) return -1.0;
    if (rand01(seed) * sigmaMax < extinction(ro + t * rd)) return t;
  }
  return -1.0;
}
```

For a shadow ray, transmittance is the share of tracked rays that escape; ratio tracking (multiply by one minus local over maximum at each step instead of flipping a coin) gives the same expected value with less noise. Measured on the fixture: extinction 0.5 over length 2 tracked with a maximum of 2 lets 36.6% of 65,536 rays escape, against exp(-1) = 36.8%.

## Verify

`tw check tests/fixtures/pages/ray-tracing --eval "rtMeasure()"` compiles every block above (a unit test keeps the page's copies identical to this file) and returns the numbers quoted here; a browser test asserts them. Measured with WebGL 2 on ANGLE; the TSL bit-cast functions were checked by name only.

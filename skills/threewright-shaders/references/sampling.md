# Sampling cheat sheet for shader ray tracers

Which random directions and points to draw, what probability density (pdf) each has, and how to keep noise down, for a path tracer, AO or soft-shadow shader written by hand, or settings in three-gpu-pathtracer. Ray origins, sphere hits, accumulation and volumes are in [ray-tracing-in-shaders.md](ray-tracing-in-shaders.md).

From Ray Tracing Gems (Haines and Akenine-Moller, eds., 2019, CC BY-NC-ND 4.0): ch. 15 (Pharr, on the importance of sampling), ch. 16 (Shirley, Laine, Hart, Pharr, Clarberg, Haines, Raab and Cline, the sampling transformations zoo), ch. 17 (Pharr, ignoring the inconvenient). Our words; the samplers below are written fresh and histogram-checked in `tests/sampling.test.mjs`.

## Which sampler

| need | draw | pdf | note |
|---|---|---|---|
| diffuse bounce, ambient occlusion | cosine-weighted hemisphere | cos(theta) / pi | never uniform: rays near the horizon carry almost nothing; Pharr measured about half the variance for AO at the same cost (ch. 15); our test: 0.44x per sample |
| point on a disk (lens, disk light) | concentric map | 1 / area | the polar map has a seam and breaks up stratified input (ch. 16) |
| sphere light | uniform inside the cone the sphere fills | 1 / cone solid angle | about 3x lower variance than points on its surface in ch. 15 |
| many lights | pick one by power over squared distance from a CDF | pick probability times the light's pdf | another 2.7x in ch. 15; uniform picking wastes rays on far, dim lights |
| point on a triangle | square-root warp | 1 / area | folding the square over its diagonal is cheaper but damages blue-noise or low-discrepancy input (ch. 16) |
| environment map | rows CDF then a column CDF in the row | pixel probability over pixel solid angle | simple, but breaks stratification; a hierarchical warp down the mip chain keeps it (ch. 16) |
| glossy reflection | GGX visible normals (VNDF, Heitz 2018) | VNDF pdf times the reflection Jacobian | the book samples the plain normal distribution; that is dated. three r181+ PMREM samples VNDF (`PMREMGenerator.js`, three 0.186.1). Half-vector pdfs convert with 1 / (4 v.h) |
| distance in a uniform medium | -log(1 - u) / sigma | sigma exp(-sigma t) | 1 - u, not u, so a zero never reaches log |

```js
// Samplers: uniform numbers u1, u2 in [0, 1) to points. Directions are in a local frame
// with z along the normal. Each returns its pdf so the caller can weight by f / pdf.
const TAU = 2 * Math.PI;

// Concentric map, unit square to unit disk: uniform by area, no seam.
function concentricDisk(u1, u2) {
  const a = 2 * u1 - 1, b = 2 * u2 - 1;
  if (a === 0 && b === 0) return [0, 0];
  let r, phi;
  if (Math.abs(a) > Math.abs(b)) { r = a; phi = (Math.PI / 4) * (b / a); }
  else { r = b; phi = Math.PI / 2 - (Math.PI / 4) * (a / b); }
  return [r * Math.cos(phi), r * Math.sin(phi)];
}

// Cosine-weighted hemisphere: a disk point lifted straight up onto the hemisphere.
function cosineHemisphere(u1, u2) {
  const [x, y] = concentricDisk(u1, u2);
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return { dir: [x, y, z], pdf: z / Math.PI };
}

// Uniform directions inside a cone around z whose half-angle has cosine cosMax.
function uniformCone(u1, u2, cosMax) {
  const cosT = 1 - u1 * (1 - cosMax);
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi = TAU * u2;
  return { dir: [sinT * Math.cos(phi), sinT * Math.sin(phi), cosT], pdf: 1 / (TAU * (1 - cosMax)) };
}

// The cone a sphere light of radius r fills, seen from distance d > r.
function sphereLightCosMax(r, d) {
  return Math.sqrt(Math.max(0, 1 - (r * r) / (d * d)));
}

// Uniform point in a triangle as barycentrics (square-root warp).
function triangleBary(u1, u2) {
  const s = Math.sqrt(u1);
  return [1 - s, s * u2, s * (1 - u2)];
}

// Distance to the next collision in a uniform medium with extinction sigma.
function exponentialDistance(u, sigma) {
  return -Math.log(1 - u) / sigma;
}

// Discrete pick by weight: build the CDF once, binary-search it per sample.
function buildCdf(weights) {
  const cdf = new Float64Array(weights.length + 1);
  for (let i = 0; i < weights.length; i++) cdf[i + 1] = cdf[i] + weights[i];
  return cdf;
}
function sampleCdf(cdf, u) {
  const total = cdf[cdf.length - 1], target = u * total;
  let lo = 0, hi = cdf.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid + 1] <= target) lo = mid + 1; else hi = mid;
  }
  return { index: lo, pmf: (cdf[lo + 1] - cdf[lo]) / total };
}

// Equirectangular environment map (row 0 at the top): pick a row by its luminance times
// sin(theta), then a pixel in the row. pdf is per steradian for the pixel's direction.
function makeEnvSampler(lum, width, height) {
  const rows = [], rowSums = [];
  for (let y = 0; y < height; y++) {
    const sinT = Math.sin(((y + 0.5) / height) * Math.PI);
    const cdf = buildCdf(Array.from({ length: width }, (_, x) => lum[y * width + x] * sinT));
    rows.push(cdf);
    rowSums.push(cdf[width]);
  }
  const marginal = buildCdf(rowSums);
  return (u1, u2) => {
    const r = sampleCdf(marginal, u1), c = sampleCdf(rows[r.index], u2);
    const sinT = Math.sin(((r.index + 0.5) / height) * Math.PI);
    return { x: c.index, y: r.index, pdf: (r.pmf * c.pmf * width * height) / (2 * Math.PI * Math.PI * sinT) };
  };
}
```

The same formulas port line for line to GLSL or TSL; in a shader, keep the CDFs in a float texture and binary-search with a fixed loop count.

## Rules

- A sampled direction below the surface gets zero weight. Phong and GGX lobes can produce them at grazing views; drop the sample explicitly instead of clamping the cosine (ch. 16).
- Sample the BSDF as well as the lights and combine the two with multiple importance sampling; light-only sampling falls apart on glossy surfaces (ch. 15).
- Four times the samples halves the visible error. Past a modest count, stop adding rays and denoise (ch. 15; measured on the accumulation fixture: spread 0.072 at 16 frames, 0.036 at 64).
- Cosine without a tangent frame: add a uniform point on the unit sphere to the normal and normalize. Shrink the sphere a little (radius 0.9999) so the sum never comes near zero (ch. 16).
- Per-pixel variance can be kept from a running sum and sum of squares, but it is itself noisy: blur it before driving a denoise radius or adaptive sampling. Adaptive sampling driven by its own samples is biased; fine for previews, say so for reference stills (ch. 15).
- Many remaps of one uniform pair (hierarchical warps, reused leftovers) eat float bits; fine at usual texture sizes, otherwise draw fresh numbers (ch. 16).

## Fireflies

Rare paths that carry huge energy (a mirror bouncing a small bright light onto a diffuse wall) give isolated bright pixels that fade very slowly with more samples. Remove them before denoising; they wreck denoisers (ch. 17).

- Clamp each sample's radiance to a ceiling. One line, removes fireflies, but loses energy and caustics; never on reference stills.
- Path regularization: after a path's first non-specular bounce, raise later surfaces' roughness, so a mirror seen indirectly turns glossy. Keeps a blurred caustic. three-gpu-pathtracer exposes this as `WebGLPathTracer.filterGlossyFactor` (0.0.28: typed in its `index.d.ts`, default 0, raises roughness by the roughness accumulated along the path; not described in its README, checked in the npm tarball 2026-11-20).
- Better founded: path-space regularization (Kaplanyan and Dachsbacher) and outlier rejection or reweighting of firefly samples (Zirr et al. 2018), cited by ch. 17; not written up here.

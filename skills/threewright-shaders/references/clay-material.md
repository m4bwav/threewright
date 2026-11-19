# Clay look on stock materials (onBeforeCompile)

WebGL path only. On `WebGPURenderer`, build the same thing as a TSL node material (`normalNode`, `roughnessNode`).

## Patch a stock material or write a ShaderMaterial?

- Patch `MeshStandardMaterial` (or Physical) with `onBeforeCompile` when you want a small change to a lit surface: a bumped normal, a roughness pattern, a tint. You keep three's lights, shadows, environment maps, fog, tone mapping and colour space for free, and they stay correct across releases as long as the chunk you hook still exists.
- Write a `ShaderMaterial` when the surface is not lit like PBR at all (toon, hologram, unlit effects) or you replace most of the shader. Then you own lighting, fog and output conversion yourself.
- Hook by replacing an `#include <chunk>` line with itself plus your code. Never edit the expanded source; it changes every release. Check the chunk names in the installed `three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js` after a three update (`TW lint` flags nothing here).

## The cache-key pitfall

three.js compiles one program per distinct key and shares it between materials. For a patched material the key includes `customProgramCacheKey()`, which by default returns `onBeforeCompile.toString()`. So two materials that share one patch function but inject different GLSL (a variant chosen from a closure variable or a parameter) get the same key, and the second silently draws with the first's program. Uniform values are per material and are fine; different GLSL is not.

Fix: return a distinct key per variant, and put a version in it (`clay-v1:rings`). Bump the version whenever the injected GLSL changes, so a long-lived page, a hot reload or a material cache never mixes old and new programs. Check: `renderer.info.programs.length` grows by one per variant.

## Recipe

Fingerprint-like ridges: a sine of the distance from a point in the mesh's local space, used as a height and turned into a bumped normal with screen-space derivatives (Mikkelsen's surface gradient). Roughness about 0.98 and metalness 0 give dry clay; the ridge crests read slightly shinier. Two variants, `rings` (concentric whorl) and `lines` (parallel ridges), show why the key must differ.

```js
function makeClay({ color = 0xc8734f, variant = 'rings', period = 0.06, strength = 0.25 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.98, metalness: 0 });
  const uniforms = {
    uRidgePeriod: { value: period },
    uRidgeOffset: { value: new THREE.Vector2(0.11, -0.07) },
    uRidgeStrength: { value: strength },
  };
  mat.userData.clay = uniforms; // tweak later: mat.userData.clay.uRidgePeriod.value = 0.05
  const ridgeCoord = variant === 'rings'
    ? 'length(vClayPos.xy + uRidgeOffset)'
    : 'dot(vClayPos.xy + uRidgeOffset, vec2(0.8, 0.6))';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vClayPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClayPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vClayPos;
uniform float uRidgePeriod;
uniform vec2 uRidgeOffset;
uniform float uRidgeStrength;
float clayRidge() { return sin(${ridgeCoord} / uRidgePeriod * 6.2831853); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor - 0.06 * max(clayRidge(), 0.0), 0.0, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float h = clayRidge() * uRidgeStrength * uRidgePeriod;
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  normal = normalize(abs(det) * normal - grad);
}`);
  };
  mat.customProgramCacheKey = () => 'clay-v1:' + variant;
  return mat;
}
```

Notes:
- The ridges follow local `xy`, so they stay put when the mesh moves. For a fingerprint pressed from one side, project on the axis the thumb came from; for whole-object ridges use a triplanar blend.
- `period` is in local units. Below about two pixels per period the derivatives alias into noise; fade `uRidgeStrength` with distance or `fwidth` if the camera pulls far back.
- Shadows and depth use separate materials, so they ignore the ridges (fine for a bump this small).
- Verified 2026-11-19 on three 0.186.1 with `tw check tests/fixtures/pages/clay`: both variants compile, `renderer.info.programs` shows a program per variant. Idea seen in a commercial web game demo; written fresh.

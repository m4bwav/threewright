---
title: FFT ocean with foam, buoyancy and quality tiers
slug: fft-ocean
kind: recipe
summary: A Tessendorf FFT ocean patch (choppy displacement, Jacobian foam) driving a TSL positionNode, a boat floated from 4 hull samples, and quality tiers that step down when frames run long.
tags: [tsl, positionNode, water, ocean, fft, buoyancy, quality-tiers, games]
applies_to: ">=r171"
status: current
renderer: webgpu
last_verified: 2026-11-11
sources: [https://www.reddit.com/r/aigamedev/comments/1vic0bw/]
related: [tsl, tsl-custom-material, tsl-loom-warp, fixed-timestep-loop]
template: html-webgpu
---

# FFT ocean with foam, buoyancy and quality tiers

## Goal

Large open water that looks like a sea, not a sum of a few sine waves, and that boats can float on. A Phillips spectrum is animated per wave number and turned into a height field with an inverse FFT (Tessendorf, "Simulating Ocean Water", SIGGRAPH 2004 course notes). Two more FFTs give the choppy horizontal shift that sharpens crests. Where that shift folds the surface (the Jacobian of the horizontal displacement drops toward 0) the crest breaks, so that is where foam goes. The idea set (FFT not Gerstner, Jacobian whitecaps, buoyancy from 4 hull samples read back one frame late, quality tiers with automatic downgrade) is from the web-ocean-3d demo on r/aigamedev (2026-07); its code had no stated licence, so the code here is threewright's own.

This version runs the FFT on the CPU (N = 32, 64 or 128) and uploads two half-float textures per frame. That keeps it short and lets buoyancy read the same field with no GPU readback. A GPU-compute FFT (TSL `compute()` passes) is the next step for N = 256 and up; see Notes.

## Code

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FFT ocean with foam and buoyancy</title>
  <style>
    html, body { margin: 0; height: 100%; background: #a9c3d6; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.webgpu.js",
      "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.tsl.js"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three/webgpu';
    import { mix, normalize, positionLocal, smoothstep, texture, transformNormalToView, uniform, uv, vec3 } from 'three/tsl';

    const renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    await renderer.init();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9c3d6);
    scene.fog = new THREE.Fog(0xa9c3d6, 150, 600);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 9, 26);
    camera.lookAt(0, 0, -10);
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x203040, 1.4));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(-30, 40, -60);
    scene.add(sun);

    // ---- Seeded random and a small radix-2 FFT (in place, length a power of two) ----
    let seed = 12345;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
    function fft(re, im, n) { // e^{+i}: inverse transform without 1/n
      for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
      }
      for (let len = 2; len <= n; len <<= 1) {
        const a = 2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
        for (let i = 0; i < n; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const p = i + k, q = p + len / 2;
            const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
            re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
            [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
          }
        }
      }
    }
    function ifft2(re, im, N, rowRe, rowIm) {
      for (let y = 0; y < N; y++) { // rows
        for (let x = 0; x < N; x++) { rowRe[x] = re[y * N + x]; rowIm[x] = im[y * N + x]; }
        fft(rowRe, rowIm, N);
        for (let x = 0; x < N; x++) { re[y * N + x] = rowRe[x]; im[y * N + x] = rowIm[x]; }
      }
      for (let x = 0; x < N; x++) { // columns
        for (let y = 0; y < N; y++) { rowRe[y] = re[y * N + x]; rowIm[y] = im[y * N + x]; }
        fft(rowRe, rowIm, N);
        for (let y = 0; y < N; y++) { re[y * N + x] = rowRe[y]; im[y * N + x] = rowIm[y]; }
      }
    }

    // ---- Tessendorf ocean patch: Phillips spectrum, choppy displacement, Jacobian foam ----
    const L = 128, g = 9.81, windDir = [0.8, 0.6], windSpeed = 18, choppy = 1.6, targetRms = 1.0;
    function makePatch(N) {
      const h0r = new Float32Array(N * N), h0i = new Float32Array(N * N), kx = new Float32Array(N * N), kz = new Float32Array(N * N);
      const Lw = windSpeed * windSpeed / g;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const n = i < N / 2 ? i : i - N, m = j < N / 2 ? j : j - N, id = j * N + i;
        kx[id] = 2 * Math.PI * n / L; kz[id] = 2 * Math.PI * m / L;
        const k = Math.hypot(kx[id], kz[id]);
        if (k < 1e-6) continue;
        const dot = (kx[id] * windDir[0] + kz[id] * windDir[1]) / k;
        const P = Math.exp(-1 / ((k * Lw) ** 2)) / k ** 4 * dot * dot * Math.exp(-((k * 0.1) ** 2));
        const s = Math.sqrt(P / 2);
        h0r[id] = gauss() * s; h0i[id] = gauss() * s;
      }
      const f = () => new Float32Array(N * N);
      const P = { N, h0r, h0i, kx, kz, hr: f(), hi: f(), xr: f(), xi: f(), zr: f(), zi: f(), rowRe: new Float32Array(N), rowIm: new Float32Array(N),
        height: f(), dx: f(), dz: f(), foam: f() };
      P.tex = new THREE.DataTexture(new Uint16Array(N * N * 4), N, N, THREE.RGBAFormat, THREE.HalfFloatType);
      P.nrm = new THREE.DataTexture(new Uint16Array(N * N * 4), N, N, THREE.RGBAFormat, THREE.HalfFloatType);
      for (const t of [P.tex, P.nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
      step(P, 0); // normalise amplitude so every tier has the same sea state
      let sum = 0; for (const v of P.height) sum += v * v;
      const scale = targetRms / Math.sqrt(sum / (N * N));
      for (let i = 0; i < N * N; i++) { h0r[i] *= scale; h0i[i] *= scale; }
      return P;
    }
    function step(P, t) {
      const { N, h0r, h0i, kx, kz, hr, hi, xr, xi, zr, zi } = P;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const id = j * N + i, mid = ((N - j) % N) * N + ((N - i) % N);
        const k = Math.hypot(kx[id], kz[id]), w = Math.sqrt(g * k) * t, c = Math.cos(w), s = Math.sin(w);
        // h(k,t) = h0(k) e^{iwt} + conj(h0(-k)) e^{-iwt}
        const ar = h0r[id] * c - h0i[id] * s + h0r[mid] * c - h0i[mid] * s;
        const ai = h0r[id] * s + h0i[id] * c - h0r[mid] * s - h0i[mid] * c;
        hr[id] = ar; hi[id] = ai;
        const ux = k > 1e-6 ? kx[id] / k : 0, uz = k > 1e-6 ? kz[id] / k : 0;
        xr[id] = ai * ux; xi[id] = -ar * ux; // -i * k/|k| * h
        zr[id] = ai * uz; zi[id] = -ar * uz;
      }
      ifft2(hr, hi, N, P.rowRe, P.rowIm); ifft2(xr, xi, N, P.rowRe, P.rowIm); ifft2(zr, zi, N, P.rowRe, P.rowIm);
      const d = L / N, td = P.tex.image.data, nd = P.nrm.image.data, H = THREE.DataUtils.toHalfFloat;
      for (let i = 0; i < N * N; i++) { P.height[i] = hr[i]; P.dx[i] = -choppy * xr[i]; P.dz[i] = -choppy * zr[i]; }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const id = j * N + i, ip = j * N + (i + 1) % N, im = j * N + (i + N - 1) % N, jp = ((j + 1) % N) * N + i, jm = ((j + N - 1) % N) * N + i;
        // Jacobian of the horizontal displacement: J < ~0.3 means the surface folds over a crest -> foam
        const dxdx = (P.dx[ip] - P.dx[im]) / (2 * d), dzdz = (P.dz[jp] - P.dz[jm]) / (2 * d);
        const dxdz = (P.dx[jp] - P.dx[jm]) / (2 * d), dzdx = (P.dz[ip] - P.dz[im]) / (2 * d);
        const J = (1 + dxdx) * (1 + dzdz) - dxdz * dzdx;
        P.foam[id] = Math.min(1, Math.max(0, (0.6 - J) / 0.6));
        td[id * 4] = H(P.dx[id]); td[id * 4 + 1] = H(P.height[id]); td[id * 4 + 2] = H(P.dz[id]); td[id * 4 + 3] = H(P.foam[id]);
        nd[id * 4] = H((P.height[ip] - P.height[im]) / (2 * d)); nd[id * 4 + 1] = H((P.height[jp] - P.height[jm]) / (2 * d));
      }
      P.tex.needsUpdate = true; P.nrm.needsUpdate = true;
    }

    // ---- Quality tiers: FFT size and mesh density; drop a tier when frames run long ----
    const TIERS = [{ N: 32, seg: 96 }, { N: 64, seg: 192 }, { N: 128, seg: 320 }];
    const SIZE = 640;
    const dispTex = texture(new THREE.DataTexture()), nrmTex = texture(new THREE.DataTexture());
    const repeat = uniform(SIZE / L);
    const tuv = uv().mul(repeat);
    const disp = dispTex.sample(tuv).level(0); // vertex stage: explicit LOD
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.25, metalness: 0 });
    mat.positionNode = positionLocal.add(vec3(disp.x, disp.z.negate(), disp.y)); // plane is in XY, rotated to XZ below
    const slope = nrmTex.sample(tuv);
    mat.normalNode = transformNormalToView(normalize(vec3(slope.x.negate(), slope.y.negate(), 1))); // object space: the plane's +Z is up
    const foam = smoothstep(0.15, 0.7, dispTex.sample(tuv).w);
    mat.colorNode = mix(vec3(0.02, 0.12, 0.17), vec3(0.92, 0.95, 0.97), foam);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    sea.rotation.x = -Math.PI / 2; sea.frustumCulled = false;
    scene.add(sea);

    let patch, tier = -1;
    function setTier(n) {
      n = Math.max(0, Math.min(TIERS.length - 1, n));
      if (n === tier) return;
      tier = n;
      const { N, seg } = TIERS[n];
      patch?.tex.dispose(); patch?.nrm.dispose();
      seed = 12345; patch = makePatch(N);
      dispTex.value = patch.tex; nrmTex.value = patch.nrm;
      sea.geometry.dispose(); sea.geometry = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg);
    }
    setTier(TIERS.length - 1);

    // ---- Buoyancy: 4 hull samples, read from the CPU field (the GPU version reads back one frame late) ----
    function heightAt(x, z) { // world XZ -> water height, bilinear, ignoring the small horizontal shift
      const { N, height } = patch, fx = (((x + SIZE / 2) / L) % 1 + 1) % 1 * N - 0.5, fz = (((SIZE / 2 - z) / L) % 1 + 1) % 1 * N - 0.5; // uv 0 is the plane's corner; v runs along -Z
      const i0 = (Math.floor(fx) + N) % N, j0 = (Math.floor(fz) + N) % N, tx = fx - Math.floor(fx), tz = fz - Math.floor(fz), i1 = (i0 + 1) % N, j1 = (j0 + 1) % N;
      const a = height[j0 * N + i0], b = height[j0 * N + i1], c = height[j1 * N + i0], e = height[j1 * N + i1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
    }
    const boat = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 7).translate(0, 0.3, 0), new THREE.MeshStandardNodeMaterial({ color: 0xa0522d }));
    boat.position.set(0, 0, 4);
    scene.add(boat);
    const hull = [[-1.4, -3.3], [1.4, -3.3], [-1.4, 3.3], [1.4, 3.3]];
    function float(dt) {
      const h = hull.map(([x, z]) => heightAt(boat.position.x + x, boat.position.z + z));
      const target = (h[0] + h[1] + h[2] + h[3]) / 4;
      const pitch = Math.atan2(((h[0] + h[1]) - (h[2] + h[3])) / 2, 6.6), roll = Math.atan2(((h[0] + h[2]) - (h[1] + h[3])) / 2, 2.8);
      const a = 1 - Math.exp(-dt * 4); // smooth: a hull has mass
      boat.position.y += (target - boat.position.y) * a;
      boat.rotation.x += (pitch - boat.rotation.x) * a;
      boat.rotation.z += (-roll - boat.rotation.z) * a;
    }

    // Auto-downgrade: mean frame interval over 90 frames above budget -> next tier down. Never upgrades on its own.
    const budgetMs = 1000 / 50;
    let frames = 0, acc = 0, last = performance.now(), t = 0;
    window.ocean = { setTier: (n) => setTier(n), get tier() { return tier; }, heightAt, boat, autoDowngrade: true };

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    renderer.setAnimationLoop(() => {
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1);
      last = now; t += dt;
      step(patch, t);
      float(dt);
      renderer.render(scene, camera);
      if (window.ocean.autoDowngrade && ++frames > 10) { // skip warm-up frames
        acc += dt * 1000;
        if (frames === 100) { if (acc / 90 > budgetMs && tier > 0) setTier(tier - 1); frames = 0; acc = 0; }
      }
    });
  </script>
</body>
</html>
```

The plane tiles one `L` = 128 m patch 5 times across 640 m; the tiling repeats are hidden by fog here. Mixing two patch sizes (for example 128 m and 37 m) hides them better.

## Verify

- Checked 2026-11-11 on the real WebGPU backend (Windows 11, Chrome headless, RTX 5060 Ti): `node scripts/tw.mjs check <page> --webgpu` gives `result: OK`, `renderer: WebGPURenderer (WebGPU)`, 3 draw calls, 204k triangles at the top tier; `tw lint` 0 errors, 0 warnings. A `tw shot` was looked at: a rolling sea with sun glitter and the boat riding it.
- `--eval` checks: `ocean.heightAt` returned heights between -1.0 and -0.1 m along a line, the boat's `y` followed the water under it, `ocean.setTier(0)` switched to N = 32 with no error.
- Unverified: foam was not visible in the still at this sea state (lower the `0.6` Jacobian threshold or raise `choppy` for more), the automatic downgrade did not fire on this GPU (it needs a slow device; force it by lowering `budgetMs`), and the WebGL 2 fallback was not checked.

## Notes

- Cost. Per frame at N = 128: 3 inverse 2D FFTs (768 1D FFTs of length 128) plus two 64k-texel half-float uploads. That is a few milliseconds of CPU; N = 64 is a quarter of it. Above 128, move the FFT to the GPU.
- GPU FFT and readback. With the field on the GPU, buoyancy needs the heights back on the CPU. Read the 4 hull samples (or a small region) with `renderer.getArrayBufferAsync()` and use them next frame. Never wait on the GPU inside the frame: one frame of lag is invisible on a boat with mass, a stall is not.
- Buoyancy here is kinematic: the boat eases toward the mean height of 4 samples and tilts to their slope. For physics, apply an upward force at each sample in proportion to its depth below the water instead (Rapier or Jolt `addForceAtPoint`).
- `heightAt` ignores the horizontal shift, so with high `choppy` a boat sits slightly off the drawn crest. Iterate once (sample, subtract the shift, sample again) if that shows.
- Tiers only step down, never up, so the sea does not flicker between tiers. Re-seed the spectrum on a tier change (done here) so the sea state stays the same.
- Normals come from height differences only; with strong chop they are a bit too soft. A fourth FFT of the slope gives exact normals.
- 2026-11-11: added from the technique harvest (post 1vic0bw).

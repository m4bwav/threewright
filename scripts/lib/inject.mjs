// Script injected into every page before its own scripts run.
// 1. Catches the objects three.js announces through the __THREE_DEVTOOLS__ hook
//    (Scene, WebGLRenderer, WebGPURenderer, AnimationMixer, Loader), so scenes can
//    be inspected with no cooperation from the page.
// 2. Wraps renderer.render to learn which scene and camera are really drawn.
// 3. Optionally replaces the clock (performance.now, Date.now, requestAnimationFrame)
//    with a virtual one so frames can be stepped exactly for video capture.
// 4. Exposes window.__tw helpers used by tw.mjs: summary(), tree(), sheet(), capture().
//
// Page contract (all optional): a page may set window.__tw.ready (a promise that
// resolves when assets are loaded), window.__tw.renderFrame(i, fps) (render frame i
// itself), window.__tw.duration (seconds) and window.__tw.fps.

export function injectScript({ clock = false } = {}) {
  return `(${pageMain.toString()})(${JSON.stringify({ clock })});`;
}

function pageMain(cfg) {
  const T = (window.__tw = window.__tw || {});
  T.version = 1;
  T.scenes = [];
  T.renderers = [];
  T.mixers = [];
  T.loaders = 0;
  T.errors = [];
  T.renderCalls = 0;
  T.last = null; // { renderer, scene, camera } of the most recent main render
  const cams = new Map(); // scene -> camera
  const screenRenders = new Map(); // scene -> renders to the default framebuffer

  function wrapRenderer(r) {
    if (r.__twWrapped || typeof r.render !== 'function') return;
    r.__twWrapped = true;
    const orig = r.render;
    r.render = function (scene, camera) {
      T.renderCalls++;
      if (scene && scene.isScene && camera && camera.isCamera) {
        cams.set(scene, camera);
        // Count only renders to the screen: PMREM, shadow and post passes draw into targets.
        let toScreen = true;
        try { toScreen = typeof this.getRenderTarget !== 'function' || this.getRenderTarget() === null; } catch { /* ignore */ }
        if (toScreen) {
          screenRenders.set(scene, (screenRenders.get(scene) || 0) + 1);
          if (mainScene() === scene) T.last = { renderer: this, scene, camera };
        }
      }
      return orig.apply(this, arguments);
    };
  }

  const hook = new EventTarget();
  hook.addEventListener('observe', (e) => {
    const o = e.detail;
    if (!o) return;
    if (o.isScene) T.scenes.push(o);
    else if (o.isWebGLRenderer || o.isWebGPURenderer || o.isRenderer || (typeof o.render === 'function' && o.domElement)) { T.renderers.push(o); wrapRenderer(o); }
    else if (typeof o.clipAction === 'function') T.mixers.push(o);
    else if (typeof o.load === 'function') T.loaders++;
  });
  hook.addEventListener('register', () => {});
  window.__THREE_DEVTOOLS__ = hook;

  window.addEventListener('error', (e) => T.errors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => T.errors.push('unhandled rejection: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));

  if (cfg.clock) {
    let now = 0;
    const epoch = Date.now();
    const queue = new Map();
    let qid = 0;
    const realPerfNow = performance.now.bind(performance);
    T.realNow = realPerfNow;
    performance.now = () => now;
    Date.now = () => epoch + now;
    window.requestAnimationFrame = (cb) => { const id = ++qid; queue.set(id, cb); return id; };
    window.cancelAnimationFrame = (id) => { queue.delete(id); };
    T.clock = true;
    // Advance virtual time and run the queued frame callbacks once.
    T.advance = (ms) => {
      now += ms;
      const cbs = [...queue.values()];
      queue.clear();
      for (const cb of cbs) { try { cb(now); } catch (err) { T.errors.push(String(err && err.stack || err)); } }
      return cbs.length;
    };
    T.time = () => now;
  }

  function descendants(o) { let n = 0; o.traverse(() => n++); return n; }

  // The main scene is the one drawn to the screen most often (the animation loop),
  // falling back to the largest rendered scene.
  function mainScene() {
    let best = null, bestN = -1;
    for (const [s, n] of screenRenders) if (n > bestN) { best = s; bestN = n; }
    if (best) return best;
    for (const s of T.scenes) {
      if (!cams.has(s)) continue;
      const n = descendants(s);
      if (n > bestN) { best = s; bestN = n; }
    }
    return best;
  }

  function target() {
    const scene = mainScene() || T.scenes[0] || null;
    const camera = scene ? cams.get(scene) || null : null;
    const renderer = (T.last && T.last.renderer) || T.renderers[0] || null;
    return { scene, camera, renderer };
  }
  T.target = target;

  const r2 = (v) => Math.round(v * 100) / 100;
  const vec = (v) => (v ? `${r2(v.x)},${r2(v.y)},${r2(v.z)}` : '');
  const hex = (c) => (c && typeof c.getHexString === 'function' ? '#' + c.getHexString() : undefined);

  function geomInfo(g) {
    if (!g) return null;
    const pos = g.attributes && g.attributes.position;
    const verts = pos ? pos.count : 0;
    const tris = g.index ? g.index.count / 3 : verts / 3;
    return { type: g.type, verts, tris: Math.round(tris), indexed: !!g.index, attrs: g.attributes ? Object.keys(g.attributes) : [] };
  }

  function matInfo(m) {
    if (!m) return null;
    if (Array.isArray(m)) return m.map(matInfo);
    const i = { type: m.type };
    if (hex(m.color)) i.color = hex(m.color);
    if (m.map) i.map = { cs: m.map.colorSpace || '(none)', img: !!(m.map.image || m.map.source && m.map.source.data) };
    if (m.transparent) i.transparent = true;
    if (m.opacity !== undefined && m.opacity < 1) i.opacity = r2(m.opacity);
    if (m.wireframe) i.wireframe = true;
    if (m.side === 1) i.side = 'back'; else if (m.side === 2) i.side = 'double';
    if (m.emissive && m.emissiveIntensity && m.emissive.getHex && m.emissive.getHex() !== 0) i.emissive = hex(m.emissive);
    if (m.isNodeMaterial) i.node = true;
    return i;
  }

  // Signature used to collapse runs of similar siblings in the tree.
  function sig(o) {
    return [o.type, o.geometry && o.geometry.type, o.material && (Array.isArray(o.material) ? 'multi' : o.material.type), o.children.length ? 'c' + o.children.length : ''].join('|');
  }

  function line(o) {
    const parts = [o.type + (o.name ? ` "${o.name}"` : '')];
    if (!o.visible) parts.push('HIDDEN');
    if (o.position && (o.position.x || o.position.y || o.position.z)) parts.push('pos ' + vec(o.position));
    if (o.scale && (o.scale.x !== 1 || o.scale.y !== 1 || o.scale.z !== 1)) parts.push('scale ' + vec(o.scale));
    if (o.isInstancedMesh) parts.push('instances ' + o.count);
    if (o.isBatchedMesh) parts.push('batched');
    if (o.isSkinnedMesh) parts.push('skinned bones ' + (o.skeleton ? o.skeleton.bones.length : 0));
    if (o.geometry) { const g = geomInfo(o.geometry); parts.push(`${g.type} v${g.verts}`); }
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      parts.push(ms.map((m) => { const i = matInfo(m); return [i.type, i.color, i.map ? 'map:' + i.map.cs : '', i.transparent ? 'transparent' : '', i.wireframe ? 'wire' : ''].filter(Boolean).join(' '); }).join(' / '));
    }
    if (o.isLight) parts.push(`intensity ${r2(o.intensity)} ${hex(o.color) || ''}${o.castShadow ? ' shadow' : ''}${o.distance ? ' dist ' + r2(o.distance) : ''}`);
    if (o.isCamera) parts.push(o.isPerspectiveCamera ? `fov ${r2(o.fov)} near ${o.near} far ${o.far}` : `ortho near ${o.near} far ${o.far}`);
    if (o.isSprite) parts.push('sprite');
    if (o.isPoints) parts.push('points');
    if (o.isLine) parts.push('line');
    return parts.join(' · ');
  }

  // Text tree of the main scene; long runs of similar siblings are collapsed.
  T.tree = (opts = {}) => {
    const maxDepth = opts.depth ?? 6;
    const maxLines = opts.max ?? 80;
    const { scene } = target();
    if (!scene) return '(no three.js scene observed: is three.js loaded, and was the scene rendered?)';
    const out = [];
    let truncated = 0;
    function walk(o, depth, prefix) {
      if (out.length >= maxLines) { truncated++; return; }
      out.push(prefix + line(o));
      if (depth >= maxDepth) { if (o.children.length) out.push(prefix + '  … ' + o.children.length + ' children (depth limit)'); return; }
      const kids = o.children;
      for (let i = 0; i < kids.length; ) {
        let j = i + 1;
        const s = sig(kids[i]);
        while (j < kids.length && sig(kids[j]) === s) j++;
        const run = j - i;
        if (run > 3) {
          walk(kids[i], depth + 1, prefix + '  ');
          if (out.length < maxLines) out.push(prefix + `  … and ${run - 1} more like it (${kids[i].type})`);
          i = j;
        } else { walk(kids[i], depth + 1, prefix + '  '); i++; }
      }
    }
    walk(scene, 0, '');
    if (truncated) out.push(`… ${truncated} more nodes not shown (raise --max)`);
    return out.join('\n');
  };

  function rendererInfo(r) {
    if (!r) return null;
    const i = { type: r.isWebGPURenderer ? 'WebGPURenderer' : r.isWebGLRenderer ? 'WebGLRenderer' : (r.constructor && r.constructor.name) || 'renderer' };
    if (r.isWebGPURenderer || r.backend) {
      const b = r.backend;
      i.backend = b ? (b.isWebGPUBackend ? 'WebGPU' : b.isWebGLBackend ? 'WebGL2 fallback' : (b.constructor && b.constructor.name)) : 'unknown';
    }
    try { const s = r.domElement; i.canvas = s ? `${s.width}x${s.height}` : null; i.inDom = !!(s && s.isConnected); } catch { /* ignore */ }
    try { i.pixelRatio = r.getPixelRatio(); } catch { /* ignore */ }
    if (r.outputColorSpace !== undefined) i.outputColorSpace = r.outputColorSpace;
    if (r.toneMapping !== undefined) i.toneMapping = r.toneMapping;
    if (r.shadowMap) i.shadows = !!r.shadowMap.enabled;
    const info = r.info || {};
    const rd = info.render || {};
    i.drawCalls = rd.calls ?? rd.drawCalls ?? null;
    i.triangles = rd.triangles ?? null;
    if (info.memory) { i.geometries = info.memory.geometries; i.textures = info.memory.textures; }
    if (info.programs) i.programs = info.programs.length;
    return i;
  }

  function sceneStats(scene) {
    const types = {};
    let verts = 0, tris = 0, meshes = 0, lights = 0, lit = 0, instances = 0;
    const materials = new Set(), textures = new Set(), geometries = new Set();
    const warn = [];
    let colorMapNoSRGB = 0, shadowCasterLights = 0;
    scene.traverse((o) => {
      types[o.type] = (types[o.type] || 0) + 1;
      if (o.isLight) { lights++; if (o.castShadow) shadowCasterLights++; }
      if (o.geometry) {
        geometries.add(o.geometry);
        const g = geomInfo(o.geometry);
        const mult = o.isInstancedMesh ? o.count : 1;
        if (o.isInstancedMesh) instances += o.count;
        verts += g.verts * mult; tris += g.tris * mult;
      }
      if (o.isMesh) meshes++;
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          if (/Standard|Physical|Lambert|Phong|Toon/.test(m.type)) lit++;
          for (const k of ['map', 'emissiveMap']) {
            const t = m[k];
            if (t) { textures.add(t); if (t.colorSpace !== 'srgb' && !t.isRenderTargetTexture && !t.isDataTexture) colorMapNoSRGB++; }
          }
          for (const k of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'envMap', 'bumpMap', 'displacementMap']) if (m[k]) textures.add(m[k]);
        }
      }
    });
    if (lit > 0 && lights === 0 && !scene.environment && !(scene.environmentNode)) warn.push('lit materials but no lights and no scene.environment: meshes will render black');
    if (colorMapNoSRGB) warn.push(`${colorMapNoSRGB} color map(s) not tagged SRGBColorSpace: colors will look washed out (set texture.colorSpace = THREE.SRGBColorSpace; GLTFLoader does this for you)`);
    return { types, meshes, lights, verts, tris, instances, materials: materials.size, textures: textures.size, geometries: geometries.size, background: scene.background ? (scene.background.isColor ? '#' + scene.background.getHexString() : scene.background.isTexture ? 'texture' : 'set') : null, environment: !!(scene.environment || scene.environmentNode), fog: scene.fog ? scene.fog.type || 'fog' : null, warn, shadowCasterLights };
  }

  function boundsOf(scene) {
    const { scene: s } = { scene };
    let box = null;
    s.traverse((o) => {
      if (!o.visible || !o.geometry) return;
      const g = o.geometry;
      if (!g.boundingBox) { try { g.computeBoundingBox(); } catch { return; } }
      if (!g.boundingBox || g.boundingBox.isEmpty()) return;
      const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
      if (o.isInstancedMesh && typeof o.computeBoundingBox === 'function') { try { o.computeBoundingBox(); if (o.boundingBox) b.copy(o.boundingBox).applyMatrix4(o.matrixWorld); } catch { /* ignore */ } }
      box = box ? box.union(b) : b;
    });
    return box;
  }

  // Compact JSON summary: renderer, scene stats, camera, bounds, runtime warnings.
  T.summary = () => {
    const { scene, camera, renderer } = target();
    const out = {
      three: window.__THREE__ || null,
      scenes: T.scenes.length,
      renderers: T.renderers.map(rendererInfo),
      mixers: T.mixers.length,
      renderCalls: T.renderCalls,
      errors: T.errors.slice(0, 10),
    };
    if (!scene) { out.warn = ['no three.js scene observed (three.js not loaded, a second copy of three, or nothing rendered yet)']; return out; }
    scene.updateMatrixWorld(true);
    const st = sceneStats(scene);
    out.scene = st;
    const warn = st.warn.slice();
    const box = boundsOf(scene);
    if (box) {
      const c = box.getCenter(box.min.clone()), s = box.getSize(box.min.clone());
      out.bounds = { center: vec(c), size: vec(s) };
      if (camera) {
        camera.updateMatrixWorld(true);
        const p = c.clone().project(camera);
        const inView = Math.abs(p.x) <= 1.2 && Math.abs(p.y) <= 1.2 && p.z >= -1 && p.z <= 1;
        const dist = camera.position.distanceTo(c);
        const radius = s.length() / 2;
        if (!inView) warn.push('the scene center is outside the camera view: check camera position and lookAt');
        if (camera.isPerspectiveCamera) {
          if (dist + radius < camera.near || dist - radius > camera.far) warn.push('the scene lies outside the camera near/far range');
          if (camera.far / camera.near > 1e6) warn.push(`near/far ratio ${Math.round(camera.far / camera.near)} risks z-fighting (raise near)`);
          const fit = radius / Math.tan((camera.fov * Math.PI) / 360);
          if (dist < radius * 0.5) warn.push('the camera is inside the scene bounds');
          else if (dist > fit * 12) warn.push('the scene is very small in view (camera far away)');
        }
      }
    } else warn.push('no visible geometry with a bounding box');
    if (camera) out.camera = { type: camera.type, pos: vec(camera.position), fov: camera.fov, near: camera.near, far: camera.far, aspect: camera.aspect && r2(camera.aspect) };
    else warn.push('no camera seen in renderer.render calls yet');
    const ri = rendererInfo(renderer);
    if (ri) {
      if (ri.inDom === false) warn.push('renderer canvas is not attached to the document');
      if (ri.canvas && /^(0x|\d+x0)/.test(ri.canvas)) warn.push('renderer canvas has zero size');
      if (st.shadowCasterLights && ri.shadows === false) warn.push('a light casts shadows but renderer.shadowMap.enabled is false');
      if (camera && camera.isPerspectiveCamera && renderer.domElement) {
        const a = renderer.domElement.width / renderer.domElement.height;
        if (camera.aspect && Math.abs(a - camera.aspect) > 0.02) warn.push(`camera.aspect ${r2(camera.aspect)} does not match the canvas ${r2(a)}: call camera.updateProjectionMatrix() after resizing`);
      }
      if (ri.drawCalls > 1000) warn.push(`${ri.drawCalls} draw calls per frame: merge, instance or batch`);
    }
    if (st.tris > 5e6) warn.push(`${Math.round(st.tris / 1e6)}M triangles: heavy for mobile`);
    if (T.scenes.length > 1 && window.__THREE__ === undefined) warn.push('several scenes but no __THREE__ revision');
    out.warn = warn;
    return out;
  };

  // Current main canvas as a PNG data URL (call in the same task as the render).
  T.capture = (type = 'image/png', quality) => {
    const { renderer } = target();
    const c = renderer && renderer.domElement;
    return c ? c.toDataURL(type, quality) : null;
  };

  // Contact sheet: render the main scene from several angles into one image.
  T.sheet = (opts = {}) => {
    const { scene, camera, renderer } = target();
    if (!scene || !camera || !renderer) return null;
    const views = opts.views || ['current', 'front', 'right', 'top'];
    const tileW = opts.tileW || 480, tileH = opts.tileH || 270;
    const cols = Math.min(views.length, opts.cols || 2), rows = Math.ceil(views.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = tileW * cols; sheet.height = tileH * rows;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const box = boundsOf(scene);
    const center = box ? box.getCenter(box.min.clone()) : camera.position.clone().set(0, 0, 0);
    const size = box ? box.getSize(box.min.clone()).length() : 10;
    const saved = { pos: camera.position.clone(), quat: camera.quaternion.clone(), up: camera.up.clone(), zoom: camera.zoom };
    const dist = camera.isPerspectiveCamera ? (size / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.15 : camera.position.distanceTo(center);
    const dirs = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001], iso: [1, 0.8, 1] };
    views.forEach((v, idx) => {
      if (v !== 'current') {
        const d = dirs[v] || dirs.iso;
        const len = Math.hypot(d[0], d[1], d[2]);
        camera.position.set(center.x + (d[0] / len) * dist, center.y + (d[1] / len) * dist, center.z + (d[2] / len) * dist);
        camera.up.set(0, 1, 0);
        camera.lookAt(center);
      }
      camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      const x = (idx % cols) * tileW, y = Math.floor(idx / cols) * tileH;
      const src = renderer.domElement;
      const s = Math.min(tileW / src.width, tileH / src.height);
      const w = src.width * s, h = src.height * s;
      ctx.drawImage(src, x + (tileW - w) / 2, y + (tileH - h) / 2, w, h);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y, 70, 18);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText(v, x + 5, y + 13);
      camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat); camera.up.copy(saved.up);
    });
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
    return sheet.toDataURL('image/png');
  };
}

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
  T.screenRenders = 0;
  const cams = new Map(); // scene -> Map(camera -> { n, screen })
  // scene -> { frames: distinct animation frames it was rendered in, screen: renders to the canvas, last: frame id }
  const use = new Map();
  let frameId = 0; // bumped once per animation frame (see the requestAnimationFrame wrapper below)

  function wrapRenderer(r) {
    if (r.__twWrapped || typeof r.render !== 'function') return;
    r.__twWrapped = true;
    const orig = r.render;
    r.render = function (scene, camera) {
      T.renderCalls++;
      let toScreen = true;
      try { toScreen = typeof this.getRenderTarget !== 'function' || this.getRenderTarget() === null; } catch { /* ignore */ }
      // Screen passes of the latest frame, replayed by capture() when a render-on-demand
      // page drew nothing since (a composer's last pass renders a Mesh, not a Scene).
      if (toScreen && scene && scene.isObject3D && camera && camera.isCamera) {
        T.screenRenders++;
        if (this.__twFrame !== frameId) { this.__twFrame = frameId; this.__twPasses = []; }
        this.__twPasses.push([scene, camera]);
      }
      if (scene && scene.isScene && camera && camera.isCamera) {
        const u0 = use.get(scene) || { frames: 0, screen: 0, last: -1, env: true };
        if (u0.last !== frameId) { u0.frames++; u0.last = frameId; }
        if (toScreen) u0.screen++;
        // Environment scenes are only ever seen through a CubeCamera (PMREM, reflections).
        if (!(camera.parent && camera.parent.isCubeCamera)) u0.env = false;
        u0.renderer = this;
        use.set(scene, u0);
        let m = cams.get(scene);
        if (!m) cams.set(scene, (m = new Map()));
        const u = m.get(camera) || { n: 0, screen: 0 };
        u.n++; if (toScreen) u.screen++;
        m.set(camera, u);
      }
      return orig.apply(this, arguments);
    };
  }

  // Share the three.js DevTools hook when an extension already installed one; otherwise make it.
  const existing = window.__THREE_DEVTOOLS__;
  const hook = existing && typeof existing.addEventListener === 'function' ? existing : new EventTarget();
  hook.addEventListener('observe', (e) => {
    const o = e.detail;
    if (!o) return;
    if (o.isScene) T.scenes.push(o);
    else if (o.isWebGLRenderer || o.isWebGPURenderer || o.isRenderer || (typeof o.render === 'function' && o.domElement)) { T.renderers.push(o); wrapRenderer(o); }
    else if (typeof o.clipAction === 'function') T.mixers.push(o);
    else if (typeof o.load === 'function') T.loaders++;
  });
  hook.addEventListener('register', () => {});
  if (hook !== existing) window.__THREE_DEVTOOLS__ = hook;

  // Keep each shader's source for tw shaders: three deletes shaders right after linking,
  // and a deleted shader can no longer be read back.
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    const src = C.prototype.shaderSource;
    C.prototype.shaderSource = function (shader, source) {
      try { shader.__twSource = source; } catch { /* ignore */ }
      return src.apply(this, arguments);
    };
  }

  window.addEventListener('error', (e) => T.errors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => T.errors.push('unhandled rejection: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));

  // Count animation frames so a scene rendered once (an environment, a baked
  // texture) never outranks the scene the loop renders every frame.
  const wrapRaf = () => {
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      return raf.call(window, (t) => { if (T._rafTime !== t) { T._rafTime = t; frameId++; } return cb(t); });
    };
  };

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
  wrapRaf();

  function descendants(o) { let n = 0; o.traverse(() => n++); return n; }

  // The main scene: rendered in the most animation frames (the loop), then one
  // drawn straight to the canvas (with post-processing the canvas gets a quad and
  // the scene goes to a target), never an environment seen only by a CubeCamera
  // when anything else exists, then the largest.
  function mainScene() {
    let best = null, bestKey = -1;
    for (const [s, u] of use) {
      const key = (u.env ? 0 : 1) * 1e12 + Math.min(u.frames, 1e5) * 1e6 + (u.screen ? 1 : 0) * 1e5 + Math.min(descendants(s), 99999);
      if (key > bestKey) { best = s; bestKey = key; }
    }
    return best;
  }

  // Lights render the scene from their shadow cameras (WebGPURenderer does it
  // through renderer.render), so those never count as the view camera.
  function shadowCameras(scene) {
    const s = new Set();
    scene.traverse((o) => {
      const sh = o.isLight && o.shadow;
      if (!sh) return;
      if (sh.camera) s.add(sh.camera);
      if (Array.isArray(sh._cameras)) sh._cameras.forEach((c) => s.add(c)); // SunLight cascades
    });
    return s;
  }

  // The view camera: most screen renders, then most renders, then one that
  // lives in the scene graph or is perspective (internal cameras are neither).
  function cameraFor(scene) {
    const m = cams.get(scene);
    if (!m || !m.size) return null;
    const skip = shadowCameras(scene);
    let best = null, bestKey = -1;
    for (const [c, u] of m) {
      if (skip.has(c)) continue;
      const key = u.screen * 1e9 + u.n * 4 + (c.parent ? 2 : 0) + (c.isPerspectiveCamera ? 1 : 0);
      if (key > bestKey) { best = c; bestKey = key; }
    }
    return best || m.keys().next().value;
  }

  function target() {
    const scene = mainScene() || T.scenes[0] || null;
    const camera = scene ? cameraFor(scene) : null;
    const renderer = (scene && use.get(scene) && use.get(scene).renderer) || T.renderers[0] || null;
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
    if (m.map) {
      // DataTexture and friends default to NoColorSpace (''); say so rather than '(none)', which read as 'no map'.
      const t = m.map, kind = ['Data', 'Canvas', 'Video', 'Compressed', 'DataArray', 'Depth', 'Cube', 'RenderTarget'].find((k) => t['is' + k + 'Texture']);
      i.map = { cs: t.colorSpace || 'NoColorSpace', img: !!(t.image || t.source && t.source.data) };
      if (kind) i.map.kind = kind + 'Texture';
    }
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
      parts.push(ms.map((m) => { const i = matInfo(m); return [i.type, i.color, i.map ? 'map:' + (i.map.kind ? i.map.kind + '/' : '') + i.map.cs : '', i.transparent ? 'transparent' : '', i.wireframe ? 'wire' : ''].filter(Boolean).join(' '); }).join(' / '));
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
    if (r.toneMapping !== undefined) i.toneMapping = ['None', 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic', 'Custom', 'AgX', 'Neutral'][r.toneMapping] || r.toneMapping;
    if (r.shadowMap) i.shadows = r.shadowMap.enabled ? (['Basic', 'PCF', 'PCFSoft', 'VSM'][r.shadowMap.type] || true) : false;
    const info = r.info || {};
    const rd = info.render || {};
    // WebGPURenderer: render.drawCalls is per frame and render.calls counts render() calls since start.
    i.drawCalls = rd.drawCalls ?? rd.calls ?? null;
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

  // Backdrop: sky domes, moons and star fields that would stretch the bounds far past
  // the subject. An object is backdrop when a built-in material opts out of the scene's
  // fog, or (with a perspective camera) when it sits beyond a third of camera.far or
  // spans more than half of it. Custom ShaderMaterials default to fog: false, so only
  // built-in materials count for the fog test.
  function isBackdrop(o, b, scene, camera) {
    const mats = [].concat(o.material || []);
    if (scene.fog && mats.length && mats.every((m) => m && m.fog === false && !m.isShaderMaterial)) return true;
    if (camera && camera.isPerspectiveCamera && camera.far) {
      const c = b.getCenter(b.min.clone()), size = b.getSize(b.min.clone()).length();
      if (size > camera.far * 0.5 || camera.position.distanceTo(c) - size / 2 > camera.far / 3) return true;
    }
    return false;
  }

  // World bounds of the visible geometry, without backdrop objects unless nothing else
  // is left. Returns the box (or null); box.backdrop counts the objects left out.
  function boundsOf(scene, camera) {
    let box = null, all = null, backdrop = 0;
    scene.traverse((o) => {
      if (!o.visible || !o.geometry) return;
      const g = o.geometry;
      if (!g.boundingBox) { try { g.computeBoundingBox(); } catch { return; } }
      if (!g.boundingBox || g.boundingBox.isEmpty()) return;
      const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
      if ((o.isInstancedMesh || o.isGaussianSplat) && typeof o.computeBoundingBox === 'function') { try { o.computeBoundingBox(); if (o.boundingBox) b.copy(o.boundingBox).applyMatrix4(o.matrixWorld); } catch { /* ignore */ } }
      all = all ? all.union(b.clone()) : b.clone();
      if (isBackdrop(o, b, scene, camera)) { backdrop++; return; }
      box = box ? box.union(b) : b;
    });
    if (!box) return all;
    box.backdrop = backdrop;
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
    if (camera) camera.updateMatrixWorld(true);
    const box = boundsOf(scene, camera);
    if (box) {
      const c = box.getCenter(box.min.clone()), s = box.getSize(box.min.clone());
      out.bounds = { center: vec(c), size: vec(s), ...(box.backdrop ? { backdrop: box.backdrop } : {}) };
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
          // Wide, flat bounds are a landscape or floor the viewer stands on: being inside is normal.
          const flat = s.y < 0.25 * Math.max(s.x, s.z);
          if (dist < radius * 0.5 && !flat) warn.push('the camera is inside the scene bounds');
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
        // The projection matrix is what renders: e[5] / e[0] is its aspect (zoom cancels out).
        // camera.aspect alone misses a resize that set aspect but never called updateProjectionMatrix().
        const e = camera.projectionMatrix && camera.projectionMatrix.elements;
        const pa = e && e[0] ? e[5] / e[0] : camera.aspect;
        const offset = camera.view && camera.view.enabled;
        if (!offset && pa && Math.abs(a - pa) / a > 0.02) {
          warn.push(camera.aspect && Math.abs(a - camera.aspect) / a <= 0.02
            ? `camera.aspect is ${r2(camera.aspect)} but the projection matrix still uses ${r2(pa)}: call camera.updateProjectionMatrix() after setting aspect`
            : `camera aspect ${r2(pa)} does not match the canvas ${r2(a)}: on resize set camera.aspect = width / height, then call camera.updateProjectionMatrix()`);
        }
      }
      if (ri.drawCalls > 1000) warn.push(`${ri.drawCalls} draw calls per frame: merge, instance or batch`);
    }
    if (st.tris > 5e6) warn.push(`${Math.round(st.tris / 1e6)}M triangles: heavy for mobile`);
    if (T.scenes.length > 1 && window.__THREE__ === undefined) warn.push('several scenes but no __THREE__ revision');
    out.warn = warn;
    return out;
  };

  // Current main canvas as a PNG data URL (call in the same task as the render).
  // since: T.screenRenders before the step; if nothing reached the screen after it, the
  // drawing buffer is already cleared, so the last frame's screen passes are drawn again.
  T.capture = (type = 'image/png', quality, since) => {
    const { renderer } = target();
    const c = renderer && renderer.domElement;
    if (c && since !== undefined && T.screenRenders === since && renderer.__twPasses) {
      for (const [s, cam] of renderer.__twPasses) renderer.render(s, cam);
    }
    return c ? c.toDataURL(type, quality) : null;
  };

  // Name tags for --labels: the projected centre of each visible mesh, points, line or
  // sprite big enough to see, named by itself or its nearest named ancestor (else its
  // type). Duplicates become one tag "name xN" on the largest. x and y are 0..1 of the view.
  T.labels = (cam, opts = {}) => {
    const { scene, camera } = target();
    cam = cam || camera;
    if (!scene || !cam) return [];
    const H = opts.height || 540, minPx = opts.minPx ?? 6, max = opts.max ?? 24;
    scene.updateMatrixWorld(); cam.updateMatrixWorld();
    const c = cam.position.clone(), camPos = cam.position.clone().setFromMatrixPosition(cam.matrixWorld);
    const groups = new Map();
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      let named = o;
      while (named && !named.name) named = named.parent;
      const text = named && named !== scene ? named.name : o.type;
      const g = o.geometry;
      if (g && !g.boundingSphere && g.computeBoundingSphere) g.computeBoundingSphere();
      const bs = g && g.boundingSphere;
      c.copy(bs ? bs.center : c.set(0, 0, 0)).applyMatrix4(o.matrixWorld);
      const radius = (bs ? bs.radius : 0.5) * o.matrixWorld.getMaxScaleOnAxis();
      const dist = c.distanceTo(camPos);
      const px = cam.isPerspectiveCamera ? (radius / Math.max(1e-6, dist * Math.tan((cam.fov * Math.PI) / 360))) * (H / 2)
        : (radius * cam.zoom / Math.max(1e-6, (cam.top - cam.bottom) / 2)) * (H / 2);
      c.project(cam);
      if (px < minPx || c.z > 1 || c.z < -1 || Math.abs(c.x) > 1 || Math.abs(c.y) > 1) return;
      const e = groups.get(text) || { text, n: 0, px: -1 };
      e.n++;
      if (px > e.px) { e.px = px; e.x = (c.x + 1) / 2; e.y = (1 - c.y) / 2; }
      groups.set(text, e);
    });
    // Largest first; a tag that would overlap a placed one moves down a line.
    const W = opts.width || H * 16 / 9, placed = [];
    return [...groups.values()].sort((a, b) => b.px - a.px).slice(0, max).map((e) => {
      const text = e.n > 1 ? `${e.text} x${e.n}` : e.text, w = text.length * 6.5 + 8;
      const X = e.x * W;
      let Y = e.y * H;
      while (placed.some((p) => Math.abs(p.X - X) < (p.w + w) / 2 && Math.abs(p.Y - Y) < 16)) Y += 17;
      placed.push({ X, Y, w });
      return { text, x: r2(e.x), y: r2(Y / H) };
    });
  };

  // WebGL programs with their materials, link status, logs and sources (tw shaders).
  T.shaders = () => {
    const { renderer, scene } = target();
    if (!renderer) return { error: 'no renderer observed' };
    if (!renderer.getContext || !renderer.properties || !renderer.info || !Array.isArray(renderer.info.programs)) {
      return { backend: 'webgpu', programs: [], note: 'WebGPURenderer compiles WGSL per pipeline; its errors reach tw check as [fragment error] and [vertex error] messages. Program listing is WebGL only.' };
    }
    const gl = renderer.getContext();
    const owners = new Map(), mats = new Set();
    for (const s of T.scenes.concat(scene ? [scene] : [])) s.traverse((o) => [].concat(o.material || []).forEach((m) => mats.add(m)));
    for (const m of mats) {
      const cp = renderer.properties.get(m).currentProgram;
      if (!cp) continue;
      if (!owners.has(cp)) owners.set(cp, []);
      owners.get(cp).push(m.name ? `${m.type} "${m.name}"` : m.type);
    }
    return {
      backend: 'webgl',
      programs: renderer.info.programs.map((p) => {
        const d = p.diagnostics;
        return {
          id: p.id, type: p.type, name: p.name || '', usedTimes: p.usedTimes, materials: owners.get(p) || [],
          linked: !!gl.getProgramParameter(p.program, gl.LINK_STATUS),
          programLog: d ? d.programLog : (gl.getProgramInfoLog(p.program) || '').trim(),
          vertex: { log: d ? d.vertexShader.log : '', source: p.vertexShader.__twSource || '' },
          fragment: { log: d ? d.fragmentShader.log : '', source: p.fragmentShader.__twSource || '' },
        };
      }),
    };
  };

  function drawTags(ctx, tags, x0, y0, w, h) {
    ctx.font = '11px sans-serif'; ctx.textBaseline = 'middle';
    for (const t of tags) {
      const x = x0 + t.x * w, y = y0 + t.y * h, tw = ctx.measureText(t.text).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - tw / 2, y - 8, tw, 16);
      ctx.fillStyle = '#ffeb3b'; ctx.fillText(t.text, x - tw / 2 + 4, y);
    }
  }

  // Contact sheet: render the main scene from several angles into one image.
  T.sheet = (opts = {}) => {
    const { scene, camera, renderer } = target();
    if (!scene || !camera || !renderer) return null;
    // opts.steps (sheet --sweep): [{ label, set }], one tile each from the current view.
    const steps = opts.steps;
    const views = steps ? steps.map((st) => st.label) : opts.views || ['current', 'front', 'right', 'top'];
    T.sheetLabels = [];
    const tileW = opts.tileW || 480, tileH = opts.tileH || 270;
    const cols = Math.min(views.length, opts.cols || 2), rows = Math.ceil(views.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = tileW * cols; sheet.height = tileH * rows;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const box = boundsOf(scene, camera);
    const center = box ? box.getCenter(box.min.clone()) : camera.position.clone().set(0, 0, 0);
    const size = box ? box.getSize(box.min.clone()).length() : 10;
    const saved = { pos: camera.position.clone(), quat: camera.quaternion.clone(), up: camera.up.clone(), zoom: camera.zoom };
    const dist = camera.isPerspectiveCamera ? (size / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.15 : camera.position.distanceTo(center);
    const dirs = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001], iso: [1, 0.8, 1] };
    views.forEach((v, idx) => {
      if (steps) steps[idx].set();
      else if (v !== 'current') {
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
      if (opts.labels) {
        const tags = T.labels(camera, { width: w, height: h });
        drawTags(ctx, tags, x + (tileW - w) / 2, y + (tileH - h) / 2, w, h);
        T.sheetLabels.push(`${v}: ${tags.map((t) => t.text).join(', ') || '(none)'}`);
      }
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y, Math.max(70, ctx.measureText(v).width + 10), 18);
      ctx.fillStyle = '#fff'; ctx.fillText(v, x + 5, y + 13);
      camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat); camera.up.copy(saved.up);
    });
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
    return sheet.toDataURL('image/png');
  };
}

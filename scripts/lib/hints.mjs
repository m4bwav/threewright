// One-line fixes for errors that three.js pages commonly hit. `tw check` prints
// the hint under the error so an agent does not have to research the message.

export const HINTS = [
  [/GPUTextureComponentSwizzle/, 'this browser\'s WebGPU predates three r186 (texture view swizzle): use a current Chrome, or drop --webgpu to test the WebGL 2 fallback'],
  [/Failed to resolve module specifier "three(\/[^"]*)?"/, 'the import map lacks an entry for this specifier; addons import bare "three", so map "three" (and "three/addons/", "three/webgpu", "three/tsl" as used)'],
  [/Cannot use import statement outside a module/, 'the script needs type="module"'],
  [/THREE is not defined/, 'a script uses the global THREE, which no build provides since r160: import * as THREE from "three" in a module script'],
  [/Multiple instances of Three\.js being imported/, 'two copies of three are loaded: map "three" and "three/webgpu" to the same file, and do not mix a CDN copy with a bundled one'],
  [/called before the backend is initialized|before the backend is initialized/, 'call await renderer.init() after creating WebGPURenderer and before PMREM, compute or render calls'],
  [/Error creating WebGL context|WebGL context could not be created|WebGL2 is not available|WebGL 2 not supported/, 'no WebGL here: run with --gl swiftshader (software) or on a machine with a GPU'],
  [/(Geometry|WebGL1Renderer|ImageUtils|FontLoader|TextGeometry|OBJLoader|GLTFLoader|OrbitControls|EffectComposer) is not a constructor|THREE\.(Geometry|WebGL1Renderer)/, 'a removed or unimported API: run tw lint on the source; addons come from "three/addons/..." imports, not from THREE.*'],
  [/examples\/js\/|three\.min\.js|build\/three\.js\b/, 'the UMD builds and examples/js were removed (r148, r160): use the module build with an import map, or a bundler'],
  [/No DRACOLoader instance provided|KHR_draco_mesh_compression/, 'the model is Draco compressed: gltfLoader.setDRACOLoader(new DRACOLoader().setDecoderPath(...))'],
  [/setKTX2Loader must be called|KHR_texture_basisu/, 'the model uses KTX2 textures: gltfLoader.setKTX2Loader(new KTX2Loader().setTranscoderPath(...).detectSupport(renderer))'],
  [/setMeshoptDecoder must be called|EXT_meshopt_compression/, 'the model is meshopt compressed: gltfLoader.setMeshoptDecoder(MeshoptDecoder)'],
  [/Texture marked for update but no image data found/, 'a texture has no image yet: wait for the loader callback, or check the texture URL (see FAILED REQUESTS)'],
  [/Context Lost|CONTEXT_LOST_WEBGL/, 'the GPU context was lost: too much memory or a driver reset; reduce texture sizes and dispose unused resources'],
  [/ShaderMaterial is not supported|onBeforeCompile.*not supported|does not support.*ShaderMaterial/i, 'WebGPURenderer needs node materials: rewrite the GLSL ShaderMaterial in TSL, or use WebGLRenderer'],
  [/Clock: This module has been deprecated/, 'THREE.Clock is deprecated since r183: use THREE.Timer (timer.update() once per frame, then getDelta()/getElapsed())'],
  [/"PostProcessing" has been renamed to "RenderPipeline"/, 'PostProcessing was renamed RenderPipeline in r183'],
  [/renderAsync\(\)" has been deprecated|Async\(\)" is deprecated/, 'the *Async methods are deprecated since r181: await renderer.init() once, then call the sync method'],
  [/CORS|blocked by CORS policy|Cross-Origin Read Blocking/, 'the asset host does not allow cross-origin loads: serve the file from the page\'s own origin or a CORS-enabled CDN'],
  [/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/, 'a host is unreachable from here: pinned jsDelivr and unpkg files can be served from node_modules or npm (tw --cdn auto or offline); other assets should be local'],
];

// Unique hints for a list of message strings.
export function hintsFor(messages) {
  const out = [];
  for (const m of messages) {
    for (const [re, hint] of HINTS) {
      if (re.test(m) && !out.includes(hint)) out.push(hint);
    }
  }
  return out;
}

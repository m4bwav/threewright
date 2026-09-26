import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// threewright's page contract: tw check, shot and video wait for
// window.__tw.ready, when the page sets it, before they inspect or capture.
declare global {
  interface Window {
    __tw?: { ready?: Promise<void> };
  }
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
// Cap the pixel ratio at 2: phones report 3 or more, which costs a lot of fill rate for little gain.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // outputColorSpace is SRGBColorSpace by default
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1d22);
// Image-based light from a generated room: PBR materials look right with no HDR download.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2.2, 4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true;

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(4, 6, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.5, 0.16, 160, 24),
  new THREE.MeshStandardMaterial({ color: 0x3fa7ff, metalness: 0.3, roughness: 0.35 }),
);
knot.name = 'knot';
knot.position.y = 0.9;
knot.castShadow = true;
scene.add(knot);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3, 64),
  new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.9 }),
);
ground.name = 'ground';
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Timer replaces the deprecated Clock (r183). Drive motion from elapsed time,
// never from a per-frame increment, so any frame rate and frame-by-frame video
// capture look the same. connect() pauses it while the tab is hidden.
const timer = new THREE.Timer();
timer.connect(document);
let firstFrame = true;
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const t = timer.getElapsed();
  knot.rotation.set(t * 0.4, t * 0.6, 0);
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    // Set it once a frame is drawn rather than as a promise pending from page
    // load: tw video only steps its virtual clock after ready settles, so a
    // promise that waits for a frame would stall it.
    (window.__tw ??= {}).ready = Promise.resolve();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

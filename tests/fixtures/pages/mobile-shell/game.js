import * as THREE from 'three';
const LINES = ['Kneading the clay...', 'Waking the kiln...', 'Counting thumbprints...'];
const done = window.__shell.startLoading(THREE.DefaultLoadingManager, LINES);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d1a24);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 50);
camera.position.set(0, 1, 4);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 2));
const box = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xe0a050 }));
box.name = 'box';
scene.add(box);
let paused = window.__shell.paused();
window.__shell.onPauseChange((p) => { paused = p; });
let first = true;
renderer.setAnimationLoop(() => {
  if (!paused) box.rotation.y += 0.01;
  renderer.render(scene, camera);
  if (first) { first = false; done(); }
});

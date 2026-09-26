import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// const c = new THREE.Clock();  (comment, ignored)
const clock = new THREE.Clock();
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const g = new THREE.BoxBufferGeometry(1, 1, 1);
await renderer.renderAsync(scene, camera);
const post = new THREE.PostProcessing(renderer);
const u = uniform(1).label('x');

import { BufferGeometry, Float32BufferAttribute } from 'three';

function makeWave(count) {
  const positions = new Float32Array(count * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = Math.sin(i);
  return geometry;
}

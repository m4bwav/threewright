// The three.js side: meshes built from the level data, lights, and a follow camera.
// It only reads the simulation and never changes it, so rendering at any frame
// rate (or not at all, in Node tests) cannot change the game.

import * as THREE from 'three';
import type { Game } from '../sim/game.ts';
import { STEP } from '../sim/game.ts';
import type { BoxKind, Level } from '../sim/level.ts';

const COLORS: Record<BoxKind, number> = {
  ground: 0xffffff, // tinted by the checker texture
  wall: 0x7d8597,
  platform: 0xf4a259,
  ramp: 0xf4a259,
  block: 0x5b8e7d,
  crate: 0xbc8a5f,
};
const CAMERA_OFFSET = new THREE.Vector3(0, 6, 9); // behind and above the player
const CAMERA_LOOK = new THREE.Vector3(0, 1, 0);
const CAMERA_FOLLOW = 6; // 1/s; higher follows tighter

export class View {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1); // shared; meshes scale it, so a new level allocates nothing on the GPU
  private readonly gemGeometry = new THREE.OctahedronGeometry(0.35);
  private readonly materials: Record<BoxKind, THREE.MeshStandardMaterial>;
  private readonly gemMaterial = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa000, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.1 });
  private readonly levelGroup = new THREE.Group();
  private readonly player = new THREE.Group();
  private crates: THREE.Mesh[] = [];
  private gems: THREE.Mesh[] = [];
  private level: Level | null = null;
  private yaw = 0;
  private readonly v = new THREE.Vector3();
  private readonly qa = new THREE.Quaternion();
  private readonly qb = new THREE.Quaternion();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200);
    this.scene.background = new THREE.Color(0x8ec5ff);
    this.scene.fog = new THREE.Fog(0x8ec5ff, 35, 80);

    const checker = checkerTexture();
    this.materials = {
      ground: new THREE.MeshStandardMaterial({ color: COLORS.ground, map: checker, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.8 }),
      platform: new THREE.MeshStandardMaterial({ color: COLORS.platform, roughness: 0.7 }),
      ramp: new THREE.MeshStandardMaterial({ color: COLORS.ramp, roughness: 0.7 }),
      block: new THREE.MeshStandardMaterial({ color: COLORS.block, roughness: 0.6 }),
      crate: new THREE.MeshStandardMaterial({ color: COLORS.crate, roughness: 0.8 }),
    };

    // One sun with one shadow map over the whole arena, plus sky light for the shade.
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x5a5040, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = s.bottom = -15;
    s.right = s.top = 15;
    s.near = 1;
    s.far = 45;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // The player: a capsule the size of the physics capsule, and a visor to show facing.
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 6, 16), new THREE.MeshStandardMaterial({ color: 0xe84a5f, roughness: 0.45 }));
    body.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0x1d2433, roughness: 0.2, metalness: 0.4 }));
    visor.position.set(0, 0.45, 0.28);
    this.player.add(body, visor);
    this.player.name = 'player';
    this.levelGroup.name = 'level';
    this.scene.add(this.levelGroup, this.player);
  }

  // Build meshes for a level (on start and on restart with a new seed).
  setLevel(level: Level): void {
    this.level = level;
    this.levelGroup.clear(); // meshes share geometry and materials, so there is nothing to dispose
    this.crates = [];
    this.gems = [];
    for (const b of level.boxes) {
      const mesh = new THREE.Mesh(this.unitBox, this.materials[b.kind]);
      mesh.name = b.kind;
      mesh.scale.set(b.half.x * 2, b.half.y * 2, b.half.z * 2);
      mesh.position.set(b.center.x, b.center.y, b.center.z);
      mesh.rotation.x = b.tilt;
      mesh.castShadow = b.kind !== 'ground';
      mesh.receiveShadow = true;
      this.levelGroup.add(mesh);
      if (b.dynamic) this.crates.push(mesh);
    }
    for (const p of level.pickups) {
      const gem = new THREE.Mesh(this.gemGeometry, this.gemMaterial);
      gem.name = 'gem';
      gem.position.set(p.x, p.y, p.z);
      gem.castShadow = true;
      this.levelGroup.add(gem);
      this.gems.push(gem);
    }
    this.yaw = 0;
  }

  // Place everything for a render time `alpha` of the way from the previous tick to
  // the current one. dt (seconds since the last render) only drives camera smoothing.
  sync(game: Game | null, alpha: number, dt: number, snap = false): void {
    if (!this.level) return;
    const p = this.player.position;
    if (game) {
      const a = game.prevPlayer, b = game.player;
      p.set(a.x + (b.x - a.x) * alpha, a.y + (b.y - a.y) * alpha, a.z + (b.z - a.z) * alpha);
      // Face the direction of travel (view only; the capsule itself never rotates).
      if (Math.hypot(b.vx, b.vz) > 0.5) {
        const target = Math.atan2(b.vx, b.vz);
        const diff = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
        this.yaw += diff * (snap ? 1 : 1 - Math.exp(-14 * dt));
      }
      game.crates.forEach((c, i) => {
        const m = this.crates[i], c0 = game.prevCrates[i] ?? c;
        if (!m) return;
        m.position.set(c0.x + (c.x - c0.x) * alpha, c0.y + (c.y - c0.y) * alpha, c0.z + (c.z - c0.z) * alpha);
        m.quaternion.slerpQuaternions(this.qa.set(c0.qx, c0.qy, c0.qz, c0.qw), this.qb.set(c.qx, c.qy, c.qz, c.qw), alpha);
      });
      // Gems spin on simulation time, so replays and tw video frames look the same every run.
      const t = (game.tick + alpha) * STEP;
      this.gems.forEach((g, i) => {
        g.visible = !game.collected[i];
        g.rotation.y = t * 2 + i;
        g.position.y = this.level!.pickups[i].y + Math.sin(t * 2.5 + i) * 0.12;
      });
    } else {
      const s = this.level.spawn;
      p.set(s.x, s.y - 0.35, s.z); // before physics loads: stand at the spawn point
    }
    this.player.rotation.y = this.yaw;

    // Follow camera: ease toward a point behind the player with a frame-rate
    // independent factor (1 - e^(-k dt)), then look at the player's chest.
    this.v.copy(p).add(CAMERA_OFFSET);
    if (snap) this.camera.position.copy(this.v);
    else this.camera.position.lerp(this.v, 1 - Math.exp(-CAMERA_FOLLOW * dt));
    this.camera.lookAt(this.v.copy(p).add(CAMERA_LOOK));
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

// A generated checker for the ground: gives speed and distance a visual reference
// with no image download.
function checkerTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#9fb88a';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#8aa676';
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12); // 2 m squares on the 24 m ground
  tex.anisotropy = 4;
  return tex;
}

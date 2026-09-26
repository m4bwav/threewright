// The game simulation: Rapier world, player, pickups, score, lives and events.
// No DOM and no three.js in here, so it runs in Node for tests (tests/sim.test.ts)
// and could run on a server. It advances only in fixed ticks of STEP seconds,
// takes one ActionFrame per tick, and never reads a clock or Math.random(), so
// the same seed and the same inputs always give the same state and hash().

import type RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, EventQueue, KinematicCharacterController, RigidBody, World } from '@dimforge/rapier3d-compat';
import { makeLevel, type Level, type Vec3 } from './level.ts';
import { sha256 } from './sha256.ts';

// Rapier is loaded lazily (a dynamic import behind the first frame), so the module
// is passed in instead of imported here.
export type Rapier = typeof RAPIER;

export const STEP = 1 / 60; // seconds per tick

// Everything the player can ask for in one tick. Devices, touch, replays and
// tests all produce this; the simulation never sees a key code.
export interface ActionFrame { moveX: number; moveY: number; jump: boolean }
export const NO_INPUT: Readonly<ActionFrame> = Object.freeze({ moveX: 0, moveY: 0, jump: false });

export type Mode = 'play' | 'won' | 'over';
export type EventType = 'spawn' | 'jump' | 'pickup' | 'score' | 'fall' | 'death' | 'levelComplete';
export interface GameEvent { tick: number; type: EventType; value?: number }
export interface Pose { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number }

// Tuning in metres, seconds and ticks. Per-tick amounts come from STEP, never from frame time.
const SPEED = 6;
const GROUND_ACCEL = 60; // reach full speed in 0.1 s
const AIR_ACCEL = 18;
const GRAVITY = 20; // stronger than 9.81: platformer jumps feel floaty with real gravity
const JUMP_SPEED = 8; // apex about 1.6 m
const MAX_FALL = 30;
const COYOTE_TICKS = 6; // a jump still counts 0.1 s after walking off a ledge
const JUMP_BUFFER_TICKS = 6; // a jump pressed 0.1 s before landing is kept
export const MAX_HP = 3;
const KILL_Y = -10;
const PLAYER_RADIUS = 0.35;
const PLAYER_HALF_HEIGHT = 0.5; // of the cylinder part; the capsule is 1.7 m tall
const PICKUP_RADIUS = 0.5;
const MAX_EVENTS = 256;

const clamp1 = (v: number) => (v > 1 ? 1 : v < -1 ? -1 : v || 0);

export class Game {
  readonly seed: number;
  readonly level: Level;
  tick = 0;
  mode: Mode = 'play';
  score = 0;
  hp = MAX_HP;
  // State after the last tick, and before it: the view interpolates between the two.
  readonly player = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: false };
  readonly prevPlayer = { x: 0, y: 0, z: 0 };
  readonly crates: Pose[] = [];
  readonly prevCrates: Pose[] = [];
  readonly collected: boolean[];
  readonly events: GameEvent[] = []; // ring buffer of the last MAX_EVENTS

  private readonly R: Rapier;
  private readonly world: World;
  private readonly queue: EventQueue;
  private readonly body: RigidBody;
  private readonly collider: Collider;
  private readonly controller: KinematicCharacterController;
  private readonly crateBodies: RigidBody[] = [];
  private readonly pickupColliders: (Collider | null)[] = [];
  private readonly pickupByHandle = new Map<number, number>();
  private readonly vel = { x: 0, y: 0, z: 0 }; // wanted velocity; collisions decide the real one
  private coyote = 0;
  private jumpBuffer = 0;
  private prevJump = false;

  constructor(R: Rapier, seed: number) {
    this.R = R;
    this.seed = seed >>> 0;
    this.level = makeLevel(this.seed);
    const world = (this.world = new R.World({ x: 0, y: -GRAVITY, z: 0 }));
    world.timestep = STEP;
    this.queue = new R.EventQueue(true);

    // Create bodies in level order: Rapier's handles, and so its snapshots, depend on creation order.
    for (const b of this.level.boxes) {
      const rotation = { x: Math.sin(b.tilt / 2), y: 0, z: 0, w: Math.cos(b.tilt / 2) };
      const shape = R.ColliderDesc.cuboid(b.half.x, b.half.y, b.half.z).setFriction(0.8);
      if (b.dynamic) {
        const rb = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(b.center.x, b.center.y, b.center.z).setRotation(rotation).setAngularDamping(1));
        world.createCollider(shape.setDensity(20), rb);
        this.crateBodies.push(rb);
      } else {
        world.createCollider(shape.setTranslation(b.center.x, b.center.y, b.center.z).setRotation(rotation));
      }
    }
    // Pickups are sensors: they report overlaps and never block. A sensor with no
    // body counts as fixed, and fixed against kinematic (the player) is off by
    // default, so it is switched on here.
    this.collected = this.level.pickups.map(() => false);
    this.level.pickups.forEach((p, i) => {
      const c = world.createCollider(R.ColliderDesc.ball(PICKUP_RADIUS).setTranslation(p.x, p.y, p.z).setSensor(true)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS)
        .setActiveCollisionTypes(R.ActiveCollisionTypes.DEFAULT | R.ActiveCollisionTypes.KINEMATIC_FIXED));
      this.pickupColliders.push(c);
      this.pickupByHandle.set(c.handle, i);
    });

    // The player: a kinematic body moved by the character controller, which slides
    // along walls, climbs slopes up to 45 degrees, steps over small ledges and
    // stays glued to the ground going down the ramp.
    const s = this.level.spawn;
    this.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x, s.y, s.z));
    this.collider = world.createCollider(R.ColliderDesc.capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS), this.body);
    const cc = (this.controller = world.createCharacterController(0.02));
    cc.enableAutostep(0.35, 0.2, false);
    cc.enableSnapToGround(0.3);
    cc.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    cc.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    cc.setApplyImpulsesToDynamicBodies(true); // push crates
    cc.setCharacterMass(40);

    this.readPlayer();
    this.readCrates();
    this.copyPrev();
    this.emit('spawn');
  }

  // Advance exactly one tick with the given input.
  step(input: ActionFrame = NO_INPUT): void {
    this.tick++;
    this.copyPrev();
    const playing = this.mode === 'play';

    // Move on the ground plane: moveY forward is -z (into the screen).
    let mx = playing ? clamp1(input.moveX) : 0;
    let mz = playing ? -clamp1(input.moveY) : 0;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const accel = (this.player.grounded ? GROUND_ACCEL : AIR_ACCEL) * STEP;
    let dx = mx * SPEED - this.vel.x, dz = mz * SPEED - this.vel.z;
    const dl = Math.hypot(dx, dz);
    if (dl > accel) { dx *= accel / dl; dz *= accel / dl; }
    this.vel.x += dx;
    this.vel.z += dz;

    // Jumps fire on the press (an edge), are remembered for a few ticks, and are
    // still allowed a few ticks after leaving a ledge.
    const jump = playing && input.jump;
    if (jump && !this.prevJump) this.jumpBuffer = JUMP_BUFFER_TICKS;
    else if (this.jumpBuffer > 0) this.jumpBuffer--;
    this.prevJump = jump;
    if (this.player.grounded) this.coyote = COYOTE_TICKS;
    else if (this.coyote > 0) this.coyote--;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = JUMP_SPEED;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.emit('jump');
    } else {
      this.vel.y = Math.max(this.vel.y - GRAVITY * STEP, -MAX_FALL);
    }

    // Ask the controller how far the capsule can really go, then move the kinematic
    // body there during the physics step. Sensors are excluded so pickups never block.
    const want = { x: this.vel.x * STEP, y: this.vel.y * STEP, z: this.vel.z * STEP };
    this.controller.computeColliderMovement(this.collider, want, this.R.QueryFilterFlags.EXCLUDE_SENSORS);
    const move = this.controller.computedMovement();
    const grounded = this.controller.computedGrounded();
    const t = this.body.translation();
    this.body.setNextKinematicTranslation({ x: t.x + move.x, y: t.y + move.y, z: t.z + move.z });
    if (grounded && this.vel.y < 0) this.vel.y = 0; // landed
    if (this.vel.y > 0 && move.y < want.y * 0.5) this.vel.y = 0; // hit a ceiling

    this.world.step(this.queue);

    // Pickups come from physics events, not distance checks.
    const hits: number[] = [];
    const me = this.collider.handle;
    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started || (h1 !== me && h2 !== me)) return;
      const i = this.pickupByHandle.get(h1 === me ? h2 : h1);
      if (i !== undefined) hits.push(i);
    });
    for (const i of hits) this.collect(i);

    this.player.vx = move.x / STEP;
    this.player.vy = move.y / STEP;
    this.player.vz = move.z / STEP;
    this.player.grounded = grounded;
    this.readPlayer();
    this.readCrates();
    if (this.player.y < KILL_Y) this.fall();
  }

  // Put the player somewhere (tests, debug tools, checkpoints). Keeps the tick.
  teleport(p: Vec3): void {
    this.body.setTranslation(p, true);
    this.body.setNextKinematicTranslation(p);
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.coyote = this.jumpBuffer = 0;
    this.readPlayer();
    this.player.grounded = false;
    this.copyPrev();
  }

  // Compact, JSON-friendly view of the state (numbers rounded for reading).
  state() {
    const r = (v: number) => Math.round(v * 1000) / 1000;
    const p = this.player;
    return {
      tick: this.tick,
      mode: this.mode,
      seed: this.seed,
      score: this.score,
      player: { x: r(p.x), y: r(p.y), z: r(p.z), vx: r(p.vx), vy: r(p.vy), vz: r(p.vz), grounded: p.grounded, hp: this.hp },
      pickups: { total: this.collected.length, left: this.collected.filter((c) => !c).length },
    };
  }

  // SHA-256 prefix of the Rapier snapshot plus the game state Rapier does not hold.
  // Equal hashes mean equal simulations; compare runs on one machine (see README of
  // rapier3d-deterministic-compat for cross-machine determinism).
  hash(): string {
    const snapshot = this.world.takeSnapshot();
    const extra = new TextEncoder().encode(JSON.stringify([
      this.tick, this.mode, this.score, this.hp, this.vel.x, this.vel.y, this.vel.z,
      this.coyote, this.jumpBuffer, this.prevJump, this.player.grounded, this.collected,
    ]));
    const all = new Uint8Array(snapshot.length + extra.length);
    all.set(snapshot);
    all.set(extra, snapshot.length);
    return sha256(all).slice(0, 16);
  }

  eventsSince(tick = 0): GameEvent[] {
    return this.events.filter((e) => e.tick >= tick);
  }

  dispose(): void {
    this.queue.free();
    this.world.free(); // frees bodies, colliders and the character controller too
  }

  private collect(i: number): void {
    const c = this.pickupColliders[i];
    if (!c || this.collected[i]) return;
    this.collected[i] = true;
    this.pickupColliders[i] = null;
    this.pickupByHandle.delete(c.handle);
    this.world.removeCollider(c, false);
    this.score++;
    this.emit('pickup', i);
    this.emit('score', this.score);
    if (this.mode === 'play' && this.collected.every(Boolean)) {
      this.mode = 'won';
      this.emit('levelComplete', this.tick);
    }
  }

  private fall(): void {
    this.hp = Math.max(0, this.hp - 1);
    this.emit('fall', this.hp);
    if (this.hp === 0 && this.mode === 'play') {
      this.mode = 'over';
      this.emit('death');
    }
    this.teleport(this.level.spawn);
    this.emit('spawn');
  }

  private emit(type: EventType, value?: number): void {
    this.events.push(value === undefined ? { tick: this.tick, type } : { tick: this.tick, type, value });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  private readPlayer(): void {
    const p = this.body.translation();
    this.player.x = p.x;
    this.player.y = p.y;
    this.player.z = p.z;
  }

  private readCrates(): void {
    this.crateBodies.forEach((rb, i) => {
      const t = rb.translation(), q = rb.rotation();
      const pose = this.crates[i] ?? (this.crates[i] = { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 });
      pose.x = t.x; pose.y = t.y; pose.z = t.z;
      pose.qx = q.x; pose.qy = q.y; pose.qz = q.z; pose.qw = q.w;
    });
  }

  private copyPrev(): void {
    this.prevPlayer.x = this.player.x;
    this.prevPlayer.y = this.player.y;
    this.prevPlayer.z = this.player.z;
    this.crates.forEach((c, i) => {
      this.prevCrates[i] = Object.assign(this.prevCrates[i] ?? { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 }, c);
    });
  }
}

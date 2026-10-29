// The browser game: fixed-step sim, input, rendering with interpolation.
import { createState, step } from './sim/sim';
import { DT, type SimState, type Vec3 } from './sim/types';
import type { World } from './world/world';
import { getWorld } from './world/build';
import { scenarioByName, type Scenario } from './data/scenarios';
import { Input } from './input/input';
import { View } from './render/view';
import { Hud } from './ui/hud';
import { Sky } from './render/sky';
import { BodyFx } from './render/body-fx';
import { InventoryUI } from './ui/inventory-ui';

export interface GameOpts { scenario: string; seed: number; dev: boolean }

export class Game {
  world!: World;
  state!: SimState;
  readonly view: View;
  readonly input: Input;
  readonly hud = new Hud();
  readonly sky: Sky;
  readonly bodyFx: BodyFx;
  readonly inv: InventoryUI;
  drawDistance = 160;
  scenario!: Scenario;
  private prev: Vec3 = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private last = 0;
  frames = 0;
  ticks = 0;

  constructor(readonly opts: GameOpts) {
    this.view = new View(document.body);
    this.input = new Input(this.view.renderer.domElement);
    this.sky = new Sky(this.view);
    this.bodyFx = new BodyFx(this.view.renderer.domElement);
    this.inv = new InventoryUI(this);
    this.load(opts.scenario, opts.seed);
  }

  load(name: string, seed: number) {
    const sc = scenarioByName(name);
    if (!sc) throw new Error(`unknown scenario ${name}`);
    this.scenario = sc;
    this.world = getWorld(sc.world);
    this.state = createState(seed, this.world);
    if (sc.spawn) Object.assign(this.state.player.pos, { x: sc.spawn.x, y: sc.spawn.y, z: sc.spawn.z });
    this.state.player.yaw = this.input.yaw = sc.spawn?.yaw ?? this.world.spawn.yaw;
    this.input.pitch = 0;
    this.prev = { ...this.state.player.pos };
    this.view.setWorld(this.world);
  }

  /** Display name of a container grid id. */
  containerName(id: string): string { return id === 'stash' ? '藏匿箱 STASH' : id; }

  private uiKeys() {
    for (const k of this.input.uiKeys.splice(0)) {
      if (k === 'Tab') this.inv.toggle();
      if (k === 'Escape' && this.inv.open) this.inv.toggle(false);
    }
  }

  tick() {
    this.uiKeys();
    this.prev = { ...this.state.player.pos };
    const f = this.input.frame();
    step(this.state, this.world, f);
    this.ticks++;
    for (const e of this.state.events) if (e.t === 'land') this.view.fp.landed(e.h);
  }

  render(alpha: number, dt: number) {
    const p = this.state.player;
    const pos = { x: this.prev.x + (p.pos.x - this.prev.x) * alpha, y: this.prev.y + (p.pos.y - this.prev.y) * alpha, z: this.prev.z + (p.pos.z - this.prev.z) * alpha };
    this.view.fp.update(p, pos, this.input.yaw, this.input.pitch, dt);
    this.view.arms.update(p, dt, this.input.pitch);
    this.bodyFx.update(this.state, this.view.fp, dt);
    this.inv.update();
    this.sky.update(this.state.time, this.view.fp.cam.position, this.drawDistance);
    this.view.render();
    this.frames++;
  }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : DT;
      this.last = now;
      this.acc += dt;
      while (this.acc >= DT) { this.tick(); this.acc -= DT; }
      this.render(this.acc / DT, dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Deterministic stepping for tests: n ticks, then one render. */
  runFrames(n: number) {
    for (let i = 0; i < n; i++) this.tick();
    this.render(1, Math.max(1, n) * DT);
  }
}

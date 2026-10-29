// The browser game: fixed-step sim, input, rendering with interpolation.
import { createState, step } from './sim/sim';
import { DT, type SimState, type Vec3 } from './sim/types';
import type { World } from './world/world';
import { getWorld } from './world/build';
import { scenarioByName, scenarios, type Scenario } from './data/scenarios';
import { Input } from './input/input';
import { View } from './render/view';
import { Hud } from './ui/hud';
import { Sky } from './render/sky';
import { BodyFx } from './render/body-fx';
import { InventoryUI } from './ui/inventory-ui';
import { heldStack } from './sim/use';
import { item } from './data/items';
import { Audio } from './audio/audio';
import { startRun } from './sim/run';
import { teleport } from './sim/player';
import { writeSave, readSave, type SaveFile } from './sim/save';
import { syncWorld } from './sim/doors';
import { playMove } from './audio/moves';
import { Hands3D, poseFor, gripPose, HELD_AT } from './render/hands3d';
import { itemModel, supportPoint } from './render/items3d';
import { SleepUI } from './ui/sleep-ui';
import { DeathScreen } from './ui/death';
import { PauseMenu } from './ui/pause';
import { findGrab } from './sim/grip';
import { raycast } from './world/geom';

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
  readonly audio = new Audio();
  readonly hands: Hands3D;
  readonly sleep: SleepUI;
  readonly death = new DeathScreen(this);
  readonly pause: PauseMenu;
  drawDistance = 160;
  scenario!: Scenario;
  private heldId = '';
  private prev: Vec3 = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private last = 0;
  frames = 0;
  ticks = 0;

  constructor(readonly opts: GameOpts) {
    this.view = new View(document.body);
    this.input = new Input(this.view.renderer.domElement);
    this.sky = new Sky(this.view);
    this.hands = new Hands3D(this.view.fp.cam);
    this.bodyFx = new BodyFx(this.view.renderer.domElement);
    this.inv = new InventoryUI(this);
    this.sleep = new SleepUI(this);
    this.pause = new PauseMenu(this);
    this.load(opts.scenario, opts.seed);
  }

  load(name: string, seed: number) {
    const sc = scenarioByName(name);
    if (!sc) throw new Error(`unknown scenario ${name}`);
    this.scenario = sc;
    this.world = getWorld(sc.world);
    this.state = createState(seed, this.world);
    if (sc.run) startRun(this.state, this.world);
    if (sc.spawn) teleport(this.state.player, sc.spawn.x, sc.spawn.y, sc.spawn.z);
    this.state.player.yaw = this.input.yaw = sc.spawn?.yaw ?? this.world.spawn.yaw;
    this.input.pitch = 0;
    this.prev = { ...this.state.player.pos };
    this.drawDistance = sc.draw ?? 160;
    this.view.fp.cam.far = Math.max(400, this.drawDistance + 100);
    this.view.fp.cam.updateProjectionMatrix();
    this.sky.overcast = sc.overcast ? 1 : 0;
    this.view.setWorld(this.world);
  }

  /** Switch scenario in place, keeping fullscreen: '' is the game, resumed from its ironman save if there is one. */
  switchTo(name: string) {
    const sc = scenarioByName(name) ?? scenarios.find(x => x.run)!;
    const save = sc.run ? readSave(localStorage) : null;
    if (save) this.loadSave(save);
    else this.load(sc.name, Math.floor(Math.random() * 1e9));
    const q = new URLSearchParams(location.search);
    q.delete('seed');
    if (sc.run) q.delete('scenario'); else q.set('scenario', sc.name);
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
  }

  /** Display name of a container grid id. */
  containerName(id: string): string {
    const it = this.world.inter.find(i => i.id === id);
    return it ? `${it.zh} ${it.en.toUpperCase()}` : id;
  }

  private uiKeys() {
    for (const k of this.input.uiKeys.splice(0)) {
      if (k === 'Tab') this.inv.toggle();
      if (k === 'Escape' && this.inv.open) this.inv.toggle(false);
    }
  }

  /** Resume an ironman save. */
  loadSave(f: SaveFile) {
    this.load(f.scenario, f.state.seed);
    this.state = f.state;
    syncWorld(this.state, this.world);
    this.input.yaw = this.state.player.yaw;
    this.input.pitch = this.state.player.pitch;
    this.prev = { ...this.state.player.pos };
  }

  tick() {
    this.uiKeys();
    this.prev = { ...this.state.player.pos };
    const f = this.input.frame();
    step(this.state, this.world, f);
    this.ticks++;
    for (const e of this.state.events) {
      if (e.t === 'land') this.view.fp.landed(e.h);
      else if (e.t === 'sfx') playMove(this.audio, e.id);
      else if (e.t === 'open') this.inv.toggle(true);
      else if (e.t === 'sleep-menu') this.sleep.toggle(true);
      else if (e.t === 'slept' && this.scenario.run && !this.state.dead) writeSave(localStorage, this.scenario.name, this.state);
    }
    if (this.state.dead) this.death.show();
  }

  render(alpha: number, dt: number) {
    const p = this.state.player;
    const pos = { x: this.prev.x + (p.pos.x - this.prev.x) * alpha, y: this.prev.y + (p.pos.y - this.prev.y) * alpha, z: this.prev.z + (p.pos.z - this.prev.z) * alpha };
    this.view.fp.update(p, pos, this.input.yaw, this.input.pitch, dt);
    this.bodyFx.update(this.state, this.view.fp, dt);
    this.updateHands(dt);
    this.inv.update();
    this.updatePrompt();
    this.updateHeld();
    this.sky.update(this.state.time, this.view.fp.cam.position, this.drawDistance, this.underAmount(dt));
    this.view.render(this.state.tick / 60, this.state.wstate.open);
    this.frames++;
  }

  private under = 0;
  /** Eases toward 1 while the camera is inside an underground zone. */
  private underAmount(dt: number): number {
    const c = this.view.fp.cam.position;
    const inside = this.world.zones.some(z => z.kind === 'under' && c.x > z.box.x0 && c.x < z.box.x1 && c.y > z.box.y0 && c.y < z.box.y1 && c.z > z.box.z0 && c.z < z.box.z1);
    this.under += ((inside ? 1 : 0) - this.under) * (1 - Math.exp(-3 * dt));
    return this.under;
  }

  private updatePrompt() {
    const s = this.state;
    if (s.task) { const n = Math.round((s.task.t / s.task.dur) * 10); this.hud.setPrompt(`${'■'.repeat(n)}${'□'.repeat(10 - n)}`); return; }
    const it = s.target ? this.world.inter.find(i => i.id === s.target) : null;
    this.hud.setPrompt(it && !this.input.uiOpen ? `E  ${it.zh}  ${it.en}` : '');
  }

  private updateHands(dt: number) {
    const p = this.state.player, cam = this.view.fp.cam;
    this.hands.group.visible = p.mode !== 'dead' && p.mode !== 'hidden' && !this.input.uiOpen;
    if (!this.hands.ready || !this.hands.group.visible) return;
    const held = heldStack(this.state), support = held ? supportPoint(held.id) : null;
    const readied = !held && findGrab(this.world, p) !== null;
    // Faster easing while striding so the arm swing keeps up with the steps.
    const k = 1 - Math.exp(-(p.mode === 'ground' && p.onGround ? 26 : 14) * dt);
    // Keep free hands out of a wall right in front of him.
    const d = { x: -Math.sin(p.yaw) * Math.cos(p.pitch), y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * Math.cos(p.pitch) };
    const hit = raycast(this.world.index, cam.position.x, cam.position.y, cam.position.z, d.x, d.y, d.z, 0.6);
    const room = hit ? hit.t : 0.6;
    p.hands.forEach((h, i) => {
      const g = h.grip ? gripPose(cam, h.grip.x, h.grip.y, h.grip.z, h.grip.nx, h.grip.nz, i === 0 ? -1 : 1) : null;
      const pose = poseFor(p, i, readied, !!held, g, this.view.fp.bob, support);
      if (!g && -pose.pos.z > room - 0.12) pose.pos.z = -Math.max(0.12, room - 0.12);
      this.hands.setPose(i, pose, k);
    });
  }

  private updateHeld() {
    const st = heldStack(this.state), id = st?.id ?? '';
    if (id === this.heldId || !this.hands.ready) return;
    this.heldId = id;
    const slot = this.hands.heldSlot(1);
    if (slot) { slot.clear(); if (id) { const m = itemModel(id); m.position.copy(HELD_AT); slot.add(m); } }
    this.hud.setHeld(id ? `${item(id).zh} ${item(id).en}` : '');
  }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : DT;
      this.last = now;
      this.acc += dt;
      if (this.pause.open) this.acc = 0;
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

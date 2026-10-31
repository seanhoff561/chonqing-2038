// The browser game: fixed-step sim, input, rendering with interpolation.
import * as THREE from 'three';
import { HideView } from './render/hideview';
import { Underwater } from './render/underwater';
import { lineMeshes } from './render/lines';
import { hideNear } from './sim/hide';
import { lineInReach } from './sim/zip';
import { createState, step } from './sim/sim';
import { DT, type SimState, type Vec3 } from './sim/types';
import { GAME_PER_TICK } from './sim/clock';
import type { World } from './world/world';
import { getWorld } from './world/build';
import { scenarioByName, scenarios, type Scenario } from './data/scenarios';
import { Input } from './input/input';
import { View, PRESETS, type Preset } from './render/view';
import { Hud } from './ui/hud';
import { UnitView } from './render/units';
import { lineById, SPEAKERS } from './data/dialogue';
import { beep, servo, radio, gunshot } from './audio/moves';
import { unitPose } from './sim/units';
import { Sky } from './render/sky';
import { BodyFx } from './render/body-fx';
import { InventoryUI } from './ui/inventory-ui';
import { heldStack } from './sim/use';
import { item } from './data/items';
import { PISTOL } from './data/units';
import { Audio } from './audio/audio';
import { startRun, furnish } from './sim/run';
import { teleport } from './sim/player';
import { writeSave, readSave, type SaveFile } from './sim/save';
import { syncWorld } from './sim/doors';
import { playMove } from './audio/moves';
import { Hands3D, poseFor, gripPose, HELD_AT } from './render/hands3d';
import { itemModel, supportPoint } from './render/items3d';
import { SleepUI } from './ui/sleep-ui';
import { DeathScreen } from './ui/death';
import { Furniture } from './render/furniture';
import { Rain } from './render/rain';
import { StatusIndicator } from './ui/status';
import { lodRadius } from './render/materials';
import { PauseMenu } from './ui/pause';
import { findGrab } from './sim/grip';
import { allInters, interLabel } from './sim/interact';
import { raycast } from './world/geom';

/** Metres to full haze when the whole city is drawn (U-012). */
const FAR_HAZE = 2800;

export interface GameOpts { scenario: string; seed: number; dev: boolean }

const HIDE_NAMES: Record<string, [string, string]> = {
  crate: ['躲进箱子', 'Hide in the crate'], dumpster: ['躲进垃圾箱', 'Hide in the dumpster'], box: ['躲进箱子', 'Hide in the box'], wardrobe: ['躲进衣柜', 'Hide in the wardrobe'],
  tank: ['躲进水箱', 'Hide in the water tank'], drum: ['躲进水桶', 'Hide in the drum'], kiosk: ['躲进报亭', 'Hide in the kiosk'], boot: ['躲进后备箱', 'Hide in the car boot'], van: ['躲进货车', 'Hide in the van'],
};

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
  /** The inside of where he's hidden (M3-47). */
  readonly hideView = new HideView();
  /** Murk, silt and dull sound with his head under water (M3-48). */
  readonly underwater: Underwater;
  private readonly rigged = new THREE.Group();
  readonly sleep: SleepUI;
  readonly death = new DeathScreen(this);
  readonly pause: PauseMenu;
  readonly furniture = new Furniture();
  readonly rain: Rain;
  readonly status = new StatusIndicator();
  drawDistance = 160;
  private units: UnitView | null = null;
  scenario!: Scenario;
  private heldId = '';
  private prev: Vec3 = { x: 0, y: 0, z: 0 };
  private acc = 0;
  private last = 0;
  frames = 0;
  /** milliseconds a frame, smoothed: sim ticks, render CPU, and the whole frame (capped by the display) */
  readonly perf = { sim: 0, render: 0, frame: 16.7 };
  ticks = 0;

  constructor(readonly opts: GameOpts) {
    this.view = new View(document.body);
    this.input = new Input(this.view.renderer.domElement);
    this.sky = new Sky(this.view);
    this.hands = new Hands3D(this.view.fp.cam);
    this.view.scene.add(this.hideView.group);
    this.underwater = new Underwater(this.view);
    this.rigged.userData.n = 0;
    this.view.scene.add(this.rigged);
    this.view.scene.add(this.furniture.group);
    this.rain = new Rain(this.view.scene);
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
    if (sc.furnished) furnish(this.state, this.world);
    const sp = sc.spawn ?? this.world.teleports.find(t => t.name === sc.at);
    if (sp) teleport(this.state.player, sp.x, sp.y, sp.z);
    this.state.player.yaw = this.input.yaw = sp?.yaw ?? this.world.spawn.yaw;
    this.input.pitch = 0;
    this.prev = { ...this.state.player.pos };
    this.sky.overcast = sc.overcast ?? 0;
    this.applyDraw();
    this.view.setWorld(this.world);
    this.units?.dispose();
    this.units = new UnitView(this.state.units);
    this.view.scene.add(this.units.group);
  }

  private beepIn = 0;
  private servoIn = 0;
  /** The machines' sounds near him: the cameras beep (M4-07, U-038), the nearest within 12 m every 2.5 s; the
   *  quadrupeds' servos whine (M4-09), the nearest within 30 m at each stride. Louder nearer. */
  private machineSounds(dt: number) {
    const p = this.state.player.pos;
    if ((this.beepIn -= dt) <= 0) {
      this.beepIn = 2.5;
      let near = 12;
      for (const c of this.world.cameras) if (c.kind === 'camera' || c.kind === 'sweeper' || c.kind === 'lamppost') near = Math.min(near, Math.hypot(c.x - p.x, c.y - p.y - 1.6, c.z - p.z));
      if (near < 12) beep(this.audio, 0.12 * (1 - near / 12));
    }
    if ((this.servoIn -= dt) <= 0) {
      this.servoIn = 0.4;
      let near = 30;
      for (const u of this.state.units) if (u.kind === 'quadruped') { const q = unitPose(this.world, u, this.state.time); if (q.active) near = Math.min(near, Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)); }
      if (near < 30) servo(this.audio, 0.2 * (1 - near / 30));
    }
  }

  /** The draw distance: the scenario's, or the graphics preset's. With far stand-ins the whole city shows through
   *  aerial haze and the draw distance is the detail radius. */
  private applyDraw() {
    this.drawDistance = this.scenario.draw ?? PRESETS[this.view.preset].draw;
    lodRadius.value = this.world.far.length ? this.drawDistance : 1e9;
    this.view.fp.cam.far = this.hazeDistance() + 100;
    this.view.fp.cam.updateProjectionMatrix();
  }

  /** Switch graphics preset (M3-17): the world built again if it draws a different share of the props. */
  setPreset(p: Preset) {
    if (this.view.setPreset(p)) this.view.setWorld(this.world);
    this.applyDraw();
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

  /** Where the fog closes in: the draw distance, or far haze over a city drawn whole. */
  hazeDistance() { return this.world.far.length ? FAR_HAZE : this.drawDistance; }

  /** Display name of a container grid id. */
  containerName(id: string): string {
    const it = this.world.inter.find(i => i.id === id);
    return it ? `${it.zh} ${it.en.toUpperCase()}` : id;
  }

  private uiKeys() {
    for (const k of this.input.uiKeys.splice(0)) {
      if (k === 'Tab') this.inv.toggle();
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
      else if (e.t === 'fire') gunshot(this.audio, 0.9);
      else if (e.t === 'open') this.inv.toggle(true);
      else if (e.t === 'sleep-menu') this.sleep.toggle(true, e.id === 'rough');
      else if (e.t === 'slept' && this.scenario.run && !this.state.dead) writeSave(localStorage, this.scenario.name, this.state);
      else if (e.t === 'msg') this.hud.say(e.text, '');
      else if (e.t === 'say') { const l = lineById.get(e.id); if (l) this.hud.say(l.zh, l.en, SPEAKERS[l.speaker]?.[0]); }
      else if (e.t === 'shot') { const d = Math.hypot(e.x - this.state.player.pos.x, e.y - this.state.player.pos.y, e.z - this.state.player.pos.z); if (d < 300) gunshot(this.audio, 0.5 * (1 - d / 300)); }
      else if (e.t === 'call') { const d = Math.hypot(e.x - this.state.player.pos.x, e.z - this.state.player.pos.z); if (d < 60) radio(this.audio, 0.25 * (1 - d / 60)); }
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
    this.hud.tick(dt);
    this.furniture.sync(this.state, this.world);
    this.status.update(this.state, dt);
    const cam = this.view.fp.cam.position;
    this.sky.update(this.state.time, cam, this.hazeDistance(), this.underAmount(dt), this.state.weather, this.lit);
    const wet = this.underwater.update(this.world, this.state.tick / 60);
    this.sky.dome.mesh.visible = !wet;
    // The lines he has rigged (M3-52).
    const rigged = this.state.lines ?? [];
    if (rigged.length !== this.rigged.userData.n) {
      this.rigged.clear();
      this.rigged.add(...lineMeshes(rigged));
      this.rigged.userData.n = rigged.length;
    }
    this.audio.setUnderwater(wet);
    // Rain stops at a roof, underground or under water.
    const covered = wet || this.under > 0.5 || !!raycast(this.world.index, cam.x, cam.y, cam.z, 0, 1, 0, 40);
    this.rain.update(this.state.tick / 60, cam, this.state.weather.rain, covered, this.state.player.pos.y);
    this.view.setLamp(this.state.player.lamp);
    this.units?.update(this.world, this.state.units, this.state.time + alpha * GAME_PER_TICK, this.view.fp.cam.position);
    this.machineSounds(dt);
    this.view.render(this.state.tick / 60, this.state.wstate.open);
    this.frames++;
  }

  private under = 0;
  /** How far into a lit underground space (the underground city's lights, M3-58), 0..1. */
  private lit = 0;
  /** Eases toward 1 while the camera is inside an underground zone. */
  private underAmount(dt: number): number {
    const c = this.view.fp.cam.position;
    const zone = this.world.zones.find(z => z.kind === 'under' && c.x > z.box.x0 && c.x < z.box.x1 && c.y > z.box.y0 && c.y < z.box.y1 && c.z > z.box.z0 && c.z < z.box.z1);
    const k = 1 - Math.exp(-3 * dt);
    this.under += ((zone ? 1 : 0) - this.under) * k;
    this.lit += ((zone?.lit ? 1 : 0) - this.lit) * k;
    return this.under;
  }

  private updatePrompt() {
    const s = this.state;
    if (s.task) { const n = Math.round((s.task.t / s.task.dur) * 10); this.hud.setPrompt(`${'■'.repeat(n)}${'□'.repeat(10 - n)}`); return; }
    const it = s.target ? allInters(s, this.world).find(i => i.id === s.target) : null;
    // Hiding spots get a prompt like everything else he can use (U-021).
    const hide = !it && s.player.mode === 'ground' ? hideNear(this.world, s.player) : -1;
    const hk = hide >= 0 ? HIDE_NAMES[this.world.hides[hide].kind] ?? ['躲进去', 'Hide'] : null;
    // A line to ride in reach of empty hands (M3-52).
    const line = !it && !hk && s.inv.held === 0 && (s.player.mode === 'ground' || s.player.mode === 'air') && lineInReach(s, this.world).line >= 0;
    const [zh, en] = it ? interLabel(s, it) : ['', ''];
    this.hud.setPrompt(this.input.uiOpen ? '' : it ? `F  ${zh}  ${en}` : hk ? `F  ${hk[0]}  ${hk[1]}` : line ? 'LMB  抓住缆绳  Take the line' : '');
  }

  private updateHands(dt: number) {
    const p = this.state.player, cam = this.view.fp.cam;
    this.hands.group.visible = p.mode !== 'dead' && p.mode !== 'hidden' && !this.input.uiOpen;
    this.hideView.update(p.mode === 'hidden' && p.hideId >= 0 ? this.world.hides[p.hideId] ?? null : null);
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
    // The pistol's rounds, and the rounds in his magazines (M4-21).
    const rounds = id === 'pistol' ? ` ${st!.charge ?? 0} / ${this.state.inv.pack.items.filter(i => i.id === 'mag9').reduce((a, m) => a + m.n * (m.charge ?? PISTOL.mag), 0)}${this.state.task?.id === 'reload' ? ' reloading' : ''}` : '';
    this.hud.setHeld(id ? `${item(id).zh} ${item(id).en}${rounds}` : '');
    if (id === this.heldId || !this.hands.ready) return;
    this.heldId = id;
    const slot = this.hands.heldSlot(1);
    if (slot) { slot.clear(); if (id) { const m = itemModel(id); m.position.copy(HELD_AT); slot.add(m); } }
  }

  start() {
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : DT;
      this.last = now;
      this.acc += dt;
      if (this.pause.open) this.acc = 0;
      const t0 = performance.now();
      while (this.acc >= DT) { this.tick(); this.acc -= DT; }
      const t1 = performance.now();
      this.render(this.acc / DT, dt);
      // Frame time (M3-53), smoothed: the sim's ticks and the render's CPU this frame.
      const k = 0.05, f = this.perf;
      f.sim += (t1 - t0 - f.sim) * k; f.render += (performance.now() - t1 - f.render) * k; f.frame += (dt * 1000 - f.frame) * k;
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

// ?dev=1 panel: noclip, god mode, teleports, scenario switch, fps, frame time and draw-call readout, a GPU bench.
import type { Game } from '../game';
import { scenarios } from '../data/scenarios';
import { clockText } from '../sim/clock';
import { teleport } from '../sim/player';

export class DevPanel {
  readonly el: HTMLDivElement;
  private stats: HTMLDivElement;
  private extra: HTMLDivElement;
  private lastFrames = 0;
  private lastTime = performance.now();

  constructor(private game: Game) {
    const el = (this.el = document.createElement('div'));
    el.id = 'dev';
    el.innerHTML = `<div><b>DEV</b> <span class="seed"></span></div>
      <div class="row stats"></div>
      <div class="row"><button class="bench">bench</button> <span class="benchout"></span></div>
      <div class="row"><label><input type="checkbox" class="noclip"> noclip</label> <label><input type="checkbox" class="god"> god</label></div>
      <div class="row">teleport <select class="tp"></select></div>
      <div class="row">scenario <select class="sc">${scenarios.map(s => `<option>${s.name}</option>`).join('')}</select></div>
      <div class="row">time <input type="range" class="time" min="0" max="24" step="0.25" style="width:110px"> <span class="clock"></span></div>
      <div class="row extra"></div>`;
    document.body.appendChild(el);
    this.stats = el.querySelector('.stats')!;
    this.extra = el.querySelector('.extra')!;
    const nc = el.querySelector<HTMLInputElement>('.noclip')!, god = el.querySelector<HTMLInputElement>('.god')!;
    nc.onchange = () => { game.state.flags.noclip = nc.checked; };
    god.onchange = () => { game.state.flags.god = god.checked; };
    const sc = el.querySelector<HTMLSelectElement>('.sc')!;
    sc.value = game.scenario.name;
    sc.onchange = () => { location.search = `?dev=1&scenario=${sc.value}&seed=${game.state.seed}`; };
    const time = el.querySelector<HTMLInputElement>('.time')!;
    time.oninput = () => {
      const t = game.state.time;
      game.state.time = Math.floor(t / 86400) * 86400 + Number(time.value) * 3600;
    };
    const bench = el.querySelector<HTMLButtonElement>('.bench')!;
    bench.onclick = () => { bench.blur(); el.querySelector('.benchout')!.textContent = this.bench(); };
    this.fillTeleports();
    setInterval(() => this.update(), 500);
    el.addEventListener('keydown', e => e.stopPropagation());
  }

  /** A container other dev tools add rows to. */
  section(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; this.extra.appendChild(d); return d; }

  fillTeleports() {
    const tp = this.el.querySelector<HTMLSelectElement>('.tp')!;
    tp.innerHTML = `<option value="">-</option>` + this.game.world.teleports.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    tp.onchange = () => {
      const t = this.game.world.teleports[Number(tp.value)];
      if (!t) return;
      teleport(this.game.state.player, t.x, t.y + 0.05, t.z);
      this.game.input.yaw = t.yaw;
      tp.blur();
    };
  }

  /** What this machine can draw, past the display's refresh cap: 60 frames back to back, waiting for the GPU
   *  to finish them (a one-pixel read), as milliseconds a frame and the frame rate that makes. */
  private bench(): string {
    const v = this.game.view, gl = v.renderer.getContext(), px = new Uint8Array(4);
    v.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) v.render(this.game.state.tick / 60, this.game.state.wstate.open);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const ms = (performance.now() - t0) / 60;
    return `${ms.toFixed(1)} ms = ${(1000 / ms).toFixed(0)} fps`;
  }

  private update() {
    const now = performance.now();
    const fps = ((this.game.frames - this.lastFrames) * 1000) / (now - this.lastTime);
    this.lastFrames = this.game.frames; this.lastTime = now;
    const info = this.game.view.renderer.info.render;
    const p = this.game.state.player;
    this.el.querySelector('.seed')!.textContent = `seed ${this.game.state.seed}`;
    this.el.querySelector('.clock')!.textContent = clockText(this.game.state.time);
    const f = this.game.perf;
    this.stats.innerHTML = `${fps.toFixed(0)} fps (${f.frame.toFixed(1)} ms) | sim ${f.sim.toFixed(1)} ms | render ${f.render.toFixed(1)} ms<br>${info.calls} calls | ${(info.triangles / 1000).toFixed(0)}k tris<br>` +
      `pos ${p.pos.x.toFixed(1)} ${p.pos.y.toFixed(1)} ${p.pos.z.toFixed(1)} | ${p.mode}/${p.posture} | grip ${p.endurance.toFixed(0)}`;
  }
}

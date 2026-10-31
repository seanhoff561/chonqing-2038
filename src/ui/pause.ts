// Pause menu (U-007, U-009, U-014): = or the browser dropping the mouse or fullscreen pauses the sim and shows
// the controls, with buttons for the movement gym (and its areas) and the game. Esc is left to the browser.
// Settings join it in M8-13.
import type { Game } from '../game';
import { teleport } from '../sim/player';
import type { Preset } from '../render/view';
import { deleteSave } from '../sim/save';

const CONTROLS: [string, string][] = [
  ['WASD / mouse', 'move / look'],
  ['Shift', 'sprint'],
  ['Space', 'jump: tap short, hold high; vault, hop'],
  ['Space again in the air', 'by a wall: kick off, wall-run or up-kick, aimed with the camera'],
  ['Left / right mouse (hold)', 'grab with that hand (empty hands only)'],
  ['W / S or drag the mouse', 'pull up / let out while hanging'],
  ['Space while hanging', 'push off a wall under your feet, or pump a swing on a bar'],
  ['Q', 'let go'],
  ['Ctrl (hold) or C', 'crouch; while running: slide; landing: roll'],
  ['Z', 'crawl'],
  ['F (hold)', 'interact; with nothing in view: sleep rough'],
  ['Left mouse, holding something', 'use it: fire, strike; the knife from behind a machine: a takedown (hold)'],
  ['Right mouse (hold) / R', 'aim a gun / reload'],
  ['1-5 / 0 or `', 'hotbar / empty hands'],
  ['Tab / L / H', 'backpack / laptop / headlamp'],
  ['=', 'pause and settings'],
];

export class PauseMenu {
  open = false;
  private el: HTMLDivElement;
  private openedAt = 0;
  private confirmNew = false;

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'pause';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    // Capture phase: decide before other menus close themselves on the same Esc.
    addEventListener('keydown', e => this.key(e), true);
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) this.auto(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) this.auto(); });
  }

  private key(e: KeyboardEvent) {
    if (e.repeat || e.code !== 'Equal') return;
    if ((e.target as HTMLElement | null)?.closest?.('input, select, textarea')) return;
    // A lost pointer lock can open the menu just before the key arrives: don't reopen-and-close.
    if (this.open) { if (performance.now() - this.openedAt > 400) this.resume(); }
    else if (!this.game.input.uiOpen && !this.game.state.dead) this.show();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  /** The browser let go of the mouse or left fullscreen while he was playing. */
  private auto() {
    if (!this.open && !this.game.input.uiOpen && !this.game.state.dead && this.game.ticks > 0) this.show();
  }

  show() {
    this.open = true;
    this.openedAt = performance.now();
    this.confirmNew = false;
    this.game.input.uiOpen = true;
    document.exitPointerLock?.();
    this.render();
    this.el.style.display = 'flex';
  }

  resume() {
    this.open = false;
    this.el.style.display = 'none';
    this.game.input.uiOpen = false;
    this.game.input.capture();
  }

  private render() {
    const g = this.game, gym = g.scenario.name === 'gym';
    const left = gym
      ? `<div class="pz-h">训练场区域 Gym areas</div>` +
        g.world.teleports.map((t, i) => `<button data-tp="${i}">${t.name}</button>`).join('') +
        `<button data-a="game">回到游戏 Back to the game</button>`
      : `<button data-a="gym">运动训练场 Movement gym</button>` +
        (g.scenario.run ? `<div class="pz-note">Leaves this run; your last sleep is saved.</div>` : '');
    const newRun = this.confirmNew ? `<button data-a="newrun" class="on">确定？ Sure? This run is lost</button>` : `<button data-a="newrun">新的一局 New run</button>`;
    const cur = g.view.preset;
    const quality = `<div class="pz-h">画质 Graphics</div><div class="pz-row">${(['low', 'medium', 'high'] as const).map(p => `<button data-preset="${p}"${p === cur ? ' class="on"' : ''}>${{ low: '低 Low', medium: '中 Medium', high: '高 High' }[p]}</button>`).join('')}</div>`;
    this.el.innerHTML = `<div class="pz-col"><div class="pz-title">暂停 PAUSED</div><button data-a="resume">继续 Resume</button>${left}${newRun}${quality}<div class="pz-note pz-credit">Map data © OpenStreetMap contributors (ODbL). Elevation: SRTM via Terrain Tiles.</div></div>
      <div class="pz-col pz-keys"><div class="pz-h">操作 Controls</div>${CONTROLS.map(([k, a]) => `<div><b>${k}</b><span>${a}</span></div>`).join('')}</div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.onclick = () => this.act(b.dataset); });
  }

  private act(d: DOMStringMap) {
    const g = this.game;
    // New run (U-025): a second click confirms; the save is gone and day 1 starts in the friends' hideout.
    if (d.a === 'newrun') {
      if (!this.confirmNew) { this.confirmNew = true; this.render(); return; }
      deleteSave(localStorage);
      g.switchTo('');
    }
    this.confirmNew = false;
    if (d.preset) { g.setPreset(d.preset as Preset); this.render(); return; }
    if (d.tp) {
      const t = g.world.teleports[Number(d.tp)];
      teleport(g.state.player, t.x, t.y + 0.05, t.z);
      g.input.yaw = t.yaw;
      g.input.pitch = 0;
    } else if (d.a === 'gym') {
      g.switchTo('gym');
      this.render();
      return;
    } else if (d.a === 'game') g.switchTo('');
    this.resume();
  }
}

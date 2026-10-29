// Pause menu (U-007, U-009): = (Esc too, though the browser may spend it on leaving fullscreen), or the browser
// dropping the mouse or fullscreen, pauses the sim and shows the controls, with buttons for the movement gym
// (and its areas) and the game. Settings join it in M8-13.
import type { Game } from '../game';
import { teleport } from '../sim/player';

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
  ['E (hold)', 'interact'],
  ['1-5 / 0 or `', 'hotbar / empty hands'],
  ['Tab / L / H', 'backpack / laptop / headlamp'],
  ['= (or Esc)', 'pause and settings'],
];

export class PauseMenu {
  open = false;
  private el: HTMLDivElement;
  private openedAt = 0;

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
    if (e.repeat || (e.code !== 'Escape' && e.code !== 'Equal')) return;
    if ((e.target as HTMLElement | null)?.closest?.('input, select, textarea')) return;
    // The browser may report the same Esc as a key and as a lost pointer lock: don't reopen-and-close.
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
    this.el.innerHTML = `<div class="pz-col"><div class="pz-title">暂停 PAUSED</div><button data-a="resume">继续 Resume</button>${left}</div>
      <div class="pz-col pz-keys"><div class="pz-h">操作 Controls</div>${CONTROLS.map(([k, a]) => `<div><b>${k}</b><span>${a}</span></div>`).join('')}</div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.onclick = () => this.act(b.dataset); });
  }

  private act(d: DOMStringMap) {
    const g = this.game;
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

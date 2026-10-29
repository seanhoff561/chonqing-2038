// The mattress: choose when to wake. Sleeping skips time; the morning save happens on waking.
import type { Game } from '../game';
import { clockText } from '../sim/clock';

const TIMES = [6, 8, 12, 15, 18, 21, 0, 3];

export class SleepUI {
  readonly el: HTMLDivElement;
  open = false;
  private eReleased = true;

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'sleep';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    // Capture phase, so the key that closes the menu doesn't also reach the game (U-014: no Esc).
    // E closes it only once the E that opened it (held for a rough sleep) has been let go (U-021).
    addEventListener('keyup', e => { if (e.code === 'KeyE') this.eReleased = true; }, true);
    addEventListener('keydown', e => {
      if (!this.open) return;
      const m = /^Digit([1-8])$/.exec(e.code);
      if (m) this.choose(TIMES[Number(m[1]) - 1]);
      else if (e.code === 'KeyE' && (e.repeat || !this.eReleased)) { /* still the opening press */ }
      else if (e.code === 'KeyE' || e.code === 'Tab') this.toggle(false);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    addEventListener('mousedown', e => { if (this.open && e.button === 2) this.toggle(false); });
  }

  toggle(on: boolean, rough = false) {
    if (on && !this.open) this.eReleased = false;
    this.open = on;
    this.game.input.uiOpen = on;
    if (on) document.exitPointerLock?.();
    this.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    this.el.innerHTML = `<div class="sl-title">${rough ? '睡在地上 SLEEP ROUGH (less rest)' : '睡觉 SLEEP'} · now ${clockText(this.game.state.time)}</div>` +
      TIMES.map((h, i) => `<button data-h="${h}">${i + 1}  until ${String(h).padStart(2, '0')}:00</button>`).join('') +
      `<button class="stay">保持清醒 Stay awake (E, Tab or right-click)</button>`;
    this.el.querySelectorAll<HTMLButtonElement>('button[data-h]').forEach(b => { b.onclick = () => this.choose(Number(b.dataset.h)); });
    this.el.querySelector<HTMLButtonElement>('.stay')!.onclick = () => this.toggle(false);
  }

  private choose(h: number) {
    this.game.input.cmds.push({ c: 'act', name: 'sleep', arg: h });
    this.toggle(false);
  }
}

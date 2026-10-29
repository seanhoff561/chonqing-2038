// The mattress: choose when to wake. Sleeping skips time; the morning save happens on waking.
import type { Game } from '../game';
import { clockText } from '../sim/clock';

const TIMES = [6, 8, 12, 15, 18, 21, 0, 3];

export class SleepUI {
  readonly el: HTMLDivElement;
  open = false;

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.id = 'sleep';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    addEventListener('keydown', e => {
      if (!this.open) return;
      const m = /^Digit([1-8])$/.exec(e.code);
      if (m) this.choose(TIMES[Number(m[1]) - 1]);
      if (e.code === 'Escape') this.toggle(false);
    });
  }

  toggle(on: boolean) {
    this.open = on;
    this.game.input.uiOpen = on;
    if (on) document.exitPointerLock?.();
    this.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    this.el.innerHTML = `<div class="sl-title">睡觉 SLEEP · now ${clockText(this.game.state.time)}</div>` +
      TIMES.map((h, i) => `<button data-h="${h}">${i + 1}  until ${String(h).padStart(2, '0')}:00</button>`).join('') +
      `<div class="sl-note">Esc to stay awake</div>`;
    this.el.querySelectorAll('button').forEach(b => { b.onclick = () => this.choose(Number(b.dataset.h)); });
  }

  private choose(h: number) {
    this.game.input.cmds.push({ c: 'act', name: 'sleep', arg: h });
    this.toggle(false);
  }
}

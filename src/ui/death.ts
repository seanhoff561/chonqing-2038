// Death: the save is gone. A short black screen with the run summary, then a fresh run.
import type { Game } from '../game';
import { deleteSave } from '../sim/save';
import { dayOf, clockText } from '../sim/clock';

const CAUSES: Record<string, [string, string]> = {
  fall: ['坠落', 'Fell'], bleeding: ['失血', 'Bled out'], drown: ['溺水', 'Drowned'], starvation: ['饥饿', 'Starved'],
  thirst: ['脱水', 'Died of thirst'], shot: ['中弹', 'Shot'], raid: ['睡梦中被杀', 'Killed in his sleep'], test: ['测试', 'Test'],
};

export class DeathScreen {
  shown = false;
  constructor(private game: Game) {}

  show() {
    if (this.shown) return;
    this.shown = true;
    const s = this.game.state;
    if (this.game.scenario.run) deleteSave(localStorage);
    const [zh, en] = CAUSES[s.dead ?? ''] ?? [s.dead ?? '', s.dead ?? ''];
    const el = document.createElement('div');
    el.id = 'death';
    el.innerHTML = `<div class="d-title">你死了</div><div class="d-sub">${zh} · ${en}</div>
      <div class="d-sum">${clockText(s.time)} · survived ${dayOf(s.time) - 1} nights</div>
      <button class="d-new">新的开始 New run</button>`;
    document.body.appendChild(el);
    this.game.input.uiOpen = true;
    document.exitPointerLock?.();
    el.querySelector<HTMLButtonElement>('.d-new')!.onclick = () => {
      const q = new URLSearchParams(location.search);
      q.delete('seed');
      location.search = q.toString();
    };
  }
}

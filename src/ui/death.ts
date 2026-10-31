// Death: the save is gone. A short black screen with the run summary, then a fresh run in place: the city as it
// stands, no reload (U-048).
import type { Game } from '../game';
import { deleteSave } from '../sim/save';
import { dayOf, clockText } from '../sim/clock';

const CAUSES: Record<string, [string, string]> = {
  fall: ['坠落', 'Fell'], bleeding: ['失血', 'Bled out'], drown: ['溺水', 'Drowned'], starvation: ['饥饿', 'Starved'],
  thirst: ['脱水', 'Died of thirst'], shot: ['中弹', 'Shot'], raid: ['睡梦中被杀', 'Killed in his sleep'],
  found: ['藏身处暴露 睡梦中被杀', 'Found in his sleep: the hideout gave itself away'], test: ['测试', 'Test'],
  turret: ['被炮塔击毙', 'Cut down by a turret'], rifle: ['被步枪击毙', "Shot by a humanoid's rifle"], smg: ['被冲锋枪击毙', 'Shot by a hunter drone'],
  prod: ['被电击棍击倒', 'Shocked by a prod'], shock: ['触电', 'Electrocuted'],
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
      this.game.switchTo(this.game.scenario.run ? '' : this.game.scenario.name);
      el.remove();
      this.shown = false;
      this.game.input.uiOpen = false;
      this.game.input.capture();
    };
  }
}

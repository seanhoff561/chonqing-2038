// On boot with an ironman save: Continue or start a new run (the full main menu arrives in M8).
import type { Game } from '../game';
import type { SaveFile } from '../sim/save';
import { deleteSave } from '../sim/save';
import { clockText } from '../sim/clock';

export function bootMenu(game: Game, save: SaveFile) {
  const el = document.createElement('div');
  el.id = 'boot';
  el.innerHTML = `<div class="bt-title">重庆 2038</div>
    <button class="cont">继续 Continue · ${clockText(save.savedAt)}</button>
    <button class="new">新的开始 New run</button>`;
  document.body.appendChild(el);
  game.input.uiOpen = true;
  const close = () => { el.remove(); game.input.uiOpen = false; };
  el.querySelector<HTMLButtonElement>('.cont')!.onclick = () => { game.loadSave(save); close(); };
  el.querySelector<HTMLButtonElement>('.new')!.onclick = () => { deleteSave(localStorage); close(); };
}

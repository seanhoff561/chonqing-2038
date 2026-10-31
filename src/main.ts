import './style.css';
import { Game } from './game';
import { unitPose } from './sim/units';
import { scenarios, scenarioByName } from './data/scenarios';
import { DevPanel } from './dev/panel';
import { addItem } from './sim/inventory';
import { readSave } from './sim/save';
import { bootMenu } from './ui/boot-menu';
import { die } from './sim/body';
import { CALIB } from './render/hands3d';
import { playMove, MOVE_SOUNDS } from './audio/moves';
import { getWorld } from './world/build';

// The loading screen (U-048): painted before the city is built, each stage named as it starts.
const loading = document.getElementById('loading');
const stage = (text: string) => {
  const el = loading?.querySelector('.ld-step');
  if (el) el.textContent = text;
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};

const q = new URLSearchParams(location.search);
const dev = q.get('dev') === '1';
const seed = Number(q.get('seed')) || Math.floor(Math.random() * 1e9);
const sc = scenarioByName(q.get('scenario') ?? 'run');
// (Each stage's end, in ms since the page opened, for the boot's budget: tests/e2e/inplace.e2e.mjs.)
const boot = { world: 0, view: 0, ready: 0 };
await stage('建造城市 · Building the city');
if (sc) getWorld(sc.world);
boot.world = performance.now();
await stage('铺设街道 · Raising the streets');
const game = new Game({ scenario: q.get('scenario') ?? 'run', seed, dev });
boot.view = performance.now();
if (dev) new DevPanel(game);
const save = q.get('scenario') ? null : readSave(localStorage);
if (save) bootMenu(game, save);
game.start();
// (Gone once the first frame is drawn.)
requestAnimationFrame(() => requestAnimationFrame(() => { loading?.remove(); boot.ready = performance.now(); }));

(window as unknown as { __cq: unknown }).__cq = {
  ready: true,
  game,
  boot,
  scenarios: scenarios.map(s => s.name),
  runFrames: (n: number) => game.runFrames(n),
  player: () => game.state.player,
  calib: CALIB,
  kill: (cause = 'test') => die(game.state, cause),
  cues: () => Object.keys(MOVE_SOUNDS),
  playCue: (id: string) => playMove(game.audio, id),
  give: (id: string, n = 1) => addItem(game.state, game.state.inv.pack, id, n),
  unitPose,
};

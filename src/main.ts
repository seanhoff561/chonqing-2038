import './style.css';
import { Game } from './game';
import { unitPose } from './sim/units';
import { scenarios } from './data/scenarios';
import { DevPanel } from './dev/panel';
import { addItem } from './sim/inventory';
import { readSave } from './sim/save';
import { bootMenu } from './ui/boot-menu';
import { die } from './sim/body';
import { CALIB } from './render/hands3d';
import { playMove, MOVE_SOUNDS } from './audio/moves';

const q = new URLSearchParams(location.search);
const dev = q.get('dev') === '1';
const seed = Number(q.get('seed')) || Math.floor(Math.random() * 1e9);
const game = new Game({ scenario: q.get('scenario') ?? 'run', seed, dev });
if (dev) new DevPanel(game);
const save = q.get('scenario') ? null : readSave(localStorage);
if (save) bootMenu(game, save);
game.start();

(window as unknown as { __cq: unknown }).__cq = {
  ready: true,
  game,
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

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createState, step, stateHash } from '../../src/sim/sim';
import { emptyInput } from '../../src/sim/types';
import { makeRng, rand } from '../../src/sim/rng';
import { makeWorld } from '../../src/world/world';
import { solid } from '../../src/world/geom';

const world = () => makeWorld({ name: 't', solids: [solid(-50, -1, -50, 50, 0, 50)], spawn: { x: 0, y: 0, z: 0, yaw: 0 } });

function run(seed: number, ticks: number) {
  const w = world();
  const s = createState(seed, w);
  const r = makeRng(seed * 7 + 1);
  for (let i = 0; i < ticks; i++) {
    const inp = emptyInput();
    inp.mx = rand(r) * 2 - 1; inp.my = rand(r) * 2 - 1; inp.yaw = rand(r) * 6; inp.pitch = rand(r) - 0.5;
    inp.buttons = Math.floor(rand(r) * 8);
    inp.pressed = inp.buttons & Math.floor(rand(r) * 8);
    step(s, w, inp);
  }
  return s;
}

describe('sim core', () => {
  it('is deterministic for the same seed and inputs', () => {
    expect(stateHash(run(42, 600))).toBe(stateHash(run(42, 600)));
    expect(run(42, 600).tick).toBe(600);
  });
  it('round-trips through JSON', () => {
    const s = run(7, 100);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('rng differs by seed and is reproducible', () => {
    const a = makeRng(1), b = makeRng(2), c = makeRng(1);
    const va = [rand(a), rand(a)], vb = [rand(b), rand(b)], vc = [rand(c), rand(c)];
    expect(va).toEqual(vc);
    expect(va).not.toEqual(vb);
  });
  it('sim and world code never use Math.random, Date or browser APIs', () => {
    // (The browser's globals, not a property of the same name: REACH.window.across is data.)
    const bad = /Math\.random|Date\.now|new Date|performance\.now|(?<![.\w])window\.|(?<![.\w])document\.|from 'three'/;
    for (const dir of ['src/sim', 'src/world']) {
      for (const f of fs.readdirSync(dir, { recursive: true }) as string[]) {
        if (!f.endsWith('.ts')) continue;
        expect(bad.test(fs.readFileSync(path.join(dir, f), 'utf8')), `${dir}/${f}`).toBe(false);
      }
    }
  });
});

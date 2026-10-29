import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B, type SimEvent } from '../../src/sim/types';

type Noise = Extract<SimEvent, { t: 'noise' }>;
function collect(buttons: number, pressed: number, rain = 0, n = secs(3)) {
  const { world, state } = setup([floor()]);
  state.flags.rain = rain;
  run(state, world, 5);
  if (pressed) run(state, world, 1, { pressed });
  const out: Noise[] = [];
  run(state, world, n, { my: 1, buttons }, s => out.push(...(s.events.filter(e => e.t === 'noise') as Noise[])));
  return out;
}

describe('movement noise', () => {
  it('footstep radii by gait', () => {
    const r = (xs: Noise[]) => Math.max(...xs.filter(e => e.kind === 'step').map(e => e.r));
    expect(r(collect(0, B.CRAWL))).toBe(1);
    expect(r(collect(0, B.CROUCH))).toBe(2);
    expect(r(collect(0, 0))).toBe(8);
    expect(r(collect(B.SPRINT, 0))).toBe(16);
  });
  it('steps come once per stride', () => {
    const jog = collect(0, 0, 0, secs(3)).filter(e => e.kind === 'step').length;
    expect(jog).toBeGreaterThan(6);
    expect(jog).toBeLessThan(10);
  });
  it('rain halves footsteps', () => {
    expect(Math.max(...collect(B.SPRINT, 0, 1).map(e => e.r))).toBe(8);
  });
  it('hard landings and vaults are loud', () => {
    const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, 3, 10)], { x: 0, y: 3, z: 0, yaw: 0 });
    const out: Noise[] = [];
    run(state, world, secs(2), { my: 1 }, s => out.push(...(s.events.filter(e => e.t === 'noise') as Noise[])));
    expect(out.find(e => e.kind === 'land')?.r).toBe(15);
    const v = setup([floor(), solid(-5, 0, -3.6, 5, 1, -3)], { x: 0, y: 0, z: 6, yaw: 0 });
    const vs: Noise[] = [];
    run(v.state, v.world, secs(1.2), { my: 1, buttons: B.SPRINT });
    for (let i = 0; i < 120; i++) {
      const near = v.state.player.pos.z - 0.25 + 3 <= 0.5;
      run(v.state, v.world, 1, { my: 1, buttons: B.SPRINT, pressed: near ? B.JUMP : 0 }, s => vs.push(...(s.events.filter(e => e.t === 'noise') as Noise[])));
      if (near) break;
    }
    expect(vs.find(e => e.kind === 'vault')?.r).toBe(6);
  });
});

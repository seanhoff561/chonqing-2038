import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

function dropFrom(h: number, god = false) {
  const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10)], { x: 0, y: h, z: 0, yaw: 0 });
  state.flags.god = god;
  run(state, world, secs(4), { my: 1 });
  return state;
}

describe('health, damage and death', () => {
  it('a 13 m fall kills and input is then ignored', () => {
    const s = dropFrom(13);
    expect(s.dead).toBe('fall');
    expect(s.player.mode).toBe('dead');
    expect(s.body.hp).toBe(0);
  });
  it('a 9 m fall deals the table damage', () => {
    const s = dropFrom(9);
    expect(s.dead).toBeNull();
    expect(s.body.hp).toBeLessThanOrEqual(50.5);
    expect(s.body.hp).toBeGreaterThan(44);
    expect(s.body.leg === 'fracture' || s.body.arm === 'fracture').toBe(true);
  });
  it('god mode ignores damage', () => {
    const s = dropFrom(13, true);
    expect(s.dead).toBeNull();
    expect(s.body.hp).toBe(100);
  });
  it('a dead player does not move', () => {
    const { world, state } = setup([floor()]);
    state.body.hp = 1;
    state.events.push({ t: 'hurt', dmg: 5, cause: 'test' });
    run(state, world, 1);
    state.events.length = 0;
    state.body.hp = 0; state.dead = 'test'; state.player.mode = 'dead';
    const z = state.player.pos.z;
    run(state, world, 60, { my: 1, buttons: B.SPRINT });
    expect(state.player.pos.z).toBe(z);
  });
});

describe('bleeding', () => {
  it('light bleeding drains 0.2 HP/s and clots after 90 s', () => {
    const { world, state } = setup([floor()]);
    state.body.lightBleed = 0;
    state.body.satiety = state.body.hydration = 25; // below the healing threshold, above starving
    run(state, world, secs(10));
    expect(100 - state.body.hp).toBeCloseTo(2, 0);
    run(state, world, secs(85));
    expect(state.body.lightBleed).toBe(-1);
    const hp = state.body.hp;
    expect(100 - hp).toBeCloseTo(18, 0);
  });
  it('heavy bleeding drains 1 HP/s and never clots; a tourniquet stops it', () => {
    const { world, state } = setup([floor()]);
    state.body.heavyBleed = true;
    run(state, world, secs(30));
    expect(100 - state.body.hp).toBeCloseTo(30, 0);
    state.body.tourniquet = true;
    const hp = state.body.hp;
    run(state, world, secs(30));
    expect(state.body.hp).toBeGreaterThanOrEqual(hp - 0.01);
    state.body.tourniquet = false;
    run(state, world, secs(80));
    expect(state.dead).toBe('bleeding');
  });
});

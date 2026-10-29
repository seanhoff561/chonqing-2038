import { describe, it, expect } from 'vitest';
import { setup, run, floor, hspeed, secs } from './helpers';
import { solid, rampSolid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

describe('player kinematics', () => {
  it('jogs, sprints and crouch-walks at the tuned speeds', () => {
    for (const [buttons, pressed, want] of [[0, 0, 3.2], [B.SPRINT, 0, 7.0], [0, B.CROUCH, 1.6]] as const) {
      const { world, state } = setup([floor()]);
      run(state, world, 5);
      run(state, world, secs(2), { my: 1, buttons, pressed });
      expect(Math.abs(hspeed(state) - want) / want).toBeLessThan(0.03);
    }
  });

  it('walls stop him with no tunnelling at sprint speed', () => {
    const { world, state } = setup([floor(), solid(-5, 0, -10.2, 5, 4, -10)]);
    run(state, world, secs(3), { my: 1, buttons: B.SPRINT }, s => expect(s.player.pos.z).toBeGreaterThan(-10 + 0.24));
    expect(state.player.pos.z).toBeCloseTo(-9.75, 2);
  });

  it('a 30 m/s fall lands on a thin slab', () => {
    const { world, state } = setup([solid(-5, 0, -5, 5, 0.1, 5)], { x: 0, y: 60, z: 0, yaw: 0 });
    run(state, world, secs(4));
    expect(state.player.pos.y).toBeCloseTo(0.1, 2);
    expect(state.player.onGround).toBe(true);
  });

  it('steps up 0.45 m but not 0.55 m', () => {
    const a = setup([floor(), solid(-5, 0, -40, 5, 0.42, -3)]);
    run(a.state, a.world, secs(3), { my: 1 });
    expect(a.state.player.pos.y).toBeCloseTo(0.42, 2);
    const b = setup([floor(), solid(-5, 0, -8, 5, 0.55, -3)]);
    run(b.state, b.world, secs(3), { my: 1 });
    expect(b.state.player.pos.y).toBeLessThan(0.01);
  });

  it('climbs a 30-degree stair ramp at jog speed and descends without leaving the ground', () => {
    const rise = Math.tan(Math.PI / 6) * 10;
    const solids = [floor(), rampSolid(-3, -1, -12, 3, -2, 0, rise, 4), solid(-3, -1, -30, 3, rise, -12)];
    const { world, state } = setup(solids);
    run(state, world, 5);
    let airborne = 0;
    run(state, world, secs(4.5), { my: 1 }, s => { if (s.player.pos.z < -3 && s.player.pos.z > -11 && !s.player.onGround) airborne++; });
    expect(state.player.pos.y).toBeCloseTo(rise, 1);
    expect(airborne).toBe(0);
    // Walk back down facing south.
    state.player.yaw = Math.PI;
    run(state, world, secs(4.5), { my: 1, yaw: Math.PI }, s => { if (s.player.pos.z < -3 && s.player.pos.z > -11 && !s.player.onGround) airborne++; });
    expect(state.player.pos.y).toBeLessThan(0.01);
    expect(airborne).toBe(0);
  });

  it('crouches under a 1.3 m ceiling and cannot stand there', () => {
    const { world, state } = setup([floor(), solid(-5, 1.3, -10, 5, 2, -4)]);
    run(state, world, 5);
    run(state, world, secs(4), { my: 1 });
    expect(state.player.pos.z).toBeGreaterThan(-4); // blocked standing
    run(state, world, 1, { pressed: B.CROUCH });
    run(state, world, secs(3), { my: 1 });
    expect(state.player.pos.z).toBeLessThan(-6);
    run(state, world, 1, { pressed: B.CROUCH });
    expect(state.player.posture).toBe('crouch');
  });
});

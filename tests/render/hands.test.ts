import { describe, it, expect } from 'vitest';
import { poseFor } from '../../src/render/hands3d';
import { createPlayer, type Player } from '../../src/sim/player';

const at = (mode: Player['mode'], speed: number, posture: Player['posture'] = 'stand') => ({ ...createPlayer(0, 0, 0, 0), mode, posture, vel: { x: 0, y: 0, z: -speed } });

describe('walking and running hands (M1-39, U-007)', () => {
  it('on the ground the hands sit low at his sides; in the air and crawling they reach forward', () => {
    for (const i of [0, 1]) {
      const g = poseFor(at('ground', 0), i, false, false, null, 0), air = poseFor(at('air', 0), i, false, false, null, 0);
      expect(g.pos.y).toBeLessThan(air.pos.y - 0.1);
      expect(Math.abs(g.pos.x)).toBeGreaterThan(Math.abs(air.pos.x));
      expect(poseFor(at('ground', 0.5, 'crawl'), i, false, false, null, 0)).toEqual(air);
    }
  });
  it('the arms swing opposite each other with the stride, wider when running', () => {
    const swing = (speed: number) => {
      const p = at('ground', speed);
      const z = (i: number, ph: number) => poseFor(p, i, false, false, null, ph).pos.z;
      expect(Math.sign(z(0, Math.PI / 2) - z(0, -Math.PI / 2))).toBe(-Math.sign(z(1, Math.PI / 2) - z(1, -Math.PI / 2)));
      return Math.abs(z(1, Math.PI / 2) - z(1, -Math.PI / 2)) + Math.abs(poseFor(p, 1, false, false, null, Math.PI / 2).pos.y - poseFor(p, 1, false, false, null, -Math.PI / 2).pos.y);
    };
    expect(swing(7)).toBeGreaterThan(swing(3.2) * 1.5);
    expect(swing(3.2)).toBeGreaterThan(0.02);
  });
});

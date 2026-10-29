import { describe, it, expect } from 'vitest';
import { poseFor } from '../../src/render/hands3d';
import { supportPoint, oneHanded } from '../../src/render/items3d';
import { createPlayer } from '../../src/sim/player';

describe('held items in both hands (M1-38, U-007)', () => {
  const p = createPlayer(0, 0, 0, 0);
  it('two-handed items bring the left hand onto the item, next to the right', () => {
    for (const id of ['crowbar', 'water', 'pistol', 'extinguisher', 'jerrycan']) {
      const s = supportPoint(id);
      expect(s, id).not.toBeNull();
      const right = poseFor(p, 1, false, true, null, 0, s), left = poseFor(p, 0, false, true, null, 0, s);
      expect(left.pos.distanceTo(right.pos), id).toBeLessThan(0.35);
      expect(left.pos.x, id).toBeLessThan(right.pos.x);
    }
  });
  it('small things stay in one hand and the left hand keeps its own pose', () => {
    for (const id of ['phone', 'painkillers', 'chocolate', 'knife', 'sdr']) expect(oneHanded(id), id).toBe(true);
    const g = { ...p, mode: 'ground' as const };
    const left = poseFor(g, 0, false, true, null, 0, supportPoint('phone'));
    expect(left).toEqual(poseFor(g, 0, false, false, null, 0, null));
  });
});

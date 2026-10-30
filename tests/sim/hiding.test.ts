// M3-47 (U-021): many more places to hide across the city, each kind one he can get into: crates and dumpsters in
// the alleys and by the streets, wardrobes in the flats, water tanks on the roofs, plastic drums, kiosks, car
// boots and the backs of vans.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { B } from '../../src/sim/types';
import { hideNear } from '../../src/sim/hide';
import { run } from './helpers';

const w = getWorld('yuzhong');
const KINDS = ['crate', 'dumpster', 'wardrobe', 'tank', 'drum', 'kiosk', 'boot', 'van'];

/** Stand in front of hiding place i, facing it, and press E: is he hidden in it? */
function hideIn(i: number): boolean {
  const h = w.hides[i], b = h.inner, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, yaw = h.yaw ?? 0;
  // Out of its front (+z, turned) or either side, past its half-depth.
  for (const a of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const dx = Math.sin(yaw + a), dz = Math.cos(yaw + a), out = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + 0.5;
    const s = createState(1, w);
    teleport(s.player, cx + dx * out, b.y0 + 0.05, cz + dz * out);
    run(s, w, 45);
    s.player.yaw = Math.atan2(dx, dz);
    if (hideNear(w, s.player) !== i) continue;
    run(s, w, 1, { pressed: B.INTERACT });
    run(s, w, 60);
    if (s.player.mode === 'hidden' && s.player.hideId === i) return true;
  }
  return false;
}

describe('places to hide (M3-47)', () => {
  it('has many of every kind across the city', () => {
    const n = (k: string) => w.hides.filter(h => h.kind === k).length;
    for (const k of KINDS) expect(n(k), k).toBeGreaterThan(k === 'kiosk' || k === 'van' ? 10 : 40);
    expect(w.hides.length).toBeGreaterThan(2000);
  });
  it('lets him into each kind', { timeout: 120000 }, () => {
    for (const k of KINDS) {
      const ids = w.hides.map((h, i) => (h.kind === k ? i : -1)).filter(i => i >= 0).slice(0, 12);
      expect(ids.some(hideIn), k).toBe(true);
    }
  });
});

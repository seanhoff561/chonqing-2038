import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { districtAt } from '../../src/world/yuzhong/lots';
import { teleport } from '../../src/sim/player';
import { stashIds } from '../../src/sim/shelter';
import { loot } from '../../src/data/loot';
import { run, aim } from './helpers';
import { free } from '../../src/sim/physics';
import { B } from '../../src/sim/types';

const w = getWorld('yuzhong');
const inDistricts = (x: number, z: number) => ['shibati', 'jiaochangkou'].includes(districtAt(x, z).district);
const local = w.sites.filter(s => inDistricts(s.x, s.z));

describe('shelter sites (M3-29, U-013)', () => {
  it('Shibati and Jiaochangkou offer at least 8 sites with beds, tables and containers, and varied exposure', () => {
    expect(local.length).toBeGreaterThanOrEqual(8);
    expect(local.filter(s => s.bed).length).toBeGreaterThanOrEqual(3);
    expect(local.filter(s => s.table).length).toBeGreaterThanOrEqual(3);
    expect(local.filter(s => s.containers.length).length).toBeGreaterThanOrEqual(5);
    expect(local.some(s => s.kind === 'roof hut')).toBe(true);
    expect(new Set(local.map(s => s.streetSides)).size).toBeGreaterThan(1);
    expect(new Set(local.map(s => s.windows)).size).toBeGreaterThan(1);
    for (const s of local) for (const id of [s.bed, s.table, ...s.containers].filter(Boolean)) expect(w.inter.some(i => i.id === id), id!).toBe(true);
  });
  it('loot can turn up a sleeping bag, a mattress and a toolbox', () => {
    const all = Object.values(loot).flatMap(t => t.items.map(e => e.id));
    for (const id of ['bedroll', 'mattress', 'toolbox', 'foldcrate']) expect(all, id).toContain(id);
  });
  it('sets up a shelter in a site: claims its bed, its containers become the stash', () => {
    const site = local.find(s => s.bed && s.containers.length)!;
    const bed = w.inter.find(i => i.id === site.bed)!;
    const s = createState(1, w);
    // Stand a metre from the bed on its own floor (a site's rooms span floors since M3-36, its bed may not be on the
    // first room's) where he can see it, and look at it.
    const floor = bed.y - 0.5;
    for (let a = 0; a < 16 && s.target !== bed.id; a++) {
      const x = bed.x + Math.cos(a * Math.PI / 8) * 1.1, z = bed.z + Math.sin(a * Math.PI / 8) * 1.1;
      if (!free(w.index, x, floor + 0.05, z, 1.75)) continue;
      teleport(s.player, x, floor + 0.05, z);
      run(s, w, 10);
      aim(s, bed.x, bed.y, bed.z);
      run(s, w, 1);
    }
    run(s, w, 1, { pressed: B.INTERACT });
    expect(s.shelters.map(h => h.id)).toContain(bed.id);
    expect(stashIds(s, w)).toEqual(expect.arrayContaining(site.containers));
  });
});

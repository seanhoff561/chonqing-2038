import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { DISTRICTS } from '../../src/data/map';
import { TILE } from '../../src/world/map';
import { teleport } from '../../src/sim/player';
import { stashIds } from '../../src/sim/shelter';
import { loot } from '../../src/data/loot';
import { run, aim } from './helpers';
import { B } from '../../src/sim/types';

const w = getWorld('city');
const inDistricts = (x: number, z: number) => ['shibati', 'jiaochangkou'].some(id => {
  const [c0, r0, c1, r1] = DISTRICTS.find(d => d.id === id)!.box;
  return x >= c0 * TILE && x < (c1 + 1) * TILE && z >= r0 * TILE && z < (r1 + 1) * TILE;
});
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
    // Stand a metre from the bed toward the middle of the room and look at it.
    const dx = site.x - bed.x, dz = site.z - bed.z, l = Math.hypot(dx, dz) || 1;
    teleport(s.player, bed.x + (dx / l) * 1.1, site.y + 0.05, bed.z + (dz / l) * 1.1);
    run(s, w, 10);
    aim(s, bed.x, bed.y, bed.z);
    run(s, w, 1, { pressed: B.INTERACT });
    expect(s.shelter.id).toBe(bed.id);
    expect(stashIds(s, w)).toEqual(expect.arrayContaining(site.containers));
  });
});

// M4-22b (U-047, U-048): the friends' hideout under a real alley at the heart of the district's routes. The grate is
// in an alley between two of the city's own buildings (none built for it); the alley is the one nearest the middle of
// the other key points, with a drainpipe up a wall onto the roofs and the routes; the chamber is sealed off from the
// Grand Tunnel and the underground, no way down within 60 m; and a run still starts in it and climbs out by the grate.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath, nearestNav } from '../../src/sim/nav';
import { raycast } from '../../src/world/geom';
import { HOME } from '../../src/world/yuzhong/home';
import { GRATE } from '../../src/sim/grate';
import { run, secs, aim, settle, LMB, RMB } from './helpers';
import { B } from '../../src/sim/types';

const w = getWorld('yuzhong'), grate = w.inter.find(i => i.id === 'airraid-grate')!, site = w.sites.find(s => s.id === 'airraid')!;
const key = (n: string) => w.features.find(f => f.kind === `key:${n}`)!;

describe("the friends' hideout (M4-22b)", () => {
  it("is under a real alley: two of the city's buildings either side of the grate, close", () => {
    // Walls within the alley's width on two opposite sides, at head height and over it.
    const hit = (a: number, y: number) => !!raycast(w.index, grate.x, grate.y + y, grate.z, Math.cos(a), 0, Math.sin(a), HOME.wide);
    const walls = [0, 1, 2, 3, 4, 5, 6, 7].map(k => hit((k * Math.PI) / 4, 1.6) && hit((k * Math.PI) / 4, 4));
    expect(walls.some((h, k) => h && walls[(k + 4) % 8])).toBe(true);
    // They're the city's lots: two built plots within the alley's width of it.
    const edge = (q: [number, number][]) => Math.min(...q.map((c, i) => { const n = q[(i + 1) % q.length], ex = n[0] - c[0], ez = n[1] - c[1], t = Math.max(0, Math.min(1, ((grate.x - c[0]) * ex + (grate.z - c[1]) * ez) / (ex * ex + ez * ez))); return Math.hypot(c[0] + ex * t - grate.x, c[1] + ez * t - grate.z); }));
    expect(w.plots.filter(p => !p.far && edge(p.corners) < HOME.wide).length).toBeGreaterThanOrEqual(2);
  });
  it('is at the heart of the routes: nearer the middle of the other key points than any of them, joined to the far ones, a pipe up to the roofs', () => {
    const others = ['jiaochangkou', 'shibati top', 'riverfront'].map(key), mid = { x: others.reduce((a, k) => a + k.x / 3, 0), z: others.reduce((a, k) => a + k.z / 3, 0) };
    const d = Math.hypot(grate.x - mid.x, grate.z - mid.z);
    for (const k of others) expect(d, k.kind).toBeLessThan(Math.hypot(k.x - mid.x, k.z - mid.z));
    for (const k of ['jiaochangkou', 'riverfront']) for (const layer of ['street', 'roof', 'under']) expect(w.links.some(l => l.from === 'hideout gate' && l.to === k && l.layer === layer), `${k} ${layer}`).toBe(true);
    // (The stair's top is a short walk off, and joined to both.) Every one of the district's ways passes near it.
    expect(Math.hypot(key('shibati top').x - grate.x, key('shibati top').z - grate.z)).toBeLessThan(150);
    for (const l of w.links) expect(Math.min(...l.route.pts.map(q => Math.hypot(q.x - grate.x, q.z - grate.z))), l.route.id).toBeLessThan(150);
    // The drainpipe: from the alley floor near the grate up onto a roof the roof routes go over.
    const pipe = w.climbables.find(c => c.kind === 'pipe' && Math.hypot(c.x - grate.x, c.z - grate.z) < 6 && Math.abs(c.y0 - grate.y) < 0.3)!;
    expect(pipe).toBeTruthy();
    expect(pipe.y1 - pipe.y0).toBeGreaterThanOrEqual(HOME.roof[0]);
    const roof = w.links.find(l => l.from === 'hideout gate' && l.layer === 'roof')!.route;
    expect(roof.ways).toContain('pipe');
  });
  it('is sealed: no way along the ground into the chamber but the grate, no way down within 60 m', () => {
    const bed = w.inter.find(i => i.id === 'airraid-mattress')!;
    // The machines' nav graph doesn't reach it; it's 10 m under the alley.
    expect(grate.y - site.y).toBeGreaterThan(HOME.depth - 0.5);
    const n = nearestNav(w.nav!, bed, 30);
    expect(n < 0 || Math.abs(w.nav!.pts[n].y - bed.y) > 3).toBe(true);
    for (const f of w.features.filter(f => f.kind.startsWith('way:'))) expect(Math.hypot(f.x - grate.x, f.z - grate.z), f.kind).toBeGreaterThan(HOME.clear);
    for (const t of ['Grand Tunnel entrance', 'Grand Tunnel exit']) { const q = w.teleports.find(x => x.name === t)!; expect(Math.hypot(q.x - grate.x, q.z - grate.z), t).toBeGreaterThan(HOME.clear); }
    expect(navPath(w.nav!, { x: grate.x, y: grate.y, z: grate.z }, bed, 'quadruped')?.pts.some(p => p.y < grate.y - 3) ?? false).toBe(false);
  });
  it('starts a run in the chamber; he climbs the ladder, opens the grate and climbs out into the alley', async () => {
    await settle();
    const s = createState(1, w), p = s.player;
    s.units.length = 0; s.flags.clear = true;
    const spawn = w.teleports.find(t => t.name.startsWith("Friends' hideout"))!;
    expect(Math.hypot(w.spawn.x - spawn.x, w.spawn.z - spawn.z)).toBeLessThan(1);
    // Hand over hand up the shaft's ladder (as tests/sim/grate.test.ts) until the grate stops him.
    const ladder = w.climbables.find(c => c.kind === 'ladder' && Math.hypot(c.x - grate.x, c.z - grate.z) < 1.5)!, bits = [LMB, RMB];
    teleport(p, ladder.x + ladder.nx * 0.7, ladder.y0 + 0.01, ladder.z + ladder.nz * 0.7);
    run(s, w, 5);
    let hand = 0, last = -1;
    const holding = () => p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
    for (let k = 0; k < 60; k++) {
      aim(s, ladder.x + ladder.nx * 0.08, Math.min(grate.y - 0.2, p.pos.y + 2.2), ladder.z + ladder.nz * 0.08);
      run(s, w, 2, { buttons: holding() | bits[hand] });
      run(s, w, secs(0.8), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'grip' && Math.abs(p.pos.y - last) < 0.02) break;
      last = p.pos.y;
    }
    expect(p.pos.y).toBeGreaterThan(grate.y - 3);
    // Draw the bolts and push it up (E held), then up and over onto the alley.
    const keep = holding();
    aim(s, grate.x, grate.y, grate.z);
    run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT | keep });
    for (let i = 0; i < secs(GRATE.unbolt + 0.5) && !s.wstate.open[grate.id]; i++) run(s, w, 1, { buttons: B.INTERACT | keep });
    expect(s.wstate.open[grate.id]).toBe(true);
    for (let k = 0; k < 6 && p.mode !== 'ground'; k++) run(s, w, secs(0.5), { buttons: keep, my: 1, pressed: B.JUMP });
    run(s, w, secs(1));
    expect(p.pos.y).toBeGreaterThan(grate.y - 0.1);
  });
});

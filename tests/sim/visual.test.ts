// M4-22d (U-049): the visual pass. Roofs mostly bare or with one arrangement set square to their edges (a water tank
// on stilts with drums, a row of condensers, solar heaters, a shed with crates, a stairwell hut), little at their
// edges; QR stickers rare; no street surface laid over a hole in the ground (a grate or a stairway shows through).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';

const w = getWorld('yuzhong'), count = (k: string) => w.props.filter(p => p.kind === k).length, lots = w.plots.filter(p => !p.far).length;

describe('visual pass (U-049)', () => {
  it('keeps the roofs sparse: under one tank, aerial or dish to every five roofs, pots to every three', () => {
    // (Before: 2051 tanks, 1235 aerials, 1236 dishes, 3911 pots on 5500 roofs.)
    expect(count('stilts') / lots).toBeLessThan(0.2);
    expect(count('antenna') / lots).toBeLessThan(0.2);
    expect(count('dish') / lots).toBeLessThan(0.1);
    expect(count('pot') / lots).toBeLessThan(0.34);
    // Each tank has its drums beside it, square to it: the arrangement, not a scatter.
    const drums = w.props.filter(p => p.kind === 'drum');
    const tanks = w.props.filter(p => p.kind === 'stilts');
    const paired = tanks.filter(t => drums.filter(d => Math.abs(d.y - t.y) < 0.05 && Math.hypot(d.x - t.x, d.z - t.z) < 3.4).length >= 2);
    expect(paired.length / tanks.length).toBeGreaterThan(0.95);
  });
  it('puts up QR stickers rarely', () => {
    // (Before: 400.)
    expect(count('qr')).toBeLessThan(80);
    expect(count('qr')).toBeGreaterThan(10);
  });
  it('leaves the ground open over its holes: grates and stairways', () => {
    const g = w.ground!, holes: [number, number][] = [];
    for (let j = 0; j < g.h - 1; j++) for (let i = 0; i < g.w - 1; i++) if (g.hole[j * (g.w - 1) + i]) holes.push([g.x0 + (i + 0.5) * g.cell, g.z0 + (j + 0.5) * g.cell]);
    expect(holes.length).toBeGreaterThan(20);
    // The under-grates' openings: nothing solid between the grate and the shaft under it but the grate itself.
    const grates = w.inter.filter(i => String(i.id).startsWith('under-grate'));
    expect(grates.length).toBeGreaterThan(3);
  });
});

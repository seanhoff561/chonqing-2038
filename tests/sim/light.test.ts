// M3-16: the light map. The lights are world data (lampposts, neon and LED signs, lamps, floodlights); lightAt
// combines the sky's light by the hour (less under a roof, next to none underground) with the strongest light near.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { lightAt, lightsOf, LAMP_LIGHT } from '../../src/sim/light';

const w = getWorld('yuzhong'), H = 3600, NIGHT = 2 * H, NOON = 12 * H;
const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('the light map (M3-16)', () => {
  it('gathers the lights from the world', () => {
    const n = (k: string) => lightsOf(w).filter(l => l.kind === k).length;
    expect(n('post')).toBe(w.props.filter(p => p.kind === 'lamppost').length);
    expect(n('post')).toBeGreaterThan(300);
    expect(n('neon')).toBeGreaterThan(1000);
    expect(n('lamp')).toBeGreaterThan(300);
    expect(n('flood')).toBeGreaterThan(4);
  });
  it('lights the street under a lamppost at night above 0.6', () => {
    const under = w.props.filter(p => p.kind === 'lamppost').map(p => lightAt(w, { x: p.x + 0.6, y: p.y, z: p.z }, NIGHT));
    expect(Math.min(...under)).toBeGreaterThan(0.6);
  });
  it('leaves a dark alley at night at about 0.12', () => {
    // By the crates and dumpsters in the alleys between buildings, on top of them.
    const alley = w.features.filter(f => f.kind === 'crate' || f.kind === 'dumpster').map(f => lightAt(w, { x: f.x, y: f.y + 1.2, z: f.z }, NIGHT));
    expect(alley.length).toBeGreaterThan(50);
    expect(median(alley)).toBeCloseTo(0.12, 2);
  });
  it('follows the hour in the open: day 1, dusk about half, night 0.12', () => {
    const open = w.props.filter(p => p.kind === 'lamppost').map(p => ({ x: p.x + 9, y: p.y, z: p.z })).filter(q => lightAt(w, q, NIGHT) === 0.12);
    expect(open.length).toBeGreaterThan(20);
    for (const q of open.slice(0, 20)) {
      expect(lightAt(w, q, NOON)).toBe(1);
      expect(Math.abs(lightAt(w, q, 19 * H) - 0.5)).toBeLessThan(0.1);
    }
  });
  it('is dark underground but for a lit hall, and dim indoors', () => {
    // (Teleports are at eye height.)
    const t = w.teleports.find(q => q.name === 'Metro tunnel')!, deep = { x: t.x, y: t.y - 1.45, z: t.z };
    expect(lightAt(w, deep, NOON)).toBeLessThan(0.2);
    const hall = w.zones.find(z => z.kind === 'under' && z.lit)!.box;
    expect(lightAt(w, { x: (hall.x0 + hall.x1) / 2, y: hall.y0 + 1, z: (hall.z0 + hall.z1) / 2 }, NIGHT)).toBeGreaterThanOrEqual(0.5);
    // In the flats, by day: what comes in at the windows.
    const flats = w.sites.filter(s => s.kind === 'flat').slice(0, 40).map(s => lightAt(w, s, NOON));
    expect(median(flats)).toBeLessThanOrEqual(0.6);
    expect(median(flats)).toBeGreaterThan(0.3);
  });
  it('lights him with his own headlamp', () => {
    const p = w.features.find(f => f.kind === 'crate')!;
    expect(lightAt(w, { x: p.x, y: p.y + 1.2, z: p.z }, NIGHT, LAMP_LIGHT[1])).toBe(1);
    expect(lightAt(w, { x: p.x, y: p.y + 1.2, z: p.z }, NIGHT, LAMP_LIGHT[2])).toBeGreaterThanOrEqual(0.4);
  });
});

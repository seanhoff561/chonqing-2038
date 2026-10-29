import { describe, it, expect } from 'vitest';
import { solid, rampSolid, buildIndex, overlaps, groundAt, raycast, topAt, carve, volume, type Box } from '../../src/world/geom';

const b = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({ x0, y0, z0, x1, y1, z1 });

describe('collision world', () => {
  const floor = solid(-20, -1, -20, 20, 0, 20);
  const wall = solid(5, 0, -5, 6, 3, 5);
  const ramp = rampSolid(-10, 0, -2, -4, 2, 0, 3, 1); // rises toward +x from 0 to 3 m
  const idx = buildIndex([floor, wall, ramp]);

  it('detects box overlap but not touching faces', () => {
    expect(overlaps(idx, b(4.8, 0.5, 0, 5.3, 2, 0.5))).toBe(true);
    expect(overlaps(idx, b(4.5, 0, 0, 5, 2, 0.5))).toBe(false); // touches the wall face and the floor top
    expect(overlaps(idx, b(0, 0.1, 0, 1, 1, 1))).toBe(false);
  });
  it('ramp surface height and overlap follow the slope', () => {
    expect(topAt(ramp, -10, 0)).toBeCloseTo(0);
    expect(topAt(ramp, -7, 0)).toBeCloseTo(1.5);
    expect(topAt(ramp, -4, 0)).toBeCloseTo(3);
    expect(groundAt(idx, -7, 0, 10)).toBeCloseTo(1.5);
    expect(overlaps(idx, b(-7.25, 1.6, -0.25, -6.75, 3, 0.25))).toBe(true); // footprint reaches 1.625
    expect(overlaps(idx, b(-7.25, 1.7, -0.25, -6.75, 3, 0.25))).toBe(false);
  });
  it('ground height picks the highest top at or below the query', () => {
    expect(groundAt(idx, 5.5, 0, 10)).toBe(3);
    expect(groundAt(idx, 5.5, 0, 2)).toBe(0);
    expect(groundAt(idx, 30, 0, 10)).toBe(-Infinity);
  });
  it('raycast hits boxes with the entry normal', () => {
    const h = raycast(idx, 0, 1, 0, 1, 0, 0, 100)!;
    expect(h.t).toBeCloseTo(5);
    expect([h.nx, h.ny, h.nz]).toEqual([-1, 0, 0]);
    const d = raycast(idx, 0, 5, 0, 0, -1, 0, 100)!;
    expect(d.t).toBeCloseTo(5);
    expect(d.ny).toBe(1);
  });
  it('raycast hits the ramp slope and misses over it', () => {
    const h = raycast(idx, -7, 10, 0, 0, -1, 0, 100)!;
    expect(h.t).toBeCloseTo(8.5);
    expect(h.ny).toBeGreaterThan(0.8);
    expect(h.nx).toBeLessThan(0);
    expect(raycast(idx, -20, 3.5, 0, 1, 0, 0, 24)).toBeNull(); // passes over the ramp's high end, stops before the wall
  });
  it('raycast misses and respects max distance across many cells', () => {
    expect(raycast(idx, 0, 1, 0, 0, 0, 1, 100)).toBeNull();
    expect(raycast(idx, 0, 1, 0, 1, 0, 0, 4)).toBeNull();
    const far = raycast(idx, -19, 0.5, -19, 1, 0, 1, 100)!; // diagonal through cells, hits the ramp side or wall
    expect(far).not.toBeNull();
  });
});

describe('carving', () => {
  it('a tunnel through a block leaves walls, floor and ceiling around an empty interior', () => {
    const block = solid(0, 0, 0, 10, 10, 10);
    const tunnel = b(-1, 2, 4, 11, 5, 6);
    const pieces = carve([block], tunnel);
    const idx = buildIndex(pieces);
    expect(overlaps(idx, b(1, 2.5, 4.5, 9, 4.5, 5.5))).toBe(false);
    expect(overlaps(idx, b(1, 1, 4.5, 2, 1.9, 5.5))).toBe(true); // floor
    expect(overlaps(idx, b(1, 5.1, 4.5, 2, 6, 5.5))).toBe(true); // ceiling
    expect(overlaps(idx, b(1, 3, 3, 2, 4, 3.9))).toBe(true); // wall
    const total = pieces.reduce((a, s) => a + volume(s), 0);
    expect(total).toBeCloseTo(1000 - 10 * 3 * 2);
  });
  it('a room carved inside a block keeps all six sides', () => {
    const pieces = carve([solid(0, 0, 0, 10, 10, 10)], b(2, 2, 2, 8, 8, 8));
    expect(pieces.length).toBe(6);
    expect(pieces.reduce((a, s) => a + volume(s), 0)).toBeCloseTo(1000 - 216);
  });
  it('leaves ramps and untouched solids alone', () => {
    const r = rampSolid(20, 0, 0, 30, 5, 0, 3, 1);
    const s = solid(40, 0, 0, 41, 1, 1);
    expect(carve([r, s], b(0, 0, 0, 100, 100, 100)).length).toBe(1);
  });
});

// M3-39 (U-017): the geo data puts the real places where they are, at their real distances and heights.
import { describe, it, expect } from 'vitest';
import { GEO, groundAt, toLocal } from '../../src/world/geo';

const L = GEO.landmarks as Record<string, { x: number; z: number; lon: number; lat: number; ground: number }>;
/** Great-circle distance in metres, independent of the map projection. */
const haversine = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => {
  const R = 6371008.8, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

describe('geo data (M3-39)', () => {
  const names = ['jiefangbei', 'shibati', 'hongyadong', 'chaotianmen', 'jiaochangkou', 'xiaoshizi', 'grandTunnel', 'cablewayNorth'];
  it('places the landmarks at their real positions', () => {
    for (const n of names) {
      const [x, z] = toLocal(L[n].lon, L[n].lat);
      expect(Math.hypot(x - L[n].x, z - L[n].z), n).toBeLessThan(5);
    }
    // Real distances between them, by great circle, survive the projection to within 5 m.
    for (const a of names) for (const b of names) if (a < b) expect(Math.abs(Math.hypot(L[a].x - L[b].x, L[a].z - L[b].z) - haversine(L[a], L[b])), `${a}-${b}`).toBeLessThan(5);
    expect(Math.hypot(L.jiefangbei.x - L.chaotianmen.x, L.jiefangbei.z - L.chaotianmen.z)).toBeGreaterThan(1000);
  });
  it('gives them their real heights', () => {
    for (const n of names) expect(Math.abs(groundAt(L[n].x, L[n].z) - L[n].ground), n).toBeLessThan(3);
    // The ridge stands over the rivers: Jiefangbei and Jiaochangkou high, Shibati stepping down, the rivers lowest.
    expect(groundAt(L.jiefangbei.x, L.jiefangbei.z)).toBeGreaterThan(240);
    expect(groundAt(L.jiaochangkou.x, L.jiaochangkou.z)).toBeGreaterThan(groundAt(L.shibati.x, L.shibati.z));
    expect(groundAt(L.jiefangbei.x, L.jiefangbei.z)).toBeGreaterThan(groundAt(L.hongyadong.x, L.hongyadong.z) + 30);
    for (const n of ['qiansimenBridge', 'dongshuimenBridge']) expect(groundAt(L[n].x, L[n].z), n).toBeLessThan(175);
  });
  it('carries the streets, stairs, buildings, Line 2 and the cableway', () => {
    expect(GEO.streets.filter(s => s[2] & 1).length).toBeGreaterThan(100);
    expect(GEO.streets.length).toBeGreaterThan(800);
    expect(GEO.buildings.length).toBeGreaterThan(500);
    expect(GEO.buildings.filter(b => b[0] > 0).length).toBeGreaterThan(100);
    expect(GEO.rails.filter(r => r[0] === 'monorail').length).toBeGreaterThan(3);
    expect(GEO.aerial.length).toBeGreaterThan(0);
    expect(GEO.areas.some(a => a[0] === 'park')).toBe(true);
  });
});

// M3-14: signs in Chinese. The crowded centres hang shop signs, LED screens and tickers, red banners and QR stickers
// on their street fronts; Shibati's old houses their lanterns, cloth and light boxes, and the banners. Each flat on
// its wall, facing a street.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { districtAt } from '../../src/world/yuzhong/lots';

const w = getWorld('yuzhong');
const of = (k: string, where?: (d: { district: string; cyber: boolean }) => boolean) => w.props.filter(p => p.kind === k && (!where || where(districtAt(p.x, p.z))));
const cyber = (d: { cyber: boolean }) => d.cyber, shibati = (d: { district: string }) => d.district === 'shibati';

describe('signs (M3-14)', () => {
  it('hangs every kind in the crowded centres', () => {
    // (QR stickers only now and then since U-049: a tenth as many as there were.)
    for (const [k, n] of [['neonblade', 200], ['ledscreen', 20], ['ledboard', 40], ['redbanner', 15], ['qr', 10]] as const) expect(of(k, cyber).length, k).toBeGreaterThan(n);
    expect(of('qr').length).toBeLessThan(80);
  });
  it("hangs Shibati's old houses with signs and banners, and no screens", () => {
    expect(of('neonblade', shibati).length).toBeGreaterThan(10);
    expect(of('redbanner', shibati).length).toBeGreaterThan(2);
    expect(of('ledscreen', shibati).length).toBe(0);
  });
  it('lays each flat sign on its wall', () => {
    for (const k of ['qr', 'redbanner', 'ledboard']) {
      const ps = of(k), off = ps.filter(p => {
        // Back from its face into the wall, at its middle height.
        const dx = -Math.sin(p.yaw), dz = -Math.cos(p.yaw), hit = raycast(w.index, p.x - dx * 0.3, p.y + 0.2, p.z - dz * 0.3, dx, 0, dz, 0.6);
        return !hit || hit.t > 0.45;
      });
      expect(off.length / ps.length, `${k}: ${off.length} of ${ps.length} off the wall`).toBeLessThan(0.05);
    }
  });
});

// M3-21: three layers of routes. The district's four key points (the hideout's grate, Jiaochangkou, the top of
// Shibati's stair, the riverfront) are joined one to the next by a way along the streets, a way over the roofs and a
// way underground or through the buildings; each checked leg by leg against what he can do (data/reach.ts) and, on
// the streets, a clear way at body height as the world stands.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { REACH } from '../../src/data/reach';
import { clearAcross } from '../../src/world/yuzhong/nav';
import type { Route } from '../../src/world/world';

const w = getWorld('yuzhong'), key = (n: string) => w.features.find(f => f.kind === `key:${n}`)!;
const JOINS = [['hideout gate', 'jiaochangkou'], ['jiaochangkou', 'shibati top'], ['shibati top', 'riverfront']];
const share = (r: Route, ...on: string[]) => { let a = 0, all = 0; r.pts.slice(1).forEach((q, k) => { const d = Math.hypot(q.x - r.pts[k].x, q.z - r.pts[k].z); all += d; if (on.includes(r.on[k])) a += d; }); return a / all; };

/** Every leg within reach (as the network's: tests/sim/network.test.ts). */
function legsOk(r: Route) {
  return r.ways.every((k, i) => {
    const a = r.pts[1 + 2 * i], b = r.pts[2 + 2 * i], across = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y, R = REACH;
    const ok = k === 'jump' ? across <= R.jump.across + 0.6 && Math.abs(dy) <= R.jump.rise + 0.05
      : k === 'window' ? across <= Math.max(R.window.across, R.drop.across) + 0.1 && Math.abs(dy) <= Math.max(R.window.rise, R.jump.rise) + 0.05
        : k === 'drop' ? -dy <= R.drop.down + 0.05 && dy <= 0.05
          : k === 'climb' ? dy <= R.climb.up + 0.05
            : k === 'line' ? across <= R.line.across
              : ['crossPlank', 'crossBeam', 'gapBar', 'walkway', 'skybridge', 'winPlank'].includes(k) ? across <= R.span.across
                : ['stairs', 'burrow', 'door', 'way', 'tunnel', 'street', 'breach', 'sewer', 'manhole'].includes(k);
    if (!ok) console.log(`${r.id} leg ${i} ${k}: ${across.toFixed(1)} across, ${dy.toFixed(1)} up`);
    return ok;
  });
}

describe('three layers of routes (M3-21)', () => {
  it('joins the four key points one to the next, three ways each', () => {
    for (const [a, b] of JOINS) for (const layer of ['street', 'roof', 'under']) {
      const l = w.links.find(q => q.from === a && q.to === b && q.layer === layer);
      expect(l, `${a} - ${b} ${layer}`).toBeTruthy();
      const r = l!.route, s = r.pts[0], e = r.pts[r.pts.length - 1];
      expect(Math.hypot(s.x - key(a).x, s.z - key(a).z), `${a} ${layer} start`).toBeLessThan(60);
      expect(Math.hypot(e.x - key(b).x, e.z - key(b).z), `${b} ${layer} end`).toBeLessThan(60);
    }
  });
  it('keeps the street ways to the streets, every stretch walkable as the world stands', () => {
    for (const l of w.links.filter(q => q.layer === 'street')) {
      const r = l.route;
      expect(r.ways.every(k => k === 'street') && r.on.every(o => o === 'ground')).toBe(true);
      r.ways.forEach((_, i) => {
        const a = r.pts[1 + 2 * i], b = r.pts[2 + 2 * i], across = Math.hypot(b.x - a.x, b.z - a.z);
        expect(across, `${r.id} leg ${i}`).toBeLessThan(8);
        expect(Math.abs(b.y - a.y), `${r.id} leg ${i} slope`).toBeLessThanOrEqual(across * 0.9 + 0.3);
        expect(clearAcross(w.index, a, b, 3), `${r.id} leg ${i} clear`).toBe(true);
      });
    }
  });
  it('keeps the roof ways over the roofs and the others underground or inside, every leg within reach', () => {
    for (const l of w.links.filter(q => q.layer === 'roof')) {
      expect(share(l.route, 'roof', 'gap'), l.route.id).toBeGreaterThan(0.6);
      expect(l.route.on.includes('under'), l.route.id).toBe(false);
      expect(legsOk(l.route), l.route.id).toBe(true);
    }
    for (const l of w.links.filter(q => q.layer === 'under')) {
      expect(share(l.route, 'under', 'inside'), l.route.id).toBeGreaterThan(0.55);
      expect(legsOk(l.route), l.route.id).toBe(true);
    }
  });
});
